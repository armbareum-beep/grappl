import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getRoutineById, checkDrillRoutineOwnership, getDrillById, createTrainingLog, getCompletedRoutinesToday, awardTrainingXP, toggleDrillLike, toggleDrillSave, getUserLikedDrills, getUserSavedDrills, recordWatchTime, getRelatedCourseByCategory, getRelatedRoutines, incrementRoutineView, recordDrillView, toggleRoutineSave, checkRoutineSaved } from '../lib/api';
import { Drill, DrillRoutine, Course } from '../types';
import { Button } from '../components/Button';
import { ChevronLeft, Heart, Bookmark, Share2, Play, Lock, Volume2, VolumeX, List, ListVideo, Zap, MessageCircle, X, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';
import ShareModal from '../components/social/ShareModal';
import { useAuth } from '../contexts/AuthContext';
import { useWakeLock } from '../hooks/useWakeLock';
import { VideoPlayer } from '../components/VideoPlayer';
import { cn } from '../lib/utils';
import { useToast } from '../components/ui/use-toast';
import { supabase } from '../lib/supabase';
import { ReelLoginModal } from '../components/auth/ReelLoginModal';

// Internal component for Vimeo tracking (Removed - integrated into VideoPlayer)


export const RoutineDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const playlistParam = searchParams.get('playlist');
    const playlist = useMemo(() => playlistParam ? playlistParam.split(',') : [], [playlistParam]);
    const { user, loading: authLoading, isSubscribed } = useAuth();

    // Playback Refs
    const [isPlaying, setIsPlaying] = useState(true);
    useWakeLock(isPlaying);
    const [routine, setRoutine] = useState<DrillRoutine | null>(null);
    const [relatedCourse, setRelatedCourse] = useState<Course | null>(null);
    const [relatedRoutines, setRelatedRoutines] = useState<DrillRoutine[]>([]);
    const [currentDrillIndex, setCurrentDrillIndex] = useState(0);
    const [currentDrill, setCurrentDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [dailyFreeDrillId, setDailyFreeDrillId] = useState<string | null>(null);
    const [muted, setMuted] = useState(true);

    const toggleMute = () => setMuted(prev => !prev);

    // Completion & Sharing State
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareModalData2, setShareModalData2] = useState<{ title: string; text: string; url: string } | null>(null);
    const [completedDrills, setCompletedDrills] = useState<Set<string>>(new Set());
    const [streak, setStreak] = useState(0);
    const [xpEarned, setXpEarned] = useState(0);
    const [bonusReward, setBonusReward] = useState<{ type: 'xp_boost' | 'badge' | 'unlock'; value: string } | undefined>(undefined);

    // Timer State
    const [isTrainingMode, setIsTrainingMode] = useState(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    // Saved Drills State
    const [savedDrills, setSavedDrills] = useState<Set<string>>(new Set());
    const [likedDrills, setLikedDrills] = useState<Set<string>>(new Set());
    const [isRoutineSaved, setIsRoutineSaved] = useState(false);

    // UI state
    const [videoType, setVideoType] = useState<'main' | 'description'>('main');
    const [isFollowing, setIsFollowing] = useState(false);
    const [showMobileList, setShowMobileList] = useState(false);
    const [viewMode, setViewMode] = useState<'landing' | 'player'>('landing');
    const [currentTime, setCurrentTime] = useState(0);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Check Routine Save Status
    useEffect(() => {
        const checkSaveStatus = async () => {
            if (user && routine) {
                const saved = await checkRoutineSaved(user.id, routine.id);
                setIsRoutineSaved(saved);
            }
        };
        checkSaveStatus();
    }, [user, routine]);

    // Swipe State
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number, y: number } | null>(null);

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const minSwipeDistance = 50;
        const isHorizontal = Math.abs(distanceX) > Math.abs(distanceY);

        if (isHorizontal && Math.abs(distanceX) > minSwipeDistance) {
            // Horizontal: Change Description/Video
            setVideoType(prev => prev === 'main' ? 'description' : 'main');
        } else if (!isHorizontal && Math.abs(distanceY) > minSwipeDistance) {
            // Vertical: Up -> Next Drill, Down -> Previous (or nothing)
            if (distanceY > 0) { // Swipe Up
                handleDrillComplete();
            }
        }
    };

    // Mouse handlers for desktop support
    const onMouseDown = (e: React.MouseEvent) => {
        setTouchEnd(null);
        setTouchStart({ x: e.clientX, y: e.clientY });
    };

    const onMouseMove = (e: React.MouseEvent) => {
        if (touchStart) {
            setTouchEnd({ x: e.clientX, y: e.clientY });
        }
    };

    const onMouseUp = () => {
        if (touchStart) {
            onTouchEnd();
            setTouchStart(null);
            setTouchEnd(null);
        }
    };

    // Interaction Layer Click Handler & State
    const [showInteractHeart, setShowInteractHeart] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleLayerClick = () => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            handleLikeDrill();
            setShowInteractHeart(true);
            setTimeout(() => setShowInteractHeart(false), 1000);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                setIsPlaying(prev => !prev);
            }, 300);
        }
    };

    const navigateToCreator = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (routine?.creatorId) navigate(`/creator/${routine.creatorId}`);
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) { navigate('/login'); return; }
        if (!routine?.creatorId) return;
        try {
            const { toggleCreatorFollow } = await import('../lib/api');
            const { followed } = await toggleCreatorFollow(user.id, routine.creatorId);
            setIsFollowing(followed);
        } catch (error) { console.error('Error toggling follow:', error); }
    };

    // Prevent scrolling when in player mode
    useEffect(() => {
        if (viewMode === 'player') {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100vh';
        } else {
            document.body.style.overflow = '';
            document.body.style.height = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
        };
    }, [viewMode]);

    // Watch time recording
    const lastTickRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);

    const handleProgress = async (seconds: number) => {
        setCurrentTime(seconds);
        if (!user || owns || !isSubscribed || !currentDrill) return;
        const now = Date.now();
        if (lastTickRef.current === 0) { lastTickRef.current = now; return; }
        const elapsed = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;
        if (elapsed > 0 && elapsed < 5) accumulatedTimeRef.current += elapsed;
        if (accumulatedTimeRef.current >= 10) {
            const timeToSend = Math.floor(accumulatedTimeRef.current);
            accumulatedTimeRef.current -= timeToSend;
            try { await recordWatchTime(user.id, timeToSend, currentDrill.id); } catch (e) { console.warn('Failed to record watch time:', e); }
        }
    };

    const totalDurationMinutes = useMemo(() => {
        if (routine?.totalDurationMinutes && routine.totalDurationMinutes > 0) return routine.totalDurationMinutes;
        if (!routine?.drills?.length) return 0;
        const totalSeconds = routine.drills.reduce((acc, drill) => {
            if (!drill || typeof drill === 'string') return acc;
            try {
                if (typeof drill.durationMinutes === 'number') return acc + (drill.durationMinutes * 60);
                const durationStr = drill.duration || drill.length;
                if (durationStr && typeof durationStr === 'string' && durationStr.includes(':')) {
                    const parts = durationStr.split(':').map(Number);
                    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return acc + (parts[0] * 60 + parts[1]);
                }
            } catch (err) { }
            return acc;
        }, 0);
        return Math.ceil(totalSeconds / 60);
    }, [routine]);


    useEffect(() => {
        if (authLoading) return;

        const loadRoutineAndPermissions = async () => {
            if (!id) return;
            try {
                // 1. Fetch Routine
                const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
                const found = customRoutines.find((r: any) => r.id === id);
                if (found) {
                    setRoutine(found);
                    setOwns(true);
                    setLoading(false);
                    return;
                }

                const { data: routineData } = await getRoutineById(id);
                if (routineData) {
                    if (!routineData.drills && (routineData as any).items) {
                        routineData.drills = (routineData as any).items;
                    }
                    setRoutine(routineData);

                    // Fetch similar routines
                    if (routineData.category) {
                        getRelatedRoutines(id, routineData.category).then(({ data: routines }) => {
                            if (routines) setRelatedRoutines(routines);
                        });
                    }
                }

                // 2. Check Ownership & Progress
                if (user) {
                    if (id.startsWith('custom-')) {
                        setOwns(true);
                    } else {
                        let isOwned = await checkDrillRoutineOwnership(user.id, id);

                        if (isOwned) setOwns(true);

                        await getCompletedRoutinesToday(user.id);
                    }
                }


                // Check daily free drill
                try {
                    const { getDailyFreeDrill } = await import('../lib/api');
                    const { data: dailyDrill } = await getDailyFreeDrill();
                    if (dailyDrill) {
                        setDailyFreeDrillId(dailyDrill.id);
                    }
                } catch (e) {
                    console.warn('Failed to check daily free drill:', e);
                }

                // Increment view count
                if (!id.startsWith('custom-')) {
                    incrementRoutineView(id);
                }
            } catch (error) {
                console.error('Error in RoutineDetail load:', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadRoutineAndPermissions();
        }
    }, [id, authLoading, user]);

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
                } catch (error) { console.error('Error loading interactions:', error); }
            }
        };
        loadUserInteractions();
    }, [user]);

    useEffect(() => {
        if (routine?.drills?.length) {
            const loadDrill = async (index: number) => {
                if (!routine?.drills || index >= routine.drills.length) return;
                const drill = routine.drills[index];

                // Check if we have a valid drill object locally
                if (typeof drill !== 'string' && (drill.videoUrl || drill.vimeoUrl)) {
                    setCurrentDrill(drill);
                    return;
                }

                // If it's a string ID or an object without video URL, fetch fresh data
                const drillId = typeof drill === 'string' ? drill : drill.id;
                try {
                    const drillData = await getDrillById(drillId);
                    if (drillData && !('error' in drillData)) {
                        setCurrentDrill(drillData as Drill);
                        return;
                    }
                } catch (e) {
                    // Fallback to existing object if fetch fails
                    if (typeof drill !== 'string') setCurrentDrill(drill);
                }
            };
            loadDrill(currentDrillIndex);
        }
    }, [routine, currentDrillIndex]);

    // Record history for Recent Activity
    useEffect(() => {
        if (user && currentDrill && currentDrill.id) {
            recordDrillView(user.id, currentDrill.id).catch(console.error);
        }
    }, [user?.id, currentDrill?.id]);

    useEffect(() => {
        if (isTrainingMode) {
            const interval = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
            return () => clearInterval(interval);
        }
    }, [isTrainingMode]);

    useEffect(() => {
        const checkFollow = async () => {
            if (user && routine?.creatorId) {
                const { checkCreatorFollowStatus } = await import('../lib/api');
                setIsFollowing(await checkCreatorFollowStatus(user.id, routine.creatorId));
            }
        };
        checkFollow();
    }, [user, routine?.creatorId]);

    useEffect(() => {
        const loadRelatedCourse = async () => {
            if (routine?.drills?.length) {
                // Try to find a category from the first drill
                const firstDrill = routine.drills[0];
                const category = (typeof firstDrill !== 'string') ? firstDrill.category : null;

                if (category) {
                    const course = await getRelatedCourseByCategory(category);
                    if (course) setRelatedCourse(course);
                }
            }
        };
        loadRelatedCourse();
    }, [routine]);

    const handlePurchase = () => {
        if (!user) { navigate('/login'); return; }
        if (routine) navigate(`/checkout/routine/${routine.id}`);
    };



    const handleDrillComplete = () => {
        if (!currentDrill) return;
        const newCompleted = new Set(completedDrills);
        newCompleted.add(currentDrill.id);
        setCompletedDrills(newCompleted);
        if (currentDrillIndex < (routine?.drills?.length || 0) - 1) setCurrentDrillIndex(currentDrillIndex + 1);
        else setIsTrainingMode(true);
    };

    const handleFinishTraining = async () => {
        setIsTrainingMode(false);
        const durationMinutes = Math.ceil(elapsedSeconds / 60);
        let xpEarnedToday = 0; let currentStreak = 0; let bonusXp = 0;
        if (user) {
            await createTrainingLog({ userId: user.id, userName: user.user_metadata?.name || 'Unknown', date: new Date().toISOString().split('T')[0], durationMinutes, notes: `[Routine Completed] ${routine?.title}`, techniques: routine?.drills?.map(d => typeof d === 'string' ? '' : d.title).filter(Boolean) || [], isPublic: true, location: 'Gym', metadata: { routineId: routine?.id, durationSeconds: elapsedSeconds }, sparringRounds: 0, type: 'routine' });
            const xpResult = await awardTrainingXP(user.id, 'routine_complete', 50);
            if (xpResult.data) { xpEarnedToday = xpResult.data.xpEarned; currentStreak = xpResult.data.streak; bonusXp = xpResult.data.bonusXP; }
            setStreak(currentStreak); setXpEarned(xpEarnedToday);
            if (bonusXp > 0) setBonusReward({ type: 'xp_boost', value: `${currentStreak}일 연속 보너스 +${bonusXp} XP` });
        }
        setShowQuestComplete(true);
    };

    const handleNextRoutine = () => {
        if (!id) return;
        const currentIndex = playlist.indexOf(id);
        if (currentIndex !== -1 && currentIndex < playlist.length - 1) {
            const nextId = playlist[currentIndex + 1];
            setShowQuestComplete(false);
            setCurrentDrillIndex(0);
            setCompletedDrills(new Set());
            setElapsedSeconds(0);
            setViewMode('landing');
            navigate(`/my-routines/${nextId}?playlist=${playlistParam}`);
        } else {
            setShowQuestComplete(false);
        }
    };

    const handleSaveDrill = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!currentDrill || !user) { navigate('/login'); return; }
        const isSaved = savedDrills.has(currentDrill.id);
        const newSaved = new Set(savedDrills);
        isSaved ? newSaved.delete(currentDrill.id) : newSaved.add(currentDrill.id);
        setSavedDrills(newSaved);
        await toggleDrillSave(user.id, currentDrill.id);
    };

    const handleSaveRoutine = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!routine || !user) { navigate('/login'); return; }
        setIsRoutineSaved(!isRoutineSaved);
        await toggleRoutineSave(user.id, routine.id);
    };

    const handleLikeDrill = async (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (!currentDrill || !user) { navigate('/login'); return; }
        const isLiked = likedDrills.has(currentDrill.id);
        const newLiked = new Set(likedDrills);
        isLiked ? newLiked.delete(currentDrill.id) : newLiked.add(currentDrill.id);
        setLikedDrills(newLiked);
        await toggleDrillLike(user.id, currentDrill.id);
    };

    const handleShare = () => {
        if (!currentDrill) return;
        setShareModalData2({ title: currentDrill.title, text: `Check out: ${currentDrill.title}`, url: window.location.href });
        setIsShareModalOpen(true);
    };

    const handleDrillSelect = (index: number) => {
        // Allow selecting any drill - access control happens at video type level
        setCurrentDrillIndex(index);
        // Reset to action video when switching drills
        setVideoType('main');
    };

    const handleStartRoutine = () => {
        // Always allow starting routine - access control happens at video type level
        if (routine?.drills?.length) {
            setViewMode('player');
            if (currentDrillIndex === -1) setCurrentDrillIndex(0);
            // Start with action video
            setVideoType('main');
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;

    // If routine exists but currentDrill is not yet set (and routine has drills), show loading
    if (routine && !currentDrill && routine.drills && routine.drills.length > 0) {
        return <div className="flex items-center justify-center min-h-screen bg-black"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" /></div>;
    }

    if (!routine || !currentDrill) return <div className="text-white text-center pt-20">Routine not found</div>;

    const progressPercent = (completedDrills.size / (routine?.drills?.length || 1)) * 100;



    const effectiveUrl = videoType === 'main' ? (currentDrill.videoUrl || currentDrill.vimeoUrl) : (currentDrill.descriptionVideoUrl || currentDrill.videoUrl || currentDrill.vimeoUrl);
    const isCustomRoutine = String(routine?.id || '').startsWith('custom-');
    const isActionVideo = videoType === 'main';

    // Description videos require subscription or ownership (or daily free drill)
    const isDailyFreeDrill = currentDrill?.id === dailyFreeDrillId;
    const hasDescriptionAccess =
        isSubscribed ||
        (!isCustomRoutine && (owns || routine?.price === 0)) ||
        currentDrill?.price === 0 ||
        isDailyFreeDrill;

    // Action videos are ALWAYS accessible (even for non-logged-in users)
    // Description videos require hasDescriptionAccess
    const hasAccess = isActionVideo || hasDescriptionAccess;

    // Full access means the user owns the routine, is subscribed, or the routine is free
    const hasFullAccess = isSubscribed || owns || routine?.price === 0;


    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="lg:relative bg-zinc-950 min-h-screen relative overflow-hidden">
            {/* MOBILE VIEW */}
            <div className="lg:hidden w-full min-h-screen flex flex-col bg-zinc-950 pb-0">
                {viewMode === 'landing' ? (
                    <>
                        {/* Mobile Landing Header */}
                        <div className="relative w-full pt-20 pb-12 flex flex-col items-center justify-center overflow-hidden">
                            {/* Routine Thumbnail Background */}
                            {routine.thumbnailUrl && (
                                <div className="absolute inset-0 z-0 scale-110">
                                    <img src={routine.thumbnailUrl} className="w-full h-full object-cover blur-2xl opacity-40" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-zinc-950/80 to-zinc-950" />
                                </div>
                            )}

                            <button onClick={() => navigate(-1)} className="absolute top-6 left-4 z-[100] p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all border border-white/10 shadow-xl"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={handleSaveRoutine} className="absolute top-6 right-4 z-[100] p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all border border-white/10 shadow-xl">
                                <Bookmark className={cn("w-5 h-5 transition-all", isRoutineSaved ? "fill-violet-500 text-violet-500" : "text-white")} />
                            </button>

                            <h1 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[18vw] font-black uppercase tracking-tighter text-white/5 whitespace-nowrap select-none pointer-events-none z-0">DRILL</h1>
                            <div className="relative z-10 flex flex-col items-center text-center gap-4 px-4">
                                <h2 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-2xl leading-tight">{routine.title}</h2>
                                <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-zinc-800 shadow-xl text-xs">
                                    <div className="flex items-center gap-1.5 text-violet-400"><List className="w-3 h-3" /><span className="font-bold">{routine.drills?.length} Drills</span></div>
                                    <div className="w-px h-3 bg-zinc-800" /><div className="flex items-center gap-1.5 text-violet-400"><Clock className="w-3 h-3" /><span className="font-bold">{totalDurationMinutes} Mins</span></div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Curriculum */}
                        <div className="flex-1 px-4 space-y-4">
                            <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2"><ListVideo className="w-4 h-4 text-violet-500" />Curriculum</h3>
                            <div className="space-y-3">
                                {routine.drills?.map((drill, idx) => {
                                    const d = typeof drill === 'string' ? null : drill;
                                    return (
                                        <div key={idx} onClick={() => { if (hasFullAccess || d?.id === dailyFreeDrillId) { setCurrentDrillIndex(idx); setViewMode('player'); setVideoType('main'); } else { handlePurchase(); } }} className="flex gap-4 bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-2xl items-center active:bg-zinc-800/50 transition-colors cursor-pointer">
                                            <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-800/50">
                                                {d?.thumbnailUrl && <img src={d.thumbnailUrl} className="w-full h-full object-cover" />}
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                    <PlayCircle className="w-5 h-5 text-white/80" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-zinc-200 truncate">{d?.title || `Drill ${idx + 1}`}</h4>
                                                    {d?.id === dailyFreeDrillId && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold flex items-center gap-1 shrink-0">
                                                            <Clock className="w-2.5 h-2.5" /> 오늘의 무료
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{d?.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                        </div>


                        {/* Mobile Access Pass / Bottom Section */}
                        <div className="w-full px-4 pt-12 pb-20">
                            <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
                                {hasFullAccess ? (
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Access Pass</span>
                                            <span className="text-2xl font-black text-white">Owned</span>
                                        </div>
                                        <button
                                            onClick={handleStartRoutine}
                                            className="flex-1 bg-violet-600 active:bg-violet-700 text-white rounded-2xl py-3.5 font-black text-base shadow-[0_4px_12px_rgba(124,58,237,0.3)] flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-5 h-5 fill-current" /> 시작하기
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center justify-between px-2 mb-1">
                                            <span className="text-[10px] font-extrabold text-zinc-500 uppercase tracking-widest">Access Pass</span>
                                            <span className="text-xl font-black text-white">{routine.price === 0 ? 'Free' : `₩${routine.price.toLocaleString()}`}</span>
                                        </div>
                                        <div className="flex flex-col gap-3">
                                            <button
                                                onClick={handlePurchase}
                                                className="w-full bg-white active:bg-zinc-200 text-black rounded-2xl py-4 font-black text-base shadow-lg shadow-white/5 flex items-center justify-center gap-2"
                                            >
                                                <Lock className="w-5 h-5" /> 루틴 구매하기
                                            </button>
                                            <button
                                                onClick={() => navigate('/pricing')}
                                                className="w-full bg-violet-600 active:bg-violet-700 text-white rounded-2xl py-4 font-black text-base shadow-lg shadow-violet-900/40 flex items-center justify-center gap-2"
                                            >
                                                <Zap className="w-5 h-5 fill-current" /> 멤버십 구독하고 전체 시청하기
                                            </button>
                                        </div>
                                    </>
                                )}

                                {relatedCourse && (
                                    <div
                                        onClick={() => navigate(`/courses/${relatedCourse.id}`)}
                                        className="bg-zinc-800/50 backdrop-blur-sm border border-white/5 p-3 rounded-2xl relative overflow-hidden cursor-pointer active:scale-95 transition-transform mt-2"
                                    >
                                        <div className="relative z-10 flex gap-3 items-center">
                                            <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-white/10 shadow-lg">
                                                {relatedCourse.thumbnailUrl && <img src={relatedCourse.thumbnailUrl} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-[9px] font-bold text-violet-400 uppercase tracking-wider mb-0.5 flex items-center gap-1">
                                                    <Zap className="w-2.5 h-2.5" /> Related Course
                                                </div>
                                                <h4 className="text-xs font-bold text-white leading-tight line-clamp-1">{relatedCourse.title}</h4>
                                                <p className="text-[10px] text-zinc-500 line-clamp-1">심화 과정을 통해 완벽하게 마스터하세요</p>
                                            </div>
                                            <ChevronLeft className="w-4 h-4 text-zinc-500 rotate-180" />
                                        </div>
                                    </div>
                                )}

                                {relatedRoutines.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">More Routines Like This</span>
                                        </div>
                                        <div className="space-y-2">
                                            {relatedRoutines.slice(0, 3).map(r => (
                                                <div
                                                    key={r.id}
                                                    onClick={() => navigate(`/routines/${r.id}`)}
                                                    className="flex items-center gap-3 p-2 rounded-xl bg-zinc-800/30 border border-white/5 active:bg-zinc-800/50 transition-colors cursor-pointer"
                                                >
                                                    <div className="w-12 aspect-video rounded-lg overflow-hidden bg-zinc-900 shrink-0">
                                                        {r.thumbnailUrl && <img src={r.thumbnailUrl} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-[11px] font-bold text-zinc-200 truncate">{r.title}</h4>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[9px] text-zinc-500">{r.drillCount} Drills</span>
                                                            <span className="text-[9px] text-violet-400 font-bold">{r.difficulty}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronLeft className="w-3.5 h-3.5 text-zinc-600 rotate-180" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="w-full h-full fixed inset-0 z-50 bg-black overflow-hidden">
                        {/* Top-Left Group: Back Button & Toggles */}
                        <div className="absolute top-6 left-4 z-[250] pointer-events-none">
                            <div className="flex flex-col gap-3 items-start pointer-events-auto">
                                <button
                                    onClick={() => setViewMode('landing')}
                                    className="p-2 md:p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all"
                                >
                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                </button>

                                {/* Video Type Toggle (Vertical) */}
                                <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                    <button
                                        onClick={() => setVideoType('main')}
                                        className={`p-2 md:p-2.5 rounded-full transition-all ${videoType === 'main' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        <Zap className="w-5 h-5 md:w-6 md:h-6" fill={videoType === 'main' ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (hasDescriptionAccess) {
                                                setVideoType('description');
                                            } else {
                                                handlePurchase();
                                            }
                                        }}
                                        className={`p-2 md:p-2.5 rounded-full transition-all relative ${videoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        <MessageCircle className="w-5 h-5 md:w-6 md:h-6" fill={videoType === 'description' ? "currentColor" : "none"} />
                                        {!hasDescriptionAccess && <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-white" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Mobile Player Content */}
                        <div className="relative w-full h-full bg-black flex flex-col">
                            {/* Video Layer */}
                            <div className="absolute inset-0 z-0">
                                {hasAccess ? (
                                    <>
                                        <VideoPlayer
                                            vimeoId={effectiveUrl || ''}
                                            title={currentDrill.title}
                                            autoplay={true}
                                            playing={isPlaying}
                                            showControls={false}
                                            fillContainer={true}
                                            onProgress={handleProgress}
                                            onEnded={() => handleDrillComplete()}
                                            maxPreviewDuration={user ? undefined : 10}
                                            onPreviewLimitReached={() => setIsLoginModalOpen(true)}
                                            isPaused={isLoginModalOpen}
                                        />
                                        <div
                                            className="absolute inset-0 z-10"
                                            onTouchStart={onTouchStart}
                                            onTouchMove={onTouchMove}
                                            onTouchEnd={onTouchEnd}
                                            onMouseDown={onMouseDown}
                                            onMouseMove={onMouseMove}
                                            onMouseUp={onMouseUp}
                                            onMouseLeave={onMouseUp}
                                            onClick={handleLayerClick}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 pointer-events-none" />
                                            {/* Like Animation Heart */}
                                            {showInteractHeart && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <Heart
                                                        className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                                                        style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center">
                                        <div className="mb-6 relative">
                                            <div className="absolute -inset-4 bg-violet-500/20 blur-xl rounded-full"></div>
                                            <Lock className="w-12 h-12 text-zinc-400 relative z-10" />
                                        </div>
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-2">Access Needed</span>
                                        <h3 className="text-2xl font-black text-white mb-2">루틴 구매 또는 구독이 필요합니다</h3>
                                        <p className="text-sm text-zinc-400 font-medium mb-8 max-w-[280px] leading-relaxed">
                                            전체 드릴을 시청하려면 루틴을 소유하거나 멤버십을 구독하세요.
                                        </p>
                                        <div className="flex flex-col w-full gap-3">
                                            <Button onClick={handlePurchase} className="bg-white hover:bg-zinc-200 text-black rounded-2xl py-4 font-black shadow-lg shadow-white/5 active:scale-95 text-lg">
                                                ₩{routine.price.toLocaleString()}에 해제하기
                                            </Button>
                                            <Button onClick={() => navigate('/pricing')} className="bg-violet-600 hover:bg-violet-500 text-white rounded-2xl py-4 font-black shadow-lg shadow-violet-900/40 active:scale-95 text-lg flex items-center justify-center gap-2">
                                                <Zap className="w-5 h-5 fill-current" /> 멤버십 구독하기
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side Actions - Unified Container (Top: Mute/List, Bottom: Like/Save/Share) */}
                            <div className="absolute top-0 bottom-0 right-4 z-40 flex flex-col justify-between py-6 pointer-events-auto">
                                {/* Top Actions: Mute & List */}
                                <div className="flex flex-col gap-3 items-center">
                                    <button onClick={toggleMute} className="p-2 md:p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all">
                                        {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                    </button>
                                    <button onClick={() => setShowMobileList(true)} className="p-2 md:p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all">
                                        <List className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>
                                </div>

                                {/* Bottom Actions: Like, Save, Share */}
                                <div className="flex flex-col gap-3 items-center pb-48">
                                    {/* Like */}
                                    <div className="flex flex-col items-center gap-0.5">
                                        <button onClick={handleLikeDrill} className="p-2 md:p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90">
                                            <Heart className={`w-5 h-5 md:w-7 md:h-7 ${likedDrills.has(currentDrill.id) ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                        </button>
                                        <span className="text-[10px] font-medium text-zinc-200">{(currentDrill.likes || 0).toLocaleString()}</span>
                                    </div>

                                    {/* Save */}
                                    <button onClick={handleSaveDrill} className="p-2 md:p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90">
                                        <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${savedDrills.has(currentDrill.id) ? 'fill-zinc-100' : ''}`} />
                                    </button>


                                    {/* Share */}
                                    <button onClick={handleShare} className="p-2 md:p-2.5 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90">
                                        <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>


                                </div>
                            </div>

                            {/* Bottom Content & Info */}
                            <div className="absolute inset-x-0 bottom-0 z-30 pointer-events-none p-4 pb-12 flex flex-col justify-end bg-gradient-to-t from-black via-black/60 to-transparent pt-24">
                                <div className="flex items-end justify-between pointer-events-auto mb-4">
                                    <div className="flex-1 pr-16">
                                        <h2 className="text-2xl font-bold text-white mb-2">{currentDrill.title}</h2>
                                        <div className="flex items-center gap-2 text-zinc-300 text-sm">
                                            <span className="bg-white/20 px-2 py-0.5 rounded text-xs">{currentDrillIndex + 1} / {routine?.drills?.length}</span>
                                            <span>•</span><span>{currentDrill.duration || '1분'}</span>
                                        </div>
                                    </div>
                                </div>
                                <Button size="lg" onClick={handleDrillComplete} className="w-full bg-violet-600 active:bg-violet-700 hover:bg-violet-500 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 pointer-events-auto shadow-[0_4px_12px_rgba(124,58,237,0.3)] transition-colors"><CheckCircle className="w-5 h-5" /><span>드릴 완료 & 다음으로</span></Button>
                            </div>

                            {/* Mobile List Overlay */}
                            {showMobileList && (
                                <div className="absolute inset-0 z-[300] bg-black/95 backdrop-blur-xl animate-in slide-in-from-bottom flex flex-col">
                                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center"><h3 className="text-white font-bold">루틴 목록</h3><button onClick={() => setShowMobileList(false)}><X className="w-6 h-6 text-white" /></button></div>
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                        {routine?.drills?.map((d: any, idx) => (
                                            <div key={idx} onClick={() => { handleDrillSelect(idx); setShowMobileList(false); }} className={`p-3 rounded-xl flex items-center gap-4 transition-all cursor-pointer ${idx === currentDrillIndex ? 'bg-violet-600/10 border border-violet-500/30' : 'bg-zinc-900/50 border border-transparent'}`}>
                                                <div className="w-20 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
                                                    <img src={d.thumbnailUrl} className="w-full h-full object-cover" />
                                                </div>
                                                <span className={`text-sm font-bold truncate ${idx === currentDrillIndex ? 'text-violet-400' : 'text-zinc-400'}`}>{d.title}</span>
                                                {completedDrills.has(d.id) && <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* DESKTOP VIEW */}
            <div className={`hidden lg:block w-full ${viewMode === 'player' ? 'h-[calc(100vh-80px)] overflow-hidden' : 'min-h-screen'} pl-28 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-zinc-950/80 to-zinc-950`}>
                {viewMode === 'landing' ? (
                    <div className="flex flex-col w-full pb-20 max-w-7xl mx-auto">
                        <button onClick={() => navigate(-1)} className="fixed top-6 left-6 z-[100] p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 transition-all group hover:bg-black/60 shadow-2xl"><ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /></button>
                        <button onClick={handleSaveRoutine} className="fixed top-6 left-20 z-[100] p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 transition-all group hover:bg-black/60 shadow-2xl ml-4">
                            <Bookmark className={cn("w-5 h-5 transition-all", isRoutineSaved ? "fill-violet-500 text-violet-500" : "text-white")} />
                        </button>
                        {/* Hero Section */}
                        <div className="relative w-full pt-20 pb-16 flex flex-col items-center justify-center overflow-hidden">
                            {/* Routine Thumbnail Background */}
                            {routine.thumbnailUrl && (
                                <div className="absolute inset-0 z-0 scale-110">
                                    <img src={routine.thumbnailUrl} className="w-full h-full object-cover blur-3xl opacity-30" />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/60 to-zinc-950" />
                                </div>
                            )}
                            <h1 className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10vw] font-black uppercase tracking-tighter text-white/5 whitespace-nowrap select-none pointer-events-none z-0">DRILL ROUTINE</h1>
                            <div className="relative z-10 flex flex-col items-center text-center gap-6 px-4">
                                <h2 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white drop-shadow-2xl max-w-5xl leading-tight mb-4">{routine.title}</h2>
                                <div className="flex items-center gap-3 bg-zinc-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-zinc-800 shadow-xl">
                                    <div className="flex items-center gap-2 text-violet-400"><List className="w-4 h-4" /><span className="font-bold">{routine.drills?.length} Drills</span></div>
                                    <div className="w-px h-4 bg-zinc-800" /><div className="flex items-center gap-2 text-violet-400"><Clock className="w-4 h-4" /><span className="font-bold">{totalDurationMinutes} Mins</span></div>
                                </div>
                                <div onClick={navigateToCreator} className="mt-6 flex items-center gap-3 bg-zinc-900/50 hover:bg-zinc-800/50 backdrop-blur-sm pr-6 pl-2 py-2 rounded-full border border-zinc-800/50 cursor-pointer transition-all">
                                    <img src={routine.creatorProfileImage || `https://ui-avatars.com/api/?name=${routine.creatorName}`} className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/20" />
                                    <span className="text-zinc-300 font-bold">{routine.creatorName}</span>
                                </div>
                            </div>
                        </div>
                        {/* Main Grid */}
                        <div className="max-w-7xl mx-auto w-full px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 z-10">
                            <div className="lg:col-span-8 space-y-6">


                                <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-6">
                                    <h3 className="text-xl font-semibold text-zinc-100 mb-6 flex items-center gap-2"><ListVideo className="w-5 h-5 text-violet-500" />Routine Curriculum</h3>
                                    <div className="flex flex-col gap-4">
                                        {routine.drills?.map((drill, idx) => {
                                            const d = typeof drill === 'string' ? null : drill;
                                            return (
                                                <div key={idx} onClick={() => { if (hasFullAccess || d?.id === dailyFreeDrillId) { setCurrentDrillIndex(idx); setViewMode('player'); setVideoType('main'); } else { handlePurchase(); } }} className="group flex gap-5 bg-zinc-950/50 border border-zinc-800/60 p-4 rounded-xl hover:border-violet-500/30 transition-all cursor-pointer items-center">
                                                    <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-black shrink-0 border border-zinc-800">
                                                        {d?.thumbnailUrl && <img src={d.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-all" />}
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                                            <PlayCircle className="w-6 h-6 text-white/80" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 py-1">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-lg font-bold text-zinc-100">{d?.title || `Drill ${idx + 1}`}</h4>
                                                            {d?.id === dailyFreeDrillId && (
                                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold flex items-center gap-1 shrink-0">
                                                                    <Clock className="w-2.5 h-2.5" /> 오늘의 무료 드릴
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-zinc-400 mt-1 line-clamp-1">{d?.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="lg:col-span-4 relative flex flex-col gap-6">
                                <div className="sticky top-28 bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-8 shadow-2xl">
                                    <h3 className="text-lg font-bold text-zinc-400 mb-6 uppercase tracking-wider">Access Pass</h3>
                                    <div className="space-y-8">
                                        <div className="flex items-end gap-2">
                                            <span className="text-5xl font-black text-zinc-50">{routine.price === 0 ? 'Free' : `₩${routine.price.toLocaleString()}`}</span>
                                        </div>
                                        <div className="space-y-4">
                                            <button
                                                onClick={hasFullAccess ? handleStartRoutine : handlePurchase}
                                                className={cn(
                                                    "w-full rounded-full py-4 font-black text-lg transition-all flex items-center justify-center gap-2 transform active:scale-95",
                                                    hasFullAccess
                                                        ? "bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]"
                                                        : "bg-white hover:bg-zinc-200 text-black shadow-lg shadow-white/5"
                                                )}
                                            >
                                                {hasFullAccess ? <><Play className="w-5 h-5 md:w-6 md:h-6 fill-current" /> 루틴 시작하기</> : <><Lock className="w-5 h-5 md:w-6 md:h-6" /> 루틴 구매하기</>}
                                            </button>
                                            <button
                                                onClick={() => navigate('/pricing')}
                                                className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-full py-4 font-black text-base shadow-[0_0_20px_rgba(124,58,237,0.3)] transition-all flex items-center justify-center gap-2 transform active:scale-95"
                                            >
                                                <Zap className="w-5 h-5 fill-current" /> 멤버십 구독하고 전체 시청하기
                                            </button>
                                            <p className="text-center text-xs text-zinc-500">{hasFullAccess ? 'Lifetime access active' : 'Includes lifetime access & updates'}</p>
                                        </div>
                                    </div>
                                </div>

                                {relatedCourse && (
                                    <div
                                        onClick={() => navigate(`/courses/${relatedCourse.id}`)}
                                        className="bg-gradient-to-br from-violet-900/30 to-indigo-900/30 border border-violet-500/30 hover:border-violet-500/50 p-5 rounded-3xl relative overflow-hidden cursor-pointer group transition-all shadow-xl"
                                    >
                                        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/20 blur-[50px] rounded-full pointer-events-none group-hover:bg-violet-500/30 transition-colors"></div>
                                        <div className="relative z-10 flex flex-col gap-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1">
                                                    <div className="text-[10px] font-bold text-violet-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                                        <Zap className="w-3 h-3" /> Master This Skill
                                                    </div>
                                                    <h4 className="text-lg font-bold text-white leading-tight group-hover:text-violet-200 transition-colors">{relatedCourse.title}</h4>
                                                </div>
                                                <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden shrink-0 border border-white/10 shadow-lg group-hover:scale-105 transition-transform">
                                                    {relatedCourse.thumbnailUrl && <img src={relatedCourse.thumbnailUrl} className="w-full h-full object-cover" />}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-2">
                                                <span className="text-xs text-zinc-400 group-hover:text-zinc-300 transition-colors">Start full course</span>
                                                <div className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center group-hover:scale-110 transition-transform">
                                                    <ChevronLeft className="w-4 h-4 rotate-180" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Similar Routines Section */}
                        {relatedRoutines.length > 0 && (
                            <div className="max-w-7xl mx-auto w-full px-8 mt-24">
                                <h3 className="text-xl font-bold text-white mb-6">More Routines Like This</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {relatedRoutines.map(r => (
                                        <div
                                            key={r.id}
                                            onClick={() => navigate(`/routines/${r.id}`)}
                                            className="group cursor-pointer"
                                        >
                                            <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 mb-3 relative shadow-lg group-hover:shadow-violet-900/10 transition-all">
                                                {r.thumbnailUrl ? (
                                                    <img src={r.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Play className="w-10 h-10 text-zinc-600" /></div>
                                                )}
                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold border border-white/10 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {r.totalDurationMinutes}m
                                                </div>
                                            </div>
                                            <h4 className="text-lg font-bold text-zinc-100 line-clamp-1 group-hover:text-violet-400 transition-colors">{r.title}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">{r.difficulty}</span>
                                                <span className="text-xs text-zinc-500">{r.drillCount} Drills</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-row w-full h-[calc(100vh-80px)] bg-black relative overflow-hidden">
                        <div className="flex-1 relative flex items-center justify-center p-4">
                            {/* Video Container with Actions Outside */}
                            <div className="relative h-full flex">
                                {/* Video */}
                                <div className="relative h-full aspect-[9/16] shadow-2xl overflow-hidden ring-1 ring-white/10 bg-zinc-900 rounded-lg">
                                    {hasAccess ? (
                                        <>
                                            <VideoPlayer
                                                vimeoId={effectiveUrl || ''}
                                                title={currentDrill?.title || ''}
                                                autoplay={true}
                                                showControls={false}
                                                fillContainer={true}
                                                onProgress={handleProgress}
                                                onDoubleTap={() => handleLikeDrill()}
                                                onEnded={() => handleDrillComplete()}
                                            />
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-8 text-center">
                                            <div className="mb-8 relative">
                                                <div className="absolute -inset-6 bg-violet-500/20 blur-2xl rounded-full"></div>
                                                <Lock className="w-16 h-16 text-zinc-400 relative z-10 mx-auto" />
                                            </div>
                                            <span className="text-[10px] font-extrabold uppercase tracking-[0.20em] text-zinc-500 mb-2">Access Needed</span>
                                            <h3 className="text-3xl font-black text-white mb-3">루틴 구매 또는 구독이 필요합니다</h3>
                                            <p className="text-sm text-zinc-400 font-medium mb-10 max-w-sm leading-relaxed mx-auto">
                                                전체 루틴을 시청하고 훈련에 활용하려면 구매하거나 멤버십을 구독하세요.
                                            </p>
                                            <div className="flex flex-col gap-4 w-full max-w-sm mx-auto">
                                                <Button onClick={handlePurchase} size="lg" className="bg-white hover:bg-zinc-200 text-black rounded-2xl h-16 text-lg font-black w-full active:scale-95 shadow-xl shadow-white/5">
                                                    ₩{routine.price.toLocaleString()}에 구매하기
                                                </Button>
                                                <Button onClick={() => navigate('/pricing')} size="lg" className="bg-violet-600 hover:bg-violet-500 text-white rounded-2xl h-16 text-lg font-black w-full active:scale-95 shadow-xl shadow-violet-900/40 flex items-center justify-center gap-2">
                                                    <Zap className="w-6 h-6 fill-current" /> 멤버십 구독하기
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Back Button & Video Type Toggle - Inside Video */}
                                    <div className="absolute top-6 left-6 z-[100] pointer-events-none">
                                        <div className="flex flex-col gap-4 items-start pointer-events-auto">
                                            <button
                                                onClick={() => setViewMode('landing')}
                                                className="p-2.5 md:p-3.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 transition-all hover:bg-black/60 shadow-xl"
                                            >
                                                <ChevronLeft className="w-5 h-5 md:w-7 md:h-7" />
                                            </button>

                                            {/* Video Type Toggle (Vertical) */}
                                            <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                                <button
                                                    onClick={() => setVideoType('main')}
                                                    className={`p-2 md:p-3 rounded-full transition-all ${videoType === 'main' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    <Zap className="w-5 h-5 md:w-6 md:h-6" fill={videoType === 'main' ? "currentColor" : "none"} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (hasDescriptionAccess) {
                                                            setVideoType('description');
                                                        } else {
                                                            handlePurchase();
                                                        }
                                                    }}
                                                    className={`p-2 md:p-3 rounded-full transition-all relative ${videoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                                >
                                                    <MessageCircle className="w-5 h-5 md:w-6 md:h-6" fill={videoType === 'description' ? "currentColor" : "none"} />
                                                    {!hasDescriptionAccess && <Lock className="w-3 h-3 absolute top-0.5 right-0.5 text-white" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom Info - Left side (matches Drill style) */}
                                    <div className="absolute bottom-10 left-6 right-6 z-40 pointer-events-none">
                                        <div className="flex flex-col gap-3 pointer-events-auto">
                                            <div className="flex items-center gap-3">
                                                <div onClick={navigateToCreator} className="flex items-center gap-2 cursor-pointer group">
                                                    <span className="text-white font-bold text-sm drop-shadow-md">{routine.creatorName}</span>
                                                </div>
                                                <span className="text-white/40 text-xs">•</span>
                                                <button
                                                    onClick={handleFollow}
                                                    className={`px-4 py-1 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${isFollowing ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}
                                                >
                                                    {isFollowing ? 'Following' : 'Follow'}
                                                </button>
                                            </div>
                                            <h2 className="text-white font-bold text-lg drop-shadow-md line-clamp-2">{currentDrill?.title}</h2>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Side Actions - Outside Video */}
                                <div className="flex flex-col justify-between py-6 ml-4">
                                    {/* Top Actions: Mute & List */}
                                    <div className="flex flex-col gap-3 items-center">
                                        <button onClick={toggleMute} className="p-2 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all">
                                            {muted ? <VolumeX className="w-5 h-5 md:w-7 md:h-7" /> : <Volume2 className="w-5 h-5 md:w-7 md:h-7" />}
                                        </button>
                                        <button onClick={() => setShowMobileList(true)} className="p-2 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all">
                                            <List className="w-5 h-5 md:w-7 md:h-7" />
                                        </button>
                                    </div>

                                    {/* Bottom Actions: Like, Save, Share */}
                                    <div className="flex flex-col gap-3 items-center">
                                        {/* Like */}
                                        <div className="flex flex-col items-center gap-0.5">
                                            <button onClick={handleLikeDrill} className="p-2 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90">
                                                <Heart className={`w-5 h-5 md:w-7 md:h-7 ${currentDrill && likedDrills.has(currentDrill.id) ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                            </button>
                                            <span className="text-[10px] font-medium text-zinc-200">{(currentDrill?.likes || 0).toLocaleString()}</span>
                                        </div>

                                        {/* Save */}
                                        <button onClick={handleSaveDrill} className="p-2 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90">
                                            <Bookmark className={`w-5 h-5 md:w-7 md:h-7 ${currentDrill && savedDrills.has(currentDrill.id) ? 'fill-zinc-100' : ''}`} />
                                        </button>


                                        {/* Share */}
                                        <button onClick={handleShare} className="p-2 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90">
                                            <Share2 className="w-5 h-5 md:w-7 md:h-7" />
                                        </button>


                                    </div>
                                </div>
                            </div>


                            {/* Desktop Player Sidebar */}
                            <div className="w-[420px] bg-zinc-950 border-l border-zinc-800 flex flex-col h-full">
                                <div className="p-6 border-b border-zinc-800 shrink-0">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={routine.creatorProfileImage || `https://ui-avatars.com/api/?name=${routine.creatorName}`}
                                                className="w-10 h-10 rounded-full object-cover ring-2 ring-white/5"
                                            />
                                            <div>
                                                <h4 className="text-white font-bold leading-tight">{routine.creatorName}</h4>
                                                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider mt-0.5">Verified Instructor</p>
                                            </div>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-2">{routine.title}</h3>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-zinc-500 text-sm">{currentDrillIndex + 1} / {routine.drills?.length}</span>
                                    </div>
                                    <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden"><div className="h-full bg-violet-600" style={{ width: `${progressPercent}%` }} /></div>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                    {routine.drills?.map((d: any, idx) => (
                                        <button key={idx} onClick={() => handleDrillSelect(idx)} className={`group relative w-full flex items-center gap-3 p-3 rounded-xl transition-all ${idx === currentDrillIndex ? 'bg-violet-600/20 border border-violet-500/50' : 'hover:bg-zinc-900 border border-transparent'}`}>
                                            <div className="relative w-16 aspect-video bg-zinc-800 rounded-lg overflow-hidden shrink-0">
                                                <img src={d.thumbnailUrl} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="text-left font-bold text-sm text-zinc-200 truncate">{d.title}</div>
                                            <div className="ml-auto flex items-center gap-2">
                                                {completedDrills.has(d.id) && <CheckCircle className="w-4 h-4 text-green-500" />}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="p-6 border-t border-zinc-800"><Button size="lg" onClick={handleDrillComplete} className="w-full bg-violet-600 active:bg-violet-700 text-white hover:bg-violet-500 shadow-[0_4px_12px_rgba(124,58,237,0.3)] transition-all">드릴 완료 & 다음</Button></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Training Mode Timer Overlay (Universal for player view) */}
            {
                isTrainingMode && (
                    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-8">
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="text-8xl font-black text-white mb-4 tabular-nums tracking-tighter shadow-2xl">{formatTime(elapsedSeconds)}</div>
                            <p className="text-zinc-500 font-bold uppercase tracking-widest animate-pulse mb-12 text-sm italic">Training in Progress...</p>
                            <h3 className="text-2xl font-black text-white mb-12 text-center max-w-lg">{routine.title} 종료 단계</h3>
                            <Button onClick={handleFinishTraining} size="lg" className="px-16 py-8 text-xl font-black bg-white text-black hover:bg-zinc-200 rounded-full shadow-2xl active:scale-95 transition-all">훈련 완료</Button>
                        </div>
                    </div>
                )
            }

            <QuestCompleteModal
                isOpen={showQuestComplete}
                onClose={() => setShowQuestComplete(false)}
                onContinue={() => {
                    const currentIndex = id ? playlist.indexOf(id) : -1;
                    const hasNext = currentIndex !== -1 && currentIndex < playlist.length - 1;
                    if (hasNext) {
                        handleNextRoutine();
                    } else {
                        setShowQuestComplete(false);
                        setViewMode('landing');
                    }
                }}
                questName={routine.title}
                durationSeconds={elapsedSeconds}
                streak={streak}
                bonusReward={bonusReward}
                continueLabel={(id && playlist.indexOf(id) !== -1 && playlist.indexOf(id) < playlist.length - 1) ? '다음 루틴 시작하기' : '수련 완료'}
            />
            {isShareModalOpen && shareModalData2 && (
                <ShareModal
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    title={shareModalData2.title}
                    text={shareModalData2.text}
                    url={shareModalData2.url}
                    imageUrl={currentDrill.thumbnailUrl}
                />
            )}

            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl={`/routines/${id}`}
            />
        </div >
    );
};
