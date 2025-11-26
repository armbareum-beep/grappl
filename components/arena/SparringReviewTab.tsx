import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../Button';
import { Plus, User, Lock, Clock, Target, TrendingUp } from 'lucide-react';
import { AICoachWidget } from '../journal/AICoachWidget';
import { TrainingLog } from '../../types';

interface SparringReview {
    id: string;
    userId: string;
    date: string;
    opponentName: string;
    opponentBelt: string;
    rounds: number;
    result: 'win' | 'loss' | 'draw';
    notes: string;
    techniques: string[];
    whatWorked: string;
    whatToImprove: string;
    videoUrl?: string;
    createdAt: string;
}

interface SparringReviewTabProps {
    autoRunAI?: boolean;
}

export const SparringReviewTab: React.FC<SparringReviewTabProps> = ({ autoRunAI = false }) => {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<SparringReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        opponentName: '',
        opponentBelt: 'white',
        rounds: 1,
        result: 'draw' as 'win' | 'loss' | 'draw',
        notes: '',
        techniques: [] as string[],
        whatWorked: '',
        whatToImprove: '',
        videoUrl: ''
    });

    // Mock data for demonstration
    useEffect(() => {
        if (user) {
            // In production, fetch from API
            setReviews([]);
        }
    }, [user]);

    // Convert SparringReview[] to TrainingLog[] for AI analysis
    const trainingLogsForAI: TrainingLog[] = reviews.map(review => ({
        id: review.id,
        userId: review.userId,
        date: review.date,
        durationMinutes: review.rounds * 5,
        type: 'gi', // Default assumption
        notes: `${review.notes} ${review.whatWorked} ${review.whatToImprove}`, // Combine notes for better analysis
        techniques: review.techniques,
        sparringRounds: review.rounds,
        createdAt: review.createdAt
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            // 1. Create sparring review
            const newReview: SparringReview = {
                id: Math.random().toString(36).substr(2, 9),
                userId: user.id,
                ...formData,
                createdAt: new Date().toISOString()
            };

            setReviews([newReview, ...reviews]);

            // 2. Automatically create training log
            const { createTrainingLog, addXP } = await import('../../lib/api');

            const logContent = `스파링 복기\n\n상대: ${formData.opponentName} (${formData.opponentBelt} 벨트)\n라운드: ${formData.rounds}\n결과: ${formData.result === 'win' ? '승리' : formData.result === 'loss' ? '패배' : '무승부'}\n\n잘된 점:\n${formData.whatWorked}\n\n개선할 점:\n${formData.whatToImprove}\n\n메모:\n${formData.notes}`;

            await createTrainingLog({
                userId: user.id,
                date: formData.date,
                notes: logContent,
                durationMinutes: formData.rounds * 5,
                sparringRounds: formData.rounds,
                techniques: formData.techniques,
                isPublic: false
            });

            // 3. Award XP
            await addXP(user.id, 30, 'sparring_review', newReview.id);

            // Reset form
            setIsCreating(false);
            setFormData({
                date: new Date().toISOString().split('T')[0],
                opponentName: '',
                opponentBelt: 'white',
                rounds: 1,
                result: 'draw',
                notes: '',
                techniques: [],
                whatWorked: '',
                whatToImprove: '',
                videoUrl: ''
            });

            // Ask if user wants to share to feed
            const shareToFeed = confirm('스파링 복기가 저장되었습니다! (+30 XP)\n\n피드에 공유하시겠습니까?');

            if (shareToFeed) {
                const { createFeedPost } = await import('../../lib/api');
                const feedContent = `🥋 스파링 복기\n\n상대: ${formData.opponentName} (${formData.opponentBelt} 벨트)\n결과: ${formData.result === 'win' ? '승리 🏆' : formData.result === 'loss' ? '패배' : '무승부'}\n라운드: ${formData.rounds}\n\n${formData.whatWorked ? `✅ 잘된 점: ${formData.whatWorked}` : ''}`;

                await createFeedPost({
                    userId: user.id,
                    content: feedContent,
                    type: 'sparring',
                    metadata: {
                        opponentName: formData.opponentName,
                        opponentBelt: formData.opponentBelt,
                        result: formData.result,
                        rounds: formData.rounds
                    }
                });

                alert('피드에 공유되었습니다!');
            }
        } catch (error) {
            console.error('Error saving sparring review:', error);
            alert('저장 중 오류가 발생했습니다.');
        }
    };

    if (!user) {
        return (
            <div className="text-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-800 max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <Lock className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h3>
                <p className="text-slate-400 mb-6">스파링 복기를 작성하고 실력을 향상시키세요.</p>
                <Link to="/login">
                    <Button>로그인하기</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">스파링 복기</h2>
                    <p className="text-sm text-slate-400">스파링을 분석하고 성장하세요</p>
                </div>
                <Button onClick={() => setIsCreating(true)} size="sm" className="rounded-full px-4">
                    <Plus className="w-4 h-4 mr-1.5" />
                    복기 작성
                </Button>
            </div>

            {/* AI Coach Widget */}
            <AICoachWidget logs={trainingLogsForAI} autoRun={autoRunAI} />

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                        {reviews.filter(r => r.result === 'win').length}
                    </div>
                    <div className="text-xs text-slate-400">승리</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-red-400 mb-1">
                        {reviews.filter(r => r.result === 'loss').length}
                    </div>
                    <div className="text-xs text-slate-400">패배</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                        {reviews.filter(r => r.result === 'draw').length}
                    </div>
                    <div className="text-xs text-slate-400">무승부</div>
                </div>
            </div>

            {/* Reviews List */}
            {reviews.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-slate-800 rounded-2xl">
                    <p className="text-slate-400 mb-4">아직 작성된 스파링 복기가 없습니다.</p>
                    <Button onClick={() => setIsCreating(true)} variant="outline">
                        첫 복기 작성하기
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {reviews.map((review) => (
                        <div key={review.id} className="bg-slate-900 rounded-xl border border-slate-800 shadow-lg hover:shadow-2xl hover:shadow-blue-500/10 transition-all p-5">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${review.result === 'win' ? 'bg-green-500' :
                                        review.result === 'loss' ? 'bg-red-500' : 'bg-blue-500'
                                        }`}>
                                        {review.result === 'win' ? 'W' : review.result === 'loss' ? 'L' : 'D'}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">vs {review.opponentName}</div>
                                        <div className="text-xs text-slate-400">{review.date} • {review.opponentBelt} Belt • {review.rounds} 라운드</div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {review.notes && (
                                <div className="mb-4">
                                    <p className="text-slate-300 text-sm leading-relaxed">{review.notes}</p>
                                </div>
                            )}

                            {/* What Worked / To Improve */}
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                {review.whatWorked && (
                                    <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp className="w-4 h-4 text-green-400" />
                                            <span className="text-xs font-semibold text-green-400">효과적이었던 것</span>
                                        </div>
                                        <p className="text-sm text-slate-300">{review.whatWorked}</p>
                                    </div>
                                )}
                                {review.whatToImprove && (
                                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Target className="w-4 h-4 text-blue-400" />
                                            <span className="text-xs font-semibold text-blue-400">개선할 점</span>
                                        </div>
                                        <p className="text-sm text-slate-300">{review.whatToImprove}</p>
                                    </div>
                                )}
                            </div>

                            {/* Techniques */}
                            {review.techniques.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {review.techniques.map((tech, idx) => (
                                        <span key={idx} className="px-2.5 py-1 bg-slate-800 text-slate-300 text-xs font-medium rounded-md border border-slate-700">
                                            #{tech}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-800">
                        <div className="p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-bold text-white">스파링 복기 작성</h2>
                                <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-300">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">날짜</label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">상대 이름</label>
                                        <input
                                            type="text"
                                            value={formData.opponentName}
                                            onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="상대 이름"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">상대 벨트</label>
                                        <select
                                            value={formData.opponentBelt}
                                            onChange={(e) => setFormData({ ...formData, opponentBelt: e.target.value })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="white">White</option>
                                            <option value="blue">Blue</option>
                                            <option value="purple">Purple</option>
                                            <option value="brown">Brown</option>
                                            <option value="black">Black</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">라운드</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.rounds}
                                            onChange={(e) => setFormData({ ...formData, rounds: parseInt(e.target.value) })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-1">결과</label>
                                        <select
                                            value={formData.result}
                                            onChange={(e) => setFormData({ ...formData, result: e.target.value as any })}
                                            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="win">승리</option>
                                            <option value="loss">패배</option>
                                            <option value="draw">무승부</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">전체 노트</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="스파링에 대한 전반적인 메모..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">효과적이었던 것</label>
                                    <textarea
                                        value={formData.whatWorked}
                                        onChange={(e) => setFormData({ ...formData, whatWorked: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="잘 작동한 기술이나 전략..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">개선할 점</label>
                                    <textarea
                                        value={formData.whatToImprove}
                                        onChange={(e) => setFormData({ ...formData, whatToImprove: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="다음에 개선할 부분..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">영상 URL (선택)</label>
                                    <input
                                        type="url"
                                        value={formData.videoUrl}
                                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="https://..."
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <Button type="submit" className="flex-1">
                                        저장하기
                                    </Button>
                                    <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                                        취소
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
