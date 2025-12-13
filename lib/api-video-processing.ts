const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

export interface UploadResponse {
    success: boolean;
    videoId: string;
    originalPath: string;
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
        const formData = new FormData();
        formData.append('video', file);

        // Dynamic import to avoid SSR issues if used elsewhere, though not needed for client-side
        const axios = await import('axios');

        const response = await axios.default.post(`${BACKEND_URL}/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    if (onProgress) onProgress(percentCompleted);
                }
            },
        });

        return response.data;
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
