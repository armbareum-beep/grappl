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

            // If fileSize not provided and we have path, try to fetch from Supabase (fallback)
            if (!fileSize && filePath && bucketName) {
                try {
                    const folderPath = filePath.split('/').slice(0, -1).join('/');
                    const fileName = filePath.split('/').pop();

                    const { data: listData } = await supabase.storage
                        .from(bucketName)
                        .list(folderPath, {
                            limit: 1,
                            search: fileName
                        });

                    fileSize = listData?.[0]?.metadata?.size || 0;
                } catch (e) {
                    console.warn('[Vercel] Could not fetch file size from Supabase:', e);
                }
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
                        view: 'disable',
                        embed: 'whitelist'
                    },
                    embed_domains: ['grapplay.com', 'www.grapplay.com', 'localhost']
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                console.error('[Vimeo] Create Link Error:', errorText);

                // If it's HTML (usually from Cloudflare or Vimeo's load balancer), don't show the full HTML
                if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html')) {
                    throw new Error('Vimeo API 서버가 일시적으로 응답하지 않습니다. (Cloudflare/Internal Error)');
                }

                throw new Error(`Vimeo create failed: ${errorText}`);
            }

            const createData = await createResponse.json();

            const vimeoId = createData.uri.split('/').pop();
            return res.status(200).json({
                success: true,
                uploadLink: createData.upload.upload_link,
                vimeoUri: createData.uri,
                vimeoId: vimeoId,
                videoId: vimeoId  // For client compatibility
            });
        }

        // --- Action 2: Complete Upload (Update DB) ---
        if (action === 'complete_upload') {
            if (!vimeoId) throw new Error('vimeoId is required for completion');

            // Fetch video info from Vimeo to get the embed hash and duration
            let vimeoUrlWithHash = vimeoId;
            let durationSeconds = 0;

            // Maximum duration for drills: 90 seconds (1 minute 30 seconds)
            const MAX_DRILL_DURATION_SECONDS = 90;

            // Retry logic: Vimeo processing might take time to report duration
            // Transcoding can take time, so we retry up to 20 times (approx 100s)
            for (let attempt = 1; attempt <= 20; attempt++) {
                try {
                    const videoInfoRes = await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
                        headers: {
                            'Authorization': `Bearer ${VIMEO_TOKEN}`,
                            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                        }
                    });

                    if (videoInfoRes.ok) {
                        const videoInfo = await videoInfoRes.json();
                        durationSeconds = videoInfo.duration || 0;

                        // Extract hash from player_embed_url
                        const embedUrl = videoInfo.player_embed_url;
                        if (embedUrl) {
                            const hashMatch = embedUrl.match(/[?&]h=([a-z0-9]+)/i);
                            if (hashMatch) {
                                vimeoUrlWithHash = `${vimeoId}:${hashMatch[1]}`;
                            }
                        }

                        // If we got a valid duration, break immediately
                        if (durationSeconds > 0) {
                            console.log(`[Vercel] Attempt ${attempt}: Found duration: ${durationSeconds}s`);
                            break;
                        }
                    }
                } catch (err) {
                    console.warn(`[Vercel] Attempt ${attempt} failed to fetch video metadata:`, err);
                }

                if (attempt < 20) {
                    // Log progress if waiting
                    if (attempt % 2 === 0 || attempt === 1) {
                        console.log(`[Vercel] Duration is 0, waiting for transcoding... (Attempt ${attempt}/20)`);
                    }
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            // Check if drill duration exceeds maximum (only for drills)
            if (contentType === 'drill' && durationSeconds > MAX_DRILL_DURATION_SECONDS) {
                console.error(`[Vercel] Drill duration ${durationSeconds}s exceeds maximum ${MAX_DRILL_DURATION_SECONDS}s`);

                // Delete the video from Vimeo
                try {
                    await fetch(`https://api.vimeo.com/videos/${vimeoId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${VIMEO_TOKEN}`,
                            'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                        }
                    });
                } catch (deleteErr) {
                    console.warn('[Vercel] Failed to delete oversized video from Vimeo:', deleteErr);
                }

                // Mark as error in database
                const tableName = 'drills';
                const errorMessage = `ERROR: 드릴은 최대 1분 30초(90초)까지만 업로드할 수 있습니다. (실제: ${Math.floor(durationSeconds / 60)}분 ${durationSeconds % 60}초)`;
                await supabase
                    .from(tableName)
                    .update({ vimeo_url: errorMessage })
                    .eq('id', contentId);

                return res.status(400).json({
                    error: `드릴 영상이 너무 깁니다. 최대 1분 30초(90초)까지만 업로드할 수 있습니다. (현재: ${Math.floor(durationSeconds / 60)}분 ${durationSeconds % 60}초)`
                });
            }

            // Helper to format duration
            const formatDuration = (seconds: number): string => {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
            };
            const finalLength = durationSeconds > 0 ? formatDuration(durationSeconds) : '0:00';

            // Fetch current record to avoid overwriting custom thumbnail
            const tableName = contentType === 'lesson' ? 'lessons' :
                contentType === 'sparring' ? 'sparring_videos' : 'drills';

            const { data: currentRecord } = await supabase
                .from(tableName)
                .select('thumbnail_url')
                .eq('id', contentId)
                .maybeSingle();

            const currentThumbnail = currentRecord?.thumbnail_url;

            const isPlaceholder = (url?: string) =>
                !url ||
                url.includes('vumbnail.com') ||
                url.includes('placehold.co') ||
                url.includes('Processing...');

            const isDefaultThumbnail = isPlaceholder(currentThumbnail);
            const isProvidedThumbnailPlaceholder = isPlaceholder(thumbnailUrl);

            console.log('[Vercel] Thumbnail Decision:', {
                provided: thumbnailUrl,
                current: currentThumbnail,
                isProvidedPlaceholder: isProvidedThumbnailPlaceholder,
                isCurrentDefault: isDefaultThumbnail
            });

            // CRITICAL: If we have a GOOD current thumbnail (captured), 
            // and the provided one is a placeholder or missing, KEEP the current one.
            const finalThumbnailUrl = (thumbnailUrl && !isProvidedThumbnailPlaceholder)
                ? thumbnailUrl
                : (!isDefaultThumbnail ? currentThumbnail : `https://vumbnail.com/${vimeoId}.jpg`);

            console.log('[Vercel] Final Thumbnail:', finalThumbnailUrl);

            const updateData: any = {};

            // 1. Durations (only if columns exist)
            if (contentType === 'lesson') {
                updateData.length = finalLength;
                updateData.duration_minutes = Math.round(durationSeconds / 60);
            } else if (contentType === 'drill') {
                updateData.duration_minutes = Math.round(durationSeconds / 60);
                // drills currently doesn't have a 'length' column in schema
            }

            // 2. Content specific URLs and thumbnails
            if (contentType === 'sparring') {
                updateData.video_url = vimeoUrlWithHash;
                updateData.thumbnail_url = finalThumbnailUrl;
                // sparring_videos currently doesn't have length/duration columns
            } else if (contentType === 'drill') {
                const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                updateData[columnToUpdate] = vimeoUrlWithHash;
                if (videoType === 'action') updateData.thumbnail_url = finalThumbnailUrl;
            } else {
                updateData.vimeo_url = vimeoUrlWithHash;
                updateData.thumbnail_url = finalThumbnailUrl;
            }

            // Validate contentId before update
            if (!contentId) {
                console.error('[Vercel] ERROR: contentId is empty or undefined!');
                return res.status(400).json({ error: 'contentId가 없습니다. 레슨/드릴이 먼저 생성되어야 합니다.' });
            }

            const { error: updateError, count } = await supabase
                .from(tableName)
                .update(updateData)
                .eq('id', contentId);

            if (updateError) {
                console.error('[Vercel] DB Update Error:', updateError);
                return res.status(500).json({ error: `DB 업데이트 실패: ${updateError.message}` });
            }

            console.log('[Vercel] DB Updated:', { vimeoUrlWithHash, contentId, tableName, updateData });
            return res.status(200).json({ success: true });
        }

        // --- Action 3: Get Thumbnails (auto-generates if few exist) ---
        if (action === 'get_vimeo_thumbnails') {
            if (!vimeoId) throw new Error('vimeoId is required');

            const cleanId = vimeoId.toString().split(':')[0];
            const vimeoHeaders = {
                'Authorization': `Bearer ${VIMEO_TOKEN}`,
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            };

            // First check video status
            const videoRes = await fetch(`https://api.vimeo.com/videos/${cleanId}`, {
                headers: vimeoHeaders
            });

            if (!videoRes.ok) {
                const errorText = await videoRes.text();
                throw new Error(`Vimeo video fetch failed: ${errorText}`);
            }

            const videoInfo = await videoRes.json();
            const videoStatus = videoInfo.status;
            const duration = videoInfo.duration || 0;

            console.log('[Vimeo] Video status:', videoStatus, 'Duration:', duration);

            // If video is still processing, return early with message
            if (videoStatus !== 'available') {
                return res.status(200).json({
                    thumbnails: [],
                    processing: true,
                    message: '영상이 아직 처리 중입니다. 잠시 후 다시 시도해주세요.'
                });
            }

            // Fetch existing pictures
            const response = await fetch(`https://api.vimeo.com/videos/${cleanId}/pictures?per_page=10`, {
                headers: vimeoHeaders
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Vimeo thumbnail fetch failed: ${errorText}`);
            }

            let data = await response.json();
            const existingCount = (data.data || []).length;

            console.log('[Vimeo] Existing thumbnails:', existingCount);

            // Auto-generate thumbnails at different time points if few exist (less than 5)
            if (existingCount < 5 && duration > 2) {
                try {
                    // Generate thumbnails at 10%, 30%, 50%, 70%, 90% of video
                    const timePoints = [0.1, 0.3, 0.5, 0.7, 0.9]
                        .map(pct => Math.round(pct * duration * 100) / 100)
                        .filter(t => t > 0 && t < duration);

                    console.log('[Vimeo] Generating thumbnails at:', timePoints);

                    const results = await Promise.allSettled(
                        timePoints.map(time =>
                            fetch(`https://api.vimeo.com/videos/${cleanId}/pictures`, {
                                method: 'POST',
                                headers: { ...vimeoHeaders, 'Content-Type': 'application/json' },
                                body: JSON.stringify({ time, active: false })
                            })
                        )
                    );

                    // Log results for debugging
                    results.forEach((r, i) => {
                        if (r.status === 'fulfilled') {
                            console.log(`[Vimeo] Thumbnail ${i} request: ${r.value.status}`);
                        } else {
                            console.log(`[Vimeo] Thumbnail ${i} failed:`, r.reason);
                        }
                    });

                    // Wait a bit for Vimeo to process (thumbnails are async)
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    // Re-fetch all pictures including newly generated
                    const refreshRes = await fetch(`https://api.vimeo.com/videos/${cleanId}/pictures?per_page=10`, {
                        headers: vimeoHeaders
                    });
                    if (refreshRes.ok) {
                        data = await refreshRes.json();
                        console.log('[Vimeo] After generation, thumbnails:', (data.data || []).length);
                    }
                } catch (genErr) {
                    console.warn('[Vimeo] Thumbnail generation failed:', genErr);
                }
            }

            const thumbnails = (data.data || []).map((pic: any) => {
                // Select the largest available size
                const sizes = [...(pic.sizes || [])].sort((a, b) => b.width - a.width);
                return {
                    id: pic.resource_key,
                    url: sizes[0]?.link || pic.link,
                    active: pic.active
                };
            });

            return res.status(200).json({ thumbnails });
        }

        // --- Action 4: Proxy image fetch (bypasses CORS) ---
        if (action === 'proxy_image') {
            const { imageUrl } = req.body;
            if (!imageUrl) throw new Error('imageUrl is required');

            // Only allow Vimeo CDN URLs for security
            if (!imageUrl.includes('vimeocdn.com') && !imageUrl.includes('vimeo.com')) {
                throw new Error('Only Vimeo image URLs are allowed');
            }

            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) throw new Error('Failed to fetch image');

            const arrayBuffer = await imageResponse.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

            return res.status(200).json({
                base64: `data:${contentType};base64,${base64}`
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error: any) {
        console.error('[Vercel] Error:', error);
        return res.status(500).json({ error: error.message });
    }
}
