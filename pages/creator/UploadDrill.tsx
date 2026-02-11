import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty, Drill, UniformType, Lesson, SparringVideo } from '../../types';
import { createDrill, getDrillById, updateDrill, uploadThumbnail, getPublicLessons, getSparringVideos } from '../../lib/api';
import { formatDuration } from '../../lib/vimeo';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, FileVideo, Trash2, Loader, Camera, Plus, X, Search } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';
import { ThumbnailCropper } from '../../components/ThumbnailCropper';
import '@mux/mux-video';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    vimeoUrl: string | null;
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
    vimeoUrl: null,
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
    const [relatedItems, setRelatedItems] = useState<{ type: 'lesson' | 'sparring'; id: string; title: string }[]>([]);
    const [availableLessons, setAvailableLessons] = useState<any[]>([]);
    const [availableSparrings, setAvailableSparrings] = useState<any[]>([]);
    const [showRelatedModal, setShowRelatedModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
                        const playbackId = drill.vimeoUrl || drill.videoUrl;
                        setActionVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: playbackId || null,
                            previewUrl: playbackId || null
                        }));
                    }
                    if (drill.descriptionVideoUrl) {
                        setDescVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: drill.descriptionVideoUrl || null,
                            previewUrl: drill.descriptionVideoUrl || null
                        }));
                    }
                    if (drill.thumbnailUrl) setThumbnailUrl(drill.thumbnailUrl);
                    if (drill.relatedItems) setRelatedItems(drill.relatedItems as any);
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
        const loadSelectionData = async () => {
            try {
                const [lessonsRes, sparringsRes] = await Promise.all([
                    getPublicLessons(100),
                    getSparringVideos(100)
                ]);
                if (lessonsRes.data) setAvailableLessons(lessonsRes.data);
                if (sparringsRes.data) setAvailableSparrings(sparringsRes.data);
            } catch (err) {
                console.error('Failed to load selection data:', err);
            }
        };
        loadSelectionData();
    }, []);

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
        // 최대 길이 검증 (90초 = 1분 30초)
        const MAX_DRILL_DURATION_SECONDS = 90;

        const objectUrl = URL.createObjectURL(file);

        // 비디오 요소를 생성하여 길이 확인
        const video = document.createElement('video');
        video.src = objectUrl;

        video.onloadedmetadata = () => {
            const durationSeconds = Math.round(video.duration);
            const maxMinutes = Math.floor(MAX_DRILL_DURATION_SECONDS / 60);
            const maxSeconds = MAX_DRILL_DURATION_SECONDS % 60;
            const maxDurationText = `${maxMinutes}분 ${maxSeconds}초`;

            if (durationSeconds > MAX_DRILL_DURATION_SECONDS) {
                const minutes = Math.floor(durationSeconds / 60);
                const seconds = durationSeconds % 60;
                toastError(`드릴은 최대 ${maxDurationText}까지만 업로드할 수 있습니다. (현재: ${minutes}분 ${seconds}초)`);
                setter(prev => ({ ...prev, error: `최대 ${maxDurationText}까지만 업로드 가능합니다.`, status: 'error' }));
            } else {
                setter(prev => ({ ...prev, file, previewUrl: objectUrl, status: 'ready', isBackgroundUploading: false, videoId: null, error: null }));
            }
            URL.revokeObjectURL(objectUrl);
        };

        video.onerror = () => {
            toastError('영상 파일을 읽을 수 없습니다.');
            setter(prev => ({ ...prev, error: '영상 파일 읽기 실패', status: 'error' }));
            URL.revokeObjectURL(objectUrl);
        };
    };

    const captureFromVideo = async (type: 'action' | 'desc') => {
        try {
            const state = type === 'action' ? actionVideo : descVideo;

            // Mux Playback ID인 경우 - Mux 썸네일 API 사용
            if (state.vimeoUrl) {
                const playbackId = state.vimeoUrl;
                // Mux 썸네일 URL 생성 (기본 0초 시점)
                const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

                // 이미지 다운로드
                const response = await fetch(thumbnailUrl);
                if (!response.ok) {
                    toastError('썸네일을 가져올 수 없습니다. Playback ID를 확인해주세요.');
                    return;
                }
                const blob = await response.blob();

                // Blob을 Data URL로 변환
                const reader = new FileReader();
                reader.onload = () => {
                    setCroppingImage(reader.result as string);
                    setActiveCropper(type);
                };
                reader.readAsDataURL(blob);
                return;
            }

            // 로컬 비디오인 경우
            const video = type === 'action' ? actionVideoRef.current : descVideoRef.current;
            if (!video) {
                toastError('영상이 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setCroppingImage(canvas.toDataURL('image/jpeg', 1.0));
            setActiveCropper(type);
        } catch (e: any) {
            console.error('Capture failed:', e);
            toastError('화면 캡처에 실패했습니다. 다시 시도해주세요.');
        }
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

        if (!isActionValid && !isDescValid) {
            toastError('동작 영상 또는 설명 영상 중 최소 하나는 업로드해야 합니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            let drillId = id;

            const payload: any = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                difficulty: formData.difficulty,
                uniformType: formData.uniformType,
                // Don't use placeholder thumbnail if URL exists - let API fetch it
                thumbnailUrl: thumbnailUrl || (actionVideo.vimeoUrl || descVideo.vimeoUrl ? undefined : 'https://placehold.co/600x800/1e293b/ffffff?text=Drill'),
                durationMinutes: 0,
                length: '0:00',
                vimeoUrl: actionVideo.vimeoUrl || undefined,
                descriptionVideoUrl: descVideo.vimeoUrl || undefined,
                relatedItems: relatedItems
            };

            if (isEditMode && drillId) {
                await updateDrill(drillId, payload);
            } else {
                const { data: drill, error: dbError } = await createDrill({
                    ...payload,
                    creatorId: user.id
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
                    description: formData.description,
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
                    description: formData.description,
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
            <div className="h-full flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Mux Playback ID (선택)</label>
                    <input
                        type="text"
                        value={state.vimeoUrl || ''}
                        onChange={(e) => {
                            const val = e.target.value.trim();
                            setter(prev => ({
                                ...prev,
                                vimeoUrl: val || null,
                                status: val ? 'complete' : (prev.file ? 'ready' : 'idle'),
                                previewUrl: val || (prev.file ? prev.previewUrl : null)
                            }));
                        }}
                        placeholder="Mux Playback ID 입력 (예: abcd1234)"
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:border-violet-500 outline-none"
                    />
                </div>

                {(state.status === 'idle' || state.status === 'error') && !state.vimeoUrl && !state.previewUrl ? (
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
                    <div className="space-y-3">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => captureFromVideo(type)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                                <Camera className="w-4 h-4" /> 썸네일 캡처
                            </button>
                        </div>
                        <div className="aspect-[9/16] max-h-[500px] mx-auto rounded-xl overflow-hidden bg-black border border-zinc-800">
                            {state.vimeoUrl ? (
                                // Mux Playback ID - render mux-video element
                                <mux-video
                                    key={state.vimeoUrl}
                                    playback-id={state.vimeoUrl}
                                    muted
                                    autoplay
                                    loop
                                    playsinline
                                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
                                />
                            ) : (
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
                            )}
                        </div>
                        {!state.vimeoUrl && (
                            <div className="flex items-center gap-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                                <FileVideo className="w-5 h-5 text-violet-400" />
                                <span className="text-zinc-400 truncate">{state.file?.name || 'Uploaded Video'}</span>
                            </div>
                        )}
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

                    <div className="pt-4 border-t border-zinc-800/50">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-semibold text-zinc-400">썸네일</p>
                            <label className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm font-medium cursor-pointer transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                setCroppingImage(event.target?.result as string);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                    className="hidden"
                                />
                                이미지 업로드
                            </label>
                        </div>
                        {thumbnailUrl && (
                            <div className="w-32 aspect-[9/16] rounded-xl overflow-hidden border border-zinc-800">
                                <img src={thumbnailUrl} alt="썸네일" loading="lazy" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Related Content Section */}
                    <div className="pt-8 border-t border-zinc-800/50">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">관련 콘텐츠</h3>
                                <p className="text-sm text-zinc-500">드릴과 관련된 레슨이나 스파링을 연결하세요</p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowRelatedModal(true)}
                                className="gap-2"
                            >
                                <Plus className="w-4 h-4" /> 콘텐츠 선택
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {relatedItems.map((item, index) => (
                                <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.type === 'lesson' ? 'bg-violet-500/20 text-violet-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {item.type === 'lesson' ? 'LESSON' : 'SPARRING'}
                                        </span>
                                        <span className="text-sm text-zinc-200 font-medium truncate max-w-[300px]">{item.title}</span>
                                    </div>
                                    <button
                                        onClick={() => setRelatedItems(prev => prev.filter((_, i) => i !== index))}
                                        className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            {relatedItems.length === 0 && (
                                <div className="text-center py-8 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-xl">
                                    <p className="text-sm text-zinc-500">선택된 관련 콘텐츠가 없습니다</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-8 border-t border-zinc-800/50 flex gap-3">
                        <button onClick={() => navigate('/creator')} className="flex-1 px-6 py-3.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold">취소</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.title || (!isEditMode && !actionVideo.file && !descVideo.file)}
                            className="flex-[2] px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : (isEditMode ? '수정사항 저장' : '업로드 시작')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Selection Modal */}
            {showRelatedModal && (
                <div className="fixed inset-0 z-[70000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-white">콘텐츠 선택</h2>
                                <p className="text-sm text-zinc-500 mt-1">연결할 레슨이나 스파링을 선택하세요</p>
                            </div>
                            <button onClick={() => setShowRelatedModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-4 border-b border-zinc-800">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="제목 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-6">
                            {/* Lessons Section */}
                            <div>
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">레슨 (Lessons)</h3>
                                <div className="grid gap-2">
                                    {availableLessons
                                        .filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(lesson => {
                                            const isSelected = relatedItems.some(i => i.id === lesson.id && i.type === 'lesson');
                                            return (
                                                <button
                                                    key={lesson.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setRelatedItems(prev => prev.filter(i => !(i.id === lesson.id && i.type === 'lesson')));
                                                        } else {
                                                            setRelatedItems(prev => [...prev, { type: 'lesson', id: lesson.id, title: lesson.title }]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${isSelected
                                                        ? 'bg-violet-500/10 border-violet-500 text-white'
                                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                                        }`}
                                                >
                                                    <div className="w-12 aspect-video bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                                        {lesson.thumbnailUrl && <img src={lesson.thumbnailUrl} loading="lazy" className="w-full h-full object-cover" alt={lesson.title || "썸네일"} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate">{lesson.title}</p>
                                                        {lesson.courseTitle && <p className="text-[10px] text-zinc-500 truncate">{lesson.courseTitle}</p>}
                                                    </div>
                                                    {isSelected && <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Plus className="w-3 h-3 text-white rotate-45" />
                                                    </div>}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>

                            {/* Sparrings Section */}
                            <div>
                                <h3 className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">스파링 (Sparrings)</h3>
                                <div className="grid gap-2">
                                    {availableSparrings
                                        .filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(sparring => {
                                            const isSelected = relatedItems.some(i => i.id === sparring.id && i.type === 'sparring');
                                            return (
                                                <button
                                                    key={sparring.id}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setRelatedItems(prev => prev.filter(i => !(i.id === sparring.id && i.type === 'sparring')));
                                                        } else {
                                                            setRelatedItems(prev => [...prev, { type: 'sparring', id: sparring.id, title: sparring.title }]);
                                                        }
                                                    }}
                                                    className={`flex items-center gap-4 p-3 rounded-xl border transition-all text-left ${isSelected
                                                        ? 'bg-blue-500/10 border-blue-500 text-white'
                                                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                                        }`}
                                                >
                                                    <div className="w-12 aspect-video bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                                                        {sparring.thumbnailUrl && <img src={sparring.thumbnailUrl} loading="lazy" className="w-full h-full object-cover" alt={sparring.title || "썸네일"} />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-sm truncate">{sparring.title}</p>
                                                        <p className="text-[10px] text-zinc-500">Instructor: {sparring.creatorName}</p>
                                                    </div>
                                                    {isSelected && <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <Plus className="w-3 h-3 text-white rotate-45" />
                                                    </div>}
                                                </button>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
                            <Button
                                className="w-full py-4 text-lg"
                                onClick={() => setShowRelatedModal(false)}
                            >
                                {relatedItems.length}개 선택 완료
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

