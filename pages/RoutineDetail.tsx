import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRoutineById, checkDrillRoutineOwnership, incrementDrillRoutineViews, getDrillById, createFeedPost, addXP, checkDailyRoutineXP, createTrainingLog, updateQuestProgress, getCompletedRoutinesToday, awardTrainingXP } from '../lib/api';
import { Drill, DrillRoutine } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, Eye, ThumbsUp, MessageSquare, Share2, CheckCircle, ChevronRight, Lock, CalendarCheck, Save } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';
import { ShareToFeedModal } from '../components/social/ShareToFeedModal';

export const RoutineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [routine, setRoutine] = useState<DrillRoutine | null>(null);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Completion & Sharing State
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareModalData, setShareModalData] = useState<{
        defaultContent: string;
        metadata: any;
    } | null>(null);
    const [completedDrills, setCompletedDrills] = useState<Set<string>>(new Set());
    const [earnedXpToday, setEarnedXpToday] = useState(false);
    const [isCompletedToday, setIsCompletedToday] = useState(false);
    const [streak, setStreak] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [bonusReward, setBonusReward] = useState<{ type: 'xp_boost' | 'badge' | 'unlock'; value: string } | undefined>(undefined);

    // Timer State
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

    const isCustomRoutine = id?.startsWith('custom-');

    useEffect(() => {
        if (id) {
            fetchRoutine();
            checkUser();
        }
    }, [id]);

    useEffect(() => {
        if (routine && routine.drills && routine.drills.length > 0) {
            loadDrill(currentDrillIndex);
        }
    }, [routine, currentDrillIndex]);

    // Timer Logic
    useEffect(() => {
        if (isTrainingMode) {
            const interval = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
            setTimerInterval(interval);
            return () => clearInterval(interval);
        } else if (timerInterval) {
            clearInterval(timerInterval);
            setTimerInterval(null);
        }
    }, [isTrainingMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const fetchRoutine = async () => {
        if (!id) return;

        // 1. Check for custom routine in localStorage first
        if (id.startsWith('custom-')) {
            try {
                const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
                const found = customRoutines.find((r: any) => r.id === id);
                if (found) {
                    setRoutine(found);
                    setLoading(false);
                    return;
                }
            } catch (e) {
                console.error('Error loading custom routine:', e);
            }
        }

        // 2. Fetch from API/DB
        try {
            const { data: routineData, error } = await getRoutineById(id);
            if (routineData) {
                setRoutine(routineData);
                await incrementDrillRoutineViews(id);
            } else if (error) {
                console.error('Error fetching routine:', error);
            }
        } catch (error) {
            console.error('Error fetching routine:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDrill = async (index: number) => {
        if (!routine || !routine.drills || index >= routine.drills.length) return;
        const drill = routine.drills[index];

        // If drill is just an ID, fetch full data
        if (typeof drill === 'string') {
            const drillData = await getDrillById(drill);
            setCurrentDrill(drillData);
        } else {
            // If drill object exists but missing vimeoUrl (incomplete data), fetch full details
            if (!drill.vimeoUrl) {
                const drillData = await getDrillById(drill.id);
                if (drillData) {
                    setCurrentDrill(drillData);
                } else {
                    setCurrentDrill(drill);
                }
            } else {
                setCurrentDrill(drill);
            }
        }
    };

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUser(user);
            const { data: userData } = await supabase
                .from('users')
                .select('is_subscriber, subscription_tier')
                .eq('id', user.id)
                .single();

            if (userData) {
                setIsSubscriber(userData.is_subscriber);
                // Store tier in user object or separate state if needed, 
                // but for now we can just use the userData directly or update a state
                setUser(prev => ({ ...prev, subscription_tier: userData.subscription_tier }));
            }

            if (id) {
                if (id.startsWith('custom-')) {
                    setOwns(true);
                } else {
                    const ownership = await checkDrillRoutineOwnership(user.id, id);
                    setOwns(ownership);
                }

                // Check if this specific routine is completed today
                const completedIds = await getCompletedRoutinesToday(user.id);
                if (completedIds.includes(id)) {
                    setIsCompletedToday(true);
                }
            }

            // Check if user already earned XP today
            const alreadyEarned = await checkDailyRoutineXP(user.id);
            setEarnedXpToday(alreadyEarned);
        }
    };

    const handlePurchase = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!routine) return;
        navigate(`/checkout/routine/${routine.id}`);
    };

    const handleSaveRoutine = () => {
        if (!routine) return;

        try {
            const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');

            // Check for duplicates (by ID or title)
            const isDuplicate = customRoutines.some((r: any) => r.id === routine.id || (r.title === routine.title && r.creatorId === routine.creatorId));

            if (isDuplicate) {
                alert('이미 저장된 루틴입니다.');
                return;
            }

            // Create a copy with a new custom ID if it's not already a custom routine
            const newRoutine = {
                ...routine,
                id: routine.id.startsWith('custom-') ? routine.id : `custom-saved-${routine.id}-${Date.now()}`,
                title: routine.title, // Keep original title
                isSaved: true
            };

            localStorage.setItem('my_custom_routines', JSON.stringify([...customRoutines, newRoutine]));
            alert('나만의 루틴에 저장되었습니다!');
        } catch (e) {
            console.error('Error saving routine:', e);
            alert('루틴 저장 중 오류가 발생했습니다.');
        }
    };

    const handleDrillComplete = () => {
        if (!currentDrill) return;
        const newCompleted = new Set(completedDrills);
        newCompleted.add(currentDrill.id);
        setCompletedDrills(newCompleted);

        // Auto-advance to next drill
        if (currentDrillIndex < (routine?.drills?.length || 0) - 1) {
            setCurrentDrillIndex(currentDrillIndex + 1);
        } else {
            // All drills completed - Start Training Timer
            setIsTrainingMode(true);
        }
    };

    const handleFinishTraining = async () => {
        setIsTrainingMode(false);
        const durationMinutes = Math.ceil(elapsedSeconds / 60);

        // Calculate XP
        let xpEarned = 0;
        let currentStreak = 0;
        let bonusXp = 0;

        if (user) {
            // 1. Create Training Log
            const { data: log } = await createTrainingLog({
                userId: user.id,
                userName: user.user_metadata?.name || 'Unknown User',
                date: new Date().toISOString().split('T')[0],
                durationMinutes: durationMinutes,
                sparringRounds: 0,
                notes: `[Routine Completed] ${routine?.title}`,
                techniques: routine?.drills?.map(d => typeof d === 'string' ? '' : d.title).filter(Boolean) || [],
                isPublic: true,
                location: 'Home / Gym',
                metadata: {
                    routineId: routine?.id,
                    routineTitle: routine?.title
                }
            });

            // 2. Award XP with daily limit and streak bonus
            let xpAmount = 50; // Base XP for routine
            
            try {
                const xpResult = await awardTrainingXP(user.id, 'routine_complete', xpAmount);
                
                if (xpResult.data) {
                    if (xpResult.data.alreadyCompletedToday) {
                        console.log('Already completed training activity today');
                        xpEarned = 0;
                        currentStreak = xpResult.data.streak;
                    } else {
                        xpEarned = xpResult.data.xpEarned;
                        currentStreak = xpResult.data.streak;
                        bonusXp = xpResult.data.bonusXP;
                    }
                }
            } catch (error) {
                console.error('Error awarding XP:', error);
            }

            // Also update daily quest progress
            try {
                const { updateQuestProgress } = await import('../lib/api');
                const questResult = await updateQuestProgress(user.id, 'complete_routine');
                
                if (questResult.completed && questResult.xpEarned > 0) {
                    xpEarned += questResult.xpEarned;
                    // success(`일일 미션 완료! +${questResult.xpEarned} XP`); // Optional
                }
            } catch (error) {
                console.error('Error updating quest:', error);
            }

            setStreak(currentStreak);
            setXpEarned(xpEarned);
            if (bonusXp > 0) {
                setBonusReward({
                    type: 'xp_boost',
                    value: `${currentStreak}일 연속 보너스 +${bonusXp} XP`
                });
            } else {
                setBonusReward(undefined);
            }
        }

        // Prepare share modal
        const defaultContent = `💪 훈련 루틴 완료!

${routine?.title}
소요 시간: ${durationMinutes}분
획득 XP: +${xpEarned}

${routine?.drills && routine.drills.length > 0 ? `완료한 드릴: ${routine.drills.length}개` : ''}`;

        setShareModalData({
            defaultContent,
            metadata: {
                routineTitle: routine?.title,
                durationMinutes,
                xpEarned,
                drillCount: routine?.drills?.length || 0,
                // Include full routine data for sharing/importing
                sharedRoutine: routine
            }
        });

        setEarnedXpToday(true);
        setIsCompletedToday(true);
        setShowQuestComplete(true);
    };

    const handleShareToFeed = async (comment: string) => {
        if (!user || !shareModalData) return;

        await createFeedPost({
            userId: user.id,
            content: comment,
            type: 'routine',
            metadata: shareModalData.metadata
        });


        setShowShareModal(false);
        navigate('/journal');
    };

    const handleDrillSelect = (index: number) => {
        setCurrentDrillIndex(index);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        );
    }

    if (!routine) return <div className="text-white text-center pt-20">Routine not found</div>;
    if (!currentDrill) return <div className="text-white text-center pt-20">Loading drill...</div>;

    const progress = (completedDrills.size / (routine.drills?.length || 1)) * 100;

    // Theme colors based on routine type
    const themeColor = isCustomRoutine ? 'purple' : 'blue';
    const accentColor = isCustomRoutine ? 'text-purple-400' : 'text-blue-400';
    const activeBg = isCustomRoutine ? 'bg-purple-600/20' : 'bg-blue-600/20';
    const activeBorder = isCustomRoutine ? 'border-purple-500/50' : 'border-blue-500/50';
    const activeDot = isCustomRoutine ? 'bg-purple-500' : 'bg-blue-500';
    const progressGradient = isCustomRoutine ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-purple-500';
    const buttonGradient = isCustomRoutine
        ? 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/20'
        : 'from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-900/20';

    // Check if drill is playable (owned OR free OR has vimeoUrl OR premium subscriber)
    const isPlayable = owns || (isSubscriber && user?.subscription_tier === 'premium') || currentDrill.price === 0 || !!currentDrill.vimeoUrl;

    return (
        <div className="h-[calc(100vh-64px)] bg-black flex overflow-hidden">
            {/* Left: Video Stage */}
            <div className="flex-1 flex items-center justify-center bg-zinc-900/30 relative">
                {/* Ambient Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[700px] ${isCustomRoutine ? 'bg-purple-500/10' : 'bg-blue-500/10'} blur-[120px] rounded-full`}></div>
                </div>

                {/* Video Player - Full Height 9:16 */}
                <div className="relative h-full w-auto aspect-[9/16] shadow-2xl overflow-hidden ring-1 ring-white/10">
                    {isTrainingMode ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                            <div className="text-slate-400 mb-4 text-lg animate-pulse">Training in Progress...</div>
                            <div className="text-8xl font-black text-white tabular-nums tracking-wider mb-8 font-mono">
                                {formatTime(elapsedSeconds)}
                            </div>
                            <Button
                                onClick={handleFinishTraining}
                                className={`text-white px-12 py-6 text-xl rounded-full shadow-lg transform hover:scale-105 transition-all bg-gradient-to-r ${buttonGradient}`}
                            >
                                <CheckCircle className="w-6 h-6 mr-3" />
                                훈련 완료하기
                            </Button>
                        </div>
                    ) : isPlayable && currentDrill.vimeoUrl ? (
                        <iframe
                            src={currentDrill.vimeoUrl}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    ) : (
                        <div className="w-full h-full relative group">
                            <img
                                src={currentDrill.thumbnailUrl}
                                alt={currentDrill.title}
                                className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/20 backdrop-blur-sm">
                                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                                    <Lock className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                                    루틴 구매 필요
                                </h3>
                                <p className="text-zinc-300 mb-8 max-w-xs text-sm">
                                    이 루틴의 모든 드릴을 마스터하세요. <br />지금 바로 시작하세요.
                                </p>
                                {!owns && (
                                    <Button
                                        onClick={handlePurchase}
                                        size="lg"
                                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-blue-900/20 border border-blue-400/20"
                                    >
                                        ₩{routine.price.toLocaleString()}에 잠금 해제
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Floating Actions */}
                    <div className="absolute right-4 bottom-24 flex flex-col gap-4">
                        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                            <ThumbsUp className="w-6 h-6" />
                        </button>
                        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                            <MessageSquare className="w-6 h-6" />
                        </button>
                        <button className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-colors border border-white/10">
                            <Share2 className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Progress Indicator */}
                    {owns && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
                            <div
                                className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-300`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Info Panel - Full Height */}
            <div className="w-[420px] bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
                {/* Header */}
                <div className="p-6 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="relative">
                            <img
                                src={`https://ui-avatars.com/api/?name=${routine.creatorName}&background=random`}
                                className="w-10 h-10 rounded-full ring-2 ring-zinc-800"
                                alt={routine.creatorName}
                            />
                            <div className={`absolute -bottom-1 -right-1 ${isCustomRoutine ? 'bg-purple-500' : 'bg-blue-500'} text-[10px] text-white px-1.5 py-0.5 rounded-full border border-zinc-950 font-bold`}>
                                {isCustomRoutine ? 'ME' : 'PRO'}
                            </div>
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-white text-sm hover:underline cursor-pointer">{routine.creatorName}</p>
                            <p className="text-xs text-zinc-500">구독자 1.2만명</p>
                        </div>

                        {/* Save Routine Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSaveRoutine}
                            className="text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full h-8 flex items-center gap-1"
                        >
                            <Save className="w-3 h-3" />
                            저장
                        </Button>

                        {!isCustomRoutine && (
                            <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-full h-8">
                                구독하기
                            </Button>
                        )}
                    </div>

                    {/* Routine Title */}
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-lg font-black text-white">{routine.title}</h2>
                        {isCompletedToday && (
                            <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30">
                                <CalendarCheck className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">오늘 완료함</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            <span>{routine.views?.toLocaleString() || 0}회</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <PlayCircle className="w-3 h-3" />
                            <span>{routine.drillCount || routine.drills?.length || 0}개 드릴</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{routine.totalDurationMinutes || 0}분</span>
                        </div>
                    </div>
                </div>

                {/* Scrollable Content - Drill List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {/* Current Drill Info */}
                    {!isTrainingMode && (
                        <div className="p-6 border-b border-zinc-900">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`text-xs font-bold ${accentColor}`}>현재 재생중</span>
                                <span className="text-xs text-zinc-500">드릴 {currentDrillIndex + 1}/{routine.drills?.length || 0}</span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">{currentDrill.title}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                {currentDrill.description || '설명이 없습니다.'}
                            </p>
                        </div>
                    )}

                    {/* Drill Playlist */}
                    <div className="p-6">
                        <h4 className="text-sm font-bold text-white mb-3">루틴 드릴 목록</h4>
                        <div className="space-y-2">
                            {routine.drills?.map((drill, index) => {
                                const drillData = typeof drill === 'string' ? null : drill;
                                const isCompleted = drillData && completedDrills.has(drillData.id);
                                const isCurrent = index === currentDrillIndex;
                                const isDrillPlayable = isPlayable; // Simplify for now, can be per-drill logic

                                return (
                                    <button
                                        key={index}
                                        onClick={() => isDrillPlayable && handleDrillSelect(index)}
                                        disabled={!isDrillPlayable}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${isCurrent
                                            ? `${activeBg} border ${activeBorder}`
                                            : isDrillPlayable
                                                ? 'hover:bg-zinc-900 border border-transparent'
                                                : 'opacity-50 cursor-not-allowed border border-transparent'
                                            }`}
                                    >
                                        <div className="relative w-16 aspect-[9/16] rounded-lg overflow-hidden flex-shrink-0 bg-zinc-800">
                                            {drillData?.thumbnailUrl && (
                                                <img
                                                    src={drillData.thumbnailUrl}
                                                    alt={drillData.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                            {!isDrillPlayable && (
                                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                    <Lock className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-zinc-500">#{index + 1}</span>
                                                {isCompleted && <CheckCircle className="w-3 h-3 text-green-400" />}
                                            </div>
                                            <h5 className={`text-sm font-medium line-clamp-2 leading-snug ${isCurrent ? accentColor : 'text-zinc-200'
                                                }`}>
                                                {drillData?.title || `드릴 ${index + 1}`}
                                            </h5>
                                            <p className="text-xs text-zinc-500">{drillData?.duration || '0:00'}</p>
                                        </div>
                                        {isCurrent && (
                                            <div className="flex-shrink-0">
                                                <div className={`w-2 h-2 rounded-full ${activeDot} animate-pulse`} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0">
                    {isPlayable ? (
                        <Button
                            onClick={handleDrillComplete}
                            className={`w-full bg-gradient-to-r ${buttonGradient} text-white font-bold py-6 rounded-xl shadow-lg`}
                        >
                            <CheckCircle className="w-5 h-5 mr-2" />
                            드릴 완료 & 다음으로
                        </Button>
                    ) : (
                        <Button
                            onClick={handlePurchase}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-blue-900/20"
                        >
                            ₩{routine.price.toLocaleString()} • 루틴 구매하기
                        </Button>
                    )}
                </div>
            </div>

            {/* Quest Complete Modal */}
            <QuestCompleteModal
                isOpen={showQuestComplete}
                onClose={() => {
                    setShowQuestComplete(false);
                    setShareModalData(null);
                }}
                onContinue={() => {
                    setShowQuestComplete(false);
                    setShowShareModal(true);
                }}
                questName={routine?.title || '루틴'}
                xpEarned={xpEarned}
                streak={streak}
                bonusReward={bonusReward}
            />

            {/* Share to Feed Modal */}
            {showShareModal && shareModalData && (
                <ShareToFeedModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={handleShareToFeed}
                    activityType="routine"
                    defaultContent={shareModalData.defaultContent}
                    metadata={shareModalData.metadata}
                />
            )}
        </div>
    );
};
