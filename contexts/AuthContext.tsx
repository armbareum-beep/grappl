import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { queryClient } from '../lib/react-query';

// Auto-recovery: clear stale auth data and reload
async function autoRecoverAuth(reason: string) {
    console.warn(`[AuthContext] Auto-recovery triggered: ${reason}`);

    try {
        // Check if we already tried recovery recently (prevent infinite loops)
        const lastRecovery = localStorage.getItem('auth_recovery_attempt');
        const now = Date.now();
        if (lastRecovery && now - parseInt(lastRecovery) < 30000) {
            console.warn('[AuthContext] Recovery attempted recently, skipping to prevent loop');
            return false;
        }

        try {
            localStorage.setItem('auth_recovery_attempt', now.toString());
        } catch { /* Safari Private Mode 등에서 예외 발생 가능 */ }

        try {
            // Sign out from Supabase to clear server session
            await supabase.auth.signOut();
        } catch (e) {
            console.warn('[AuthContext] signOut failed during recovery:', e);
        }

        // Clear auth-related localStorage keys (각각 try-catch로 감싸서 예외 방지)
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (
                    key.includes('supabase') ||
                    key.includes('auth') ||
                    key.startsWith('user_status')
                )) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(k => {
                try { localStorage.removeItem(k); } catch { }
            });
        } catch (e) {
            console.warn('[AuthContext] localStorage cleanup failed:', e);
        }

        // Clear session storage
        try {
            sessionStorage.clear();
        } catch { }

        // Invalidate all queries
        try {
            queryClient.clear();
        } catch { }

        return true;
    } catch (e) {
        // 최외곽 예외 처리 - 어떤 오류가 발생해도 함수가 정상 종료되도록
        console.error('[AuthContext] autoRecoverAuth failed:', e);
        return false;
    }
}

