import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    fillContainer = false
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [playerError, setPlayerError] = useState<any>(null);
    const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
    const [hasReachedPreviewLimit, setHasReachedPreviewLimit] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

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
                autoplay: false,
                loop: false,
                autopause: true,
                title: false,
                byline: false,
                portrait: false,
                controls: showControls,
                color: 'ffffff',
                badge: false,
            };

            const vimeoIdStr = String(vimeoId || '').trim();
            console.log('[VideoPlayer] Received vimeoId:', vimeoIdStr);

            if (!vimeoIdStr) {
                console.warn('[VideoPlayer] Empty vimeoId provided');
                setPlayerError({ message: 'No video ID provided' });
                return;
            }

            if (vimeoIdStr.startsWith('http')) {
                options.url = vimeoIdStr;
                const hashMatch = vimeoIdStr.match(/vimeo\.com\/(?:video\/)?\d+\/([a-z0-9]+)/i);
                if (hashMatch) options.h = hashMatch[1];
                player = new Player(containerRef.current, options);
            } else if (/^\d+$/.test(vimeoIdStr)) {
                options.id = Number(vimeoIdStr);
                player = new Player(containerRef.current, options);
            } else if (vimeoIdStr.includes('/') || vimeoIdStr.includes(':')) {
                const separator = vimeoIdStr.includes(':') ? ':' : '/';
                const [id, h] = vimeoIdStr.split(separator);
                if (/^\d+$/.test(id) && h) {
                    const iframe = document.createElement('iframe');
                    const params = new URLSearchParams();
                    params.append('h', h);
                    params.append('title', '0');
                    params.append('byline', '0');
                    params.append('portrait', '0');
                    params.append('badge', '0');
                    params.append('app_id', '122963');
                    if (!showControls) params.append('controls', '0');

                    iframe.src = `https://player.vimeo.com/video/${id}?${params.toString()}`;
                    iframe.width = '100%';
                    iframe.height = '100%';
                    iframe.frameBorder = '0';
                    iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                    iframe.referrerPolicy = 'origin';

                    if (containerRef.current) {
                        containerRef.current.innerHTML = '';
                        containerRef.current.appendChild(iframe);
                        player = new Player(iframe);
                    }
                } else {
                    options.url = `https://vimeo.com/${vimeoIdStr}`;
                    player = new Player(containerRef.current, options);
                }
            } else {
                options.url = `https://vimeo.com/${vimeoIdStr}`;
                player = new Player(containerRef.current, options);
            }

            playerRef.current = player;

            if (player) {
                player.on('error', (data) => {
                    // Filter out harmless playback interruption errors
                    if (data?.name === 'AbortError' || data?.name === 'PlayInterrupted') {
                        console.log('[VideoPlayer] Playback interrupted (expected behavior during rapid interaction)');
                        return;
                    }
                    console.error('Vimeo Player Error:', data);
                    setPlayerError(data);
                });

                if (startTime && startTime > 0) {
                    player.setCurrentTime(startTime).catch(err => console.warn('Failed to set initial time:', err));
                }

                player.on('ended', () => {
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
                                setHasReachedPreviewLimit(true);
                                setShowUpgradeOverlay(true);
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
                        setTimeRemaining(Math.max(0, Math.ceil(remaining)));
                    }
                });
            }

        } catch (err: any) {
            console.error('Failed to initialize Vimeo player:', err);
            setPlayerError(err);
        }

        return () => {
            if (player) {
                try { player.destroy(); } catch (e) { }
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

                    if (isPreview && max) {
                        if (seconds >= max) {
                            player.pause().catch(console.warn);

                            if (!hasReachedRef.current) {
                                hasReachedRef.current = true;
                                setHasReachedPreviewLimit(true);
                                setShowUpgradeOverlay(true);
                                if (onPreviewLimitReached) onPreviewLimitReached();
                                if (onPreviewEnded) onPreviewEnded();
                            }
                        } else {
                            hasReachedRef.current = false;
                        }
                    }
                }
            }).catch(() => { });
        }, 1000);
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

    const handleRestartPreview = async () => {
        if (!playerRef.current) return;
        setHasReachedPreviewLimit(false);
        setShowUpgradeOverlay(false);
        setTimeRemaining(maxPreviewDuration || 60);
        try {
            await playerRef.current.setCurrentTime(0);
            await playerRef.current.play();
        } catch (err) {
            console.warn('Failed to restart preview:', err);
        }
    };

    return (
        <div
            className={`relative w-full cursor-pointer ${fillContainer ? 'h-full' : ''}`}
            style={{ paddingBottom: fillContainer ? '0' : '56.25%' }}
            onClick={async () => {
                if (!playerRef.current || showUpgradeOverlay) return;
                const paused = await playerRef.current.getPaused();
                if (paused) {
                    playerRef.current.play();
                } else {
                    playerRef.current.pause();
                }
            }}
        >
            {/* Vimeo Player Container - Isolated to prevent overwriting overlays */}
            <div
                ref={containerRef}
                className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full"
            />

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

            {/* 업그레이드 오버레이 (프리뷰 종료 시 표시) */}
            {showUpgradeOverlay && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <div className="max-w-md mx-4 text-center">
                        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
                            <Lock className="w-8 h-8 text-violet-400" />
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-3">
                            프리뷰가 종료되었습니다
                        </h3>

                        <p className="text-zinc-400 mb-8 text-sm">
                            마음에 드셨나요? 이 강의와 수백 개의 다른 강의를 모두 시청하세요.
                        </p>

                        <div className="space-y-3">
                            <Link to="/pricing" className="block">
                                <button className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 px-6 rounded-full shadow-lg shadow-violet-500/30 transition-colors">
                                    구독하고 모두 시청하기
                                </button>
                            </Link>

                            <button
                                onClick={handleRestartPreview}
                                className="w-full py-3 text-violet-400 hover:text-violet-300 font-medium text-sm transition-colors"
                            >
                                무제한 시청하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
