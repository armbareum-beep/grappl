import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '';
const MUX_TOKEN_ID = process.env.VITE_MUX_TOKEN_ID || '';
const MUX_TOKEN_SECRET = process.env.VITE_MUX_TOKEN_SECRET || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function checkEnv() {
    const missing = [];
    if (!SUPABASE_URL) missing.push('SUPABASE_URL');
    if (!SUPABASE_KEY) missing.push('SUPABASE_KEY');
    if (!MUX_TOKEN_ID) missing.push('MUX_TOKEN_ID');
    if (!MUX_TOKEN_SECRET) missing.push('MUX_TOKEN_SECRET');
    return missing;
}

function getMuxAuthHeader(): string {
    const credentials = `${MUX_TOKEN_ID}:${MUX_TOKEN_SECRET}`;
    return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const missingEnvs = checkEnv();
    if (missingEnvs.length > 0) {
        return res
            .status(500)
            .json({ error: `Missing environment variables: ${missingEnvs.join(', ')}` });
    }

    try {
        const { action, title, description, contentId, contentType, videoType, fileSize } =
            req.body;

        console.log('[Mux] Action:', action);

        // --- Action 1: Create Upload Link ---
        if (action === 'create_upload') {
            console.log('[Mux] Creating upload link for size:', fileSize);

            const createResponse = await fetch('https://api.mux.com/video/v1/uploads', {
                method: 'POST',
                headers: {
                    Authorization: getMuxAuthHeader(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    cors_origin: 'https://grapplay.com',
                    new_asset_settings: {
                        playback_policy: ['public']
                    }
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('[Mux] Create Link Error:', errorText);
                throw new Error(`Mux create failed: ${errorText}`);
            }

            const createData = await createResponse.json();
            const uploadUrl = createData.url;
            const uploadId = createData.id;

            return res.status(200).json({
                success: true,
                uploadUrl,
                uploadId,
                videoId: uploadId,
                playbackId: null // Will be set after upload completes
            });
        }

        // --- Action 2: Complete Upload or Get Asset Info from Asset ID ---
        if (action === 'complete_upload') {
            const { uploadId, assetId: directAssetId } = req.body;
            let assetId = directAssetId;

            // If uploadId provided (file upload), get assetId from upload
            // If assetId provided directly (URL input), use it directly
            if (!assetId && !uploadId) {
                throw new Error('Either uploadId or assetId is required for completion');
            }

            console.log('[Mux] Completing upload:', uploadId || `asset: ${assetId}`);

            // Fetch upload to get asset ID if not provided directly
            if (!assetId && uploadId) {
                try {
                    const uploadInfoRes = await fetch(
                        `https://api.mux.com/video/v1/uploads/${uploadId}`,
                        {
                            headers: {
                                Authorization: getMuxAuthHeader(),
                                'Accept': 'application/json'
                            }
                        }
                    );

                    if (uploadInfoRes.ok) {
                        const uploadInfo = await uploadInfoRes.json();
                        assetId = uploadInfo.asset_id;
                    }
                } catch (err) {
                    console.error('[Mux] Failed to get asset from upload:', err);
                    throw new Error('Failed to get asset ID from upload');
                }
            }

            if (!assetId) {
                throw new Error('Could not determine asset ID');
            }

            // Fetch asset info to get playback ID and duration
            let playbackId: string | null = null;
            let durationSeconds = 0;

            // Retry logic: Mux processing might take time
            for (let attempt = 1; attempt <= 20; attempt++) {
                try {
                    const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
                        headers: {
                            Authorization: getMuxAuthHeader(),
                            Accept: 'application/json'
                        }
                    });

                    if (assetRes.ok) {
                        const assetInfo = await assetRes.json();
                        playbackId = assetInfo.playback_ids?.[0]?.id;
                        durationSeconds = assetInfo.duration || 0;

                        if (playbackId) {
                            console.log(
                                `[Mux] Attempt ${attempt}: Found playback ID: ${playbackId}, duration: ${durationSeconds}s`
                            );
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(`[Mux] Attempt ${attempt} failed:`, err);
                }

                if (attempt < 20) {
                    if (attempt % 2 === 0 || attempt === 1) {
                        console.log(
                            `[Mux] Waiting for asset processing... (Attempt ${attempt}/20)`
                        );
                    }
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            }

            if (!playbackId) {
                throw new Error('Failed to get playback ID from asset');
            }

            // Check if drill duration exceeds maximum
            const MAX_DRILL_DURATION_SECONDS = 90;
            if (contentType === 'drill' && durationSeconds > MAX_DRILL_DURATION_SECONDS) {
                console.error(
                    `[Mux] Drill duration ${durationSeconds}s exceeds maximum ${MAX_DRILL_DURATION_SECONDS}s`
                );

                // Delete the asset from Mux
                try {
                    await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
                        method: 'DELETE',
                        headers: {
                            Authorization: getMuxAuthHeader()
                        }
                    });
                } catch (deleteErr) {
                    console.warn('[Mux] Failed to delete oversized asset:', deleteErr);
                }

                const tableName = 'drills';
                const errorMessage = `ERROR: 드릴은 최대 1분 30초(90초)까지만 업로드할 수 있습니다. (실제: ${Math.floor(durationSeconds / 60)}분 ${durationSeconds % 60}초)`;
                await supabase.from(tableName).update({ vimeo_url: errorMessage }).eq('id', contentId);

                return res.status(400).json({
                    error: `드릴 영상이 너무 깁니다. 최대 1분 30초(90초)까지만 업로드할 수 있습니다. (현재: ${Math.floor(durationSeconds / 60)}분 ${durationSeconds % 60}초)`
                });
            }

            // Format duration
            const formatDuration = (seconds: number): string => {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            const finalLength = durationSeconds > 0 ? formatDuration(durationSeconds) : '0:00';

            // Update database
            const tableName =
                contentType === 'lesson' ? 'lessons' : contentType === 'sparring' ? 'sparring_videos' : 'drills';

            const updateData: any = {};

            if (contentType === 'lesson') {
                updateData.length = finalLength;
                updateData.duration_minutes = Math.round(durationSeconds / 60);
            } else if (contentType === 'drill') {
                updateData.duration_minutes = Math.round(durationSeconds / 60);
            }

            if (contentType === 'sparring') {
                updateData.video_url = playbackId;
                updateData.thumbnail_url = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
            } else if (contentType === 'drill') {
                const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                updateData[columnToUpdate] = playbackId;
                if (videoType === 'action') {
                    updateData.thumbnail_url = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
                }
            } else {
                updateData.vimeo_url = playbackId;
                updateData.thumbnail_url = `https://image.mux.com/${playbackId}/thumbnail.jpg`;
            }

            await supabase.from(tableName).update(updateData).eq('id', contentId);

            console.log('[Mux] DB Updated:', { playbackId, contentId });
            return res.status(200).json({ success: true });
        }

        // --- Action 3: Get Asset Info (just get playback ID, no DB update) ---
        if (action === 'get_asset_info') {
            const { assetId } = req.body;
            if (!assetId) throw new Error('assetId is required');

            console.log('[Mux] Getting asset info:', assetId);

            let playbackId: string | null = null;
            let durationSeconds = 0;

            // Fetch asset info
            for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                    const assetRes = await fetch(`https://api.mux.com/video/v1/assets/${assetId}`, {
                        headers: {
                            Authorization: getMuxAuthHeader(),
                            Accept: 'application/json'
                        }
                    });

                    if (assetRes.ok) {
                        const assetInfo = await assetRes.json();
                        playbackId = assetInfo.playback_ids?.[0]?.id;
                        durationSeconds = assetInfo.duration || 0;

                        if (playbackId) {
                            console.log(`[Mux] Found playback ID: ${playbackId}`);
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(`[Mux] Attempt ${attempt} failed:`, err);
                }

                if (attempt < 5) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }

            if (!playbackId) {
                throw new Error('Failed to get playback ID from asset');
            }

            return res.status(200).json({
                success: true,
                playbackId,
                durationSeconds
            });
        }

        // --- Action 4: Get Video Info by Playback ID ---
        if (action === 'get_video_info') {
            const { playbackId } = req.body;
            if (!playbackId) throw new Error('playbackId is required');

            console.log('[Mux] Getting video info by playback ID:', playbackId);

            // First, get asset ID from playback ID
            const playbackRes = await fetch(
                `https://api.mux.com/video/v1/playback-ids/${playbackId}`,
                {
                    headers: {
                        Authorization: getMuxAuthHeader(),
                        Accept: 'application/json'
                    }
                }
            );

            if (!playbackRes.ok) {
                throw new Error('Failed to get asset from playback ID');
            }

            const playbackInfo = await playbackRes.json();
            const assetId = playbackInfo.data?.object?.id;

            if (!assetId) {
                throw new Error('Asset ID not found for playback ID');
            }

            // Get asset info for duration
            const assetRes = await fetch(
                `https://api.mux.com/video/v1/assets/${assetId}`,
                {
                    headers: {
                        Authorization: getMuxAuthHeader(),
                        Accept: 'application/json'
                    }
                }
            );

            if (!assetRes.ok) {
                throw new Error('Failed to get asset info');
            }

            const assetInfo = await assetRes.json();
            const durationSeconds = assetInfo.data?.duration || 0;
            const aspectRatio = assetInfo.data?.aspect_ratio || '16:9';

            console.log(`[Mux] Video info: duration=${durationSeconds}s, aspectRatio=${aspectRatio}`);

            return res.status(200).json({
                success: true,
                durationSeconds,
                aspectRatio,
                assetId
            });
        }

        return res.status(400).json({ error: 'Invalid action' });
    } catch (error: any) {
        console.error('[Mux] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
