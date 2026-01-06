import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VIMEO_TOKEN = import.meta.env.VITE_VIMEO_ACCESS_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface VimeoUploadParams {
    file: File;
    title: string;
    description: string;
    onProgress?: (progress: number) => void;
}

interface VimeoUploadResult {
    vimeoId: string;
    vimeoUrl: string;
    thumbnailUrl: string;
}

/**
 * Vimeo에 직접 업로드 (TUS 프로토콜 사용)
 * 백엔드 없이 프론트엔드에서 직접 처리
 */
export async function uploadToVimeo(params: VimeoUploadParams): Promise<VimeoUploadResult> {
    const { file, title, description, onProgress } = params;

    console.log('[Vimeo] Starting upload:', { title, size: file.size });

    // 1. Vimeo에 업로드 링크 요청
    const createResponse = await fetch('https://api.vimeo.com/me/videos', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${VIMEO_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
        },
        body: JSON.stringify({
            upload: {
                approach: 'tus',
                size: file.size
            },
            name: title,
            description: description || 'Uploaded from Grapplay',
            privacy: {
                view: 'anybody',
                embed: 'public'
            }
        })
    });

    if (!createResponse.ok) {
        const error = await createResponse.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Vimeo] Create failed:', {
            status: createResponse.status,
            statusText: createResponse.statusText,
            error: error
        });

        const errorMessage = error.developer_message || error.error || error.message || createResponse.statusText;
        throw new Error(`Vimeo 업로드 생성 실패 (${createResponse.status}): ${errorMessage}`);
    }

    const createData = await createResponse.json();
    const uploadLink = createData.upload.upload_link;
    const vimeoUri = createData.uri;
    const vimeoId = vimeoUri.split('/').pop();

    console.log('[Vimeo] Upload link created:', { vimeoId, uploadLink });

    // 2. TUS 업로드
    const tus = await import('tus-js-client');

    return new Promise((resolve, reject) => {
        const upload = new tus.Upload(file, {
            endpoint: uploadLink,
            uploadUrl: uploadLink,
            retryDelays: [0, 1000, 3000, 5000],
            metadata: {
                filename: file.name,
                filetype: file.type
            },
            onError: (error) => {
                console.error('[Vimeo] Upload error:', error);
                reject(new Error(`Vimeo upload failed: ${error.message}`));
            },
            onProgress: (bytesUploaded, bytesTotal) => {
                const percentage = (bytesUploaded / bytesTotal) * 100;
                if (onProgress) {
                    onProgress(percentage);
                }
                console.log(`[Vimeo] Progress: ${percentage.toFixed(1)}%`);
            },
            onSuccess: () => {
                console.log('[Vimeo] Upload complete:', vimeoId);
                const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg`;

                resolve({
                    vimeoId,
                    vimeoUrl: `https://vimeo.com/${vimeoId}`,
                    thumbnailUrl
                });
            }
        });

        upload.start();
    });
}

/**
 * Supabase Storage에서 파일 다운로드
 */
export async function downloadFromSupabase(bucketName: string, filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

    if (error) {
        throw new Error(`Supabase download failed: ${error.message}`);
    }

    return data;
}

/**
 * 전체 프로세스: Supabase Storage → Vimeo 업로드 → DB 업데이트
 * Vercel Serverless Function을 통해 처리
 */
export async function processAndUploadVideo(params: {
    bucketName: string;
    filePath: string;
    title: string;
    description: string;
    contentType: 'lesson' | 'drill' | 'sparring';
    contentId: string;
    videoType?: 'action' | 'desc';
    onProgress?: (stage: string, progress: number) => void;
}): Promise<VimeoUploadResult> {
    const { bucketName, filePath, title, description, contentType, contentId, videoType, onProgress } = params;

    try {
        if (onProgress) onProgress('upload', 0);
        console.log('[Process] Calling Vercel Function:', filePath);

        // Call Vercel Serverless Function
        const response = await fetch('/api/upload-to-vimeo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketName,
                filePath,
                title,
                description,
                contentType,
                contentId,
                videoType
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
        }

        const result = await response.json();

        if (onProgress) onProgress('upload', 100);
        console.log('[Process] Complete!', result);

        return result;

    } catch (error: any) {
        console.error('[Process] Failed:', error);

        // 에러 상태를 DB에 기록
        const errorUpdate: any = contentType === 'sparring'
            ? { video_url: 'error', thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error' }
            : { vimeo_url: 'error', thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error' };

        const tableName = contentType === 'lesson' ? 'lessons' :
            contentType === 'sparring' ? 'sparring_videos' : 'drills';

        await supabase
            .from(tableName)
            .update(errorUpdate)
            .eq('id', contentId);

        throw error;
    }
}
