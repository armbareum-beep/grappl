import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
    children: React.ReactNode;
    guestRedirect?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, guestRedirect }) => {
    const { user, loading } = useAuth();
    const location = useLocation();
    const [loadingTimedOut, setLoadingTimedOut] = useState(false);

    // 5초 타임아웃: 무한 로딩 방지
    useEffect(() => {
        if (!loading) {
            setLoadingTimedOut(false);
            return;
        }

        const timer = setTimeout(() => {
            console.warn('[ProtectedRoute] Auth loading timed out after 5s');
            setLoadingTimedOut(true);
        }, 5000);

        return () => clearTimeout(timer);
    }, [loading]);

    // 로딩 중이고 타임아웃 안 됐으면 로딩 화면 표시
    if (loading && !loadingTimedOut) {
        return <LoadingScreen message="인증 정보를 확인하고 있습니다..." />;
    }

    // 타임아웃 됐거나 로딩 끝났는데 유저 없으면 리다이렉트
    if (!user) {
        if (guestRedirect) {
            return <Navigate to={guestRedirect} replace />;
        }
        // Redirect to login page but save the attempted location
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
