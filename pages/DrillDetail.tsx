import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDrillById, calculateDrillPrice, toggleDrillLike, checkDrillLiked, toggleDrillSave, checkDrillSaved, checkDrillRoutineOwnership } from '../lib/api';
import { Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Heart, Bookmark, Share2, MoreVertical, Play, Lock, Volume2, VolumeX, Zap, MessageCircle, ListVideo } from 'lucide-react';
import { QuestCompleteModal } from '../components/QuestCompleteModal';
import { AddToRoutineModal } from '../components/AddToRoutineModal';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

import { useAuth } from '../contexts/AuthContext';

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

export const DrillDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: contextUser, loading: authLoading } = useAuth();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isSubscriber, setIsSubscriber] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [showAddToRoutine, setShowAddToRoutine] = useState(false);
    const [associatedRoutineId, setAssociatedRoutineId] = useState<string | null>(null);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Video player state
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [currentVideoType, setCurrentVideoType] = useState<'action' | 'description'>('action');
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [muted, setMuted] = useState(true);
    const [canAccessDescription, setCanAccessDescription] = useState(false);

    const navigateToCreator = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (drill?.creatorId) {
            navigate(`/creator/${drill.creatorId}`);
        }
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!contextUser) {
            navigate('/login');
            return;
        }
        if (!drill?.creatorId) return;

        try {
            const { toggleCreatorFollow } = await import('../lib/api');
            const { followed } = await toggleCreatorFollow(contextUser.id, drill.creatorId);
            setIsFollowing(followed);
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const toggleMute = () => {
        setMuted(prev => !prev);
    };

    useEffect(() => {
        if (authLoading) return;

        if (id) {
            fetchDrill();
            checkUser();
            checkRoutine();
        }
    }, [id, authLoading]);

    // Auto-poll if processing (every 5 seconds)
    // Recursive polling to prevent request pile-up
    useEffect(() => {
        let isMounted = true;
        let timeoutId: NodeJS.Timeout;

        const pollDrill = async () => {
            // If unmounted, stop
            if (!isMounted) return;

            await fetchDrill(true);

            // Schedule next poll only after current one finishes
            if (isMounted) {
                timeoutId = setTimeout(pollDrill, 5000);
            }
        };

        if (drill && (!drill.vimeoUrl || drill.vimeoUrl.includes('placeholder'))) {

            // Start the loop
            timeoutId = setTimeout(pollDrill, 5000);
        }

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [drill?.vimeoUrl, id]); // Re-evaluate only when vimeoUrl changes

    const [error, setError] = useState<string | null>(null);

    // --- Derived Video State (Hoisted for use in handlers) ---
    // Helper to extract Vimeo ID
    const extractVimeoId = (url?: string | null) => {
        if (!url || typeof url !== 'string') return undefined;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : undefined;
    };

    const isActionVideo = currentVideoType === 'action';
    const rawVimeoUrl = drill ? (isActionVideo ? (drill.videoUrl || drill.vimeoUrl) : (drill.descriptionVideoUrl || drill.videoUrl || drill.vimeoUrl)) : undefined;
    const vimeoId = extractVimeoId(rawVimeoUrl);
    // Action video: FREE for everyone
    // Description video: requires canAccessDescription
    const canViewCurrentVideo = isActionVideo ? true : canAccessDescription;
    const useVimeo = !!vimeoId && canViewCurrentVideo;

    // For fallback, we prefer the direct video URL (mp4)
    const fallbackUrl = drill ? (isActionVideo ? drill.videoUrl : (drill.descriptionVideoUrl && !vimeoId ? drill.descriptionVideoUrl : drill.videoUrl)) : undefined;

    // SAFE VIDEO SRC
    const videoSrc = useVimeo
        ? `https://player.vimeo.com/video/${vimeoId}`
        : (fallbackUrl || 'https://placehold.co/video/placeholder.mp4');

    // Detect Processing State
    const isProcessing = canViewCurrentVideo && !useVimeo && drill && (!drill.videoUrl || drill.videoUrl.includes('placeholder') || drill.videoUrl.includes('placehold.co'));
    // -------------------------------------------------------------

    // ... (existing state)

    const fetchDrill = async (suppressErrorUI = false) => {
        if (!id) return;
        if (!suppressErrorUI) setError(null);

        try {
            let result: any = await getDrillById(id);

            if (result && result.error) {
                console.error('Fetch error:', result.error);
                if (!suppressErrorUI) {
                    setError(typeof result.error === 'string' ? result.error : (result.error.message || 'Failed to load drill'));
                }
                return;
            }

            let drillData = result;
            let isFromLocalStorage = false;

            // If not found in database (null result), check localStorage
            if (!drillData) {
                const savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');
                drillData = savedDrills.find((d: Drill) => d.id === id);
                isFromLocalStorage = !!drillData;
            }

            if (drillData) {
                setDrill(drillData);

                // If from localStorage, user can always view it
                if (isFromLocalStorage) {
                    setOwns(true);
                } else {
                    // Only increment views if from database
                    // await incrementDrillViews(id); // Temporarily disabled to prevent DB locks during high load

                    // Check ownership for database drills


                    if (contextUser && drillData.creatorId === contextUser.id) {
                        setOwns(true);
                    }
                }

                // Check if saved
                const savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');
                setSaved(savedDrills.some((d: Drill) => d.id === id));
            } else {
                // Really not found
                setError('Drill not found');
            }
        } catch (error: any) {
            console.error('Error fetching drill:', error);
            setError(error.message || 'Unexpected error');
        } finally {
            setLoading(false);
        }
    };

    const checkUser = async () => {
        let isDailyFree = false;
        try {
            const { getDailyFreeDrill } = await import('../lib/api');
            const { data: freeDrill } = await getDailyFreeDrill();
            if (freeDrill && freeDrill.id === id) {
                isDailyFree = true;
            }
        } catch (e) {
            console.warn('Error checking daily free status:', e);
        }

        if (contextUser) {
            setUser(contextUser);
            const { data: userData } = await supabase
                .from('users')
                .select('is_subscriber')
                .eq('id', contextUser.id)
                .single();

            const isSub = userData?.is_subscriber || false;
            setIsSubscriber(isSub);

            if (id && drill) {
                let hasAccess = isDailyFree; // Start with daily free status

                // Check if creator (HIGHEST PRIORITY)
                if (drill.creatorId === contextUser.id) {
                    hasAccess = true;

                }
                // Check if subscriber
                else if (isSub) {
                    hasAccess = true;
                }

                // NEW: Check if owned individually or first in routine
                if (!hasAccess && id) {
                    try {
                        const { getRoutineByDrillId } = await import('../lib/api');
                        const { data: routineData } = await getRoutineByDrillId(id);

                        if (routineData) {
                            // 1. Check individual routine ownership
                            const purchased = await checkDrillRoutineOwnership(contextUser.id, routineData.id);
                            if (purchased) hasAccess = true;

                            // 2. Check if first drill in routine (Free Preview)
                            if (!hasAccess && routineData.drills && routineData.drills.length > 0 && routineData.drills[0].id === id) {
                                hasAccess = true;
                            }
                        }
                    } catch (e) {
                        console.warn('Error checking routine ownership:', e);
                    }
                }

                setOwns(hasAccess);

                // NEW: Check description video access (stricter)
                // Description videos require subscription, purchase, or daily free
                let canSeeDescription = false;
                if (drill.creatorId === contextUser.id) {
                    canSeeDescription = true;
                } else if (isDailyFree) {
                    canSeeDescription = true;
                } else if (isSub) {
                    canSeeDescription = true;
                } else if (id) {
                    // Check if purchased routine
                    try {
                        const { getRoutineByDrillId } = await import('../lib/api');
                        const { data: routineData } = await getRoutineByDrillId(id);
                        if (routineData) {
                            const purchased = await checkDrillRoutineOwnership(contextUser.id, routineData.id);
                            if (purchased) canSeeDescription = true;
                        }
                    } catch (e) {
                        console.warn('Error checking routine for description access:', e);
                    }
                }
                setCanAccessDescription(canSeeDescription);

                // Check liked and saved status
                try {
                    const [isLiked, isSaved] = await Promise.all([
                        checkDrillLiked(contextUser.id, id),
                        checkDrillSaved(contextUser.id, id)
                    ]);
                    setLiked(isLiked);
                    setSaved(isSaved);
                } catch (e) {
                    console.warn('Error checking interactions:', e);
                }
            }
        } else {
            // Not logged in
            if (isDailyFree) {
                setOwns(true);
                setCanAccessDescription(true); // Daily free drills include description
            } else if (id) {
                // Check if first drill in routine (free preview)
                try {
                    const { getRoutineByDrillId } = await import('../lib/api');
                    const { data: routineData } = await getRoutineByDrillId(id);

                    if (routineData && routineData.drills && routineData.drills.length > 0) {
                        // First drill is free for everyone
                        if (routineData.drills[0].id === id) {
                            setOwns(true);
                        }
                    }
                } catch (error) {
                    console.warn('Could not check routine status:', error);
                }
            }
        }
    };

    const checkRoutine = async () => {
        if (!id) return;
        try {
            const { getRoutineByDrillId } = await import('../lib/api');
            const { data: routine } = await getRoutineByDrillId(id);
            if (routine) {
                setAssociatedRoutineId(routine.id);
            } else {
                setAssociatedRoutineId(null);
            }
        } catch (e) {
            console.error('Error checking routine association:', e);
        }
    };

    // Auto-play current video
    useEffect(() => {
        setIsVideoReady(false); // Reset ready state when changing video tabs
    }, [currentVideoType]);

    // Unified Play/Pause logic for Detail View
    const applyPlaybackState = (playing: boolean) => {
        if (useVimeo) {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
                const message = playing ? '{"method":"play"}' : '{"method":"pause"}';
                iframe.contentWindow.postMessage(message, '*');
            }
        } else {
            const video = videoRef.current;
            if (video && owns) {
                if (playing) {
                    video.play().catch(err => console.log('Play error:', err));
                } else {
                    video.pause();
                }
            }
        }
    };

    useEffect(() => {
        applyPlaybackState(isPlaying);
    }, [isPlaying, currentVideoType, owns, id, useVimeo]); // useVimeo is now safe to use

    // Update progress
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            const progress = (video.currentTime / video.duration) * 100;
            setProgress(progress);
        };

        video.addEventListener('timeupdate', updateProgress);
        return () => video.removeEventListener('timeupdate', updateProgress);
    }, [currentVideoType]);

    // Handle video end - loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            video.currentTime = 0;
            video.play();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [currentVideoType]);

    const togglePlayPause = () => {
        if (owns) {
            const nextPlaying = !isPlaying;
            setIsPlaying(nextPlaying);
            applyPlaybackState(nextPlaying);
        }
    };

    const handlePurchase = () => {
        if (!user) {
            navigate('/login');
            return;
        }
        if (!drill) return;
        const finalPrice = calculateDrillPrice(drill.price, isSubscriber);
        navigate(`/payment/drill/${drill.id}?price=${finalPrice}`);
    };



    const handleLike = async () => {
        if (!user || !id) {
            navigate('/login');
            return;
        }

        // Optimistic update
        setLiked(!liked);

        const { liked: newLiked, error } = await toggleDrillLike(user.id, id);
        if (error) {
            // Revert on error
            setLiked(liked);
            console.error('Error toggling like:', error);
        } else {
            setLiked(newLiked);
        }
    };

    const handleSave = async () => {
        if (!user || !id) {
            navigate('/login');
            return;
        }

        // Optimistic update
        setSaved(!saved);

        const { saved: newSaved, error } = await toggleDrillSave(user.id, id);

        if (error) {
            // Revert on error
            setSaved(saved);
            console.error('Error toggling save:', error);
            alert('저장에 실패했습니다.');
        } else {
            setSaved(newSaved);

            // Sync with localStorage for backward compatibility / offline-ish feel
            let savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');
            if (newSaved) {
                if (drill && !savedDrills.find((d: Drill) => d.id === drill.id)) {
                    savedDrills.push(drill);
                }
                alert('드릴이 나만의 루틴에 저장되었습니다! 아레나 > 나만의 루틴 탭에서 확인하세요.');
            } else {
                savedDrills = savedDrills.filter((d: Drill) => d.id !== drill?.id);
                alert('저장된 드릴에서 제거되었습니다.');
            }
            localStorage.setItem('saved_drills', JSON.stringify(savedDrills));
        }
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    if (loading) {
        return <LoadingScreen message="드릴 정보 불러오는 중..." />;
    }

    if (error) {
        return <ErrorScreen error={error} resetMessage="드릴 정보를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }


    if (!drill) return <div className="text-white text-center pt-20">Drill not found</div>;



    const finalPrice = drill ? calculateDrillPrice(drill.price, isSubscriber) : 0;

    if (isProcessing) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white mb-2">영상 처리 중입니다...</h2>
                <p className="text-slate-400 text-center max-w-xs mb-8">
                    서버에서 고화질로 변환하고 있습니다.<br />
                    잠시만 기다려주세요. (약 1~2분 소요)
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/creator')}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition"
                    >
                        대시보드로 돌아가기
                    </button>
                    {/* Add a force-refresh button for eager users */}
                    <button
                        onClick={() => fetchDrill()}
                        className="px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition"
                    >
                        상태 확인
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden select-none">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div
                    className="h-full bg-white transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Top-Left Group: Back Button & Toggles */}
            <div className="absolute top-0 left-0 z-[100] p-6 pointer-events-none">
                <div className="flex flex-col gap-4 items-start pointer-events-auto">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 md:p-3.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-xl active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
                    </button>

                    {/* View Toggles (Vertical) */}
                    <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                        <button
                            onClick={() => setCurrentVideoType('action')}
                            className={`p-2 md:p-3 rounded-full transition-all ${currentVideoType === 'action' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                            title="Action Video"
                        >
                            <Zap className="w-5 h-5 md:w-6 md:h-6" fill={currentVideoType === 'action' ? "currentColor" : "none"} />
                        </button>
                        <button
                            onClick={() => setCurrentVideoType('description')}
                            className={`p-2 md:p-3 rounded-full transition-all ${currentVideoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                            title="Description Video"
                        >
                            <MessageCircle className="w-5 h-5 md:w-6 md:h-6" fill={currentVideoType === 'description' ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Click Overlay for Drill Detail */}
            <div
                className="absolute inset-0 z-35"
                onClick={togglePlayPause}
            />

            {/* Video Container - 9:16 aspect ratio */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="relative w-full h-full max-w-[56.25vh]">
                    {canViewCurrentVideo ? (
                        useVimeo ? (
                            <iframe
                                key={`vimeo-${vimeoId}-${currentVideoType}`}
                                ref={iframeRef}
                                src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&loop=1&autopause=0&muted=${muted ? 1 : 0}&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1`}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <>
                                <video
                                    key={`${drill.id}-${currentVideoType}`}
                                    ref={videoRef}
                                    className="absolute inset-0 w-full h-full object-cover"
                                    loop
                                    playsInline
                                    muted={muted}
                                    autoPlay={isPlaying}
                                    onClick={togglePlayPause}
                                    src={videoSrc || undefined}
                                    preload="auto"
                                    onPlaying={() => setIsVideoReady(true)}
                                    onWaiting={() => setIsVideoReady(false)}
                                    onLoadStart={() => setIsVideoReady(false)}
                                />

                                {/* Thumbnail Overlay (Smooth Transition) */}
                                {!isVideoReady && drill && (
                                    <div className="absolute inset-0 z-20">
                                        <img
                                            src={drill.thumbnailUrl}
                                            className="w-full h-full object-cover"
                                            alt=""
                                        />
                                        {/* Loading Spinner on top of thumbnail */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                            <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                                        </div>
                                    </div>
                                )}

                                {/* Play/Pause Overlay */}
                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                        <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                            <Play className="w-10 h-10 text-black ml-1" />
                                        </div>
                                    </div>
                                )}
                            </>
                        )
                    ) : (
                        <div className="w-full h-full relative group">
                            <img
                                src={drill.thumbnailUrl}
                                alt={drill.title}
                                className="w-full h-full object-cover opacity-60 transition-opacity group-hover:opacity-40"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/20 backdrop-blur-sm">
                                <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20 group-hover:scale-110 transition-transform">
                                    <Lock className="w-10 h-10 text-white" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3 tracking-tight">
                                    {currentVideoType === 'description' ? '설명 영상은 유료입니다' : (drill.price === 0 ? '구독 필요' : '드릴 구매 필요')}
                                </h3>
                                <p className="text-zinc-300 mb-8 max-w-xs text-sm">
                                    {currentVideoType === 'description'
                                        ? '설명 영상은 구독자 또는 구매자만 시청할 수 있습니다.'
                                        : '이 기술을 마스터하고 싶으신가요? 지금 바로 시작하세요.'}
                                </p>
                                {drill.price > 0 ? (
                                    <Button
                                        onClick={handlePurchase}
                                        size="lg"
                                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-violet-900/20 border border-violet-400/20"
                                    >
                                        ₩{finalPrice.toLocaleString()}에 구매하기
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => navigate('/pricing')}
                                        size="lg"
                                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-violet-900/20 border border-violet-400/20"
                                    >
                                        구독하기
                                    </Button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side Actions - Unified Container (Top: Mute, Bottom: Like/Save/Routine/Share) */}
            <div className="absolute inset-0 pointer-events-none flex justify-center z-40">
                <div className="relative h-full w-full max-w-[56.25vh] flex">
                    {/* Spacer for video width */}
                    <div className="flex-1"></div>

                    {/* Actions Container - Sticks to right edge of video on mobile, outside on desktop */}
                    <div className="absolute right-0 md:relative md:right-auto top-0 bottom-0 flex flex-col justify-between py-6 pointer-events-auto
                                    md:translate-x-full md:ml-4">
                        {/* Top Actions: Mute */}
                        <div className="flex flex-col gap-3 items-center pr-4 md:pr-0">
                            <button
                                onClick={toggleMute}
                                className="p-2.5 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all"
                            >
                                {muted ? <VolumeX className="w-5 h-5 md:w-7 md:h-7" /> : <Volume2 className="w-5 h-5 md:w-7 md:h-7" />}
                            </button>
                        </div>

                        {/* Bottom Actions: Like, Routine, Save, Share */}
                        <div className="flex flex-col gap-3 items-center pr-4 md:pr-0 pb-24 md:pb-0">
                            {/* Like */}
                            <div className="flex flex-col items-center gap-0.5">
                                <button
                                    onClick={handleLike}
                                    className="p-2.5 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                                >
                                    <Heart className={`w-5 h-5 md:w-9 md:h-9 ${liked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                </button>
                                <span className="text-[10px] font-medium text-zinc-200">{((drill?.likes || 0) + (liked ? 1 : 0)).toLocaleString()}</span>
                            </div>

                            {/* Routine Link (if exists) */}
                            {owns && associatedRoutineId && (
                                <button
                                    onClick={() => navigate(`/routines/${associatedRoutineId}`)}
                                    className="p-2.5 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                                >
                                    <ListVideo className="w-5 h-5 md:w-7 md:h-7" />
                                </button>
                            )}

                            {/* Add to Routine (if no routine) */}
                            {owns && !associatedRoutineId && (
                                <button
                                    onClick={() => setShowAddToRoutine(true)}
                                    className="p-2.5 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                                >
                                    <MoreVertical className="w-5 h-5 md:w-7 md:h-7" />
                                </button>
                            )}

                            {/* Save */}
                            <button
                                onClick={handleSave}
                                className="p-2.5 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                                title="나만의 루틴에 저장"
                            >
                                <Bookmark className={`w-5 h-5 md:w-7 md:h-7 ${saved ? 'fill-zinc-100' : ''}`} />
                            </button>

                            {/* Share */}
                            <button
                                onClick={handleShare}
                                className="p-2.5 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                            >
                                <Share2 className="w-5 h-5 md:w-7 md:h-7" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="fixed left-0 right-0 w-full bottom-28 px-6 z-20 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                    {/* Left: Info - Metadata Container (Matches Drill Feed STYLE) */}
                    <div className="flex-1 pr-16">
                        <div className="flex flex-row items-center gap-2 mb-2">
                            <span
                                onClick={navigateToCreator}
                                className="font-bold text-[15px] text-white text-shadow-sm cursor-pointer hover:underline"
                            >
                                {drill?.creatorName || 'Instructor'}
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
                            {drill.title}
                            {currentVideoType === 'description' && <span className="text-[13px] font-medium text-white/60 ml-2 uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded">설명</span>}
                        </h3>

                        {/* Tags */}
                        {drill.tags && drill.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {drill.tags.slice(0, 3).map((tag: string, idx: number) => (
                                    <span key={idx} className="text-white/80 text-xs drop-shadow-md font-medium">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>


                </div>
            </div>



            {/* Quest Complete Modal */}
            <QuestCompleteModal
                isOpen={showQuestComplete}
                onClose={() => setShowQuestComplete(false)}
                questName={drill?.title || '드릴'}
                xpEarned={10}
                streak={1}
            />

            {/* Add to Routine Modal */}
            {drill && (
                <AddToRoutineModal
                    drill={drill}
                    isOpen={showAddToRoutine}
                    onClose={() => setShowAddToRoutine(false)}
                    onSuccess={() => {
                        // Optionally reload or update UI
                    }}
                />
            )}

            {/* Share Modal Portal */}
            <React.Suspense fallback={null}>
                {drill && isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={drill.title}
                        text={drill.description || `Check out this drill: ${drill.title}`}
                        url={`${window.location.origin}/drills/${drill.id}`}
                        imageUrl={drill.thumbnailUrl}
                    />
                )}
            </React.Suspense>
        </div>
    );
};
