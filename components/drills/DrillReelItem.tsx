
import React, { useRef, useState, useEffect, useMemo, memo } from 'react';
import { Drill } from '../../types';
import { Zap, MessageCircle, ListVideo, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import Player from '@vimeo/player';
// import { useWakeLock } from '../../hooks/useWakeLock';
import { BaseReelItem } from '../reels/BaseReelItem';

// --- Helper Functions ---
import { extractVimeoId } from '../../lib/api';

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
    onPlay?: () => void;
    onProgress: (percent: number, seconds?: number) => void;
    onError: (msg: string) => void;
    isPreviewMode?: boolean;
    maxPreviewDuration?: number;
    onPreviewLimitReached?: () => void;
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
    onPlay,
    onProgress,
    onError,
    isPreviewMode = false,
    maxPreviewDuration,
    onPreviewLimitReached
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [_isPlaying, setIsPlaying] = useState(false);
    const [ready, setReady] = useState(false);
    // Removed useWakeLock temporarily to rule out crash source
    // useWakeLock(isActive && isVisible && _isPlaying);

    // Analyze URL
    const vimeoId = useMemo(() => extractVimeoId(url), [url]);
    const useVimeo = !!vimeoId;

    // --- Vimeo Lifecycle ---
    // --- Vimeo Lifecycle ---
    useEffect(() => {
        // Early return if no valid URL or shouldn't load
        if (!url || !shouldLoad) {
            if (!url && shouldLoad) {
                onReady(); // Still notify ready to unblock navigation
            }
            return;
        }

        let isMounted = true;

        // Initialize Vimeo
        if (!playerRef.current) {
            const fullId = extractVimeoId(url);
            console.log('[SingleVideoPlayer] Init ID:', fullId, 'for URL:', url);

            if (!fullId) {
                console.error('[SingleVideoPlayer] Failed to extract vimeo ID from:', url);
                onError('비디오 ID 오류');
                return;
            }

            // Common options for both SDK and Iframe
            const options: any = {
                autoplay: false, // We control playback manually via useEffect
                loop: true,
                muted: isMuted,
                autopause: false,
                controls: false,
                playsinline: true,
                dnt: true
            };

            const [baseId, hash] = fullId.includes(':') ? fullId.split(':') : [fullId, null];
            let player: Player;

            try {
                if (hash) {
                    console.log('[SingleVideoPlayer] Creating manual iframe for Private Video. ID:', baseId, 'Hash:', hash);
                    // Manual iframe for private videos (avoid oEmbed auth issues)
                    const iframe = document.createElement('iframe');
                    const params = new URLSearchParams({
                        h: hash,
                        autoplay: '0',
                        loop: '1',
                        muted: isMuted ? '1' : '0',
                        autopause: '0',
                        controls: '0',
                        playsinline: '1',
                        dnt: '1',
                        background: '0' // Explicitly disable background mode
                    });
                    iframe.src = `https://player.vimeo.com/video/${baseId}?${params.toString()}`;
                    iframe.width = '100%';
                    iframe.height = '100%';
                    iframe.frameBorder = '0';
                    iframe.allow = 'autoplay; fullscreen; picture-in-picture';

                    if (containerRef.current) {
                        containerRef.current.innerHTML = '';
                        containerRef.current.appendChild(iframe);
                    }

                    player = new Player(iframe);
                } else {
                    options.id = Number(baseId);
                    if (containerRef.current) {
                        player = new Player(containerRef.current, options);
                    } else {
                        return;
                    }
                }
                playerRef.current = player;

                // Immediately notify parent to hide loading overlay
                // Vimeo iframe will show its own loading state (black screen -> video)
                console.log('[SingleVideoPlayer] Player created, notifying ready immediately');
                onReady();

                // Track actual ready state for playback control
                player.ready().then(() => {
                    if (!isMounted) return;
                    console.log('[SingleVideoPlayer] Player .ready() resolved!', url);
                    setReady(true); // Now we can control playback
                    player.setVolume(isMuted ? 0 : 1).catch(() => { });
                }).catch(e => {
                    console.warn('[SingleVideoPlayer] .ready() failed', e);
                    // Still allow playback attempts
                    setReady(true);
                });

                player.on('loaded', () => {
                    if (!isMounted) return;
                    console.log('[SingleVideoPlayer] Player Loaded Event!', url);
                    setReady(true);
                    player.setVolume(isMuted ? 0 : 1).catch(() => { });
                });

                player.on('timeupdate', (data) => {
                    if (!isMounted) return;
                    const seconds = data.seconds;
                    if (seconds > 0.1) {
                        onPlay?.();
                        // Force ready state if it wasn't set (backup for missed 'loaded' event)
                        setReady(prev => {
                            if (!prev) onReady();
                            return true;
                        });
                    }

                    if (isPreviewMode && maxPreviewDuration) {
                        onProgress((seconds / maxPreviewDuration) * 100, seconds);
                    } else {
                        onProgress(data.percent * 100, seconds);
                    }

                    // Preview limit check
                    if (isPreviewMode && maxPreviewDuration && seconds >= maxPreviewDuration) {
                        player?.pause().catch(() => { });
                        onPreviewLimitReached?.();
                    }
                });
                player.on('play', () => {
                    if (!isMounted) return;
                    setIsPlaying(true);
                    onPlay?.();
                    // Force ready state if it wasn't set
                    setReady(prev => {
                        if (!prev) onReady();
                        return true;
                    });
                });
                player.on('pause', () => { if (isMounted) setIsPlaying(false); });
                player.on('error', (err) => {
                    console.error('[DrillPlayer] Vimeo Error Event:', err);
                    onError('재생 오류가 발생했습니다');
                    onReady();
                });
            } catch (initError) {
                console.error('[DrillPlayer] Initialization failed:', initError);
                onError('플레이어 초기화 실패');
                onReady(); // prevent hang
            }
        } else {
            // Player already exists, if it's already ready, re-trigger onReady 
            if (ready) {
                onReady();
            }
        }

        // CLEANUP FUNCTION
        return () => {
            isMounted = false;
            const player = playerRef.current;
            playerRef.current = null;

            if (player) {
                player.destroy().catch(() => { });
            }

            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
            setReady(false);
        };
    }, [shouldLoad, useVimeo, url]);

    // --- Playback Control ---
    useEffect(() => {
        const player = playerRef.current;
        const videoEl = videoRef.current;

        // ONLY play active item to prevent device resource exhaustion and auto-pause conflicts
        const shouldPlay = isActive && isVisible && !isPaused;

        const syncPlayback = async () => {
            if (useVimeo && player && ready) {
                try {
                    if (!shouldPlay) {
                        await player.pause();
                    } else {
                        const isPlayerPaused = await player.getPaused();
                        if (isPlayerPaused) {
                            try {
                                await player.play();
                            } catch (playError: any) {
                                console.warn('[DrillPlayer] First play attempt failed:', playError);
                                // If autoplay blocked, try muting
                                if (playError.name === 'NotAllowedError') {
                                    console.log('[DrillPlayer] Autoplay blocked, trying muted...');
                                    await player.setVolume(0);
                                    await player.setMuted(true);
                                    try {
                                        await player.play();
                                        console.log('[DrillPlayer] Muted autoplay success');
                                    } catch (retryError) {
                                        console.error('[DrillPlayer] Muted autoplay also failed:', retryError);
                                        // CRITICAL: Even if playback fails, notify "Play" to remove spinner
                                        // so the user sees the paused video player (and can tap it to play)
                                        onPlay?.();
                                    }
                                } else {
                                    // Other errors
                                    console.error('[DrillPlayer] Play error:', playError);
                                    // Still remove spinner
                                    onPlay?.();
                                }
                            }
                        } else {
                            // Already playing - ensure parent knows
                            onPlay?.();
                        }
                    }
                    await player.setVolume(isMuted ? 0 : 1);
                    // CRITICAL: After unmuting, immediately call play() to prevent pause
                    // Vimeo player may pause briefly when transitioning from muted to unmuted
                    if (!isMuted && shouldPlay) {
                        const stillPaused = await player.getPaused();
                        if (stillPaused) {
                            await player.play();
                        }
                    }
                } catch (e) {
                    console.warn('[DrillPlayer] Playback sync generic error:', e);
                    // If something renders wrong, try to clear spinner
                    if (shouldPlay) onPlay?.();
                }
            } else if (!useVimeo && videoEl) {
                if (shouldPlay) {
                    videoEl.play().catch(() => { });
                } else {
                    videoEl.pause();
                }
                videoEl.muted = isMuted;
            }
        };

        syncPlayback();
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
            onTimeUpdate={(e) => {
                const ct = e.currentTarget.currentTime;
                if (ct > 0.1) onPlay?.();
                onProgress((ct / e.currentTarget.duration) * 100);
            }}
            onPlay={() => onPlay?.()}
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

export const DrillReelItem: React.FC<DrillReelItemProps> = memo(({
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
    isSubscriber,
    purchasedItemIds,
    isLoggedIn,
    isDailyFreeDrill = false,
    onVideoReady,
}) => {
    const { user } = useAuth();
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');
    const [mainVideoReady, setMainVideoReady] = useState(false);
    const [descVideoReady, setDescVideoReady] = useState(false);
    // Track actual playback start to hide thumbnails seamlessly
    const [mainVideoStarted, setMainVideoStarted] = useState(false);
    const [descVideoStarted, setDescVideoStarted] = useState(false);
    const [mainError, setMainError] = useState<string | null>(null);
    const [descError, setDescError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // User Interaction State for Play/Pause
    const [userPaused, setUserPaused] = useState(false);

    // Reset state when drill changes or inactive
    useEffect(() => {
        if (!isActive) {
            setCurrentVideoType('main');
            setUserPaused(false);
        }
    }, [isActive, drill.id]);

    // Active item always loads. Neighbors only load if within range.
    // Priority: Active first, then neighbors
    const isActiveItem = offset === 0;
    const isNeighbor = Math.abs(offset) === 1;

    // Load main video: active always, neighbors after small delay via parent's readyItems
    const shouldLoadMain = isActiveItem || isNeighbor;
    const shouldLoadDesc = isActiveItem; // Description only for active item

    // Current error for the selected video type
    const currentError = currentVideoType === 'main' ? mainError : descError;

    // Access Control
    const drillPrice = Number((drill as any).price || 0);
    const hasAccess = isDailyFreeDrill || drillPrice === 0 || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(drill.id)));

    // Record view history
    useEffect(() => {
        if (isActive && user && hasAccess) {
            import('../../lib/api').then(({ recordDrillView }) => {
                recordDrillView(drill.id).catch(console.error);
            });
        }
    }, [isActive, drill.id, user, hasAccess]);

    // Notify ready for swipe blocking
    // Active: wait for playback start, Neighbor: ready when loaded
    useEffect(() => {
        const isReady = currentVideoType === 'main' ? mainVideoReady : descVideoReady;
        const isStarted = currentVideoType === 'main' ? mainVideoStarted : descVideoStarted;

        console.log('[DrillReelItem] Ready check - id:', drill.id, 'isActive:', isActive, 'isReady:', isReady, 'isStarted:', isStarted);

        if (!isReady) return;

        if (isActive) {
            // Active: wait for playback
            if (isStarted) {
                console.log('[DrillReelItem] Active video started, notifying ready - id:', drill.id);
                onVideoReady?.();
            }
        } else {
            // Neighbor: ready when loaded
            console.log('[DrillReelItem] Neighbor video loaded, notifying ready - id:', drill.id);
            onVideoReady?.();
        }
    }, [currentVideoType, mainVideoReady, mainVideoStarted, descVideoReady, descVideoStarted, isActive, onVideoReady, drill.id]);

    const actionUrl = drill.vimeoUrl || drill.videoUrl;
    const finalDescUrl = drill.descriptionVideoUrl;

    // Debug: 설명 영상 URL 확인
    useEffect(() => {
        if (isActive) {
            console.log('[DrillReelItem] drill.id:', drill.id);
            console.log('[DrillReelItem] drill.vimeoUrl:', drill.vimeoUrl);
            console.log('[DrillReelItem] drill.videoUrl:', drill.videoUrl);
            console.log('[DrillReelItem] Derived actionUrl:', actionUrl);
            console.log('[DrillReelItem] finalDescUrl:', finalDescUrl);
            console.log('[DrillReelItem] currentVideoType:', currentVideoType);
            console.log('[DrillReelItem] shouldLoadMain:', shouldLoadMain, 'userPaused:', userPaused);
        }
    }, [isActive, drill, currentVideoType, finalDescUrl]);

    // Safety Timeout: Force show video after 2s even if not started (prevents stuck loading)
    useEffect(() => {
        if (!isActive) return;

        const timeout = setTimeout(() => {
            if (currentVideoType === 'main' && !mainVideoStarted && !mainError) {
                console.log('[DrillReelItem] Safety timeout - forcing main start');
                setMainVideoStarted(true);
            }
            if (currentVideoType === 'description' && !descVideoStarted && !descError) {
                console.log('[DrillReelItem] Safety timeout - forcing desc start');
                setDescVideoStarted(true);
            }
        }, 2000); // Reduced from 4s to 2s

        return () => clearTimeout(timeout);
    }, [isActive, currentVideoType, mainVideoStarted, descVideoStarted, mainError, descError]);

    return (
        <BaseReelItem
            id={drill.id}
            type="drill"
            title={drill.title}
            videoUrl={actionUrl || ''}
            thumbnailUrl={drill.thumbnailUrl}
            creatorId={drill.creatorId}
            creatorName={drill.creatorName}
            creatorProfileImage={(drill as any).creatorProfileImage}
            isActive={isActive}
            offset={offset}
            isLiked={isLiked}
            likeCount={likeCount}
            onLike={onLike}
            isSaved={isSaved}
            onSave={onSave}
            isFollowed={isFollowed}
            onFollow={onFollow}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            hasAccess={hasAccess}
            isLoggedIn={isLoggedIn}
            redirectUrl={`/watch?tab=drill&id=${drill.id}`}
            shareText={`${drill.creatorName || 'Instructor'}님의 드릴을 확인해보세요`}
            aspectRatio="portrait"
            maxPreviewDuration={30}
            renderHeaderActions={() => (
                <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('[DrillReelItem] Setting video type to MAIN');
                            setCurrentVideoType('main');
                        }}
                        className={`p-2 md:p-2.5 rounded-full transition-transform duration-200 ${currentVideoType === 'main' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                    >
                        <Zap className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'main' ? "currentColor" : "none"} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            console.log('[DrillReelItem] Setting video type to DESCRIPTION');
                            console.log('[DrillReelItem] finalDescUrl:', finalDescUrl);
                            setCurrentVideoType('description');
                        }}
                        className={`p-2 md:p-2.5 rounded-full transition-transform duration-200 ${currentVideoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                    >
                        <MessageCircle className={`w-5 h-5 md:w-5 md:h-5 ${currentVideoType === 'description' ? 'fill-current' : 'fill-none'}`} />
                    </button>
                </div>
            )}
            renderExtraActions={() => (
                <button
                    onClick={(e) => { e.stopPropagation(); onViewRoutine(); }}
                    className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90 shadow-2xl"
                    title="루틴 보기"
                >
                    <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
                </button>
            )}
            renderFooterInfo={() => (
                <>
                    {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명 영상 재생 중)</span>}
                    {drill.tags && drill.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            {(drill.tags || []).slice(0, 3).map((tag, idx) => (
                                <span key={idx} className="text-white/90 text-sm">#{tag}</span>
                            ))}
                        </div>
                    )}
                </>
            )}
            customVideoContent={(basePaused, reportProgress, onPreviewLimitReached) => (
                <motion.div
                    className="relative w-full h-full bg-black"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.2}
                    onDragEnd={(_, info) => {
                        const threshold = 50;
                        console.log('[DrillReelItem] Drag offset:', info.offset.x);
                        // Swap per user request: "Swipe Right (Drag > 0) -> Action (Main)"
                        if (info.offset.x > threshold && currentVideoType === 'description') {
                            console.log('[DrillReelItem] Swiping Right -> Switching to Main (Action)');
                            setCurrentVideoType('main');
                        } else if (info.offset.x < -threshold && currentVideoType === 'main' && finalDescUrl) {
                            console.log('[DrillReelItem] Swiping Left -> Switching to Description');
                            setCurrentVideoType('description');
                        }
                    }}
                >
                    <div className="relative w-full h-full bg-black">
                        {/* Action Player */}
                        <div className={`absolute inset-0 transition-opacity duration-300 ${currentVideoType === 'main' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            {shouldLoadMain && (
                                <SingleVideoPlayer
                                    key={`main-${drill.id}`}
                                    url={actionUrl}
                                    thumbnailUrl={drill.thumbnailUrl}
                                    isActive={isActive}
                                    isVisible={currentVideoType === 'main'}
                                    shouldLoad={shouldLoadMain}
                                    isMuted={!isActive || isMuted}  // Neighbors always muted for preload
                                    isPaused={basePaused} // Use BaseReelItem's pause state
                                    onReady={() => setMainVideoReady(true)}
                                    onPlay={() => {
                                        if (!mainVideoStarted) {
                                            console.log('[DrillReelItem] Main Video Started Playing');
                                            setMainVideoStarted(true);
                                        }
                                    }}
                                    onProgress={(p) => reportProgress(p)}
                                    onError={setMainError}
                                    isPreviewMode={!isLoggedIn || !hasAccess}
                                    maxPreviewDuration={60}
                                    onPreviewLimitReached={onPreviewLimitReached}
                                />
                            )}
                        </div>

                        {/* Description Player */}
                        <div className={`absolute inset-0 transition-opacity duration-300 ${currentVideoType === 'description' ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                            {shouldLoadDesc && finalDescUrl && (
                                <SingleVideoPlayer
                                    key={`desc-${drill.id}`}
                                    url={finalDescUrl}
                                    thumbnailUrl={drill.thumbnailUrl}
                                    isActive={isActive}
                                    isVisible={currentVideoType === 'description'}
                                    shouldLoad={shouldLoadDesc}
                                    isMuted={isMuted}
                                    isPaused={basePaused}
                                    onReady={() => setDescVideoReady(true)}
                                    onPlay={() => {
                                        if (!descVideoStarted) {
                                            console.log('[DrillReelItem] Description Video Started Playing');
                                            setDescVideoStarted(true);
                                        }
                                    }}
                                    onProgress={(p) => reportProgress(p)}
                                    onError={setDescError}
                                    isPreviewMode={!isLoggedIn || !hasAccess}
                                    maxPreviewDuration={60}
                                    onPreviewLimitReached={onPreviewLimitReached}
                                />
                            )}

                            {/* No description video message */}
                            {shouldLoadDesc && !finalDescUrl && currentVideoType === 'description' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-zinc-400">
                                    <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                                    <p className="text-lg font-medium">설명 영상이 없습니다</p>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentVideoType('main');
                                        }}
                                        className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-medium transition-colors"
                                    >
                                        액션 영상 보기
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Thumbnail Poster - Fades out when video actually starts playing */}
                        <div
                            className={`absolute inset-0 z-20 pointer-events-none transition-opacity duration-500 ${(currentVideoType === 'main' ? mainVideoStarted : descVideoStarted) ? 'opacity-0' : 'opacity-100'
                                }`}
                            style={{ display: (currentVideoType === 'main' ? mainVideoStarted : descVideoStarted) ? 'none' : 'block' }}
                        >
                            {drill.thumbnailUrl && (
                                <img src={drill.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                            )}
                        </div>

                        {/* Error Overlay with Retry */}
                        {currentError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 z-30 bg-black">
                                <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
                                <p>{currentError}</p>
                                {retryCount < 3 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMainError(null);
                                            setDescError(null);
                                            setMainVideoReady(false);
                                            setDescVideoReady(false);
                                            setMainVideoStarted(false);
                                            setDescVideoStarted(false);
                                            setRetryCount(prev => prev + 1);
                                        }}
                                        className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-medium transition-colors"
                                    >
                                        다시 시도 ({3 - retryCount}회 남음)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        />
    );
}, (prevProps, nextProps) => {
    // Only re-render if these critical props change
    return (
        prevProps.drill.id === nextProps.drill.id &&
        // Add URL checks to ensure updates (e.g. from polling) trigger re-render
        prevProps.drill.videoUrl === nextProps.drill.videoUrl &&
        prevProps.drill.vimeoUrl === nextProps.drill.vimeoUrl &&
        prevProps.drill.descriptionVideoUrl === nextProps.drill.descriptionVideoUrl &&
        prevProps.drill.thumbnailUrl === nextProps.drill.thumbnailUrl &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.offset === nextProps.offset &&
        prevProps.isMuted === nextProps.isMuted &&
        prevProps.isLiked === nextProps.isLiked &&
        prevProps.isSaved === nextProps.isSaved &&
        prevProps.isFollowed === nextProps.isFollowed &&
        prevProps.likeCount === nextProps.likeCount &&
        prevProps.isDailyFreeDrill === nextProps.isDailyFreeDrill &&
        prevProps.isSubscriber === nextProps.isSubscriber
    );
});
