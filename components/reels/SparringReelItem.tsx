import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparringVideo } from '../../types';
import { Share2, Volume2, VolumeX, Bookmark, Heart, ChevronLeft, Play } from 'lucide-react';
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
    dailyFreeId?: string;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onVideoReady?: () => void;
}

export const SparringReelItem: React.FC<SparringReelItemProps> = ({
    video,
    isActive,
    offset,
    isSubscriber,
    purchasedItemIds = [],
    isLoggedIn,
    isDailyFreeSparring: isDailyFreeSparringProp = false,
    dailyFreeId,
    isMuted = false,
    onToggleMute,
    onVideoReady
}) => {
    // Interaction State
    const { user } = useAuth();
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);

    const navigate = useNavigate();

    // Login modal state for non-logged-in users
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Fullscreen on landscape
    const containerRef = useRef<HTMLDivElement>(null);
    useOrientationFullscreen(containerRef, isActive);

    // Check interaction status and fetch related drills/lessons on load
    useEffect(() => {
        if (isActive) {
            if (user && video.creatorId) {
                import('../../lib/api').then(({ getSparringInteractionStatus }) => {
                    getSparringInteractionStatus(user.id, video.id, video.creatorId)
                        .then(status => {
                            setIsFollowed(status.followed);
                            setIsLiked(status.liked);
                            setIsSaved(status.saved);
                        })
                        .catch(console.error);
                });
            }
        }
    }, [user?.id, video.id, video.creatorId, isActive]);

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

    // Compute processing/error states (used for rendering and ready detection)
    const isVideoError = !!(video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error'));
    const isVideoProcessing = !!(vimeoFullId && !isVideoError && !video.thumbnailUrl);

    // Notify parent when this item is ready to display
    const [videoPlayerReady, setVideoPlayerReady] = useState(false);
    const onVideoReadyRef = useRef(onVideoReady);
    onVideoReadyRef.current = onVideoReady;
    useEffect(() => {
        if (!isVideoProcessing && (isVideoError || videoPlayerReady)) {
            onVideoReadyRef.current?.();
        }
    }, [isVideoError, isVideoProcessing, videoPlayerReady]);

    // Record View History
    useEffect(() => {
        if (isActive && user && video.id) {
            import('../../lib/api').then(({ recordSparringView }) => {
                recordSparringView(user.id, video.id).catch(console.error);
            });
        }
    }, [isActive, user?.id, video.id]);

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
    }, [isActive, user?.id, isSubscriber, video.id, purchasedItemIds]);


    // Access Control
    // Move hasAccess definition UP to before its first usage in useEffect
    const isDailyFreeSparring = isDailyFreeSparringProp || (dailyFreeId && dailyFreeId === video.id);
    // Allow access if: Daily Free OR 0 Won Video OR (Logged In AND (Subscribed OR Purchased))
    const hasAccess = isDailyFreeSparring || video.price === 0 || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(video.id)));

    // Access Control: Show login modal immediately if no access
    useEffect(() => {
        if (!hasAccess && isActive && !isVideoProcessing) {
            setIsLoginModalOpen(true);
        }
    }, [isActive, hasAccess, isVideoProcessing]);

    const toggleMute = async () => {
        onToggleMute?.();
    };

    // Click Handling for Play/Pause and Like
    const handleVideoClick = () => {
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
        if (isVideoError) {
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

        if (isVideoProcessing) {
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
                <VideoPlayer
                    vimeoId={vimeoFullId || video.videoUrl || ''}
                    title={video.title}
                    playing={isActive && !isPaused}
                    showControls={false}
                    fillContainer={true}
                    forceSquareRatio={true}
                    onProgress={(s, d, p) => {
                        setProgress(p ? p * 100 : 0);
                    }}
                    onReady={() => setVideoPlayerReady(true)}
                    onDoubleTap={handleLike}
                    muted={isMuted}
                    isPreviewMode={!isLoggedIn && (isDailyFreeSparring || video.price === 0)}
                    maxPreviewDuration={60}
                    onPreviewLimitReached={() => setIsLoginModalOpen(true)}
                />
            </div>
        );
    };

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
                                {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Main Interaction Buttons - High z-index and absolute bottom */}
                    <div className="absolute bottom-10 right-4 flex flex-col gap-5 z-[70] pointer-events-auto items-center">
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
                    {/* Bottom Info - Moved outside aspect-square container */}
                    <div className="absolute bottom-10 left-0 right-0 w-full px-6 z-[60] text-white pointer-events-none">
                        <div className="w-full max-w-[min(100vw,calc(100vh-140px))] mx-auto flex flex-col items-start gap-2 md:gap-4">
                            <div className="w-full pointer-events-auto pr-20 bg-gradient-to-t from-black/20 to-transparent p-3 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
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


                <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!hasAccess ? 'h-1.5 bg-violet-900/30' : 'h-1 bg-zinc-800/40'}`}>
                    <div
                        className={`h-full transition-all ease-linear ${!hasAccess ? 'bg-white/40' : 'bg-violet-500 duration-100'}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Login Modal for non-logged-in/unauthorized users */}
                <ReelLoginModal
                    isOpen={isLoginModalOpen}
                    onClose={() => setIsLoginModalOpen(false)}
                    redirectUrl={`/watch?tab=sparring&id=${video.id}`}
                />

            </div>
        </div>
    );
};
