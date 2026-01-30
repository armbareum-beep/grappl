import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparringVideo } from '../../types';
import { Share2, Volume2, VolumeX, Bookmark, Heart, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { extractVimeoId } from '../../lib/api';
import { VideoPlayer } from '../VideoPlayer';
import { ReelLoginModal } from '../auth/ReelLoginModal';
import { useOrientationFullscreen } from '../../hooks/useOrientationFullscreen';

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../social/ShareModal'));

interface SparringReelItemProps {
    video: SparringVideo;
    isActive: boolean;
    offset: number;
    isSubscriber?: boolean;
    purchasedItemIds?: string[];
    isLoggedIn?: boolean;
    isDailyFreeSparring?: boolean;
}

export const SparringReelItem: React.FC<SparringReelItemProps> = ({
    video,
    isActive,
    offset,
    isSubscriber,
    purchasedItemIds = [],
    isLoggedIn,
    isDailyFreeSparring = false
}) => {
    const [muted, setMuted] = useState(true);

    // Interaction State
    const { user } = useAuth();
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const [relatedDrills, setRelatedDrills] = useState<any[]>([]);
    const navigate = useNavigate();

    // Login modal state for non-logged-in users
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fullscreen on landscape
    const containerRef = useRef<HTMLDivElement>(null);
    useOrientationFullscreen(containerRef, isActive);

    // Check interaction status and fetch related drills/lessons on load
    useEffect(() => {
        if (isActive) {
            if (user && video.creatorId) {
                import('../../lib/api').then(({ getSparringInteractionStatus, getDrillsByIds, getLessonsByIds }) => {
                    getSparringInteractionStatus(user.id, video.id, video.creatorId)
                        .then(status => {
                            setIsFollowed(status.followed);
                            setIsLiked(status.liked);
                            setIsSaved(status.saved);
                        })
                        .catch(console.error);


                    // Fetch related drills and lessons if any
                    if (video.relatedItems && video.relatedItems.length > 0) {
                        const allIds = video.relatedItems.map((item: any) => typeof item === 'string' ? item : item.id);

                        // Try fetching as both drills and lessons since type info might be missing
                        Promise.all([
                            getDrillsByIds(allIds),
                            getLessonsByIds(allIds)
                        ]).then(([drillsRes, lessonsRes]) => {
                            const combined = [
                                ...(drillsRes.data || []).map((d: any) => ({ ...d, _type: 'drill' })),
                                ...(lessonsRes.data || []).map((l: any) => ({ ...l, _type: 'lesson' }))
                            ];
                            setRelatedDrills(combined);
                        });
                    }
                });
            } else if (video.relatedItems && video.relatedItems.length > 0) {
                // Not logged in but still try to show related items
                import('../../lib/api').then(({ getDrillsByIds, getLessonsByIds }) => {
                    const drillIds: string[] = [];
                    const lessonIds: string[] = [];

                    video.relatedItems.forEach((item: any) => {
                        const id = typeof item === 'string' ? item : item.id;
                        const type = typeof item === 'string' ? 'drill' : item.type;

                        if (type === 'lesson') {
                            lessonIds.push(id);
                        } else {
                            drillIds.push(id);
                        }
                    });

                    Promise.all([
                        drillIds.length > 0 ? getDrillsByIds(drillIds) : Promise.resolve({ data: [] }),
                        lessonIds.length > 0 ? getLessonsByIds(lessonIds) : Promise.resolve({ data: [] })
                    ]).then(([drillsRes, lessonsRes]) => {
                        const combined = [
                            ...(drillsRes.data || []).map((d: any) => ({ ...d, _type: 'drill' })),
                            ...(lessonsRes.data || []).map((l: any) => ({ ...l, _type: 'lesson' }))
                        ];
                        setRelatedDrills(combined);
                    });
                });
            }
        }
    }, [user, video.id, video.creatorId, isActive]);

    // Handlers
    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!video.creatorId) return;

        // Optimistic UI
        const newStatus = !isFollowed;
        setIsFollowed(newStatus);

        try {
            const { toggleCreatorFollow } = await import('../../lib/api');
            const result = await toggleCreatorFollow(user.id, video.creatorId);
            setIsFollowed(result.followed);
        } catch (error) {
            console.error('Follow failed', error);
            setIsFollowed(!newStatus); // Revert
        }
    };

    const handleLike = async () => {
        if (!user) { navigate('/login'); return; }

        // Optimistic UI
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLocalLikes(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const { toggleSparringLike } = await import('../../lib/api');
            const result = await toggleSparringLike(user.id, video.id);
            setIsLiked(result.liked);
        } catch (error) {
            console.error('Like failed', error);
            setIsLiked(!newStatus); // Revert
            setLocalLikes(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }

        // Optimistic UI
        const newStatus = !isSaved;
        setIsSaved(newStatus);

        try {
            const { toggleSparringSave } = await import('../../lib/api');
            const result = await toggleSparringSave(user.id, video.id);
            setIsSaved(result.saved);
        } catch (error) {
            console.error('Save failed', error);
            setIsSaved(!newStatus); // Revert
        }
    };

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleShare = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsShareModalOpen(true);
    };

    const vimeoFullId = extractVimeoId(video.videoUrl);
    // vimeoHash is re-calculated inside useEffect for options construction to ensure freshness
    // const vimeoHash = getVimeoHash(video.videoUrl);

    // VideoPlayer handles initialization and cleanup

    useEffect(() => {
        // Parent sync if needed
    }, [isActive]);

    // Record View History
    useEffect(() => {
        if (isActive && user && video.id) {
            import('../../lib/api').then(({ recordSparringView }) => {
                recordSparringView(user.id, video.id).catch(console.error);
            });
        }
    }, [isActive, user, video.id]);

    // Watch time tracking for settlement (구독자가 소유하지 않은 경우에만 기록)
    const lastTickRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);

    useEffect(() => {
        if (!isActive || !user || !isSubscriber || !video.id) {
            lastTickRef.current = 0;
            accumulatedTimeRef.current = 0;
            return;
        }

        // Check if user owns this sparring video
        const owns = purchasedItemIds.includes(video.id);
        if (owns) {
            // User owns it, don't record for settlement
            return;
        }

        // Record watch time for subscribers who don't own the video
        const handleProgress = () => {
            const now = Date.now();
            if (lastTickRef.current === 0) {
                lastTickRef.current = now;
                return;
            }

            const elapsed = (now - lastTickRef.current) / 1000;
            lastTickRef.current = now;

            if (elapsed > 0 && elapsed < 5) {
                accumulatedTimeRef.current += elapsed;
            }

            // Record every 10 seconds
            if (accumulatedTimeRef.current >= 10) {
                const timeToSend = Math.floor(accumulatedTimeRef.current);
                accumulatedTimeRef.current -= timeToSend;

                import('../../lib/api').then(({ recordWatchTime }) => {
                    recordWatchTime(user.id, timeToSend, video.id).catch(console.error);
                });
            }
        };

        const interval = setInterval(handleProgress, 1000);
        return () => clearInterval(interval);
    }, [isActive, user, isSubscriber, video.id, purchasedItemIds]);


    // Watch time tracking for preview limit (1 min)
    useEffect(() => {
        if (!user && isActive) {
            // Start timer
            setWatchTime(0);
            timerRef.current = setInterval(() => {
                setWatchTime((prev: number) => {
                    const newTime = prev + 1;
                    if (newTime >= 30) {
                        // 30 seconds reached (updated from 60s)
                        setIsLoginModalOpen(true);
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                        }
                    }
                    return newTime;
                });
            }, 1000);
        } else {
            // Clear timer when not active or user is logged in
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            setWatchTime(0);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isActive, user]);

    const toggleMute = async () => {
        setMuted(!muted);
    };

    // Click Handling for Play/Pause and Like
    const handleVideoClick = () => {
        if (!hasAccess) return;
        if (clickTimeoutRef.current) {
            // Double click detected
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;

            // Trigger like
            handleLike();
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 800);
        } else {
            // Single click - wait to see if double click follows
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                // Toggle play/pause
                setIsPaused(!isPaused);
            }, 250);
        }
    };

    const renderVideoContent = () => {
        const isError = video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error');
        const isProcessing = vimeoFullId && !isError && !video.thumbnailUrl;

        if (isError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">영상 처리 실패</h3>
                    <p className="text-sm text-center text-zinc-400 mb-4 max-w-xs break-all">
                        {video.videoUrl.replace('ERROR:', '').trim()}
                    </p>
                </div>
            );
        }

        if (isProcessing) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-md text-white p-6 z-50">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Play className="w-8 h-8 text-violet-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                        영상을 처리 중입니다
                    </h3>
                    <p className="text-base text-center text-zinc-400 max-w-xs leading-relaxed">
                        Vimeo에서 고화질 인코딩을 진행하고 있습니다.<br />
                        잠시 후면 감상하실 수 있습니다! ✨
                    </p>
                    <div className="mt-8 flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="relative w-full h-full">
                {hasAccess ? (
                    <VideoPlayer
                        vimeoId={vimeoFullId || video.videoUrl || ''}
                        title={video.title}
                        playing={isActive && !isPaused}
                        showControls={false}
                        fillContainer={true}
                        forceSquareRatio={true}
                        onProgress={(s) => {
                            setProgress(s);
                        }}
                        onDoubleTap={handleLike}
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md text-center z-50">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                            <Play className="w-8 h-8 md:w-10 md:h-10 text-violet-500" />
                        </div>
                        <h3 className="text-lg md:text-xl font-bold text-white mb-2">구독자 전용 스파링입니다</h3>
                        <p className="text-zinc-400 text-sm md:text-base mb-6 max-w-xs">
                            멤버십을 구독하고<br />다양한 스파링 분석 영상을 확인해보세요!
                        </p>
                        <button
                            onClick={() => navigate('/pricing')}
                            className="px-8 py-3 bg-violet-600 text-white font-bold rounded-full hover:bg-violet-700 transition-all active:scale-95 shadow-lg shadow-violet-600/20"
                        >
                            멤버십 시작하기
                        </button>
                    </div>
                )}
            </div>
        );
    };

    // Access Control
    const hasAccess = isDailyFreeSparring || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(video.id)));

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className="w-full h-full relative flex items-start justify-center pt-16">
                <div className="relative w-full max-w-[min(100vw,calc(100vh-140px))] aspect-square z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    {renderVideoContent()}
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={handleVideoClick} />

                    {/* Like Animation */}
                    {showLikeAnimation && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <Heart
                                className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                                style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                            />
                        </div>
                    )}

                    {/* Removed from here to move inside the video container */}
                </div>

                {/* Background Blur Effect - Lightened overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none z-30" />

                {/* Overlay Contents */}
                <div className="absolute inset-0 pointer-events-none z-40 flex items-start justify-center">
                    {/* Top-aligned Buttons (Aligned with category dropdown in Watch.tsx) */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-[min(100vw,calc(100vh-140px))] flex justify-between px-4 pointer-events-none">
                        <div className="pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl">
                                {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full aspect-square mt-16 max-w-[min(100vw,calc(100vh-140px))] flex pointer-events-none">


                        {/* Middle-Right Group: Heart, Save, Share */}
                        <div className="absolute bottom-4 right-4 flex flex-col gap-5 z-50 pointer-events-auto items-center">
                            <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                    <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                </button>
                                <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{localLikes.toLocaleString()}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-white' : ''}`} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Info - Moved outside aspect-square container */}
                    <div className="absolute bottom-4 left-0 right-0 w-full px-6 z-[60] text-white pointer-events-none">
                        <div className="w-full max-w-[min(100vw,calc(100vh-140px))] mx-auto flex flex-col items-start gap-2 md:gap-4">
                            {/* LEARN THIS Cards (Horizontal Scroll) */}
                            {relatedDrills.length > 0 && (
                                <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pointer-events-auto pb-2 -mx-2 px-2">
                                    {relatedDrills.map((item: any) => {
                                        const isDrill = item._type === 'drill';
                                        const targetUrl = isDrill ? `/drills/${item.id}` : `/watch?tab=lesson&id=${item.id}`;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={(e) => { e.stopPropagation(); navigate(targetUrl); }}
                                                className="group flex-shrink-0 w-52 md:w-72 flex gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all cursor-pointer items-center active:scale-95"
                                            >
                                                <div className="w-16 md:w-20 aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-white/20 shrink-0 relative">
                                                    {item.thumbnailUrl ? (
                                                        <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700"><Play className="w-6 h-6" /></div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                                                        <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all fill-current" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-[12px] md:text-sm font-bold text-white line-clamp-2 drop-shadow-sm leading-snug">{item.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1 md:mt-1.5">
                                                        <span className={`text-[9px] md:text-[10px] font-black px-1.5 md:px-2 py-0.5 rounded uppercase tracking-wider ${isDrill ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                                                            {isDrill ? 'DRILL' : 'LESSON'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="w-full pointer-events-auto pr-24 bg-gradient-to-t from-black/20 to-transparent p-3 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                <div className="flex items-center gap-3">
                                    {video.category && (
                                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border mb-2 ${video.category === 'Competition'
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            }`}>
                                            {video.category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                                        </div>
                                    )}
                                </div>

                                {video.creator && (
                                    <div className="flex items-center gap-3 mb-2 md:mb-3">
                                        <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                            <div className="relative">
                                                <img src={(video.creator as any).avatar_url || (video.creator as any).image || (video.creator as any).profileImage || `https://ui-avatars.com/api/?name=${video.creator.name}`} className="w-7 md:w-8 h-7 md:h-8 rounded-full border border-white/20 object-cover" />

                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-xs md:text-sm drop-shadow-sm">{video.creator.name}</span>
                                            </div>
                                        </Link>
                                        <span className="text-white/60 text-xs mt-0.5">•</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                            {isFollowed ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                )}
                                <div className="mb-1 md:mb-2">
                                    <h3 className="font-black text-lg md:text-xl lg:text-3xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">{video.title}</h3>
                                </div>
                                {video.description && (
                                    <p className="text-xs md:text-base text-white/70 line-clamp-2 max-w-xl font-medium drop-shadow-md">{video.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <React.Suspense fallback={null}>
                        {isShareModalOpen && (
                            <ShareModal
                                isOpen={isShareModalOpen}
                                onClose={() => setIsShareModalOpen(false)}
                                title={video.title}
                                text={`${video.creator?.name}님의 스파링 영상을 확인해보세요`}
                                imageUrl={video.thumbnailUrl}
                                url={`${window.location.origin}/sparring?id=${video.id}`}
                            />
                        )}
                    </React.Suspense>
                </div>


                {/* Progress Bar / Teaser Bar */}
                <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!user ? 'h-1.5 bg-violet-900/30' : 'h-[2px] bg-zinc-800/50'}`}>
                    <div
                        className={`h-full transition-all ease-linear ${!user ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] duration-1000' : 'bg-violet-400 duration-100'}`}
                        style={{ width: `${!user ? (watchTime / 30) * 100 : progress}%` }}
                    />
                </div>

                {/* Login Modal for non-logged-in users */}
                <ReelLoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => setIsLoginModalOpen(false)}
                    redirectUrl={`/watch?tab=sparring&id=${video.id}`}
                />

            </div>
        </div>
    );
};
