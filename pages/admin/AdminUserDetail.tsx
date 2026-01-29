import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserActivityStats } from '../../lib/api-admin';
import { ArrowLeft, User, Clock, ShoppingCart, BookOpen, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminUserDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchStats();
    }, [id]);

    const fetchStats = async () => {
        try {
            const data = await getUserActivityStats(id!);
            setStats(data);
        } catch (error) {
            console.error('Error fetching user stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;
    if (!stats) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">User not found</div>;

    const { recentActivity, enrolledCourses, purchaseHistory } = stats;

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <button onClick={() => navigate('/admin/users')} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">사용자 목록으로 돌아가기</span>
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
            </div>
        </div>
    );
};
