import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Star, BookOpen, Users, Home, Package, DollarSign,
    Dumbbell, Activity, Shield, AlertTriangle, MessageSquare,
    Video, Swords, Bell, Download, TrendingUp,
    ArrowRight, Map, RefreshCw
} from 'lucide-react';
import {
    getAdminStats, AdminStats, getAdminChartData,
    getAdminRecentActivity, getAdminTopPerformers
} from '../../lib/api-admin';
import { ActivityItem, AdminTopPerformers } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<AdminStats>({
        totalUsers: 0,
        totalDrills: 0,
        pendingCreators: 0,
        totalCreators: 0,
        totalCourses: 0,
        totalSparring: 0
    });
    const [chartData, setChartData] = useState<{ salesData: any[]; userGrowthData: any[] }>({ salesData: [], userGrowthData: [] });
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
    const [topPerformers, setTopPerformers] = useState<AdminTopPerformers | null>(null);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [statsData, charts, activity, performers] = await Promise.all([
                getAdminStats(),
                getAdminChartData(30),
                getAdminRecentActivity(),
                getAdminTopPerformers(),

            ]);
            setStats(statsData);
            setChartData(charts);
            setRecentActivity(activity);
            setTopPerformers(performers);

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const MENU_SECTIONS = [
        {
            title: "콘텐츠 관리",
            items: [
                {
                    title: "강좌 관리",
                    desc: `총 ${stats.totalCourses}개의 강좌`,
                    icon: BookOpen,
                    bg: "bg-violet-400/10",
                    link: "/admin/courses"
                },
                {
                    title: "레슨 관리",
                    desc: "개별 레슨 및 강의 영상",
                    icon: Video,
                    bg: "bg-violet-400/10",
                    link: "/admin/lessons"
                },
                {
                    title: "드릴 관리",
                    desc: `총 ${stats.totalDrills}개의 드릴`,
                    icon: Dumbbell,
                    bg: "bg-emerald-400/10",
                    link: "/admin/drills"
                },
                {
                    title: "스파링 관리",
                    desc: `총 ${stats.totalSparring}개의 영상`,
                    icon: Swords,
                    bg: "bg-rose-400/10",
                    link: "/admin/sparring"
                },
                {
                    title: "루틴 관리",
                    desc: "훈련 루틴 생성 및 수정",
                    icon: Activity,
                    bg: "bg-cyan-400/10",
                    link: "/admin/routines"
                },
                {
                    title: "콘텐츠 승인 대기열",
                    desc: "새 콘텐츠 검토 및 승인",
                    icon: Shield,
                    bg: "bg-amber-400/10",
                    link: "/admin/approval"
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
                    bg: "bg-indigo-400/10",
                    link: "/admin/users"
                },
                {
                    title: "인스트럭터 관리",
                    desc: `총 ${stats.totalCreators}명의 인스트럭터 (${stats.pendingCreators}건 대기)`,
                    icon: Shield,
                    bg: "bg-purple-400/10",
                    link: "/admin/creators",
                    alert: stats.pendingCreators > 0
                },
                {
                    title: "1:1 문의 관리",
                    desc: "사용자 문의 확인 및 답변",
                    icon: MessageSquare,
                    bg: "bg-blue-400/10",
                    link: "/admin/support"
                },
                {
                    title: "알림 센터",
                    desc: "공지사항 및 알림 발송",
                    icon: Bell,
                    bg: "bg-orange-400/10",
                    link: "/admin/notifications"
                },
                {
                    title: "시스템 모니터링",
                    desc: "보안 로그 및 시스템 상태",
                    icon: Shield,
                    bg: "bg-red-400/10",
                    link: "/admin/logs"
                }
            ]
        },
        {
            title: "시스템 및 매출",
            items: [
                {
                    title: "사이트 설정",
                    desc: "랜딩페이지 섹션 및 상세 설정",
                    icon: Map,
                    bg: "bg-zinc-400/10",
                    link: "/admin/settings"
                },
                {
                    title: "마케팅 관리",
                    desc: "번들 상품 및 할인 쿠폰",
                    icon: Package,
                    bg: "bg-orange-400/10",
                    link: "/admin/marketing"
                },

                {
                    title: "정산 모니터링",
                    desc: "매출 및 정산 현황",
                    icon: DollarSign,
                    bg: "bg-green-400/10",
                    link: "/admin/payouts"
                },
                {
                    title: "Vimeo 클린업",
                    desc: "미연동 영상 및 저장소 정리",
                    icon: Video,
                    bg: "bg-rose-400/10",
                    link: "/admin/vimeo"
                },
                {
                    title: "영상 동기화",
                    desc: "영상 길이 및 썸네일 일괄 동기화",
                    icon: RefreshCw,
                    bg: "bg-cyan-400/10",
                    link: "/admin/vimeo-sync"
                }

            ]
        }
    ];

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                                관리자 대시보드
                            </h1>
                            <div className="px-2 py-0.5 bg-violet-500/10 border border-violet-500/20 rounded text-[10px] font-black text-violet-400 uppercase tracking-widest">v2.5 Premium</div>
                        </div>
                        <p className="text-zinc-400 text-lg">Grappl 플랫폼의 모든 핵심 데이터와 인프라를 관리합니다.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link to="/" className="group flex items-center gap-2 px-4 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:border-zinc-700 transition-all backdrop-blur-sm">
                            <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">홈으로 가기</span>
                        </Link>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: '총 사용자', value: stats.totalUsers, icon: Users, color: 'violet' },
                        { label: '총 강좌', value: stats.totalCourses, icon: BookOpen, color: 'blue' },
                        { label: '인스트럭터', value: stats.totalCreators, icon: Shield, color: 'purple', alert: stats.pendingCreators > 0 },
                        { label: '스파링 영상', value: stats.totalSparring, icon: Swords, color: 'rose' }
                    ].map((kpi, i) => (
                        <div key={i} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl hover:border-zinc-700 transition-colors group relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{kpi.label}</span>
                                <kpi.icon className={`w-4 h-4 text-zinc-600 group-hover:text-${kpi.color}-400 transition-colors`} />
                            </div>
                            <div className="text-3xl font-bold tracking-tight">{loading ? '-' : kpi.value.toLocaleString()}</div>
                            {kpi.alert && (
                                <div className="absolute top-0 right-0 w-2 h-2 bg-violet-500 rounded-full m-4 shadow-[0_0_12px_rgba(139,92,246,0.6)] animate-pulse" />
                            )}
                        </div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    {/* Charts Column */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Sales Chart */}
                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-white mb-1">매출 추이 (30일)</h3>
                                    <p className="text-sm text-zinc-500">일별 플랫폼 전체 매출 현황</p>
                                </div>
                                <button className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800/50 rounded-lg">
                                    <Download className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData.salesData}>
                                        <defs>
                                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                        <XAxis dataKey="date" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => value.slice(5)} />
                                        <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(value) => `₩${formatCurrency(value)}`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} itemStyle={{ color: '#fff' }} />
                                        <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Performers Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Top Courses */}
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-xl">
                                <div className="flex items-center gap-2 mb-6">
                                    <TrendingUp className="w-5 h-5 text-violet-400" />
                                    <h3 className="font-bold">인기 강좌 Top 3</h3>
                                </div>
                                <div className="space-y-4">
                                    {topPerformers?.courses.map((course, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
                                            <div>
                                                <div className="text-sm font-bold text-zinc-100">{course.title}</div>
                                                <div className="text-[10px] text-zinc-500">{course.instructor} • {course.salesCount}회 판매</div>
                                            </div>
                                            <div className="text-sm font-mono font-bold text-violet-400">₩{formatCurrency(course.revenue)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Top Creators */}
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-xl">
                                <div className="flex items-center gap-2 mb-6">
                                    <Star className="w-5 h-5 text-yellow-400" />
                                    <h3 className="font-bold">우수 인스트럭터</h3>
                                </div>
                                <div className="space-y-4">
                                    {topPerformers?.creators.map((creator, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer">
                                            <div>
                                                <div className="text-sm font-bold text-zinc-100">{creator.name}</div>
                                                <div className="text-[10px] text-zinc-500">구독자 {creator.subscribers.toLocaleString()}명</div>
                                            </div>
                                            <div className="text-sm font-mono font-bold text-yellow-500">₩{formatCurrency(creator.revenue)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Column */}
                    <div className="space-y-8">
                        {/* Live Activity Feed */}
                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-6 backdrop-blur-xl flex flex-col h-full max-h-[500px]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <h3 className="font-bold">실시간 활동 피드</h3>
                                </div>
                                <button className="text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest">전체보기</button>
                            </div>
                            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                {recentActivity.map((activity, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
                                                {activity.type === 'user_signup' && <Users className="w-4 h-4 text-blue-400" />}
                                                {activity.type === 'purchase' && <DollarSign className="w-4 h-4 text-emerald-400" />}
                                                {activity.type === 'creator_application' && <Shield className="w-4 h-4 text-purple-400" />}
                                                {activity.type === 'report' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                                            </div>
                                            {i !== recentActivity.length - 1 && <div className="absolute top-10 left-1/2 -translate-x-1/2 w-px h-6 bg-zinc-800" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="text-xs font-bold text-zinc-200 truncate group-hover:text-violet-400 transition-colors">{activity.title}</h4>
                                                <span className="text-[10px] text-zinc-600 shrink-0">{new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-normal line-clamp-2">{activity.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-auto pt-6">
                                <Link to="/admin/audit-logs" className="flex items-center justify-center gap-2 w-full py-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-xs font-bold text-zinc-400 transition-all border border-zinc-700/50">
                                    전체 로그 확인
                                    <ArrowRight className="w-3 h-3" />
                                </Link>
                            </div>
                        </div>

                        {/* System Health Removed */}
                    </div>
                </div>

                {/* Section Divider */}
                <div className="flex items-center gap-4 mb-12">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent to-zinc-800" />
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-600">Infrastructure Management</h2>
                    <div className="h-px flex-1 bg-gradient-to-l from-transparent to-zinc-800" />
                </div>

                {/* Menu Sections (Refined) */}
                <div className="space-y-16">
                    {MENU_SECTIONS.map((section, idx) => (
                        <div key={idx}>
                            <h2 className="text-sm font-bold text-zinc-500 mb-8 ml-2">{section.title}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {section.items.map((item, itemIdx) => {
                                    const Icon = item.icon;
                                    const isAlert = 'alert' in item && item.alert;

                                    return (
                                        <Link to={item.link} key={itemIdx}>
                                            <div className="group bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-6 hover:border-violet-500/40 hover:bg-zinc-900/60 transition-all cursor-pointer relative overflow-hidden h-full">
                                                <div className="absolute -inset-x-20 -inset-y-20 bg-violet-500/5 blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity" />

                                                {isAlert && (
                                                    <span className="absolute top-6 right-6 flex h-3 w-3">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-violet-500"></span>
                                                    </span>
                                                )}

                                                <div className={`w-14 h-14 ${item.bg} rounded-2xl flex items-center justify-center mb-6 border border-white/5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
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
