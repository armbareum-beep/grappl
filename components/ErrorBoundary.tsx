import React, { Component, ErrorInfo, ReactNode } from 'react';
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
                <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center px-4">
                    <div className="max-w-md w-full text-center">
                        <div className="mb-8">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
                                <AlertTriangle className="w-10 h-10 text-red-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">
                                문제가 발생했습니다
                            </h1>
                            <p className="text-slate-600 mb-4">
                                예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
                            </p>
                            {this.state.error && (
                                <details className="text-left bg-slate-100 p-4 rounded-lg mb-6">
                                    <summary className="cursor-pointer text-sm font-medium text-slate-700 mb-2">
                                        오류 상세 정보
                                    </summary>
                                    <pre className="text-xs text-slate-600 overflow-auto">
                                        {this.state.error.toString()}
                                    </pre>
                                </details>
                            )}
                        </div>

                        <Button onClick={this.handleReset} className="w-full">
                            홈으로 돌아가기
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
