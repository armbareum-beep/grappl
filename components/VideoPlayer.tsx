import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import Player from '@vimeo/player';
import { Lock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useWakeLock } from '../hooks/useWakeLock';
import { parseVimeoId } from '../lib/api';

export interface VideoPlayerRef {
    seekTo: (seconds: number) => void;
}

interface VideoPlayerProps {
    vimeoId: string;
    title: string;
    startTime?: number;
    isPaused?: boolean;
    playing?: boolean; // New prop
    maxPreviewDuration?: number; // In seconds
    isPreviewMode?: boolean; // For compatibility
    onEnded?: () => void;
    onProgress?: (seconds: number, duration?: number, percent?: number) => void;
    onPreviewLimitReached?: () => void;
    onPreviewEnded?: () => void; // For compatibility
    showControls?: boolean;
    fillContainer?: boolean;
    forceSquareRatio?: boolean;
    autoplay?: boolean;
    onDoubleTap?: () => void;
    onPlayingChange?: (isPlaying: boolean) => void;
    onReady?: () => void;
    muted?: boolean;
    onDuration?: (duration: number) => void;
    onAspectRatioChange?: (ratio: number) => void;
    onAutoplayBlocked?: () => void;
    hideInternalOverlay?: boolean;
    thumbnailUrl?: string; // New prop for loading placeholder
}

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
    vimeoId,
    startTime,
    playing = false, // Default to false
    maxPreviewDuration,
    isPreviewMode = false,
    onEnded,
    onProgress,
    onPreviewLimitReached,
    onPreviewEnded,
    showControls = true,
    fillContainer = false,
    forceSquareRatio = false,
    autoplay = true,
    onDoubleTap,
    onPlayingChange,
    onReady,
    muted = false, // Default to false
    onAspectRatioChange,
    onAutoplayBlocked,
    hideInternalOverlay = false,
}, ref) => {
    const [isPlaying, setIsPlaying] = useState(false);
    useWakeLock(isPlaying);
    const [aspectRatio, setAspectRatio] = useState(16 / 9); // Default to 16:9

    // Expose seekTo method via ref
    useImperativeHandle(ref, () => ({
        seekTo: (seconds: number) => {
            if (playerRef.current) {
                playerRef.current.setCurrentTime(seconds).catch(err => {
                    console.warn('[VideoPlayer] Seek failed:', err);
                });
            } else {
                // For direct video fallback
                const videoElement = containerRef.current?.querySelector('video');
                if (videoElement) {
                    videoElement.currentTime = seconds;
                }
            }
        }
    }));

    useEffect(() => {
        onPlayingChange?.(isPlaying);
    }, [isPlaying, onPlayingChange]);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [playerError, setPlayerError] = useState<any>(null);
    const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // timeRemaining state removed - handled by parent via onProgress

    const onProgressRef = useRef(onProgress);
    const maxPreviewDurationRef = useRef(maxPreviewDuration);
    const isPreviewModeRef = useRef(isPreviewMode);
    const hasReachedRef = useRef(false); // To track limit inside event listener
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const onReadyRef = useRef(onReady);

    useEffect(() => {
        onProgressRef.current = onProgress;
        maxPreviewDurationRef.current = maxPreviewDuration;
        isPreviewModeRef.current = isPreviewMode;
        onReadyRef.current = onReady;
    }, [onProgress, maxPreviewDuration, isPreviewMode, onReady]);

    const playingRef = useRef(playing);
    useEffect(() => {
        playingRef.current = playing;
    }, [playing]);

    useEffect(() => {
        if (!containerRef.current) return;

        let player: Player | null = null;
        setPlayerError(null);

        // Explicitly clear any existing content to prevent duplicates/ghosts
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }

        try {
            const options: any = {
                autoplay: autoplay,
                loop: false,
                autopause: false, // Revert to false to fix aspect ratio regression
                title: false,
                byline: false,
                portrait: false,
                controls: showControls,
                color: 'ffffff',
                badge: false,
                muted: muted,
                playsinline: true, // Support mobile autoplay
                // Background mode suppresses timeupdate events. We disable it to ensure the progress bar works.
                background: false,
                dnt: true, // Prevent tracking and hide some personal buttons
                // Custom params to try and hide the share/embed button
                // Note: These often require a Plus/Pro account setting to fully take effect,
                // but passing them here forces the player to respect them if allowed.
                share: false,
            };

            const vimeoIdStr = String(vimeoId || '').trim();
            const vimeoInfo = parseVimeoId(vimeoIdStr);

            if (!vimeoInfo) {
                if (vimeoIdStr.startsWith('http')) {
                    options.url = vimeoIdStr;
                } else if (vimeoIdStr) {
                    options.url = `https://vimeo.com/${vimeoIdStr}`;
                } else {
                    setPlayerError({ message: 'No video ID provided' });
                    return;
                }
            }

            const numericId = vimeoInfo ? Number(vimeoInfo.id) : 0;
            const hash = vimeoInfo?.hash || '';

            // If we extracted a valid numeric ID, prefer using id (+h) over url
            // For private videos (with hash), we MUST use manual iframe to avoid OEmbed authentication issues
            // UPDATE: For public videos (no hash), we revert to SDK for better stability on iOS/iPhone
            if (numericId > 0 && hash) {
                const iframe = document.createElement('iframe');
                const params = new URLSearchParams();
                if (hash) params.append('h', hash);
                params.append('title', '0');
                params.append('byline', '0');
                params.append('portrait', '0');
                params.append('badge', '0');
                params.append('autopause', '0');
                params.append('autoplay', autoplay ? '1' : '0');
                params.append('muted', muted ? '1' : '0');

                // If controls are hidden (Reel mode) or we are in background pre-play
                if (!showControls || !playing) {
                    params.append('background', '0');
                    params.append('controls', '0');
                    if (autoplay) {
                        params.append('loop', '1');
                    }
                }

                params.append('player_id', containerRef.current.id || `vimeo-${numericId}`);
                params.append('app_id', '122963');
                params.append('dnt', '1');
                params.append('share', '0');
                params.append('color', 'ffffff');
                if (showControls) params.append('controls', '1');

                iframe.src = `https://player.vimeo.com/video/${numericId}?${params.toString()}`;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; fullscreen; picture-in-picture';

                // Clear container and mount iframe
                containerRef.current.innerHTML = '';
                containerRef.current.appendChild(iframe);

                // Initialize player with the iframe
                try {
                    player = new Player(iframe);
                    console.log('[VideoPlayer] Strategy: Manual Iframe (Private Video)');
                } catch (sdkError) {
                    console.warn('[VideoPlayer] Failed to attach Vimeo SDK to manual iframe (likely iOS restriction). Ignoring to allow playback.', sdkError);
                    // Do NOT setPlayerError here. We want to leave the iframe alone so it might still play.
                    // This disables checking for "ended", time tracking, etc., but content is visible.
                }
            }
            else {
                // If we have a numeric ID but no hash (Public Video), pass it to options
                // This ensures SDK handles it safely without us manually creating iframes
                if (numericId > 0) {
                    options.id = numericId;
                }

                // Check if it's a direct video URL (mp4, m3u8, etc)
                const isDirectVideo = vimeoIdStr.match(/\.(mp4|m3u8|webm|ogv)(\?.*)?$/i) || vimeoIdStr.includes('storage.googleapis.com') || vimeoIdStr.includes('supabase.co/storage');

                if (isDirectVideo) {
                    console.log('[VideoPlayer] Strategy: Direct Video URL');
                    // We don't initialize Vimeo Player for direct videos
                    // But we still want to keep the same UI
                    return;
                }

                // Fallback to URL or ID via options
                player = new Player(containerRef.current, options);
            }

            console.log('[VideoPlayer] Initialized player with strategy:', numericId > 0 && hash ? 'Manual Iframe' : 'SDK Options');

            playerRef.current = player;
            const currentPlayer = player; // Capture for closure safety
            let hasNotifiedReady = false;

            const notifyParentReady = () => {
                if (!hasNotifiedReady) {
                    hasNotifiedReady = true;
                    // console.log('[VideoPlayer] Notifying parent ready (safe to navigate)');
                    onReadyRef.current?.();
                }
            };



            if (currentPlayer) {
                currentPlayer.on('error', (data) => {
                    // Filter out harmless playback interruption errors
                    if (data?.name === 'AbortError' || data?.name === 'PlayInterrupted') {
                        return;
                    }

                    // Filter out specific iOS Vimeo SDK error (TypeError)
                    // The SDK fails to wrap the manual iframe on some iOS devices, causing "undefined is not an object".
                    // Since the native iframe usually plays fine, we ignore this monitoring error.
                    if (data?.message && (typeof data.message === 'string') && (
                        data.message.includes('o.name.includes') ||
                        data.message.includes('undefined is not an object') ||
                        data.message.includes("reading 'includes'") // Chrome/Android just in case
                    )) {
                        console.warn('[VideoPlayer] Ignoring iOS Vimeo SDK specific error, assuming playback continues:', data);
                        return;
                    }

                    // Don't set error if component unmounted
                    if (!containerRef.current) return;

                    console.error('Vimeo Player Error:', data);
                    setPlayerError(data);

                    // Still notify ready so swipe navigation isn't blocked
                    notifyParentReady();
                });

                currentPlayer.on('play', () => {
                    setIsPlaying(true);

                    notifyParentReady();
                });
                currentPlayer.on('pause', () => setIsPlaying(false));
                currentPlayer.on('bufferstart', () => {
                    // console.log('Buffer start');
                    // Optional: show loading spinner here if needed
                });
                currentPlayer.on('bufferend', () => {
                    setIsPlaying(true);

                    notifyParentReady();
                });

                currentPlayer.on('ended', () => {
                    if (onEnded) onEnded();
                });

                const checkTimeLimit = (seconds: number) => {
                    const max = maxPreviewDurationRef.current;
                    const isPreview = isPreviewModeRef.current;

                    if (isPreview && max) {
                        if (seconds >= max) {
                            // Safety: set isPlaying to false immediately
                            setIsPlaying(false);
                            if (player) {
                                player.pause().catch(console.warn);
                            }
                            if (!hasReachedRef.current) {
                                hasReachedRef.current = true;
                                if (containerRef.current) {
                                    setShowUpgradeOverlay(true);
                                }
                                onPreviewLimitReached?.();
                                onPreviewEnded?.();
                            }
                        } else {
                            hasReachedRef.current = false;
                        }
                    }
                };

                currentPlayer.on('seeked', (data) => {
                    checkTimeLimit(data.seconds);
                });

                currentPlayer.on('timeupdate', (data) => {
                    const seconds = data.seconds;
                    const max = maxPreviewDurationRef.current;
                    const isPreview = isPreviewModeRef.current;

                    // Notify ready when we have actual playback progress
                    if (seconds > 0.1) {
                        notifyParentReady();
                    }

                    let reportPercent = data.percent;
                    if (isPreview && max) {
                        reportPercent = Math.min(1, seconds / max);
                    }

                    onProgressRef.current?.(seconds, data.duration, reportPercent);

                    checkTimeLimit(seconds);

                    // timeRemaining update removed - handled by parent via onProgress
                });

                currentPlayer.on('loaded', () => {
                    console.log('[VideoPlayer] Loaded event fired, playing:', playingRef.current);
                    if (startTime && startTime > 0) {
                        currentPlayer.setCurrentTime(startTime).catch(err =>
                            console.warn('Failed to set initial time:', err)
                        );
                    }

                    // Detect aspect ratio
                    Promise.all([currentPlayer.getVideoWidth(), currentPlayer.getVideoHeight()])
                        .then(([width, height]) => {
                            if (width && height) {
                                const ratio = width / height;
                                console.log(`[VideoPlayer] Detected aspect ratio: ${width}x${height} (${ratio.toFixed(2)})`);
                                setAspectRatio(ratio);
                                onAspectRatioChange?.(ratio);
                            }
                        })
                        .catch(err => console.warn('[VideoPlayer] Failed to get dimensions:', err));

                    // For non-playing videos (neighbors), notify ready on load
                    // But DO NOT hide thumbnail yet (wait for actual play)
                    if (!playingRef.current) {
                        notifyParentReady();
                    }
                });
            }

        } catch (err: any) {
            console.error('Failed to initialize Vimeo player:', err);
            if (containerRef.current) {
                setPlayerError(err);
            }
        }

        // Cleanup function for the effect
        const currentContainer = containerRef.current;

        return () => {
            // CRITICAL: Nullify playerRef IMMEDIATELY to prevent race conditions
            const playerToDestroy = player;
            if (player === playerRef.current) {
                playerRef.current = null;
            }

            // Priority 1: SYNCHRONOUS destroy - avoid async unload() to prevent race conditions
            // The async unload().then(destroy) pattern causes delays where new players init before old ones cleanup
            if (playerToDestroy) {
                try {
                    // Direct destroy without waiting for unload - faster and prevents race condition
                    playerToDestroy.destroy();
                } catch (_e) {
                    // Player might already be destroyed, ignore
                }
            }

            // Priority 2: Immediate DOM cleanup
            if (currentContainer) {
                const iframes = currentContainer.querySelectorAll('iframe');
                iframes.forEach(iframe => {
                    try {
                        // Stop any pending network requests
                        iframe.src = 'about:blank';
                        iframe.remove();
                    } catch (_e) { /* ignore */ }
                });
                currentContainer.innerHTML = '';
            }
        };
    }, [vimeoId]);

    // Control playback based on `playing` prop
    useEffect(() => {
        if (!playerRef.current) return;

        const syncPlayback = async () => {
            try {
                if (!playing) {
                    if (playerRef.current) {
                        try {
                            await playerRef.current.pause();
                        } catch (e) { /* ignore */ }
                    }
                } else {
                    // Try to play
                    try {
                        if (playerRef.current) await playerRef.current.play();
                    } catch (error: any) {
                        // Handle browser autoplay policy (NotAllowedError)
                        if (error.name === 'NotAllowedError' && !muted) {
                            console.warn('[VideoPlayer] Autoplay with sound blocked. Muting and retrying.');
                            if (playerRef.current) await playerRef.current.setMuted(true);
                            if (onAutoplayBlocked) onAutoplayBlocked();
                            if (playerRef.current) await playerRef.current.play();
                        } else {
                            throw error;
                        }
                    }
                }
            } catch (err) {
                console.warn('[VideoPlayer] Playback sync error:', err);
            }
        };

        syncPlayback();
    }, [playing, muted]); // Add muted to dependency to retry if props change matches logic

    // Polling fallback for progress updates (Vimeo background mode often suppresses timeupdate)
    useEffect(() => {
        const startPolling = () => {
            if (pollingIntervalRef.current) return;
            pollingIntervalRef.current = setInterval(async () => {
                if (!playerRef.current || !playing) return;
                try {
                    const [seconds, duration] = await Promise.all([
                        playerRef.current.getCurrentTime(),
                        playerRef.current.getDuration()
                    ]);

                    const max = maxPreviewDurationRef.current;
                    const isPreview = isPreviewModeRef.current;

                    let reportPercent = seconds / duration;
                    if (isPreview && max) {
                        reportPercent = Math.min(1, seconds / max);
                    }

                    // Only report if playback is actually moving
                    if (seconds > 0) {
                        onProgressRef.current?.(seconds, duration, reportPercent);
                    }

                    // CRITICAL: Also check preview time limit in polling fallback
                    // This ensures preview limits work even when timeupdate events are suppressed
                    if (isPreview && max && seconds >= max) {
                        if (!hasReachedRef.current) {
                            hasReachedRef.current = true;
                            setIsPlaying(false);
                            if (playerRef.current) {
                                playerRef.current.pause().catch(console.warn);
                            }
                            if (containerRef.current) {
                                setShowUpgradeOverlay(true);
                            }
                            onPreviewLimitReached?.();
                            onPreviewEnded?.();
                        }
                    } else if (max && seconds < max) {
                        hasReachedRef.current = false;
                    }
                } catch (e) { /* ignore */ }
            }, 500); // 500ms polling is enough for UI and session tracking
        };

        const stopPolling = () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };

        if (playing) {
            startPolling();
        } else {
            stopPolling();
        }

        return stopPolling;
    }, [playing]);

    // Sync muted state - and resume playback immediately after unmuting
    useEffect(() => {
        if (!playerRef.current) return;

        const syncMuted = async () => {
            try {
                const currentMuted = await playerRef.current?.getMuted();
                if (currentMuted !== muted && playerRef.current) {
                    await playerRef.current.setMuted(muted);
                    // CRITICAL: After unmuting, immediately call play() to prevent pause
                    // Vimeo player sometimes pauses briefly when transitioning from muted to unmuted
                    if (!muted && playingRef.current) {
                        await playerRef.current.play();
                    }
                }
            } catch (err) {
                console.warn('[VideoPlayer] Failed to sync muted state:', err);
            }
        };

        syncMuted();
    }, [muted]);


    return (
        <div
            className={fillContainer ? 'relative w-full h-full' : 'relative w-full'}
            style={!fillContainer ? { aspectRatio: aspectRatio || 16 / 9 } : undefined}
            onClick={async (_e) => {
                // Ignore clicks if native controls are shown - let the iframe handle it
                if (showControls) return;

                if (clickTimeoutRef.current) {
                    clearTimeout(clickTimeoutRef.current);
                    clickTimeoutRef.current = null;

                    // Double Tap detected
                    if (onDoubleTap) {
                        onDoubleTap();
                        setShowLikeAnimation(true);
                        setTimeout(() => setShowLikeAnimation(false), 1000);
                    }
                } else {
                    clickTimeoutRef.current = setTimeout(async () => {
                        clickTimeoutRef.current = null;

                        if (!playerRef.current || showUpgradeOverlay) return;
                        const paused = await playerRef.current.getPaused();
                        if (paused) {
                            playerRef.current.play();
                        } else {
                            playerRef.current.pause();
                        }
                    }, 300);
                }
            }}
        >
            {/* Vimeo Player Container - Isolated to prevent overwriting overlays */}
            <div
                ref={containerRef}
                className={cn(
                    "absolute inset-0",
                    // Always force iframe to fill its own container
                    "[&>iframe]:w-full [&>iframe]:h-full",
                    // If fillContainer is true, make video cover the area
                    fillContainer && "[&>iframe]:object-cover",
                    // If controls are shown, ensure pointer events go to iframe
                    showControls && "z-[1]"
                )}
                style={{
                    position: 'absolute',
                    width: forceSquareRatio && aspectRatio > 1 ? `${aspectRatio * 100}%` : '100%',
                    height: forceSquareRatio && aspectRatio < 1 ? `${(1 / aspectRatio) * 100}%` : '100%',
                    left: forceSquareRatio && aspectRatio > 1 ? `${-(aspectRatio - 1) * 50}%` : '0',
                    top: forceSquareRatio && aspectRatio < 1 ? `${-(1 / aspectRatio - 1) * 50}%` : '0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            />

            {/* 
              * Pointer Shield: captures clicks/drags when controls are hidden.
              * This allows drag events to bubble up to the carousel (Embla) 
              * for click-and-drag scrolling on desktop.
              */}
            {!showControls && (
                <div className="absolute inset-0 z-[5] cursor-pointer" />
            )}

            {/* Direct Video Fallback */}
            {(!playerRef.current && vimeoId && (vimeoId.includes('storage') || vimeoId.match(/\.(mp4|m3u8|webm|ogv)(\?.*)?$/i))) && (
                <video
                    src={vimeoId}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay={autoplay}
                    muted={muted}
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => onEnded?.()}
                    onLoadedData={() => onReady?.()}
                    onTimeUpdate={(e) => {
                        const video = e.currentTarget;
                        const seconds = video.currentTime;
                        const duration = video.duration;

                        const max = maxPreviewDurationRef.current;
                        const isPreview = isPreviewModeRef.current;

                        // Notify ready when we have actual playback progress
                        if (seconds > 0.1) {
                            onReadyRef.current?.();
                        }

                        let reportPercent = seconds / duration;
                        if (isPreview && max) {
                            reportPercent = Math.min(1, seconds / max);
                        }

                        onProgressRef.current?.(seconds, duration, reportPercent);

                        // Direct Video Time Limit Check
                        if (isPreview && max && seconds >= max) {
                            if (!showUpgradeOverlay) {
                                video.pause();
                                setIsPlaying(false);
                                setShowUpgradeOverlay(true);
                                onPreviewLimitReached?.();
                            }
                        }
                    }}
                />
            )}

            {/* Error Overlay */}
            {playerError && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/90 p-6 text-center backdrop-blur-sm">
                    {/* ... error UI ... */}
                    <div className="max-w-xs">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <p className="text-red-400 font-bold mb-2">영상 재생 오류</p>
                        <p className="text-zinc-400 text-xs mb-4 leading-relaxed font-mono bg-black/50 p-2 rounded border border-zinc-800">
                            {playerError.message || (typeof playerError === 'string' ? playerError : 'Unknown Error')}
                        </p>
                        <p className="text-zinc-600 text-[10px]">ID: {vimeoId}</p>
                    </div>
                </div>
            )}

            {/* 프리뷰 타이머 내부 UI 삭제 (부모에서 관리) */}

            {/* Like Animation */}
            {showLikeAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <Heart
                        className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                        style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                    />
                </div>
            )}

            {/* 프리뷰 프로그레스 바 내부 UI 삭제 (부모에서 관리) */}

            {/* 업그레이드 오버레이 (프리뷰 종료 시 표시) */}
            {showUpgradeOverlay && !hideInternalOverlay && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="max-w-md mx-4 text-center">
                        <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-3 md:mb-6 rounded-full bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
                            <Lock className="w-6 h-6 md:w-8 md:h-8 text-violet-400" />
                        </div>

                        <h3 className="text-lg md:text-2xl font-bold text-white mb-2 md:mb-3">
                            프리뷰가 종료되었습니다
                        </h3>

                        <p className="text-zinc-400 mb-4 md:mb-8 text-xs md:text-sm px-2">
                            마음에 드셨나요? 이 강의와 수백 개의 다른 강의를 모두 시청하세요.
                        </p>

                        <div className="space-y-3">
                            <Link to="/pricing" className="block">
                                <button className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 md:py-4 px-4 md:px-6 rounded-full shadow-lg shadow-violet-500/30 transition-colors text-sm md:text-base">
                                    구독하고 모두 시청하기
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
});

VideoPlayer.displayName = 'VideoPlayer';
