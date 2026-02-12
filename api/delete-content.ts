import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || process.env.VITE_MUX_TOKEN_ID || '';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || process.env.VITE_MUX_TOKEN_SECRET || '';
const VIMEO_ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function getMuxAuthHeader(): string {
    const credentials = `${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { contentType, contentId } = req.body;
        console.log('[Delete] Deleting:', contentType, contentId);

        if (!contentType || !contentId) {
            return res.status(400).json({ error: 'contentType and contentId are required' });
        }

        if (!['drill', 'lesson', 'sparring'].includes(contentType)) {
            return res.status(400).json({ error: 'Invalid contentType' });
        }

        const tableName = contentType === 'lesson' ? 'lessons' :
                          contentType === 'sparring' ? 'sparring_videos' : 'drills';

        // 1. Fetch the record to get video URLs
        const { data: record, error: fetchError } = await supabase
            .from(tableName)
            .select('*')
            .eq('id', contentId)
            .single();

        if (fetchError || !record) {
            console.error('[Delete] Record not found:', fetchError);
            return res.status(404).json({ error: 'Content not found' });
        }

        // 2. Collect video IDs to delete
        const videosToDelete: { platform: string; id: string }[] = [];

        if (contentType === 'drill') {
            // Drills can use either Vimeo or Mux
            // Vimeo URLs contain ':', Mux playback IDs don't
            if (record.vimeo_url && !record.vimeo_url.startsWith('ERROR')) {
                const isVimeo = record.vimeo_url.includes(':');
                if (isVimeo) {
                    const vimeoId = record.vimeo_url.split(':')[0];
                    videosToDelete.push({ platform: 'vimeo', id: vimeoId });
                } else {
                    videosToDelete.push({ platform: 'mux', id: record.vimeo_url });
                }
            }
            if (record.description_video_url && !record.description_video_url.startsWith('ERROR')) {
                const isVimeo = record.description_video_url.includes(':');
                if (isVimeo) {
                    const vimeoId = record.description_video_url.split(':')[0];
                    videosToDelete.push({ platform: 'vimeo', id: vimeoId });
                } else {
                    videosToDelete.push({ platform: 'mux', id: record.description_video_url });
                }
            }
        } else if (contentType === 'lesson') {
            // Lessons use Vimeo
            if (record.vimeo_url && !record.vimeo_url.startsWith('ERROR')) {
                const vimeoId = record.vimeo_url.split(':')[0];
                videosToDelete.push({ platform: 'vimeo', id: vimeoId });
            }
        } else if (contentType === 'sparring') {
            // Sparring can use Vimeo or Mux
            if (record.video_url && !record.video_url.startsWith('ERROR')) {
                const isMux = record.video_url.length < 20 && !record.video_url.includes(':');
                if (isMux) {
                    videosToDelete.push({ platform: 'mux', id: record.video_url });
                } else {
                    const vimeoId = record.video_url.split(':')[0];
                    videosToDelete.push({ platform: 'vimeo', id: vimeoId });
                }
            }
            if (record.preview_vimeo_id && !record.preview_vimeo_id.startsWith('ERROR')) {
                const vimeoId = record.preview_vimeo_id.split(':')[0];
                videosToDelete.push({ platform: 'vimeo', id: vimeoId });
            }
        }

        console.log('[Delete] Videos to delete:', videosToDelete);

        // 2.5. Check for purchases before deletion
        let hasPurchases = false;

        if (contentType === 'drill') {
            // Check user_drill_purchases for this drill
            const { count } = await supabase
                .from('user_drill_purchases')
                .select('id', { count: 'exact', head: true })
                .eq('drill_id', contentId);

            if (count && count > 0) {
                hasPurchases = true;
                console.log(`[Delete] Drill ${contentId} has ${count} purchases - blocking deletion`);
            }
        } else if (contentType === 'lesson' && record.course_id) {
            // Check user_courses for the lesson's course
            const { count } = await supabase
                .from('user_courses')
                .select('id', { count: 'exact', head: true })
                .eq('course_id', record.course_id);

            if (count && count > 0) {
                hasPurchases = true;
                console.log(`[Delete] Lesson's course ${record.course_id} has ${count} purchases - blocking deletion`);
            }
        } else if (contentType === 'sparring') {
            // Check purchases table for sparring video
            const { count } = await supabase
                .from('purchases')
                .select('id', { count: 'exact', head: true })
                .eq('product_id', contentId)
                .eq('status', 'completed');

            if (count && count > 0) {
                hasPurchases = true;
                console.log(`[Delete] Sparring ${contentId} has ${count} purchases - blocking deletion`);
            }
        }

        if (hasPurchases) {
            return res.status(400).json({
                error: '구매 내역이 있는 콘텐츠는 삭제할 수 없습니다. 구매자가 있으므로 영상을 유지해야 합니다.',
                hasPurchases: true
            });
        }

        // 3. Delete videos from Vimeo/Mux
        for (const video of videosToDelete) {
            try {
                if (video.platform === 'vimeo') {
                    console.log('[Delete] Deleting Vimeo video:', video.id);
                    const vimeoRes = await fetch(`https://api.vimeo.com/videos/${video.id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${VIMEO_ACCESS_TOKEN}` }
                    });
                    if (vimeoRes.ok || vimeoRes.status === 404) {
                        console.log('[Delete] Vimeo video deleted:', video.id);
                    } else {
                        console.warn('[Delete] Vimeo delete failed:', vimeoRes.status);
                    }
                } else if (video.platform === 'mux') {
                    console.log('[Delete] Deleting Mux video:', video.id);

                    // Get asset ID from playback ID
                    const playbackRes = await fetch(`https://api.mux.com/video/v1/playback-ids/${video.id}`, {
                        headers: { Authorization: getMuxAuthHeader() }
                    });

                    if (playbackRes.ok) {
                        const playbackData = await playbackRes.json();
                        const assetId = playbackData.data?.object?.id;

                        if (assetId) {
                            const deleteRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
                                method: 'DELETE',
                                headers: { Authorization: getMuxAuthHeader() }
                            });
                            if (deleteRes.ok || deleteRes.status === 404) {
                                console.log('[Delete] Mux asset deleted:', assetId);
                            }
                        }
                    }
                }
            } catch (videoErr) {
                console.error('[Delete] Error deleting video:', video, videoErr);
            }
        }

        // 4. Delete from database
        const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq('id', contentId);

        if (deleteError) {
            console.error('[Delete] DB delete error:', deleteError);
            return res.status(500).json({ error: 'Failed to delete from database' });
        }

        console.log('[Delete] Successfully deleted:', contentType, contentId);
        res.json({ success: true, deletedVideos: videosToDelete.length });

    } catch (error: any) {
        console.error('[Delete] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
