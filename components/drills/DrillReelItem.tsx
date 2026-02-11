
import React, { useRef, useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useVideoPreloadSafe } from '../../contexts/VideoPreloadContext';
import { Drill } from '../../types';
import {
    Heart, Bookmark,
    Share2, Volume2, VolumeX, ChevronLeft, ArrowUpRight,
    ListVideo
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MarqueeText } from '../common/MarqueeText';
import Player from '@vimeo/player';
import { cn } from '../../lib/utils';
import { ReelLoginModal } from '../auth/ReelLoginModal';
import { useOrientationFullscreen } from '../../hooks/useOrientationFullscreen';
import '@mux/mux-video';

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../social/ShareModal'));

// --- Helper Functions ---
import { extractVimeoId, isMuxPlaybackId } from '../../lib/api';

// --- Sub-Component: Single Video Player ---
interface SingleVideoPlayerProps {
    url?: string;
    drillId?: string; // For preload consumption
    isActive: boolean;
    isVisible: boolean;
    shouldLoad: boolean;
    isMuted: boolean;
    isPaused: boolean;
    onReady: () => void;
    onPlay?: () => void;
    onProgress: (percent: number, seconds: number) => void;
    onError: (msg: string) => void;
    onBuffering?: (isBuffering: boolean) => void;
    isPreviewMode?: boolean;
    maxPreviewDuration?: number;
    onPreviewLimitReached?: () => void;
    thumbnailUrl?: string; // New: Thumbnail to show while player is loading/deferred
    isNext?: boolean; // New: Flag for pre-playing (offset 1)
    isNext2?: boolean; // New: Flag for pre-playing (offset 2)
    previewLimitReachedRef?: React.MutableRefObject<boolean>; // 세션 전체에서 유지되는 플래그
}

