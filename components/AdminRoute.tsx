import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, loading, isAdmin } = useAuth();
    const [isRevalidating, setIsRevalidating] = React.useState(false);
    const [shouldRedirect, setShouldRedirect] = React.useState(false);

    // Track revalidation/grace period
    React.useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (!loading) {
            if (user && !isAdmin) {
                // If user exists but not admin, wait a bit before redirecting
                // This handles cases where isAdmin might be false for a split second 
                // during a background refresh/revalidation
                setIsRevalidating(true);
                timeout = setTimeout(() => {
                    setShouldRedirect(true);
                    setIsRevalidating(false);
                }, 2000); // 2 second grace period
            } else {
                setIsRevalidating(false);
                setShouldRedirect(false);
            }
        }

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [loading, user, isAdmin]);

    if (loading || (isRevalidating && !shouldRedirect)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-6">
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
                    <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
                </div>
                <div className="text-zinc-500 text-sm font-medium animate-pulse">관리 권한 확인 중...</div>
            </div>
        );
    }

    if (!user || (shouldRedirect && !isAdmin)) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
