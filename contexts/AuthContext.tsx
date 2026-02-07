import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

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
        const cacheKey = `user_status_v2_${userId}`;
        const cached = localStorage.getItem(cacheKey);
        let cachedData: any = null;

        if (cached && !force) {
            try {
                cachedData = JSON.parse(cached);
                const cacheAge = Date.now() - (cachedData._cachedAt || 0);
                const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

                // If it's initial load, we want to update state from cache for speed, 
                // BUT we should NOT return early. We want to fall through to fetch fresh data
                // to ensure subscription status is up to date (e.g. manual grants).
                // Only return early if using non-initial check and cache is fresh.
                if (!isInitial && cacheAge < CACHE_TTL) {
                    // console.log('[AuthContext] Returning cached user status', cachedData);
                    return { success: true, ...cachedData, usedCache: true };
                }
            } catch (e) {
                console.error('Error parsing cached user status:', e);
            }
        }

        try {
            console.log('[AuthContext] Fetching fresh user status for:', userId);
            const queriesPromise = Promise.all([
                supabase.from('users').select('email, is_admin, is_subscriber, is_complimentary_subscription, subscription_tier, owned_video_ids, profile_image_url, avatar_url').eq('id', userId).maybeSingle(),
                supabase.from('creators').select('approved, profile_image').eq('id', userId).maybeSingle()
            ]);

            // Wait with timeout
            const resultPromise = Promise.race([
                queriesPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000))
            ]);

            const [userResult, creatorResult] = await resultPromise as any;

            console.log('[AuthContext] Raw User table result:', userResult);

            const userData = userResult?.data;
            const creatorData = creatorResult?.data;

            const newStatus = {
                isAdmin: !!(userData?.is_admin === true || userData?.email === 'armbareum@gmail.com' || userData?.is_admin === 1),
                isSubscribed: !!(userData?.is_admin === true || userData?.email === 'armbareum@gmail.com' || userData?.is_admin === 1 || userData?.is_subscriber === true || userData?.is_subscriber === 1 || userData?.is_complimentary_subscription === true),
                subscriptionTier: userData?.subscription_tier,
                ownedVideoIds: userData?.owned_video_ids || [],
                isCreator: !!(creatorData?.approved === true || creatorData?.approved === 1),
                profile_image_url: creatorData?.profile_image || userData?.profile_image_url || userData?.avatar_url,
                avatar_url: userData?.avatar_url
            };

            console.log('[AuthContext] Computed status:', newStatus);

            setIsAdmin(newStatus.isAdmin);
            setIsSubscribed(newStatus.isSubscribed);
            setIsCreator(newStatus.isCreator);

            localStorage.setItem(cacheKey, JSON.stringify({ ...newStatus, _cachedAt: Date.now() }));
            return { success: true, ...newStatus };
        } catch (error) {
            console.warn('Error checking user status, falling back to cache if available:', error);
            if (cachedData) {
                return { success: true, ...cachedData, usedCache: true };
            }
            return { success: false, isAdmin: false, isCreator: false, isSubscribed: false, subscriptionTier: undefined, ownedVideoIds: [] };
        }
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
            try {
                // Add timeout to getSession to prevent infinite loading on slow/failed network
                const sessionPromise = supabase.auth.getSession();
                const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) =>
                    setTimeout(() => {
                        console.warn('getSession timed out, proceeding without session');
                        resolve({ data: { session: null } });
                    }, 3000)
                );

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                if (!mounted) return;

                if (session?.user) {
                    // CRITICAL: Set user immediately from session to avoid flickering and unauthorized redirects
                    setUser({
                        ...session.user,
                        isSubscriber: false, // Default to false, will be updated by checkUserStatus
                    } as any);
                    // Set loading false immediately after setting user - don't wait for full status
                    setLoading(false);

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
                    if (mounted) setLoading(false);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                if (mounted) setLoading(false);
            }
        };

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                const baseUser = session?.user ?? null;
                if (baseUser) {
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
