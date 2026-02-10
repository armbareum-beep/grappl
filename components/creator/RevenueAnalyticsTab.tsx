import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { calculateCreatorEarnings, getCreatorRevenueStats, getCreatorBalance, submitPayout, getPayoutRequests } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { DollarSign, TrendingUp, Download, Wallet, ArrowRight, MessageCircle } from 'lucide-react';
import { Button } from '../Button';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

interface MonthlyStat {
    period: string;
    amount: number;
    status: string;
}

interface PayoutRequest {
    id: string;
    amount: number;
    status: 'pending' | 'completed' | 'rejected';
    requested_at: string;
    processed_at?: string;
    bank_name: string;
    account_number: string;
    account_holder: string;
}

export const RevenueAnalyticsTab: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [loading, setLoading] = useState(true);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [availableBalance, setAvailableBalance] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
    const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
    const [period, setPeriod] = useState<'all' | '6m' | '1y'>('6m');

    // Feedback stats
    const [feedbackRevenue, setFeedbackRevenue] = useState(0);
    const [feedbackCount, setFeedbackCount] = useState(0);
    const [directRevenue, setDirectRevenue] = useState(0);
    const [subscriptionRevenue, setSubscriptionRevenue] = useState(0);
    const [showPayoutConfirm, setShowPayoutConfirm] = useState(false);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user?.id, period]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // 1. Get Total Revenue and breakdown
            const { data: earnings } = await calculateCreatorEarnings(user.id);
            if (earnings) {
                setTotalRevenue(earnings.totalRevenue);
                setFeedbackRevenue(earnings.feedbackRevenue || 0);
                setDirectRevenue(earnings.directRevenue || 0);
                setSubscriptionRevenue(earnings.subscriptionRevenue || 0);
            }

            // 2. Get feedback count
            const { data: feedbackData } = await supabase
                .from('feedback_requests')
                .select('id')
                .eq('instructor_id', user.id)
                .eq('status', 'completed');

            setFeedbackCount(feedbackData?.length || 0);

            // 3. Get Available Balance
            const balance = await getCreatorBalance(user.id);
            setAvailableBalance(balance);

            // 4. Get Monthly Breakdown
            const { data: stats } = await getCreatorRevenueStats(user.id);
            if (stats) {
                setMonthlyStats(stats);
            }

            // 5. Get Payout Requests
            const { data: payoutData } = await getPayoutRequests(user.id);
            if (payoutData) {
                setPayouts(payoutData);
            }

        } catch (error) {
            console.error('Error loading revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePayoutRequest = () => {
        if (availableBalance < 10000) {
            toastError('최소 정산 신청 금액은 10,000원입니다.');
            return;
        }
        setShowPayoutConfirm(true);
    };

    const confirmPayoutRequest = async () => {
        setShowPayoutConfirm(false);
        setSubmitting(true);
        try {
            const { error } = await submitPayout(availableBalance);
            if (error) throw error;
            success('정산 신청이 완료되었습니다. 검토 후 처리됩니다.');
            loadData(); // Refresh balance
        } catch (err: any) {
            console.error('Payout request failed:', err);
            toastError(err.message || '정산 신청 중 오류가 발생했습니다.');
        } finally {
            setSubmitting(false);
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
                        <span>전체 기간 합계</span>
                    </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-zinc-400">출금 가능 잔액</h3>
                        <div className="p-2 bg-emerald-500/10 rounded-full text-emerald-400">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(availableBalance)}</p>
                    <div className="mt-4">
                        <Button
                            onClick={handlePayoutRequest}
                            disabled={submitting || availableBalance < 10000}
                            size="sm"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white border-none py-2"
                        >
                            {submitting ? '신청 중...' : '정산 신청하기'}
                            <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>
                </div>

                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-sm hover:border-zinc-700 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-zinc-400">이번 달 예상 수익</h3>
                        <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <p className="text-2xl font-bold text-white">
                        {formatCurrency(monthlyStats.find(s => s.period === new Date().toISOString().slice(0, 7))?.amount || 0)}
                    </p>
                    <p className="text-xs text-zinc-500 mt-2">이달의 정산 예정액</p>
                </div>
            </div>

            {/* Performance Breakdown - 성과 분석 */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                    <h3 className="text-lg font-bold text-white">성과 분석</h3>
                    <p className="text-sm text-zinc-400 mt-1">수익원별 상세 분석</p>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Direct Sales */}
                    <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">직접 판매</h4>
                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                <DollarSign className="w-4 h-4 text-blue-400" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-white mb-1">{formatCurrency(directRevenue)}</p>
                        <p className="text-xs text-zinc-500">코스, 드릴, 루틴 판매</p>
                    </div>

                    {/* Feedback Sales */}
                    <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">피드백 판매</h4>
                            <div className="p-2 bg-violet-500/10 rounded-lg">
                                <MessageCircle className="w-4 h-4 text-violet-400" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-white mb-1">{formatCurrency(feedbackRevenue)}</p>
                        <div className="flex items-center justify-between text-xs mt-2">
                            <span className="text-zinc-500">{feedbackCount}건 완료</span>
                            {feedbackCount > 0 && (
                                <span className="text-violet-400 font-medium">
                                    평균 {formatCurrency(Math.floor(feedbackRevenue / feedbackCount))}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Subscription Revenue */}
                    <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">구독 수익</h4>
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                            </div>
                        </div>
                        <p className="text-xl font-bold text-white mb-1">{formatCurrency(subscriptionRevenue)}</p>
                        <p className="text-xs text-zinc-500">시청 시간 기반 분배</p>
                    </div>

                    {/* Total Revenue */}
                    <div className="bg-gradient-to-br from-violet-500/10 to-blue-500/10 p-5 rounded-xl border border-violet-500/20 hover:border-violet-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-medium text-violet-400 uppercase tracking-wider">총 수익</h4>
                            <div className="p-2 bg-violet-500/20 rounded-lg">
                                <Wallet className="w-4 h-4 text-violet-400" />
                            </div>
                        </div>
                        <p className="text-2xl font-bold text-white mb-1">{formatCurrency(totalRevenue)}</p>
                        <p className="text-xs text-violet-400 font-medium">전체 기간 합계</p>
                    </div>
                </div>
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 shadow-sm overflow-hidden mb-8">
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
                            {monthlyStats.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">수익 내역이 없습니다.</td>
                                </tr>
                            ) : (
                                monthlyStats.map((stat, index) => (
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Payout Request History Table */}
            <div className="bg-zinc-900/40 rounded-xl border border-zinc-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">정산(출금) 신청 내역</h3>
                    <Button variant="ghost" size="sm" onClick={loadData}>새로고침</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-zinc-900/80">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">신청일</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">요청 금액</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">계좌 정보</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">상태</th>
                                <th className="px-6 py-3 text-xs font-medium text-zinc-400 uppercase tracking-wider">처리일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800">
                            {payouts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">정산 신청 내역이 없습니다.</td>
                                </tr>
                            ) : (
                                payouts.map((payout) => (
                                    <tr key={payout.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                                            {new Date(payout.requested_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                                            {formatCurrency(payout.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-400">
                                            {payout.bank_name} {payout.account_number} ({payout.account_holder})
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${payout.status === 'completed'
                                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                : payout.status === 'rejected'
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                }`}>
                                                {payout.status === 'completed' ? '입금 완료' : payout.status === 'rejected' ? '거절됨' : '처리 대기중'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                            {payout.processed_at ? new Date(payout.processed_at).toLocaleDateString() : '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ConfirmModal
                isOpen={showPayoutConfirm}
                onClose={() => setShowPayoutConfirm(false)}
                onConfirm={confirmPayoutRequest}
                title="정산 신청"
                message={`${formatCurrency(availableBalance)} 정산 신청을 하시겠습니까?`}
                confirmText="신청하기"
                cancelText="취소"
                variant="warning"
                isLoading={submitting}
            />
        </div>
    );
};
