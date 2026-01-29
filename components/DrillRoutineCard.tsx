import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DrillRoutine } from '../types';
import { PlayCircle } from 'lucide-react';
import Player from '@vimeo/player';
import { cn } from '../lib/utils';
import { ContentBadge } from './common/ContentBadge';

interface DrillRoutineCardProps {
    routine: DrillRoutine;
    rank?: number;
    hasAccess?: boolean;
}

export const DrillRoutineCard: React.FC<DrillRoutineCardProps> = ({ routine, rank, hasAccess = false }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef<Player | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : url;
    };

    // For routines, we might need a specific preview URL or just use one of the drills?
    // Using drills[0].videoUrl as a fallback if no routine-specific preview exists
    const previewUrl = routine.drills && routine.drills.length > 0 ? routine.drills[0].videoUrl : undefined;
    const [vimeoId] = useState<string | null>(getVimeoId(previewUrl));

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isHovering && hasAccess) {
            // If we don't have a vimeo ID yet, we might want to fetch it here if needed
            // But for now assuming it's available in the routine object or its drills
            if (vimeoId) {
                timer = setTimeout(() => {
                    setShowVideo(true);
                }, 400);
            }
        } else {
            setShowVideo(false);
            playerRef.current = null;
            setProgress(0);
        }
        return () => clearTimeout(timer);
    }, [isHovering, vimeoId, routine.id, hasAccess]);

    useEffect(() => {
        if (showVideo && iframeRef.current && !playerRef.current) {
            try {
                const player = new Player(iframeRef.current);
                playerRef.current = player;
                player.getDuration().then((dur) => setDuration(dur));
                player.on('timeupdate', (data) => {
                    if (!isDragging) setProgress(data.seconds);
                });
            } catch (err) {
                console.error('Failed to initialize Vimeo player:', err);
            }
        }
    }, [showVideo, isDragging]);

    const handleSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!seekBarRef.current || !playerRef.current || !duration) return;
        e.preventDefault();
        e.stopPropagation();
        const rect = seekBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const targetTime = duration * percentage;
        setProgress(targetTime);
        playerRef.current.setCurrentTime(targetTime);
    };

    const handleSeekBarMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        setIsDragging(true);
        handleSeekBarClick(e);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !seekBarRef.current || !playerRef.current || !duration) return;
            const rect = seekBarRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));
            const targetTime = duration * percentage;
            setProgress(targetTime);
            playerRef.current.setCurrentTime(targetTime);
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, duration]);

    const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;


    return (
        <div
            className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1"
            onMouseEnter={() => setIsHovering(true && hasAccess)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Thumbnail */}
            <div
                className="relative aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 group-hover:border-zinc-700 transition-all"
            >
                <Link to={`/routines/${routine.id}`} className="absolute inset-0 block">
                    <img
                        src={routine.thumbnailUrl}
                        alt={routine.title}
                        className={cn(
                            "w-full h-full object-cover transition-transform duration-500 opacity-90 group-hover:opacity-100",
                            isHovering && hasAccess ? 'scale-110' : 'group-hover:scale-105'
                        )}
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Play Icon Overlay */}
                    {!showVideo && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                                <PlayCircle className="w-8 h-8 text-white fill-white/20" />
                            </div>
                        </div>
                    )}

                    {(rank) ? (
                        <ContentBadge type="popular" rank={rank} className="absolute top-2 right-2 z-20" />
                    ) : (routine.createdAt && new Date(routine.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                        <ContentBadge type="recent" className="absolute top-2 right-2 z-20" />
                    ) : null}

                    {showVideo && vimeoId && hasAccess && (
                        <div className="absolute inset-0 z-10 bg-black animate-fade-in">
                            <iframe
                                ref={iframeRef}
                                src={`https://player.vimeo.com/video/${vimeoId}?background=1&muted=1&controls=0&badge=0&title=0&byline=0&portrait=0&dnt=1`}
                                className="absolute inset-0 w-full h-full pointer-events-none"
                                frameBorder="0"
                                allow="autoplay"
                            ></iframe>
                        </div>
                    )}
                </Link>

                {/* Progress/Seek Bar */}
                {showVideo && isHovering && hasAccess && (
                    <div
                        ref={seekBarRef}
                        className="absolute bottom-0 left-0 right-0 h-1 z-30 bg-white/20 cursor-pointer pointer-events-auto"
                        onMouseDown={handleSeekBarMouseDown}
                        onClick={handleSeekBarClick}
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-violet-500 transition-all"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Information Area */}
            <div className="px-1">
                <Link to={`/routines/${routine.id}`}>
                    <h3 className="font-bold text-zinc-100 text-sm md:text-base leading-tight mb-1 line-clamp-1 group-hover:text-violet-400 transition-colors">
                        {routine.title}
                    </h3>
                </Link>
                <p className="text-zinc-500 text-[11px] md:text-xs font-medium">
                    {routine.creatorName}
                </p>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};
