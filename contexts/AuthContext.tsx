import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

// Extend Supabase User type to include our custom properties
interface User extends SupabaseUser {
    isSubscriber?: boolean;
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

        // Use cache immediately if available
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                setIsAdmin(parsed.isAdmin);
                setIsSubscribed(parsed.isSubscribed);
                setIsCreator(parsed.isCreator);
                // Don't return here, we still want to revalidate in background
            } catch (e) {
                console.error('Error parsing user cache', e);
            }
        }

        try {
            // Run queries in parallel for performance
            const [userResult, creatorResult] = await Promise.all([
                supabase.from('users').select('is_admin, is_subscriber, subscription_tier').eq('id', userId).single(),
                supabase.from('creators').select('approved').eq('id', userId).single()
            ]);

            const userData = userResult.data;
            const creatorData = creatorResult.data;

            const newStatus = {
                isAdmin: userData?.is_admin === true,
                isSubscribed: userData?.is_subscriber === true,
                isCreator: creatorData?.approved === true
            };

            // Update state
            setIsAdmin(newStatus.isAdmin);
            setIsSubscribed(newStatus.isSubscribed);
            setIsCreator(newStatus.isCreator);

            // Update cache
            localStorage.setItem(cacheKey, JSON.stringify(newStatus));

            return newStatus.isSubscribed;
        } catch (error) {
            console.error('Error checking user status:', error);
            // If network fails but we had cache, keep using cache
            if (cached) {
                const parsed = JSON.parse(cached);
                return parsed.isSubscribed;
            }
            return false;
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
                            setUser({ ...baseUser, isSubscriber: parsed.isSubscribed });
                            // Set loading false immediately if we have cache
                            setLoading(false);
                        } catch (e) {
                            console.error('Error parsing user cache', e);
                        }
                    }

                    const subscribed = await checkUserStatus(baseUser.id);
                    if (mounted) {
                        setUser({ ...baseUser, isSubscriber: subscribed });
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
                    const subscribed = await checkUserStatus(baseUser.id);
                    if (mounted) {
                        setUser({ ...baseUser, isSubscriber: subscribed });
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
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error };
    };

    const signUp = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
        });
        return { error };
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
        });
        return { error };
    };

    const signInWithNaver = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'naver' as any,
            options: {
                redirectTo: `${window.location.origin}/`
            }
        });
        return { error };
    };

    const signInWithKakao = async () => {
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

    const value = {
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
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
