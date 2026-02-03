import React, { createContext, useContext, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useWakeLock } from '../hooks/useWakeLock';

// Types
export interface UploadTask {
    id: string; // Unique ID for this task
    file: File;
    type: 'action' | 'desc' | 'sparring' | 'preview';
    progress: number;
    status: 'uploading' | 'processing' | 'completed' | 'error';
    error?: string;
    drillId?: string; // Associated Drill ID
    isDismissed?: boolean; // UI-only dismiss state
    // Metadata for post-processing
    processingParams?: {
        videoId: string; // The UUID used for storage
        filename: string; // The full path in storage
        cuts?: { start: number; end: number }[]; // Added cuts
        title: string;
        description: string;
        drillId?: string; // For drill uploads
        lessonId?: string; // For lesson uploads
        sparringId?: string; // For sparring uploads
        courseId?: string; // For course uploads
        videoType: 'action' | 'desc' | 'sparring' | 'preview';
        instructorName?: string;
        thumbnailUrl?: string;
    };
}

interface BackgroundUploadContextType {
    tasks: UploadTask[];
    queueUpload: (
        file: File,
        type: 'action' | 'desc' | 'sparring' | 'preview',
        processingParams: UploadTask['processingParams']
    ) => Promise<void>;
    retryUpload: (taskId: string) => void;
    cancelUpload: (taskId: string) => void;
    dismissTask: (taskId: string) => void;
}

const BackgroundUploadContext = createContext<BackgroundUploadContextType | undefined>(undefined);

