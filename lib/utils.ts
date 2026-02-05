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
 * 4. Reloading the page from server
 */
export async function hardReload(preserveKeys: string[] = []) {
    try {
        console.log('[HardReload] Starting full cleanup...');

        // 0. Preserve specified keys
        const preservedValues: Record<string, string> = {};
        for (const key of preserveKeys) {
            const val = localStorage.getItem(key);
            if (val) preservedValues[key] = val;
        }

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

        // 3. Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // 4. Restore preserved keys
        for (const [key, val] of Object.entries(preservedValues)) {
            localStorage.setItem(key, val);
        }

    } catch (error) {
        console.error('[HardReload] Error during cleanup:', error);
    }

    // 5. Force Reload
    window.location.reload();
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
