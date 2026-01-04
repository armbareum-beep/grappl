import React from 'react';

interface ErrorScreenProps {
    title?: string;
    error?: string;
    resetMessage?: string;
    onRetry?: () => void | Promise<void>;
    onReset?: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
    title = '앱 업데이트 필요',
    error = '오류가 발생했습니다.',
    resetMessage = '콘텐츠를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다.',
    onRetry,
    onReset
}) => {
    const handleReset = () => {
        if (onReset) {
            onReset();
            return;
        }

        if (window.confirm('캐시를 삭제하고 새로고침하시겠습니까?\n\n로그인 정보는 유지되며, 앱이 최신 버전으로 업데이트됩니다.')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090b] gap-6 p-4">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
                <div className="bg-zinc-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800 max-w-md shadow-2xl shadow-black ring-1 ring-white/10">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <svg className="w-6 h-6 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-black text-xl leading-tight tracking-tight">{title}</h3>
                            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Update Required</p>
                        </div>
                    </div>

                    <p className="text-zinc-300 text-sm mb-6 leading-relaxed font-medium">
                        {resetMessage}
                        <span className="text-red-400/80 font-mono text-xs block mt-4 p-3 bg-black/40 rounded-lg border border-white/5 overflow-hidden text-ellipsis whitespace-nowrap" title={error}>
                            Error: {error}
                        </span>
                    </p>

                    <div className="flex flex-col gap-3">
                        {onRetry && (
                            <button
                                onClick={onRetry}
                                className="w-full px-4 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-violet-900/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                다시 시도하기
                            </button>
                        )}

                        <button
                            onClick={handleReset}
                            className={`w-full px-4 py-4 ${onRetry ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/20'} font-black text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2`}
                        >
                            캐시 삭제하고 새로고침
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors font-bold"
                        >
                            단순 새로고침
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-zinc-500 font-bold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        로그인 정보는 안전하게 유지됩니다
                    </div>
                </div>
            </div>
        </div>
    );
};
