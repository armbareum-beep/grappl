import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Support both VITE_ prefixed and non-prefixed env vars
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN || '';

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

    // Debug: Check environment variables
    console.log('[Vercel] Environment check:', {
        hasSupabaseUrl: !!SUPABASE_URL,
        hasSupabaseKey: !!SUPABASE_KEY,
        hasVimeoToken: !!VIMEO_TOKEN,
        vimeoTokenLength: VIMEO_TOKEN.length
    });

    if (!SUPABASE_URL || !SUPABASE_KEY || !VIMEO_TOKEN) {
        return res.status(500).json({
            error: 'Missing environment variables',
            details: {
                hasSupabaseUrl: !!SUPABASE_URL,
                hasSupabaseKey: !!SUPABASE_KEY,
                hasVimeoToken: !!VIMEO_TOKEN
            }
        });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    try {
        const { bucketName, filePath, title, description, contentType, contentId, videoType } = req.body;

        console.log('[Vercel] Processing video:', { filePath, contentType, contentId });

        // 1. Download from Supabase Storage
        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath);

        if (downloadError) {
            throw new Error(`Supabase download failed: ${downloadError.message}`);
        }

        // 2. Upload to Vimeo
        const fileSize = fileData.size;

        // Create Vimeo upload
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
                    size: fileSize
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
            let errorData;
            try {
                errorData = JSON.parse(errorText);
            } catch {
                errorData = { raw: errorText };
            }

            console.error('[Vimeo] Create failed:', {
                status: createResponse.status,
                statusText: createResponse.statusText,
                error: errorData
            });

            throw new Error(`Vimeo create failed (${createResponse.status}): ${JSON.stringify(errorData)}`);
        }

        const createData = await createResponse.json();
        const uploadLink = createData.upload.upload_link;
        const vimeoUri = createData.uri;
        const vimeoId = vimeoUri.split('/').pop();

        // Convert blob to buffer for TUS upload
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload using TUS protocol
        const tusResponse = await fetch(uploadLink, {
            method: 'PATCH',
            headers: {
                'Tus-Resumable': '1.0.0',
                'Upload-Offset': '0',
                'Content-Type': 'application/offset+octet-stream'
            },
            body: buffer
        });

        if (!tusResponse.ok) {
            throw new Error(`TUS upload failed: ${tusResponse.statusText}`);
        }

        const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg`;

        // 3. Update database
        if (contentType === 'lesson') {
            const { error } = await supabase
                .from('lessons')
                .update({
                    vimeo_url: vimeoId,
                    thumbnail_url: thumbnailUrl
                })
                .eq('id', contentId);

            if (error) throw error;
        } else if (contentType === 'sparring') {
            const { error } = await supabase
                .from('sparring_videos')
                .update({
                    video_url: vimeoId,
                    thumbnail_url: thumbnailUrl
                })
                .eq('id', contentId);

            if (error) throw error;
        } else if (contentType === 'drill') {
            const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
            const updateData: any = {
                [columnToUpdate]: vimeoId
            };

            if (videoType === 'action') {
                updateData.thumbnail_url = thumbnailUrl;
            }

            const { error } = await supabase
                .from('drills')
                .update(updateData)
                .eq('id', contentId);

            if (error) throw error;
        }

        console.log('[Vercel] Success:', { vimeoId, contentId });

        return res.status(200).json({
            success: true,
            vimeoId,
            vimeoUrl: `https://vimeo.com/${vimeoId}`,
            thumbnailUrl
        });

    } catch (error: any) {
        console.error('[Vercel] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
