import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, BarChart2, Settings, Upload } from 'lucide-react';

export const CreatorLayout: React.FC = () => {
    const location = useLocation();

    const isActive = (path: string) => {
        return location.pathname === path || location.pathname.startsWith(`${path}/`);
    };

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-slate-200 hidden md:block fixed h-full z-10">
                <div className="p-6 border-b border-slate-200">
                    <Link to="/" className="flex items-center gap-2 text-blue-600 font-bold text-xl">
                        <span>Grapplay</span>
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">Creator</span>
                    </Link>
                </div>
                <nav className="p-4 space-y-1">
                    <Link
                        to="/creator/dashboard"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/dashboard')
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <LayoutDashboard className="w-5 h-5" />
                        대시보드
                    </Link>
                    <Link
                        to="/creator/courses"
                        className={`flex items - center gap - 3 px - 4 py - 3 rounded - lg transition - colors ${isActive('/creator/courses')
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } `}
                    >
                        강좌 관리
                    </Link>
                    <Link
                        to="/creator/upload-drill"
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive('/creator/upload-drill')
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Upload className="w-5 h-5" />
                        드릴 업로드
                    </Link>
                    <Link
                        to="/creator/analytics"
                        className={`flex items - center gap - 3 px - 4 py - 3 rounded - lg transition - colors ${isActive('/creator/analytics')
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } `}
                    >
                        <BarChart2 className="w-5 h-5" />
                        분석 (준비중)
                    </Link>
                    <Link
                        to="/creator/settings"
                        className={`flex items - center gap - 3 px - 4 py - 3 rounded - lg transition - colors ${isActive('/creator/settings')
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            } `}
                    >
                        <Settings className="w-5 h-5" />
                        설정 (준비중)
                    </Link>
                </nav>

                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
                    <Link to="/">
                        <button className="w-full py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
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
