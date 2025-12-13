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
    uploadVideo: async (file: File): Promise<UploadResponse> => {
        const formData = new FormData();
        formData.append('video', file);

        const response = await fetch(`${BACKEND_URL}/upload`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
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
        description: string
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
                description
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
