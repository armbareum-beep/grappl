import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getSparringVideos } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { SparringVideo } from '../../types';
import { TrendingUp, Eye, DollarSign, Clock } from 'lucide-react';

interface SparringPerformance extends SparringVideo {
    directRevenue: number;
    totalRevenue: number;
    watchTimeMinutes: number;
    salesCount: number;
}

export const SparringPerformanceTab: React.FC = () => {
    const { user } = useAuth();
    const [videos, setVideos] = useState<SparringPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'revenue' | 'views' | 'watchTime'>('revenue');

    useEffect(() => {
        if (user) {
            loadSparring();
        }
    }, [user]);

    const loadSparring = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const { data: sparringData } = await getSparringVideos(100, user.id);

            if (!sparringData) {
                setVideos([]);
                return;
            }

            // Get real performance data for each video
            const performanceData: SparringPerformance[] = await Promise.all(
                sparringData.map(async (video) => {
                    // Get sales count directly from payments
                    const { data: purchases } = await supabase
                        .from('payments')
                        .select('amount')
                        .eq('mode', 'sparring')
                        .eq('target_id', video.id)
                        .eq('status', 'completed');

                    const directRevenue = purchases?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
                    const salesCount = purchases?.length || 0;

                    // Get watch time for this video
                    const { data: watchLogs } = await supabase
                        .from('video_watch_logs')
                        .select('watch_seconds')
                        .eq('video_id', video.id);

                    const totalSeconds = watchLogs?.reduce((sum, log) => sum + (log.watch_seconds || 0), 0) || 0;
                    const watchTimeMinutes = Math.floor(totalSeconds / 60);

                    return {
                        ...video,
                        directRevenue,
                        totalRevenue: directRevenue,
                        watchTimeMinutes,
                        salesCount
                    };
                })
            );

            setVideos(performanceData);
        } catch (error) {
            console.error('Error loading sparring performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedVideos = [...videos].sort((a, b) => {
        switch (sortBy) {
            case 'revenue':
                return b.totalRevenue - a.totalRevenue;
            case 'views':
                return b.views - a.views;
            case 'watchTime':
                return b.watchTimeMinutes - a.watchTimeMinutes;
            default:
                return 0;
        }
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}시간 ${mins}분`;
    };

    const totalRevenue = videos.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalViews = videos.reduce((sum, c) => sum + c.views, 0);
    const totalWatchTime = videos.reduce((sum, c) => sum + c.watchTimeMinutes, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">스파링별 성과 분석</h2>
                    <p className="text-zinc-400 mt-1">각 스파링 영상의 수익, 조회수, 시청 시간을 확인하세요.</p>
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                    <option value="revenue">수익순</option>
                    <option value="views">조회수순</option>
                    <option value="watchTime">시청시간순</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">총 수익</p>
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">총 조회수</p>
                        <Eye className="w-5 h-5 text-violet-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">총 시청 시간</p>
                        <Clock className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatTime(totalWatchTime)}</p>
                </div>
            </div>

            {/* Videos Table */}
            <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    영상 제목
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    조회수
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    구매 건수
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    시청 시간
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    직접 판매 액
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin" />
                                            로딩 중...
                                        </div>
                                    </td>
                                </tr>
                            ) : sortedVideos.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-2 text-zinc-700" />
                                        <p>아직 스파링 영상이 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedVideos.map((video) => (
                                    <tr key={video.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{video.title}</div>
                                            <div className="text-sm text-zinc-500">{video.category} · {video.uniformType}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {video.views.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {video.salesCount.toLocaleString()}건
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {formatTime(video.watchTimeMinutes)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-emerald-400">
                                            {formatCurrency(video.directRevenue)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
