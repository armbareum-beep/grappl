import React, { createContext, useContext, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

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
            // Dynamic import tus-js-client to avoid SSR issues if any
            const tus = await import('tus-js-client');

            // Get session for Auth
            const { data } = await supabase.auth.getSession();
            const accessToken = data.session?.access_token;
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL; // Using correct VITE_ prefix now
            const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
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

                    // Trigger Vimeo Upload via Backend
                    if (task.processingParams) {
                        import('../lib/vimeo-upload-backend').then(({ processAndUploadVideo }) => {
                            const contentType = task.processingParams!.courseId ? 'course' :
                                (task.processingParams!.sparringId || task.processingParams!.videoType === 'sparring' ? 'sparring' :
                                    (task.processingParams!.lessonId ? 'lesson' : 'drill'));

                            const contentId = task.processingParams!.courseId ||
                                task.processingParams!.sparringId ||
                                task.processingParams!.lessonId ||
                                task.processingParams!.drillId || '';

                            processAndUploadVideo({
                                bucketName: 'raw_videos_v2',
                                filePath: task.processingParams!.filename,
                                file: task.file, // Pass file directly
                                title: task.processingParams!.title,
                                description: task.processingParams!.description,
                                contentType: contentType as 'lesson' | 'drill' | 'sparring' | 'course',
                                contentId: contentId,
                                videoType: task.processingParams!.videoType as 'action' | 'desc' | 'preview' | undefined,
                                cuts: task.processingParams!.cuts,
                                onProgress: (stage, progress) => {
                                    console.log(`[${task.id}] ${stage}: ${progress}%`);
                                    // Update task progress
                                    updateTaskProgress(task.id, progress);
                                }
                            })
                                .then(() => {
                                    console.log('✅ Backend accepted processing for:', task.id);
                                    // Stay in processing status, don't say "completed" yet 
                                    // because the backend is actually doing the work now.
                                    updateTaskStatus(task.id, 'processing');

                                    // Remove the task from the floating list after a while
                                    // to keep the UI clean, as the user can see progress in the dashboard
                                    setTimeout(() => {
                                        setTasks(prev => prev.filter(t => t.id !== task.id));
                                    }, 10000); // 10 seconds of "Processing" visible
                                })
                                .catch(err => {
                                    console.error('❌ Vimeo Processing Error:', err);
                                    updateTaskStatus(task.id, 'error', 'Vimeo 업로드 실패: ' + (err.message || '알 수 없는 오류'));
                                });
                        });
                    } else {
                        console.warn('⚠️ No processing params, marking as completed without Vimeo processing');
                        updateTaskStatus(task.id, 'completed');
                    }
                },
            });

            tusRefs.current[task.id] = upload;

            // Force fresh upload to prevent "instant complete" issues with missing files
            // (TUS resume might think it's done if previous state exists, but server file might be gone)
            console.log('Starting fresh upload for:', task.id);
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
