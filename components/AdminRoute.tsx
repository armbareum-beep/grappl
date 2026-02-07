import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const AdminLoadingFallback = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 gap-6">
        <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-violet-500/20" />
            <div className="absolute inset-0 rounded-full border-t-2 border-violet-500 animate-spin" />
        </div>
        <div className="text-zinc-500 text-sm font-medium animate-pulse">관리자 페이지 로딩 중...</div>
    </div>
);

interface AdminRouteProps {
    children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return <AdminLoadingFallback />;
    }

    // Direct check: if not loading and definitely not an admin, boot them.
    // AuthContext now preserves isAdmin=true on transient errors, so this is safe.
    if (!user || !isAdmin) {
        console.warn('[AdminRoute] Access denied: User not found or not admin. Redirecting to home.');
        return <Navigate to="/" replace />;
    }

    return (
        <Suspense fallback={<AdminLoadingFallback />}>
            {children}
        </Suspense>
    );
};
