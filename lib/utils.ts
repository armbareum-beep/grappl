import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Upgrades thumbnail quality for Vimeo/CDN URLs by replacing lower res indicators
 * (e.g., _640) with higher ones (e.g., _1280).
 */
export function upgradeThumbnailQuality(url?: string | null): string {
    if (!url) return '/placeholder-thumbnail.png';

    // Vimeo thumbnails often end with _640.jpg, _200x150.jpg, etc.
    // Replace with _1280 for better quality on large displays
    if (url.includes('vimeocdn.com')) {
        return url
            .replace(/_\d+x\d+\./, '_1280.')
            .replace(/_640\./, '_1280.');
    }

    return url;
}

/**
 * Simple helper to check if a string contains highlighted markers
 */
export function hasHighlight(text: string | null | undefined): boolean {
    return !!text && text.includes('{') && text.includes('}');
}

/**
 * Performs a "Hard Reload" by:
 * 1. Unregistering all Service Workers
 * 2. Clearing Cache Storage
 * 3. Clearing LocalStorage and SessionStorage
 * 4. Reloading the page from server with cache busting
 */
export async function hardReload(preserveKeys: string[] = [], forceAll: boolean = false) {
    try {
        console.log('[HardReload] Starting cleanup... ForceAll:', forceAll);

        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
        }

        // 2. Clear Cache Storage
        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(
                keys.map((key) => caches.delete(key))
            );
        }

        // 3. LocalStorage Clear
        if (forceAll) {
            localStorage.clear();
        } else {
            // Selective LocalStorage Clear (Keep auth and specified keys)
            const keysToKeep = [...preserveKeys];
            const allKeys = Object.keys(localStorage);

            for (const key of allKeys) {
                if (key.startsWith('sb-') || key.startsWith('supabase.') || keysToKeep.includes(key)) {
                    continue;
                }
                localStorage.removeItem(key);
            }
        }

        // Session storage can usually be cleared fully
        sessionStorage.clear();

    } catch (error) {
        console.error('[HardReload] Error during cleanup:', error);
    }

    // 4. Force Reload with Cache Busting
    const url = new URL(window.location.href);
    url.searchParams.set('reload_t', Date.now().toString());
    window.location.href = url.toString();
}
/**
 * Calculates a 'Hot Score' for ranking content based on views and age.
 * Higher views and newer content result in a higher score.
 */
export function calculateHotScore(views: number = 0, createdAt: string | null | undefined): number {
    const now = Date.now();
    const createdDate = createdAt ? new Date(createdAt).getTime() : now;
    // Base smoothing: 2 hours to prevent infinity for brand new items
    const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
    // Score = views / (hours + 2)^1.5
    return views / Math.pow(hoursSinceCreation + 2, 1.5);
}

/**
 * Helper function to convert YouTube URL to embed URL
 */
export const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return url;

    // Already an embed URL
    if (url.includes('youtube.com/embed/')) {
        return url;
    }

    // Extract video ID from various YouTube URL formats
    let videoId = '';

    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
    }
    // Format: https://youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    // Format: https://www.youtube.com/v/VIDEO_ID
    else if (url.includes('youtube.com/v/')) {
        videoId = url.split('youtube.com/v/')[1]?.split('?')[0];
    }

    // Return embed URL if we found a video ID
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // Return original URL if we couldn't parse it
    return url;
};
