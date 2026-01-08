import React, { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VideoPlayerProps {
    vimeoId: string;
    title: string;
    startTime?: number;
    isPaused?: boolean;
    maxPreviewDuration?: number; // In seconds
    isPreviewMode?: boolean; // For compatibility
    onEnded?: () => void;
    onProgress?: (seconds: number) => void;
    onPreviewLimitReached?: () => void;
    onPreviewEnded?: () => void; // For compatibility
    showControls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    vimeoId,
    startTime,
    isPaused = false,
    maxPreviewDuration,
    isPreviewMode = false,
    onEnded,
    onProgress,
    onPreviewLimitReached,
    onPreviewEnded,
    showControls = true
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [hasReachedPreviewLimit, setHasReachedPreviewLimit] = useState(false);

    useEffect(() => {
        if (!containerRef.current) return;

        let player: Player | null = null;

        try {
            // Initialize player
            const options: any = {
                autoplay: false,
                loop: false,
                autopause: true,
                title: false,
                byline: false,
                portrait: false,
                controls: showControls, // Use showControls prop
                color: 'ffffff', // White controls
                dnt: true,
                badge: false, // Hide Vimeo logo
            };

            // Ensure vimeoId is a string for checking
            const vimeoIdStr = String(vimeoId || '').trim();

            if (vimeoIdStr.startsWith('http')) {
                options.url = vimeoIdStr;

                // Extra safety: extract hash if present for some Vimeo API edge cases
                const hashMatch = vimeoIdStr.match(/vimeo\.com\/(?:video\/)?\d+\/([a-z0-9]+)/i);
                if (hashMatch) {
                    options.h = hashMatch[1];
                }
            } else if (/^\d+$/.test(vimeoIdStr)) {
                options.id = Number(vimeoIdStr);
            } else if (vimeoIdStr.includes('/')) {
                // Handle complex IDs like "12345/abcde"
                const [id, h] = vimeoIdStr.split('/');
                options.id = Number(id);
                options.h = h;
            } else {
                options.url = vimeoIdStr; // Fallback
            }

            player = new Player(containerRef.current, options);
            playerRef.current = player;

            // Set initial time if provided
            if (startTime && startTime > 0) {
                player.setCurrentTime(startTime).catch(err => {
                    console.warn('Failed to set initial time:', err);
                });
            }

            // Add event listeners
            player.on('ended', () => {
                if (onEnded) onEnded();
            });

            player.on('timeupdate', (data) => {
                const seconds = data.seconds;
                if (onProgress) onProgress(seconds);

                // Handle preview limit
                if (isPreviewMode && maxPreviewDuration) {
                    const remaining = maxPreviewDuration - seconds;
                    setTimeRemaining(Math.max(0, Math.ceil(remaining)));

                    // Pause at preview limit
                    if (seconds >= maxPreviewDuration && !hasReachedPreviewLimit) {
                        setHasReachedPreviewLimit(true);
                        if (player) {
                            player.pause().catch(err => console.warn('Failed to pause:', err));
                        }
                        setShowUpgradeOverlay(true);
                        if (onPreviewLimitReached) onPreviewLimitReached();
                        if (onPreviewEnded) onPreviewEnded();
                    }
                }
            });
        } catch (err) {
            console.error('Failed to initialize Vimeo player:', err);
        }

        return () => {
            if (player) {
                try {
                    player.destroy();
                } catch (err) {
                    // Silently fail if destruction fails (often happens with bad video IDs)
                }
            }
        };
    }, [vimeoId, onEnded, onProgress]); // startTime is only used on init

    // Handle external pause control
    useEffect(() => {
        if (!playerRef.current) return;

        if (isPaused) {
            playerRef.current.pause().catch(err => console.warn('Failed to pause player:', err));
        }
    }, [isPaused]);

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
            className="relative w-full cursor-pointer [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0 [&>iframe]:w-full [&>iframe]:h-full"
            style={{ paddingBottom: '56.25%' }}
            ref={containerRef}
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
                                프리뷰 다시보기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
