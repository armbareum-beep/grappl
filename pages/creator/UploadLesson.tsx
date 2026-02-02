import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty, UniformType } from '../../types';
import { createLesson, getLesson, updateLesson } from '../../lib/api-lessons';
import { uploadThumbnail, getCreators } from '../../lib/api';
import { formatDuration } from '../../lib/vimeo';
import { ArrowLeft, Upload, FileVideo, Scissors, Loader, Type, AlignLeft, Users } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';
import { Creator } from '../../types';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    filename: string | null;
    previewUrl: string | null;
    cuts: { start: number; end: number }[] | null;
    thumbnailBlob: Blob | null;
    status: 'idle' | 'uploading' | 'previewing' | 'ready' | 'processing' | 'complete' | 'error';
    progress: number;
    error: string | null;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    filename: null,
    previewUrl: null,
    cuts: null,
    thumbnailBlob: null,
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

    // Admin Proxy Upload State
    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');

    // Global Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: Difficulty.Beginner,
        category: VideoCategory.Standing,
        uniformType: UniformType.Gi,
    });
    const [isLoading, setIsLoading] = useState(false);

    // Video State (Lessons typically have one main video)
    const [videoState, setVideoState] = useState<ProcessingState>(initialProcessingState);

    // Fetch creators for admin
    useEffect(() => {
        if (isAdmin) {
            getCreators().then(setCreators).catch(console.error);
        }
    }, [isAdmin]);

    // Data Fetching for Edit Mode
    useEffect(() => {
        if (!isEditMode || !id) return;

        async function fetchLesson() {
            setIsLoading(true);
            try {
                const { data, error } = await getLesson(id!);
                if (error) throw error;
                if (data) {
                    setFormData({
                        title: data.title,
                        description: data.description || '',
                        difficulty: data.difficulty || Difficulty.Beginner,
                        category: data.category || VideoCategory.Standing,
                        uniformType: (data.uniformType as UniformType) || UniformType.Gi,
                    });
                    if (data.creatorId) {
                        setSelectedCreatorId(data.creatorId);
                    }
                    // We don't preload videoState as we only show it if user wants to replace video
                }
            } catch (err) {
                console.error('Failed to fetch lesson:', err);
                alert('레슨 정보를 불러오는데 실패했습니다.');
                navigate('/creator');
            } finally {
                setIsLoading(false);
            }
        }
        fetchLesson();
    }, [id, isEditMode, navigate]);

    // Video Editor State (for trimming)
    const [isVideoEditorOpen, setIsVideoEditorOpen] = useState(false);

    // Overall Progress
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFileUpload = async (file: File) => {
        // 1. Instant Local Preview (like UploadDrill)
        const objectUrl = URL.createObjectURL(file);

        setVideoState(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready', // Immediately ready for editing
            error: null
        }));

        // Auto-open editor immediately
        setIsVideoEditorOpen(true);
    };

    const handleCutsSave = (cuts: { start: number; end: number }[], thumbnailBlob?: Blob) => {
        setVideoState(prev => ({ ...prev, cuts, thumbnailBlob: thumbnailBlob || null }));
        setIsVideoEditorOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        // Validation

        if (!formData.title) {
            alert('제목을 입력해주세요.');
            return;
        }

        // Create mode requires video
        if (!isEditMode && !videoState.file) {
            alert('영상을 업로드해주세요.');
            return;
        }

        // If file selected but not processed (e.g. valid duration check), generally queueUpload handles it,
        // but if user opened editor, they should finish it.
        // We assume ready if file exists.

        setIsSubmitting(true);

        try {
            let lessonId = id;
            let finalVideoId = videoState.videoId;
            let currentThumbnailUrl = '';

            // Calculate duration from cuts
            let durationMinutes = 0;
            let totalSeconds = 0;
            if (videoState.cuts && videoState.cuts.length > 0) {
                totalSeconds = videoState.cuts.reduce((acc, cut) => acc + (cut.end - cut.start), 0);
                durationMinutes = Math.floor(totalSeconds / 60);
            } else if (videoState.file) {
                // If no cuts but file exists, likely full video if we had duration.
                // But without cuts/metadata loaded we might not know it yet if user skips editor.
                // However, editor auto-opens.
            }

            // 1. Database Operation
            if (isEditMode && lessonId) {
                // UPDATE
                const updatePayload: any = {
                    title: formData.title,
                    description: formData.description,
                    difficulty: formData.difficulty,
                    category: formData.category,
                    uniformType: formData.uniformType,
                    // Only update video fields if a new video is being uploaded
                    vimeoUrl: videoState.videoId ? '' : undefined, // Reset vimeoUrl if new video
                };

                if (videoState.thumbnailBlob) {
                    const { url, error: thumbError } = await uploadThumbnail(videoState.thumbnailBlob);
                    if (thumbError) {
                        console.error('Thumbnail upload failed:', thumbError);
                        throw new Error('썸네일 업로드에 실패했습니다. (권한 또는 네트워크 오류)');
                    }
                    if (url) {
                        updatePayload.thumbnailUrl = url;
                        currentThumbnailUrl = url;
                    }
                }

                if (videoState.videoId) {
                    updatePayload.durationMinutes = durationMinutes;
                    updatePayload.length = formatDuration(totalSeconds); // Update length string too
                }

                const { error } = await updateLesson(lessonId, updatePayload);
                if (error) throw error;
            } else {
                // CREATE
                if (!videoState.file) throw new Error('No video file');
                finalVideoId = crypto.randomUUID();

                // Determine Creator ID
                const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user.id;

                if (videoState.thumbnailBlob) {
                    const { url, error: thumbError } = await uploadThumbnail(videoState.thumbnailBlob);
                    if (thumbError) {
                        console.error('Thumbnail upload failed:', thumbError);
                        throw new Error('썸네일 업로드에 실패했습니다. (권한 또는 네트워크 오류)');
                    }
                    if (url) {
                        currentThumbnailUrl = url;
                    }
                }

                const { data: newLesson, error } = await createLesson({
                    courseId: null,
                    creatorId: effectiveCreatorId,
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    lessonNumber: 1,
                    vimeoUrl: '',
                    length: formatDuration(totalSeconds),
                    difficulty: formData.difficulty,
                    uniformType: formData.uniformType,
                    durationMinutes: durationMinutes,
                    thumbnailUrl: currentThumbnailUrl,
                });

                if (error || !newLesson) throw error || new Error('Failed to create lesson');
                lessonId = newLesson.id;
            }

            // 2. Background Upload (Only if new file exists)
            if (videoState.file && lessonId) {
                // If creating, use generated ID. If editing, use generated ID for new video.
                // We generated finalVideoId above if creating.
                // If editing and new file, we usually generate a new videoId too.
                if (!finalVideoId) finalVideoId = crypto.randomUUID();

                await queueUpload(videoState.file, 'action', {
                    videoId: finalVideoId, // This is the UUID for the video file
                    filename: `${finalVideoId}.${videoState.file.name.split('.').pop() || 'mp4'}`,
                    cuts: videoState.cuts || [],
                    title: formData.title,
                    description: formData.description,
                    lessonId: lessonId, // Attach to this lesson
                    videoType: 'action',
                    instructorName: (isAdmin && selectedCreatorId)
                        ? (creators.find(c => c.id === selectedCreatorId)?.name || 'Unknown')
                        : (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown'),
                    thumbnailUrl: currentThumbnailUrl
                });
            }

            // 3. Finish
            success(isEditMode ? '레슨 정보가 수정되었습니다.' : '레슨이 생성되었습니다.');
            navigate('/creator?tab=materials'); // Go back to dashboard to see "Processing"

        } catch (err: any) {
            console.error('Submission error:', err);
            toastError(`오류가 발생했습니다: ${err.message} `);
            setIsSubmitting(false);
        }
    };

    // Removal of full-screen submission UI to allow background process visibility in GlobalUploadProgress

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader className="w-10 h-10 text-violet-500 animate-spin" />
                    <p className="text-zinc-500 font-medium">레슨 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (isVideoEditorOpen && videoState.previewUrl) {
        return (
            <div className="min-h-screen bg-zinc-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">레슨 영상 편집</h2>
                        <button
                            onClick={() => setIsVideoEditorOpen(false)}
                            className="px-6 py-2.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-semibold transition-all"
                        >
                            취소
                        </button>
                    </div>
                    <VideoEditor
                        videoUrl={videoState.previewUrl}
                        onSave={handleCutsSave}
                        onCancel={() => setIsVideoEditorOpen(false)}
                        thumbnailAspectRatio={16 / 9}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/creator')}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            {isEditMode ? '레슨 수정' : '새 레슨 만들기'}
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            {isEditMode ? '레슨 정보를 수정합니다' : '영상을 업로드하고 편집하여 코스에 추가하세요'}
                        </p>
                    </div>
                </div>

                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Admin: Creator Selection */}
                    {isAdmin && (
                        <div className="p-8 border-b border-zinc-800 bg-violet-500/5">
                            <div className="max-w-md">
                                <label className="flex items-center gap-2 text-sm font-bold text-violet-400 mb-3 ml-1">
                                    <Users className="w-4 h-4" />
                                    인스트럭터 선택 (관리자 대리 업로드)
                                </label>
                                <select
                                    value={selectedCreatorId}
                                    onChange={(e) => setSelectedCreatorId(e.target.value)}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-violet-500/30 rounded-xl text-white outline-none focus:border-violet-500 transition-all font-medium"
                                >
                                    <option value="">본인 (관리자 계정)</option>
                                    {creators.map(creator => (
                                        <option key={creator.id} value={creator.id}>
                                            {creator.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[11px] text-zinc-500 mt-2 ml-1">
                                    * 선택한 인스트럭터 명의로 레슨이 생성됩니다.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Form Content */}
                    <div className="p-8 space-y-8">
                        {/* Metadata Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">레슨 제목</label>
                                    <div className="relative">
                                        <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                                        <input
                                            type="text"
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            className="pl-12 w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                            placeholder="예: 가드 패스 기초"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">설명</label>
                                    <div className="relative">
                                        <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-zinc-600" />
                                        <textarea
                                            rows={3}
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                            className="pl-12 w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none transition-all placeholder:text-zinc-700"
                                            placeholder="이 레슨에서 배울 내용을 설명하세요"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">카테고리</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as VideoCategory })}
                                        className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                                    >
                                        {Object.values(VideoCategory).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">난이도</label>
                                        <select
                                            value={formData.difficulty}
                                            onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                            className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                                        >
                                            {Object.values(Difficulty).map(diff => (
                                                <option key={diff} value={diff}>{diff}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">복장</label>
                                        <select
                                            value={formData.uniformType}
                                            onChange={e => setFormData({ ...formData, uniformType: e.target.value as UniformType })}
                                            className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                                        >
                                            {Object.values(UniformType).map(u => (
                                                <option key={u} value={u}>{u}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Video Upload Area */}
                        <div className="border-t border-zinc-800/50 pt-8">
                            <label className="block text-sm font-semibold text-zinc-400 mb-4 ml-1">
                                레슨 영상 (편집 가능) <span className="text-rose-400">*</span>
                            </label>

                            {videoState.status === 'idle' || videoState.status === 'error' ? (
                                <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-16 text-center hover:border-violet-500 hover:bg-zinc-900/50 transition-all cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-16 h-16 mx-auto mb-4 text-zinc-700 group-hover:text-violet-500 transition-colors" />
                                    <p className="font-bold text-white text-lg">영상 파일 선택</p>
                                    <p className="text-sm text-zinc-500 mt-2">MP4, MOV (최대 500MB)</p>
                                    {videoState.error && <p className="text-rose-400 mt-3 font-semibold">{videoState.error}</p>}
                                </div>
                            ) : videoState.status === 'uploading' || videoState.status === 'previewing' ? (
                                <div className="border-2 border-zinc-800 bg-zinc-900/50 rounded-2xl p-12 text-center">
                                    <div className="w-full max-w-md mx-auto space-y-4">
                                        <div className="flex justify-between text-sm text-zinc-400 font-semibold">
                                            <span>{videoState.status === 'uploading' ? '업로드 중...' : '미리보기 생성 중...'}</span>
                                            <span>{videoState.progress}%</span>
                                        </div>
                                        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all duration-300"
                                                style={{ width: `${videoState.progress}% ` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-zinc-700 bg-zinc-900/50 rounded-2xl p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-violet-600/10 p-4 rounded-xl">
                                            <FileVideo className="w-7 h-7 text-violet-400" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-lg">{videoState.file?.name}</p>
                                            <p className="text-sm text-zinc-500 mt-0.5">
                                                {videoState.cuts ? `${videoState.cuts.length}개 구간 선택됨` : '편집 필요'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => setIsVideoEditorOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl font-semibold hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700"
                                        >
                                            <Scissors className="w-4 h-4 text-violet-400" />
                                            {videoState.cuts ? '편집 수정' : '영상 편집'}
                                        </button>
                                        <button
                                            onClick={() => setVideoState(initialProcessingState)}
                                            className="text-zinc-400 hover:text-rose-400 px-4 font-semibold transition-colors"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-8 border-t border-zinc-800/50 flex justify-end gap-3">
                            <button
                                onClick={() => navigate('/creator')}
                                className="px-6 py-3.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formData.title || (!isEditMode && !videoState.cuts) || (!isEditMode && !!videoState.file && !videoState.cuts)}
                                className="px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95 flex items-center gap-2"
                            >
                                {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                                {isEditMode ? '수정사항 저장' : '레슨 생성하기'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
