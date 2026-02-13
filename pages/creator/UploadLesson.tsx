import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty, UniformType, Lesson } from '../../types';
import { createLesson, getLessonById, updateLesson } from '../../lib/api-lessons';
import { uploadThumbnail, createVimeoThumbnailAtTime } from '../../lib/api';
import { getCreators } from '../../lib/api-admin';
import { extractVimeoId, extractVimeoHash } from '../../lib/vimeo';
import { ArrowLeft, Upload, Loader, FileVideo, Camera, Trash2 } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';
import { Creator } from '../../types';
import { ThumbnailCropper } from '../../components/ThumbnailCropper';
import { VimeoThumbnailSelector } from '../../components/VimeoThumbnailSelector';
import Player from '@vimeo/player';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    vimeoUrl: string | null;
    filename: string | null;
    previewUrl: string | null;
    status: 'idle' | 'uploading' | 'previewing' | 'ready' | 'processing' | 'complete' | 'error';
    progress: number;
    error: string | null;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    vimeoUrl: null,
    filename: null,
    previewUrl: null,
    status: 'idle',
    progress: 0,
    error: null
};

export const UploadLesson: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const { queueUpload } = useBackgroundUpload();
    const { success, error: toastError } = useToast();
    const { isAdmin } = useAuth();

    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: Difficulty.Beginner,
        category: VideoCategory.Standing,
        uniformType: UniformType.Gi,
        durationMinutes: 0,
        length: '0:00'
    });
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [videoState, setVideoState] = useState<ProcessingState>(initialProcessingState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [thumbnailSelectorKey, setThumbnailSelectorKey] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const vimeoIframeRef = useRef<HTMLIFrameElement>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);

    useEffect(() => {
        if (isAdmin) {
            getCreators().then(setCreators).catch(console.error);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (!isEditMode || !id) return;
        async function fetchLesson() {
            setIsLoading(true);
            try {
                const { data, error } = await getLessonById(id!);
                if (error) throw error;
                if (data) {
                    setFormData({
                        title: data.title,
                        description: data.description || '',
                        difficulty: data.difficulty || Difficulty.Beginner,
                        category: data.category || VideoCategory.Standing,
                        uniformType: (data.uniformType as UniformType) || UniformType.Gi,
                        durationMinutes: data.durationMinutes || 0,
                        length: data.length || '0:00'
                    });
                    if (data.creatorId) setSelectedCreatorId(data.creatorId);
                    if (data.thumbnailUrl) setThumbnailUrl(data.thumbnailUrl);

                    // Load existing video into videoState for editing
                    if (data.vimeoUrl || data.videoUrl) {
                        const targetUrl = (data.vimeoUrl || data.videoUrl) as string;
                        const vId = extractVimeoId(targetUrl);
                        const vHash = extractVimeoHash(targetUrl);
                        let previewUrl = vId ? `https://player.vimeo.com/video/${vId}` : targetUrl;
                        if (previewUrl && vHash && vId) previewUrl += `?h=${vHash}`;

                        setVideoState(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: data.vimeoUrl || null,
                            previewUrl: previewUrl || null
                        }));
                    }
                }
            } catch (err) {
                console.error('Failed to fetch lesson:', err);
                toastError('레슨 정보를 불러오는데 실패했습니다.');
                navigate('/creator');
            } finally {
                setIsLoading(false);
            }
        }
        fetchLesson();
    }, [id, isEditMode, navigate]);

    const handleFileUpload = async (file: File) => {
        const objectUrl = URL.createObjectURL(file);
        setVideoState(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready',
            error: null
        }));
    };

    const captureFromVideo = async () => {
        if (isCapturing) return;
        setIsCapturing(true);

        try {
            // Vimeo 영상인 경우
            if (videoState.vimeoUrl && vimeoIframeRef.current) {
                const vimeoId = extractVimeoId(videoState.vimeoUrl);
                if (!vimeoId) {
                    toastError('Vimeo 영상 ID를 찾을 수 없습니다.');
                    return;
                }

                // Vimeo Player 인스턴스 생성 및 현재 시간 가져오기
                const player = new Player(vimeoIframeRef.current);
                const currentTime = await player.getCurrentTime();

                // 백엔드 API를 통해 해당 시간의 썸네일 생성 요청
                const result = await createVimeoThumbnailAtTime(vimeoId, currentTime);

                if (result.error) {
                    console.error('Vimeo thumbnail creation failed:', result.error);
                    toastError('썸네일 생성에 실패했습니다. 다시 시도해주세요.');
                    return;
                }

                if (result.success) {
                    const mins = Math.floor(currentTime / 60);
                    const secs = Math.floor(currentTime % 60);
                    success(`${mins}:${secs.toString().padStart(2, '0')} 시점 썸네일 생성 요청됨. 아래 목록에서 선택하세요.`);
                    // 5초 후 VimeoThumbnailSelector 새로고침
                    setTimeout(() => {
                        setThumbnailSelectorKey(k => k + 1);
                    }, 5000);
                } else {
                    toastError('썸네일 생성 요청에 실패했습니다.');
                }
                return;
            }

            // 로컬 비디오인 경우
            if (!videoRef.current) {
                toastError('영상이 로드되지 않았습니다. 잠시 후 다시 시도해주세요.');
                return;
            }
            const video = videoRef.current;
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setCroppingImage(canvas.toDataURL('image/jpeg', 1.0));
        } catch (e: any) {
            console.error('Capture failed:', e);
            toastError('화면 캡처에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsCapturing(false);
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
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (!formData.title) { toastError('제목을 입력해주세요.'); return; }
        if (!isEditMode && !videoState.file) { toastError('영상을 업로드해주세요.'); return; }

        setIsSubmitting(true);
        try {
            let lessonId = id;
            let currentThumbnailUrl = thumbnailUrl;
            const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user.id;

            const payload: any = {
                title: formData.title,
                description: formData.description,
                difficulty: formData.difficulty,
                category: formData.category,
                uniformType: formData.uniformType,
                thumbnailUrl: currentThumbnailUrl || 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...',
                durationMinutes: formData.durationMinutes,
                length: formData.length
            };

            if (isEditMode && lessonId) {
                const { error } = await updateLesson(lessonId, payload);
                if (error) throw error;
            } else {
                const { data: newLesson, error } = await createLesson({
                    ...payload,
                    courseId: null,
                    creatorId: effectiveCreatorId,
                    lessonNumber: 1,
                    vimeoUrl: ''
                });
                if (error || !newLesson) throw error || new Error('Failed to create lesson');
                lessonId = newLesson.id;
            }

            if (videoState.file && lessonId) {
                const videoId = crypto.randomUUID();
                await queueUpload(videoState.file, 'action', {
                    videoId,
                    filename: `${videoId}.${videoState.file.name.split('.').pop() || 'mp4'} `,
                    cuts: [],
                    title: formData.title,
                    description: formData.description,
                    lessonId,
                    videoType: 'action',
                    instructorName: (isAdmin && selectedCreatorId)
                        ? (creators.find(c => c.id === selectedCreatorId)?.name || 'Unknown')
                        : (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown'),
                    thumbnailUrl: payload.thumbnailUrl
                });
            }

            success(isEditMode ? '레슨 정보가 수정되었습니다.' : '레슨이 생성되었습니다.');
            navigate('/creator?tab=materials');
        } catch (err: any) {
            console.error('Submission error:', err);
            toastError(`오류가 발생했습니다: ${err.message} `);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <Loader className="w-10 h-10 text-violet-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 relative">
            {croppingImage && (
                <ThumbnailCropper
                    imageSrc={croppingImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCroppingImage(null)}
                    aspectRatio={16 / 9}
                />
            )}
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/creator')} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl font-bold text-white">{isEditMode ? '레슨 수정' : '새 레슨 만들기'}</h1>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden p-8 space-y-8">
                    {isAdmin && (
                        <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
                            <label className="block text-sm font-bold text-violet-400 mb-2">인스트럭터 선택 (관리자 대리 업로드)</label>
                            <select
                                value={selectedCreatorId}
                                onChange={(e) => setSelectedCreatorId(e.target.value)}
                                className="w-full px-4 py-3 bg-zinc-950 border border-violet-500/30 rounded-xl text-white outline-none"
                            >
                                <option value="">본인 (관리자 계정)</option>
                                {creators.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">레슨 제목</label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                                />
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
                        <div className="space-y-5">
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">난이도</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                        className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none"
                                    >
                                        <option value="Beginner">Beginner</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">복장</label>
                                    <select
                                        value={formData.uniformType}
                                        onChange={e => setFormData({ ...formData, uniformType: e.target.value as UniformType })}
                                        className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none"
                                    >
                                        <option value="Gi">Gi</option>
                                        <option value="No-Gi">No-Gi</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-zinc-800/50 pt-8">
                        <label className="block text-sm font-semibold text-zinc-400 mb-4">레슨 영상 <span className="text-rose-400">*</span></label>

                        {/* Vimeo URL Input */}
                        <div className="flex flex-col gap-2 mb-4">
                            <label className="text-sm font-medium text-zinc-400">Vimeo URL (선택)</label>
                            <input
                                type="text"
                                value={videoState.vimeoUrl || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    const vId = extractVimeoId(val);
                                    const vHash = extractVimeoHash(val);

                                    let embedUrl = '';
                                    if (vId) {
                                        embedUrl = `https://player.vimeo.com/video/${vId}`;
                                        if (vHash) embedUrl += `?h=${vHash}`;
                                    }

                                    setVideoState(prev => ({
                                        ...prev,
                                        vimeoUrl: val ? val : null,
                                        status: val ? 'complete' : (prev.file ? 'ready' : 'idle'),
                                        previewUrl: val ? embedUrl : (prev.file ? prev.previewUrl : null)
                                    }));
                                }}
                                placeholder="Vimeo URL 또는 ID를 입력하세요"
                                className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:border-violet-500 outline-none"
                            />
                        </div>

                        {(videoState.status === 'idle' || videoState.status === 'error') && !videoState.vimeoUrl && !videoState.previewUrl ? (
                            <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center hover:border-violet-500 hover:bg-zinc-900/50 transition-all cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <Upload className="w-16 h-16 mx-auto mb-4 text-zinc-700 group-hover:text-violet-500" />
                                <p className="font-bold text-white text-lg">영상 파일 선택</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={captureFromVideo}
                                        disabled={isCapturing}
                                        className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 disabled:cursor-wait rounded-xl text-white text-sm flex items-center gap-2 transition-colors"
                                    >
                                        {isCapturing ? (
                                            <><Loader className="w-4 h-4 animate-spin" /> 캡처 중...</>
                                        ) : (
                                            <><Camera className="w-4 h-4" /> 썸네일 캡처</>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setVideoState(initialProcessingState)}
                                        className="px-4 py-2 bg-zinc-800 hover:bg-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2 border border-zinc-700 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" /> 삭제
                                    </button>
                                </div>
                                <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-800">
                                    {videoState.vimeoUrl ? (
                                        <iframe ref={vimeoIframeRef} src={videoState.previewUrl!} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
                                    ) : (
                                        <video ref={videoRef} src={videoState.previewUrl!} className="w-full h-full object-contain" crossOrigin="anonymous" controls autoPlay muted loop playsInline />
                                    )}
                                </div>
                                {videoState.file && (
                                    <div className="flex items-center gap-3 p-4 bg-zinc-950/50 border border-zinc-800 rounded-xl">
                                        <FileVideo className="w-5 h-5 text-violet-400" />
                                        <span className="text-zinc-400 truncate">{videoState.file?.name}</span>
                                    </div>
                                )}
                            </div>
                        )}
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
                        {/* Vimeo 영상인 경우 썸네일 선택기 표시 */}
                        {videoState.vimeoUrl && (
                            <div className="mb-6 p-4 bg-violet-500/5 rounded-xl border border-violet-500/20">
                                <VimeoThumbnailSelector
                                    vimeoId={extractVimeoId(videoState.vimeoUrl) || videoState.vimeoUrl}
                                    vimeoHash={extractVimeoHash(videoState.vimeoUrl)}
                                    onSelect={(url) => setThumbnailUrl(url)}
                                    currentThumbnailUrl={thumbnailUrl}
                                    refreshKey={thumbnailSelectorKey}
                                />
                            </div>
                        )}
                        {thumbnailUrl && (
                            <div className="w-48 aspect-video rounded-xl overflow-hidden border border-zinc-800">
                                <img src={thumbnailUrl} alt="Thumbnail" loading="lazy" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div className="pt-8 border-t border-zinc-800/50 flex justify-end gap-3">
                        <button onClick={() => navigate('/creator')} className="px-6 py-3.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold">취소</button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.title || (!isEditMode && !videoState.file)}
                            className="px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader className="w-5 h-5 animate-spin" /> : (isEditMode ? '수정사항 저장' : '레슨 생성하기')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
