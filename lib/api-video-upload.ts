import { uploadToVimeo } from './vimeo/upload';
import { supabase } from './supabase';

export interface VideoUploadData {
    title: string;
    description: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number;
    length: string;
    creatorId: string;
}

/**
 * 영상 업로드 및 DB 저장
 */
export async function uploadVideo(
    file: File,
    metadata: VideoUploadData,
    onProgress?: (progress: number) => void
) {
    try {
        // 1. Vimeo에 업로드
        const vimeoResult = await uploadToVimeo({
            file,
            title: metadata.title,
            description: metadata.description,
            onProgress: (progress) => {
                // 업로드 진행률 (0-80%)
                onProgress?.(Math.round(progress * 0.8));
            }
        });

        // 2. 썸네일 URL 생성 (Vimeo는 자동으로 썸네일 생성)
        const thumbnailUrl = `https://vumbnail.com/${vimeoResult.videoId}.jpg`;

        // 3. DB에 저장
        onProgress?.(85);
        const { data, error } = await supabase
            .from('videos')
            .insert({
                title: metadata.title,
                description: metadata.description,
                vimeo_url: vimeoResult.videoId,
                thumbnail_url: thumbnailUrl,
                category: metadata.category,
                difficulty: metadata.difficulty,
                price: metadata.price,
                length: metadata.length,
                creator_id: metadata.creatorId,
                views: 0,
                status: 'draft',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            throw new Error(`Database error: ${error.message}`);
        }

        onProgress?.(100);
        return { success: true, data, vimeoResult };
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

/**
 * 영상 삭제 (Vimeo + DB)
 */
export async function deleteVideo(videoId: string, vimeoId: string) {
    try {
        // 1. DB에서 삭제
        const { error: dbError } = await supabase
            .from('videos')
            .delete()
            .eq('id', videoId);

        if (dbError) {
            throw new Error(`Database delete error: ${dbError.message}`);
        }

        // 2. Vimeo에서 삭제 (선택적 - 실패해도 계속 진행)
        try {
            const { deleteVimeoVideo } = await import('./vimeo/client');
            await deleteVimeoVideo(vimeoId);
        } catch (vimeoError) {
            console.warn('Vimeo delete failed:', vimeoError);
            // Vimeo 삭제 실패는 무시 (수동으로 삭제 가능)
        }

        return { success: true };
    } catch (error) {
        console.error('Delete error:', error);
        throw error;
    }
}
