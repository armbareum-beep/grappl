import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '로딩 중...' }) => {
    const [showReset, setShowReset] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowReset(true);
        }, 3000); // Show reset option after 3 seconds

        return () => clearTimeout(timer);
    }, []);

    const handleReset = () => {
        if (window.confirm('캐시를 삭제하고 새로고침하시겠습니까?\n\n로그인 정보는 유지되며, 앱이 최신 버전으로 업데이트됩니다.')) {
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
                        <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 p-6 rounded-xl border border-blue-500/30 max-w-md backdrop-blur-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-white font-bold text-lg">앱 업데이트 필요</h3>
                            </div>
                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                                새로운 기능과 개선사항이 적용되었습니다.<br />
                                원활한 사용을 위해 캐시를 삭제해 주세요.
                            </p>
                            <button
                                onClick={handleReset}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                            >
                                캐시 삭제하고 새로고침
                            </button>
                            <p className="text-slate-500 text-xs mt-3 text-center">
                                * 로그인 정보는 유지됩니다
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
