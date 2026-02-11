import * as tus from 'tus-js-client';

export interface MuxUploadOptions {
    file: File;
    title: string;
    description?: string;
    onProgress?: (progress: number) => void;
    onComplete?: (videoId: string) => void;
    onError?: (error: Error) => void;
}

export interface MuxUploadResult {
    videoId: string;
    playbackId: string;
    embedUrl: string;
}

/**
 * Mux에 영상 업로드 (TUS 프로토콜 사용)
 */
export async function uploadToMux(options: MuxUploadOptions): Promise<MuxUploadResult> {
    const { file, title, description = '', onProgress, onComplete, onError } = options;

    try {
        // 1단계: Mux Direct Upload 생성 (백엔드 API 호출)
        const createResponse = await fetch('/api/upload-to-mux', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'create_upload',
                fileSize: file.size,
                title,
                description
            })
        });

        if (!createResponse.ok) {
            throw new Error(`Failed to create Mux upload: ${await createResponse.text()}`);
        }

        const uploadData = await createResponse.json();
        const uploadUrl = uploadData.uploadUrl;
        const videoId = uploadData.videoId;
        const playbackId = uploadData.playbackId;

        // 2단계: TUS를 사용하여 실제 파일 업로드
        return new Promise((resolve, reject) => {
            const upload = new tus.Upload(file, {
                uploadUrl: uploadUrl,
                endpoint: uploadUrl,
                retryDelays: [0, 3000, 5000, 10000, 20000],
                metadata: {
                    filename: file.name,
                    filetype: file.type
                },
                onError: (tusError) => {
                    const err = new Error(`Upload failed: ${tusError.message}`);
                    onError?.(err);
                    reject(err);
                },
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
                    onProgress?.(percentage);
                },
                onSuccess: () => {
                    const result: MuxUploadResult = {
                        videoId,
                        playbackId,
                        embedUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`
                    };

                    onComplete?.(videoId);
                    resolve(result);
                }
            });

            upload.start();
        });
    } catch (error: any) {
        const err = new Error(`Mux upload request failed: ${error.message}`);
        onError?.(err);
        throw err;
    }
}

/**
 * 업로드 취소 가능한 버전
 */
export class MuxUploader {
    private upload: tus.Upload | null = null;

    async start(options: MuxUploadOptions): Promise<MuxUploadResult> {
        const { file, title, description = '', onProgress, onComplete, onError } = options;

        try {
            const createResponse = await fetch('/api/upload-to-mux', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create_upload',
                    fileSize: file.size,
                    title,
                    description
                })
            });

            if (!createResponse.ok) {
                throw new Error(`Failed to create Mux upload: ${await createResponse.text()}`);
            }

            const uploadData = await createResponse.json();
            const uploadUrl = uploadData.uploadUrl;
            const videoId = uploadData.videoId;
            const playbackId = uploadData.playbackId;

            return new Promise((resolve, reject) => {
                this.upload = new tus.Upload(file, {
                    uploadUrl: uploadUrl,
                    endpoint: uploadUrl,
                    retryDelays: [0, 3000, 5000, 10000, 20000],
                    metadata: {
                        filename: file.name,
                        filetype: file.type
                    },
                    onError: (tusError) => {
                        const err = new Error(`Upload failed: ${tusError.message}`);
                        onError?.(err);
                        reject(err);
                    },
                    onProgress: (bytesUploaded, bytesTotal) => {
                        const percentage = Math.round((bytesUploaded / bytesTotal) * 100);
                        onProgress?.(percentage);
                    },
                    onSuccess: () => {
                        const result: MuxUploadResult = {
                            videoId,
                            playbackId,
                            embedUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`
                        };

                        onComplete?.(videoId);
                        resolve(result);
                    }
                });

                this.upload.start();
            });
        } catch (error: any) {
            const err = new Error(`Mux upload request failed: ${error.message}`);
            onError?.(err);
            throw err;
        }
    }

    cancel() {
        if (this.upload) {
            this.upload.abort();
            this.upload = null;
        }
    }

    pause() {
        if (this.upload) {
            this.upload.abort(false);
        }
    }

    resume() {
        if (this.upload) {
            this.upload.start();
        }
    }
}
