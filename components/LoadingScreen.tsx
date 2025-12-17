import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '로딩 중...' }) => {
    const [showReset, setShowReset] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowReset(true);
        }, 10000); // Show reset option after 10 seconds (was 5)

        return () => clearTimeout(timer);
    }, []);

    const handleReset = () => {
        if (window.confirm('새로고침 하시겠습니까? 현재 페이지를 다시 로드합니다.')) {
            window.location.reload();
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
                                로딩이 오래 걸리고 있나요? 페이지를 새로고침해 보세요.
                            </p>
                            <button
                                onClick={handleReset}
                                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg"
                            >
                                새로고침
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
