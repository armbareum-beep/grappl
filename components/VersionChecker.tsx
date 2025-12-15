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
                    console.log(`New version detected: ${latestVersion}. Reloading...`);

                    // Clear caches if possible
                    if ('caches' in window) {
                        try {
                            const keys = await caches.keys();
                            await Promise.all(keys.map(key => caches.delete(key)));
                        } catch (err) {
                            console.error('Error clearing cache:', err);
                        }
                    }

                    // Unregister Service Workers
                    if ('serviceWorker' in navigator) {
                        const registrations = await navigator.serviceWorker.getRegistrations();
                        for (const registration of registrations) {
                            await registration.unregister();
                        }
                    }

                    localStorage.setItem('app_version', latestVersion);
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
