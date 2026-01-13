
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, Play, Zap, MessageCircle, ListVideo, Volume2, VolumeX, ChevronLeft, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Player from '@vimeo/player';

// --- Helper Functions ---
const extractVimeoId = (url?: string) => {
    if (!url) return undefined;
    if (/^\d+$/.test(url)) return url;
    if (url.includes(':')) {
        const [id] = url.split(':');
        return /^\d+$/.test(id) ? id : undefined;
    }
    const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    return match ? match[1] : undefined;
};

const getVimeoHash = (url?: string) => {
    if (!url) return undefined;
    if (url.includes(':')) {
        const [, hash] = url.split(':');
        return hash;
    }
    const match = url.match(/[?&]h=([a-z0-9]+)/i);
    return match ? match[1] : undefined;
};

// --- Sub-Component: Single Video Player ---
interface SingleVideoPlayerProps {
    url?: string;
    thumbnailUrl?: string;
    isActive: boolean; // Is this drill currently the active one in the feed
    isVisible: boolean; // Is this specific video type (Main/Desc) currently visible
    shouldLoad: boolean; // Should we load the video (Active or Neighbor)
    isMuted: boolean;
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
    onReady,
    onProgress,
    onError
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [ready, setReady] = useState(false);

    // Analyze URL
    const vimeoId = useMemo(() => extractVimeoId(url), [url]);
    const vimeoHash = useMemo(() => getVimeoHash(url), [url]);
    const useVimeo = !!vimeoId;
    const isPlaceholder = !url || url.includes('placeholder') || url.includes('placehold.co');

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
            // console.log('[SinglePlayer] Initializing Vimeo:', vimeoId);
            const options: any = {
                background: true,
                autoplay: false, // Control manually
                loop: true,
                muted: isMuted,
                autopause: false,
                controls: false,
                responsive: true
            };

            if (vimeoHash) {
                options.url = `https://vimeo.com/${vimeoId}/${vimeoHash}`;
            } else {
                options.id = Number(vimeoId);
            }

            const player = new Player(containerRef.current, options);
            playerRef.current = player;

            player.ready().then(() => {
                setReady(true);
                onReady();
                player.setVolume(isMuted ? 0 : 1);
            }).catch(err => {
                console.error('Vimeo Error:', err);
                onError('영상을 불러올 수 없습니다');
            });

