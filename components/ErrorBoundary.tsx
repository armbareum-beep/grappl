import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#09090b] flex items-center justify-center px-4">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

                    <div className="max-w-md w-full relative z-10">
                        <div className="bg-zinc-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800 shadow-2xl shadow-black ring-1 ring-white/10">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
                                    <AlertTriangle className="w-6 h-6 text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-xl leading-tight tracking-tight">문제가 발생했습니다</h3>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mt-1">Error Occurred</p>
                                </div>
                            </div>

                            <p className="text-zinc-300 text-sm mb-6 leading-relaxed font-medium">
                                예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
                            </p>

                            {this.state.error && (
                                <details className="text-left bg-black/40 p-4 rounded-xl mb-6 border border-white/5">
                                    <summary className="cursor-pointer text-sm font-bold text-zinc-400 mb-2">
                                        오류 상세 정보
                                    </summary>
                                    <pre className="text-xs text-red-400/80 font-mono overflow-auto mt-2">
                                        {this.state.error.toString()}
                                    </pre>
                                </details>
                            )}

                            <Button onClick={this.handleReset} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-violet-900/20 active:scale-95">
                                홈으로 돌아가기
                            </Button>

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
        }

        return this.props.children;
    }
}
