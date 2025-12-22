import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../Button';
import { Plus, TrendingUp, Target, Hash } from 'lucide-react';
import { TechniqueTagModal } from '../social/TechniqueTagModal';
import { AICoachWidget } from '../journal/AICoachWidget';
import { TrainingLog } from '../../types';
import { ShareToFeedModal } from '../social/ShareToFeedModal';
import { createFeedPost } from '../../lib/api';
import { QuestCompleteModal } from '../QuestCompleteModal';
import { ErrorScreen } from '../ErrorScreen';
import { supabase } from '../../lib/supabase';

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
    const [error, setError] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        roundsList: [{ opponentName: '', opponentBelt: 'white', rounds: 1, result: 'draw' as 'win' | 'loss' | 'draw' }],
        notes: '',
        techniques: [] as string[],
        whatWorked: '',
        whatToImprove: '',
        videoUrl: ''
    });
    const [showTechModal, setShowTechModal] = useState(false);

    const handleAddRound = () => {
        setFormData(prev => ({
            ...prev,
            roundsList: [...prev.roundsList, { opponentName: '', opponentBelt: 'white', rounds: 1, result: 'draw' }]
        }));
    };

    const handleRemoveRound = (index: number) => {
        if (formData.roundsList.length > 1) {
            setFormData(prev => ({
                ...prev,
                roundsList: prev.roundsList.filter((_, i) => i !== index)
            }));
        }
    };

    const handleUpdateRound = (index: number, updates: any) => {
        const newList = [...formData.roundsList];
        newList[index] = { ...newList[index], ...updates };
        setFormData(prev => ({ ...prev, roundsList: newList }));
    };

    const handleRemoveTechnique = (tech: string) => {
        setFormData(prev => ({
            ...prev,
            techniques: prev.techniques.filter(t => t !== tech)
        }));
    };

    // Share to Feed Modal State
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareModalData, setShareModalData] = useState<{
        defaultContent: string;
        metadata: Record<string, any>;
    } | null>(null);

    // Subscription State
    const [isSubscriber, setIsSubscriber] = useState(false);

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

    // Load reviews and subscription
    useEffect(() => {
        if (user) {
            checkSubscription();
            loadReviews();
        }
    }, [user]);

    const checkSubscription = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('users')
            .select('is_subscriber')
            .eq('id', user.id)
            .single();
        setIsSubscriber(data?.is_subscriber || false);
    };

    const loadReviews = async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const { getSparringReviews } = await import('../../lib/api');
            const result = await getSparringReviews(user.id);

            if (result.error) throw result.error;

            if (result.data) {
                setReviews(result.data);
            }
        } catch (err: any) {
            console.error('Error loading sparring reviews:', err);
            setError(err.message || '스파링 복기 목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const REVIEWS_DISPLAY_LIMIT = 10;
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, REVIEWS_DISPLAY_LIMIT);

    // Convert SparringReview[] to TrainingLog[] for AI analysis
    const trainingLogsForAI: TrainingLog[] = reviews.map(review => ({
        id: review.id,
        userId: review.userId,
        date: review.date,
        durationMinutes: (review?.rounds || 0) * 5,
        type: 'sparring' as const,
        notes: `${review?.notes || ''} ${review?.whatWorked || ''} ${review?.whatToImprove || ''}`, // Combine notes for better analysis
        techniques: review?.techniques || [],
        sparringRounds: review?.rounds || 0,
        createdAt: review?.createdAt || new Date().toISOString(),
        isPublic: false,
        location: 'Gym'
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { createSparringReview, createTrainingLog, updateQuestProgress, awardTrainingXP, getUserStreak } = await import('../../lib/api');

            // 1. Award training XP FIRST (before creating log)
            let earnedXpResult = 0;
            let streak = 0;
            let bonusXp = 0;

            try {
                const xpResult = await awardTrainingXP(user.id, 'sparring_review', 20);

                if (xpResult.data) {
                    if (xpResult.data.alreadyCompletedToday) {
                        console.log('Already completed training activity today');
                    } else {
                        earnedXpResult = xpResult.data.xpEarned;
                        streak = xpResult.data.streak;
                        bonusXp = xpResult.data.bonusXP;
                    }
                }

                if (streak === 0) {
                    const { data: currentStreak } = await getUserStreak(user.id);
                    if (currentStreak) streak = currentStreak;
                }
            } catch (error) {
                console.error('Error awarding XP:', error);
            }

            // Calculate totals and summary
            const totalRounds = formData.roundsList.reduce((sum, r) => sum + r.rounds, 0);
            const mainOpponent = formData.roundsList[0];
            const sessionsSummary = formData.roundsList.map((r, i) =>
                `${i + 1}. ${r.opponentName} (${r.opponentBelt}벨트): ${r.rounds}라운드 - ${r.result === 'win' ? '승리' : r.result === 'loss' ? '패배' : '무승부'}`
            ).join('\n');

            const fullNotes = `[스파링 세션 요약]\n${sessionsSummary}\n\n[메모]\n${formData.notes}`;

            // 2. Create sparring review (Legacy schema compatibility)
            const { data: newReview, error: reviewError } = await createSparringReview({
                userId: user.id,
                date: formData.date,
                opponentName: mainOpponent.opponentName,
                opponentBelt: mainOpponent.opponentBelt,
                rounds: totalRounds,
                result: mainOpponent.result,
                notes: fullNotes,
                techniques: formData.techniques,
                whatWorked: formData.whatWorked,
                whatToImprove: formData.whatToImprove,
                videoUrl: formData.videoUrl
            });

            if (reviewError || !newReview) throw reviewError;

            setReviews([newReview, ...reviews]);

            // 3. Automatically create training log
            const logContent = `스파링 복기\n\n${sessionsSummary}\n\n잘된 점:\n${formData.whatWorked}\n\n개선할 점:\n${formData.whatToImprove}\n\n상세 메모:\n${formData.notes}`;

            await createTrainingLog({
                userId: user.id,
                date: formData.date,
                notes: logContent,
                durationMinutes: totalRounds * 5,
                sparringRounds: totalRounds,
                techniques: formData.techniques,
                isPublic: false,
                location: 'Gym'
            }, true); // Skip daily check

            // Also update daily quest progress
            try {
                const questResult = await updateQuestProgress(user.id, 'sparring_review');
                if (questResult.completed && questResult.xpEarned > 0) {
                    earnedXpResult += questResult.xpEarned;
                }
            } catch (error) {
                console.error('Error updating quest:', error);
            }

            // 4. Prepare Share Modal Data
            const defaultContent = `🥋 스파링 복기
날짜: ${formData.date}
상대: ${mainOpponent.opponentName} 외 ${formData.roundsList.length - 1}명
총 ${totalRounds}라운드 완료!

#주짓수 #그라플 #스파링복기 #오운완`;

            setShareModalData({
                defaultContent,
                metadata: {
                    type: 'sparring_review',
                    reviewId: newReview.id,
                    opponentName: mainOpponent.opponentName,
                    rounds: totalRounds,
                    belt: mainOpponent.opponentBelt
                }
            });

            setXpEarned(earnedXpResult);
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

            setIsCreating(false);
            success('스파링 복기가 저장되었습니다!');

            // Re-load reviews to match DB state
            loadReviews();
        } catch (err: any) {
            console.error('Error creating sparring review:', err);
            toastError(err.message || '저장 중 오류가 발생했습니다.');
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

    if (error) {
        return <ErrorScreen error={error} resetMessage="스파링 복기 목록을 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }

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
            <AICoachWidget logs={trainingLogsForAI} autoRun={autoRunAI} isLocked={!isSubscriber} />

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                        {reviews.filter(r => r?.result === 'win').length}
                    </div>
                    <div className="text-xs text-slate-400">승리</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-red-400 mb-1">
                        {reviews.filter(r => r?.result === 'loss').length}
                    </div>
                    <div className="text-xs text-slate-400">패배</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                        {reviews.filter(r => r?.result === 'draw').length}
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
                                            <div className="font-bold text-white">vs {review?.opponentName || 'Unknown'}</div>
                                            <div className="text-xs text-slate-400">{review?.date} • {review?.opponentBelt} Belt • {review?.rounds || 0} 라운드</div>
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
                                {review?.techniques && review.techniques.length > 0 && (
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
                                    <Plus className="w-6 h-6 rotate-45" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">날짜</label>
                                    <input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="block text-sm font-medium text-slate-300">라운드별 기록</label>
                                        <Button type="button" size="sm" onClick={handleAddRound} className="bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700">
                                            <Plus className="w-4 h-4 mr-1" /> 상대 추가
                                        </Button>
                                    </div>

                                    {formData.roundsList.map((round, index) => (
                                        <div key={index} className="bg-slate-900 border border-slate-800 rounded-xl p-4 relative space-y-4">
                                            {formData.roundsList.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRound(index)}
                                                    className="absolute top-2 right-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
                                                >
                                                    <Plus className="w-5 h-5 rotate-45" />
                                                </button>
                                            )}

                                            <div className="grid md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">상대 이름</label>
                                                    <input
                                                        type="text"
                                                        value={round.opponentName}
                                                        onChange={(e) => handleUpdateRound(index, { opponentName: e.target.value })}
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        placeholder="상대 이름"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">상대 벨트</label>
                                                    <select
                                                        value={round.opponentBelt}
                                                        onChange={(e) => handleUpdateRound(index, { opponentBelt: e.target.value })}
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="white">White</option>
                                                        <option value="blue">Blue</option>
                                                        <option value="purple">Purple</option>
                                                        <option value="brown">Brown</option>
                                                        <option value="black">Black</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="grid md:grid-cols-2 gap-4 pt-2">
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-2">라운드 수</label>
                                                    <div className="bg-slate-800 px-3 py-2 rounded-lg border border-slate-700 flex items-center gap-3">
                                                        <input
                                                            type="range"
                                                            min="1"
                                                            max="10"
                                                            value={round.rounds}
                                                            onChange={(e) => handleUpdateRound(index, { rounds: Number(e.target.value) })}
                                                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                        />
                                                        <span className="text-sm font-bold text-blue-500 w-4">{round.rounds}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-slate-500 mb-1">결과</label>
                                                    <select
                                                        value={round.result}
                                                        onChange={(e) => handleUpdateRound(index, { result: e.target.value as any })}
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                    >
                                                        <option value="win">승리</option>
                                                        <option value="loss">패배</option>
                                                        <option value="draw">무승부</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-sm font-medium text-slate-300">사용한 기술</label>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setShowTechModal(true)}
                                            className="border-slate-700 hover:bg-slate-800 text-blue-400 gap-1.5"
                                        >
                                            <Hash className="w-4 h-4" />
                                            기술 선택
                                        </Button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        {formData.techniques.length === 0 ? (
                                            <p className="text-sm text-slate-500 py-1">아직 선택된 기술이 없습니다.</p>
                                        ) : (
                                            formData.techniques.map((tech, index) => (
                                                <span key={index} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm font-medium animate-in zoom-in duration-200">
                                                    #{tech}
                                                    <button type="button" onClick={() => handleRemoveTechnique(tech)} className="hover:text-blue-300 transition-colors">
                                                        <Plus className="w-3.5 h-3.5 rotate-45" />
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">효과적이었던 것</label>
                                        <textarea
                                            value={formData.whatWorked}
                                            onChange={(e) => setFormData({ ...formData, whatWorked: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                            placeholder="잘 작동한 전략..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">개선할 점</label>
                                        <textarea
                                            value={formData.whatToImprove}
                                            onChange={(e) => setFormData({ ...formData, whatToImprove: e.target.value })}
                                            rows={3}
                                            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                                            placeholder="다음에 보완할 부분..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">메모 및 영상 (선택)</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none mb-3"
                                        placeholder="전반적인 느낌..."
                                    />
                                    <input
                                        type="url"
                                        value={formData.videoUrl}
                                        onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="영상 URL (YouTube 등)"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
                                    <Button type="button" variant="ghost" onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white hover:bg-slate-800">
                                        취소
                                    </Button>
                                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8">
                                        {loading ? '저장 중...' : '저장하기'}
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

            {/* Technique Selector Modal */}
            {showTechModal && (
                <TechniqueTagModal
                    selectedTechniques={formData.techniques}
                    onClose={() => setShowTechModal(false)}
                    onSelect={(selected) => {
                        setFormData(prev => ({ ...prev, techniques: selected }));
                        setShowTechModal(false);
                    }}
                />
            )}
        </div>
    );
};
