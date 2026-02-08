/**
 * Vimeo API Integration
 * Uses oEmbed API (no authentication required) for fetching video metadata
 */

export interface VimeoVideoInfo {
    thumbnail: string;
    duration: number;
    title: string;
    description: string;
    width: number;
    height: number;
}

/**
 * Extract Vimeo video ID from various URL formats
 * Supports:
 * - https://vimeo.com/123456789
 * - https://player.vimeo.com/video/123456789
 * - 123456789 (just the ID)
 * - 123456789:abcdef (ID:HASH) -> Returns 123456789
 */
export function extractVimeoId(input: string): string | null {
    if (!input) return null;

    const trimmed = input.trim();

    // If it's just a number, return it
    if (/^\d+$/.test(trimmed)) {
        return trimmed;
    }

    // Support ID:HASH format (e.g. 123456:abcdef)
    // Return only the ID part
    const hashMatch = /^(-?\d+):([a-zA-Z0-9]+)$/.exec(trimmed);
    if (hashMatch) {
        return hashMatch[1];
    }

    // Try to extract from URL
    const patterns = [
        /vimeo\.com\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/,
        /vimeo\.com\/channels\/[\w-]+\/(\d+)/,
        /vimeo\.com\/groups\/[\w-]+\/videos\/(\d+)/,
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Extract Vimeo video Hash from various URL formats or ID:HASH
 * Supports:
 * - 123456789:abcdef -> abcdef
 * - https://vimeo.com/123456789/abcdef -> abcdef
 */
export function extractVimeoHash(input: string): string | null {
    if (!input) return null;

    const trimmed = input.trim();

    // ID:HASH format
    const colonMatch = /^\d+:([a-zA-Z0-9]+)$/.exec(trimmed);
    if (colonMatch) return colonMatch[1];

    // URL format vimeo.com/ID/HASH
    const urlMatch = /vimeo\.com\/\d+\/([a-zA-Z0-9]+)/.exec(trimmed);
    if (urlMatch) return urlMatch[1];

    // Player URL format ?h=HASH
    const playerMatch = /[?&]h=([a-zA-Z0-9]+)/.exec(trimmed);
    if (playerMatch) return playerMatch[1];

    return null;
}

/**
 * Fetch video information from Vimeo using oEmbed API
 * No authentication required - works with public videos
 */
export async function getVimeoVideoInfo(videoIdOrUrl: string): Promise<VimeoVideoInfo | null> {
    try {
        let vimeoUrl = '';

        // If it's a full URL, use it directly (important for unlisted videos with hashes)
        if (videoIdOrUrl.includes('vimeo.com')) {
            // Ensure it has protocol
            vimeoUrl = videoIdOrUrl.startsWith('http') ? videoIdOrUrl : `https://${videoIdOrUrl}`;
        } else {
            // If it's just an ID, construct the standard public URL
            const videoId = extractVimeoId(videoIdOrUrl);
            if (!videoId) {
                throw new Error('Invalid Vimeo URL or ID');
            }
            vimeoUrl = `https://vimeo.com/${videoId}`;
        }

        const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(vimeoUrl)}`;

        const response = await fetch(oembedUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch video info from Vimeo');
        }

        const data = await response.json();

        return {
            thumbnail: data.thumbnail_url || '',
            duration: data.duration || 0,
            title: data.title || '',
            description: data.description || '',
            width: data.width || 1920,
            height: data.height || 1080,
        };
    } catch (error) {
        console.error('Error fetching Vimeo video info:', error);
        return null;
    }
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Parse duration string (MM:SS or HH:MM:SS) to seconds
 */
export function parseDuration(duration: string): number {
    const parts = duration.split(':').map(Number);
    if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}
