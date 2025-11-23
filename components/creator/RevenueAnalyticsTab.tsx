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
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">수익 분석</h2>
                    <p className="text-slate-500 mt-1">기간별 수익 현황과 정산 내역을 확인하세요.</p>
                </div>
                <div className="flex space-x-2">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as any)}
                        className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="6m">최근 6개월</option>
                        <option value="1y">최근 1년</option>
                        <option value="all">전체 기간</option>
                    </select>
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        엑셀 다운로드
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">총 예상 수익</h3>
                        <div className="p-2 bg-blue-50 rounded-full text-blue-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
                    <div className="mt-2 flex items-center text-sm text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span>지난달 대비 +12%</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">이번 달 정산 예정</h3>
                        <div className="p-2 bg-purple-50 rounded-full text-purple-600">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyStats[0]?.amount || 0)}</p>
                    <p className="text-sm text-slate-500 mt-2">정산일: 매월 15일</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-500">미지급 정산금</h3>
                        <div className="p-2 bg-orange-50 rounded-full text-orange-600">
                            <DollarSign className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(monthlyStats[0]?.amount || 0)}</p>
                    <p className="text-sm text-slate-500 mt-2">다음 정산일에 지급됩니다.</p>
                </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">월별 수익 내역</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">기간</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">수익금액</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">지급일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {monthlyStats.map((stat, index) => (
                                <tr key={index} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                                        {stat.period}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                                        {formatCurrency(stat.amount)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${stat.status === 'paid'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {stat.status === 'paid' ? '지급 완료' : '정산 예정'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
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
