import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getRoutineById, checkDrillRoutineOwnership, getDrillById, createFeedPost, createTrainingLog, getCompletedRoutinesToday, awardTrainingXP, toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, recordWatchTime } from '../lib/api';
import { Drill, DrillRoutine } from '../types';
import Player from '@vimeo/player';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { PlayCircle, Clock, Eye, CheckCircle, Lock, CalendarCheck, Heart, Bookmark, Share2, Volume2, VolumeX } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';
import { ShareToFeedModal } from '../components/social/ShareToFeedModal';
import ShareModal from '../components/social/ShareModal';
import { useAuth } from '../contexts/AuthContext';

// Internal component for Vimeo tracking
const VimeoWrapper: React.FC<{ vimeoId: string; onProgress: () => void; currentDrillId: string; videoType: string }> = ({ vimeoId, onProgress, currentDrillId, videoType }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const playerRef = useRef<Player | null>(null);

    useEffect(() => {
        if (!iframeRef.current) return;

        let player: Player;
        try {
            player = new Player(iframeRef.current);
            playerRef.current = player;

            player.on('timeupdate', () => {
                onProgress();
            });
        } catch (e) {
            console.error('Vimeo init error:', e);
        }

        return () => {
            if (player) {
                player.off('timeupdate');
                // Don't destroy possibly as we are just unmounting logic, iframe stays? 
                // Actually iframe removes too. destroy() removes the iframe from DOM usually if connected to div, 
                // but here we wrap existing iframe? No, Player(iframe) wraps it.
                // Safest to just off events.
            }
        };
    }, [vimeoId, currentDrillId, videoType]);

    return (
        <iframe
            ref={iframeRef}
            src={`https://player.vimeo.com/video/${vimeoId}?background=0&autoplay=1&loop=1&autopause=0&muted=0&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1&color=ffffff`}
            className="w-full h-full"
            frameBorder="0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
        ></iframe>
    );
};

