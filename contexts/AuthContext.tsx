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

    // Check if user is an approved creator
    const checkCreatorStatus = async (userId: string) => {
        const { data, error } = await supabase
            .from('creators')
            .select('id, approved')
            .eq('id', userId)
            .single();

        // Only set isCreator to true if approved by admin
        setIsCreator(!!data && !error && data.approved === true);
    };

    // Check if user is an admin
    const checkAdminStatus = async (userId: string) => {
        const { data, error } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', userId)
            .single();

        setIsAdmin(!!data && !error && data.is_admin === true);
    };

    useEffect(() => {
        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session } }) => {
            const baseUser = session?.user ?? null;
            if (baseUser) {
                // Check subscription status and attach to user object
                const subscribed = localStorage.getItem(`subscription_${baseUser.id}`) === 'true';
                const userWithSubscription: User = {
                    ...baseUser,
                    isSubscriber: subscribed
                };
                setUser(userWithSubscription);
                setIsSubscribed(subscribed);
                checkCreatorStatus(baseUser.id);
                checkAdminStatus(baseUser.id);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        // Listen for changes on auth state (sign in, sign out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const baseUser = session?.user ?? null;
            if (baseUser) {
                // Check subscription status and attach to user object
                const subscribed = localStorage.getItem(`subscription_${baseUser.id}`) === 'true';
                const userWithSubscription: User = {
                    ...baseUser,
                    isSubscriber: subscribed
                };
                setUser(userWithSubscription);
                setIsSubscribed(subscribed);
                checkCreatorStatus(baseUser.id);
                checkAdminStatus(baseUser.id);
            } else {
                setUser(null);
                setIsCreator(false);
                setIsAdmin(false);
                setIsSubscribed(false);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
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
