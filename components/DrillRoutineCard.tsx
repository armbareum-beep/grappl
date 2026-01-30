import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DrillRoutine } from '../types';
import { PlayCircle, Bookmark, Share2 } from 'lucide-react';
import Player from '@vimeo/player';
import { toggleRoutineSave, checkRoutineSaved } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { ContentBadge } from './common/ContentBadge';

interface DrillRoutineCardProps {
    routine: DrillRoutine;
    rank?: number;
    hasAccess?: boolean;
}

export const DrillRoutineCard: React.FC<DrillRoutineCardProps> = ({ routine, rank, hasAccess = false }) => {
    const { user } = useAuth();
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (user && routine.id) {
            checkRoutineSaved(user.id, routine.id).then(setIsSaved).catch(console.error);
        }
    }, [user, routine.id]);
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

                    {/* Badge — top-left, single: FREE > HOT > NEW */}
                    <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                        {rank ? (
                            <ContentBadge type="popular" rank={rank} />
                        ) : (routine.createdAt && new Date(routine.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                            <ContentBadge type="recent" />
                        ) : null}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 z-[1]" />

                    {/* Save — top-right */}
                    <button
                        className={cn(
                            "absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white",
                            isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                        )}
                        onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!user) return;
                            try {
                                await toggleRoutineSave(user.id, routine.id);
                                setIsSaved(!isSaved);
                            } catch (err) {
                                console.error(err);
                            }
                        }}
                        aria-label="저장"
                    >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
                    </button>

                    {/* Share — bottom-right */}
                    <button
                        className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        aria-label="공유"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>

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
                <div className="flex items-center justify-between gap-4 mt-1.5">
                    <p className="text-zinc-500 text-[11px] md:text-xs font-medium truncate">
                        {routine.creatorName}
                    </p>
                    <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                        <PlayCircle className="w-3 h-3" />
                        <span>{(routine.views || 0).toLocaleString()} 조회수</span>
                    </div>
                </div>
            </div>
            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};
