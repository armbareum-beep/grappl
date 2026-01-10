const https = require('https');

/**
 * Vimeo API helper to check video encoding status
 */
async function checkVimeoEncodingStatus(vimeoId) {
    const accessToken = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;
    if (!accessToken) {
        throw new Error('VIMEO_ACCESS_TOKEN is missing in environment variables');
    }

    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.vimeo.com',
            path: `/videos/${vimeoId}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    if (res.statusCode !== 200) {
                        console.error(`[Vimeo API] Error: HTTP ${res.statusCode}`, data);
                        return resolve({
                            isReady: false,
                            status: `HTTP ${res.statusCode}`,
                            error: true
                        });
                    }

                    const videoData = JSON.parse(data);

                    const mainStatus = videoData.status;
                    const transcodeStatus = videoData.transcode?.status;
                    const uploadStatus = videoData.upload?.status;

                    const effectiveStatus = mainStatus || transcodeStatus || 'unknown';

                    console.log(`[Vimeo API Checker] Video:${vimeoId} | Main:${mainStatus} | Transcode:${transcodeStatus} | Upload:${uploadStatus}`);

                    // Use the most reliable "ready" indicator
                    const isReady = mainStatus === 'available';

                    // Extract best quality thumbnail
                    let vimeoThumbnail = null;
                    if (videoData.pictures?.sizes?.length > 0) {
                        const sizes = videoData.pictures.sizes;
                        vimeoThumbnail = sizes[sizes.length - 1].link; // Get largest
                    }

                    resolve({
                        isReady: isReady,
                        status: effectiveStatus,
                        thumbnail: vimeoThumbnail
                    });
                } catch (err) {
                    console.error('[Vimeo API] Parse error:', err.message);
                    reject(err);
                }
            });
        });

        req.on('error', (err) => {
            console.error('[Vimeo API] Request error:', err.message);
            reject(err);
        });

        req.end();
    });
}

/**
 * Wait for Vimeo encoding to complete or timeout
 */
async function waitForVimeoEncoding(vimeoId, maxWaitMinutes = 15) {
    const maxAttempts = maxWaitMinutes * 6; // Check every 10 seconds
    console.log(`[Vimeo Wait] Starting monitor for ${vimeoId} for up to ${maxWaitMinutes}m`);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const result = await checkVimeoEncodingStatus(vimeoId);

            if (result.isReady) {
                console.log(`[Vimeo Wait] Success! Video ${vimeoId} is available.`);
                return { success: true, thumbnail: result.thumbnail, status: result.status };
            }

            if (result.status === 'error' || result.error) {
                console.error(`[Vimeo Wait] Vimeo reported an error status for ${vimeoId}`);
                return { success: false, status: result.status };
            }

            console.log(`[Vimeo Wait] Attempt ${attempt}/${maxAttempts}: Status = ${result.status}`);

            // Wait 10 seconds before next check
            await new Promise(resolve => setTimeout(resolve, 10000));
        } catch (err) {
            console.error(`[Vimeo Wait] Error in attempt ${attempt}:`, err.message);
            // If it's a critical error (like missing token), stop the loop
            if (err.message.includes('missing in environment variables')) {
                return { success: false, status: 'config_error' };
            }
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
    }

    console.warn(`[Vimeo Wait] reached timeout for ${vimeoId}`);
    return { success: false, status: 'timeout' };
}

module.exports = { checkVimeoEncodingStatus, waitForVimeoEncoding };
