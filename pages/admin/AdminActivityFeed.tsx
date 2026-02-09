import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAdminRecentActivity } from '../../lib/api-admin';
import { ActivityItem } from '../../types';
import { ArrowLeft, Users, DollarSign, Shield, AlertTriangle, RefreshCw, Clock } from 'lucide-react';

export const AdminActivityFeed: React.FC = () => {
    const navigate = useNavigate();
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const data = await getAdminRecentActivity();
            setActivities(data);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchActivities, 30000);
        return () => clearInterval(interval);
    }, []);

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'user_signup': return <Users className="w-5 h-5 text-blue-400" />;
            case 'purchase': return <DollarSign className="w-5 h-5 text-emerald-400" />;
            case 'creator_application': return <Shield className="w-5 h-5 text-purple-400" />;
            case 'report': return <AlertTriangle className="w-5 h-5 text-rose-400" />;
            default: return <Clock className="w-5 h-5 text-zinc-400" />;
        }
    };

    const getActivityStyle = (type: string) => {
        switch (type) {
            case 'user_signup': return 'bg-blue-500/10 border-blue-500/20';
            case 'purchase': return 'bg-emerald-500/10 border-emerald-500/20';
            case 'creator_application': return 'bg-purple-500/10 border-purple-500/20';
            case 'report': return 'bg-rose-500/10 border-rose-500/20';
            default: return 'bg-zinc-800 border-zinc-700';
        }
    };

    const getActivityLabel = (type: string) => {
        switch (type) {
            case 'user_signup': return '회원가입';
            case 'purchase': return '결제';
            case 'creator_application': return '인스트럭터';
            case 'report': return '콘텐츠';
            default: return '활동';
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight">실시간 활동 피드</h1>
                            <p className="text-zinc-400">최근 플랫폼 활동 내역을 확인합니다.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchActivities}
                        disabled={loading}
                        className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className={`w-5 h-5 text-zinc-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                    {loading && activities.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-zinc-200 rounded-full mx-auto mb-4" />
                            <p className="text-zinc-500 text-sm">활동 내역을 불러오는 중...</p>
                        </div>
                    ) : activities.length === 0 ? (
                        <div className="p-20 text-center text-zinc-500">
                            최근 활동 내역이 없습니다.
                        </div>
                    ) : (
                        <div className="divide-y divide-zinc-800/50">
                            {activities.map((activity, i) => (
                                <div key={activity.id || i} className="p-6 hover:bg-zinc-900/50 transition-colors">
                                    <div className="flex gap-4">
                                        <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${getActivityStyle(activity.type)}`}>
                                            {getActivityIcon(activity.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border ${getActivityStyle(activity.type)}`}>
                                                    {getActivityLabel(activity.type)}
                                                </span>
                                                <h4 className="font-bold text-white">{activity.title}</h4>
                                            </div>
                                            <p className="text-sm text-zinc-400 mb-2">{activity.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(activity.timestamp).toLocaleString('ko-KR', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                {activity.amount && (
                                                    <span className="text-emerald-400 font-bold">
                                                        ₩{activity.amount.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
