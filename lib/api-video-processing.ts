/// <reference types="vite/client" />
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export interface UploadResponse {
    success: boolean;
    videoId: string; // Keeps compatibility, will be the filename in storage
    originalPath: string; // Storage path
    filename: string;
}

export interface PreviewResponse {
    success: boolean;
    previewUrl: string;
}

export interface ProcessResponse {
    success: boolean;
    videoId: string;
    uri: string;
    vimeoUrl: string;
    thumbnailUrl?: string;
}

export const videoProcessingApi = {
    uploadVideo: async (file: File, onProgress?: (percent: number) => void): Promise<UploadResponse> => {
        // Generate unique filename
        const uniqueId = crypto.randomUUID();
        const extension = file.name.split('.').pop();
        const filename = `${uniqueId}.${extension}`;
        const storagePath = `raw_videos/${filename}`;

        // Import supabase client
        const { supabase } = await import('./supabase');

        // Use custom fetch for progress tracking with Supabase JS?
        // Actually, Supabase JS v2 doesn't support progress callback in upload() easily.
        // BUT, XMLHttpRequest does. 
        // To fix the 400 error reliably while keeping progress, we should use TUS (supabase-js uses it under hood for large files)
        // OR fix the Axios request.
        // The safest fix for 400 'Bad Request' is relying on the official client.
        // We will lose granular progress (it will jump 0 -> 100) unless we use TUS directly or XHR.
        // Given the user issues, STABILITY > Progress Bar accuracy right now.
        // We can simulate progress or just set it to 50%...
        // Let's use the official client first to ensure IT WORKS.

        if (onProgress) onProgress(10); // Start

        const { data, error } = await supabase.storage
            .from('raw_videos')
            .upload(filename, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            throw error;
        }

        if (onProgress) onProgress(100); // Done

        return {
            success: true,
            videoId: uniqueId,
            filename: filename,
            originalPath: storagePath
        };
    },

    generatePreview: async (videoId: string, filename: string): Promise<PreviewResponse> => {
        // 1. Start the Job
        const startRes = await fetch(`${BACKEND_URL}/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId, filename }),
        });

        if (!startRes.ok) throw new Error('Failed to start preview generation');

        const startData = await startRes.json();

        // If it was already existing or completed instantly
        if (startData.status === 'completed') {
            return startData;
        }

        const jobId = startData.jobId;

        // 2. Poll for Status
        return new Promise((resolve, reject) => {
            const checkStatus = async () => {
                try {
                    const statusRes = await fetch(`${BACKEND_URL}/status/${jobId}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === 'completed') {
                        resolve({
                            success: true,
                            previewUrl: videoProcessingApi.getPreviewUrl(statusData.previewUrl)
                        });
                    } else if (statusData.status === 'error') {
                        reject(new Error(statusData.error));
                    } else {
                        // Keep polling
                        setTimeout(checkStatus, 3000); // Check every 3 seconds
                    }
                } catch (err) {
                    reject(err);
                }
            };

            checkStatus();
        });
    },

    processVideo: async (
        videoId: string,
        filename: string,
        cuts: { start: number; end: number }[],
        title: string,
        description: string,
        drillId: string,
        videoType: 'action' | 'desc'
    ): Promise<ProcessResponse> => {
        const response = await fetch(`${BACKEND_URL}/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                videoId,
                filename,
                cuts,
                title,
                description,
                drillId,
                videoType
            }),
        });

        if (!response.ok) {
            throw new Error('Processing failed');
        }

        return response.json();
    },

    getPreviewUrl: (path: string) => {
        return `${BACKEND_URL}${path}`;
    }
};
