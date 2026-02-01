import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Support both VITE_ prefixed and non-prefixed env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function checkEnv() {
    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_KEY) missing.push('SUPABASE_KEY');
    if (!VIMEO_TOKEN) missing.push('VIMEO_ACCESS_TOKEN');
    return missing;
}

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

    const missingEnvs = checkEnv();
    if (missingEnvs.length > 0) {
        return res.status(500).json({ error: `Missing environment variables: ${missingEnvs.join(', ')}` });
    }

    try {
        const { action, bucketName, filePath, title, description, contentType, contentId, videoType, vimeoId, thumbnailUrl, fileSize: providedFileSize } = req.body;

        console.log('[Vercel] Action:', action);

        // --- Action 1: Create Upload Link ---
        if (action === 'create_upload') {
            let fileSize = providedFileSize;

            // If fileSize not provided, try to fetch from Supabase
            if (!fileSize) {
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

                // Default to 0 if missing
                fileSize = listData?.[0]?.metadata?.size || 0;
            }

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

            // Fetch video info from Vimeo to get the embed hash
            let vimeoUrlWithHash = vimeoId;
            try {
                const videoInfoRes = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
                    headers: {
                        'Authorization': `Bearer ${VIMEO_TOKEN}`,
                        'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                    }
                });
                if (videoInfoRes.ok) {
                    const videoInfo = await videoInfoRes.json();
                    // Extract hash from player_embed_url (e.g., "https://player.vimeo.com/video/123456?h=abc123")
                    const embedUrl = videoInfo.player_embed_url;
                    if (embedUrl) {
                        const hashMatch = embedUrl.match(/[?&]h=([a-z0-9]+)/i);
                        if (hashMatch) {
                            vimeoUrlWithHash = `${vimeoId}:${hashMatch[1]}`;
                            console.log('[Vercel] Found hash, storing:', vimeoUrlWithHash);
                        }
                    }
                }
            } catch (err) {
                console.warn('[Vercel] Could not fetch video hash, using ID only:', err);
            }

            const finalThumbnailUrl = thumbnailUrl || `https://vumbnail.com/${vimeoId}.jpg`;

            if (contentType === 'lesson') {
                await supabase.from('lessons').update({ vimeo_url: vimeoUrlWithHash, thumbnail_url: finalThumbnailUrl }).eq('id', contentId);
            } else if (contentType === 'sparring') {
                await supabase.from('sparring_videos').update({ video_url: vimeoUrlWithHash, thumbnail_url: finalThumbnailUrl }).eq('id', contentId);
            } else if (contentType === 'drill') {
                const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                const updateData: any = { [columnToUpdate]: vimeoUrlWithHash };
                if (videoType === 'action') updateData.thumbnail_url = finalThumbnailUrl;
                await supabase.from('drills').update(updateData).eq('id', contentId);
            }

            console.log('[Vercel] DB Updated:', { vimeoUrlWithHash, contentId });
            return res.status(200).json({ success: true });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('[Vercel] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
