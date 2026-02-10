import { supabase } from './supabase';


// Smart environment detection:
// - Development: Use backend server (localhost:3003)
// - Production: Use Vercel serverless function (/api/upload-to-vimeo) or Backend if available
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3003' : 'https://grapplay-backend.onrender.com');

export interface VimeoUploadResult {
    vimeoId: string;
    vimeoUrl: string;
    thumbnailUrl: string;
}

/**
 * Supabase Storage에서 파일 다운로드 (Blob 반환)
 */
export async function downloadFromSupabase(bucketName: string, filePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .download(filePath);

    if (error) {
        throw new Error(`Supabase download failed: ${error.message || JSON.stringify(error)}`);
    }

    return data;
}

/**
 * 백엔드 서버를 통한 Vimeo 업로드 및 처리 프로세스:
 * 1. 호출 시 이미 Supabase에 원본 파일이 업로드된 상태라고 가정
 * 2. 백엔드 /process 엔드포인트 호출
 * 3. 백엔드가 다운로드 -> 컷편집 -> Vimeo 업로드 -> DB 업데이트 수행
 */
export async function processAndUploadVideo(params: {
    bucketName: string;
    filePath: string;
    file?: File;
    title: string;
    description: string;
    contentType: 'lesson' | 'drill' | 'sparring' | 'course';
    contentId: string;
    videoType?: 'action' | 'desc' | 'preview';
    cuts?: { start: number; end: number }[];
    instructorName?: string;
    onProgress?: (stage: string, progress: number) => void;
}): Promise<VimeoUploadResult> {
    const { bucketName, filePath, title, description, contentType, contentId, videoType, cuts, instructorName, onProgress } = params;

    try {
        if (onProgress) onProgress('upload', 100); // TUS upload is done

        // Prepare payload for backend /process
        const videoId = filePath.split('.')[0];
        // Ensure filename includes bucket prefix
        const fullFilename = filePath.includes('/') ? filePath : `${bucketName}/${filePath}`;

        const payload: any = {
            videoId,
            filename: fullFilename,
            cuts: cuts || [],
            title,
            description,
            videoType: videoType || 'action',
            instructorName
        };

        if (contentType === 'drill') payload.drillId = contentId;
        else if (contentType === 'lesson') payload.lessonId = contentId;
        else if (contentType === 'sparring') payload.sparringId = contentId;
        else if (contentType === 'course') payload.courseId = contentId;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30초 타임아웃

        try {
            const response = await fetch(`${BACKEND_URL}/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`백엔드 서버 응답 오류 (${response.status}): ${errorText}`);
            }

            await response.json();

            // Since processing is async, return processing status.
            return {
                vimeoId: 'processing',
                vimeoUrl: 'processing',
                thumbnailUrl: 'https://placehold.co/600x800/1e293b/ffffff?text=Processing...'
            };
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                throw new Error('백엔드 서버 연결 시간 초과. 네트워크 상태를 확인해주세요.');
            }
            throw new Error(`백엔드 서버 연결 실패: ${fetchError.message}`);
        }


    } catch (error: any) {
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
