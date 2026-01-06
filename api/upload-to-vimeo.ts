import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Support both VITE_ prefixed and non-prefixed env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { action, bucketName, filePath, title, description, contentType, contentId, videoType, vimeoId, thumbnailUrl } = req.body;

        console.log('[Vercel] Action:', action);

        // --- Action 1: Create Upload Link ---
        if (action === 'create_upload') {
            // 1. Get File Size from Supabase via List (Metadata)
            // filePath example: 'user_id/filename.mp4'
            const folderPath = filePath.split('/').slice(0, -1).join('/');
            const fileName = filePath.split('/').pop();

            const { data: listData, error: listError } = await supabase.storage
                .from(bucketName)
                .list(folderPath, {
                    limit: 1,
                    search: fileName
                });

            // Default to a small size if metadata missing (TUS usually handles size in patch, but create needs estimate sometimes)
            // Actually Vimeo create uses 'size' for quota check.
            const fileSize = listData?.[0]?.metadata?.size || 0;

            console.log('[Vercel] Creating upload link for size:', fileSize);

            // 2. Request Upload Link from Vimeo
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
                        size: fileSize > 0 ? fileSize : undefined
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
                const errorText = await createResponse.text();
                console.error('[Vimeo] Create Link Error:', errorText);
                throw new Error(`Vimeo create failed: ${errorText}`);
            }

            const createData = await createResponse.json();

            return res.status(200).json({
                success: true,
                uploadLink: createData.upload.upload_link,
                vimeoUri: createData.uri,
                vimeoId: createData.uri.split('/').pop()
            });
        }

        // --- Action 2: Complete Upload (Update DB) ---
        if (action === 'complete_upload') {
            if (!vimeoId) throw new Error('vimeoId is required for completion');

            const finalThumbnailUrl = thumbnailUrl || `https://vumbnail.com/${vimeoId}.jpg`;

            if (contentType === 'lesson') {
                await supabase.from('lessons').update({ vimeo_url: vimeoId, thumbnail_url: finalThumbnailUrl }).eq('id', contentId);
            } else if (contentType === 'sparring') {
                await supabase.from('sparring_videos').update({ video_url: vimeoId, thumbnail_url: finalThumbnailUrl }).eq('id', contentId);
            } else if (contentType === 'drill') {
                const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                const updateData: any = { [columnToUpdate]: vimeoId };
                if (videoType === 'action') updateData.thumbnail_url = finalThumbnailUrl;
                await supabase.from('drills').update(updateData).eq('id', contentId);
            }

            console.log('[Vercel] DB Updated:', { vimeoId, contentId });
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('[Vercel] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
