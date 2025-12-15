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
    uploadVideo: async (file: File, onProgress?: (percent: number) => void, accessToken?: string): Promise<UploadResponse> => {
        // Generate unique filename
        const uniqueId = crypto.randomUUID();
        const extension = file.name.split('.').pop();
        const filename = `${uniqueId}.${extension}`;

        // Dynamic import Supabase credentials
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const BUCKET_NAME = 'raw_videos_v2';

        // Dynamic import tus-js-client
        const tus = await import('tus-js-client');

        return new Promise((resolve, reject) => {
            const upload = new tus.Upload(file, {
                endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
                retryDelays: [0, 3000, 5000, 10000, 20000],
                headers: {
                    authorization: accessToken ? `Bearer ${accessToken}` : `Bearer ${SUPABASE_KEY}`,
                    'x-upsert': 'true', // Optional
                },
                uploadDataDuringCreation: false,
                removeFingerprintOnSuccess: true, // Needed for repeated uploads of same file
                metadata: {
                    bucketName: BUCKET_NAME,
                    objectName: filename,
                    contentType: file.type,
                    cacheControl: '3600',
                },
                chunkSize: 6 * 1024 * 1024, // Reverted to 6MB (Safe standard limit)
                onError: (error) => {
                    console.error('TUS upload failed:', error);
                    reject(error);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = (bytesUploaded / bytesTotal * 100).toFixed(2);
                    if (onProgress) onProgress(parseFloat(percentage));
                },
                onSuccess: () => {
                    if (onProgress) onProgress(100);
                    resolve({
                        success: true,
                        videoId: uniqueId,
                        filename: filename,
                        originalPath: `${BUCKET_NAME}/${filename}`
                    });
                },
            });

            // Start the upload
            upload.findPreviousUploads().then((previousUploads) => {
                // Ask the user to resume the upload if we found a previous upload?
                // For now, simplify and just start.
                if (previousUploads.length) {
                    upload.resumeFromPreviousUpload(previousUploads[0]);
                }
                upload.start();
            });
        });
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
