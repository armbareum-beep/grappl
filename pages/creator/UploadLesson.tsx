import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Difficulty } from '../../types';
import { createLesson, getLesson, updateLesson } from '../../lib/api-lessons';
import { Button } from '../../components/Button';
import { formatDuration } from '../../lib/vimeo';
import { ArrowLeft, Upload, FileVideo, Scissors, Loader } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    filename: string | null;
    previewUrl: string | null;
    cuts: { start: number; end: number }[] | null;
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

    // Global Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: Difficulty.Beginner,
    });
    const [isLoading, setIsLoading] = useState(false);

    // Video State (Lessons typically have one main video)
    const [videoState, setVideoState] = useState<ProcessingState>(initialProcessingState);

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
                    });
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
    const [submissionProgress, setSubmissionProgress] = useState<string>('');

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

    const handleCutsSave = (cuts: { start: number; end: number }[]) => {
        setVideoState(prev => ({ ...prev, cuts }));
        setIsVideoEditorOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
        setSubmissionProgress('레슨 정보를 저장 중입니다...');

        try {
            let lessonId = id;
            let finalVideoId = videoState.videoId;

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
                    // Only update video fields if a new video is being uploaded
                    vimeoUrl: videoState.videoId ? '' : undefined, // Reset vimeoUrl if new video
                };

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

                const { data: newLesson, error } = await createLesson({
                    courseId: null,
                    title: formData.title,
                    description: formData.description,
                    lessonNumber: 1,
                    vimeoUrl: '',
                    length: formatDuration(totalSeconds), // Passing number, will be formatted inside API or I should format here if API expects string? API logic I wrote: length: String(data.length). So if I pass seconds, it becomes "300". 
                    // I MUST CHANGE API TO EXPECT STRING OR FORMAT HERE. 
                    // Let's format here and update API signature to string/number union or just string?
                    // Better: Update this call to pass formatDuration(totalSeconds) but createLesson expects number currently (based on my read/edit).
                    // Wait, I updated createLesson signature to accept `length: number` in step 145.
                    // But inside createLesson I did `length: String(lessonData.length)`.
                    // So I should pass raw seconds/number to createLesson, AND createLesson should format it? 
                    // NO, `formatDuration` is in `lib/vimeo`. `api-lessons` might not have it.
                    // BEST PATH: Update createLesson signature to `length: string | number`.
                    // AND pass `formatDuration(totalSeconds)` here.
                    difficulty: formData.difficulty,
                    durationMinutes: durationMinutes,
                });
                if (error || !newLesson) throw error || new Error('Failed to create lesson');
                lessonId = newLesson.id;
            }

            // 2. Background Upload (Only if new file exists)
            if (videoState.file && lessonId) {
                setSubmissionProgress('백그라운드 업로드 시작 중...');
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
                    videoType: 'action'
                });
            }

            // 3. Finish
            navigate('/creator'); // Go back to dashboard to see "Processing"

        } catch (error: any) {
            console.error('Submission error:', error);
            alert(`오류가 발생했습니다: ${error.message}`);
            setIsSubmitting(false);
        }
    };

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800 text-center max-w-md w-full">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                    <h2 className="text-xl font-bold text-white mb-2">{submissionProgress}</h2>
                    <p className="text-slate-400">잠시만 기다려주세요.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <Loader className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                    <p className="text-slate-400">레슨 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (isVideoEditorOpen && videoState.previewUrl) {
        return (
            <div className="min-h-screen bg-slate-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">레슨 영상 편집</h2>
                        <Button variant="secondary" onClick={() => setIsVideoEditorOpen(false)}>취소</Button>
                    </div>
                    <VideoEditor
                        videoUrl={videoState.previewUrl}
                        onSave={handleCutsSave}
                        onCancel={() => setIsVideoEditorOpen(false)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <button
                    onClick={() => navigate('/creator')}
                    className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    대시보드로 돌아가기
                </button>

                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
                    <div className="p-8 border-b border-slate-800">
                        <h1 className="text-2xl font-bold text-white">
                            {isEditMode ? '레슨 수정' : '새 레슨 만들기'}
                        </h1>
                        <p className="text-slate-400 mt-1">
                            {isEditMode ? '레슨 정보를 수정합니다.' : '영상을 업로드하고 편집하여 코스에 추가하세요.'}
                        </p>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* Metadata Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">레슨 제목</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="예: 가드 패스 기초"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">설명</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">난이도</label>
                                    <select
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none"
                                    >
                                        {Object.values(Difficulty).map(diff => (
                                            <option key={diff} value={diff}>{diff}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Video Upload Area */}
                        <div className="border-t border-slate-800 pt-8">
                            <label className="block text-sm font-medium text-slate-300 mb-4">
                                레슨 영상 (편집 가능) <span className="text-red-500">*</span>
                            </label>

                            {videoState.status === 'idle' || videoState.status === 'error' ? (
                                <div className="border-2 border-dashed border-slate-800 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-12 h-12 mx-auto mb-4 text-slate-600 group-hover:text-slate-500" />
                                    <p className="font-medium text-slate-300">영상 파일 선택</p>
                                    <p className="text-sm text-slate-500 mt-2">MP4, MOV (최대 500MB)</p>
                                    {videoState.error && <p className="text-red-500 mt-2">{videoState.error}</p>}
                                </div>
                            ) : videoState.status === 'uploading' || videoState.status === 'previewing' ? (
                                <div className="border-2 border-slate-800 bg-slate-900 rounded-xl p-12 text-center">
                                    <div className="w-full max-w-md mx-auto space-y-4">
                                        <div className="flex justify-between text-sm text-slate-400">
                                            <span>{videoState.status === 'uploading' ? '업로드 중...' : '미리보기 생성 중...'}</span>
                                            <span>{videoState.progress}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-blue-500 transition-all duration-300"
                                                style={{ width: `${videoState.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="border-2 border-slate-700 bg-slate-800/50 rounded-xl p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-blue-500/10 p-3 rounded-lg">
                                            <FileVideo className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{videoState.file?.name}</p>
                                            <p className="text-sm text-slate-400">
                                                {videoState.cuts ? `${videoState.cuts.length}개 구간 선택됨` : '편집 필요'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="secondary" onClick={() => setIsVideoEditorOpen(true)}>
                                            <Scissors className="w-4 h-4 mr-2" />
                                            {videoState.cuts ? '다시 편집' : '영상 편집'}
                                        </Button>
                                        <button
                                            onClick={() => setVideoState(initialProcessingState)}
                                            className="text-slate-400 hover:text-red-400 px-3"
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Submit Button */}
                        <div className="pt-8 border-t border-slate-800 flex justify-end">
                            <Button
                                onClick={handleSubmit}
                                disabled={!formData.title || (!isEditMode && !videoState.cuts) || (!!videoState.file && !videoState.cuts)}
                                className="px-8 py-3 text-lg"
                            >
                                {isEditMode ? '수정사항 저장' : '레슨 생성하기'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