const SingleVideoPlayer: React.FC<SingleVideoPlayerProps> = ({
    url,
    drillId,
    isActive,
    isVisible,
    shouldLoad,
    isMuted,
    isPaused,
    onReady,
    onPlay,
    onProgress,
    onError,
    onBuffering,
    isPreviewMode = false,
    maxPreviewDuration,
    onPreviewLimitReached,
    thumbnailUrl,
    isNext = false,
    isNext2 = false,
    previewLimitReachedRef: externalPreviewLimitReachedRef
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<Player | null>(null);
    const [ready, setReady] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const preloadConsumedRef = useRef(false);

    // 프리로드 컨텍스트 (optional)
    const videoPreload = useVideoPreloadSafe();

    const vimeoId = useMemo(() => extractVimeoId(url), [url]);
    const isMux = useMemo(() => isMuxPlaybackId(url), [url]);
    const useVimeo = !!vimeoId && !isMux;

    const onProgressRef = useRef(onProgress);
    const isPreviewModeRef = useRef(isPreviewMode);
    const maxPreviewDurationRef = useRef(maxPreviewDuration);
    const onPreviewLimitReachedRef = useRef(onPreviewLimitReached);
    const previewLimitReachedRef = externalPreviewLimitReachedRef || useRef(false); // 외부에서 전달된 플래그 사용, 없으면 로컬 생성

    useEffect(() => {
        onProgressRef.current = onProgress;
        onPreviewLimitReachedRef.current = onPreviewLimitReached;
    }, [onProgress, onPreviewLimitReached]);

    useEffect(() => {
        isPreviewModeRef.current = isPreviewMode;
        maxPreviewDurationRef.current = maxPreviewDuration;
    }, [isPreviewMode, maxPreviewDuration]);

    // Notify parent of buffering state changes
    useEffect(() => {
        onBuffering?.(isBuffering);
    }, [isBuffering, onBuffering]);

    useEffect(() => {
        if (!url || !shouldLoad) {
            if (!url && shouldLoad) onReady();
            return;
        }

        let isMounted = true;

        // 프리로드된 플레이어 확인 및 소비
        if (!playerRef.current && drillId && videoPreload && !preloadConsumedRef.current) {
            if (videoPreload.isPreloadedFor(drillId)) {
                const preloaded = videoPreload.consumePreloadedPlayer();
                if (preloaded && containerRef.current) {
                    console.log('[SingleVideoPlayer] Using preloaded player for drill:', drillId, '- Should play instantly!');
                    preloadConsumedRef.current = true;

                    // iframe을 현재 컨테이너로 이동
                    containerRef.current.innerHTML = '';
                    containerRef.current.appendChild(preloaded.iframe);

                    playerRef.current = preloaded.player;
                    setReady(true);
                    onReady();

                    // 이벤트 리스너 설정
                    preloaded.player.on('timeupdate', (data) => {
                        if (!isMounted) return;
                        if (data.seconds > 0.1) {
                            onPlay?.();
                            setReady(true);
                        }
                        const previewMode = isPreviewModeRef.current;
                        const previewDuration = maxPreviewDurationRef.current;
                        const percent = data.percent ?? (data.duration ? data.seconds / data.duration : 0);

                        if (previewMode && previewDuration) {
                            const calcPercent = (data.seconds / previewDuration) * 100;
                            onProgressRef.current(calcPercent, data.seconds);
                            if (data.seconds >= previewDuration) {
                                preloaded.player?.pause().catch(() => { });
                                onPreviewLimitReachedRef.current?.();
                            }
                        } else {
                            onProgressRef.current(percent * 100, data.seconds);
                        }
                    });

                    preloaded.player.on('play', () => {
                        if (isMounted) {
                            onPlay?.();
                            setReady(true);
                        }
                    });

                    preloaded.player.on('ended', () => {
                        if (isPreviewModeRef.current) {
                            onPreviewLimitReachedRef.current?.();
                        }
                    });

                    preloaded.player.on('error', () => { onError('재생 오류'); });

                    // Buffering events
                    preloaded.player.on('bufferstart', () => { if (isMounted) setIsBuffering(true); });
                    preloaded.player.on('bufferend', () => { if (isMounted) setIsBuffering(false); });

                    return () => {
                        isMounted = false;
                        const p = playerRef.current;
                        playerRef.current = null;
                        if (p) p.destroy().catch(() => { });
                        if (containerRef.current) containerRef.current.innerHTML = '';
                        setReady(false);
                    };
                }
            }
        }

        if (!playerRef.current) {
            // Check if it's a Mux playback ID
            const isMux = isMuxPlaybackId(url);
            const fullId = isMux ? url : extractVimeoId(url);

            if (!fullId) {
                onError('비디오 ID 오류');
                return;
            }

            // Handle Mux video
            if (isMux) {
                try {
                    const muxVideo = document.createElement('mux-video') as any;
                    muxVideo.setAttribute('playback-id', fullId);
                    muxVideo.setAttribute('autoplay', 'true');
                    muxVideo.setAttribute('muted', isMuted ? 'true' : 'false');
                    muxVideo.setAttribute('playsinline', 'true');
                    muxVideo.setAttribute('preload', 'auto');
                    muxVideo.className = 'w-full h-full object-cover';

                    if (containerRef.current) {
                        containerRef.current.innerHTML = '';
                        containerRef.current.appendChild(muxVideo);
                    }

                    const videoElement = muxVideo as HTMLVideoElement;
                    videoRef.current = videoElement;

                    // Set up event listeners for HTMLVideoElement
                    const handleTimeUpdate = () => {
                        if (!isMounted) return;
                        const duration = videoElement.duration || 1;
                        const currentTime = videoElement.currentTime || 0;
                        const percent = (currentTime / duration) * 100;

                        if (currentTime > 0.1) {
                            onPlay?.();
                            setReady(true);
                            setIsBuffering(false);
                        }

                        if (isPreviewModeRef.current && maxPreviewDurationRef.current) {
                            const calcPercent = (currentTime / maxPreviewDurationRef.current) * 100;
                            onProgressRef.current(calcPercent, currentTime);
                            if (currentTime >= maxPreviewDurationRef.current) {
                                videoElement.pause();
                                onPreviewLimitReachedRef.current?.();
                            }
                        } else {
                            onProgressRef.current(percent, currentTime);
                        }
                    };

                    const handlePlay = () => {
                        if (isMounted) {
                            onPlay?.();
                            setReady(true);
                            setIsBuffering(false);
                        }
                    };

                    const handleEnded = () => {
                        if (isPreviewModeRef.current) {
                            onPreviewLimitReachedRef.current?.();
                        }
                    };

                    const handleError = () => {
                        onError('재생 오류');
                    };

                    const handleWaiting = () => {
                        if (isMounted) setIsBuffering(true);
                    };

                    const handleCanPlay = () => {
                        if (isMounted) {
                            setIsBuffering(false);
                            setReady(true);
                        }
                    };

                    videoElement.addEventListener('timeupdate', handleTimeUpdate);
                    videoElement.addEventListener('play', handlePlay);
                    videoElement.addEventListener('ended', handleEnded);
                    videoElement.addEventListener('error', handleError);
                    videoElement.addEventListener('waiting', handleWaiting);
                    videoElement.addEventListener('canplay', handleCanPlay);
                    videoElement.addEventListener('loadedmetadata', () => {
                        if (isMounted) setReady(true);
                    });

                    onReady();

                    return () => {
                        isMounted = false;
                        if (videoElement) {
                            videoElement.removeEventListener('timeupdate', handleTimeUpdate);
                            videoElement.removeEventListener('play', handlePlay);
                            videoElement.removeEventListener('ended', handleEnded);
                            videoElement.removeEventListener('error', handleError);
                            videoElement.removeEventListener('waiting', handleWaiting);
                            videoElement.removeEventListener('canplay', handleCanPlay);
                            videoElement.pause();
                        }
                        if (containerRef.current) containerRef.current.innerHTML = '';
                        setReady(false);
                    };
                } catch (error) {
                    console.error('Mux video setup error:', error);
                    onError('Mux 플레이어 초기화 실패');
                    return;
                }
            }

            // Handle Vimeo video
            const options: any = {
                autoplay: false,
                loop: !isPreviewMode,
                muted: isMuted,
                autopause: false,
                controls: false,
                playsinline: true,
                dnt: true,
                title: false,
                byline: false,
                portrait: false,
                quality: 'auto'
            };

            const [baseId, hash] = fullId.includes(':') ? fullId.split(':') : [fullId, null];
            let player: Player;

            try {
                if (hash) {
                    const iframe = document.createElement('iframe');
                    const params = new URLSearchParams({
                        h: hash,
                        autoplay: '0',
                        loop: isPreviewMode ? '0' : '1',
                        muted: isMuted ? '1' : '0',
                        autopause: '0',
                        controls: '0',
                        playsinline: '1',
                        dnt: '1',
                        title: '0',
                        byline: '0',
                        portrait: '0',
                        quality: 'auto'
                    });
                    iframe.src = `https://player.vimeo.com/video/${baseId}?${params.toString()}`;
                    iframe.className = "w-full h-full border-0";
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
                    } else return;
                }
                playerRef.current = player;
                onReady();

                player.ready().then(() => {
                    if (!isMounted) return;
                    setReady(true);
                    player.setVolume(isMuted ? 0 : 1).catch(() => { });
                }).catch(() => setReady(true));

                player.on('loaded', () => {
                    if (isMounted) {
                        setReady(true);
                        player.setVolume(isMuted ? 0 : 1).catch(() => { });
                    }
                });

                player.on('timeupdate', (data) => {
                    if (!isMounted) return;
                    if (data.seconds > 0.1) {
                        onPlay?.();
                        setReady(true);
                    }
                    // preview mode 상태 확인
                    const isPreviewMode = isPreviewModeRef.current;
                    const previewDuration = maxPreviewDurationRef.current;

                    // duration을 가져와서 percent 계산 (data.percent가 undefined일 수 있음)
                    const percent = data.percent ?? (data.duration ? data.seconds / data.duration : 0);

                    if (isPreviewMode && previewDuration) {
                        const calcPercent = (data.seconds / previewDuration) * 100;
                        onProgressRef.current(calcPercent, data.seconds);
                        if (data.seconds >= previewDuration && !previewLimitReachedRef.current) {
                            previewLimitReachedRef.current = true; // 한 번만 실행
                            player?.pause().catch(() => { });
                            onPreviewLimitReachedRef.current?.();
                        }
                    } else {
                        onProgressRef.current(percent * 100, data.seconds);
                    }
                });
                player.on('play', () => {
                    if (isMounted) {
                        onPlay?.();
                        setReady(true);
                    }
                });
                player.on('ended', () => {
                    if (isPreviewModeRef.current && !previewLimitReachedRef.current) {
                        previewLimitReachedRef.current = true;
                        onPreviewLimitReachedRef.current?.();
                    }
                });
                player.on('error', () => { onError('재생 오류'); onReady(); });

                // Buffering events
                player.on('bufferstart', () => { if (isMounted) setIsBuffering(true); });
                player.on('bufferend', () => { if (isMounted) setIsBuffering(false); });
            } catch { onError('초기화 실패'); onReady(); }
        } else if (ready) onReady();

        return () => {
            isMounted = false;
            const p = playerRef.current;
            playerRef.current = null;
            if (p) p.destroy().catch(() => { });
            if (containerRef.current) containerRef.current.innerHTML = '';
            setReady(false);
        };
    }, [shouldLoad, url, drillId]);

    useEffect(() => {
        const player = playerRef.current;
        const videoEl = videoRef.current;
        const shouldPlay = (isActive || isNext || isNext2) && isVisible && !isPaused;

        const sync = async () => {
            if (useVimeo && player && ready) {
                try {
                    if (!shouldPlay) await player.pause();
                    else {
                        const p = await player.getPaused();
                        if (p) {
                            console.log('[SingleVideoPlayer] Resuming preloaded player:', drillId);
                            const playStartTime = performance.now();

                            await player.play().catch(async (err) => {
                                if (err.name === 'NotAllowedError') {
                                    await player.setMuted(true);
                                    await player.play().catch(() => { });
                                }
                            });

                            const playEndTime = performance.now();
                            console.log(`[SingleVideoPlayer] Play took ${(playEndTime - playStartTime).toFixed(2)}ms`);
                        }
                        onPlay?.();
                    }
                    await player.setVolume(isMuted ? 0 : 1);
                    if (!isMuted && shouldPlay && await player.getPaused()) await player.play();
                } catch { }
            } else if (!useVimeo && videoEl) {
                if (shouldPlay) {
                    // Reset to beginning if video ended
                    if (videoEl.ended) {
                        videoEl.currentTime = 0;
                    }
                    await videoEl.play().catch(() => { });
                } else {
                    videoEl.pause();
                }
                videoEl.muted = isMuted;
            }
        };
        sync();
    }, [isActive, isNext, isNext2, isVisible, ready, isMuted, isPaused]);

    if (!shouldLoad) return thumbnailUrl ? (
        <div className="absolute inset-0 w-full h-full">
            <img src={thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />
        </div>
    ) : null;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
            style={{ opacity: isVisible ? 1 : 0, pointerEvents: 'none' }}
        >
            {/* Buffering Spinner */}
            {isBuffering && isVisible && (
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}
            {/* Only render HTML5 video for direct video URLs (not Vimeo or Mux) */}
            {!useVimeo && !isMux && url && (
                <video
                    ref={videoRef}
                    src={url}
                    className="w-full h-full object-cover"
                    playsInline
                    loop={!isPreviewMode}
                    muted={isMuted}
                    onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        const percent = (video.currentTime / video.duration) * 100;
                        if (!isNaN(percent)) {
                            onProgressRef.current(percent, video.currentTime);
                        }
                        if (video.currentTime > 0.1) {
                            onPlay?.();
                        }

                        // Preview logic for HTML5 video
                        const previewMode = isPreviewModeRef.current;
                        const maxPreview = maxPreviewDurationRef.current;
                        if (previewMode && maxPreview && video.currentTime >= maxPreview) {
                            video.pause();
                            onPreviewLimitReachedRef.current?.();
                        }
                    }}
                    onLoadedMetadata={() => onReady()}
                    onWaiting={() => setIsBuffering(true)}
                    onPlaying={() => setIsBuffering(false)}
                    onEnded={() => {
                        if (isPreviewModeRef.current) {
                            onPreviewLimitReachedRef.current?.();
                        }
                    }}
                    onError={() => { onError('Video load failed'); onReady(); }}
                />
            )}
        </div>
    );
};

