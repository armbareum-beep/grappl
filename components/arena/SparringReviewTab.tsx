import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../Button';
import { Plus, User, Lock, Clock, Target, TrendingUp } from 'lucide-react';
import { AICoachWidget } from '../journal/AICoachWidget';
import { TrainingLog } from '../../types';
import { ShareToFeedModal } from '../social/ShareToFeedModal';
import { createFeedPost } from '../../lib/api';
import { QuestCompleteModal } from '../QuestCompleteModal';

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

// Mock 데이터 (AI 분석 테스트용)
const MOCK_REVIEWS: SparringReview[] = [
    {
        id: 'mock-1',
        userId: 'test-user',
        date: '2025-01-20',
        opponentName: '김철수',
        opponentBelt: 'blue',
        rounds: 3,
        result: 'loss',
        notes: '오늘 스파링에서 가드를 잘 유지하지 못했습니다. 상대방이 계속 패스를 시도했고 결국 뚫렸습니다.',
        techniques: ['가드', '패스'],
        whatWorked: '초반 그립 컨트롤은 괜찮았습니다.',
        whatToImprove: '가드 리텐션 능력을 키워야 합니다. 힙 이스케이프 연습이 필요합니다.',
        createdAt: '2025-01-20T10:00:00Z'
    },
    {
        id: 'mock-2',
        userId: 'test-user',
        date: '2025-01-18',
        opponentName: '이영희',
        opponentBelt: 'white',
        rounds: 2,
        result: 'draw',
        notes: '화이트벨트와의 스파링. 탑 포지션에서 압박은 잘했지만 서브미션까지 이어가지 못했습니다.',
        techniques: ['마운트', '사이드컨트롤'],
        whatWorked: '포지셔닝은 좋았습니다.',
        whatToImprove: '서브미션 셋업을 더 연습해야 합니다.',
        createdAt: '2025-01-18T10:00:00Z'
    },
    {
        id: 'mock-3',
        userId: 'test-user',
        date: '2025-01-15',
        opponentName: '박민수',
        opponentBelt: 'purple',
        rounds: 4,
        result: 'loss',
        notes: '퍼플벨트와의 스파링. 계속 탭을 당했습니다. 이스케이프가 부족합니다.',
        techniques: ['탭패', '이스케이프'],
        whatWorked: '방어 자세는 유지했습니다.',
        whatToImprove: '위기 상황에서의 탈출 기술이 필요합니다.',
        createdAt: '2025-01-15T10:00:00Z'
    }
];

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return url;

    // Already an embed URL
    if (url.includes('youtube.com/embed/')) {
        return url;
    }

    // Extract video ID from various YouTube URL formats
    let videoId = '';

    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
    }
    // Format: https://youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    }
    // Format: https://www.youtube.com/v/VIDEO_ID
    else if (url.includes('youtube.com/v/')) {
        videoId = url.split('youtube.com/v/')[1]?.split('?')[0];
    }

    // Return embed URL if we found a video ID
    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
    }

    // Return original URL if we couldn't parse it
    return url;
};

