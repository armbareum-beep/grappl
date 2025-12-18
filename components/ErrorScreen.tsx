import React from 'react';

interface ErrorScreenProps {
    title?: string;
    error?: string;
    resetMessage?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({
    title = '앱 업데이트 필요',
    error = '오류가 발생했습니다.',
    resetMessage = '콘텐츠를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다.'
}) => {
    const handleReset = () => {
        if (window.confirm('캐시를 삭제하고 새로고침하시겠습니까?\n\n로그인 정보는 유지되며, 앱이 최신 버전으로 업데이트됩니다.')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 gap-6 p-4">
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-blue-900/30 to-indigo-900/30 p-8 rounded-xl border border-blue-500/30 max-w-md backdrop-blur-sm shadow-2xl">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-xl uppercase tracking-tight">{title}</h3>
                            <p className="text-blue-400 text-xs mt-1 font-medium">원활한 사용을 위해 새로고침이 필요합니다</p>
                        </div>

                    </div>

                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                        {resetMessage}
                        <span className="text-red-400/80 font-mono text-xs block mt-4 p-3 bg-black/40 rounded-lg border border-white/5 overflow-hidden text-ellipsis whitespace-nowrap" title={error}>
                            Error: {error}
                        </span>
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={handleReset}
                            className="w-full px-4 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                            캐시 삭제하고 새로고침
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full px-4 py-2 text-slate-500 hover:text-slate-300 text-sm transition-colors font-medium"
                        >
                            단순 새로고침
                        </button>
                    </div>
                    <p className="text-slate-600 text-xs mt-4 text-center">
                        * 로그인 정보는 안전하게 유지됩니다
                    </p>
                </div>
            </div>
        </div>
    );
};
