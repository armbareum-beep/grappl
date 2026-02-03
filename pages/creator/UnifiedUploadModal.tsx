import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    QuantentPosition,
    ContentLevel,
    UniformType,
    Creator
} from '../../types';
import {
    createDrill, getDrillById, updateDrill,
    createLesson, getLessonById, updateLesson,
    createSparringVideo, getSparringVideoById, updateSparringVideo,
    uploadThumbnail,
    getCreators
} from '../../lib/api';
import { VimeoThumbnailSelector } from '../../components/VimeoThumbnailSelector';
import { extractVimeoId } from '../../lib/vimeo';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Trash2, Loader, Camera } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { ThumbnailCropper } from '../../components/ThumbnailCropper';
import { useToast } from '../../contexts/ToastContext';
import { ImageUploader } from '../../components/ImageUploader';

type ContentType = 'drill' | 'lesson' | 'sparring';

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

const CONTENT_LABELS: Record<ContentType, string> = {
    drill: '드릴',
    lesson: '레슨',
    sparring: '스파링'
};

interface UnifiedUploadModalProps {
    initialContentType?: ContentType;
}

export const UnifiedUploadModal: React.FC<UnifiedUploadModalProps> = ({ initialContentType }) => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const typeFromUrl = searchParams.get('type') as ContentType;
    const [contentType, setContentType] = useState<ContentType>(initialContentType || typeFromUrl || 'drill');
    const isEditMode = !!id;
    const { success, error: toastError } = useToast();

    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: QuantentPosition.Standing,
        level: ContentLevel.Beginner,
        uniformType: UniformType.Gi,
        sparringType: 'Sparring' as 'Sparring' | 'Competition',
        price: 0,
        durationMinutes: 0,
        length: '0:00',
    });
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [createdContentId, setCreatedContentId] = useState<string | null>(null);

    const [mainVideo, setMainVideo] = useState<ProcessingState>(initialProcessingState);
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);

    const { queueUpload, tasks } = useBackgroundUpload();

    const mainVideoRef = React.useRef<HTMLVideoElement>(null);
    const descVideoRef = React.useRef<HTMLVideoElement>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [activeCropper, setActiveCropper] = useState<'main' | 'desc' | null>(null);
    const [activeTab, setActiveTab] = useState<'main' | 'desc'>('main');

    useEffect(() => {
        if (isAdmin) {
            getCreators().then(list => {
                setCreators(list);
                if (!isEditMode && user?.id && !selectedCreatorId) {
                    setSelectedCreatorId(user.id);
                }
            }).catch(e => console.error('Failed to load creators:', e));
        }
    }, [isAdmin, isEditMode, user?.id]);

    useEffect(() => {
        async function fetchInitialData() {
            if (!isEditMode || !id) return;

            try {
                let result: any;
                if (contentType === 'drill') {
                    result = await getDrillById(id);
                } else if (contentType === 'lesson') {
                    result = await getLessonById(id);
                } else if (contentType === 'sparring') {
                    const sparringRes = await getSparringVideoById(id);
                    result = sparringRes.data;
                }

                if (result && !result.error) {
                    const data = result;
                    setFormData({
                        title: data.title || '',
                        description: data.description || '',
                        category: (data.category as QuantentPosition) || QuantentPosition.Standing,
                        level: (data.difficulty as ContentLevel) || ContentLevel.Beginner,
                        uniformType: (data.uniformType as UniformType) || UniformType.Gi,
                        sparringType: contentType === 'sparring' ? (data.category as any) || 'Sparring' : 'Sparring',
                        price: data.price || 0,
                        durationMinutes: data.durationMinutes || 0,
                        length: data.length || '0:00',
                    });

                    if (data.thumbnailUrl || data.thumbnail_url) {
                        setThumbnailUrl(data.thumbnailUrl || data.thumbnail_url);
                    }

                    if (data.vimeoUrl || data.vimeo_url) {
                        const vUrl = data.vimeoUrl || data.vimeo_url;
                        const vId = extractVimeoId(vUrl) || vUrl;
                        setMainVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: vUrl,
                            previewUrl: `https://player.vimeo.com/video/${vId}`
                        }));
                    }
                    if (contentType === 'drill' && (data.description_vimeo_url || data.description_vimeo_url)) {
                        const vUrl = data.description_vimeo_url;
                        const vId = extractVimeoId(vUrl) || vUrl;
                        setDescVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: vUrl,
                            previewUrl: `https://player.vimeo.com/video/${vId}`
                        }));
                    }

                    if (data.creatorId || data.creator_id) {
                        setSelectedCreatorId(data.creatorId || data.creator_id);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch content:', err);
                toastError('정보를 불러오는데 실패했습니다.');
                navigate('/creator');
            }
        }
        fetchInitialData();
    }, [id, isEditMode, contentType, navigate, isAdmin, user?.id]);

    useEffect(() => {
        setMainVideo(initialProcessingState);
        setDescVideo(initialProcessingState);
        setCreatedContentId(null);
        setThumbnailUrl('');
    }, [contentType]);

    useEffect(() => {
        if (tasks.length === 0) return;
        tasks.forEach(task => {
            const isMainMatch = mainVideo.videoId === task.id;
            const isDescMatch = descVideo.videoId === task.id;
            if (!isMainMatch && !isDescMatch) return;

            const updateFn = isMainMatch ? setMainVideo : setDescVideo;
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
    }, [tasks, mainVideo.videoId, descVideo.videoId]);

    const handleFileUpload = async (file: File, type: 'main' | 'desc', setter: React.Dispatch<React.SetStateAction<ProcessingState>>) => {
        const objectUrl = URL.createObjectURL(file);
        setter(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready',
            isBackgroundUploading: false,
            videoId: null,
            error: null
        }));
    };

    const captureFromVideo = (type: 'main' | 'desc') => {
        const video = type === 'main' ? mainVideoRef.current : descVideoRef.current;
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

    const ensureDraftRecord = async () => {
        const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user?.id;
        const commonData = {
            title: formData.title || 'Untitled',
            description: formData.description,
            creatorId: effectiveCreatorId,
            category: (contentType === 'sparring' ? formData.sparringType : formData.category) as any,
            difficulty: (contentType === 'sparring' ? undefined : formData.level) as any,
            uniformType: formData.uniformType,
            durationMinutes: formData.durationMinutes,
            thumbnailUrl: thumbnailUrl || 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...',
        };

        let result: any;
        if (contentType === 'drill') {
            result = await createDrill(commonData);
        } else if (contentType === 'lesson') {
            result = await createLesson({ ...commonData, courseId: undefined, lessonNumber: 1 });
        } else if (contentType === 'sparring') {
            result = await createSparringVideo({ ...commonData, price: formData.price });
        }
        if (result?.error || !result?.data) throw result?.error || new Error('Failed to create record');
        const newId = result.data.id;
        setCreatedContentId(newId);
        return newId;
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (contentType === 'drill') {
            const isMainValid = mainVideo.status === 'complete' || mainVideo.status === 'completed' || !!mainVideo.vimeoUrl || !!mainVideo.videoId || !!mainVideo.file;
            const isDescValid = descVideo.status === 'complete' || descVideo.status === 'completed' || !!descVideo.vimeoUrl || !!descVideo.videoId || !!descVideo.file;
            if (!isMainValid) { toastError('동작 영상을 업로드하거나 URL을 입력해주세요.'); setActiveTab('main'); return; }
            if (!isDescValid) { toastError('설명 영상을 업로드하거나 URL을 입력해주세요.'); setActiveTab('desc'); return; }
        }
        setIsSubmitting(true);
        try {
            let contentId = id || createdContentId;
            if (!contentId) contentId = await ensureDraftRecord();
            if (!contentId) throw new Error("Failed to create or retrieve content record ID.");

            const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user?.id;
            let instructorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown';
            if (isAdmin && selectedCreatorId) {
                const sel = creators.find(c => c.id === selectedCreatorId);
                if (sel) instructorName = sel.name;
            } else if (user?.id) {
                const c = creators.find(cr => cr.id === user.id);
                if (c) instructorName = c.name;
            }

            const commonData = {
                title: formData.title,
                description: formData.description,
                creatorId: effectiveCreatorId,
                category: (contentType === 'sparring' ? formData.sparringType : formData.category) as any,
                difficulty: (contentType === 'sparring' ? undefined : formData.level) as any,
                uniformType: formData.uniformType,
                durationMinutes: formData.durationMinutes,
                thumbnailUrl: thumbnailUrl || 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...',
                length: formData.length,
                vimeoUrl: mainVideo.vimeoUrl || undefined,
                descriptionVideoUrl: contentType === 'drill' ? (descVideo.vimeoUrl || undefined) : undefined,
            };

            if (contentType === 'drill') await updateDrill(contentId, commonData);
            else if (contentType === 'lesson') await updateLesson(contentId, commonData);
            else if (contentType === 'sparring') await updateSparringVideo(contentId, { ...commonData, price: formData.price });

            if (mainVideo.file && !mainVideo.isBackgroundUploading && !mainVideo.videoId) {
                const vId = `${crypto.randomUUID()}-${Date.now()}`;
                const ext = mainVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                await queueUpload(mainVideo.file, contentType === 'sparring' ? 'sparring' : 'action', {
                    videoId: vId,
                    filename: `${vId}.${ext}`,
                    cuts: [],
                    title: `[${contentType.toUpperCase()}] ${formData.title}`,
                    description: formData.description,
                    sparringId: contentType === 'sparring' ? contentId : undefined,
                    lessonId: contentType === 'lesson' ? contentId : undefined,
                    drillId: contentType === 'drill' ? contentId : undefined,
                    videoType: contentType === 'sparring' ? 'sparring' : 'action',
                    instructorName,
                    thumbnailUrl: commonData.thumbnailUrl
                });
            }

            if (contentType === 'drill' && descVideo.file && !descVideo.isBackgroundUploading && !descVideo.videoId) {
                const vId = `${crypto.randomUUID()}-${Date.now()}`;
                const ext = descVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                await queueUpload(descVideo.file, 'desc', {
                    videoId: vId,
                    filename: `${vId}.${ext}`,
                    cuts: [],
                    title: `[DRILL DESC] ${formData.title}`,
                    description: formData.description,
                    drillId: contentId,
                    videoType: 'desc',
                    instructorName,
                    thumbnailUrl: commonData.thumbnailUrl
                });
            }

            success(`${CONTENT_LABELS[contentType]} 업로드/수정 완료!`);
            setTimeout(() => navigate(-1), 500);
        } catch (err: any) {
            console.error(err);
            toastError(err.message || '업로드 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderVideoBox = (type: 'main' | 'desc', state: ProcessingState, label: string) => {
        const isMain = type === 'main';
        const setter = isMain ? setMainVideo : setDescVideo;
        return (
            <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">Vimeo URL/ID (선택)</label>
                    <input
                        type="text"
                        value={state.vimeoUrl || ''}
                        onChange={(e) => {
                            const val = e.target.value;
                            const vid = extractVimeoId(val) || val;
                            setter(prev => ({
                                ...prev,
                                vimeoUrl: val ? val : null,
                                status: val ? 'complete' : (prev.file ? 'ready' : 'idle'),
                                previewUrl: val ? `https://player.vimeo.com/video/${vid}` : (prev.file ? prev.previewUrl : null)
                            }));
                        }}
                        placeholder="Vimeo URL 또는 ID를 입력하세요"
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
                    />
                </div>

                {(state.status === 'idle' || state.status === 'error') && !state.vimeoUrl ? (
                    <div className="flex-1 min-h-[250px] border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-violet-500 hover:bg-zinc-800/50 transition-all cursor-pointer relative flex flex-col items-center justify-center group">
                        <input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type, setter)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                            <Upload className="w-8 h-8 text-zinc-400 group-hover:text-violet-400" />
                        </div>
                        <p className="font-bold text-white text-lg mb-2">{label} 업로드</p>
                        <p className="text-sm text-zinc-500">탭하여 동영상 선택</p>
                    </div>
                ) : (
                    <div className="flex-1 min-h-[250px] border-2 border-zinc-700 bg-zinc-800/50 rounded-xl overflow-hidden relative group flex flex-col">
                        {state.previewUrl ? (
                            state.previewUrl.includes('vimeo') ? (
                                <iframe src={state.previewUrl} className="w-full h-full flex-grow" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
                            ) : (
                                <div className="absolute inset-0 bg-black">
                                    <video ref={isMain ? mainVideoRef : descVideoRef} src={state.previewUrl} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
                                </div>
                            )
                        ) : null}

                        {!state.vimeoUrl && (
                            <div className="relative z-10 p-4 flex flex-col h-full justify-between pointer-events-none">
                                <div className="flex justify-between items-start pointer-events-auto">
                                    <div className="bg-black/60 backdrop-blur rounded px-2 py-1">
                                        <p className="text-sm text-white max-w-[150px] truncate">{state.file?.name || 'Uploaded Video'}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {state.file && (
                                            <button onClick={() => captureFromVideo(type)} className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur rounded-full text-zinc-300 hover:text-white transition-all text-[11px] font-bold border border-white/10 hover:bg-white/10">
                                                <Camera className="w-3.5 h-3.5 text-violet-400" /> 화면 캡처
                                            </button>
                                        )}
                                        <button onClick={() => setter(initialProcessingState)} className="p-2 bg-black/60 backdrop-blur rounded-full text-zinc-400 hover:text-rose-400 transition-all border border-white/10 hover:bg-rose-500/10">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {state.vimeoUrl && (
                            <div className="absolute top-4 right-4 z-10 pointer-events-auto">
                                <button onClick={() => setter(initialProcessingState)} className="p-2 bg-black/60 backdrop-blur rounded-full text-zinc-400 hover:text-rose-400 transition-all border border-white/10 hover:bg-rose-500/10">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const isDrill = contentType === 'drill';
    const cropperAspectRatio = activeCropper === 'main' ? (isDrill ? 9 / 16 : 16 / 9) : (isDrill ? 9 / 16 : 16 / 9);

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 relative">
            {croppingImage && <ThumbnailCropper imageSrc={croppingImage} onCropComplete={handleCropComplete} onCancel={() => { setCroppingImage(null); setActiveCropper(null); }} aspectRatio={cropperAspectRatio} />}

            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/creator')} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{isEditMode ? `${CONTENT_LABELS[contentType]} 수정` : `새 ${CONTENT_LABELS[contentType]} 만들기`}</h1>
                        {!isEditMode && (
                            <div className="flex gap-2 mt-2">
                                {(['drill', 'lesson'] as ContentType[]).map(type => (
                                    <button key={type} onClick={() => setContentType(type)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${contentType === type ? 'bg-violet-600 border-violet-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>{CONTENT_LABELS[type]}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">제목</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 transition-all" />
                        </div>

                        {isAdmin && (
                            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl mb-4">
                                <label className="block text-sm font-bold text-violet-400 mb-2">인스트럭터 선택 (관리자 대리 업로드)</label>
                                <select value={selectedCreatorId} onChange={(e) => setSelectedCreatorId(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-violet-500/30 rounded-xl text-white outline-none focus:border-violet-500">
                                    <option value="">본인 (관리자 계정)</option>
                                    {creators.map(creator => (<option key={creator.id} value={creator.id}>{creator.name}</option>))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {contentType === 'sparring' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">스파링 종류</label>
                                        <select value={formData.sparringType} onChange={e => setFormData({ ...formData, sparringType: e.target.value as any })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                            <option value="Sparring">스파링</option>
                                            <option value="Competition">컴페티션</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">가격</label>
                                        <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">포지션</label>
                                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as QuantentPosition })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                            {Object.values(QuantentPosition).map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">레벨</label>
                                        <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value as ContentLevel })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                            {Object.values(ContentLevel).map(lvl => (<option key={lvl} value={lvl}>{lvl}</option>))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">복장</label>
                                <select value={formData.uniformType} onChange={e => setFormData({ ...formData, uniformType: e.target.value as UniformType })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                    {Object.values(UniformType).map(u => (<option key={u} value={u}>{u}</option>))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">설명</label>
                            <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 resize-none" placeholder="상세 설명을 입력하세요" />
                        </div>

                        <div className="pt-4 border-t border-zinc-800/50">
                            <label className="block text-sm font-semibold text-zinc-400 mb-3">썸네일</label>
                            {mainVideo.vimeoUrl && (
                                <div className="mb-8 p-6 bg-violet-500/5 rounded-2xl border border-violet-500/20">
                                    <VimeoThumbnailSelector vimeoId={extractVimeoId(mainVideo.vimeoUrl) || mainVideo.vimeoUrl} onSelect={(url) => setThumbnailUrl(url)} currentThumbnailUrl={thumbnailUrl} />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div className="space-y-4">
                                    <ImageUploader onUploadComplete={(url) => setThumbnailUrl(url)} currentImageUrl={thumbnailUrl} bucketName="course-thumbnails" />
                                </div>
                                {thumbnailUrl && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500 font-medium">현재 미리보기</p>
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800">
                                            <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden">
                        {contentType === 'drill' ? (
                            <>
                                <div className="flex border-b border-zinc-800">
                                    <button onClick={() => setActiveTab('main')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'main' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}>동작 영상</button>
                                    <button onClick={() => setActiveTab('desc')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'desc' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}>설명 영상</button>
                                </div>
                                <div className="p-6">{activeTab === 'main' ? renderVideoBox('main', mainVideo, '동작 영상') : renderVideoBox('desc', descVideo, '설명 영상')}</div>
                            </>
                        ) : (
                            <div className="p-6">{renderVideoBox('main', mainVideo, `${CONTENT_LABELS[contentType]} 영상`)}</div>
                        )}
                    </div>

                    <div className="mt-8 flex gap-4">
                        <Button variant="secondary" onClick={() => navigate('/creator')} className="flex-1 h-14 rounded-xl">취소</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.title || (contentType === 'drill' ? (!mainVideo.file && !mainVideo.vimeoUrl) || (!descVideo.file && !descVideo.vimeoUrl) : (!mainVideo.file && !mainVideo.vimeoUrl))}
                            className="flex-[2] h-14 rounded-xl bg-violet-600 hover:bg-violet-500"
                        >
                            {isSubmitting ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : (isEditMode ? '수정사항 저장' : '업로드 시작')}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