// --- Main Component ---

interface DrillReelItemProps {
    drill: Drill;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
    isLiked: boolean;
    onLike: (drill: Drill) => void;
    likeCount: number;
    isSaved: boolean;
    onSave: (drill: Drill) => void;
    isFollowed: boolean;
    onFollow: (drill: Drill) => void;
    onViewRoutine: (drill: Drill) => void;
    offset: number;
    isSubscriber: boolean;
    purchasedItemIds: string[];
    isLoggedIn: boolean;
    isDailyFreeDrill?: boolean;
    index: number;
    onVideoReady?: (index: number) => void;
    onBufferingChange?: (index: number, isBuffering: boolean) => void;
    onProgressUpdate?: (percent: number, seconds: number, hasAccess: boolean) => void;
    isSessionExpired?: boolean;
    isCached?: boolean;
    previewLimitReachedRef?: React.MutableRefObject<boolean>;
}

export const DrillReelItem: React.FC<DrillReelItemProps> = memo(({
    drill, isActive, isMuted, onToggleMute, isLiked, onLike, likeCount,
    isSaved, onSave, isFollowed, onFollow, onViewRoutine, offset,
    isSubscriber, purchasedItemIds, isLoggedIn, isDailyFreeDrill = false,
    index, isCached = false, onVideoReady, onBufferingChange, onProgressUpdate, isSessionExpired = false, previewLimitReachedRef
}) => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const actionUrl = drill.vimeoUrl || drill.videoUrl;
    const finalDescUrl = drill.descriptionVideoUrl;

    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>(actionUrl ? 'main' : 'description');
    const [mainVideoStarted, setMainVideoStarted] = useState(false);
    const [descVideoStarted, setDescVideoStarted] = useState(false);
    const [mainVideoReady, setMainVideoReady] = useState(false);
    const [descVideoReady, setDescVideoReady] = useState(false);
    // Simplified error tracking (can be used for UI later if needed)
    const [, setMainError] = useState<string | null>(null);
    const [, setDescError] = useState<string | null>(null);
    const [userPaused, setUserPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shouldLoadPlayer, setShouldLoadPlayer] = useState(false); // New: Deferred player load state
    const [localProgress, setLocalProgress] = useState({ percent: 0, seconds: 0, hasAccess: true });
    const [isBuffering, setIsBuffering] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Refs for stable callbacks (memo로 인한 stale closure 방지)
    const isActiveRef = useRef(isActive);
    const onProgressUpdateRef = useRef(onProgressUpdate);
    const currentVideoTypeRef = useRef(currentVideoType);

    useEffect(() => {
        isActiveRef.current = isActive;
        onProgressUpdateRef.current = onProgressUpdate;
    }, [isActive, onProgressUpdate]);

    useEffect(() => {
        currentVideoTypeRef.current = currentVideoType;
    }, [currentVideoType]);

    // Notify parent of buffering state (only for active item)
    useEffect(() => {
        if (isActive) {
            onBufferingChange?.(index, isBuffering);
        }
    }, [isBuffering, isActive, index, onBufferingChange]);

    // Phase 2: Deferred Loading Strategy
    useEffect(() => {
        if (!isActive && Math.abs(offset) > 1) {
            setShouldLoadPlayer(false);
            return;
        }

        if (isActive || Math.abs(offset) <= 3) {
            // Active OR Next/Previous THREE items: load immediately
            setShouldLoadPlayer(true);
        }
    }, [isActive, offset]);

    useOrientationFullscreen(containerRef, isActive);

    useEffect(() => {
        if (!isActive) {
            // 비활성화 시 UI 상태만 리셋 (videoStarted는 유지 - 이전 영상 즉시 재생을 위해)
            setCurrentVideoType(actionUrl ? 'main' : 'description');
            setUserPaused(false);
            // mainVideoStarted, descVideoStarted는 유지하여 로딩 오버레이 방지
        }
    }, [isActive, drill.id, actionUrl]);

    const drillPrice = Number((drill as any).price || 0);
    const hasAccess = isDailyFreeDrill || (isLoggedIn && (drillPrice === 0 || isSubscriber || purchasedItemIds.includes(drill.id)));
    const hasAccessRef = useRef(hasAccess);

    useEffect(() => {
        hasAccessRef.current = hasAccess;
    }, [hasAccess]);

    const handleTap = useCallback(() => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            // Double tap for like: requires login & access
            if (!isLoggedIn) {
                setIsLoginModalOpen(true);
                return;
            }
            if (!hasAccess) return;
            onLike(drill);
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 900);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                // Toggle pause: allowed regardless of login
                setUserPaused(prev => !prev);
            }, 250);
        }
    }, [isLoggedIn, hasAccess, onLike]);

    useEffect(() => {
        const isReady = currentVideoType === 'main' ? mainVideoReady : descVideoReady;
        const isStarted = currentVideoType === 'main' ? mainVideoStarted : descVideoStarted;
        if (!isReady) return;
        if (!isActive || isStarted) onVideoReady?.(index);
    }, [currentVideoType, mainVideoReady, mainVideoStarted, descVideoReady, descVideoStarted, isActive, onVideoReady, index]);

    // URL definitions already moved up for initial state use

    useEffect(() => {
        console.log('[DrillReelItem Debug]', {
            drillId: drill.id,
            actionUrl,
            extractedActionId: extractVimeoId(actionUrl),
            finalDescUrl,
            extractedDescId: extractVimeoId(finalDescUrl),
            currentVideoType
        });
    }, [drill.id, actionUrl, finalDescUrl, currentVideoType]);


    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className="w-full h-full relative flex items-center justify-center">
                <motion.div
                    className="relative z-10 w-full h-full md:max-w-[56.25vh] md:rounded-lg overflow-hidden flex items-center justify-center bg-zinc-900"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.1}
                    onTap={handleTap}
                    onDragEnd={(_, info) => {
                        if (info.offset.x > 80 && currentVideoType === 'main' && finalDescUrl) setCurrentVideoType('description');
                        else if (info.offset.x < -80 && currentVideoType === 'description' && actionUrl) setCurrentVideoType('main');
                    }}
                >
                    {/* Main Video */}
                    <SingleVideoPlayer
                        url={actionUrl}
                        drillId={drill.id}
                        isActive={isActive}
                        isVisible={currentVideoType === 'main'}
                        shouldLoad={shouldLoadPlayer || isCached}
                        thumbnailUrl={drill.thumbnailUrl}
                        isMuted={!isActive || isMuted}
                        isPaused={userPaused}
                        onReady={() => setMainVideoReady(true)}
                        onPlay={() => setMainVideoStarted(true)}
                        onProgress={(p, s) => {
                            setLocalProgress({ percent: p, seconds: s, hasAccess: hasAccessRef.current });
                            onProgressUpdateRef.current?.(p, s, hasAccessRef.current);
                        }}
                        onError={setMainError}
                        onBuffering={currentVideoType === 'main' ? setIsBuffering : undefined}
                        isPreviewMode={!hasAccess || isSessionExpired}
                        maxPreviewDuration={30}
                        onPreviewLimitReached={() => setIsLoginModalOpen(true)}
                        previewLimitReachedRef={previewLimitReachedRef}
                    />

                    {/* Description Video */}
                    {finalDescUrl && (
                        <SingleVideoPlayer
                            url={finalDescUrl}
                            isActive={isActive}
                            isVisible={currentVideoType === 'description'}
                            shouldLoad={isActive}
                            isMuted={isMuted}
                            isPaused={userPaused}
                            onReady={() => setDescVideoReady(true)}
                            onPlay={() => setDescVideoStarted(true)}
                            isNext={offset === 1}
                            isNext2={offset === 2}
                            onProgress={(p, s) => {
                                setLocalProgress({ percent: p, seconds: s, hasAccess: hasAccessRef.current });
                                onProgressUpdateRef.current?.(p, s, hasAccessRef.current);
                            }}
                            onError={setDescError}
                            onBuffering={currentVideoType === 'description' ? setIsBuffering : undefined}
                            isPreviewMode={!hasAccess || isSessionExpired}
                            maxPreviewDuration={30}
                            onPreviewLimitReached={() => setIsLoginModalOpen(true)}
                            previewLimitReachedRef={previewLimitReachedRef}
                        />
                    )}

                    {/* Poster Overlay */}
                    <AnimatePresence>
                        {!(currentVideoType === 'main' ? mainVideoStarted : descVideoStarted) && (
                            <motion.div
                                className="absolute inset-0 z-20 bg-black"
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <img src={drill.thumbnailUrl} className="w-full h-full object-cover opacity-60" alt="" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Like Animation */}
                    <AnimatePresence>
                        {showLikeAnimation && (
                            <motion.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none"
                            >
                                <Heart className="w-24 h-24 text-violet-500 fill-violet-500" />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Video Type Indicator */}
                    {actionUrl && finalDescUrl && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                            <div className={`w-8 h-1 rounded-full bg-white transition-opacity ${currentVideoType === 'main' ? 'opacity-100' : 'opacity-30'}`} />
                            <div className={`w-8 h-1 rounded-full bg-white transition-opacity ${currentVideoType === 'description' ? 'opacity-100' : 'opacity-30'}`} />
                        </div>
                    )}
                </motion.div>

                {/* --- UI Controls Layer --- */}
                <div className="absolute inset-0 pointer-events-none z-40 flex justify-center">
                    <div className="relative w-full h-full md:max-w-[56.25vh] p-4">
                        {/* Header: Back & Mute */}
                        <div className="absolute top-6 left-4 right-4 flex justify-between pointer-events-none items-start">
                            <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white pointer-events-auto active:scale-95 shadow-xl">
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white pointer-events-auto active:scale-95 shadow-xl">
                                {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>

                        {/* Sidebar: Like, Save, Share, Routine */}
                        <div className="absolute bottom-10 right-4 flex flex-col gap-5 pointer-events-auto items-center">
                            <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); onLike(drill); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 shadow-2xl transition-all">
                                    <Heart className={cn("w-5 h-5 md:w-7 md:h-7", isLiked && "fill-violet-500 text-violet-500")} />
                                </button>
                                <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{likeCount.toLocaleString()}</span>
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); onSave(drill); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 shadow-2xl">
                                <Bookmark className={cn("w-5 h-5 md:w-6 md:h-6", isSaved && "fill-white text-white")} />
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); onViewRoutine(drill); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 shadow-2xl">
                                <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
                            </button>

                            <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white active:scale-90 shadow-2xl">
                                <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* Footer: Info */}
                        <div className="absolute bottom-10 left-6 right-20 pointer-events-none">
                            <div className="pointer-events-auto text-white">
                                <Link to={`/creator/${drill.creatorId}`} className="flex items-center gap-2 mb-3 hover:opacity-80">
                                    {(drill as any).creatorProfileImage && <img src={(drill as any).creatorProfileImage} className="w-8 h-8 rounded-full border border-white/20 object-cover" alt="" />}
                                    <span className="font-bold text-sm shadow-sm">{drill.creatorName}</span>
                                    <button onClick={(e) => { e.stopPropagation(); onFollow(drill); }} className={cn("px-3 py-1 rounded-full text-[10px] font-bold border transition-all", isFollowed ? "bg-violet-600 border-violet-600" : "bg-transparent border-violet-500 text-violet-400")}>
                                        {isFollowed ? 'Following' : 'Follow'}
                                    </button>
                                </Link>
                                <h3 className="font-black text-xl mb-1 drop-shadow-md line-clamp-2">{drill.title}</h3>
                                {currentVideoType === 'description' && <p className="text-xs text-white/60 mb-2 italic">설명 영상 재생 중...</p>}

                                {drill.relatedLesson && (
                                    <div className="mt-4 max-w-[200px] overflow-hidden">
                                        <div className="bg-black/40 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 flex items-center">
                                            <MarqueeText
                                                items={[{ id: drill.relatedLesson.id, text: `Lesson: ${drill.relatedLesson.title}`, onClick: () => navigate(`/lessons/${drill.relatedLesson!.id}`) }]}
                                                icon={<ArrowUpRight className="w-3 h-3" />}
                                                className="text-[10px] font-bold"
                                                speed={20}
                                                forceAnimation
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar moved inside DrillReelItem */}
            {isActive && !hasAccess && (
                <div className="absolute bottom-0 left-0 right-0 h-1 z-[200001]">
                    <div
                        className="h-full bg-violet-500 transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                        style={{
                            width: `${Math.max(0, Math.min(100, localProgress.percent))}%`
                        }}
                    />
                </div>
            )}

            {/* Modals */}
            <ReelLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} redirectUrl={`/drills?id=${drill.id}`} />

            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)}
                        title={drill.title} text={`${drill.creatorName}님의 드릴을 확인해보세요`}
                        url={`${window.location.origin}/drills?id=${drill.id}`}
                    />
                )}
            </React.Suspense>
        </div>
    );
});
