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
 * 1. Unregistering all Service Workers (with completion wait)
 * 2. Clearing Cache Storage (with verification)
 * 3. Clearing LocalStorage and SessionStorage
 * 4. Reloading the page from server with cache busting
 *
 * ✅ Fixed: Added proper timing control for mobile/PWA environments
 */
export async function hardReload(preserveKeys: string[] = [], forceAll: boolean = false) {
    console.log('[hardReload] 시작 - ForceAll:', forceAll);

    try {
        // 1. Service Worker 완전 제거 (완료 대기)
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            console.log(`[hardReload] ${registrations.length}개 Service Worker 제거 중`);

            const unregisterResults = await Promise.all(
                registrations.map(async (registration) => {
                    const success = await registration.unregister();
                    console.log(`[hardReload] SW 제거: ${success ? '성공' : '실패'}`);
                    return success;
                })
            );

            const allUnregistered = unregisterResults.every(result => result === true);
            if (!allUnregistered) {
                console.warn('[hardReload] 일부 Service Worker 제거 실패');
            }

            // 추가 대기: unregister가 완료되어도 백그라운드 정리 필요
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // 2. 모든 캐시 스토리지 삭제 (완료 확인)
        if ('caches' in window) {
            const keys = await caches.keys();
            console.log(`[hardReload] ${keys.length}개 캐시 삭제 중:`, keys);

            const deleteResults = await Promise.all(
                keys.map(async (key) => {
                    const deleted = await caches.delete(key);
                    console.log(`[hardReload] 캐시 "${key}" 삭제: ${deleted ? '성공' : '실패'}`);
                    return deleted;
                })
            );

            // 모든 캐시 삭제 확인
            const allDeleted = deleteResults.every(result => result === true);
            if (!allDeleted) {
                console.warn('[hardReload] 일부 캐시 삭제 실패');
            }

            // 추가 대기: 캐시 삭제가 완전히 반영되도록
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 3. LocalStorage 정리
        if (forceAll) {
            // Backup keys to preserve
            const preservedValues: Record<string, string | null> = {};
            preserveKeys.forEach(key => {
                const val = localStorage.getItem(key);
                if (val !== null) preservedValues[key] = val;
            });

            localStorage.clear();

            // Restore preserved keys
            Object.entries(preservedValues).forEach(([key, value]) => {
                if (value !== null) localStorage.setItem(key, value);
            });
            console.log('[hardReload] LocalStorage 전체 삭제 (일부 보존)');
        } else {
            // Selective LocalStorage Clear (Keep auth and specified keys)
            const toRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key) continue;

                const isSupabaseAuth = key.startsWith('sb-') || key.startsWith('supabase.');
                const shouldPreserve = preserveKeys.some((pk) => key.includes(pk));

                if (!isSupabaseAuth && !shouldPreserve) {
                    toRemove.push(key);
                }
            }
            toRemove.forEach((key) => localStorage.removeItem(key));
            console.log(`[hardReload] LocalStorage ${toRemove.length}개 항목 삭제`);
        }

        // 4. SessionStorage 완전 삭제
        sessionStorage.clear();
        console.log('[hardReload] SessionStorage 전체 삭제');

        // 5. 최종 대기 (모바일 환경 안정성)
        await new Promise(resolve => setTimeout(resolve, 200));

        // 6. 강제 리로드 (캐시 버스팅)
        const url = new URL(window.location.href);
        url.searchParams.set('cache_bust', Date.now().toString());

        console.log('[hardReload] 페이지 리로드:', url.toString());

        // location.replace로 변경 (히스토리 남기지 않음)
        window.location.replace(url.toString());

    } catch (error) {
        console.error('[hardReload] 오류 발생:', error);
        // 오류 발생 시에도 리로드 시도
        window.location.reload();
    }
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
