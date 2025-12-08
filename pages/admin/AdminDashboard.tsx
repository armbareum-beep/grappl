import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Star, BookOpen, Users, Home, Package, DollarSign,
    Dumbbell, Trophy, AlertTriangle, Activity, Shield, MessageSquare
} from 'lucide-react';
import { getAdminStats, AdminStats } from '../../lib/api-admin';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalDrills: 0,
        pendingCreators: 0,
        totalCourses: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const data = await getAdminStats();
        setStats(data);
        setLoading(false);
    };

    const MENU_SECTIONS = [
        {
            title: "콘텐츠 관리",
            items: [
                {
                    title: "강좌 관리",
                    desc: `총 ${stats.totalCourses}개의 강좌`,
                    icon: BookOpen,
                    color: "text-blue-400",
                    bg: "bg-blue-400/10",
                    link: "/admin/courses"
                },
                {
                    title: "드릴 관리",
                    desc: `총 ${stats.totalDrills}개의 드릴`,
                    icon: Dumbbell,
                    color: "text-emerald-400",
                    bg: "bg-emerald-400/10",
                    link: "/admin/drills"
                },
                {
                    title: "루틴 관리",
                    desc: "훈련 루틴 생성 및 수정",
                    icon: Activity,
                    color: "text-cyan-400",
                    bg: "bg-cyan-400/10",
                    link: "/admin/routines"
                }
            ]
        },
        {
            title: "유저 및 커뮤니티",
            items: [
                {
                    title: "사용자 관리",
                    desc: `총 ${stats.totalUsers}명의 유저`,
                    icon: Users,
                    color: "text-indigo-400",
                    bg: "bg-indigo-400/10",
                    link: "/admin/users"
                },
                {
                    title: "인스트럭터 관리",
                    desc: `${stats.pendingCreators}건의 대기 중인 신청`,
                    icon: Shield,
                    color: "text-purple-400",
                    bg: "bg-purple-400/10",
                    link: "/admin/creators",
                    alert: stats.pendingCreators > 0
                },
                {
                    title: "신고 관리",
                    desc: "접수된 신고 내역 확인",
                    icon: AlertTriangle,
                    color: "text-red-400",
                    bg: "bg-red-400/10",
                    link: "/admin/reports"
                },
                {
                    title: "1:1 문의 관리",
                    desc: "사용자 문의 답변",
                    icon: MessageSquare, // Make sure MessageSquare is imported
                    color: "text-blue-400",
                    bg: "bg-blue-400/10",
                    link: "/admin/support"
                }
            ]
        },
        {
            title: "시스템 및 매출",
            items: [
                {
                    title: "마케팅 관리",
                    desc: "쿠폰 및 프로모션",
                    icon: Package,
                    color: "text-orange-400",
                    bg: "bg-orange-400/10",
                    link: "/admin/marketing"
                },
                {
                    title: "정산 모니터링",
                    desc: "매출 및 정산 현황",
                    icon: DollarSign,
                    color: "text-green-400",
                    bg: "bg-green-400/10",
                    link: "/admin/payouts"
                },
                {
                    title: "토너먼트 관리",
                    desc: "대회 생성 및 대진표",
                    icon: Trophy,
                    color: "text-yellow-400",
                    bg: "bg-yellow-400/10",
                    link: "/admin/tournaments"
                }
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h1 className="text-3xl font-bold mb-2">관리자 대시보드</h1>
                        <p className="text-slate-400">Grappl 플랫폼의 모든 기능을 관리합니다.</p>
                    </div>
                    <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                        <Home className="w-4 h-4" />
                        <span>홈으로</span>
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="text-slate-400 text-sm mb-1">총 사용자</div>
                        <div className="text-2xl font-bold">{loading ? '-' : stats.totalUsers.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="text-slate-400 text-sm mb-1">총 강좌</div>
                        <div className="text-2xl font-bold">{loading ? '-' : stats.totalCourses.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                        <div className="text-slate-400 text-sm mb-1">총 드릴</div>
                        <div className="text-2xl font-bold">{loading ? '-' : stats.totalDrills.toLocaleString()}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                        <div className="text-slate-400 text-sm mb-1">승인 대기</div>
                        <div className="text-2xl font-bold text-purple-400">{loading ? '-' : stats.pendingCreators}</div>
                        {stats.pendingCreators > 0 && (
                            <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full m-3 animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Menu Sections */}
                <div className="space-y-12">
                    {MENU_SECTIONS.map((section, idx) => (
                        <div key={idx}>
                            <h2 className="text-xl font-bold mb-6 text-slate-300 border-l-4 border-slate-700 pl-3">
                                {section.title}
                            </h2>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.items.map((item, itemIdx) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link to={item.link} key={itemIdx}>
                                            <div className="group bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-600 hover:bg-slate-800 transition-all cursor-pointer relative">
                                                {item.alert && (
                                                    <span className="absolute top-4 right-4 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                    </span>
                                                )}
                                                <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
                                                    {item.title}
                                                </h3>
                                                <p className="text-slate-500 text-sm group-hover:text-slate-300">
                                                    {item.desc}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