export const RoutineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: contextUser, loading: authLoading } = useAuth();

    // Playback Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [routine, setRoutine] = useState<DrillRoutine | null>(null);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [muted, setMuted] = useState(true);

    const toggleMute = () => {
        setMuted(prev => !prev);
    };

    // Completion & Sharing State
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareModalData, setShareModalData] = useState<{
        defaultContent: string;
        metadata: any;
    } | null>(null);
    const [shareModalData2, setShareModalData2] = useState<{
        title: string;
        text: string;
        url: string;
    } | null>(null);
    const [completedDrills, setCompletedDrills] = useState<Set<string>>(new Set());

    const [isCompletedToday, setIsCompletedToday] = useState(false);
    const [streak, setStreak] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [bonusReward, setBonusReward] = useState<{ type: 'xp_boost' | 'badge' | 'unlock'; value: string } | undefined>(undefined);

    // Timer State
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);

    // Saved Drills State
    const [savedDrills, setSavedDrills] = useState<Set<string>>(new Set());
    const [likedDrills, setLikedDrills] = useState<Set<string>>(new Set());

    // Video type state
    const [videoType, setVideoType] = useState<'main' | 'description'>('main');
    const [isFollowing, setIsFollowing] = useState(false);

    const navigateToCreator = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (routine?.creatorId) {
            navigate(`/creator/${routine.creatorId}`);
        }
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!contextUser) {
            navigate('/login');
            return;
        }
        if (!routine?.creatorId) return;

        try {
            const { toggleCreatorFollow } = await import('../lib/api');
            const { followed } = await toggleCreatorFollow(contextUser.id, routine.creatorId);
            setIsFollowing(followed);
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    // Watch time tracking
    const lastTickRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);

    const handleProgress = async () => {
        // Only track for subscribers who DON'T own the routine (settlement logic)
        // If they own it, no need to pay creator from pool (already paid via purchase)
        if (!user || owns || !isSubscriber) return;
        if (!currentDrill) return;

        const now = Date.now();
        if (lastTickRef.current === 0) {
            lastTickRef.current = now;
            return;
        }

        const elapsed = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;

        // Ignore jumps or pauses (too large gap)
        if (elapsed > 0 && elapsed < 5) {
            accumulatedTimeRef.current += elapsed;
        }

        // Record every 10 seconds
        if (accumulatedTimeRef.current >= 10) {
            const timeToSend = Math.floor(accumulatedTimeRef.current);
            accumulatedTimeRef.current -= timeToSend;

            try {
                // Pass currentDrill.id as videoId (assuming drills map to videos mostly one-to-one for settlement)
                // Or use specific field if needed. API expects videoId or lessonId.
                await recordWatchTime(user.id, timeToSend, currentDrill.id);
            } catch (e) {
                console.warn('Failed to record watch time:', e);
            }
        }
    };

    // Reset video type when drill changes
    useEffect(() => {
        setVideoType('main');
        // Reset tracking on drill change
        lastTickRef.current = 0;
        accumulatedTimeRef.current = 0;
    }, [currentDrillIndex]);

    // Calculate total duration if not provided by backend
    const totalDurationMinutes = useMemo(() => {
        try {
            if (routine?.totalDurationMinutes && routine.totalDurationMinutes > 0) {
                return routine.totalDurationMinutes;
            }

            if (!routine || !routine.drills || !Array.isArray(routine.drills) || routine.drills.length === 0) return 0;

            const totalSeconds = routine.drills.reduce((acc, drill) => {
                if (!drill || typeof drill === 'string') return acc;

                try {
                    // 1. Try numeric durationMinutes
                    if (typeof drill.durationMinutes === 'number') {
                        return acc + (drill.durationMinutes * 60);
                    }

                    // 2. Try parsing string duration (mm:ss)
                    const durationStr = drill.duration || drill.length;
                    if (durationStr && typeof durationStr === 'string' && durationStr.includes(':')) {
                        const parts = durationStr.split(':').map(Number);
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                            return acc + (parts[0] * 60 + parts[1]);
                        }
                    }
                } catch (err) {
                    return acc;
                }

                return acc;
            }, 0);

            return Math.ceil(totalSeconds / 60);
        } catch (e) {
            console.error('Error calculating run time:', e);
            return 0;
        }
    }, [routine]);

    const isCustomRoutine = id?.startsWith('custom-');

    useEffect(() => {
        console.log('RoutineDetail loaded - Version: CrashFix_v3');
        if (authLoading) return;
        if (id) {
            fetchRoutine();
            checkUser();
        }
    }, [id, authLoading]);

    // Load saved and liked drills from database
    useEffect(() => {
        const loadUserInteractions = async () => {
            if (user) {
                try {
                    const [saved, liked] = await Promise.all([
                        getUserSavedDrills(user.id),
                        getUserLikedDrills(user.id)
                    ]);

                    setSavedDrills(new Set(saved.map(d => d.id)));
                    setLikedDrills(new Set(liked.map(d => d.id)));

                    // Sync to localStorage
                    localStorage.setItem('saved_drills', JSON.stringify(saved));
                    localStorage.setItem('liked_drills', JSON.stringify(liked.map(d => d.id)));
                } catch (error) {
                    console.error('Error loading user interactions:', error);
                    // Fallback
                    const saved = JSON.parse(localStorage.getItem('saved_drills') || '[]');
                    setSavedDrills(new Set(saved.map((d: Drill) => d.id)));
                    const liked = JSON.parse(localStorage.getItem('liked_drills') || '[]');
                    setLikedDrills(new Set(liked));
                }
            } else {
                const saved = JSON.parse(localStorage.getItem('saved_drills') || '[]');
                setSavedDrills(new Set(saved.map((d: Drill) => d.id)));
                const liked = JSON.parse(localStorage.getItem('liked_drills') || '[]');
                setLikedDrills(new Set(liked));
            }
        };
        loadUserInteractions();
    }, [user]);

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

        // 1. Check for custom routine in localStorage first (Always check, regardless of prefix)
        try {
            const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
            const found = customRoutines.find((r: any) => r.id === id);
            if (found) {
                console.log('Loaded custom routine:', found);
                setRoutine(found);
                setOwns(true); // User owns custom routines
                setLoading(false);
                return;
            }
        } catch (e) {
            console.error('Error loading custom routine:', e);
        }

        // 2. Fetch from API/DB
        try {
            const { data: routineData, error } = await getRoutineById(id);
            console.log('Fetched routine data:', routineData);
            if (routineData) {
                // Fix: Ensure drills property exists if items is returned
                if (!routineData.drills && (routineData as any).items) {
                    routineData.drills = (routineData as any).items;
                }
                setRoutine(routineData);
                // try {
                //     await incrementDrillRoutineViews(id);
                // } catch (viewError) {
                //     console.warn('Failed to increment views:', viewError);
                // }
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
        console.log('Loading drill:', drill);

        const drillId = typeof drill === 'string' ? drill : drill.id;

        // Always try to fetch fresh data from DB to ensure sync
        try {
            const drillData = await getDrillById(drillId);
            if (drillData && !('error' in drillData)) {
                console.log('Fetched fresh drill data:', drillData);
                setCurrentDrill(drillData as Drill);
                return;
            }
        } catch (e) {
            console.warn('Failed to fetch drill from DB, falling back to local:', e);
        }

        // Fallback to local object if DB fetch fails or returns null
        if (typeof drill !== 'string') {
            setCurrentDrill(drill);
        }
    };

    const checkUser = async () => {
        if (contextUser) {
            setUser(contextUser);
            const { data: userData } = await supabase
                .from('users')
                .select('is_subscriber, subscription_tier')
                .eq('id', contextUser.id)
                .single();

            if (userData) {
                setIsSubscriber(userData.is_subscriber);
                // Store tier in user object or separate state if needed, 
                // but for now we can just use the userData directly or update a state
                setUser((prev: any) => ({ ...prev, subscription_tier: userData.subscription_tier }));
            }

            if (id) {
                if (id.startsWith('custom-')) {
                    setOwns(true);
                } else {
                    const ownership = await checkDrillRoutineOwnership(contextUser.id, id);
                    setOwns(ownership);
                }

                // Check if this specific routine is completed today
                const completedIds = await getCompletedRoutinesToday(contextUser.id);
                if (completedIds.includes(id)) {
                    setIsCompletedToday(true);
                }
            }
        }
    };

    // Effect to check follow status once routine is loaded
    useEffect(() => {
        const checkFollow = async () => {
            if (contextUser && routine?.creatorId) {
                const { checkCreatorFollowStatus } = await import('../lib/api');
                const followed = await checkCreatorFollowStatus(contextUser.id, routine.creatorId);
                setIsFollowing(followed);
            }
        };
        checkFollow();
    }, [contextUser, routine?.creatorId]);

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
            alert('내 라이브러리에 담겼습니다! 프로필에서 확인하세요.');
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
            await createTrainingLog({
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
                routineId: routine?.id,
                routineTitle: routine?.title,
                durationMinutes,
                xpEarned,
                drillCount: routine?.drills?.length || 0,
                // Include full routine data for sharing/importing
                sharedRoutine: routine
            }
        });

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

    const handleSaveDrill = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentDrill) return;
        if (!user) {
            navigate('/login');
            return;
        }

        const isSaved = savedDrills.has(currentDrill.id);
        const newSaved = new Set(savedDrills);

        if (isSaved) {
            newSaved.delete(currentDrill.id);
        } else {
            newSaved.add(currentDrill.id);
        }
        setSavedDrills(newSaved); // Optimistic

        const { saved: savedState, error } = await toggleDrillSave(user.id, currentDrill.id);

        if (error) {
            console.error('Error toggling save:', error);
            setSavedDrills(savedDrills); // Revert
            alert('저장에 실패했습니다.');
        } else {
            // Sync localStorage
            let savedDrillsList = JSON.parse(localStorage.getItem('saved_drills') || '[]');
            if (savedState) {
                if (!savedDrillsList.find((d: Drill) => d.id === currentDrill.id)) {
                    savedDrillsList.push(currentDrill);
                }
                alert('드릴이 나만의 루틴에 저장되었습니다! 아레나 > 나만의 루틴 탭에서 확인하세요.');
            } else {
                savedDrillsList = savedDrillsList.filter((d: Drill) => d.id !== currentDrill.id);
                alert('저장된 드릴에서 제거되었습니다.');
            }
            localStorage.setItem('saved_drills', JSON.stringify(savedDrillsList));
        }
    };

    const handleLikeDrill = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentDrill) return;
        if (!user) {
            navigate('/login');
            return;
        }

        const isLiked = likedDrills.has(currentDrill.id);
        const newLiked = new Set(likedDrills);

        if (isLiked) {
            newLiked.delete(currentDrill.id);
        } else {
            newLiked.add(currentDrill.id);
        }
        setLikedDrills(newLiked); // Optimistic

        const { liked: likedState, error } = await toggleDrillLike(user.id, currentDrill.id);

        if (error) {
            console.error('Error toggling like:', error);
            setLikedDrills(likedDrills); // Revert
        } else {
            // Sync localStorage
            let likedList = JSON.parse(localStorage.getItem('liked_drills') || '[]');
            if (likedState) {
                if (!likedList.includes(currentDrill.id)) {
                    likedList.push(currentDrill.id);
                }
            } else {
                likedList = likedList.filter((id: string) => id !== currentDrill.id);
            }
            localStorage.setItem('liked_drills', JSON.stringify(likedList));
        }
    };

    const handleShare = async () => {
        if (!currentDrill) return;
        setShareModalData2({
            title: currentDrill.title,
            text: `Check out this drill: ${currentDrill.title}`,
            url: window.location.href
        });
        setIsShareModalOpen(true);
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

    if (!routine) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <h2 className="text-xl font-bold mb-2">루틴을 찾을 수 없습니다</h2>
            <p className="text-zinc-400 mb-6">삭제되었거나 존재하지 않는 루틴입니다.</p>
            <Button onClick={() => navigate('/arena')} variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800">
                아레나로 돌아가기
            </Button>
        </div>
    );
    if (!currentDrill) return <div className="text-white text-center pt-20">Loading drill...</div>;

    const progress = (completedDrills.size / (routine.drills?.length || 1)) * 100;

    // Theme colors based on routine type

    const accentColor = isCustomRoutine ? 'text-purple-400' : 'text-blue-400';
    const activeBg = isCustomRoutine ? 'bg-purple-600/20' : 'bg-blue-600/20';
    const activeBorder = isCustomRoutine ? 'border-purple-500/50' : 'border-blue-500/50';
    const activeDot = isCustomRoutine ? 'bg-purple-500' : 'bg-blue-500';
    const progressGradient = isCustomRoutine ? 'from-purple-500 to-pink-500' : 'from-blue-500 to-purple-500';
    const buttonGradient = isCustomRoutine
        ? 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-900/20'
        : 'from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 shadow-emerald-900/20';


    // Check if drill is playable
    // 1. Must own the routine OR be premium subscriber OR drill is free
    // 2. Must have a valid video URL (prefer videoUrl for 9:16 format, fallback to vimeoUrl)
    // Helper to extract Vimeo ID
    const extractVimeoId = (url?: string) => {
        if (!url) return undefined;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : undefined;
    };

    // Helper to check if URL is Vimeo
    const isVimeoUrl = (url?: string) => {
        if (!url) return false;
        return url.includes('vimeo.com') || /^\d+$/.test(url);
    };

    const isActionVideo = videoType === 'main';

    // Determine the effective URL to play
    // Priority: 
    // 1. Action: videoUrl (Direct) -> vimeoUrl (Vimeo)
    // 2. Description: descriptionVideoUrl -> videoUrl -> vimeoUrl
    const effectiveUrl = isActionVideo
        ? (currentDrill.videoUrl || currentDrill.vimeoUrl)
        : (currentDrill.descriptionVideoUrl || currentDrill.videoUrl || currentDrill.vimeoUrl);

    // Determine type based on the effective URL
    const isVimeo = isVimeoUrl(effectiveUrl);

    const vimeoId = isVimeo ? extractVimeoId(effectiveUrl) : undefined;
    const directVideoUrl = !isVimeo ? effectiveUrl : undefined;

    const hasVimeo = !!vimeoId;
    const hasDirectVideo = !!directVideoUrl;
    const hasValidVideoUrl = hasDirectVideo || hasVimeo;

    /*
    // Calculate total duration if not provided by backend
    const totalDurationMinutes = useMemo(() => {
        try {
            if (routine?.totalDurationMinutes && routine.totalDurationMinutes > 0) {
                return routine.totalDurationMinutes;
            }

            if (!routine || !routine.drills || !Array.isArray(routine.drills) || routine.drills.length === 0) return 0;

            const totalSeconds = routine.drills.reduce((acc, drill) => {
                if (!drill || typeof drill === 'string') return acc;

                try {
                    // 1. Try numeric durationMinutes
                    if (typeof drill.durationMinutes === 'number') {
                        return acc + (drill.durationMinutes * 60);
                    }

                    // 2. Try parsing string duration (mm:ss)
                    const durationStr = drill.duration || drill.length;
                    if (durationStr && typeof durationStr === 'string' && durationStr.includes(':')) {
                        const parts = durationStr.split(':').map(Number);
                        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                            return acc + (parts[0] * 60 + parts[1]);
                        }
                    }
                } catch (err) {
                    return acc;
                }

                return acc;
            }, 0);

            return Math.ceil(totalSeconds / 60);
        } catch (e) {
            console.error('Error calculating run time:', e);
            return 0;
        }
    }, [routine]);
    */

    // Allow access if:
    // 1. User owns the routine
    // 2. User is a premium subscriber
    // 3. Routine itself is free
    // 4. It is the FIRST drill in the routine (preview)
    const isFirstDrill = currentDrillIndex === 0;
    // Fix: Remove currentDrill.price === 0 check to prevent individual free drills from bypassing routine paywall
    const hasAccess = owns || (isSubscriber && user?.subscription_tier === 'premium') || (routine?.price === 0) || isFirstDrill;
    const isPlayable = hasAccess && hasValidVideoUrl;

    return (
        <div className="h-[calc(100vh-64px)] bg-black flex flex-col md:flex-row overflow-hidden">
            {/* Left: Video Stage */}
            <div className="flex-1 flex items-center justify-center bg-black relative min-h-0">
                {/* Ambient Glow */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[700px] ${isCustomRoutine ? 'bg-purple-500/10' : 'bg-blue-500/10'} blur-[120px] rounded-full`}></div>
                </div>

                {/* Video Player - Full Height 9:16 */}
                <div className="relative h-full w-auto aspect-[9/16] shadow-2xl overflow-hidden ring-1 ring-white/10 max-h-full">
                    {/* Video Type Toggle */}
                    {isPlayable && !isTrainingMode && (
                        <div className="absolute top-6 left-6 z-30 flex gap-2">
                            <button
                                onClick={() => {
                                    setVideoType('main');
                                    setIsPlaying(true);
                                    // Force play after tab switch
                                    setTimeout(() => {
                                        if (videoRef.current) {
                                            videoRef.current.play().catch(() => { });
                                        }
                                    }, 100);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md transition-all ${videoType === 'main'
                                    ? 'bg-white text-black'
                                    : 'bg-black/40 text-white hover:bg-black/60'
                                    }`}
                            >
                                동작
                            </button>
                            <button
                                onClick={() => {
                                    setVideoType('description');
                                    setIsPlaying(true);
                                    // Force play after tab switch
                                    setTimeout(() => {
                                        if (videoRef.current) {
                                            videoRef.current.play().catch(() => { });
                                        }
                                    }, 100);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md transition-all ${videoType === 'description'
                                    ? 'bg-white text-black'
                                    : 'bg-black/40 text-white hover:bg-black/60'
                                    }`}
                            >
                                설명
                            </button>
                        </div>
                    )}

                    {/* Video Click Overlay for Routine Detail */}
                    {!isTrainingMode && isPlayable && (
                        <div
                            onClick={() => {
                                const nextPlaying = !isPlaying;
                                setIsPlaying(nextPlaying);
                                if (isVimeo) {
                                    const iframe = iframeRef.current;
                                    if (iframe && iframe.contentWindow) {
                                        const message = nextPlaying ? '{"method":"play"}' : '{"method":"pause"}';
                                        iframe.contentWindow.postMessage(message, '*');
                                    }
                                } else if (videoRef.current) {
                                    if (nextPlaying) videoRef.current.play();
                                    else videoRef.current.pause();
                                }
                            }}
                            className="w-full h-full cursor-pointer"
                        ></div>
                    )}

                    {/* Draggable Progress Bar (Optional, can be added here) */}

                    {/* Play/Pause Center Icon */}
                    {!isPlaying && !isTrainingMode && isPlayable && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-black/40 p-6 rounded-full backpack-blur-sm pointer-events-none">
                            <PlayCircle className="w-16 h-16 text-white opacity-90" />
                        </div>
                    )}

                    {!isPlayable && (
                        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center">
                            <Lock className="w-16 h-16 text-zinc-500 mb-4" />
                            <h3 className="text-xl font-bold text-white mb-2">잠긴 컨텐츠입니다</h3>
                            <p className="text-zinc-400 mb-6 max-w-sm">
                                이 드릴을 시청하려면 루틴을 구매하거나 멤버십을 구독하세요.
                            </p>
                            <div className="flex gap-3">
                                <Button onClick={handlePurchase} className={`bg-gradient-to-r ${buttonGradient} border-0`}>
                                    {routine?.price === 0 ? '무료로 시작하기' : '구매하기'}
                                </Button>
                                {!user?.isSubscriber && (
                                    <Link to="/pricing">
                                        <Button variant="outline" className="border-zinc-600 text-white hover:bg-zinc-800">
                                            멤버십 구독
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    {hasDirectVideo && videoType === 'main' && (
                        <video
                            key={`${currentDrill.id}-${videoType}`}
                            ref={videoRef}
                            src={directVideoUrl}
                            className="w-full h-full object-cover"
                            loop
                            autoPlay
                            playsInline
                            muted={muted}
                            onTimeUpdate={handleProgress}
                        />
                    )}
                    {hasVimeo && (
                        <>
                            {/* Preload both video types for instant switching */}
                            <div className={videoType === 'main' ? 'block w-full h-full' : 'hidden'}>
                                <VimeoWrapper
                                    key={`${currentDrill.id}-main`}
                                    vimeoId={extractVimeoId(currentDrill.videoUrl || currentDrill.vimeoUrl) || ''}
                                    onProgress={handleProgress}
                                    currentDrillId={currentDrill.id}
                                    videoType="main"
                                />
                            </div>
                            <div className={videoType === 'description' ? 'block w-full h-full' : 'hidden'}>
                                <VimeoWrapper
                                    key={`${currentDrill.id}-description`}
                                    vimeoId={extractVimeoId(currentDrill.descriptionVideoUrl || currentDrill.videoUrl || currentDrill.vimeoUrl) || ''}
                                    onProgress={handleProgress}
                                    currentDrillId={currentDrill.id}
                                    videoType="description"
                                />
                            </div>
                        </>
                    )}

                    {/* Description Video Overlay (if exists and selected) */}
                    {hasDirectVideo && videoType === 'description' && (
                        <video
                            src={currentDrill.descriptionVideoUrl || directVideoUrl} // Fallback to main if no desc video, but logic above handles effective URL
                            className="w-full h-full object-cover"
                            loop
                            playsInline
                            autoPlay
                            controls
                        />
                    )}

                    {/* Training Mode Timer Overlay */}
                    {isTrainingMode && (
                        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center">
                            <div className={`text-6xl font-bold ${accentColor} mb-8 font-mono tracking-widest`}>
                                {formatTime(elapsedSeconds)}
                            </div>
                            <div className="flex flex-col items-center gap-4">
                                <p className="text-zinc-400 animate-pulse">훈련 진행 중...</p>
                                <Button
                                    onClick={handleFinishTraining}
                                    className={`px-12 py-6 text-xl bg-gradient-to-r ${buttonGradient} border-0 rounded-2xl`}
                                >
                                    훈련 완료
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Overlay UI - Match Drill Reels Feed */}
                    {isPlayable && !isTrainingMode && (
                        <div className="absolute right-4 bottom-20 flex flex-col items-center gap-6 z-40 pointer-events-auto pb-8">
                            {/* Like */}
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={handleLikeDrill}
                                    className="text-white hover:text-red-500 transition-colors transform hover:scale-110 active:scale-95 drop-shadow-lg"
                                >
                                    <Heart
                                        className={`w-8 h-8 ${likedDrills.has(currentDrill.id) ? 'fill-red-500 text-red-500' : ''}`}
                                        strokeWidth={1.5}
                                    />
                                </button>
                                <span className="text-xs font-bold text-white shadow-black drop-shadow-md">
                                    {(currentDrill.likes || 0) + (likedDrills.has(currentDrill.id) ? 1 : 0)}
                                </span>
                            </div>

                            {/* Save */}
                            <button
                                onClick={handleSaveDrill}
                                className="text-white hover:text-yellow-400 transition-colors transform hover:scale-110 active:scale-95 drop-shadow-lg"
                                title="나만의 루틴에 저장"
                            >
                                <Bookmark
                                    className={`w-8 h-8 ${savedDrills.has(currentDrill.id) ? 'fill-yellow-400 text-yellow-400' : ''}`}
                                    strokeWidth={1.5}
                                />
                            </button>



                            {/* Mute */}
                            <button
                                onClick={toggleMute}
                                className="text-white hover:text-zinc-300 transition-colors transform hover:scale-110 active:scale-95 drop-shadow-lg"
                            >
                                {muted ? <VolumeX className="w-8 h-8" strokeWidth={1.5} /> : <Volume2 className="w-8 h-8" strokeWidth={1.5} />}
                            </button>

                            {/* Share */}
                            <button
                                onClick={handleShare}
                                className="text-white hover:text-zinc-300 transition-colors transform hover:scale-110 active:scale-95 drop-shadow-lg"
                            >
                                <Share2 className="w-8 h-8" strokeWidth={1.5} />
                            </button>
                        </div>
                    )}
                </div> {/* Video Frame 닫음 (line 766) */}

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30 pointer-events-none">
                    <div className="flex items-end justify-between w-full pointer-events-auto">
                        {/* Left: Info - Metadata Container (Matches Drill Feed STYLE) */}
                        <div className="flex-1 pr-4">
                            <div className="flex flex-row items-center gap-2 mb-2">
                                <span
                                    onClick={navigateToCreator}
                                    className="font-bold text-[15px] text-white text-shadow-sm cursor-pointer hover:underline"
                                >
                                    {routine?.creatorName || 'Instructor'}
                                </span>
                                <span className="text-white/60 text-xs text-shadow-sm leading-none flex items-center mb-0.5">•</span>
                                <button
                                    onClick={handleFollow}
                                    className={`px-3 py-1 rounded-[6px] text-[13px] font-semibold border transition-all active:scale-95 ${isFollowing
                                        ? 'border-white/20 bg-white/10 text-white/60'
                                        : 'border-white/40 bg-transparent text-white hover:bg-white/10'
                                        }`}
                                >
                                    {isFollowing ? '팔로잉' : '팔로우'}
                                </button>
                            </div>

                            <h3 className="font-black text-xl leading-tight text-white text-shadow-md line-clamp-2">
                                {currentDrill.title}
                            </h3>

                            {/* Tags */}
                            {currentDrill.tags && currentDrill.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {currentDrill.tags.slice(0, 3).map((tag: string, idx: number) => (
                                        <span key={idx} className="text-white/80 text-xs drop-shadow-md font-medium">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Progress Indicator - Moved inside here for now or can be moved out */}
                        {owns && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
                                <div
                                    className={`h-full bg-gradient-to-r ${progressGradient} transition-all duration-300`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div> {/* Bottom Info Overlay 닫음 */}
            </div> {/* Video Stage 닫음 */}

            {/* Right: Info Panel - Full Height */}
            <div className="w-full md:w-[420px] bg-black border-l border-white/10 flex flex-col h-1/2 md:h-full flex-shrink-0">
                {/* Header */}
                <div className="p-6 border-b border-white/10 bg-black/80 backdrop-blur-md flex-shrink-0">
                    <div className="flex items-center gap-4 mb-6">
                        <div
                            className="relative cursor-pointer group"
                            onClick={navigateToCreator}
                        >
                            <img
                                src={(routine as any).creatorImage || `https://ui-avatars.com/api/?name=${routine.creatorName}&background=random`}
                                className="w-14 h-14 rounded-full ring-2 ring-zinc-800 object-cover group-hover:ring-white/30 transition-all"
                                alt={routine.creatorName}
                            />
                            <div className={`absolute -bottom-1 -right-1 ${isCustomRoutine ? 'bg-purple-500' : 'bg-blue-500'} text-[9px] text-white px-1.5 py-0.5 rounded shadow-lg font-black tracking-tighter`}>
                                {isCustomRoutine ? 'ME' : 'PRO'}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3
                                onClick={navigateToCreator}
                                className="text-white font-bold text-lg tracking-tight truncate cursor-pointer hover:underline"
                            >
                                {routine.creatorName}
                            </h3>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded tracking-wider uppercase">INSTRUCTOR</span>
                            </div>
                        </div>
                    </div>

                    {/* Routine Title & Save Action */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                            <h2 className="text-2xl font-black text-white truncate">{routine.title}</h2>
                            <button
                                onClick={handleSaveRoutine}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all active:scale-95 text-xs font-bold ${owns
                                    ? 'bg-blue-500/10 border-blue-500/50 text-blue-400'
                                    : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                                    }`}
                            >
                                <Bookmark className={`w-3.5 h-3.5 ${owns ? 'fill-blue-500' : ''}`} />
                                <span>{owns ? '담김' : '내 라이브러리에 담기'}</span>
                            </button>
                        </div>
                        {isCompletedToday && (
                            <div className="flex items-center gap-1.5 bg-green-500/20 text-green-400 px-3 py-1 rounded-full border border-green-500/30 shrink-0">
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
                        {totalDurationMinutes > 0 && (
                            <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{totalDurationMinutes}분</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Scrollable Content - Drill List */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {/* Current Drill Info */}
                    {!isTrainingMode && (
                        <div className="p-6 border-b border-zinc-900">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${accentColor}`}>현재 재생중</span>
                                    <span className="text-xs text-zinc-500">드릴 {currentDrillIndex + 1}/{routine.drills?.length || 0}</span>
                                </div>
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
                                // Allow playing if: owned, premium, free, or FIRST drill
                                const isDrillPlayable = owns || (isSubscriber && user?.subscription_tier === 'premium') || drillData?.price === 0 || index === 0;

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
                                            {drillData?.duration && drillData.duration !== '0:00' && (
                                                <p className="text-xs text-zinc-500">{drillData.duration}</p>
                                            )}
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
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-zinc-500 text-xs font-medium">단품 구매</span>
                                <span className="text-green-500 font-black text-sm">{routine.price === 0 ? '무료' : `₩${routine.price.toLocaleString()}`}</span>
                            </div>
                            <Button
                                onClick={routine.price === 0 ? handleSaveRoutine : handlePurchase}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all"
                            >
                                내 라이브러리에 담기
                            </Button>
                            <Link to="/pricing" className="w-full">
                                <Button
                                    variant="outline"
                                    className="w-full border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 py-3 rounded-xl text-sm"
                                >
                                    구독하고 전체 클래스 보기
                                </Button>
                            </Link>
                        </div>
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

            {/* Share Modal for Drill */}
            {isShareModalOpen && shareModalData2 && currentDrill && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    title={shareModalData2.title}
                    text={shareModalData2.text}
                    url={shareModalData2.url}
                    imageUrl={currentDrill.thumbnailUrl}
                />
            )}

            {/* Share Modal for Routine */}
            {isShareModalOpen && !shareModalData2 && routine && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    title={routine.title}
                    text={routine.description || `Check out this routine: ${routine.title}`}
                    url={window.location.href}
                    imageUrl={routine.thumbnailUrl}
                />
            )}
        </div>
    );
};
