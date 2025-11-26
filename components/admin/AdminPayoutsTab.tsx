import React, { useEffect, useState } from 'react';
import { DollarSign, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';

interface PayoutItem {
    id: string;
    creatorId: string;
    creatorName: string;
    period: string;
    grossAmount: number;
    taxAmount: number;
    netAmount: number;
    status: 'scheduled' | 'processing' | 'completed' | 'failed';
    scheduledDate: string;
    completedDate?: string;
}

export const AdminPayoutsTab: React.FC = () => {
    const [payouts, setPayouts] = useState<PayoutItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState('2023-10');

    useEffect(() => {
        loadPayouts();
    }, [selectedPeriod]);

    const loadPayouts = async () => {
        setLoading(true);
        // Mock data - replace with actual API call
        const mockPayouts: PayoutItem[] = [
            {
                id: '1',
                creatorId: 'creator1',
                creatorName: '김철수',
                period: '2023-10',
                grossAmount: 1250000,
                taxAmount: 41250, // 3.3%
                netAmount: 1208750,
                status: 'scheduled',
                scheduledDate: '2023-11-15'
            },
            {
                id: '2',
                creatorId: 'creator2',
                creatorName: '이영희',
                period: '2023-10',
                grossAmount: 980000,
                taxAmount: 32340,
                netAmount: 947660,
                status: 'scheduled',
                scheduledDate: '2023-11-15'
            },
            {
                id: '3',
                creatorId: 'creator3',
                creatorName: '박민수',
                period: '2023-09',
                grossAmount: 1500000,
                taxAmount: 49500,
                netAmount: 1450500,
                status: 'completed',
                scheduledDate: '2023-10-15',
                completedDate: '2023-10-15'
            }
        ];

        setTimeout(() => {
            setPayouts(mockPayouts);
            setLoading(false);
        }, 500);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    const totalGross = payouts.reduce((sum, p) => sum + p.grossAmount, 0);
    const totalTax = payouts.reduce((sum, p) => sum + p.taxAmount, 0);
    const totalNet = payouts.reduce((sum, p) => sum + p.netAmount, 0);
    const scheduledCount = payouts.filter(p => p.status === 'scheduled').length;
    const completedCount = payouts.filter(p => p.status === 'completed').length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-500/10 text-green-400 border border-green-500/20">지급완료</span>;
            case 'processing':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">처리중</span>;
            case 'scheduled':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">예정</span>;
            case 'failed':
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20">실패</span>;
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">자동 정산 모니터링</h2>
                    <p className="text-slate-400 mt-1">매월 15일 자동으로 정산이 처리됩니다.</p>
                </div>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="border border-slate-700 bg-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">전체 기간</option>
                    <option value="2023-10">2023년 10월</option>
                    <option value="2023-09">2023년 9월</option>
                    <option value="2023-08">2023년 8월</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 정산 건수</p>
                        <DollarSign className="w-5 h-5 text-slate-500" />
                    </div>
                    <p className="text-2xl font-bold text-white">{payouts.length}건</p>
                    <p className="text-xs text-slate-500 mt-1">
                        예정 {scheduledCount}건 · 완료 {completedCount}건
                    </p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 수익 (세전)</p>
                        <DollarSign className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalGross)}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 세금 (3.3%)</p>
                        <DollarSign className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalTax)}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 지급액 (세후)</p>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(totalNet)}</p>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    강사명
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    기간
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    수익 (세전)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    세금 (3.3%)
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    지급액 (세후)
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    예정일/완료일
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        로딩 중...
                                    </td>
                                </tr>
                            ) : payouts.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <DollarSign className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                                        <p>해당 기간의 정산 내역이 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                payouts.map((payout) => (
                                    <tr key={payout.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-white">{payout.creatorName}</div>
                                            <div className="text-sm text-slate-400">{payout.creatorId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                            {payout.period}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {formatCurrency(payout.grossAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-orange-400">
                                            -{formatCurrency(payout.taxAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-green-400">
                                            {formatCurrency(payout.netAmount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {getStatusBadge(payout.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-slate-400">
                                            {payout.status === 'completed' ? (
                                                <div className="flex items-center justify-center gap-1">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    {payout.completedDate}
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-1">
                                                    <Clock className="w-4 h-4 text-yellow-400" />
                                                    {payout.scheduledDate}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Info Notice */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                    <p className="font-medium text-blue-100">자동 정산 시스템 안내</p>
                    <ul className="mt-2 list-disc list-inside space-y-1 text-blue-300">
                        <li>매월 15일 자정에 자동으로 Stripe Transfer가 실행됩니다.</li>
                        <li>세금 3.3%는 자동으로 공제되며, 플랫폼이 원천징수 의무를 집니다.</li>
                        <li>정산 실패 시 자동으로 재시도하며, 관리자에게 알림이 전송됩니다.</li>
                        <li>이 화면은 모니터링 전용이며, 수동 개입 없이 자동으로 처리됩니다.</li>
                    </ul>
                </div>
            </div>

            {/* Next Payout Schedule */}
            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                    <Calendar className="w-6 h-6 text-purple-400" />
                    <h3 className="text-lg font-bold text-white">다음 정산 일정</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="text-sm text-slate-400">정산 대상 기간</p>
                        <p className="text-lg font-bold text-white">2023년 10월</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">자동 실행 일시</p>
                        <p className="text-lg font-bold text-white">2023년 11월 15일 00:00</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">예상 지급 건수</p>
                        <p className="text-lg font-bold text-white">{scheduledCount}건</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
