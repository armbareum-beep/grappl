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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-slate-600">로딩 중...</div>
            </div>
        );
    }

    if (!user || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
