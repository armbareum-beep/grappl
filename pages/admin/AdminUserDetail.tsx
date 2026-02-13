import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserActivityStats, getUserWatchHistory, UserWatchHistorySummary } from '../../lib/api-admin';
import { ArrowLeft, User, Clock, ShoppingCart, BookOpen, Activity, Play, Eye, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminUserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [watchHistory, setWatchHistory] = useState<UserWatchHistorySummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'activity' | 'watch'>('activity');

    useEffect(() => {
        if (id) fetchStats();
    }, [id]);

    const fetchStats = async () => {
        try {
            const [activityData, watchData] = await Promise.all([
                getUserActivityStats(id!),
                getUserWatchHistory(id!)
            ]);
            setStats(activityData);
            setWatchHistory(watchData);
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatWatchTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) {
            return `${hours}시간 ${minutes}분`;
        }
        return `${minutes}분`;
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;
    if (!stats) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">User not found</div>;

    const { recentActivity, enrolledCourses, purchaseHistory } = stats;

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">뒤로가기</span>
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                    {/* User Info Card */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 col-span-1 md:col-span-1">
                        <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-500 mx-auto mb-6">
                            <User className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-center text-white mb-1">User Details</h2>
                        <p className="text-zinc-500 text-center text-sm mb-6">{id}</p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                                <span className="text-zinc-500 font-bold text-xs uppercase">Enrolled Courses</span>
                                <span className="text-white font-bold">{enrolledCourses.length}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                                <span className="text-zinc-500 font-bold text-xs uppercase">Total Spend</span>
                                <span className="text-emerald-400 font-bold">₩{purchaseHistory.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0).toLocaleString()}</span>
                            </div>
                            {watchHistory && (
                                <>
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                                        <span className="text-zinc-500 font-bold text-xs uppercase">Lessons Watched</span>
                                        <span className="text-cyan-400 font-bold">{watchHistory.totalLessonsWatched}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                                        <span className="text-zinc-500 font-bold text-xs uppercase">Total Watch Time</span>
                                        <span className="text-cyan-400 font-bold">{watchHistory.totalWatchTimeMinutes}분</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Charts / Activity Overview (Mock for now as log data needs aggregation) */}
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 col-span-1 md:col-span-2">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-violet-500" />
                            Activity Overview
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={recentActivity.slice(0, 7).reverse()}>
                                    <defs>
                                        <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="created_at" tickFormatter={(str) => new Date(str).toLocaleDateString()} stroke="#52525b" fontSize={10} />
                                    <YAxis stroke="#52525b" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="id" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorActivity)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                            activeTab === 'activity'
                                ? 'bg-violet-600 text-white'
                                : 'bg-zinc-900/40 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        <Activity className="w-4 h-4 inline mr-2" />
                        Activity & Purchases
                    </button>
                    <button
                        onClick={() => setActiveTab('watch')}
                        className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                            activeTab === 'watch'
                                ? 'bg-cyan-600 text-white'
                                : 'bg-zinc-900/40 text-zinc-400 hover:text-white border border-zinc-800'
                        }`}
                    >
                        <Eye className="w-4 h-4 inline mr-2" />
                        시청 기록 (환불 확인용)
                    </button>
                </div>

                {activeTab === 'activity' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Purchase History */}
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                                Purchase History
                            </h3>
                            <div className="space-y-4">
                                {purchaseHistory.length === 0 ? <p className="text-zinc-500 text-sm">No purchases yet.</p> :
                                    purchaseHistory.map((p: any) => (
                                        <div key={p.id} className="flex justify-between items-center bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                                            <div>
                                                <p className="text-white font-bold text-sm">{p.description || 'Purchase'}</p>
                                                <p className="text-zinc-500 text-xs">{new Date(p.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <span className="text-emerald-400 font-bold">₩{p.amount.toLocaleString()}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>

                        {/* Recent Activity Logs */}
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-indigo-500" />
                                Recent Activity Logs
                            </h3>
                            <div className="space-y-4">
                                {recentActivity.length === 0 ? <p className="text-zinc-500 text-sm">No activity recorded.</p> :
                                    recentActivity.map((log: any) => (
                                        <div key={log.id} className="flex items-center gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <div>
                                                <p className="text-white font-bold text-sm uppercase">{log.activity_type}</p>
                                                <p className="text-zinc-500 text-xs">{new Date(log.created_at).toLocaleString()}</p>
                                            </div>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Watch History Tab - For Refund Verification */
                    <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Play className="w-5 h-5 text-cyan-500" />
                                시청 기록 상세
                            </h3>
                            {watchHistory && (
                                <div className="flex items-center gap-4 text-sm">
                                    <span className="text-zinc-400">
                                        총 <span className="text-cyan-400 font-bold">{watchHistory.totalLessonsWatched}</span>개 레슨 시청
                                    </span>
                                    <span className="text-zinc-400">
                                        총 <span className="text-cyan-400 font-bold">{watchHistory.totalWatchTimeMinutes}</span>분
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Refund Policy Notice */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-amber-400 font-bold text-sm mb-1">환불 정책 확인</p>
                                    <ul className="text-zinc-400 text-xs space-y-1">
                                        <li>• 시청률 0%: 전액 환불 가능</li>
                                        <li>• 시청률 1-30%: 부분 환불 검토</li>
                                        <li>• 시청률 30% 이상: 환불 불가</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {!watchHistory || watchHistory.watchHistory.length === 0 ? (
                            <div className="text-center py-16">
                                <Eye className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                <p className="text-zinc-500 text-sm">시청 기록이 없습니다.</p>
                                <p className="text-zinc-600 text-xs mt-1">이 사용자는 아직 아무 영상도 시청하지 않았습니다.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {watchHistory.watchHistory.map((item, index) => (
                                    <div
                                        key={`${item.lessonId}-${index}`}
                                        className="flex gap-4 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-32 aspect-video flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden">
                                            {item.thumbnailUrl ? (
                                                <img src={item.thumbnailUrl} alt={item.lessonTitle} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                    <Play className="w-6 h-6" />
                                                </div>
                                            )}
                                            {/* Progress Bar */}
                                            <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-700">
                                                <div
                                                    className={`h-full ${item.progress >= 30 ? 'bg-red-500' : item.progress > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <h4 className="text-white font-bold text-sm line-clamp-1">
                                                        {item.lessonNumber}. {item.lessonTitle}
                                                    </h4>
                                                    <p className="text-zinc-500 text-xs mt-0.5">
                                                        {item.courseTitle} • {item.creatorName}
                                                    </p>
                                                </div>
                                                {/* Progress Badge */}
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                                                    item.progress >= 30
                                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                                        : item.progress > 0
                                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                                }`}>
                                                    {item.progress}% 시청
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                                                <span>시청 시간: {formatWatchTime(item.watchedSeconds)}</span>
                                                <span>영상 길이: {item.durationMinutes}분</span>
                                                <span>마지막 시청: {new Date(item.lastWatched).toLocaleString('ko-KR')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
