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
        const error = await createResponse.json();
        throw new Error(`Vimeo create failed: ${error.error || createResponse.statusText}`);
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
        // 1. Supabase에서 파일 다운로드
        if (onProgress) onProgress('download', 0);
        console.log('[Process] Downloading from Supabase:', filePath);

        const blob = await downloadFromSupabase(bucketName, filePath);
        const file = new File([blob], filePath, { type: blob.type });

        if (onProgress) onProgress('download', 100);

        // 2. Vimeo 업로드
        if (onProgress) onProgress('vimeo', 0);
        console.log('[Process] Uploading to Vimeo...');

        const result = await uploadToVimeo({
            file,
            title,
            description,
            onProgress: (progress) => {
                if (onProgress) onProgress('vimeo', progress);
            }
        });

        if (onProgress) onProgress('vimeo', 100);

        // 3. DB 업데이트
        if (onProgress) onProgress('database', 0);
        console.log('[Process] Updating database...');

        if (contentType === 'lesson') {
            const { error } = await supabase
                .from('lessons')
                .update({
                    vimeo_url: result.vimeoId,
                    thumbnail_url: result.thumbnailUrl
                })
                .eq('id', contentId);

            if (error) throw error;
        } else if (contentType === 'sparring') {
            const { error } = await supabase
                .from('sparring_videos')
                .update({
                    video_url: result.vimeoId,
                    thumbnail_url: result.thumbnailUrl
                })
                .eq('id', contentId);

            if (error) throw error;
        } else if (contentType === 'drill') {
            const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
            const updateData: any = {
                [columnToUpdate]: result.vimeoId
            };

            if (videoType === 'action') {
                updateData.thumbnail_url = result.thumbnailUrl;
            }

            const { error } = await supabase
                .from('drills')
                .update(updateData)
                .eq('id', contentId);

            if (error) throw error;
        }

        if (onProgress) onProgress('database', 100);
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
