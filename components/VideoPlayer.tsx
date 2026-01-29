import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Lock, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWakeLock } from '../hooks/useWakeLock';

interface VideoPlayerProps {
    vimeoId: string;
    title: string;
    startTime?: number;
    isPaused?: boolean;
    playing?: boolean; // New prop
    maxPreviewDuration?: number; // In seconds
    isPreviewMode?: boolean; // For compatibility
    onEnded?: () => void;
    onProgress?: (seconds: number) => void;
    onPreviewLimitReached?: () => void;
    onPreviewEnded?: () => void; // For compatibility
    showControls?: boolean;
    fillContainer?: boolean;
    forceSquareRatio?: boolean;
    autoplay?: boolean;
    onDoubleTap?: () => void;
    onPlayingChange?: (isPlaying: boolean) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    vimeoId,
    startTime,
    isPaused = false,
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
    onPlayingChange
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    useWakeLock(isPlaying);

    useEffect(() => {
        onPlayingChange?.(isPlaying);
    }, [isPlaying, onPlayingChange]);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [playerError, setPlayerError] = useState<any>(null);
    const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
    const [hasReachedPreviewLimit, setHasReachedPreviewLimit] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const onProgressRef = useRef(onProgress);
    const maxPreviewDurationRef = useRef(maxPreviewDuration);
    const isPreviewModeRef = useRef(isPreviewMode);
    const hasReachedRef = useRef(false); // To track limit inside event listener

    useEffect(() => {
        onProgressRef.current = onProgress;
        maxPreviewDurationRef.current = maxPreviewDuration;
        isPreviewModeRef.current = isPreviewMode;
    }, [onProgress, maxPreviewDuration, isPreviewMode]);

