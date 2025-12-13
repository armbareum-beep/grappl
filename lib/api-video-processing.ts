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
        const response = await fetch(`${BACKEND_URL}/preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ videoId, filename }),
        });

        if (!response.ok) {
            throw new Error('Preview generation failed');
        }

        return response.json();
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
