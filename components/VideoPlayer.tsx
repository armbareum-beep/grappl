import React, { useEffect, useRef } from 'react';
import Player from '@vimeo/player';

interface VideoPlayerProps {
    vimeoId: string;
    title: string;
    onEnded?: () => void;
    onProgress?: (seconds: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ vimeoId, title, onEnded, onProgress }) => {
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
                title: true,
            };

            // Ensure vimeoId is a string for checking
            const vimeoIdStr = String(vimeoId);

            // Check if vimeoId is a URL or an ID
            if (vimeoIdStr.startsWith('http')) {
                options.url = vimeoIdStr;
            } else {
                options.id = Number(vimeoIdStr);
            }

            player = new Player(containerRef.current, options);
            playerRef.current = player;

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
            className="relative w-full [&>iframe]:absolute [&>iframe]:top-0 [&>iframe]:left-0 [&>iframe]:w-full [&>iframe]:h-full"
            style={{ paddingBottom: '56.25%' }}
            ref={containerRef}
        >
            {/* Player will be injected here by SDK */}
        </div>
    );
};