export const BackgroundUploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [tasks, setTasks] = useState<UploadTask[]>([]);
    const tusRefs = useRef<{ [key: string]: any }>({}); // Store tus upload instances

    // Prevent screen from turning off during upload
    const hasActiveTasks = tasks.some(t => t.status === 'uploading' || t.status === 'processing');
    useWakeLock(hasActiveTasks);

    const queueUpload = async (
        file: File,
        type: 'action' | 'desc' | 'sparring' | 'preview',
        processingParams: UploadTask['processingParams']
    ) => {
        // Create a new task entry
        const taskId = processingParams?.videoId || crypto.randomUUID();

        const newTask: UploadTask = {
            id: taskId,
            file,
            type,
            progress: 0,
            status: 'uploading',
            processingParams
        };

        setTasks(prev => [...prev, newTask]);

        // Start the actual upload
        startTusUpload(newTask);
    };

    const startTusUpload = async (task: UploadTask) => {
        try {
            const tus = await import('tus-js-client');
            const { data } = await supabase.auth.getSession();
            const accessToken = data.session?.access_token;
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
            const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

            // Direct Vimeo Upload for Videos
            const isVideoType = ['action', 'desc', 'sparring'].includes(task.type);

            if (isVideoType && task.processingParams) {
                // Retry logic for obtaining upload link (Vimeo API or network can be flaky)
                let initResponse;
                let lastError;
                let vimeoUploadData;

                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        initResponse = await fetch('/api/upload-to-vimeo', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'create_upload',
                                fileSize: task.file.size,
                                title: task.processingParams.title,
                                description: task.processingParams.description
                            })
                        });

                        if (initResponse.ok) {
                            vimeoUploadData = await initResponse.json();
                            break;
                        } else {
                            const error = await initResponse.json();
                            lastError = error.error || `HTTP ${initResponse.status}`;
                            console.warn(`[DirectVimeo] Attempt ${attempt} failed:`, lastError);
                        }
                    } catch (err: any) {
                        lastError = err.message || '네트워크 오류';
                        console.warn(`[DirectVimeo] Attempt ${attempt} networking error:`, lastError);
                    }

                    if (attempt < 3) {
                        console.log(`[DirectVimeo] Retrying link creation in ${attempt * 2}s...`);
                        await new Promise(r => setTimeout(r, attempt * 2000));
                    }
                }

                if (!vimeoUploadData) {
                    throw new Error(`업로드 준비 실패 (재시도 3회): ${lastError}`);
                }

                const { uploadLink, vimeoId } = vimeoUploadData;
                console.log('[DirectVimeo] Upload link received:', vimeoId);

                const upload = new tus.Upload(task.file, {
                    uploadUrl: uploadLink,
                    onError: (error) => {
                        console.error('Vimeo Upload Error:', error);
                        updateTaskStatus(task.id, 'error', error.message);
                    },
                    onProgress: (bytesUploaded, bytesTotal) => {
                        const percentage = (bytesUploaded / bytesTotal * 100);
                        updateTaskProgress(task.id, percentage);
                    },
                    onSuccess: async () => {
                        console.log('Vimeo Upload Complete, updating DB...', task.id);
                        updateTaskStatus(task.id, 'processing');

                        try {
                            const params = task.processingParams!;
                            const contentType = params.courseId ? 'course' :
                                (params.sparringId || params.videoType === 'sparring' ? 'sparring' :
                                    (params.lessonId ? 'lesson' : 'drill'));

                            const contentId = params.courseId || params.sparringId || params.lessonId || params.drillId || '';

                            const completeRes = await fetch('/api/upload-to-vimeo', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'complete_upload',
                                    vimeoId,
                                    contentId,
                                    contentType,
                                    videoType: params.videoType,
                                    thumbnailUrl: params.thumbnailUrl
                                })
                            });

                            if (!completeRes.ok) {
                                const error = await completeRes.json();
                                throw new Error(error.error || 'DB 업데이트 실패');
                            }

                            console.log('✅ Vimeo upload & DB update completed for:', task.id);
                            updateTaskStatus(task.id, 'completed');
                            setTimeout(() => {
                                setTasks(prev => prev.filter(t => t.id !== task.id));
                            }, 3000);
                        } catch (err: any) {
                            console.error('❌ Finalization Error:', err);
                            updateTaskStatus(task.id, 'error', '완료 처리 실패: ' + err.message);
                        }
                    },
                });

                tusRefs.current[task.id] = upload;
                upload.start();
                return;
            }

            // Legacy Supabase Storage Upload for non-video or fallback
            const BUCKET_NAME = 'raw_videos_v2';
            const upload = new tus.Upload(task.file, {
                endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
                retryDelays: [0, 1000, 3000, 5000],
                headers: {
                    authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_KEY}`,
                    'x-upsert': 'true',
                },
                metadata: {
                    bucketName: BUCKET_NAME,
                    objectName: task.processingParams?.filename || `${task.id}.mp4`,
                    contentType: task.file.type,
                    cacheControl: '3600',
                },
                chunkSize: 3 * 1024 * 1024,
                onError: (error) => {
                    console.error('TUS Upload Error:', error);
                    let message = error.message;
                    if (message.includes('object ProgressEvent')) {
                        message = '네트워크 연결 상태를 확인해주세요. (전송 중단됨)';
                    } else if (message.includes('failed to resume')) {
                        message = '업로드 재개 실패. 다시 시도해 주세요.';
                    }
                    updateTaskStatus(task.id, 'error', message);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal * 100);
                    updateTaskProgress(task.id, percentage);
                },
                onSuccess: () => {
                    console.log('Upload Complete, starting processing...', task.id);
                    updateTaskStatus(task.id, 'processing');

                    if (task.processingParams) {
                        import('../lib/vimeo-upload').then(({ processAndUploadVideo }) => {
                            const params = task.processingParams!;
                            const contentType = params.courseId ? 'course' :
                                (params.sparringId || params.videoType === 'sparring' ? 'sparring' :
                                    (params.lessonId ? 'lesson' : 'drill'));

                            const contentId = params.courseId || params.sparringId || params.lessonId || params.drillId || '';

                            processAndUploadVideo({
                                bucketName: 'raw_videos_v2',
                                filePath: params.filename,
                                title: params.title,
                                description: params.description,
                                contentType: contentType as 'lesson' | 'drill' | 'sparring',
                                contentId: contentId,
                                videoType: params.videoType as 'action' | 'desc' | undefined,
                                thumbnailUrl: params.thumbnailUrl,
                                onProgress: (stage, progress) => {
                                    updateTaskProgress(task.id, progress);
                                }
                            })
                                .then(() => {
                                    updateTaskStatus(task.id, 'completed');
                                    setTimeout(() => {
                                        setTasks(prev => prev.filter(t => t.id !== task.id));
                                    }, 3000);
                                })
                                .catch(err => {
                                    updateTaskStatus(task.id, 'error', 'Vimeo 업로드 실패: ' + (err.message || '알 수 없는 오류'));
                                });
                        });
                    } else {
                        updateTaskStatus(task.id, 'completed');
                    }
                },
            });

            tusRefs.current[task.id] = upload;
            upload.start();

        } catch (error: any) {
            console.error('Failed to init TUS:', error);
            updateTaskStatus(task.id, 'error', error.message);
        }
    };

    const updateTaskProgress = (id: string, progress: number) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, progress } : t
        ));
    };

    const updateTaskStatus = (id: string, status: UploadTask['status'], error?: string) => {
        setTasks(prev => prev.map(t =>
            t.id === id ? { ...t, status, error } : t
        ));
    };

    const retryUpload = (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.status === 'error') {
            updateTaskStatus(taskId, 'uploading');
            startTusUpload(task);
        }
    };

    const cancelUpload = (taskId: string) => {
        const upload = tusRefs.current[taskId];
        if (upload) {
            upload.abort();
            delete tusRefs.current[taskId];
        }
        setTasks(prev => prev.filter(t => t.id !== taskId));
    };

    const dismissTask = (taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, isDismissed: true } : t
        ));
    };

    return (
        <BackgroundUploadContext.Provider value={{ tasks, queueUpload, retryUpload, cancelUpload, dismissTask }}>
            {children}
        </BackgroundUploadContext.Provider>
    );
};

export const useBackgroundUpload = () => {
    const context = useContext(BackgroundUploadContext);
    if (!context) {
        throw new Error('useBackgroundUpload must be used within a BackgroundUploadProvider');
    }
    return context;
};
