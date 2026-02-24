import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { hardReload } from '../lib/utils';

// Constants for preventing refresh loops
const VERSION_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutes
const VISIBILITY_CHECK_THROTTLE = 5 * 60 * 1000; // 5 minutes
const SESSION_RELOAD_KEY = 'grapplay_version_reloaded';
const LAST_VERSION_CHECK_KEY = 'grapplay_last_version_check';

export const VersionChecker: React.FC = () => {
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);
    const isUpdating = useRef(false);
    const lastVisibilityCheck = useRef(0);

    // Development environment check
    const isDev = import.meta.env.DEV ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        Boolean(window.location.hostname.match(/^192\.168\./)) ||
        Boolean(window.location.hostname.match(/^10\./)) ||
        Boolean(window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./));

    // User-initiated update (via button click only)
    const handleUpdate = useCallback(async () => {
        if (isUpdating.current) return;

        // Prevent multiple reloads in same session
        const sessionReloaded = sessionStorage.getItem(SESSION_RELOAD_KEY);
        if (sessionReloaded === 'true') {
            console.log('[VersionChecker] Already reloaded this session, skipping');
            setShowUpdatePrompt(false);
            return;
        }

        isUpdating.current = true;
        sessionStorage.setItem(SESSION_RELOAD_KEY, 'true');

        try {
            setShowUpdatePrompt(false);
            await hardReload([], true);
        } catch (error) {
            console.error('[VersionChecker] Error during hard reload:', error);
            // Fallback: simple reload with cache bust
            const url = new URL(window.location.href);
            url.searchParams.set('_t', Date.now().toString());
            window.location.href = url.toString();
        }
    }, []);

    // Check for new version - NEVER auto-reloads, only shows prompt
    const checkVersion = useCallback(async () => {
        if (isUpdating.current || !navigator.onLine) return;

        // Prevent checking too frequently
        const lastCheck = localStorage.getItem(LAST_VERSION_CHECK_KEY);
        const now = Date.now();
        if (lastCheck && now - parseInt(lastCheck) < 60000) { // 1 minute minimum between checks
            return;
        }

        try {
            localStorage.setItem(LAST_VERSION_CHECK_KEY, now.toString());

            const response = await fetch('/version.json?t=' + now, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const newestVersion = data.version;

            if (!newestVersion) return;

            const currentVersion = import.meta.env.VITE_APP_VERSION;

            if (currentVersion && newestVersion !== currentVersion) {
                console.log('[VersionChecker] New version available:', newestVersion, '(current:', currentVersion, ')');

                // Only show prompt - NEVER auto-reload
                setLatestVersion(newestVersion);
                setShowUpdatePrompt(true);
            }
        } catch (error) {
            console.error('[VersionChecker] Version check failed:', error);
        }
    }, []);

    useEffect(() => {
        if (isDev) return;

        // Check if already reloaded this session - don't even show prompt
        const sessionReloaded = sessionStorage.getItem(SESSION_RELOAD_KEY);
        if (sessionReloaded === 'true') {
            console.log('[VersionChecker] Session already reloaded, component inactive');
            return;
        }

        // Initial check after 3 second delay (let app stabilize first)
        const initialTimeout = setTimeout(() => checkVersion(), 3000);

        // Periodic check
        const interval = setInterval(checkVersion, VERSION_CHECK_INTERVAL);

        // Visibility change handler with throttling
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();
                if (now - lastVisibilityCheck.current < VISIBILITY_CHECK_THROTTLE) {
                    return;
                }
                lastVisibilityCheck.current = now;
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(initialTimeout);
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isDev, checkVersion]);

    // Dismiss handler
    const handleDismiss = useCallback(() => {
        setShowUpdatePrompt(false);
        // Don't show again for 1 hour after dismissing
        sessionStorage.setItem('grapplay_update_dismissed', Date.now().toString());
    }, []);

    return (
        <AnimatePresence>
            {showUpdatePrompt && (
                <div className="fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 z-[99999] pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="pointer-events-auto max-w-sm ml-auto bg-zinc-900/90 backdrop-blur-2xl border border-violet-500/20 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-5"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-violet-600/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                            <Sparkles className="w-6 h-6 text-violet-400" />
                        </div>

                        <div className="flex-grow">
                            <h3 className="text-white font-black text-sm uppercase tracking-wider italic">Update Available</h3>
                            <p className="text-zinc-400 text-[11px] font-medium leading-relaxed mt-0.5">
                                최신 기능이 추가되었습니다.<br />업데이트를 위해 <strong>새로고침 하시겠습니까?</strong>
                            </p>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={handleUpdate}
                                className="bg-violet-600 hover:bg-violet-500 text-white p-3 rounded-2xl transition-all active:scale-95 group shadow-lg shadow-violet-900/20"
                                title="업데이트 적용"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="text-zinc-600 hover:text-zinc-400 p-2 transition-colors flex items-center justify-center"
                                title="나중에 하기"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
