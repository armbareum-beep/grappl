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
    getCoursesByCreator, createCourse, getCreators
} from '../../lib/api';
import { ImageUploader } from '../../components/ImageUploader';
import { VimeoThumbnailSelector } from '../../components/VimeoThumbnailSelector';
import { formatDuration } from '../../lib/vimeo';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Scissors, Trash2, Loader } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';

type ContentType = 'drill' | 'lesson' | 'sparring';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    vimeoUrl: string | null;
    filename: string | null;
    previewUrl: string | null;
    cuts: { start: number; end: number }[] | null;
    thumbnailBlob: Blob | null;
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
    cuts: null,
    thumbnailBlob: null,
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
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    // Determine content type from Prop -> URL Query -> Default
    const typeFromUrl = searchParams.get('type') as ContentType;
    const [contentType, setContentType] = useState<ContentType>(initialContentType || typeFromUrl || 'drill');
    const isEditMode = !!id;
    const { success, error: toastError } = useToast();
    const { isAdmin } = useAuth(); // Destructure isAdmin

    // Admin Proxy Upload State
    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');

    // Global Form State
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

    // Video States
    // Main video (used for Lesson, Sparring, and Drill-Action)
    const [mainVideo, setMainVideo] = useState<ProcessingState>(initialProcessingState);
    // Secondary video (used only for Drill-Description)
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);

    // Background Upload Hook
    const { queueUpload, tasks, cancelUpload } = useBackgroundUpload();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Editor State
    const [activeEditor, setActiveEditor] = useState<'main' | 'desc' | null>(null);
    const [createdContentId, setCreatedContentId] = useState<string | null>(null);

    // Tab State for Drill (Action vs Description)
    const [activeTab, setActiveTab] = useState<'main' | 'desc'>('main');

    // Fetch data in edit mode & admin creator list
    useEffect(() => {
        async function fetchInitialData() {
            // Load creators for admin (always needed if admin, regardless of mode)
            if (isAdmin) {
                try {
                    const creatorList = await getCreators();
                    setCreators(creatorList);

                    // If new mode, set default selectedCreatorId to current user
                    if (!isEditMode && user?.id) {
                        setSelectedCreatorId(user.id);
                    }
                } catch (e) {
                    console.error('Failed to load creators:', e);
                }
            }

            if (!isEditMode || !id) return;

            try {
                let result: any;
                if (contentType === 'drill') {
                    result = await getDrillById(id as string);
                } else if (contentType === 'lesson') {
                    result = await getLessonById(id as string);
                } else if (contentType === 'sparring') {
                    const sparringRes = await getSparringVideoById(id as string);
                    result = sparringRes.data;
                }

                if (result && !result.error) {
                    const data = result;
                    setFormData({
                        title: data.title,
                        description: data.description || '',
                        category: (data.category as QuantentPosition) || QuantentPosition.Standing,
                        level: (data.difficulty as ContentLevel) || ContentLevel.Beginner,
                        uniformType: (data.uniformType as UniformType) || UniformType.Gi,
                        sparringType: contentType === 'sparring' ? (data.category as any) || 'Sparring' : 'Sparring',
                        price: data.price || 0,
                        durationMinutes: data.durationMinutes || data.duration_minutes || 0,
                        length: data.length || '0:00',
                    });

                    if (data.thumbnailUrl || data.thumbnail_url) {
                        setThumbnailUrl(data.thumbnailUrl || data.thumbnail_url);
                    }

                    // Populate videos
                    if (data.vimeoUrl || data.vimeo_url || data.videoUrl) {
                        setMainVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: data.vimeoUrl || data.vimeo_url || null,
                            previewUrl: data.videoUrl || (data.vimeoUrl ? `https://player.vimeo.com/video/${data.vimeoUrl.split('/').pop()}` : null)
                        }));
                    }
                    if (contentType === 'drill' && (data.descriptionVideoUrl || data.description_vimeo_url)) {
                        setDescVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: data.description_vimeo_url || null,
                            previewUrl: data.descriptionVideoUrl || null
                        }));
                    }

                    // Set creator ID for admin editing
                    if (data.creatorId) {
                        setSelectedCreatorId(data.creatorId);
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

    // Cleanup tasks when unmounting or switching content type
    useEffect(() => {
        setMainVideo(initialProcessingState);
        setDescVideo(initialProcessingState);
        setCreatedContentId(null);
        setThumbnailUrl(''); // Reset thumbnail URL on content type change
    }, [contentType]);

    // Sync Background Tasks
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

    // Handle File Selection
    const handleFileUpload = async (
        file: File,
        type: 'main' | 'desc',
        setter: React.Dispatch<React.SetStateAction<ProcessingState>>
    ) => {
        const currentState = type === 'main' ? mainVideo : descVideo;
        if (currentState.videoId) cancelUpload(currentState.videoId);

        const objectUrl = URL.createObjectURL(file);

        // Initial state update
        setter(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready',
            isBackgroundUploading: false,
            videoId: null,
            error: null
        }));

        // Immediately open editor for thumbnail selection/editing
        setActiveEditor(type);
    };

    // Helper to ensure a draft record exists before uploading
    const ensureDraftRecord = async () => {
        let contentId = id || createdContentId;
        if (contentId) return contentId;

        console.log(`Creating draft ${contentType}...`);

        // Determine Creator ID: If Admin, use selected; otherwise use current user
        const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user?.id;

        const commonData = {
            title: formData.title || `업로드 중인 ${CONTENT_LABELS[contentType]}...`,
            description: formData.description,
            creatorId: effectiveCreatorId,
            category: (contentType === 'sparring' ? formData.sparringType : formData.category) as any,
            difficulty: (contentType === 'sparring' ? undefined : formData.level) as any,
            uniformType: formData.uniformType,
            durationMinutes: 0,
        };

        let result;
        if (contentType === 'drill') {
            result = await createDrill({ ...commonData, vimeoUrl: '', descriptionVideoUrl: '', thumbnailUrl: 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...' });
        } else if (contentType === 'lesson') {
            const courses = await getCoursesByCreator(effectiveCreatorId || user!.id);
            let targetCourseId = courses[0]?.id;

            if (!targetCourseId) {
                const newCourse = await createCourse({
                    title: '나의 첫 번째 코스',
                    description: '자동 생성된 테스트 코스입니다.',
                    creatorId: effectiveCreatorId || user!.id,
                    category: formData.category,
                    difficulty: formData.level,
                    published: false,
                    uniformType: formData.uniformType
                });
                if (newCourse.data) targetCourseId = newCourse.data.id;
            }

            if (!targetCourseId) throw new Error('코스를 찾거나 생성할 수 없습니다.');
            result = await createLesson({ ...commonData, courseId: targetCourseId, lessonNumber: 1 });
        } else if (contentType === 'sparring') {
            result = await createSparringVideo({ ...commonData, price: formData.price });
        }

        if (result?.error || !result?.data) throw result?.error;
        const newId = result.data.id;
        setCreatedContentId(newId);
        return newId;
    };

    // Handle Cuts Save & Auto Upload
    const handleCutsSave = async (cuts: { start: number; end: number }[], thumbnailBlob?: Blob) => {
        // Update local state
        if (activeEditor === 'main') {
            setMainVideo(prev => ({ ...prev, cuts, status: 'ready', thumbnailBlob: thumbnailBlob || null }));
        } else {
            setDescVideo(prev => ({ ...prev, cuts, status: 'ready', thumbnailBlob: thumbnailBlob || null }));
        }
        setActiveEditor(null);
    };



    const handleSubmit = async () => {
        if (!user) return;

        // Strict validation for drills - both videos required
        if (contentType === 'drill') {
            const isMainVideoValid = mainVideo.status === 'complete' || mainVideo.status === 'completed' || !!mainVideo.videoId || (!!mainVideo.file && !!mainVideo.cuts);
            const isDescVideoValid = descVideo.status === 'complete' || descVideo.status === 'completed' || !!descVideo.videoId || (!!descVideo.file && !!descVideo.cuts);

            if (!isMainVideoValid) {
                toastError('동작 영상을 업로드하고 편집 구간을 선택해주세요.');
                setActiveTab('main');
                return;
            }
            if (!isDescVideoValid) {
                toastError('설명 영상을 업로드하고 편집 구간을 선택해주세요.');
                setActiveTab('desc');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // Logic to create/update final record
            let contentId = id || createdContentId;

            // Ensure we have a content record ID
            if (!contentId) {
                contentId = await ensureDraftRecord();
            }
            if (!contentId) throw new Error("Failed to create or retrieve content record ID.");

            // Calculate duration: if new file exists use cuts, else use existing formData
            let totalSeconds = 0;
            let durationMinutes = formData.durationMinutes;
            let finalLength = formData.length;

            if (mainVideo.cuts && mainVideo.cuts.length > 0) {
                totalSeconds = mainVideo.cuts.reduce((acc, cut) => acc + (cut.end - cut.start), 0);
                durationMinutes = Math.floor(totalSeconds / 60);
                finalLength = formatDuration(totalSeconds);
            }

            // Thumbnail
            let finalThumbnailUrl = thumbnailUrl;
            if (mainVideo.thumbnailBlob) {
                const { url } = await uploadThumbnail(mainVideo.thumbnailBlob);
                if (url) finalThumbnailUrl = url;
            } else if (!finalThumbnailUrl) {
                finalThumbnailUrl = 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...';
            }

            // Determine instructor name for Vimeo folder organization
            let instructorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown';
            if (isAdmin && selectedCreatorId) {
                const selectedCreator = creators.find(c => c.id === selectedCreatorId);
                if (selectedCreator) instructorName = selectedCreator.name;
            } else if (user?.id) {
                // If not admin or no selected creator, but user is logged in, try to find their creator name
                // (though user.name is usually sufficient)
                const creator = creators.find(c => c.id === user.id);
                if (creator) instructorName = creator.name;
            }

            const commonData = {
                title: formData.title,
                description: formData.description,
                category: (contentType === 'sparring' ? formData.sparringType : formData.category) as any,
                difficulty: (contentType === 'sparring' ? undefined : formData.level) as any,
                uniformType: formData.uniformType,
                durationMinutes,
                thumbnailUrl: finalThumbnailUrl, // Update if new URL exists
                length: finalLength,
            };

            // Update Metadata
            if (contentType === 'drill') {
                const { error } = await updateDrill(contentId, commonData);
                if (error) throw error;
            } else if (contentType === 'lesson') {
                const { error } = await updateLesson(contentId, commonData);
                if (error) throw error;
            } else if (contentType === 'sparring') {
                const { error } = await updateSparringVideo(contentId, { ...commonData, price: formData.price });
                if (error) throw error;
            }

            // TRIGGER UPLOADS
            // Main Video
            if (mainVideo.file && !mainVideo.isBackgroundUploading && !mainVideo.videoId) {
                const videoId = `${crypto.randomUUID()}-${Date.now()}`;
                const ext = mainVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const filename = `${videoId}.${ext}`;

                console.log(`[Submit] Starting background upload for ${contentType} Main Video`);

                await queueUpload(mainVideo.file, contentType === 'sparring' ? 'sparring' : 'action', {
                    videoId,
                    filename,
                    cuts: mainVideo.cuts || [],
                    title: `[${contentType.toUpperCase()}] ${formData.title}`,
                    description: formData.description,
                    drillId: contentType === 'drill' ? contentId : undefined,
                    lessonId: contentType === 'lesson' ? contentId : undefined,
                    sparringId: contentType === 'sparring' ? contentId : undefined,
                    videoType: contentType === 'sparring' ? 'sparring' : 'action',
                    instructorName,
                    thumbnailUrl: finalThumbnailUrl
                });
            }

            // Description Video (Drill only)
            if (contentType === 'drill' && descVideo.file && !descVideo.isBackgroundUploading && !descVideo.videoId) {
                const videoId = `${crypto.randomUUID()}-${Date.now()}`;
                const ext = descVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const filename = `${videoId}.${ext}`;

                console.log(`[Submit] Starting background upload for Drill Desc Video`);

                await queueUpload(descVideo.file, 'desc', {
                    videoId,
                    filename,
                    cuts: descVideo.cuts || [],
                    title: `[DRILL DESC] ${formData.title}`,
                    description: formData.description,
                    drillId: contentId,
                    videoType: 'desc',
                    instructorName,
                    thumbnailUrl: finalThumbnailUrl
                });
            }



            success(`${CONTENT_LABELS[contentType]} 업로드/수정 완료!`);

            // Navigate back using history to avoid full page reload
            setTimeout(() => {
                navigate(-1);
            }, 500);

        } catch (err: any) {
            console.error(err);
            toastError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render Video Box Helper
    const renderVideoBox = (type: 'main' | 'desc', state: ProcessingState, label: string) => {
        const isMain = type === 'main';
        // const isDesc = type === 'desc';
        // const setter = isMain ? setMainVideo : (isDesc ? setDescVideo : setPreviewVideo);
        const setter = isMain ? setMainVideo : setDescVideo;

        if (state.status === 'idle' || state.status === 'error') {
            return (
                <div className="h-full flex flex-col">
                    <div className="border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-violet-500 hover:bg-zinc-800/50 transition-all cursor-pointer relative flex-1 flex flex-col items-center justify-center group min-h-[250px]">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type, setter)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                            <Upload className="w-8 h-8 text-zinc-400 group-hover:text-violet-400" />
                        </div>
                        <p className="font-bold text-white text-lg mb-2">{label} 업로드</p>
                        <p className="text-sm text-zinc-500">탭하여 동영상 선택</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-full flex flex-col">
                <div className="border-2 border-zinc-700 bg-zinc-800/50 rounded-xl overflow-hidden flex-1 flex flex-col min-h-[250px] relative group">
                    {state.previewUrl && (
                        <div className="absolute inset-0 bg-black">
                            <video src={state.previewUrl} className="w-full h-full object-cover opacity-60" autoPlay muted loop playsInline />
                        </div>
                    )}
                    <div className="relative z-10 p-4 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                            <div className="bg-black/60 backdrop-blur rounded px-2 py-1">
                                <p className="text-sm text-white max-w-[150px] truncate">{state.file?.name || 'Uploaded Video'}</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveEditor(type)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur rounded-full text-zinc-300 hover:text-white transition-all text-[11px] font-bold border border-white/10 hover:bg-white/10"
                                >
                                    <Scissors className="w-3.5 h-3.5 text-violet-400" /> 편집하기
                                </button>
                                <button
                                    onClick={() => setter(initialProcessingState)}
                                    className="p-2 bg-black/60 backdrop-blur rounded-full text-zinc-400 hover:text-rose-400 transition-all border border-white/10 hover:bg-rose-500/10"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (activeEditor) {
        // Video Editor View
        const activeState = activeEditor === 'main' ? mainVideo : descVideo;
        return (
            <div className="min-h-screen bg-zinc-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">영상 편집</h2>
                        <Button variant="secondary" onClick={() => setActiveEditor(null)}>취소</Button>
                    </div>
                    {activeState.previewUrl && (
                        <VideoEditor
                            videoUrl={activeState.previewUrl}
                            onSave={handleCutsSave}
                            onCancel={() => setActiveEditor(null)}
                            aspectRatio={contentType === 'drill' ? '9:16' : '16:9'}
                            thumbnailAspectRatio={
                                contentType === 'drill' ? 9 / 16 :
                                    contentType === 'lesson' ? 16 / 9 :
                                        1
                            }
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/creator')} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            {isEditMode ? `${CONTENT_LABELS[contentType]} 수정` : `새 ${CONTENT_LABELS[contentType]} 만들기`}
                        </h1>
                        {!isEditMode && (
                            <div className="flex gap-2 mt-2">
                                {(['drill', 'lesson'] as ContentType[]).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setContentType(type)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${contentType === type
                                            ? 'bg-violet-600 border-violet-600 text-white'
                                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                            }`}
                                    >
                                        {CONTENT_LABELS[type]}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Metadata Form */}
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">제목</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 transition-all"
                            />
                        </div>
                        {/* Admin: Creator Selection */}
                        {isAdmin && (
                            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl mb-4">
                                <label className="block text-sm font-bold text-violet-400 mb-2">
                                    인스트럭터 선택 (관리자 대리 업로드)
                                </label>
                                <select
                                    value={selectedCreatorId}
                                    onChange={(e) => setSelectedCreatorId(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-violet-500/30 rounded-xl text-white outline-none focus:border-violet-500"
                                >
                                    <option value="">본인 (관리자 계정)</option>
                                    {creators.map(creator => (
                                        <option key={creator.id} value={creator.id}>
                                            {creator.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-zinc-500 mt-2">
                                    * 선택한 인스트럭터의 명의로 콘텐츠가 생성/수정됩니다.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {contentType === 'sparring' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">스파링 종류 (Category)</label>
                                        <select
                                            value={formData.sparringType}
                                            onChange={e => setFormData({ ...formData, sparringType: e.target.value as any })}
                                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                                        >
                                            <option value="Sparring">스파링 (Sparring)</option>
                                            <option value="Competition">컴페티션 (Competition)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">가격 (Price)</label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={formData.price}
                                            onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                                            placeholder="0 (무료 자료)"
                                        />
                                        <p className="text-xs text-zinc-500 mt-1">0원 = 무료 자료, 0원 초과 = 판매 상품</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">포지션 (Category)</label>
                                        <select
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value as QuantentPosition })}
                                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                                        >
                                            {Object.values(QuantentPosition).map(pos => (
                                                <option key={pos} value={pos}>{pos}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">레벨 (Level)</label>
                                        <select
                                            value={formData.level}
                                            onChange={e => setFormData({ ...formData, level: e.target.value as ContentLevel })}
                                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                                        >
                                            {Object.values(ContentLevel).map(lvl => (
                                                <option key={lvl} value={lvl}>{lvl}</option>
                                            ))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">복장 (Uniform)</label>
                                <select
                                    value={formData.uniformType}
                                    onChange={e => setFormData({ ...formData, uniformType: e.target.value as UniformType })}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500"
                                >
                                    {Object.values(UniformType).map(u => (
                                        <option key={u} value={u}>{u}</option>
                                    ))}
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
                                placeholder="상세 설명을 입력하세요"
                            />
                        </div>

                        {/* Thumbnail Upload Section */}
                        <div className="pt-4 border-t border-zinc-800/50">
                            <label className="block text-sm font-semibold text-zinc-400 mb-3">썸네일 (Thumbnail)</label>

                            {/* NEW: Vimeo Thumbnail Selector (Only if Vimeo URL exists) */}
                            {mainVideo.vimeoUrl && (
                                <div className="mb-8 p-6 bg-violet-500/5 rounded-2xl border border-violet-500/20">
                                    <VimeoThumbnailSelector
                                        vimeoId={mainVideo.vimeoUrl}
                                        onSelect={(url) => setThumbnailUrl(url)}
                                        currentThumbnailUrl={thumbnailUrl}
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div className="space-y-4">
                                    <ImageUploader
                                        onUploadComplete={(url) => setThumbnailUrl(url)}
                                        currentImageUrl={thumbnailUrl}
                                        bucketName="lesson-thumbnails"
                                    />
                                    <p className="text-xs text-zinc-500 italic">
                                        * 비디오에서 자동 추출된 썸네일 대신 커스텀 이미지를 업로드하여 사용할 수 있습니다.
                                    </p>
                                </div>
                                {thumbnailUrl && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500 font-medium">현재 썸네일 미리보기</p>
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800">
                                            <img
                                                src={thumbnailUrl}
                                                alt="Current Thumbnail"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>


                </div>

                {/* Video Upload Area */}
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden">
                    {contentType === 'drill' ? (
                        <>
                            <div className="flex border-b border-zinc-800">
                                <button
                                    onClick={() => setActiveTab('main')}
                                    className={`flex-1 py-4 font-bold transition-all ${activeTab === 'main' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}
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
                            <div className="p-6">
                                {activeTab === 'main'
                                    ? renderVideoBox('main', mainVideo, '동작 영상')
                                    : renderVideoBox('desc', descVideo, '설명 영상')
                                }
                            </div>
                        </>
                    ) : contentType === 'sparring' ? (
                        <>
                            <div className="flex border-b border-zinc-800">
                                <button
                                    onClick={() => setActiveTab('main')}
                                    className={`flex-1 py-4 font-bold transition-all ${activeTab === 'main' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}
                                >
                                    스파링 영상
                                </button>
                            </div>
                            <div className="p-6">
                                {renderVideoBox('main', mainVideo, '스파링 영상')}
                            </div>
                        </>
                    ) : (
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-white mb-4">영상 업로드</h3>
                            {renderVideoBox('main', mainVideo, `${CONTENT_LABELS[contentType]} 영상`)}
                        </div>
                    )}
                </div>

                {/* Submit Actions */}
                <div className="flex gap-3 pt-4">
                    <Button variant="secondary" onClick={() => navigate('/creator')} className="px-6">취소</Button>
                    {(() => {
                        // For drills, both main and desc videos are required
                        const isDrillRequirementsmet = contentType === 'drill'
                            ? (mainVideo.status === 'complete' || mainVideo.status === 'completed' || !!mainVideo.videoId || (!!mainVideo.file && !!mainVideo.cuts)) &&
                            (descVideo.status === 'complete' || descVideo.status === 'completed' || !!descVideo.videoId || (!!descVideo.file && !!descVideo.cuts))
                            : true;

                        // For lessons and sparring, only main video is required for CREATE mode.
                        // For EDIT mode, we allow submitting even if NO NEW video is uploaded.
                        const isMainVideoValid = isEditMode
                            ? true // In edit mode, we can always submit metadata updates
                            : (mainVideo.status === 'complete' || mainVideo.status === 'completed' || !!mainVideo.videoId || (!!mainVideo.file && !!mainVideo.cuts));

                        const canSubmit = !isSubmitting && !!formData.title &&
                            (contentType === 'drill' ? isDrillRequirementsmet : isMainVideoValid);

                        return (
                            <Button
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={!canSubmit}
                                className="flex-1 bg-violet-600 hover:bg-violet-700"
                            >
                                {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : '업로드 완료'}
                            </Button>
                        );
                    })()}
                </div>
            </div >
        </div >
    );
};
