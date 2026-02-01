import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Extend Supabase User type to include our custom properties
interface User extends SupabaseUser {
    isSubscriber?: boolean;
    subscription_tier?: string;
    ownedVideoIds?: string[];
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreator, setIsCreator] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Check user status from database
    // Check user status from database
    const checkUserStatus = async (userId: string) => {
        const cacheKey = `user_status_${userId}`;
        const cached = localStorage.getItem(cacheKey);

        // Use cache immediately if available and not expired (5 min TTL)
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const cacheAge = Date.now() - (parsed._cachedAt || 0);
                const CACHE_TTL = 5 * 60 * 1000; // 5분

                if (cacheAge < CACHE_TTL) {
                    setIsAdmin(parsed.isAdmin);
                    setIsSubscribed(parsed.isSubscribed);
                    setIsCreator(parsed.isCreator);
                } else {
                    // 캐시 만료 - stale 데이터 사용 안함
                    localStorage.removeItem(cacheKey);
                }
                // Don't return here, we still want to revalidate in background
            } catch (e) {
                console.error('Error parsing user cache', e);
            }
        }

        try {
            // Run queries in parallel for performance
            const [userResult, creatorResult] = await Promise.all([
                supabase.from('users').select('email, is_admin, is_subscriber, subscription_tier, owned_video_ids').eq('id', userId).maybeSingle(),
                supabase.from('creators').select('approved').eq('id', userId).maybeSingle()
            ]);

            const userData = userResult.data;
            const creatorData = creatorResult.data;

            const newStatus = {
                isAdmin: !!(userData?.is_admin === true || userData?.email === 'armbareum@gmail.com'),
                isSubscribed: !!(userData?.is_subscriber === true),
                subscriptionTier: userData?.subscription_tier,
                ownedVideoIds: userData?.owned_video_ids || [],
                isCreator: !!(creatorData?.approved === true)
            };

            // Update state
            setIsAdmin(newStatus.isAdmin);
            setIsSubscribed(newStatus.isSubscribed);
            setIsCreator(newStatus.isCreator);

            // Update cache with timestamp
            localStorage.setItem(cacheKey, JSON.stringify({ ...newStatus, _cachedAt: Date.now() }));

            return {
                isAdmin: newStatus.isAdmin,
                isCreator: newStatus.isCreator,
                isSubscribed: newStatus.isSubscribed,
                subscriptionTier: newStatus.subscriptionTier,
                ownedVideoIds: newStatus.ownedVideoIds
            };
        } catch (error) {
            console.error('Error checking user status:', error);
            // If network fails but we had cache, keep using cache
            if (cached) {
                const parsed = JSON.parse(cached);
                return {
                    isAdmin: parsed.isAdmin,
                    isCreator: parsed.isCreator,
                    isSubscribed: parsed.isSubscribed,
                    subscriptionTier: parsed.subscriptionTier,
                    ownedVideoIds: parsed.ownedVideoIds
                };
            }
            return { isAdmin: false, isCreator: false, isSubscribed: false, subscriptionTier: undefined, ownedVideoIds: [] };
        }
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
        }, 3000); // Reduced to 3s to prevent sticking on loading screen
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let mounted = true;

        const initAuth = async () => {
            try {
                // Get initial session
                const { data: sessionData } = await supabase.auth.getSession();
                const { session } = sessionData;

                if (!mounted) return;

                const baseUser = session?.user ?? null;
                if (baseUser) {
                    // Check cache first to unblock UI immediately
                    const cacheKey = `user_status_${baseUser.id}`;
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached);
                            const cacheAge = Date.now() - (parsed._cachedAt || 0);
                            const CACHE_TTL = 5 * 60 * 1000; // 5분

                            if (cacheAge < CACHE_TTL) {
                                setUser({
                                    ...baseUser,
                                    isSubscriber: parsed.isSubscribed,
                                    subscription_tier: parsed.subscriptionTier,
                                    ownedVideoIds: parsed.ownedVideoIds
                                });
                                // Set admin/creator statuses from cache too
                                setIsAdmin(parsed.isAdmin || false);
                                setIsCreator(parsed.isCreator || false);
                                setIsSubscribed(parsed.isSubscribed || false);

                                // Set loading false immediately if we have valid cache
                                setLoading(false);
                            } else {
                                localStorage.removeItem(cacheKey);
                            }
                        } catch (e) {
                            console.error('Error parsing user cache', e);
                        }
                    }

                    const { isAdmin: admin, isCreator: creator, isSubscribed: subscribed, subscriptionTier, ownedVideoIds: ownedIds } = await checkUserStatus(baseUser.id);
                    if (mounted) {
                        setUser({
                            ...baseUser,
                            isSubscriber: subscribed,
                            subscription_tier: subscriptionTier,
                            ownedVideoIds: ownedIds
                        });
                        setIsAdmin(admin);
                        setIsCreator(creator);
                        setIsSubscribed(subscribed);
                    }
                } else {
                    if (mounted) {
                        setUser(null);
                        setIsCreator(false);
                        setIsAdmin(false);
                        setIsSubscribed(false);
                    }
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                if (mounted) setUser(null);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        initAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email);

            if (!mounted) return;

            // Only handle specific events or if we need to refresh
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
                const baseUser = session?.user ?? null;
                if (baseUser) {
                    const status = await checkUserStatus(baseUser.id);
                    const finalIsAdmin = status.isAdmin || baseUser.email === 'armbareum@gmail.com';
                    if (mounted) {
                        setUser({ ...baseUser, isSubscriber: status.isSubscribed });
                        setIsAdmin(finalIsAdmin);
                        setIsCreator(status.isCreator);
                        setIsSubscribed(status.isSubscribed); // Ensure isSubscribed is also updated
                        setLoading(false);
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsCreator(false);
                setIsAdmin(false);
                setIsSubscribed(false);
                localStorage.removeItem(`user_status_${session?.user?.id}`); // Clear cache if possible, though session might be null
                setLoading(false);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email: string, password: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: password.trim(),
        });
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        const normalizedEmail = email.trim().toLowerCase();
        const { error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password.trim(),
        });
        return { error };
    };

    const signInWithGoogle = async () => {
        // 현재 페이지 정보를 저장 (OAuth 리다이렉트 후 복원용)
        try {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== '/login' && currentPath !== '/') {
                localStorage.setItem('oauth_redirect_path', currentPath);
            }
        } catch (e) {
            console.warn('Failed to save redirect path:', e);
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
                redirectTo: `${window.location.origin}/`
            }
        });
        return { error };
    };

    const signInWithNaver = async () => {
        // 현재 페이지 정보를 저장 (OAuth 리다이렉트 후 복원용)
        try {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== '/login' && currentPath !== '/') {
                localStorage.setItem('oauth_redirect_path', currentPath);
            }
        } catch (e) {
            console.warn('Failed to save redirect path:', e);
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'naver' as any,
            options: {
                redirectTo: `${window.location.origin}/`
            }
        });
        return { error };
    };

    const signInWithKakao = async () => {
        // 현재 페이지 정보를 저장 (OAuth 리다이렉트 후 복원용)
        try {
            const currentPath = window.location.pathname + window.location.search + window.location.hash;
            if (currentPath !== '/login' && currentPath !== '/') {
                localStorage.setItem('oauth_redirect_path', currentPath);
            }
        } catch (e) {
            console.warn('Failed to save redirect path:', e);
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'kakao' as any,
            options: {
                redirectTo: `${window.location.origin}/`
            }
        });
        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
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
                approved: false  // Requires admin approval
            });

        // Don't set isCreator to true immediately - wait for approval
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
    }), [user, loading, isCreator, isAdmin, isSubscribed]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
