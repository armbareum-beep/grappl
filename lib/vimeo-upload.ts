import { createClient } from '@supabase/supabase-js';
import * as tus from 'tus-js-client';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface VimeoUploadResult {
    vimeoId: string;
    vimeoUrl: string;
    thumbnailUrl: string;
}

/**
 * Supabase Storage에서 파일 다운로드 (Blob 반환)
 */
export async function downloadFromSupabase(bucketName: string, filePath: string): Promise<Blob> {
    console.log(`Downloading from Supabase: ${bucketName}/${filePath}`);
    const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

    if (error) {
        throw new Error(`Supabase download failed: ${error.message}`);
    }

    return data;
}

/**
 * 스마트 하이브리드 업로드 프로세스:
 * 1. 브라우저: Supabase 다운로드
 * 2. Vercel API: Vimeo 업로드 링크 생성 (토큰 보호)
 * 3. 브라우저: Vimeo 직접 업로드 (TUS) -> 타임아웃 없음
 * 4. Vercel API: DB 업데이트 (완료 처리)
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
        // 1. Supabase에서 파일 다운로드 (브라우저 메모리)
        if (onProgress) onProgress('upload', 10); // Start
        console.log('[Process] Downloading from Supabase:', filePath);

        const blob = await downloadFromSupabase(bucketName, filePath);
        const file = new File([blob], filePath, { type: blob.type });

        if (onProgress) onProgress('upload', 30); // Downloaded

        // 2. 서버에 업로드 링크 요청 (create_upload - 인증 처리)
        if (onProgress) onProgress('upload', 35);
        console.log('[Process] Requesting upload link...');

        const initResponse = await fetch('/api/upload-to-vimeo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'create_upload',
                bucketName,
                filePath,
                title,
                description
            })
        });

        if (!initResponse.ok) {
            const err = await initResponse.json();
            throw new Error(err.error || 'Failed to create upload link');
        }

        const { uploadLink, vimeoId } = await initResponse.json();
        console.log('[Process] Upload link received:', vimeoId);

        // 3. 브라우저에서 직접 Vimeo 업로드 (TUS - 대용량 전송)
        // 타임아웃 문제 해결의 핵심: 브라우저가 직접 업로드합니다.
        if (onProgress) onProgress('upload', 40);

        await new Promise<void>((resolve, reject) => {
            const upload = new tus.Upload(file, {
                uploadUrl: uploadLink,
                onError: (error) => reject(error),
                onProgress: (bytesUploaded, bytesTotal) => {
                    const percentage = 40 + ((bytesUploaded / bytesTotal) * 50); // 40-90% range
                    if (onProgress) onProgress('upload', percentage);
                },
                onSuccess: () => resolve()
            });
            upload.start();
        });

        if (onProgress) onProgress('upload', 90);

        // 4. 서버에 완료 알림 및 DB 업데이트 요청 (complete_upload)
        console.log('[Process] Finalizing upload...');

        const completeResponse = await fetch('/api/upload-to-vimeo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'complete_upload',
                vimeoId,
                contentId,
                contentType,
                videoType
            })
        });

        if (!completeResponse.ok) {
            const err = await completeResponse.json();
            throw new Error(err.error || 'Failed to update database');
        }

        if (onProgress) onProgress('upload', 100);

        const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg`;
        console.log('[Process] All complete!', { vimeoId });

        return {
            vimeoId,
            vimeoUrl: `https://vimeo.com/${vimeoId}`,
            thumbnailUrl
        };

    } catch (error: any) {
        console.error('[Process] Failed:', error);

        // 에러 상태를 DB에 기록 (직접 수행하여 서버 의존성 줄임)
        const errorUpdate: any = contentType === 'sparring'
            ? { video_url: 'error', thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error' }
            : { vimeo_url: 'error', thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error' };

        const tableName = contentType === 'lesson' ? 'lessons' :
            contentType === 'sparring' ? 'sparring_videos' : 'drills';

        // Update directly or via API? API might be safer if RLS is strict, but creator should have access directly.
        // Frontend has already access.
        await supabase
            .from(tableName)
            .update(errorUpdate)
            .eq('id', contentId);

        throw error;
    }
}
