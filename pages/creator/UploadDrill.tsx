import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty } from '../../types';
import { createDrill } from '../../lib/api';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Video, AlertCircle, CheckCircle, Scissors, Play, FileVideo, Trash2 } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { videoProcessingApi } from '../../lib/api-video-processing';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    filename: string | null;
    previewUrl: string | null;
    cuts: { start: number; end: number }[] | null;
    status: 'idle' | 'uploading' | 'previewing' | 'ready' | 'processing' | 'complete' | 'error';
    error: string | null;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    filename: null,
    previewUrl: null,
    cuts: null,
    status: 'idle',
    error: null
};

export const UploadDrill: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // Global Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
    });

    // Video States
    const [actionVideo, setActionVideo] = useState<ProcessingState>(initialProcessingState);
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);

    // Editor State
    const [activeEditor, setActiveEditor] = useState<'action' | 'desc' | null>(null);

    // Overall Progress
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionProgress, setSubmissionProgress] = useState<string>('');

    // Tab State for "Swipe" view
    const [activeTab, setActiveTab] = useState<'action' | 'desc'>('action');

    // Wake Lock
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            if ('wakeLock' in navigator && (isSubmitting || actionVideo.status === 'uploading' || descVideo.status === 'uploading')) {
                try {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('Wake Lock active');
                } catch (err) {
                    console.error('Wake Lock error:', err);
                }
            }
        };

        requestWakeLock();

        return () => {
            if (wakeLock) {
                wakeLock.release().then(() => console.log('Wake Lock released'));
            }
        };
    }, [isSubmitting, actionVideo.status, descVideo.status]);

    const handleFileUpload = async (
        file: File,
        type: 'action' | 'desc',
        setVideoState: React.Dispatch<React.SetStateAction<ProcessingState>>
    ) => {
        setVideoState(prev => ({ ...prev, file, status: 'uploading', error: null }));

        try {
            // 1. Upload Raw
            const uploadRes = await videoProcessingApi.uploadVideo(file);
            setVideoState(prev => ({
                ...prev,
                videoId: uploadRes.videoId,
                filename: uploadRes.filename,
                status: 'previewing'
            }));

            // 2. Generate Preview
            const previewRes = await videoProcessingApi.generatePreview(uploadRes.videoId, uploadRes.filename);
            setVideoState(prev => ({
                ...prev,
                previewUrl: videoProcessingApi.getPreviewUrl(previewRes.previewUrl),
                status: 'ready'
            }));

            // Auto-open editor for the uploaded video
            setActiveEditor(type);

        } catch (err: any) {
            console.error(err);
            setVideoState(prev => ({
                ...prev,
                status: 'error',
                error: '업로드/변환 실패: ' + err.message
            }));
        }
    };

    const handleCutsSave = (cuts: { start: number; end: number }[]) => {
        if (activeEditor === 'action') {
            setActionVideo(prev => ({ ...prev, cuts }));
        } else if (activeEditor === 'desc') {
            setDescVideo(prev => ({ ...prev, cuts }));
        }
        setActiveEditor(null);
    };

    const handleSubmit = async () => {
        if (!user || !actionVideo.videoId || !descVideo.videoId) return;

        // Validation
        if (!actionVideo.cuts) {
            alert('동작 영상을 편집해주세요.');
            return;
        }
        if (!descVideo.cuts) {
            alert('설명 영상을 편집해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Process Action Video
            setSubmissionProgress('동작 영상 처리 중...');
            const actionRes = await videoProcessingApi.processVideo(
                actionVideo.videoId,
                actionVideo.filename!,
                actionVideo.cuts,
                `[Drill] ${formData.title}`,
                formData.description
            );

            // 2. Process Description Video
            setSubmissionProgress('설명 영상 처리 중...');
            const descRes = await videoProcessingApi.processVideo(
                descVideo.videoId,
                descVideo.filename!,
                descVideo.cuts,
                `[Drill Explanation] ${formData.title}`,
                `Explanation for ${formData.title}`
            );

            // 3. Save to DB
            setSubmissionProgress('저장 중...');
            const { error: dbError } = await createDrill({
                title: formData.title,
                description: formData.description,
                creatorId: user.id,
                category: formData.category,
                difficulty: formData.difficulty,
                vimeoUrl: actionRes.videoId,
                descriptionVideoUrl: descRes.videoId,
                thumbnailUrl: actionRes.thumbnailUrl || `https://vumbnail.com/${actionRes.videoId}.jpg`,
                durationMinutes: 0, // Will be updated later
            });

            if (dbError) throw dbError;

            setSubmissionProgress('완료!');
            setTimeout(() => {
                navigate('/creator');
            }, 1000);

        } catch (err: any) {
            console.error(err);
            alert('최종 처리 중 오류가 발생했습니다: ' + err.message);
            setIsSubmitting(false);
        }
    };

    // Render Helper for Video Box
    const renderVideoBox = (
        type: 'action' | 'desc',
        state: ProcessingState,
        label: string,
        required: boolean = true
    ) => {
        const isAction = type === 'action';

        if (state.status === 'idle' || state.status === 'error') {
            return (
                <div className="h-full flex flex-col">
                    <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative flex-1 flex flex-col items-center justify-center group min-h-[300px]">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type, isAction ? setActionVideo : setDescVideo)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <Upload className="w-8 h-8 text-slate-400 group-hover:text-blue-400" />
                        </div>
                        <p className="font-bold text-white text-lg mb-2">{label} 업로드</p>
                        <p className="text-sm text-slate-500">탭하여 동영상 선택</p>
                        <p className="text-xs mt-4 text-slate-600">MP4, MOV (최대 500MB)</p>
                    </div>
                    {state.error && <p className="text-sm text-red-500 mt-2 text-center">{state.error}</p>}
                </div>
            );
        }

        if (state.status === 'uploading' || state.status === 'previewing') {
            return (
                <div className="h-full flex flex-col">
                    <div className="border-2 border-slate-800 bg-slate-900 rounded-xl p-6 flex-1 flex flex-col items-center justify-center min-h-[300px]">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-6"></div>
                        <p className="text-white font-bold text-lg">
                            {state.status === 'uploading' ? '영상 업로드 중...' : '미리보기 생성 중...'}
                        </p>
                        <p className="text-slate-400 text-sm mt-2">잠시만 기다려주세요</p>
                    </div>
                </div>
            );
        }

        // Ready state
        return (
            <div className="h-full flex flex-col">
                <div className="border-2 border-slate-700 bg-slate-800/50 rounded-xl overflow-hidden flex-1 flex flex-col min-h-[300px] relative group">
                    {/* Video Preview Background */}
                    {state.previewUrl ? (
                        <div className="absolute inset-0 bg-black">
                            <video
                                src={state.previewUrl}
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        </div>
                    ) : (
                        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                            <FileVideo className="w-16 h-16 text-slate-600" />
                        </div>
                    )}

                    {/* Content Overlay */}
                    <div className="relative z-10 flex-1 flex flex-col justify-between p-6">
                        <div className="flex justify-between items-start">
                            <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5">
                                <p className="text-sm font-medium text-white truncate max-w-[200px]">{state.file?.name}</p>
                            </div>
                            <button
                                onClick={() => {
                                    if (isAction) setActionVideo(initialProcessingState);
                                    else setDescVideo(initialProcessingState);
                                }}
                                className="p-2 bg-black/60 backdrop-blur-md rounded-full text-slate-400 hover:text-red-400 hover:bg-black/80 transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-white/90 bg-black/40 p-2 rounded-lg backdrop-blur-sm w-fit">
                                {state.cuts ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span>{state.cuts.length}개 구간 선택됨</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                                        <span>편집이 필요합니다</span>
                                    </>
                                )}
                            </div>

                            <Button
                                variant="primary"
                                className="w-full py-3 text-base shadow-lg shadow-blue-500/20"
                                onClick={() => setActiveEditor(type)}
                            >
                                <Scissors className="w-4 h-4 mr-2" />
                                {state.cuts ? '구간 다시 선택하기' : '영상 편집하기'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800 text-center max-w-md w-full">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                    <h2 className="text-xl font-bold text-white mb-2">{submissionProgress}</h2>
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                    <h2 className="text-xl font-bold text-white mb-2">{submissionProgress}</h2>
                    <p className="text-slate-400">잠시만 기다려주세요.</p>
                    <p className="text-red-400 font-bold mt-2 animate-pulse">화면을 끄거나 창을 닫지 마세요!</p>
                </div>
            </div>
        );
    }

    // Editor Mode
    if (activeEditor) {
        const activeState = activeEditor === 'action' ? actionVideo : descVideo;
        return (
            <div className="min-h-screen bg-slate-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            {activeEditor === 'action' ? '동작 영상 편집' : '설명 영상 편집'}
                        </h2>
                        <Button variant="secondary" onClick={() => setActiveEditor(null)}>
                            취소
                        </Button>
                    </div>
                    {activeState.previewUrl && (
                        <VideoEditor
                            videoUrl={activeState.previewUrl}
                            onSave={handleCutsSave}
                            onCancel={() => setActiveEditor(null)}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    대시보드로 돌아가기
                </button>

                <div className="space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">새 드릴 만들기</h1>
                        <p className="text-slate-400 mt-1">동작과 설명을 각각 업로드하여 드릴을 완성하세요.</p>
                    </div>

                    {/* Metadata Form */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">드릴 제목</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="예: 암바 드릴"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">카테고리</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as VideoCategory })}
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                                >
                                    {Object.values(VideoCategory).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">난이도</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none"
                                >
                                    {Object.values(Difficulty).map(diff => (
                                        <option key={diff} value={diff}>{diff}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">설명</label>
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                placeholder="드릴에 대한 간단한 설명을 적어주세요."
                            />
                        </div>
                    </div>

                    {/* Video Upload Area - Swipeable Tabs */}
                    <div className="space-y-4">
                        <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
                            <button
                                onClick={() => setActiveTab('action')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'action'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                1. 동작 영상
                                {actionVideo.cuts && <CheckCircle className="w-3 h-3 inline ml-1.5 text-blue-200" />}
                            </button>
                            <button
                                onClick={() => setActiveTab('desc')}
                                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'desc'
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                2. 설명 영상
                                {descVideo.cuts && <CheckCircle className="w-3 h-3 inline ml-1.5 text-blue-200" />}
                            </button>
                        </div>

                        <div className="relative overflow-hidden min-h-[320px]">
                            <div
                                className="flex transition-transform duration-300 ease-in-out h-full"
                                style={{ transform: `translateX(${activeTab === 'action' ? '0%' : '-100%'})` }}
                            >
                                <div className="w-full flex-shrink-0 px-1">
                                    {renderVideoBox('action', actionVideo, '동작 영상')}
                                </div>
                                <div className="w-full flex-shrink-0 px-1">
                                    {renderVideoBox('desc', descVideo, '설명 영상')}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmit}
                        disabled={!actionVideo.cuts || !descVideo.cuts || !formData.title}
                        className="w-full py-4 text-lg font-bold shadow-xl shadow-blue-500/10"
                    >
                        드릴 생성 완료
                    </Button>
                </div>
            </div>
        </div>
    );
};

