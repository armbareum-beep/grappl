import React, { useEffect } from 'react';

export const VersionChecker: React.FC = () => {
    useEffect(() => {
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
                const latestVersion = data.version;
                const currentVersion = localStorage.getItem('app_version');

                if (currentVersion && latestVersion !== currentVersion) {
                    const lastReload = parseInt(localStorage.getItem('version_reload_timestamp') || '0');
                    const now = Date.now();

                    // Prevent infinite reload loop: if we reloaded less than 10 seconds ago, skip
                    if (now - lastReload < 10000) {
                        console.warn('Version mismatch detected but reload prevented to avoid loop.');
                        return;
                    }

                    console.log(`New version detected: ${latestVersion}. Clearing EVERYTHING and Reloading...`);

                    // 1. Clear all storage (This is what "Reset App" does)
                    localStorage.clear();
                    sessionStorage.clear();

                    // 2. Unregister Service Workers
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
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

                    // IMPORTANT: Set the reload timestamp AFTER clearing storage so the next load knows we just reloaded
                    localStorage.setItem('version_reload_timestamp', Date.now().toString());

                    // Reload immediately with cache busting
                    // We don't store the version here because we want the new app to re-establish its state from scratch
                    // But to prevent loops if clearing fails, we might want to?
                    // actually, if we clear localStorage, we lose the 'app_version' anyway. 
                    // So the new app will load, see no version, and set it.

                    window.location.reload();
                } else if (!currentVersion) {
                    localStorage.setItem('app_version', latestVersion);
                }
            } catch (error) {
                console.error('Failed to check version:', error);
            }
        };

        // Check on mount
        checkVersion();

        // Check on visibility change (when user comes back to tab)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return null;
};
