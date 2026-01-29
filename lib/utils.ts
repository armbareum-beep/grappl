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