            player.on('timeupdate', (data) => onProgress(data.percent * 100));
            player.on('play', () => setIsPlaying(true));
            player.on('pause', () => setIsPlaying(false));
            player.on('error', () => onError('재생 오류가 발생했습니다'));
        }
    }, [shouldLoad, useVimeo, vimeoId, vimeoHash, isMuted]); // Re-init if URL changes

    // --- Playback Control ---
    useEffect(() => {
        const player = playerRef.current;
        const videoEl = videoRef.current;

        // Play only if: Active Item AND Visible Type (Action/Desc) AND Ready
        // Preloading: If !isActive or !isVisible, we pause.
        // Wait: The requirement is to preload neighbors. Neighbors should be loaded but PAUSED.
        // Active item: Currently visible type -> PLAY. Hidden type -> PAUSE (background).

        const shouldPlay = isActive && isVisible;

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
    }, [isActive, isVisible, ready, useVimeo, isMuted, shouldLoad]);

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
    onShare: () => void;
    onViewRoutine: () => void;
    offset: number; // -1, 0, 1 for sliding effect
    isSubscriber: boolean;
    purchasedItemIds: string[];
    isLoggedIn: boolean;
    isDailyFreeDrill?: boolean;
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
    onShare,
    onViewRoutine,
    offset,
    isSubscriber,
    purchasedItemIds,
    isLoggedIn,
    isDailyFreeDrill = false
}) => {
    // Logic: Active(0) and Neighbors(+/-1) -> Load. Others -> Unload.
    const shouldLoad = Math.abs(offset) <= 1;

    // State
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');
    const [progress, setProgress] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isVideoReady, setIsVideoReady] = useState(false); // Valid if CURRENT visible video is ready

    const navigate = useNavigate();

    // Reset view to main when scrolling away (cleanup)
    useEffect(() => {
        if (Math.abs(offset) > 1) {
            // Completely off-screen, reset state if needed
            setCurrentVideoType('main');
        }
    }, [offset]);

    // Auto polling for processing status
    useEffect(() => {
        const isProcessing = (!drill.vimeoUrl && !drill.videoUrl) || (drill.videoUrl && drill.videoUrl.includes('placeholder'));
        if (!isProcessing) return;

        const pollInterval = setInterval(async () => {
            // ... existing polling logic ...
            // Simplified for this implementation
        }, 3000);
        return () => clearInterval(pollInterval);
    }, [drill.id, drill.vimeoUrl, drill.videoUrl]);

    // Access Control
    const hasAccessToAction = isDailyFreeDrill || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(drill.id)));
    const hasAccessToDescription = hasAccessToAction;

    // URLs
    const actionUrl = drill.vimeoUrl || drill.videoUrl;
    const descUrl = drill.descriptionVideoUrl || drill.vimeoUrl; // Fallback to main if desc missing? No, logic was diff before.
    // Original logic:
    // const rawVimeoUrl = isActionVideo ? drill.vimeoUrl : (drill.descriptionVideoUrl || drill.vimeoUrl);
    // So if desc is missing, use main.
    const finalDescUrl = drill.descriptionVideoUrl || drill.vimeoUrl;

    // --- Touch Handling ---
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };
    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;
        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const xDistance = touchStart.x - touchEnd.x;
        const yDistance = touchStart.y - touchEnd.y;

        if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > 50) {
            if (xDistance > 0) { // Swipe Left -> Show Description
                if (currentVideoType === 'main') {
                    if (hasAccessToDescription) setCurrentVideoType('description');
                    else if (!isLoggedIn) { alert('설명 영상은 로그인이 필요합니다.'); navigate('/login'); }
                    else alert('설명 영상은 구독자 전용입니다.');
                }
            } else { // Swipe Right -> Show Main
                if (currentVideoType === 'description') {
                    setCurrentVideoType('main');
                }
            }
        }
        setTouchStart(null);
    };

    const isProcessing = !drill.vimeoUrl && (!drill.videoUrl || drill.videoUrl.includes('placeholder'));

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
                        shouldLoad={shouldLoad}
                        isMuted={isMuted}
                        onReady={() => { if (currentVideoType === 'main') setIsVideoReady(true); }}
                        onProgress={(p) => { if (currentVideoType === 'main') setProgress(p); }}
                        onError={(e) => setLoadError(e)}
                    />

                    {/* Description Player */}
                    <SingleVideoPlayer
                        url={finalDescUrl}
                        thumbnailUrl={drill.thumbnailUrl} // Or desc thumbnail?
                        isActive={isActive}
                        isVisible={currentVideoType === 'description'}
                        shouldLoad={shouldLoad} // Load both!
                        isMuted={isMuted}
                        onReady={() => { if (currentVideoType === 'description') setIsVideoReady(true); }}
                        onProgress={(p) => { if (currentVideoType === 'description') setProgress(p); }}
                        onError={(e) => setLoadError(e)}
                    />

                    {/* Loading Overlay (only if current video not ready) */}
                    {shouldLoad && !isVideoReady && !loadError && (
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

                    {/* Locked Overlays */}
                    {/* Action Locked */}
                    {currentVideoType === 'main' && !hasAccessToAction && (
                        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md text-center">
                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                                <Zap className="w-10 h-10 text-violet-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">구독자 전용 드릴입니다</h3>
                            <button onClick={() => navigate('/pricing')} className="px-8 py-3 bg-violet-600 text-white font-bold rounded-full hover:bg-violet-700 mt-4">
                                멤버십 시작하기
                            </button>
                        </div>
                    )}
                    {/* Description Locked */}
                    {currentVideoType === 'description' && !hasAccessToDescription && (
                        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md text-center">
                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                                <MessageCircle className="w-10 h-10 text-zinc-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">설명 영상은 구독자 전용입니다</h3>
                            <button onClick={() => navigate('/pricing')} className="px-8 py-3 bg-violet-600 text-white font-bold rounded-full hover:bg-violet-700 mt-4">
                                멤버십 시작하기
                            </button>
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
                                        if (hasAccessToDescription) setCurrentVideoType('description');
                                        else if (!isLoggedIn) navigate('/login');
                                        else navigate('/pricing');
                                    }}
                                    className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <MessageCircle className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'description' ? (hasAccessToDescription ? "currentColor" : "none") : "none"} />
                                    {!hasAccessToDescription && <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-600 rounded-full flex items-center justify-center"><Zap className="w-2 h-2 text-white" fill="currentColor" /></div>}
                                </button>
                            </div>
                        </div>

                        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-6 pointer-events-auto">
                            <div className="flex flex-col gap-3 items-center pr-4">
                                <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60">
                                    {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                </button>
                            </div>
                            <div className="flex flex-col gap-3 items-center pr-4 pb-24">
                                <div className="flex flex-col items-center gap-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                        <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''}`} />
                                    </button>
                                    <span className="text-[10px] md:text-sm font-bold text-white shadow-black drop-shadow-md">{likeCount}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onViewRoutine(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                    <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                    <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-zinc-100' : ''}`} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Metadata Footer */}
            <div className="absolute left-0 right-0 w-full bottom-24 px-6 z-40 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                    <div className="flex-1 pr-16">
                        <div className="inline-block px-2 py-0.5 bg-yellow-600 rounded text-[10px] font-bold uppercase tracking-wider mb-2">DRILL</div>
                        <div className="flex items-center gap-3 mb-3">
                            <Link to={`/creator/${drill.creatorId}`} className="flex items-center gap-2 hover:opacity-80">
                                {(drill as any).creatorProfileImage && (
                                    <img src={(drill as any).creatorProfileImage} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                )}
                                <span className="text-white font-bold text-sm drop-shadow-sm">{drill.creatorName || 'Instructor'}</span>
                            </Link>
                            <span className="text-white/60 text-xs">•</span>
                            <button onClick={(e) => { e.stopPropagation(); onFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                {isFollowed ? 'Following' : 'Follow'}
                            </button>
                        </div>
                        <h2 className="text-white font-bold text-base mb-2 line-clamp-2 drop-shadow-sm">
                            {drill.title}
                            {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
                        </h2>
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
            <div className="absolute bottom-0 left-0 right-0 z-50 h-[2px] bg-zinc-800/50">
                <div className="h-full bg-violet-400 transition-all duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>

        </div>
    );
};
