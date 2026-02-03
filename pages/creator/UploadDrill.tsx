import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty, Drill, UniformType } from '../../types';
import { createDrill, getDrillById, updateDrill, uploadThumbnail } from '../../lib/api';
import { formatDuration } from '../../lib/vimeo';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, FileVideo, Trash2, Loader, Camera } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';
import { ThumbnailCropper } from '../../components/ThumbnailCropper';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    filename: string | null;
    previewUrl: string | null;
    status: 'idle' | 'uploading' | 'previewing' | 'ready' | 'processing' | 'completed' | 'complete' | 'error';
    error: string | null;
    isBackgroundUploading?: boolean;
    uploadProgress?: number;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    filename: null,
    previewUrl: null,
    status: 'idle',
    error: null,
    isBackgroundUploading: false
};

export const UploadDrill: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const { success, error: toastError } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        uniformType: UniformType.Gi,
    });

    const [actionVideo, setActionVideo] = useState<ProcessingState>(initialProcessingState);
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);
    const { queueUpload, tasks, cancelUpload } = useBackgroundUpload();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'action' | 'desc'>('action');

    const actionVideoRef = React.useRef<HTMLVideoElement>(null);
    const descVideoRef = React.useRef<HTMLVideoElement>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [activeCropper, setActiveCropper] = useState<'action' | 'desc' | null>(null);

    useEffect(() => {
        if (!isEditMode || !id) return;
        async function fetchDrill() {
            try {
                const result: any = await getDrillById(id as string);
                if (result && !result.error) {
                    const drill = result as Drill;
                    setFormData({
                        title: drill.title,
                        description: drill.description || '',
                        category: (drill.category as any) || VideoCategory.Standing,
                        difficulty: (drill.difficulty as any) || Difficulty.Beginner,
                        uniformType: (drill.uniformType as UniformType) || UniformType.Gi,
                    });
                    if (drill.vimeoUrl || drill.videoUrl) {
                        setActionVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            previewUrl: drill.videoUrl || (drill.vimeoUrl ? `https://player.vimeo.com/video/${drill.vimeoUrl.split('/').pop()}` : null)
                        }));
                    }
                    if (drill.descriptionVideoUrl) {
                        setDescVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            previewUrl: drill.descriptionVideoUrl || null
                        }));
                    }
                    if (drill.thumbnailUrl) setThumbnailUrl(drill.thumbnailUrl);
                }
            } catch (err) {
                console.error('Failed to fetch drill:', err);
                toastError('드릴 정보를 불러오는데 실패했습니다.');
                navigate('/creator');
            }
        }
        fetchDrill();
    }, [id, isEditMode, navigate]);

    useEffect(() => {
        if (tasks.length === 0) return;
        tasks.forEach(task => {
            const isActionMatch = actionVideo.videoId === task.id;
            const isDescMatch = descVideo.videoId === task.id;
            if (!isActionMatch && !isDescMatch) return;
            const updateFn = isActionMatch ? setActionVideo : setDescVideo;
            updateFn(prev => {
                const newStatus = task.status === 'uploading' ? 'ready' : (task.status as any);
                if (prev.uploadProgress === Math.round(task.progress) && prev.status === newStatus) return prev;
                return {
                    ...prev,
                    uploadProgress: Math.round(task.progress),
                    isBackgroundUploading: task.status === 'uploading',
                    status: newStatus,
                    error: task.error || null
                };
            });
        });
    }, [tasks, actionVideo.videoId, descVideo.videoId]);

    const handleFileUpload = async (file: File, type: 'action' | 'desc', setter: React.Dispatch<React.SetStateAction<ProcessingState>>) => {
        const objectUrl = URL.createObjectURL(file);
        setter(prev => ({ ...prev, file, previewUrl: objectUrl, status: 'ready', isBackgroundUploading: false, videoId: null, error: null }));
    };

    const captureFromVideo = (type: 'action' | 'desc') => {
        const video = type === 'action' ? actionVideoRef.current : descVideoRef.current;
        if (!video) return;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCroppingImage(canvas.toDataURL('image/jpeg', 1.0));
        setActiveCropper(type);
    };

    const handleCropComplete = async (blob: Blob) => {
        setIsSubmitting(true);
        try {
            const { url, error } = await uploadThumbnail(blob);
            if (error) throw error;
            if (url) {
                setThumbnailUrl(url);
                success('썸네일이 캡처되었습니다.');
            }
        } catch (err) {
            console.error('Thumbnail upload failed:', err);
            toastError('썸네일 저장에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
            setCroppingImage(null);
            setActiveCropper(null);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        const isActionValid = actionVideo.status === 'complete' || actionVideo.status === 'completed' || !!actionVideo.videoId || !!actionVideo.file;
        const isDescValid = descVideo.status === 'complete' || descVideo.status === 'completed' || !!descVideo.videoId || !!descVideo.file;

        if (!isActionValid) { toastError('동작 영상을 업로드해주세요.'); setActiveTab('action'); return; }
        if (!isDescValid) { toastError('설명 영상을 업로드해주세요.'); setActiveTab('desc'); return; }

        setIsSubmitting(true);
        try {
            let drillId = id;
            const payload: any = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                difficulty: formData.difficulty,
                uniformType: formData.uniformType,
                thumbnailUrl: thumbnailUrl || 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...',
                durationMinutes: 0,
                length: '0:00'
            };

            if (isEditMode && drillId) {
                await updateDrill(drillId, payload);
            } else {
                const { data: drill, error: dbError } = await createDrill({
                    ...payload,
                    creatorId: user.id,
                    vimeoUrl: '',
                    descriptionVideoUrl: ''
                });
                if (dbError || !drill) throw dbError;
                drillId = drill.id;
            }

            if (actionVideo.file && drillId) {
                const vId = crypto.randomUUID();
                await queueUpload(actionVideo.file, 'action', {
                    videoId: vId,
                    filename: `${vId}.${actionVideo.file.name.split('.').pop() || 'mp4'}`,
                    cuts: [],
                    title: `[Drill] ${formData.title}`,
                    drillId,
                    videoType: 'action',
                    instructorName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown',
                    thumbnailUrl: payload.thumbnailUrl
                });
            }

            if (descVideo.file && drillId) {
                const vId = crypto.randomUUID();
                await queueUpload(descVideo.file, 'desc', {
                    videoId: vId,
                    filename: `${vId}.${descVideo.file.name.split('.').pop() || 'mp4'}`,
                    cuts: [],
                    title: `[Drill Desc] ${formData.title}`,
                    drillId,
                    videoType: 'desc',
                    instructorName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown',
                    thumbnailUrl: payload.thumbnailUrl
                });
            }

            success(isEditMode ? '드릴 정보가 수정되었습니다.' : '드릴이 등록되었습니다.');
            setTimeout(() => navigate(-1), 500);
        } catch (err: any) {
            console.error(err);
            toastError('처리 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderVideoBox = (type: 'action' | 'desc', state: ProcessingState, label: string) => {
        const isAction = type === 'action';
        const setter = isAction ? setActionVideo : setDescVideo;
        const ref = isAction ? actionVideoRef : descVideoRef;

        return (
            <div className="h-full flex flex-col">
                {state.status === 'idle' || state.status === 'error' ? (
                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-16 text-center hover:border-violet-500 hover:bg-zinc-900/50 transition-all cursor-pointer relative min-h-[300px] flex flex-col items-center justify-center group">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type, setter)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-12 h-12 text-zinc-700 group-hover:text-violet-500 mb-4" />
                        <p className="font-bold text-white">{label} 업로드</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="aspect-[9/16] max-h-[500px] mx-auto rounded-xl overflow-hidden bg-black relative border border-zinc-800">
                            <video
                                ref={ref}
                                src={state.previewUrl!}
                                className="w-full h-full object-contain"
                                controls
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => captureFromVideo(type)} className="px-4 py-2 bg-black/60 backdrop-blur rounded-xl text-white flex items-center gap-2 border border-white/10 hover:bg-white/10">
                                    <Camera className="w-4 h-4" /> 화면 캡처
                                </button>
                                <button onClick={() => setter(initialProcessingState)} className="p-2 bg-black/60 backdrop-blur rounded-xl text-rose-400 border border-white/10 hover:bg-rose-500/10">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                            <FileVideo className="w-5 h-5 text-violet-400" />
                            <span className="text-zinc-400 truncate">{state.file?.name || 'Uploaded Video'}</span>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 relative">
            {croppingImage && (
                <ThumbnailCropper
                    imageSrc={croppingImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCroppingImage(null)}
                    aspectRatio={9 / 16}
                />
            )}
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/creator')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">{isEditMode ? '드릴 수정' : '새 드릴 만들기'}</h1>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-8 space-y-6 shadow-2xl">
                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">드릴 제목</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">카테고리</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as VideoCategory })}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none"
                                >
                                    {Object.values(VideoCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">난이도</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none"
                                >
                                    {Object.values(Difficulty).map(diff => <option key={diff} value={diff}>{diff}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">복장</label>
                                <select
                                    value={formData.uniformType}
                                    onChange={e => setFormData({ ...formData, uniformType: e.target.value as UniformType })}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none"
                                >
                                    {Object.values(UniformType).map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">설명</label>
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 resize-none"
                            />
                        </div>
                    </div>

                    <div className="border-t border-zinc-800/50 pt-8">
                        <div className="flex border-b border-zinc-800 mb-6">
                            <button
                                onClick={() => setActiveTab('action')}
                                className={`flex-1 py-4 font-bold transition-all ${activeTab === 'action' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}
                            >
                                동작 영상
                            </button>
                            <button
                                onClick={() => setActiveTab('desc')}
                                className={`flex-1 py-4 font-bold transition-all ${activeTab === 'desc' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}
                            >
                                설명 영상
                            </button>
                        </div>
                        <div className="p-2">
                            {activeTab === 'action' ? renderVideoBox('action', actionVideo, '동작 영상') : renderVideoBox('desc', descVideo, '설명 영상')}
                        </div>
                    </div>

                    {thumbnailUrl && (
                        <div className="pt-4">
                            <p className="text-sm font-semibold text-zinc-400 mb-3">썸네일 미리보기</p>
                            <div className="w-32 aspect-[9/16] rounded-xl overflow-hidden border border-zinc-800">
                                <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                            </div>
                        </div>
                    )}

                    <div className="pt-8 border-t border-zinc-800/50 flex gap-3">
                        <button onClick={() => navigate('/creator')} className="flex-1 px-6 py-3.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold">취소</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.title || (!isEditMode && (!actionVideo.file || !descVideo.file))}
                            className="flex-[2] px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : (isEditMode ? '수정사항 저장' : '업로드 시작')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
