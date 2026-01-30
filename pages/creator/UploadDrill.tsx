import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty, Drill, UniformType } from '../../types';
import { createDrill, getDrillById, updateDrill, uploadThumbnail } from '../../lib/api';
import { formatDuration } from '../../lib/vimeo';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, AlertCircle, CheckCircle, Scissors, FileVideo, Trash2, Loader } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
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
    filename: null,
    previewUrl: null,
    cuts: null,
    thumbnailBlob: null,
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

    // Global Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        uniformType: UniformType.Gi,
    });

    // Video States
    const [actionVideo, setActionVideo] = useState<ProcessingState>(initialProcessingState);
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);

    // 1. Hook must be at top level
    const { queueUpload, tasks, cancelUpload } = useBackgroundUpload();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 2. Tab State for "Swipe" view
    const [activeEditor, setActiveEditor] = useState<'action' | 'desc' | null>(null);

    // Overall Progress
    const [createdDrillId] = useState<string | null>(null);

    // Tab State for "Swipe" view
    const [activeTab, setActiveTab] = useState<'action' | 'desc'>('action');

    // Fetch drill data in edit mode
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

                    // Populate existing videos
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
                } else if (result?.error) {
                    console.error('Failed to fetch drill:', result.error);
                }
            } catch (err) {
                console.error('Failed to fetch drill:', err);
                alert('드릴 정보를 불러오는데 실패했습니다.');
                navigate('/creator');
            }
        }
        fetchDrill();
    }, [id, isEditMode, navigate]);

    // NoSleep Video Ref
    const noSleepVideoRef = React.useRef<HTMLVideoElement>(null);

    // Helper: Enable NoSleep Video
    const handleEnableNoSleep = () => {
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

                    if (wakeLock) {
                        wakeLock.addEventListener('release', () => {
                            console.log('Wake Lock released');
                        });
                    }
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
                (wakeLock as any).release().catch(console.error);
            }
        };
    }, [isSubmitting, actionVideo.isBackgroundUploading, descVideo.isBackgroundUploading]);

    const handleFileUpload = async (
        file: File,
        type: 'action' | 'desc',
        setVideoState: React.Dispatch<React.SetStateAction<ProcessingState>>
    ) => {
        // Cancel existing background task if any before replacing
        const currentState = type === 'action' ? actionVideo : descVideo;
        if (currentState.videoId) {
            console.log('Cancelling previous background upload for replace:', currentState.videoId);
            cancelUpload(currentState.videoId);
        }

        // 1. Instant Local Preview
        const objectUrl = URL.createObjectURL(file);

        setVideoState(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready', // Immediately ready for editing
            isBackgroundUploading: false,
            videoId: null, // Reset videoId to allow new auto-upload
            error: null
        }));

        // Auto-open editor immediately
        setActiveEditor(type);

    };

    const handleCutsSave = async (cuts: { start: number; end: number }[], thumbnailBlob?: Blob) => {
        // Update local state first for immediate UI feedback
        if (activeEditor === 'action') {
            setActionVideo(prev => ({ ...prev, cuts, status: 'ready', thumbnailBlob: thumbnailBlob || null }));
        } else if (activeEditor === 'desc') {
            setDescVideo(prev => ({ ...prev, cuts, status: 'ready', thumbnailBlob: thumbnailBlob || null }));
        }

        // Removed auto-upload logic to prevent partial uploads.
        // Uploads will now only trigger in handleSubmit.

        setActiveEditor(null);
    };

    // Moved hook to top level

    // Sync Background Tasks to Local State
    useEffect(() => {
        if (tasks.length === 0) return;

        tasks.forEach(task => {
            // Find which video this task belongs to
            const isActionMatch = actionVideo.videoId === task.id;
            const isDescMatch = descVideo.videoId === task.id;

            if (!isActionMatch && !isDescMatch) return;

            const updateFn = isActionMatch ? setActionVideo : setDescVideo;

            updateFn(prev => {
                const newStatus = task.status === 'uploading' ? 'ready' : (task.status as any);

                // Don't update if nothing changed to prevent loops
                if (prev.uploadProgress === Math.round(task.progress) &&
                    prev.status === newStatus) {
                    return prev;
                }

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


    // Helper to check if a video exists (either already on server or ready to upload)
    // Both action and description videos are REQUIRED
    // A video is valid if: (1) it's already on server (complete status or has videoId) OR (2) has file AND cuts
    const isActionValid = (
        (actionVideo.status === 'complete' || actionVideo.status === 'completed' || !!actionVideo.videoId) ||
        (!!actionVideo.file && !!actionVideo.cuts)
    );
    const isDescValid = (
        (descVideo.status === 'complete' || descVideo.status === 'completed' || !!descVideo.videoId) ||
        (!!descVideo.file && !!descVideo.cuts)
    );

    const handleSubmit = async () => {
        if (!user) return;

        // Strict Validation: Both videos are required for ALL drills
        if (!isActionValid) {
            alert('동작 영상을 업로드하고 편집 구간을 선택해주세요.');
            setActiveTab('action');
            return;
        }

        if (!isDescValid) {
            alert('설명 영상을 업로드하고 편집 구간을 선택해주세요.');
            setActiveTab('desc');
            return;
        }

        // Additional sanity check for file+cuts relationship
        if (actionVideo.file && !actionVideo.cuts) {
            alert('동작 영상의 편집 구간을 완료해주세요.');
            setActiveTab('action');
            return;
        }
        if (descVideo.file && !descVideo.cuts) {
            alert('설명 영상의 편집 구간을 완료해주세요.');
            setActiveTab('desc');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Create OR Update Drill Record
            let currentDrillId = id || createdDrillId;
            let drillId = currentDrillId;

            if (!currentDrillId) {
                // Calculate duration from action video cuts
                const totalSeconds = actionVideo.cuts?.reduce((acc, cut) => acc + (cut.end - cut.start), 0) || 0;
                const durationMinutes = Math.floor(totalSeconds / 60);

                // Handle Thumbnail Upload if capture exists
                let thumbnailUrl = 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...';
                // Upload Thumbnail if exists
                if (actionVideo.thumbnailBlob) {
                    const { url, error: thumbError } = await uploadThumbnail(actionVideo.thumbnailBlob);
                    if (thumbError) {
                        console.error('Thumbnail upload failed:', thumbError);
                        throw new Error('썸네일 업로드에 실패했습니다. (권한 또는 네트워크 오류)');
                    }
                    if (url) {
                        thumbnailUrl = url;
                    }
                }

                const { data: drill, error: dbError } = await createDrill({
                    title: formData.title,
                    description: formData.description,
                    creatorId: user.id || '',
                    category: formData.category,
                    difficulty: formData.difficulty,
                    vimeoUrl: '',
                    descriptionVideoUrl: '',
                    thumbnailUrl: thumbnailUrl,
                    durationMinutes: durationMinutes,
                    length: formatDuration(totalSeconds),
                    uniformType: formData.uniformType,
                });
                if (dbError || !drill) throw dbError;
                drillId = drill.id;
            } else {
                // Update Metadata
                const updateParams: any = {
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    difficulty: formData.difficulty,
                    uniformType: formData.uniformType,
                };

                // Update duration if cuts have changed
                if (actionVideo.cuts) {
                    const totalSeconds = actionVideo.cuts.reduce((acc, cut) => acc + (cut.end - cut.start), 0);
                    updateParams.durationMinutes = Math.floor(totalSeconds / 60);
                    updateParams.length = formatDuration(totalSeconds);
                }

                // Handle Thumbnail Upload if capture exists
                if (actionVideo.thumbnailBlob) {
                    const { url, error: thumbError } = await uploadThumbnail(actionVideo.thumbnailBlob);
                    if (thumbError) {
                        console.error('Thumbnail upload failed:', thumbError);
                        throw new Error('썸네일 업로드에 실패했습니다. (권한 또는 네트워크 오류)');
                    }
                    if (url) {
                        updateParams.thumbnailUrl = url;
                    }
                }

                // If a new video is being uploaded, reset the corresponding URL in DB 
                // to trigger 'isProcessing' in other views immediately
                if (actionVideo.file) {
                    updateParams.vimeoUrl = '';
                    updateParams.videoUrl = ''; // Clear actual video URL to trigger processing view
                    if (!updateParams.thumbnailUrl) {
                        updateParams.thumbnailUrl = 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...';
                    }
                }
                if (descVideo.file) {
                    updateParams.descriptionVideoUrl = '';
                }

                const { error: dbError } = await updateDrill(currentDrillId, updateParams);
                if (dbError) throw dbError;
            }

            console.log('Drill record ensured:', drillId);

            // 2. Queue Background Uploads (if not already started)
            if (actionVideo.file && !actionVideo.isBackgroundUploading && !actionVideo.videoId) {
                const actionVideoId = `${crypto.randomUUID()}-${Date.now()}`;
                const actionExt = actionVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const actionFilename = `${actionVideoId}.${actionExt}`;

                await queueUpload(actionVideo.file, 'action', {
                    videoId: actionVideoId,
                    filename: actionFilename,
                    cuts: actionVideo.cuts || [],
                    title: `[Drill] ${formData.title}`,
                    description: formData.description,
                    drillId: drillId as string,
                    videoType: 'action',
                    instructorName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown'
                });
            }

            // Sync latest metadata to background tasks if they are already running
            // (Note: This is optional but good for consistency)

            if (descVideo.file && !descVideo.isBackgroundUploading && !descVideo.videoId) {
                const descVideoId = `${crypto.randomUUID()}-${Date.now()}`;
                const descExt = descVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                const descFilename = `${descVideoId}.${descExt}`;

                await queueUpload(descVideo.file, 'desc', {
                    videoId: descVideoId,
                    filename: descFilename,
                    cuts: descVideo.cuts || [],
                    title: `[Drill Explanation] ${formData.title}`,
                    description: `Explanation for ${formData.title}`,
                    drillId: drillId as string,
                    videoType: 'desc',
                    instructorName: user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown'
                });
            }

            // 3. Navigate back using history to avoid full page reload
            success(isEditMode ? '드릴 정보가 수정되었습니다.' : '드릴이 등록되었습니다.');
            setTimeout(() => {
                navigate(-1);
            }, 500);

        } catch (err: any) {
            console.error(err);
            toastError('처리 중 오류가 발생했습니다: ' + err.message);
            setIsSubmitting(false);
        }
    };

    // Render Helper for Video Box
    const renderVideoBox = (
        type: 'action' | 'desc',
        state: ProcessingState,
        label: string
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
                            <div className="bg-black/60 backdrop-blur-md rounded-lg px-3 py-2 flex flex-col items-start gap-2 w-full max-w-[200px] shadow-lg border border-white/10">
                                <p className="text-sm font-medium text-white truncate w-full">{state.file?.name}</p>
                                {state.isBackgroundUploading ? (
                                    <div className="w-full">
                                        <div className="flex justify-between text-xs text-blue-400 mb-1 font-bold animate-pulse">
                                            <span>🚀 전송 중...</span>
                                            <span>{state.uploadProgress || 0}%</span>
                                        </div>
                                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden border border-slate-600/50">
                                            <div
                                                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                                                style={{ width: `${state.uploadProgress || 0}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ) : state.error ? (
                                    <div className="w-full">
                                        <div className="flex items-center gap-1 text-xs text-red-500 font-medium mb-1">
                                            <AlertCircle className="w-3 h-3" />
                                            <span>업로드 실패</span>
                                        </div>
                                        <p className="text-[10px] text-red-400 leading-tight">{state.error}</p>
                                    </div>
                                ) : state.status === 'processing' ? (
                                    <div className="w-full">
                                        <div className="flex items-center gap-1 text-xs text-purple-400 font-bold mb-1 animate-pulse">
                                            <div className="animate-spin w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full"></div>
                                            <span>서버 처리 중...</span>
                                        </div>
                                        <p className="text-[10px] text-purple-300 leading-tight">업로드가 완료되어 영상을 합성하고 있습니다.</p>
                                    </div>
                                ) : state.status === 'completed' || state.videoId ? (
                                    <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>최종 완료</span>
                                    </div>
                                ) : state.status === 'complete' ? (
                                    <div className="flex items-center gap-1 text-xs text-green-400 font-medium">
                                        <CheckCircle className="w-3 h-3" />
                                        <span>이미 등록됨</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-xs text-yellow-400 font-medium">
                                        <div className="animate-spin w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full"></div>
                                        <span>처리 대기 중...</span>
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
                                {state.cuts || (state.status === 'complete' && !state.file) ? (
                                    <>
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <span>{state.cuts ? `${state.cuts.length}개 구간 선택됨` : '기존 설정 유지'}</span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4 text-yellow-400" />
                                        <span>편집이 필요합니다</span>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setActiveEditor(type)}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700"
                                >
                                    <Scissors className="w-4 h-4 text-violet-400" />
                                    {state.cuts ? '다시 편집' : '영상 편집'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // Removal of full-screen submission UI to allow background process visibility in GlobalUploadProgress

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
                            thumbnailAspectRatio={9 / 16}
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/creator')}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent flex items-center gap-2">
                            {isEditMode ? '드릴 수정' : '새 드릴 만들기'}
                            <span className="px-2 py-1 bg-gradient-to-r from-violet-600 to-violet-500 text-white text-[10px] rounded-full uppercase tracking-wider shadow-lg">
                                ⚡️ Super Speed
                            </span>
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            {isEditMode ? '드릴 정보를 수정합니다' : '동작과 설명을 각각 업로드하여 드릴을 완성하세요'}
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Metadata Form */}
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 space-y-5 shadow-2xl">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">드릴 제목</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                placeholder="예: 암바 드릴"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
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

                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">설명</label>
                            <textarea
                                rows={3}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none transition-all placeholder:text-zinc-700"
                                placeholder="이 드릴에 대한 설명을 입력하세요"
                            />
                        </div>
                    </div>

                    {/* Video Uploads */}
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
                        {/* Tab Header */}
                        <div className="flex border-b border-zinc-800">
                            <button
                                onClick={() => setActiveTab('action')}
                                className={`flex-1 py-4 px-6 font-bold transition-all ${activeTab === 'action'
                                    ? 'bg-violet-600/10 text-violet-400 border-b-2 border-violet-500'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    }`}
                            >
                                동작 영상
                            </button>
                            <button
                                onClick={() => setActiveTab('desc')}
                                className={`flex-1 py-4 px-6 font-bold transition-all ${activeTab === 'desc'
                                    ? 'bg-violet-600/10 text-violet-400 border-b-2 border-violet-500'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                    }`}
                            >
                                설명 영상
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {activeTab === 'action' ? renderVideoBox('action', actionVideo, '동작 영상') : renderVideoBox('desc', descVideo, '설명 영상')}
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col gap-3 pt-4">
                        {/* DEBUGGING STATE - REMOVE LATER */}
                        {/* <div className="text-xs text-zinc-500 font-mono bg-black/20 p-2 rounded block">
                            DescStatus: {descVideo.status} / File: {descVideo.file ? 'Yes' : 'No'} / Cuts: {descVideo.cuts ? 'Yes' : 'No'}
                        </div> */}

                        <div className="flex gap-3">
                            <button
                                onClick={() => navigate('/creator')}
                                className="px-6 py-3.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold transition-all"
                            >
                                취소
                            </button>

                            {(() => {
                                const isTitleValid = !!formData.title;
                                const canSubmit = !isSubmitting && isTitleValid && isActionValid && isDescValid;

                                return (
                                    <button
                                        onClick={() => {
                                            handleEnableNoSleep();
                                            handleSubmit();
                                        }}
                                        disabled={!canSubmit}
                                        className={`flex-1 px-8 py-3.5 rounded-xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2
                                            ${!canSubmit
                                                ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed opacity-50'
                                                : 'bg-violet-600 text-white hover:bg-violet-500 shadow-violet-500/20'}`
                                        }
                                    >
                                        {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                                        {isEditMode ? '수정사항 저장' : '업로드 완료'}
                                    </button>
                                );
                            })()}
                        </div>

                        {/* Validation Hints */}
                        {(!isActionValid || !isDescValid) && (
                            <p className="text-center text-xs text-red-400">
                                {!isActionValid ? '*동작 영상이 필요합니다 ' : ''}
                                {!isDescValid ? '*설명 영상이 필요합니다' : ''}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
