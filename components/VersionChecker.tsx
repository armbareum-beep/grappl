import React, { useEffect, useRef, useCallback } from 'react';
import { hardReload } from '../lib/utils';

const VERSION_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const MIN_CHECK_INTERVAL = 10 * 60 * 1000; // At most once per 10 minutes

export const VersionChecker: React.FC = () => {
    const hasReloaded = useRef(false);
    const isChecking = useRef(false);
    const lastCheckTime = useRef(0);

    const isDev = import.meta.env.DEV ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        Boolean(window.location.hostname.match(/^192\.168\./)) ||
        Boolean(window.location.hostname.match(/^10\./)) ||
        Boolean(window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./));

    const checkVersion = useCallback(async () => {
        if (isChecking.current || hasReloaded.current || !navigator.onLine) return;

        const now = Date.now();
        if (now - lastCheckTime.current < MIN_CHECK_INTERVAL) return;
        lastCheckTime.current = now;

        isChecking.current = true;
        try {
            const response = await fetch('/version.json?t=' + now, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const currentVersion = import.meta.env.VITE_APP_VERSION;

            if (data.version && currentVersion && data.version !== currentVersion) {
                console.log('[VersionChecker] New version detected, reloading silently...');
                hasReloaded.current = true;
                // forceAll: false preserves Supabase auth tokens
                await hardReload([], false);
            }
        } catch {
            // Network errors are expected; silently ignore
        } finally {
            isChecking.current = false;
        }
    }, []);

    // Handle chunk load errors (broken JS/CSS references after a deployment)
    useEffect(() => {
        const handleChunkError = (event: ErrorEvent) => {
            const error = String(event.error || event.message);
            if (
                error.includes('Failed to fetch dynamically imported module') ||
                error.includes('Loading chunk') ||
                error.includes('ChunkLoadError') ||
                error.includes('Loading CSS chunk')
            ) {
                if (hasReloaded.current) return;
                hasReloaded.current = true;
                console.log('[VersionChecker] Chunk load error, reloading...');
                hardReload([], false).catch(() => window.location.reload());
            }
        };

        window.addEventListener('error', handleChunkError);
        return () => window.removeEventListener('error', handleChunkError);
    }, []);

    useEffect(() => {
        if (isDev) return;

        // Initial check after app stabilizes
        const initialTimer = setTimeout(checkVersion, 3000);

        // Periodic background check
        const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

        // Check every time the user returns to the tab
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') checkVersion();
        };
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [isDev, checkVersion]);

    return null;
};
