import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCreatorEarnings, getCreatorRevenueStats } from '../../lib/api';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import { Button } from '../Button';

interface MonthlyStat {
    period: string;
    amount: number;
    status: string;
}

export const RevenueAnalyticsTab: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
    const [period, setPeriod] = useState<'all' | '6m' | '1y'>('6m');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user, period]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Get Total Revenue
            const { data: earnings } = await calculateCreatorEarnings(user.id);
            if (earnings) {
                setTotalRevenue(earnings.totalRevenue);
            }

            // 2. Get Monthly Breakdown
            const { data: stats } = await getCreatorRevenueStats(user.id);
            if (stats) {
                setMonthlyStats(stats);
            }
        } catch (error) {
            console.error('Error loading revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    if (loading) {
        return (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-zinc-400 text-sm">로딩 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">수익 분석</h2>
                    <p className="text-zinc-400 mt-1">기간별 수익 현황과 정산 내역을 확인하세요.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="6m">최근 6개월</option>
                        <option value="1y">최근 1년</option>
                        <option value="all">전체 기간</option>
                    </select>
                    <Button variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 whitespace-nowrap">
                        <Download className="w-4 h-4 mr-2" />
                        엑셀 다운로드
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-zinc-400">총 예상 수익</h3>
                        <div className="p-2 bg-violet-500/10 rounded-full text-violet-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                    <div className="mt-2 flex items-center text-sm text-emerald-400">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>지난달 대비 +12%</span>
                    </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-zinc-400">이번 달 정산 예정</h3>
                        <div className="p-2 bg-purple-500/10 rounded-full text-purple-400">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(monthlyStats[0]?.amount || 0)}</p>
                    <p className="text-sm text-zinc-500 mt-2">정산일: 매월 15일</p>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-zinc-400">미지급 정산금</h3>
                        <div className="p-2 bg-amber-500/10 rounded-full text-amber-400">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(monthlyStats[0]?.amount || 0)}</p>
                    <p className="text-sm text-zinc-500 mt-2">다음 정산일에 지급됩니다.</p>
                </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-white">월별 수익 내역</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-900/80">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">기간</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">수익금액</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">지급일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {monthlyStats.map((stat, index) => (
                                <tr key={index} className="hover:bg-zinc-800/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                                        {stat.period}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                        {formatCurrency(stat.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${stat.status === 'paid'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            {stat.status === 'paid' ? '지급 완료' : '정산 예정'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                        {stat.status === 'paid' ? `${stat.period}-15` : '익월 15일'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
