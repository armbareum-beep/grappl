import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';

export const NotFound: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                <div className="mb-8">
                    <h1 className="text-9xl font-black text-slate-200">404</h1>
                    <h2 className="text-3xl font-bold text-slate-900 mt-4 mb-2">
                        페이지를 찾을 수 없습니다
                    </h2>
                    <p className="text-slate-600">
                        요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/">
                        <Button className="w-full sm:w-auto flex items-center justify-center gap-2">
                            <Home className="w-4 h-4" />
                            홈으로 가기
                        </Button>
                    </Link>
                    <button
                        onClick={() => window.history.back()}
                        className="w-full sm:w-auto px-6 py-3 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        이전 페이지
                    </button>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-500">
                        문제가 계속되면{' '}
                        <Link to="/contact" className="text-blue-600 hover:underline">
                            고객센터
                        </Link>
                        로 문의해주세요.
                    </p>
                </div>
            </div>
        </div>
    );
};
