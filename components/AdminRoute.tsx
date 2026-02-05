import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface AdminRouteProps {
    children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, loading, isAdmin } = useAuth();
    if (loading) {
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

    // Direct check: if not loading and definitely not an admin, boot them.
    // AuthContext now preserves isAdmin=true on transient errors, so this is safe.
    if (!user || !isAdmin) {
        console.warn('[AdminRoute] Access denied: User not found or not admin. Redirecting to home.');
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
