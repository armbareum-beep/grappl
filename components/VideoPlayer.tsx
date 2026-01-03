import React, { useEffect, useRef } from 'react';
import Player from '@vimeo/player';

interface VideoPlayerProps {
    vimeoId: string;
    title: string;
    startTime?: number;
    onEnded?: () => void;
    onProgress?: (seconds: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ vimeoId, title, startTime, onEnded, onProgress }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);

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
                controls: true, // Show Vimeo controls including play button
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
                if (onProgress) onProgress(data.seconds);
            });
        } catch (err) {
            console.error('Failed to initialize Vimeo player:', err);
        }

        return () => {
            if (player) {
                player.destroy();
            }
        };
    }, [vimeoId, onEnded, onProgress]);

    return (
        <div
            className="relative w-full cursor-pointer [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0 [&>iframe]:w-full [&>iframe]:h-full"
            style={{ paddingBottom: '56.25%' }}
            ref={containerRef}
            onClick={async () => {
                if (!playerRef.current) return;
                const paused = await playerRef.current.getPaused();
                if (paused) {
                    playerRef.current.play();
                } else {
                    playerRef.current.pause();
                }
            }}
        >
            {/* Player will be injected here by SDK */}
        </div>
    );
};
