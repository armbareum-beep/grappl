import * as tus from 'tus-js-client';
import { createUploadLink } from './client';

export interface UploadOptions {
    file: File;
    title: string;
    description?: string;
    onProgress?: (progress: number) => void;
    onComplete?: (videoId: string) => void;
    onError?: (error: Error) => void;
}

export interface UploadResult {
    videoId: string;
    uri: string;
    embedUrl: string;
    link: string;
}

/**
 * Vimeo에 영상 업로드 (TUS 프로토콜 사용)
 */
export async function uploadToVimeo(options: UploadOptions): Promise<UploadResult> {
    const { file, title, description = '', onProgress, onComplete, onError } = options;

    try {
        // 1단계: Vimeo에 업로드 요청 생성
        const uploadData: any = await createUploadLink(file.size, title, description);

        const uploadLink = uploadData.upload.upload_link;
        const videoUri = uploadData.uri;
        const videoId = videoUri.split('/').pop();

        // 2단계: TUS를 사용하여 실제 파일 업로드
        return new Promise((resolve, reject) => {
            const upload = new tus.Upload(file, {
                uploadUrl: uploadLink,
                endpoint: uploadLink,
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
                    const result: UploadResult = {
                        videoId: videoId!,
                        uri: videoUri,
                        embedUrl: `https://player.vimeo.com/video/${videoId}`,
                        link: `https://vimeo.com/${videoId}`
                    };

                    onComplete?.(videoId!);
                    resolve(result);
                }
            });

            // 업로드 시작
            upload.start();
        });
    } catch (error: any) {
        const err = new Error(`Vimeo upload request failed: ${error.message}`);
        onError?.(err);
        throw err;
    }
}

/**
 * 업로드 취소 가능한 버전
 */
export class VimeoUploader {
    private upload: tus.Upload | null = null;

    async start(options: UploadOptions): Promise<UploadResult> {
        const { file, title, description = '', onProgress, onComplete, onError } = options;

        try {
            const uploadData: any = await createUploadLink(file.size, title, description);

            const uploadLink = uploadData.upload.upload_link;
            const videoUri = uploadData.uri;
            const videoId = videoUri.split('/').pop();

            return new Promise((resolve, reject) => {
                this.upload = new tus.Upload(file, {
                    uploadUrl: uploadLink,
                    endpoint: uploadLink,
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
                        const result: UploadResult = {
                            videoId: videoId!,
                            uri: videoUri,
                            embedUrl: `https://player.vimeo.com/video/${videoId}`,
                            link: `https://vimeo.com/${videoId}`
                        };

                        onComplete?.(videoId!);
                        resolve(result);
                    }
                });

                this.upload.start();
            });
        } catch (error: any) {
            const err = new Error(`Vimeo upload request failed: ${error.message}`);
            onError?.(err);
            throw err;
        }
    }

    /**
     * 업로드 취소
     */
    cancel() {
        if (this.upload) {
            this.upload.abort();
            this.upload = null;
        }
    }

    /**
     * 업로드 일시정지
     */
    pause() {
        if (this.upload) {
            this.upload.abort(false); // false = 재개 가능
        }
    }

    /**
     * 업로드 재개
     */
    resume() {
        if (this.upload) {
            this.upload.start();
        }
    }
}
