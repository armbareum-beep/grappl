/**
 * Connection Manager v2
 * Keeps Supabase connection warm to prevent "cold start" lag
 *
 * 개선사항:
 * 1. Realtime 채널로 WebSocket 연결 상시 유지
 * 2. 마우스/터치 진입 시 사전 warmup
 * 3. Auth 토큰 10분 전 사전 갱신
 */

import { supabase } from './supabase';
import { queryClient } from './react-query';
import type { RealtimeChannel } from '@supabase/supabase-js';

const KEEPALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes (backup HTTP ping)
const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5분마다 토큰 만료 체크
const TOKEN_REFRESH_THRESHOLD = 10 * 60; // 10분 전에 미리 갱신
const LONG_IDLE_THRESHOLD = 2 * 60 * 1000; // 2 minutes - considered "long idle"

let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
let realtimeChannel: RealtimeChannel | null = null;
let isWarmedUp = false;
let lastActivity = Date.now();
let lastVisibleAt = Date.now();
let warmupScheduled = false;
let mouseEnterListenerAdded = false;

/**
 * Lightweight ping to keep connection alive
 */
async function pingSupabase() {
    try {
        // Use RPC for minimal overhead, fallback to simple query
        const { error } = await supabase.rpc('ping' as any).maybeSingle();

        // If ping RPC doesn't exist, use a minimal query
        if (error?.code === 'PGRST202') {
            await supabase.from('users').select('id').limit(1).maybeSingle();
        }

        isWarmedUp = true;
        lastActivity = Date.now();
    } catch (e) {
        // Ignore errors - this is just keepalive
        isWarmedUp = false;
    }
}

/**
 * Proactive auth token refresh - 만료 10분 전에 미리 갱신
 */
async function proactiveTokenRefresh(): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);

        // 10분 전에 미리 갱신 (기존 5분 → 10분으로 확대)
        if (expiresAt && expiresAt - now < TOKEN_REFRESH_THRESHOLD) {
            console.log('[ConnectionManager] Proactively refreshing token (expires in', expiresAt - now, 's)');
            await supabase.auth.refreshSession();
        }
    } catch (e) {
        console.warn('[ConnectionManager] Proactive token refresh failed:', e);
    }
}

/**
 * Realtime 채널로 WebSocket 연결 상시 유지
 * WebSocket은 브라우저가 idle 상태여도 연결 유지됨
 */
function startRealtimeKeepalive(): void {
    if (realtimeChannel) return;

    try {
        realtimeChannel = supabase
            .channel('connection-keepalive', {
                config: { broadcast: { self: false } }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    isWarmedUp = true;
                    lastActivity = Date.now();
                }
            });
    } catch (e) {
        console.warn('[ConnectionManager] Realtime channel setup failed:', e);
    }
}

function stopRealtimeKeepalive(): void {
    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }
}

/**
 * 마우스/터치 진입 시 사전 warmup 예약
 * requestIdleCallback으로 메인 스레드 블로킹 방지
 */
function scheduleWarmup(): void {
    if (warmupScheduled || isWarmedUp) return;
    warmupScheduled = true;

    const doWarmup = () => {
        warmupConnection();
        proactiveTokenRefresh();
        warmupScheduled = false;
    };

    if ('requestIdleCallback' in window) {
        requestIdleCallback(doWarmup, { timeout: 1000 });
    } else {
        setTimeout(doWarmup, 100);
    }
}

/**
 * Refresh Supabase auth session if it may have expired during idle
 */
async function refreshAuthSession(): Promise<void> {
    await proactiveTokenRefresh();
}

/**
 * Warm up the connection before making real requests
 * Call this when tab becomes visible or before API calls
 */
export async function warmupConnection(): Promise<void> {
    const timeSinceActivity = Date.now() - lastActivity;

    // If recently active (within 30 seconds), skip warmup
    if (timeSinceActivity < 30000) {
        return;
    }

    // Quick warmup ping with 5 second timeout
    try {
        await Promise.race([
            pingSupabase(),
            new Promise(resolve => setTimeout(resolve, 5000)) // Max 5s warmup
        ]);
    } catch (e) {
        // Warmup failed, proceed anyway - the actual request will retry
    }
}

/**
 * Start the keepalive system
 */
export function startConnectionKeepalive() {
    if (keepaliveTimer) return;

    // 1. Realtime 채널로 WebSocket 연결 유지 (가장 효과적)
    startRealtimeKeepalive();

    // 2. 초기 HTTP ping (백업)
    pingSupabase();

    // 3. 주기적 HTTP keepalive (Realtime 실패 시 백업)
    keepaliveTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
            pingSupabase();
        }
    }, KEEPALIVE_INTERVAL);

    // 4. 주기적 토큰 갱신 체크 (visible일 때만)
    tokenRefreshTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
            proactiveTokenRefresh();
        }
    }, TOKEN_REFRESH_INTERVAL);

    // 5. Visibility change 핸들러
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 6. 마우스/터치 진입 시 사전 warmup (한 번만 등록)
    if (!mouseEnterListenerAdded) {
        mouseEnterListenerAdded = true;

        // 탭으로 돌아올 때 마우스가 진입하면 즉시 warmup
        document.addEventListener('mouseenter', scheduleWarmup);
        document.addEventListener('touchstart', scheduleWarmup, { passive: true });

        // 포커스 시에도 warmup
        window.addEventListener('focus', scheduleWarmup);
    }
}

/**
 * Stop the keepalive system
 */
export function stopConnectionKeepalive() {
    // HTTP keepalive 중지
    if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
    }

    // 토큰 갱신 타이머 중지
    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }

    // Realtime 채널 해제
    stopRealtimeKeepalive();

    // 이벤트 리스너 제거
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('mouseenter', scheduleWarmup);
    document.removeEventListener('touchstart', scheduleWarmup);
    window.removeEventListener('focus', scheduleWarmup);
    mouseEnterListenerAdded = false;
}

/**
 * Handle tab visibility change
 * When returning from long idle: refresh auth, warm connection, invalidate stale queries
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        const idleDuration = Date.now() - lastVisibleAt;

        // Always warm up the connection
        warmupConnection();

        // If tab was hidden for a long time, refresh auth and invalidate queries
        if (idleDuration > LONG_IDLE_THRESHOLD) {
            console.log(`[ConnectionManager] Returning after ${Math.round(idleDuration / 1000)}s idle, refreshing session and data`);

            // Refresh auth session first, then invalidate queries so refetches use valid token
            refreshAuthSession().then(() => {
                queryClient.invalidateQueries();
            });
        }
    } else {
        // Tab is going hidden - record the time
        lastVisibleAt = Date.now();
    }
}

/**
 * Record activity (call this on successful API calls)
 */
export function recordActivity() {
    lastActivity = Date.now();
    isWarmedUp = true;
}

/**
 * Check if connection is likely warm
 */
export function isConnectionWarm(): boolean {
    const timeSinceActivity = Date.now() - lastActivity;
    return isWarmedUp && timeSinceActivity < KEEPALIVE_INTERVAL;
}
