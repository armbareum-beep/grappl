
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, Zap, MessageCircle, ListVideo, Volume2, VolumeX, ChevronLeft, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import Player from '@vimeo/player';
import { useWakeLock } from '../../hooks/useWakeLock';
import { ReelLoginModal } from '../auth/ReelLoginModal';

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../social/ShareModal'));

// --- Helper Functions ---
import { extractVimeoId, recordDrillView } from '../../lib/api';
import { useOrientationFullscreen } from '../../hooks/useOrientationFullscreen';


// --- Sub-Component: Single Video Player ---
interface SingleVideoPlayerProps {
    url?: string;
    thumbnailUrl?: string;
    isActive: boolean; // Is this drill currently the active one in the feed
    isVisible: boolean; // Is this specific video type (Main/Desc) currently visible
    shouldLoad: boolean; // Should we load the video (Active or Neighbor)
    isMuted: boolean;
    isPaused: boolean; // User-triggered pause state
    onReady: () => void;
    onProgress: (percent: number) => void;
    onError: (msg: string) => void;
}

const SingleVideoPlayer: React.FC<SingleVideoPlayerProps> = ({
    url,
    thumbnailUrl,
    isActive,
    isVisible,
    shouldLoad,
    isMuted,
    isPaused,
    onReady,
    onProgress,
    onError
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [_isPlaying, setIsPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    useWakeLock(isActive && isVisible && _isPlaying);

    // Analyze URL
    const vimeoId = useMemo(() => extractVimeoId(url), [url]);
    const useVimeo = !!vimeoId;

    // --- Vimeo Lifecycle ---
    useEffect(() => {
        if (!shouldLoad || !useVimeo || !containerRef.current) {
            // Cleanup if unloading or not vimeo
            if (playerRef.current) {
                // console.log('[SinglePlayer] Destroying Vimeo:', vimeoId);
                playerRef.current.destroy().catch(() => { });
                playerRef.current = null;
                setReady(false);
            }
            return;
        }

        // Initialize Vimeo
        if (!playerRef.current) {
            const fullId = extractVimeoId(url);
            if (!fullId) return;

            const options: any = {
                background: true,
                autoplay: false,
                loop: true,
                muted: isMuted,
                autopause: false,
                controls: false,
                playsinline: true
            };

            const [baseId, hash] = fullId.includes(':') ? fullId.split(':') : [fullId, null];
            let player: Player;

            if (hash) {
                // Manual iframe for private videos (avoid oEmbed auth issues)
                const iframe = document.createElement('iframe');
                const params = new URLSearchParams({
                    h: hash,
                    background: '1',
                    autoplay: '0',
                    loop: '1',
                    muted: isMuted ? '1' : '0',
                    autopause: '0',
                    controls: '0',
                    playsinline: '1',
                    dnt: '1'
                });
                iframe.src = `https://player.vimeo.com/video/${baseId}?${params.toString()}`;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; fullscreen; picture-in-picture';

                containerRef.current!.innerHTML = '';
                containerRef.current!.appendChild(iframe);

                player = new Player(iframe);
            } else {
                options.id = Number(baseId);
                player = new Player(containerRef.current!, options);
            }
            playerRef.current = player;

            player.on('loaded', () => {
                setReady(true);
                onReady(); // Notify parent that this SPECIFIC player is ready
                player.setVolume(isMuted ? 0 : 1);
            });

            player.on('timeupdate', (data) => onProgress(data.percent * 100));
            player.on('play', () => setIsPlaying(true));
            player.on('pause', () => setIsPlaying(false));
            player.on('error', (err) => {
                console.error('[DrillPlayer] Vimeo Error Event:', err);
                onError('재생 오류가 발생했습니다');
            });
        } else {
            // Player already exists, if it's already ready, re-trigger onReady 
            // to ensure parent state (mainVideoReady/descVideoReady) is in sync
            if (ready) {
                onReady();
            }
        }
    }, [shouldLoad, useVimeo, url, ready, onReady]); // Added ready and onReady to deps to ensure sync

    // --- Playback Control ---
    useEffect(() => {
        const player = playerRef.current;
        const videoEl = videoRef.current;

        // Play only if: Active Item AND Visible Type (Action/Desc) AND Ready AND Not Paused
        // Preloading: If !isActive or !isVisible, we pause.
        // Wait: The requirement is to preload neighbors. Neighbors should be loaded but PAUSED.
        // Active item: Currently visible type -> PLAY. Hidden type -> PAUSE (background).

        const shouldPlay = isActive && isVisible && !isPaused;

        if (useVimeo && player && ready) {
            if (shouldPlay) {
                player.play().catch(() => { });
            } else {
                player.pause().catch(() => { });
            }
            player.setVolume(isMuted ? 0 : 1).catch(() => { });
        } else if (!useVimeo && videoEl) {
            if (shouldPlay) {
                videoEl.play().catch(() => { });
            } else {
                videoEl.pause();
            }
            videoEl.muted = isMuted;
        }
    }, [isActive, isVisible, ready, useVimeo, isMuted, shouldLoad, isPaused]);

    // --- Render ---
    if (!shouldLoad) return null; // Unload completely

    if (useVimeo) {
        return (
            <div
                ref={containerRef}
                className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                style={{ opacity: isVisible ? 1 : 0, pointerEvents: 'none' }}
            />
        );
    }

    // HTML5 Fallback
    const videoSrc = url || '/placeholder-drill.mp4';
    return (
        <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: isVisible ? 1 : 0 }}
            loop
            playsInline
            muted={isMuted}
            src={videoSrc}
            poster={thumbnailUrl}
            onTimeUpdate={(e) => onProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
            onLoadedMetadata={() => { setReady(true); onReady(); }}
            onError={() => onError('비디오 로드 실패')}
        />
    );
};


// --- Main Component ---

interface DrillReelItemProps {
    drill: Drill;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
    isLiked: boolean;
    onLike: () => void;
    likeCount: number;
    isSaved: boolean;
    onSave: () => void;
    isFollowed: boolean;
    onFollow: () => void;
    onViewRoutine: () => void;
    offset: number; // -1, 0, 1 for sliding effect
    isSubscriber: boolean;
    purchasedItemIds: string[];
    isLoggedIn: boolean;
    isDailyFreeDrill?: boolean;
    onVideoReady?: () => void;
}

export const DrillReelItem: React.FC<DrillReelItemProps> = ({
    drill,
    isActive,
    isMuted,
    onToggleMute,
    isLiked,
    onLike,
    likeCount,
    isSaved,
    onSave,
    isFollowed,
    onFollow,
    onViewRoutine,
    offset,
    isLoggedIn,
    onVideoReady,
}) => {
    // Logic: 
    // Main Video: Active(0) and Neighbors(+/-1) -> Load for fast feed scrolling.
    // Description Video: Active(0) only -> Load while watching main video. 
    // (Optimization: Don't load neighbor descriptions to save bandwidth for current video)
    const shouldLoadMain = Math.abs(offset) <= 1;
    const shouldLoadDesc = offset === 0;

    // State
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');
    const [progress, setProgress] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [mainVideoReady, setMainVideoReady] = useState(false);
    const [descVideoReady, setDescVideoReady] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);


    // Fullscreen on landscape
    const containerRef = useRef<HTMLDivElement>(null);
    useOrientationFullscreen(containerRef, isActive);

    const isVideoReady = currentVideoType === 'main' ? mainVideoReady : descVideoReady;

    const navigate = useNavigate();
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Reset error state and clear ready states when scrolling away or back
    useEffect(() => {
        if (!isActive) {
            // Optional: reset to main when scrolling away
            if (Math.abs(offset) > 1) {
                setCurrentVideoType('main');
                setMainVideoReady(false);
                setDescVideoReady(false);
            }
        } else {
            // Reset error state when this item becomes active
            setLoadError(null);
        }
    }, [isActive, offset]);

    // Watch time tracking for history and preview
    const { user } = useAuth();

    // Record view for history as soon as it's active
    useEffect(() => {
        if (isActive && user) {
            recordDrillView(drill.id, user.id);
        }
    }, [isActive, drill.id, user]);

    // Watch Time Timer
    useEffect(() => {
        if (isActive && !isPaused && isVideoReady) {
            timerRef.current = setInterval(() => {
                setWatchTime(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, isPaused, isVideoReady]);

    // Free Preview Check
    useEffect(() => {
        // If not logged in, limit to 30s
        if (!isLoggedIn && isActive && watchTime >= 30) {
            setIsPaused(true);
            setIsLoginModalOpen(true);
        }
    }, [watchTime, isLoggedIn, isActive]);


    // Auto polling for processing status


    // URLs
    const actionUrl = drill.vimeoUrl || drill.videoUrl;
    // Prepare description url
    let finalDescUrl = drill.descriptionVideoUrl;
    // If not absolute, assume vimeo ID or path?
    // Actually our api returns signed urls or vimeo urls.

    // --- Handlers ---
    const handleVideoClick = (e: React.MouseEvent) => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            handleDoubleTap(e);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                togglePlay();
            }, 300);
        }
    };

    const handleDoubleTap = (_e: React.MouseEvent) => {
        // Like animation

        setShowLikeAnimation(true);
        setTimeout(() => setShowLikeAnimation(false), 1000);
        if (!isLiked) onLike();
    };

    const togglePlay = () => {
        setIsPaused(!isPaused);
    };

    // --- Touch/Swipe Logic ---
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

    // Swipe needs to be handled carefully. 
    // We already have vertical swipe in parent. Here we want Horizontal swipe for Video Type.
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({
            x: e.targetTouches[0].clientX,
            y: e.targetTouches[0].clientY
        });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;

        const xDistance = touchStart.x - touchEndX;
        const yDistance = touchStart.y - touchEndY;

        // Horizontal Swipes (check if horizontal movement is dominant)
        if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > 50) {
            if (xDistance > 0) { // Swipe Left -> Show Description
                if (currentVideoType === 'main') {
                    setCurrentVideoType('description');
                }
            } else { // Swipe Right -> Show Main
                if (currentVideoType === 'description') {
                    setCurrentVideoType('main');
                }
            }
        }
        // Vertical swipes are handled by parent (propagation)

        setTouchStart(null);
    };


    const isProcessing = !drill.vimeoUrl && (!drill.videoUrl || drill.videoUrl.includes('placeholder'));

    // Notify parent when this item is ready to display
    const onVideoReadyRef = useRef(onVideoReady);
    onVideoReadyRef.current = onVideoReady;
    useEffect(() => {
        if (!isProcessing && (loadError || mainVideoReady)) {
            onVideoReadyRef.current?.();
        }
    }, [isProcessing, loadError, mainVideoReady]);

    if (isProcessing) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950" style={{ transform: `translateY(${offset * 100}%)` }}>
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white mb-2">영상 처리 중입니다...</h2>
                <p className="text-slate-400 text-center max-w-xs mb-8">잠시만 기다려주세요.</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            {/* Video Layer */}
            <div className="absolute inset-0 bg-black flex items-center justify-center">
                <div className="relative w-full h-full max-w-[56.25vh] bg-black">
                    {/* Action Player */}
                    <SingleVideoPlayer
                        url={actionUrl}
                        thumbnailUrl={drill.thumbnailUrl}
                        isActive={isActive}
                        isVisible={currentVideoType === 'main'}
                        shouldLoad={shouldLoadMain}
                        isMuted={isMuted}
                        isPaused={isPaused}
                        onReady={() => setMainVideoReady(true)}
                        onProgress={(p) => { if (currentVideoType === 'main') setProgress(p); }}
                        onError={(e) => setLoadError(e)}
                    />

                    {/* Description Player */}
                    <SingleVideoPlayer
                        url={finalDescUrl}
                        thumbnailUrl={drill.thumbnailUrl} // Or desc thumbnail?
                        isActive={isActive}
                        isVisible={currentVideoType === 'description'}
                        shouldLoad={shouldLoadDesc} // Load only when active (or neighborhood if we wanted)
                        isMuted={isMuted}
                        isPaused={isPaused}
                        onReady={() => setDescVideoReady(true)}
                        onProgress={(p) => { if (currentVideoType === 'description') setProgress(p); }}
                        onError={(e) => setLoadError(e)}
                    />

                    {/* Click Handler Overlay */}
                    <div
                        className="absolute inset-0 z-30 cursor-pointer"
                        onClick={handleVideoClick}
                    />

                    {/* Like Animation */}
                    {showLikeAnimation && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <Heart
                                className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                                style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                            />
                        </div>
                    )}

                    {/* Loading Overlay (only if current video not ready) */}
                    {shouldLoadMain && !isVideoReady && !loadError && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            <img src={drill.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                            {isActive && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Overlay */}
                    {loadError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 z-30 bg-black">
                            <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
                            <p>{loadError}</p>
                        </div>
                    )}

                </div>
            </div>

            {/* Controls & UI Layer (Same as before) */}
            {isActive && (
                <div className="absolute inset-0 z-40 pointer-events-none flex justify-center">
                    <div className="relative h-full w-full max-w-[56.25vh] flex">
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center py-6 pl-4 pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 mb-4">
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCurrentVideoType('main'); }}
                                    className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'main' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <Zap className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'main' ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentVideoType('description');
                                    }}
                                    className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <MessageCircle className={`w-5 h-5 md:w-5 md:h-5 ${currentVideoType === 'description' ? 'fill-current' : 'fill-none'}`} />
                                </button>
                            </div>
                        </div>

                        <div className="absolute top-6 right-4 z-[70] pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 shadow-2xl">
                                {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>

                        <div className="absolute bottom-10 right-4 flex flex-col gap-5 z-[70] pointer-events-auto items-center">
                            <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90 shadow-2xl">
                                    <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''}`} />
                                </button>
                                <span className="text-[11px] md:text-sm font-bold text-white shadow-black drop-shadow-md">{likeCount}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); onViewRoutine(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90 shadow-2xl">
                                <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90 shadow-2xl">
                                <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-zinc-100' : ''}`} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90 shadow-2xl">
                                <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Metadata Footer - Lowered on mobile */}
            <div className="absolute left-0 right-0 w-full bottom-10 px-6 z-40 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto">
                    <div className="flex-1 pr-20">
                        <div className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">DRILL</div>
                        <div className="flex items-center gap-3 mb-3">
                            <Link to={`/creator/${drill.creatorId}`} className="flex items-center gap-2 hover:opacity-80 pointer-events-auto">
                                {(drill as any).creatorProfileImage && (
                                    <img src={(drill as any).creatorProfileImage} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                )}
                                <span className="text-white font-bold text-sm drop-shadow-sm">{drill.creatorName || 'Instructor'}</span>
                            </Link>
                            <span className="text-white/60 text-xs">•</span>
                            <button onClick={(e) => { e.stopPropagation(); onFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 pointer-events-auto ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                {isFollowed ? 'Following' : 'Follow'}
                            </button>
                        </div>
                        <h3 className="font-black text-lg md:text-xl lg:text-3xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                            {drill.title}
                            {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
                        </h3>
                        {drill.tags && drill.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {(drill.tags || []).slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="text-white/90 text-sm">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!isLoggedIn ? 'h-1.5 bg-violet-900/30' : 'h-[2px] bg-zinc-800/50'}`}>
                <div
                    className={`h-full transition-all ease-linear ${!isLoggedIn ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] duration-1000' : 'bg-violet-400 duration-100'}`}
                    style={{ width: `${!isLoggedIn ? (watchTime / 30) * 100 : progress}%` }}
                />
            </div>

            {/* Login Modal for non-logged-in users */}
            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl={`/watch?tab=drill&id=${drill.id}`}
            />

            {/* Share Modal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={drill.title}
                        text={`${drill.creatorName || 'Instructor'}님의 드릴을 확인해보세요`}
                        imageUrl={drill.thumbnailUrl}
                        url={`${window.location.origin}/watch?tab=drill&id=${drill.id}`}
                    />
                )}
            </React.Suspense>

        </div>
    );
};
