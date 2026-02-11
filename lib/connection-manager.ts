/**
 * Connection Manager
 * Keeps Supabase connection warm to prevent "cold start" lag
 */

import { supabase } from './supabase';

const KEEPALIVE_INTERVAL = 4 * 60 * 1000; // 4 minutes (before browser closes idle connections at ~5min)
const WARMUP_QUERY = 'SELECT 1'; // Lightweight query to warm up connection

let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
let isWarmedUp = false;
let lastActivity = Date.now();

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
 */
function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
        // Tab became visible - warm up connection
        warmupConnection();
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
