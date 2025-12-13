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
    isBackgroundUploading?: boolean;
    uploadProgress?: number;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    filename: null,
    previewUrl: null,
    cuts: null,
    status: 'idle',
    error: null,
    isBackgroundUploading: false
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

    // NoSleep Video Ref
    const noSleepVideoRef = React.useRef<HTMLVideoElement>(null);

    // Helper: Enable NoSleep Video
    const enableNoSleep = () => {
        if (noSleepVideoRef.current) {
            noSleepVideoRef.current.play().catch(err => console.log('NoSleep video play failed:', err));
        }
    };

    // Wake Lock
    useEffect(() => {
        let wakeLock: WakeLockSentinel | null = null;

        const requestWakeLock = async () => {
            // Check if we need a lock: Submitting OR Background Uploading
            const needLock = isSubmitting || actionVideo.isBackgroundUploading || descVideo.isBackgroundUploading;

            if ('wakeLock' in navigator && needLock) {
                try {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                    console.log('Wake Lock active');

                    wakeLock.addEventListener('release', () => {
                        console.log('Wake Lock released');
                    });
                } catch (err) {
                    console.error('Wake Lock error:', err);
                }
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock) {
                wakeLock.release().catch(console.error);
            }
        };
    }, [isSubmitting, actionVideo.isBackgroundUploading, descVideo.isBackgroundUploading]);

    const handleFileUpload = async (
        file: File,
        type: 'action' | 'desc',
        setVideoState: React.Dispatch<React.SetStateAction<ProcessingState>>
    ) => {
        // 1. Instant Local Preview
        const objectUrl = URL.createObjectURL(file);

        setVideoState(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready', // Immediately ready for editing
            isBackgroundUploading: true,
            error: null
        }));

        // Auto-open editor immediately
        setActiveEditor(type);

        // 2. Background Upload
        try {
            console.log(`Starting background upload for ${type}...`);

            // Set status to uploading specifically for UI feedback if we wanted to show it (but we show "ready" currently)
            // Actually, we want to show 'uploading' visual if we want the bar. 
            // But currently the logic sets it to 'ready' immediately for local preview.
            // Let's keep it 'ready' but show a small progress indicator in the 'ready' card?
            // OR the user asked "Why do I have to wait?". 
            // In the current flow (Fire-forget), we let them edit WHILE uploading.
            // So the "Waiting" happens at the END (handleSubmit).
            // So we need the progress bar THERE if it's still uploading.

            const uploadRes = await videoProcessingApi.uploadVideo(file, (percent) => {
                setVideoState(prev => ({ ...prev, uploadProgress: percent }));
            });

            setVideoState(prev => ({
                ...prev,
                videoId: uploadRes.videoId,
                filename: uploadRes.filename,
                isBackgroundUploading: false
            }));
            console.log(`Background upload complete for ${type}`);

            // Note: We skip generatePreview entirely as we use the local file

        } catch (err: any) {
            console.error(err);
            setVideoState(prev => ({
                ...prev,
                isBackgroundUploading: false,
                error: '백그라운드 업로드 실패: ' + err.message
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
        if (!user) return;

        // Validation
        if (!actionVideo.cuts) {
            alert('동작 영상을 편집해주세요.');
            return;
        }
        if (!descVideo.cuts) {
            alert('설명 영상을 편집해주세요.');
            return;
        }

        // Check if background uploads are finished
        if (actionVideo.isBackgroundUploading || descVideo.isBackgroundUploading) {
            setSubmissionProgress('영상 원본 업로드를 마무리하는 중입니다...');
            setIsSubmitting(true);

            // Wait loop
            const checkUploads = setInterval(() => {
                if (!actionVideo.isBackgroundUploading && !descVideo.isBackgroundUploading) {
                    clearInterval(checkUploads);
                    if (actionVideo.error || descVideo.error) {
                        setIsSubmitting(false);
                        alert('영상 업로드 중 오류가 발생했습니다. 다시 시도해주세요.');
                    } else {
                        startProcessing(); // Proceed
                    }
                }
            }, 1000);
            return;
        }

        startProcessing();
    };

    const startProcessing = async () => {
        if (!user || !actionVideo.videoId || !actionVideo.filename || !descVideo.videoId || !descVideo.filename || !actionVideo.cuts || !descVideo.cuts) {
            alert('업로드 정보가 불완전합니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        setIsSubmitting(true);
        setSubmissionProgress('드릴 정보를 등록 중입니다...');

        try {
            // 1. Create Drill Record First (Database)
            // Use placeholder for videos, they will be updated by backend
            const { data: drill, error: dbError } = await createDrill({
                title: formData.title,
                description: formData.description,
                creatorId: user.id,
                category: formData.category,
                difficulty: formData.difficulty,
                vimeoUrl: '', // Will be updated by backend
                descriptionVideoUrl: '', // Will be updated by backend
                thumbnailUrl: 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...', // Temporary thumbnail
                durationMinutes: 0,
            });

            if (dbError || !drill) throw dbError;

            console.log('Drill created:', drill.id);

            // 2. Trigger Background Processing (Fire & Forget)
            setSubmissionProgress('영상 처리를 요청하는 중...');

            // We await the *request* (which returns 202 instant), but the actual processing happens in background
            await videoProcessingApi.processVideo(
                actionVideo.videoId,
                actionVideo.filename,
                actionVideo.cuts,
                `[Drill] ${formData.title}`,
                formData.description,
                drill.id,
                'action'
            );

            await videoProcessingApi.processVideo(
                descVideo.videoId,
                descVideo.filename,
                descVideo.cuts,
                `[Drill Explanation] ${formData.title}`,
                `Explanation for ${formData.title}`,
                drill.id,
                'desc'
            );

            // 3. Navigate Immediately
            setSubmissionProgress('완료! 대시보드로 이동합니다.');
            setTimeout(() => {
                navigate('/creator');
            }, 500);

        } catch (err: any) {
            console.error(err);
            alert('처리 중 오류가 발생했습니다: ' + err.message);
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
                    <div className="border-2 border-slate-800 bg-slate-900 rounded-xl p-6 flex-1 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden">
                        {/* Progress Bar Background (Optional) */}
                        {state.status === 'uploading' && (
                            <div className="w-full max-w-[200px] bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-full transition-all duration-300 ease-out"
                                    style={{ width: `${state.uploadProgress || 0}%` }}
                                ></div>
                            </div>
                        )}

                        {state.status === 'uploading' ? (
                            <>
                                <p className="text-white font-bold text-lg mb-1">
                                    영상 전송 중... {state.uploadProgress}%
                                </p>
                                <p className="text-slate-500 text-xs text-center px-4">
                                    유튜브처럼 이 창을 닫으면 전송이 멈춥니다.<br />
                                    100%가 되면 대시보드로 이동하셔도 됩니다!
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mb-6"></div>
                                <p className="text-white font-bold text-lg">미리보기 생성 중...</p>
                                <p className="text-slate-400 text-sm mt-2">잠시만 기다려주세요</p>
                            </>
                        )}
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
                            <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-1.5 flex flex-col items-start gap-1 min-w-[120px]">
                                <p className="text-sm font-medium text-white truncate max-w-[200px]">{state.file?.name}</p>
                                {state.isBackgroundUploading && (
                                    <div className="w-full">
                                        <div className="flex justify-between text-xs text-blue-400 mb-1">
                                            <span>☁️ 전송 중...</span>
                                            <span>{state.uploadProgress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-1">
                                            <div
                                                className="bg-blue-400 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${state.uploadProgress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
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
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-2xl border border-slate-800 text-center max-w-md w-full relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-gradient"></div>

                    <div className="mb-8 relative">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
                            <Upload className="w-10 h-10 text-blue-500" />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-20 h-20 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
                        </div>
                    </div>

                    <h2 className="text-xl font-bold text-white mb-3">{submissionProgress}</h2>

                    <div className="bg-slate-800/50 rounded-lg p-4 mb-6 text-left">
                        <p className="text-slate-400 text-sm leading-relaxed">
                            <span className="text-blue-400 font-bold block mb-1">📢 잠시만 기다려주세요!</span>
                            영상 원본을 서버로 안전하게 전송하고 있습니다. 전송이 완료되면 자동으로 대시보드로 이동하며, 복잡한 처리는 서버가 알아서 진행합니다.
                        </p>
                    </div>

                    <p className="text-red-400 text-xs font-bold animate-pulse bg-red-400/10 py-2 rounded">
                        ⚠️ 화면을 끄거나 창을 닫지 마세요!
                    </p>

                    {/* Hidden NoSleep Video */}
                    <video
                        ref={noSleepVideoRef}
                        className="hidden"
                        playsInline
                        muted
                        loop
                        // Minimal 1s black MP4 (Base64)
                        src="data:video/mp4;base64,AAAAHGZ0eXBNNEVAAAAAAAEAAQAAAAAAAAAAAAAAAgAAAAA="
                    />
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
                            aspectRatio="9:16"
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