// Extend Supabase User type to include our custom properties
interface User extends SupabaseUser {
    isSubscriber?: boolean;
    subscription_tier?: string;
    ownedVideoIds?: string[];
    profile_image_url?: string;
    avatar_url?: string; // DB value
    is_complimentary_subscription?: boolean;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isCreator: boolean;
    isAdmin: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string) => Promise<{ error: any }>;
    signInWithGoogle: () => Promise<{ error: any }>;
    signInWithNaver: () => Promise<{ error: any }>;
    signInWithKakao: () => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    becomeCreator: (name: string, bio: string) => Promise<{ error: any }>;
    isSubscribed: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreator, setIsCreator] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Check user status from database
    const checkUserStatus = async (userId: string, isInitial: boolean = false, force: boolean = false) => {
        const cacheKey = `user_status_v4_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        let cachedData: any = null;

        if (cached && !force) {
            try {
                cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - (cachedData._cachedAt || 0);
                const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

                // ✅ 개선: 초기 로드 시에도 30분 캐시 신뢰 (기존 5분 → 30분)
                // 이렇게 하면 오랜만에 돌아온 사용자도 캐시 활용 가능
                if (cacheAge < CACHE_TTL) {
                    // 초기 로드면 백그라운드 업데이트 예약
                    if (isInitial) {
                        setTimeout(() => checkUserStatus(userId, false, true), 1000);
                    }
                    return { success: true, ...cachedData, usedCache: true };
                }
            } catch (e) {
                console.error('Error parsing cached user status:', e);
            }
        }

        let attempt = 0;
        const maxAttempts = 3;

        while (attempt < maxAttempts) {
            try {
                // ✅ 개선: 재시도 대기시간 단축 (500ms*2^n → 200ms*n)
                if (attempt > 0) {
                    await new Promise(r => setTimeout(r, 200 * attempt));
                }

                const queriesPromise = Promise.all([
                    supabase.from('users').select('email, is_admin, is_subscriber, is_complimentary_subscription, subscription_tier, profile_image_url, avatar_url').eq('id', userId).maybeSingle(),
                    supabase.from('creators').select('approved, profile_image').eq('id', userId).maybeSingle()
                ]);

                // ✅ 개선: 타임아웃 단축 (4/6/8초 → 3/4/5초, 총 18초 → 12초)
                const timeoutMs = 3000 + (attempt * 1000);
                const resultPromise = Promise.race([
                    queriesPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs))
                ]);

                const [userRes, creatorRes] = await resultPromise as any;

                if (userRes?.error) throw userRes.error;

                const userData = userRes?.data;
                const creatorData = creatorRes?.data;

                const newStatus = {
                    isAdmin: !!(userData?.is_admin || userData?.email === 'armbareum@gmail.com'),
                    isSubscribed: !!(
                        userData?.is_admin ||
                        userData?.email === 'armbareum@gmail.com' ||
                        userData?.is_subscriber ||
                        userData?.is_complimentary_subscription
                    ),
                    subscriptionTier: userData?.subscription_tier,
                    ownedVideoIds: [], // Column removed from DB - ownership now tracked via purchases table
                    isCreator: !!(creatorData?.approved === true || creatorData?.approved === 1),
                    profile_image_url: creatorData?.profile_image || userData?.profile_image_url || userData?.avatar_url,
                    avatar_url: userData?.avatar_url
                };

                // console.log('[AuthContext] Computed status:', newStatus);

                setIsAdmin(newStatus.isAdmin);
                setIsSubscribed(newStatus.isSubscribed);
                setIsCreator(newStatus.isCreator);

                localStorage.setItem(cacheKey, JSON.stringify({ ...newStatus, _cachedAt: Date.now() }));
                return { success: true, ...newStatus };

            } catch (error) {
                console.warn(`Error checking user status (Attempt ${attempt + 1}):`, error);
                attempt++;

                // If last attempt failed, fallback to cache or default
                if (attempt >= maxAttempts) {
                    if (cachedData) {
                        return { success: true, ...cachedData, usedCache: true };
                    }
                    return {
                        success: false,
                        isAdmin: false,
                        isCreator: false,
                        approved: false,
                        isSubscribed: false,
                        subscriptionTier: 'free',
                        ownedVideoIds: []
                    };
                }
            }
        }
        return { success: false };
    };

    const refreshUser = async () => {
        if (!user) return;
        await checkUserStatus(user.id, false, true);
    };

    // Safety timeout to prevent infinite loading
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn('Auth loading timed out, forcing completion');
                    return false;
                }
                return prev;
            });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            let loadingHandled = false; // 중복 setLoading(false) 방지용 플래그

            try {
                // ✅ 개선: getSession 타임아웃 단축 (8초 → 4초)
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<{ data: { session: null }, error?: any }>((resolve) =>
                    setTimeout(() => {
                        console.warn('getSession timed out, proceeding without session');
                        resolve({ data: { session: null }, error: new Error('Session timeout') });
                    }, 4000)
                );

                const result = await Promise.race([sessionPromise, timeoutPromise]);
                if (!mounted) return;

                const session = result.data?.session;

                // Check for stale/invalid session that might cause infinite loading
                if (session?.user) {
                    // Verify token is not expired
                    const expiresAt = session.expires_at;
                    const now = Math.floor(Date.now() / 1000);

                    if (expiresAt && expiresAt < now) {
                        console.warn('[AuthContext] Session token expired, attempting refresh');
                        const { data: refreshResult, error: refreshError } = await supabase.auth.refreshSession();

                        if (refreshError || !refreshResult.session) {
                            console.warn('[AuthContext] Token refresh failed, clearing stale session');
                            await autoRecoverAuth('expired_token_refresh_failed');
                            if (mounted) { setLoading(false); loadingHandled = true; }
                            return;
                        }
                        // Use refreshed session
                        const refreshedSession = refreshResult.session;
                        setUser({
                            ...refreshedSession.user,
                            isSubscriber: false,
                        } as any);
                        setLoading(false);
                        loadingHandled = true;

                        checkUserStatus(refreshedSession.user.id, true).then(status => {
                            if (mounted) {
                                setUser({
                                    ...refreshedSession.user,
                                    isSubscriber: status.isSubscribed,
                                    subscription_tier: status.subscriptionTier,
                                    ownedVideoIds: status.ownedVideoIds,
                                    profile_image_url: status.profile_image_url,
                                    avatar_url: status.avatar_url
                                });
                                setIsAdmin(status.isAdmin);
                                setIsCreator(status.isCreator);
                                setIsSubscribed(status.isSubscribed);
                            }
                        }).catch(err => {
                            console.warn('Background status check failed:', err);
                        });
                        return;
                    }

                    // CRITICAL: Set user immediately from session to avoid flickering and unauthorized redirects
                    setUser({
                        ...session.user,
                        isSubscriber: false, // Default to false, will be updated by checkUserStatus
                    } as any);
                    // Set loading false immediately after setting user - don't wait for full status
                    setLoading(false);
                    loadingHandled = true;

                    // Fetch full status in background (non-blocking)
                    checkUserStatus(session.user.id, true).then(status => {
                        if (mounted) {
                            setUser({
                                ...session.user,
                                isSubscriber: status.isSubscribed,
                                subscription_tier: status.subscriptionTier,
                                ownedVideoIds: status.ownedVideoIds,
                                profile_image_url: status.profile_image_url,
                                avatar_url: status.avatar_url
                            });
                            setIsAdmin(status.isAdmin);
                            setIsCreator(status.isCreator);
                            setIsSubscribed(status.isSubscribed);
                        }
                    }).catch(err => {
                        console.warn('Background status check failed:', err);
                    });
                } else {
                    // No session - check if there's stale auth data causing issues
                    try {
                        const hasStaleAuthData = localStorage.getItem('supabase.auth.token');
                        if (hasStaleAuthData) {
                            console.warn('[AuthContext] No session but stale auth data found, cleaning up');
                            await autoRecoverAuth('stale_auth_data_no_session');
                        }
                    } catch { /* localStorage 예외 무시 */ }
                    if (mounted) { setLoading(false); loadingHandled = true; }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                // On error, try auto-recovery
                await autoRecoverAuth('init_auth_error');
                if (mounted) { setLoading(false); loadingHandled = true; }
            } finally {
                // ✅ 최후의 방어선: 어떤 경로로든 여기까지 왔는데 loading이 아직 true면 강제로 false
                if (mounted && !loadingHandled) {
                    console.warn('[AuthContext] initAuth finally: forcing loading to false');
                    setLoading(false);
                }
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                const baseUser = session?.user ?? null;
                if (baseUser) {
                    // Invalidate queries on login to refresh with new user context
                    if (event === 'SIGNED_IN') {
                        queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
                        queryClient.invalidateQueries({ queryKey: ['drills-feed'] });
                        queryClient.invalidateQueries({ queryKey: ['lessons-feed'] });
                        queryClient.invalidateQueries({ queryKey: ['user'] });
                    }

                    // Set basic user info immediately
                    setUser(prev => {
                        if (prev?.id === baseUser.id) return prev;
                        return { ...baseUser } as any;
                    });

                    try {
                        const status = await checkUserStatus(baseUser.id);
                        if (mounted) {
                            const finalIsAdmin = status.isAdmin || baseUser.email === 'armbareum@gmail.com';
                            setUser({
                                ...baseUser,
                                isSubscriber: status.isSubscribed,
                                subscription_tier: status.subscriptionTier,
                                ownedVideoIds: status.ownedVideoIds,
                                profile_image_url: status.profile_image_url,
                                avatar_url: status.avatar_url
                            });

                            setIsAdmin(finalIsAdmin);
                            setIsCreator(status.isCreator);
                            setIsSubscribed(status.isSubscribed);
                        }
                    } catch (error) {
                        console.error('Error in auth state change handler:', error);
                    } finally {
                        // Always ensure loading is set to false
                        if (mounted) setLoading(false);
                    }
                } else {
                    // No user in session - ensure loading completes
                    if (mounted) setLoading(false);
                }
            } else if (event === 'SIGNED_OUT') {
                // Invalidate all user-related queries on sign out
                queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
                queryClient.invalidateQueries({ queryKey: ['drills-feed'] });
                queryClient.invalidateQueries({ queryKey: ['lessons-feed'] });
                queryClient.invalidateQueries({ queryKey: ['user'] });

                // Clear state immediately on sign out - don't block on getSession()
                // This prevents infinite loading when the session check fails or times out
                if (mounted) {
                    setUser(null);
                    setIsCreator(false);
                    setIsAdmin(false);
                    setIsSubscribed(false);
                    setLoading(false);
                }
            }
        });

        initAuth();

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password.trim(),
        });
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password: password.trim(),
        });
        return { error };
    };

    const signInWithGoogle = async () => {
        try {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== '/login' && currentPath !== '/') {
                localStorage.setItem('oauth_redirect_path', currentPath);
            }
        } catch (e) { }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: { access_type: 'offline', prompt: 'consent' },
                redirectTo: `${window.location.origin}/`
            }
        });
        return { error };
    };

    const signInWithNaver = async () => {
        try {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== '/login' && currentPath !== '/') {
                localStorage.setItem('oauth_redirect_path', currentPath);
            }
        } catch (e) { }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'naver' as any,
            options: { redirectTo: `${window.location.origin}/` }
        });
        return { error };
    };

    const signInWithKakao = async () => {
        try {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== '/login' && currentPath !== '/') {
                localStorage.setItem('oauth_redirect_path', currentPath);
            }
        } catch (e) { }
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao' as any,
            options: { redirectTo: `${window.location.origin}/` }
        });
        return { error };
    };

    const signOut = async () => {
        try {
            setLoading(true);
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Error signing out:', error);
        } finally {
            // Force clear state
            setUser(null);
            setIsCreator(false);
            setIsAdmin(false);
            setIsSubscribed(false);
            setLoading(false);

            // Clear all local storage
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch (e) { }

            // Force reload to clear any memory state and go to home
            window.location.href = '/';
        }
    };

    const becomeCreator = async (name: string, bio: string) => {
        if (!user) return { error: 'Not authenticated' };
        const { error } = await supabase
            .from('creators')
            .insert({
                id: user.id,
                name,
                bio,
                profile_image: 'https://via.placeholder.com/150',
                subscriber_count: 0,
                approved: false
            });
        return { error };
    };

    const value = React.useMemo(() => ({
        user,
        loading,
        isCreator,
        isAdmin,
        signIn,
        signUp,
        signInWithGoogle,
        signInWithNaver,
        signInWithKakao,
        signOut,
        becomeCreator,
        isSubscribed,
        refreshUser
    }), [user, loading, isCreator, isAdmin, isSubscribed, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
