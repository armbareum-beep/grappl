import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { MessageCircle, DollarSign, TrendingUp, User } from 'lucide-react';

interface FeedbackPerformance {
    id: string;
    student_name: string;
    price: number;
    status: string;
    created_at: string;
    completed_at: string | null;
}

export const FeedbackPerformanceTab: React.FC = () => {
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState<FeedbackPerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'date' | 'price'>('date');

    useEffect(() => {
        if (user) {
            loadFeedbacks();
        }
    }, [user]);

    const loadFeedbacks = async () => {
        if (!user) return;
        setLoading(true);

        try {
            // Get all feedback requests for this instructor
            const { data: feedbackData, error } = await supabase
                .from('feedback_requests')
                .select(`
                    id,
                    price,
                    status,
                    created_at,
                    completed_at,
                    student:student_id(name)
                `)
                .eq('instructor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedData: FeedbackPerformance[] = feedbackData?.map((fb: any) => ({
                id: fb.id,
                student_name: fb.student?.name || '알 수 없음',
                price: fb.price || 0,
                status: fb.status,
                created_at: fb.created_at,
                completed_at: fb.completed_at
            })) || [];

            setFeedbacks(formattedData);
        } catch (error) {
            console.error('Error loading feedback performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedFeedbacks = [...feedbacks].sort((a, b) => {
        switch (sortBy) {
            case 'price':
                return b.price - a.price;
            case 'date':
            default:
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ko-KR');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">완료</span>;
            case 'pending':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">대기중</span>;
            case 'in_progress':
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">진행중</span>;
            default:
                return <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">{status}</span>;
        }
    };

    const totalRevenue = feedbacks.filter(f => f.status === 'completed').reduce((sum, f) => sum + f.price, 0);
    const completedCount = feedbacks.filter(f => f.status === 'completed').length;
    const pendingCount = feedbacks.filter(f => f.status === 'pending').length;
    const avgPrice = completedCount > 0 ? totalRevenue / completedCount : 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">피드백 성과 분석</h2>
                    <p className="text-zinc-400 mt-1">1:1 피드백 판매 내역을 확인하세요.</p>
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                    <option value="date">최신순</option>
                    <option value="price">가격순</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">총 수익</p>
                        <DollarSign className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">완료 건수</p>
                        <MessageCircle className="w-5 h-5 text-violet-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{completedCount}건</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">대기중</p>
                        <TrendingUp className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{pendingCount}건</p>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-zinc-400">평균 가격</p>
                        <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(avgPrice)}</p>
                </div>
            </div>

            {/* Feedbacks Table */}
            <div className="bg-zinc-900/40 rounded-lg border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-zinc-900/80 border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    학생
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    요청일
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    완료일
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wider">
                                    수익
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
                            ) : sortedFeedbacks.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                                        <MessageCircle className="w-12 h-12 mx-auto mb-2 text-zinc-700" />
                                        <p>아직 피드백 요청이 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedFeedbacks.map((feedback) => (
                                    <tr key={feedback.id} className="hover:bg-zinc-800/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-white">{feedback.student_name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            {getStatusBadge(feedback.status)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-zinc-400">
                                            {formatDate(feedback.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-zinc-400">
                                            {feedback.completed_at ? formatDate(feedback.completed_at) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-violet-400">
                                            {formatCurrency(feedback.price)}
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