export const SparringReviewTab: React.FC<SparringReviewTabProps> = ({ autoRunAI = false }) => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const navigate = useNavigate();
    const [reviews, setReviews] = useState<SparringReview[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
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

    // Share to Feed Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareModalData, setShareModalData] = useState<{
        defaultContent: string;
        metadata: Record<string, any>;
    } | null>(null);

    // Quest Complete Modal State
    const [showQuestModal, setShowQuestModal] = useState(false);
    const [xpEarned, setXpEarned] = useState(0);
    const [userStreak, setUserStreak] = useState(0);
    const [bonusReward, setBonusReward] = useState<{ type: 'xp_boost' | 'badge' | 'unlock'; value: string } | undefined>(undefined);

    const handleStartCreating = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setIsCreating(true);
    };

    // Automatically show share modal when shareModalData is set - REMOVED
    // useEffect(() => {
    //     if (shareModalData && !showQuestModal && !loading) {
    //         setShowShareModal(true);
    //     }
    // }, [shareModalData, showQuestModal, loading]);

    // Load reviews
    useEffect(() => {
        if (user) {
            loadReviews();
        }
    }, [user]);

    const loadReviews = async () => {
        if (!user) return;
        setLoading(true);
        const { getSparringReviews } = await import('../../lib/api');
        const { data } = await getSparringReviews(user.id);
        if (data) {
            setReviews(data);
        }
        setLoading(false);
    };

    const REVIEWS_DISPLAY_LIMIT = 10;
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_DISPLAY_LIMIT);

    // Convert SparringReview[] to TrainingLog[] for AI analysis
    const trainingLogsForAI: TrainingLog[] = reviews.map(review => ({
        id: review.id,
        userId: review.userId,
        date: review.date,
        durationMinutes: review.rounds * 5,
        type: 'sparring' as const,
        notes: `${review.notes} ${review.whatWorked} ${review.whatToImprove}`, // Combine notes for better analysis
        techniques: review.techniques,
        sparringRounds: review.rounds,
        createdAt: review.createdAt,
        isPublic: false,
        location: 'Gym'
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { createSparringReview, createTrainingLog, updateQuestProgress } = await import('../../lib/api');

            // 1. Create sparring review
            const { data: newReview, error: reviewError } = await createSparringReview({
                userId: user.id,
                ...formData
            });

            if (reviewError || !newReview) throw reviewError;

            setReviews([newReview, ...reviews]);

            // 2. Automatically create training log (Skip daily check)
            const logContent = `스파링 복기\n\n상대: ${formData.opponentName} (${formData.opponentBelt} 벨트)\n라운드: ${formData.rounds}\n결과: ${formData.result === 'win' ? '승리' : formData.result === 'loss' ? '패배' : '무승부'}\n\n잘된 점:\n${formData.whatWorked}\n\n개선할 점:\n${formData.whatToImprove}\n\n메모:\n${formData.notes}`;

            await createTrainingLog({
                userId: user.id,
                date: formData.date,
                notes: logContent,
                durationMinutes: formData.rounds * 5,
                sparringRounds: formData.rounds,
                techniques: formData.techniques,
                isPublic: false,
                location: 'Gym'
            }, true); // Skip daily check

            // 3. Award training XP with daily limit and streak bonus
            console.log('Awarding training XP...');
            let earnedXp = 0;
            let streak = 0;
            let bonusXp = 0;

            try {
                const { awardTrainingXP } = await import('../../lib/api');
                const xpResult = await awardTrainingXP(user.id, 'sparring_review', 20);

                if (xpResult.data) {
                    if (xpResult.data.alreadyCompletedToday) {
                        // Already completed a training activity today
                        console.log('Already completed training activity today');
                        earnedXp = 0;
                        streak = xpResult.data.streak;
                    } else {
                        earnedXp = xpResult.data.xpEarned;
                        streak = xpResult.data.streak;
                        bonusXp = xpResult.data.bonusXP;
                    }
                }

                // Fallback: If streak is 0 (e.g. first day or error), fetch it directly
                if (streak === 0) {
                    const { getUserStreak } = await import('../../lib/api');
                    const { data: currentStreak } = await getUserStreak(user.id);
                    if (currentStreak) {
                        streak = currentStreak;
                    }
                }
            } catch (error) {
                console.error('Error awarding XP:', error);
            }

            // Also update daily quest progress
            try {
                const { updateQuestProgress } = await import('../../lib/api');
                const questResult = await updateQuestProgress(user.id, 'sparring_review');

                if (questResult.completed && questResult.xpEarned > 0) {
                    earnedXp += questResult.xpEarned;
                    // success(`일일 미션 완료! +${questResult.xpEarned} XP`); // Optional
                }
            } catch (error) {
                console.error('Error updating quest:', error);
            }

            // 4. Prepare Share Modal Data
            const defaultContent = `🥋 스파링 복기

상대: ${formData.opponentName} (${formData.opponentBelt} 벨트)
결과: ${formData.result === 'win' ? '승리 🏆' : formData.result === 'loss' ? '패배' : '무승부'}
라운드: ${formData.rounds}

${formData.whatWorked ? `✅ 잘된 점: ${formData.whatWorked}` : ''}`;

            setShareModalData({
                defaultContent,
                metadata: {
                    opponentName: formData.opponentName,
                    opponentBelt: formData.opponentBelt,
                    result: formData.result,
                    rounds: formData.rounds,
                    xpEarned: earnedXp,
                    videoUrl: formData.videoUrl,
                    whatWorked: formData.whatWorked,
                    whatToImprove: formData.whatToImprove
                }
            });

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

            // Show Quest Complete Modal ALWAYS (to prevent flash and ensure consistent flow)
            setXpEarned(earnedXp);
            setUserStreak(streak);

            if (bonusXp > 0) {
                setBonusReward({
                    type: 'xp_boost',
                    value: `${streak}일 연속 보너스 +${bonusXp} XP`
                });
            } else {
                setBonusReward(undefined);
            }

            setShowQuestModal(true);

            // Note: Share Modal will be triggered automatically when user clicks "Continue" in Quest Modal
        } catch (error) {
            console.error('Error saving sparring review:', error);
            alert('저장 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setLoading(false);
        }
    };

    const handleShareToFeed = async (comment: string) => {
        if (!user || !shareModalData) return;

        try {
            await createFeedPost({
                userId: user.id,
                content: comment,
                type: 'sparring',
                metadata: shareModalData.metadata
            });
            navigate('/journal');
        } catch (error) {
            console.error('Error sharing to feed:', error);
            alert('공유 중 오류가 발생했습니다.');
        }
    };

    // if (!user) {
    //     return (
    //         <div className="text-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-800 max-w-2xl mx-auto">
    //             <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
    //                 <Lock className="w-8 h-8 text-slate-500" />
    //             </div>
    //             <h3 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h3>
    //             <p className="text-slate-400 mb-6">스파링 복기를 작성하고 실력을 향상시키세요.</p>
    //             <Link to="/login">
    //                 <Button>로그인하기</Button>
    //             </Link>
    //         </div>
    //     );
    // }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">스파링 복기</h2>
                    <p className="text-sm text-slate-400">스파링을 분석하고 성장하세요</p>
                </div>
                <Button onClick={handleStartCreating} size="sm" className="rounded-full px-4">
                    <Plus className="w-4 h-4 mr-1.5" />
                    복기 작성
                </Button>
            </div>

            {/* AI Coach Widget */}
            <AICoachWidget logs={trainingLogsForAI} autoRun={autoRunAI} isLocked={true} />

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
                    <Button onClick={handleStartCreating} variant="outline">
                        첫 복기 작성하기
                    </Button>
                </div>
            ) : (
                <>
                    <div className="space-y-4">
                        {displayedReviews.map((review) => (
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

                                {/* Video */}
                                {review.videoUrl && (
                                    <div className="mb-4 rounded-lg overflow-hidden border border-slate-800">
                                        <iframe
                                            src={getYouTubeEmbedUrl(review.videoUrl)}
                                            className="w-full aspect-video"
                                            frameBorder="0"
                                            allow="autoplay; fullscreen; picture-in-picture"
                                            allowFullScreen
                                        ></iframe>
                                    </div>
                                )}

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

                    {reviews.length > REVIEWS_DISPLAY_LIMIT && (
                        <div className="text-center pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowAllReviews(!showAllReviews)}
                                className="min-w-[200px]"
                            >
                                {showAllReviews ? '접기' : `더보기 (${reviews.length - REVIEWS_DISPLAY_LIMIT}개 더)`}
                            </Button>
                        </div>
                    )}
                </>
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

            {/* Quest Complete Modal */}
            <QuestCompleteModal
                isOpen={showQuestModal}
                onClose={() => setShowQuestModal(false)}
                onContinue={() => {
                    setShowQuestModal(false);
                    // Add a small delay to ensure smooth transition and prevent state conflicts
                    setTimeout(() => {
                        setShowShareModal(true);
                    }, 500);
                }}
                questName="스파링 복기 완료"
                xpEarned={xpEarned}
                combatPowerEarned={20}
                streak={userStreak}
                bonusReward={bonusReward}
            />

            {/* Share Modal */}
            {shareModalData && (
                <ShareToFeedModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={handleShareToFeed}
                    activityType="sparring"
                    defaultContent={shareModalData.defaultContent}
                    metadata={shareModalData.metadata}
                />
            )}
        </div>
    );
};
