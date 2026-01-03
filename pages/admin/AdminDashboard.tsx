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
                },
                {
                    title: "고객 후기 관리",
                    desc: "랜딩 페이지 후기 관리",
                    icon: Star,
                    color: "text-yellow-400",
                    bg: "bg-yellow-400/10",
                    link: "/admin/testimonials"
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
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-end mb-12">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                            관리자 대시보드
                        </h1>
                        <p className="text-zinc-400 text-lg">Grappl 플랫폼의 모든 핵심 데이터와 인프라를 관리합니다.</p>
                    </div>
                    <Link to="/" className="group flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-700 transition-all backdrop-blur-sm">
                        <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">홈으로 가기</span>
                    </Link>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">총 사용자</span>
                            <Users className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">{loading ? '-' : stats.totalUsers.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">총 강좌</span>
                            <BookOpen className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">{loading ? '-' : stats.totalCourses.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-colors group">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">총 드릴</span>
                            <Dumbbell className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">{loading ? '-' : stats.totalDrills.toLocaleString()}</div>
                    </div>
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-colors group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">승인 대기</span>
                            <Shield className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight text-violet-400">{loading ? '-' : stats.pendingCreators}</div>
                        {stats.pendingCreators > 0 && (
                            <div className="absolute top-0 right-0 w-3 h-3 bg-violet-500 rounded-full m-4 shadow-[0_0_12px_rgba(139,92,246,0.6)] animate-pulse" />
                        )}
                    </div>
                </div>

                {/* Menu Sections */}
                <div className="space-y-16">
                    {MENU_SECTIONS.map((section, idx) => (
                        <div key={idx}>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-px flex-1 bg-zinc-800/50" />
                                <h2 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500">
                                    {section.title}
                                </h2>
                                <div className="h-px flex-1 bg-zinc-800/50" />
                            </div>
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.items.map((item, itemIdx) => {
                                    const Icon = item.icon;
                                    return (
                                        <Link to={item.link} key={itemIdx}>
                                            <div className="group bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-6 hover:border-violet-500/30 hover:bg-zinc-900/60 transition-all cursor-pointer relative overflow-hidden">
                                                {/* Hover Glow */}
                                                <div className="absolute -inset-x-20 -inset-y-20 bg-violet-500/5 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />

                                                {item.alert && (
                                                    <span className="absolute top-6 right-6 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                                                    </span>
                                                )}

                                                <div className={`w-14 h-14 ${item.bg === 'bg-blue-400/10' || item.bg === 'bg-indigo-400/10' || item.bg === 'bg-purple-400/10' || item.bg === 'bg-cyan-400/10' ? 'bg-violet-500/10 text-violet-400' :
                                                    item.bg === 'bg-emerald-400/10' || item.bg === 'bg-green-400/10' ? 'bg-emerald-500/10 text-emerald-400' :
                                                        item.bg === 'bg-yellow-400/10' || item.bg === 'bg-orange-400/10' ? 'bg-orange-500/10 text-orange-400' :
                                                            item.bg === 'bg-red-400/10' ? 'bg-red-500/10 text-red-400' : 'bg-zinc-800/50 text-zinc-400'} rounded-2xl flex items-center justify-center mb-6 border border-white/5 shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}>
                                                    <Icon className="w-7 h-7" />
                                                </div>

                                                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-violet-400 transition-colors">
                                                    {item.title}
                                                </h3>
                                                <p className="text-zinc-500 text-sm leading-relaxed group-hover:text-zinc-400 transition-colors">
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