    useEffect(() => {
        if (!containerRef.current) return;

        let player: Player | null = null;
        setPlayerError(null);

        try {
            const options: any = {
                autoplay: autoplay,
                loop: false,
                autopause: true,
                title: false,
                byline: false,
                portrait: false,
                controls: showControls,
                color: 'ffffff',
                badge: false,
                muted: true,
                playsinline: true, // Support mobile autoplay
                background: !showControls && autoplay, // Only use background mode if autoplay is intentional
            };

            const vimeoIdStr = String(vimeoId || '').trim();
            console.log('[VideoPlayer] Received vimeoId:', vimeoIdStr);

            if (!vimeoIdStr) {
                console.warn('[VideoPlayer] Empty vimeoId provided');
                setPlayerError({ message: 'No video ID provided' });
                return;
            }

            // Internal extraction helper
            let numericId = 0;
            let hash = '';

            if (vimeoIdStr.startsWith('http')) {
                const match = vimeoIdStr.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([a-zA-Z0-9]+))?/i);
                if (match) {
                    numericId = Number(match[1]);
                    if (match[2]) hash = match[2];
                } else {
                    options.url = vimeoIdStr; // Fallback for unknown URL formats
                }
            } else if (/^\d+$/.test(vimeoIdStr)) {
                numericId = Number(vimeoIdStr);
            } else if (vimeoIdStr.includes(':') || vimeoIdStr.includes('/')) {
                // Handle ID:HASH or ID/HASH format
                const separator = vimeoIdStr.includes(':') ? ':' : '/';
                const [idPart, hPart] = vimeoIdStr.split(separator);
                numericId = Number(idPart);
                if (hPart) hash = hPart;
            } else {
                // If it's something weird, try URL
                options.url = `https://vimeo.com/${vimeoIdStr}`;
            }

            // If we extracted a valid numeric ID, prefer using id (+h) over url
            // For private videos (with hash), we MUST use manual iframe to avoid OEmbed authentication issues
            if (numericId > 0 && hash) {
                const iframe = document.createElement('iframe');
                const params = new URLSearchParams();
                params.append('h', hash);
                params.append('title', '0');
                params.append('byline', '0');
                params.append('portrait', '0');
                params.append('badge', '0');
                params.append('autopause', '1');
                params.append('autoplay', autoplay ? '1' : '0');
                params.append('muted', autoplay ? '1' : '0');
                if (!showControls && autoplay) params.append('background', '1'); // Extra safety for silent background play
                params.append('player_id', containerRef.current.id || `vimeo-${numericId}`);
                params.append('app_id', '122963');
                if (!showControls) params.append('controls', '0');

                iframe.src = `https://player.vimeo.com/video/${numericId}?${params.toString()}`;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; fullscreen; picture-in-picture';

                // Force 1:1 aspect ratio by scaling iframe to crop 16:9 to square
                iframe.style.width = '177.78%';
                iframe.style.height = '177.78%';
                iframe.style.position = 'absolute';
                iframe.style.top = '50%';
                iframe.style.left = '50%';
                iframe.style.transform = 'translate(-50%, -50%)';
                iframe.style.objectFit = 'cover';

                // Clear container and mount iframe
                containerRef.current.innerHTML = '';
                containerRef.current.appendChild(iframe);

                // Initialize player with the iframe
                player = new Player(iframe);
            }
            else if (numericId > 0) {
                // Public video - SDK handles it fine
                options.id = numericId;
                delete options.url;
                player = new Player(containerRef.current, options);
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

                currentPlayer.on('play', () => setIsPlaying(true));
                currentPlayer.on('pause', () => setIsPlaying(false));
                currentPlayer.on('bufferstart', () => setIsPlaying(false));
                currentPlayer.on('bufferend', () => setIsPlaying(true));

                if (startTime && startTime > 0) {
                    currentPlayer.setCurrentTime(startTime).catch(err => console.warn('Failed to set initial time:', err));
                }

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
                                    setHasReachedPreviewLimit(true);
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
                    if (onProgressRef.current) onProgressRef.current(seconds);
                    checkTimeLimit(seconds);

                    const max = maxPreviewDurationRef.current;
                    if (isPreviewModeRef.current && max) {
                        const remaining = max - seconds;
                        if (containerRef.current) {
                            setTimeRemaining(Math.max(0, Math.ceil(remaining)));
                        }
                    }
                });
            }

        } catch (err: any) {
            // Ignore AbortError occurring during initialization
            if (err?.name === 'AbortError' || err?.message?.includes('aborted')) return;

            console.error('Failed to initialize Vimeo player:', err);
            if (containerRef.current) {
                setPlayerError(err);
            }
        }

        return () => {
            if (player) {
                try { player.destroy(); } catch (_e) { }
            }
        };
    }, [vimeoId]);

    // Polling fallback to ensure preview limit is enforced
    useEffect(() => {
        const interval = setInterval(() => {
            const player = playerRef.current;
            if (!player) return;

            player.getCurrentTime().then((seconds) => {
                if (typeof seconds === 'number') {
                    if (onProgressRef.current) onProgressRef.current(seconds);

                    const max = maxPreviewDurationRef.current;
                    const isPreview = isPreviewModeRef.current;

                    // STRICT ENFORCEMENT
                    if (isPreview && max) {
                        if (seconds >= max) {
                            console.log(`[VideoPlayer] STRICT LIMIT HIT: ${seconds}s >= ${max}s. Forcing pause.`);
                            player.pause().catch(console.warn);

                            if (!hasReachedRef.current) {
                                hasReachedRef.current = true;
                                setHasReachedPreviewLimit(true);
                                setShowUpgradeOverlay(true);
                                if (onPreviewLimitReached) onPreviewLimitReached();
                                if (onPreviewEnded) onPreviewEnded();
                            }
                        } else {
                            // Only reset if we are significantly below the limit (to prevent flickering)
                            if (seconds < max - 1) {
                                hasReachedRef.current = false;
                            }
                        }
                    }
                }
            }).catch(() => { });
        }, 500); // Check every 500ms
        return () => clearInterval(interval);
    }, []);


    // Handle external play/pause control with a single robust effect
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const syncPlaybackState = async () => {
            try {
                // If paused prop or preview limit reached, we should pause
                if (isPaused || hasReachedPreviewLimit) {
                    await player.pause();
                } else if (playing) {
                    // Only play if 'playing' is true and not reached limit
                    await player.play();
                } else {
                    // If playing is explicitly false, pause
                    await player.pause();
                }
            } catch (err: any) {
                // Check if it's an expected interruption error
                if (err?.name === 'AbortError' || err?.name === 'PlayInterrupted') {
                    // Silently ignore interruptions from rapid state changes
                    return;
                }
                console.warn('[VideoPlayer] Playback sync error:', err);
            }
        };

        syncPlaybackState();
    }, [isPaused, playing, hasReachedPreviewLimit]);

    // Force 1:1 aspect ratio on iframes (ONLY if requested)
    useEffect(() => {
        if (!containerRef.current || !forceSquareRatio) return;

        const applySquareCrop = () => {
            const iframe = containerRef.current?.querySelector('iframe');
            if (iframe) {
                // Check if style is already correct to avoid infinite loops
                if (iframe.style.width === '177.78%' &&
                    iframe.style.height === '177.78%' &&
                    iframe.style.transform === 'translate(-50%, -50%)') {
                    return;
                }

                iframe.style.width = '177.78%';
                iframe.style.height = '177.78%';
                iframe.style.position = 'absolute';
                iframe.style.top = '50%';
                iframe.style.left = '50%';
                iframe.style.transform = 'translate(-50%, -50%)';
                iframe.style.objectFit = 'cover';
                console.log('[VideoPlayer] Applied 1:1 crop to iframe');
            }
        };

        // Apply immediately
        applySquareCrop();

        // Observe style changes on the iframe
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    applySquareCrop();
                }
                // Also handle childList changes if iframe is re-injected
                if (mutation.type === 'childList') {
                    applySquareCrop();
                }
            });
        });

        observer.observe(containerRef.current, {
            attributes: true,
            childList: true,
            subtree: true,
            attributeFilter: ['style']
        });

        // Also apply after short delays to catch SDK initialization
        const timers = [
            setTimeout(applySquareCrop, 100),
            setTimeout(applySquareCrop, 500),
            setTimeout(applySquareCrop, 1000),
            setTimeout(applySquareCrop, 2000)
        ];

        return () => {
            observer.disconnect();
            timers.forEach(clearTimeout);
        };
    }, [playerRef.current, vimeoId, forceSquareRatio]);


    return (
        <div
            className={fillContainer ? 'relative w-full h-full' : 'relative w-full aspect-video'}
            onClick={async (_e) => {
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
                className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            />

            {/* Direct Video Fallback */}
            {(!playerRef.current && vimeoId && (vimeoId.includes('storage') || vimeoId.match(/\.(mp4|m3u8|webm|ogv)(\?.*)?$/i))) && (
                <video
                    src={vimeoId}
                    className="absolute inset-0 w-full h-full object-cover"
                    autoPlay={autoplay}
                    muted={autoplay}
                    loop
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => onEnded?.()}
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
