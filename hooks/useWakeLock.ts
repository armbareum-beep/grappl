import { useEffect, useRef } from 'react';

/**
 * Hook to request and maintain a Screen Wake Lock.
 * Useful for preventing the screen from turning off during video playback or training.
 */
export function useWakeLock(enabled: boolean = true) {
    const sentinelRef = useRef<any>(null);

    const requestWakeLock = async () => {
        if (!enabled || !('wakeLock' in navigator)) return;

        try {
            // @ts-ignore
            sentinelRef.current = await navigator.wakeLock.request('screen');
            console.log('[Wake Lock] Screen Wake Lock is active');

            sentinelRef.current.addEventListener('release', () => {
                console.log('[Wake Lock] Screen Wake Lock was released');
            });
        } catch (err: any) {
            console.error(`[Wake Lock] ${err.name}, ${err.message}`);
        }
    };

    const releaseWakeLock = async () => {
        if (sentinelRef.current) {
            try {
                await sentinelRef.current.release();
                sentinelRef.current = null;
            } catch (err: any) {
                console.error(`[Wake Lock Release] ${err.name}, ${err.message}`);
            }
        }
    };

    useEffect(() => {
        if (enabled) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }

        const handleVisibilityChange = async () => {
            if (sentinelRef.current !== null && document.visibilityState === 'visible') {
                await requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            releaseWakeLock();
        };
    }, [enabled]);

    return { requestWakeLock, releaseWakeLock };
}
