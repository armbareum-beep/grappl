/**
 * Connection Manager
 * Keeps Supabase connection warm to prevent "cold start" lag
 * Also refreshes auth session and invalidates stale queries on tab return
 */

import { supabase } from './supabase';
import { queryClient } from './react-query';

const KEEPALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes (before browser closes idle connections at ~5min)
const LONG_IDLE_THRESHOLD = 2 * 60 * 1000; // 2 minutes - considered "long idle"

let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
let isWarmedUp = false;
let lastActivity = Date.now();
let lastVisibleAt = Date.now();

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
 * Refresh Supabase auth session if it may have expired during idle
 */
async function refreshAuthSession(): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const expiresAt = session.expires_at;
        const now = Math.floor(Date.now() / 1000);
        // Refresh if token expires within 5 minutes
        if (expiresAt && expiresAt - now < 300) {
            console.log('[ConnectionManager] Auth token expiring soon, refreshing');
            await supabase.auth.refreshSession();
        }
    } catch (e) {
        console.warn('[ConnectionManager] Auth session refresh failed:', e);
    }
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
 * Start the keepalive timer
 */
export function startConnectionKeepalive() {
    if (keepaliveTimer) return;

    // Initial ping
    pingSupabase();

    // Periodic keepalive
    keepaliveTimer = setInterval(() => {
        // Only ping if tab is visible
        if (document.visibilityState === 'visible') {
            pingSupabase();
        }
    }, KEEPALIVE_INTERVAL);

    // Warmup on visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Stop the keepalive timer
 */
export function stopConnectionKeepalive() {
    if (keepaliveTimer) {
        clearInterval(keepaliveTimer);
        keepaliveTimer = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
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
