import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X } from 'lucide-react';

export const VersionChecker: React.FC = () => {
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [latestVersion, setLatestVersion] = useState<string | null>(null);

    const checkVersion = async () => {
        try {
            const response = await fetch('/version.json?t=' + new Date().getTime(), {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const newestVersion = data.version;

            // USE THE INJECTED VERSION FROM VITE as the source of truth for "currently running"
            const currentVersion = import.meta.env.VITE_APP_VERSION;

            console.log(`[VersionCheck] Current: ${currentVersion}, Newest: ${newestVersion}`);

            if (currentVersion && newestVersion !== currentVersion) {
                // If it's a new version, show the prompt instead of reloading
                setLatestVersion(newestVersion);
                setShowUpdatePrompt(true);
            }
        } catch (error) {
            console.error('Failed to check version:', error);
        }
    };

    useEffect(() => {
        checkVersion();

        // Check on visibility change (when user comes back to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Periodic check every 30 minutes
        const interval = setInterval(checkVersion, 30 * 60 * 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, []);

    const handleUpdate = async () => {
        if (!latestVersion) return;

        console.log(`Updating to version: ${latestVersion}...`);

        // 1. Set the new version in localStorage (as a backup/legacy)
        localStorage.setItem('app_version', latestVersion);
        localStorage.setItem('version_reload_timestamp', Date.now().toString());

        // 2. Unregister Service Workers (to ensure clean slate)
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
            } catch (err) {
                console.error('Error unregistering service worker:', err);
            }
        }

        // 3. Clear Cache Storage
        if ('caches' in window) {
            try {
                const keys = await caches.keys();
                await Promise.all(keys.map(key => caches.delete(key)));
            } catch (err) {
                console.error('Error clearing cache:', err);
            }
        }

        // 4. Final Reload - Add cache-busting query parameter to force browser to re-fetch index.html
        // This ensures the browser GET request bypasses internal disk cache
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('v', latestVersion);
        window.location.href = currentUrl.toString();
    };

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
                                최신 기능이 추가되었습니다.<br />최적의 환경을 위해 업데이트하세요.
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
                                onClick={() => setShowUpdatePrompt(false)}
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
