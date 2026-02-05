import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Lock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useWakeLock } from '../hooks/useWakeLock';
import { parseVimeoId } from '../lib/api';

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
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    vimeoId,
    startTime,
    playing = false,
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
    onAutoplayBlocked
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    useWakeLock(isPlaying);
    const [aspectRatio, setAspectRatio] = useState(16 / 9); // Default to 16:9

    useEffect(() => {
        onPlayingChange?.(isPlaying);
    }, [isPlaying, onPlayingChange]);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [playerError, setPlayerError] = useState<any>(null);
    const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onProgressRef = useRef(onProgress);
    const maxPreviewDurationRef = useRef(maxPreviewDuration);
    const isPreviewModeRef = useRef(isPreviewMode);
    const hasReachedRef = useRef(false); // To track limit inside event listener

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
                background: !showControls && autoplay && muted, // Only use background mode if autoplay is intentional AND muted
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
            // Actually, for consistency and reliability on localhost, let's use manual iframe for BOTH hash and non-hash numeric IDs.
            if (numericId > 0) {
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

                // If controls are hidden (Reel mode), background=1 is often required for smooth autoplay/loop
                if (!showControls) {
                    params.append('background', '1');
                    params.append('controls', '0');
                    if (autoplay) {
                        params.append('loop', '1');
                    }
                }

                params.append('player_id', containerRef.current.id || `vimeo-${numericId}`);
                params.append('app_id', '122963');
                params.append('dnt', '1');
                params.append('share', '0');
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
                player = new Player(iframe);
                console.log('[VideoPlayer] Strategy: Manual Iframe (Numeric ID)');
            }
            else {
                // Check if it's a direct video URL (mp4, m3u8, etc)
                const isDirectVideo = vimeoIdStr.match(/\.(mp4|m3u8|webm|ogv)(\?.*)?$/i) || vimeoIdStr.includes('storage.googleapis.com') || vimeoIdStr.includes('supabase.co/storage');

                if (isDirectVideo) {
                    console.log('[VideoPlayer] Strategy: Direct Video URL');
                    // We don't initialize Vimeo Player for direct videos
                    // But we still want to keep the same UI
                    return;
                }

                // Fallback to URL
                player = new Player(containerRef.current, options);
            }

            console.log('[VideoPlayer] Initialized player with strategy:', numericId > 0 && hash ? 'Manual Iframe' : 'SDK Options');

            playerRef.current = player;
            const currentPlayer = player; // Capture for closure safety

            if (currentPlayer) {
                currentPlayer.on('error', (data) => {
                    // Filter out harmless playback interruption errors
                    if (data?.name === 'AbortError' || data?.name === 'PlayInterrupted') {
                        return;
                    }

                    // Don't set error if component unmounted
                    if (!containerRef.current) return;

                    console.error('Vimeo Player Error:', data);
                    setPlayerError(data);
                });

                currentPlayer.on('play', () => {
                    // Strict enforcement: if we shouldn't be playing, pause immediately
                    // DISABLED: This causes issues when user manually plays but parent prop hasn't updated yet.
                    // Trust the user's interaction if they clicked play on the control bar.
                    /*
                    if (!playingRef.current) {
                        console.log('[VideoPlayer] Play event detected but playing prop is false -> Forcing pause');
                        currentPlayer.pause().catch(() => { });
                        return;
                    }
                    */
                    setIsPlaying(true);
                });
                currentPlayer.on('pause', () => setIsPlaying(false));
                currentPlayer.on('bufferstart', () => setIsPlaying(false));
                currentPlayer.on('bufferend', () => setIsPlaying(true));

                currentPlayer.on('ended', () => {
                    if (onEnded) onEnded();
                });

                const checkTimeLimit = (seconds: number) => {
                    const max = maxPreviewDurationRef.current;
                    const isPreview = isPreviewModeRef.current;

                    if (isPreview && max) {
                        if (seconds >= max) {
                            player?.pause().catch(console.warn);
                            if (!hasReachedRef.current) {
                                hasReachedRef.current = true;
                                if (containerRef.current) {
                                    if (onPreviewLimitReached) onPreviewLimitReached();
                                    setShowUpgradeOverlay(true);
                                }
                                if (onPreviewLimitReached) onPreviewLimitReached();
                                if (onPreviewEnded) onPreviewEnded();
                            }
                        } else {
                            hasReachedRef.current = false;
                        }
                    }
                };

                player.on('seeked', (data) => {
                    checkTimeLimit(data.seconds);
                });

                player.on('timeupdate', (data) => {
                    const seconds = data.seconds;
                    if (onProgressRef.current) {
                        onProgressRef.current(seconds, data.duration, data.percent);
                    }
                    checkTimeLimit(seconds);

                    const max = maxPreviewDurationRef.current;
                    if (isPreviewModeRef.current && max) {
                        const remaining = max - seconds;
                        if (containerRef.current) {
                            setTimeRemaining(Math.max(0, Math.ceil(remaining)));
                        }
                    }
                });

                currentPlayer.on('loaded', () => {
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

                    onReadyRef.current?.();
                });
            }

            // ... (catch block)

        } catch (err: any) {
            // ... existing catch logic ...
            // Ignore AbortError occurring during initialization
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;

            console.error('Failed to initialize Vimeo player:', err);
            if (containerRef.current) {
                setPlayerError(err);
            }
        }

        // Cleanup function for the effect
        const currentContainer = containerRef.current;

        return () => {
            // CRITICAL: Nullify playerRef IMMEDIATELY to prevent race conditions
            // where React creates a new player before async cleanup completes
            const playerToDestroy = player;
            if (player === playerRef.current) {
                playerRef.current = null;
            }

            // Priority 1: Destroy the Vimeo Player instance FIRST to stop audio/playback logic
            if (playerToDestroy) {
                try {
                    playerToDestroy.unload().then(() => playerToDestroy?.destroy()).catch(() => {
                        // Fallback destruction
                        try { playerToDestroy?.destroy(); } catch (e) { }
                    });
                } catch (_e) { }
            }

            // Priority 2: Nuke the DOM to ensure no iframe remains
            if (currentContainer) {
                // Force stop any iframe src
                const iframes = currentContainer.querySelectorAll('iframe');
                iframes.forEach(iframe => {
                    try {
                        iframe.src = 'about:blank';
                        iframe.removeAttribute('src');
                    } catch (e) { /* ignore */ }
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

    // Sync muted state
    useEffect(() => {
        if (!playerRef.current) return;

        playerRef.current.getMuted().then(currentMuted => {
            if (currentMuted !== muted && playerRef.current) {
                playerRef.current.setMuted(muted).catch(err => {
                    console.warn('[VideoPlayer] Failed to set muted state:', err);
                });
            }
        });
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
                />
            )}

            {/* Error Overlay */}
            {playerError && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/90 p-6 text-center backdrop-blur-sm">
                    <div className="max-w-xs">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                            <span className="text-xl">⚠️</span>
                        </div>
                        <p className="text-red-400 font-bold mb-2">영상 재생 오류</p>
                        <p className="text-zinc-400 text-xs mb-4 leading-relaxed font-mono bg-black/50 p-2 rounded border border-zinc-800">
                            {playerError.message || (typeof playerError === 'string' ? playerError : 'Unknown Error')}
                            {playerError.name && ` (${playerError.name})`}
                        </p>
                        <p className="text-zinc-600 text-[10px]">ID: {vimeoId}</p>
                    </div>
                </div>
            )}

            {/* 프리뷰 타이머 (재생 중 표시) */}
            {isPreviewMode && !showUpgradeOverlay && timeRemaining !== null && timeRemaining > 0 && (
                <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-violet-500/30">
                    <span className="text-xs font-bold text-violet-300">
                        프리뷰: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} 남음
                    </span>
                </div>
            )}

            {/* Like Animation */}
            {showLikeAnimation && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                    <Heart
                        className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                        style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                    />
                </div>
            )}

            {/* 업그레이드 오버레이 (프리뷰 종료 시 표시) */}
            {showUpgradeOverlay && (
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
};
