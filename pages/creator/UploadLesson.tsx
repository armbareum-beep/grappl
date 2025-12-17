import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Difficulty } from '../../types';
import { createLesson } from '../../lib/api';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, FileVideo, Scissors } from 'lucide-react';
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
    const { queueUpload } = useBackgroundUpload();

    // Global Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        difficulty: Difficulty.Beginner,
    });

    // Video State (Lessons typically have one main video)
    const [videoState, setVideoState] = useState<ProcessingState>(initialProcessingState);

    // Editor State
    const [isEditing, setIsEditing] = useState(false);

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
        setIsEditing(true);
    };

    const handleCutsSave = (cuts: { start: number; end: number }[]) => {
        setVideoState(prev => ({ ...prev, cuts }));
        setIsEditing(false);
    };

    const handleSubmit = async () => {
        if (!user || !videoState.file) return;

        if (!videoState.cuts) {
            alert('영상을 편집해주세요.');
            return;
        }

        setIsSubmitting(true);
        setSubmissionProgress('레슨 정보를 등록 중입니다...');

        try {
            // 1. Create Lesson Record First (Database)
            const videoId = crypto.randomUUID();
            const ext = videoState.file.name.split('.').pop()?.toLowerCase() || 'mp4';
            const filename = `${videoId}.${ext}`;

            const { data: lesson, error: dbError } = await createLesson({
                courseId: '', // Will be assigned when added to a course
                title: formData.title,
                description: formData.description,
                lessonNumber: 1, // Default, will be reordered in course editor
                vimeoUrl: '', // Will be updated by background process
                length: 0, // Will be updated later
                difficulty: formData.difficulty,
            });

            if (dbError || !lesson) throw dbError;

            console.log('Lesson created:', lesson.id);
            setSubmissionProgress('백그라운드 업로드 시작 중...');

            // 2. Queue Background Upload (use special lesson marker for backend)
            await queueUpload(videoState.file, 'action', {
                videoId: videoId,
                filename: filename,
                cuts: videoState.cuts,
                title: `[Lesson] ${formData.title}`,
                description: formData.description,
                drillId: `LESSON-${lesson.id}`, // Special marker to distinguish lessons from drills
                videoType: 'action'
            });

            // 3. Navigate Immediately
            setSubmissionProgress('완료! 대시보드로 이동합니다.');
            navigate('/creator');

        } catch (err: any) {
            console.error(err);
            alert('처리 중 오류가 발생했습니다: ' + err.message);
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

    if (isEditing && videoState.previewUrl) {
        return (
            <div className="min-h-screen bg-slate-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">레슨 영상 편집</h2>
                        <Button variant="secondary" onClick={() => setIsEditing(false)}>취소</Button>
                    </div>
                    <VideoEditor
                        videoUrl={videoState.previewUrl}
                        onSave={handleCutsSave}
                        onCancel={() => setIsEditing(false)}
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
                        <h1 className="text-2xl font-bold text-white">새 레슨 만들기</h1>
                        <p className="text-slate-400 mt-1">영상을 업로드하고 편집하여 코스에 추가하세요.</p>
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
                                        <Button variant="secondary" onClick={() => setIsEditing(true)}>
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
                                disabled={!videoState.cuts || !formData.title}
                                className="px-8 py-3 text-lg"
                            >
                                레슨 생성하기
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
