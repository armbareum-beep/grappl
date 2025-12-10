import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '로딩 중...' }) => {
    const [showReset, setShowReset] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowReset(true);
        }, 5000); // Show reset option after 5 seconds

        return () => clearTimeout(timer);
    }, []);

    const handleReset = () => {
        if (window.confirm('앱을 초기화하시겠습니까? 로그인 정보가 로그아웃될 수 있습니다.')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-6 p-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>

            <div className="text-center space-y-4">
                <p className="text-slate-400 animate-pulse">{message}</p>

                {showReset && (
                    <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800 max-w-xs">
                            <p className="text-slate-400 text-sm mb-3">
                                로딩이 지연되고 있나요? 앱을 초기화하여 문제를 해결할 수 있습니다.
                            </p>
                            <button
                                onClick={handleReset}
                                className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-lg transition-colors border border-slate-700 shadow-lg"
                            >
                                앱 초기화하기
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
