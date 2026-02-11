import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { hardReload } from '../lib/utils';

const UPDATE_COOLDOWN = 10000; // 10 seconds safety cooldown
const MIN_RELOAD_INTERVAL = 600000; // 10 minutes minimum between hard reloads (reduced from 1 hour)
const STALE_SESSION_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours - consider session stale after this
const LAST_UPDATE_KEY = 'grapplay_last_update_attempt';
const LAST_SUCCESSFUL_RELOAD_KEY = 'grapplay_last_successful_reload';
const LAST_ACTIVE_KEY = 'grapplay_last_active';

export const VersionChecker: React.FC = () => {
    const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
    const [latestVersion, _setLatestVersion] = useState<string | null>(null);
    const isUpdating = useRef(false);

    // 개발 환경 체크 - 훅 규칙 준수를 위해 상단 변수로 선언
    // localhost, 127.0.0.1, 사설 IP 대역(192.168.x.x, 10.x.x.x, 172.16-31.x.x) 모두 개발 환경으로 간주
    const isDev = import.meta.env.DEV ||
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        Boolean(window.location.hostname.match(/^192\.168\./)) ||
        Boolean(window.location.hostname.match(/^10\./)) ||
        Boolean(window.location.hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./));

    const handleUpdate = async (newVersion: string) => {
        if (isUpdating.current) return;

        // Prevent infinite reload loops: check if we tried to update very recently
        const lastAttempt = localStorage.getItem(LAST_UPDATE_KEY);
        const lastReload = localStorage.getItem(LAST_SUCCESSFUL_RELOAD_KEY);
        const now = Date.now();

        if (lastAttempt && now - parseInt(lastAttempt) < UPDATE_COOLDOWN) {
            console.warn('[VersionCheck] Update attempt blocked to prevent infinite loop');
            return;
        }

        // Only force reload if 1 hour has passed since last reload
        // OR if this is not a background visibility check
        if (lastReload && now - parseInt(lastReload) < MIN_RELOAD_INTERVAL) {
            return;
        }

        isUpdating.current = true;
        localStorage.setItem(LAST_UPDATE_KEY, now.toString());
        localStorage.setItem(LAST_SUCCESSFUL_RELOAD_KEY, now.toString());

        try {
            await hardReload([LAST_UPDATE_KEY, LAST_SUCCESSFUL_RELOAD_KEY], true);
        } catch (error) {
            console.error('[VersionCheck] Error during hard reload:', error);
            const url = new URL(window.location.href);
            url.searchParams.set('reload_t', Date.now().toString());
            window.location.href = url.toString();
        }
    };

    const checkVersion = async (isAutoUpdate = false) => {
        if (isUpdating.current) return;

        // ✅ 오프라인 체크 추가
        if (!navigator.onLine) {
            return;
        }

        try {
            // ✅ 캐시 우회 강화 (cache: 'no-store' 추가)
            const response = await fetch('/version.json?t=' + new Date().getTime(), {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.ok) return;

            const data = await response.json();
            const newestVersion = data.version;

            // 방어 코드: 버전 정보가 유효하지 않으면 중단
            if (!newestVersion) return;

            // USE THE INJECTED VERSION FROM VITE as the source of truth for "currently running"
            const currentVersion = import.meta.env.VITE_APP_VERSION;

            if (currentVersion && newestVersion !== currentVersion) {
                // ✅ 자동 업데이트 활성화 (사용자 선택 반영)
                // 새 버전이 감지되면 즉시 hardReload 실행
                handleUpdate(newestVersion);
            }
        } catch (error) {
            console.error('[VersionChecker] 버전 체크 실패:', error);
        }
    };

    useEffect(() => {
        if (isDev) return;

        // Check if this is a stale session (user hasn't visited in a long time)
        const checkStaleSession = () => {
            const lastActive = localStorage.getItem(LAST_ACTIVE_KEY);
            const now = Date.now();

            if (lastActive) {
                const timeSinceLastActive = now - parseInt(lastActive);
                if (timeSinceLastActive > STALE_SESSION_THRESHOLD) {
                    console.log('[VersionChecker] Stale session detected, forcing cache clear');
                    // Force hard reload bypassing cooldown for stale sessions
                    forceHardReloadStaleSession();
                    return true;
                }
            }

            // Update last active time
            localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
            return false;
        };

        // Force reload for stale sessions - bypasses normal cooldown
        const forceHardReloadStaleSession = async () => {
            if (isUpdating.current) return;
            isUpdating.current = true;

            try {
                // Clear the reload interval check for stale sessions
                localStorage.removeItem(LAST_SUCCESSFUL_RELOAD_KEY);
                await hardReload([LAST_UPDATE_KEY, LAST_ACTIVE_KEY], true);
            } catch (error) {
                console.error('[VersionCheck] Error during stale session reload:', error);
                window.location.reload();
            }
        };

        // Check for stale session first
        if (checkStaleSession()) {
            return; // Will reload, no need to continue
        }

        // Initial check
        checkVersion();

        // Check and AUTOMATICALLY reload on visibility change (when user comes back to tab)
        let lastVisibilityCheck = 0;
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                const now = Date.now();

                // Update last active time on every visibility
                localStorage.setItem(LAST_ACTIVE_KEY, now.toString());

                // Throttle visibility checks to once every 5 minutes
                if (now - lastVisibilityCheck < 5 * 60 * 1000) {
                    return;
                }
                lastVisibilityCheck = now;
                checkVersion();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // ✅ 주기적 체크 (10분) - 서버 부하 고려
        const interval = setInterval(() => checkVersion(), 10 * 60 * 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
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
                                onClick={() => latestVersion && handleUpdate(latestVersion)}
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

