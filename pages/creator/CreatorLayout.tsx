import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BarChart2, Settings, Upload, Layers } from 'lucide-react';

export const CreatorLayout: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    return (
        <div className="flex min-h-screen bg-slate-950 text-white">
            {/* Sidebar */}
            <div className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block fixed h-full z-10">
                <div className="p-6 border-b border-slate-800">
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo_v2.png" alt="Grapplay" loading="lazy" className="h-12 w-auto object-contain mix-blend-screen" />
                        <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">Creator</span>
                    </Link>
                </div>
                <nav className="p-4 space-y-1">
                    <Link
                        to="/creator/dashboard"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/dashboard')
                            ? 'bg-blue-900/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        대시보드
                    </Link>
                    <Link
                        to="/creator/courses"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/courses')
                            ? 'bg-blue-900/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        클래스 관리
                    </Link>

                    <Link
                        to="/creator/upload-drill"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/upload-drill')
                            ? 'bg-blue-900/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Upload className="w-5 h-5" />
                        드릴 업로드
                    </Link>
                    <Link
                        to="/creator/create-routine"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/create-routine')
                            ? 'bg-blue-900/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Layers className="w-5 h-5" />
                        루틴 만들기
                    </Link>
                    <Link
                        to="/creator/analytics"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/analytics')
                            ? 'bg-blue-900/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <BarChart2 className="w-5 h-5" />
                        분석 (준비중)
                    </Link>
                    <Link
                        to="/creator/settings"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/settings')
                            ? 'bg-blue-900/20 text-blue-400 font-medium'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                    >
                        <Settings className="w-5 h-5" />
                        설정 (준비중)
                    </Link>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
                    <Link to="/">
                        <button className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">
                            ← 수강생 모드로 돌아가기
                        </button>
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-64">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
};
