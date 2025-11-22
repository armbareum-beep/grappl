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

        // Initialize player
        const player = new Player(containerRef.current, {
            id: Number(vimeoId),
            autoplay: false,
            loop: false,
            autopause: true,
            title: true,
        });

        playerRef.current = player;

        // Add event listeners
        player.on('ended', () => {
            if (onEnded) onEnded();
        });

        player.on('timeupdate', (data) => {
            if (onProgress) onProgress(data.seconds);
        });

        return () => {
            player.destroy();
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
