import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { Play, PlayCircle } from 'lucide-react';
import Player from '@vimeo/player';
import { cn } from '../lib/utils';

interface CourseCardProps {
    course: Course;
    className?: string;
    isDailyFree?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, className, isDailyFree }) => {
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

    const [vimeoId, setVimeoId] = useState<string | null>(getVimeoId(course.previewVideoUrl));

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isHovering) {
            if (!vimeoId) {
                import('../lib/api').then(({ getCoursePreviewVideo }) => {
                    getCoursePreviewVideo(course.id).then(url => {
                        if (url) setVimeoId(getVimeoId(url));
                    });
                });
            }

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
    }, [isHovering, vimeoId, course.id]);

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
            className={cn("group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1", className)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Video/Thumbnail Area (16:9) */}
            <div className="relative w-full aspect-[16/9] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 transition-colors group-hover:border-zinc-700">
                <Link to={`/courses/${course.id}`} className="absolute inset-0 block overflow-hidden">
                    <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className={cn("absolute inset-0 w-full h-full object-cover transition-transform duration-700", isHovering ? 'scale-110' : 'scale-100')}
                    />

                    {isDailyFree && (
                        <div className="absolute top-2 left-2 px-2 py-1 bg-violet-600/90 backdrop-blur-md rounded-md shadow-lg border border-violet-400/20 z-20 pointer-events-none">
                            <span className="text-[10px] font-bold text-white tracking-wide">오늘의 무료</span>
                        </div>
                    )}

                    {showVideo && vimeoId && (
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

                {/* Video Play Marker */}
                {!isHovering && (
                    <div className="absolute bottom-2 right-2 z-10">
                        <div className="bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-bold text-white/90 border border-white/10">
                            16:9
                        </div>
                    </div>
                )}

                {/* Progress/Seek Bar */}
                {showVideo && isHovering && (
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

            {/* Information Area (Below Video) */}
            <div className="flex gap-3 px-1">
                {/* Creator Avatar */}
                <Link to={`/creator/${course.creatorId}`} className="shrink-0 pt-0.5">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-800 overflow-hidden hover:border-violet-500/50 transition-colors">
                        {course.creatorProfileImage ? (
                            <img src={course.creatorProfileImage} alt={course.creatorName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                {course.creatorName?.charAt(0)}
                            </div>
                        )}
                    </div>
                </Link>

                {/* Metadata */}
                <div className="flex-1 min-w-0 pr-1">
                    <Link to={`/courses/${course.id}`}>
                        <h3 className="text-zinc-100 font-bold text-sm md:text-base leading-tight mb-1 line-clamp-2 group-hover:text-violet-400 transition-colors">
                            {course.title}
                        </h3>
                    </Link>

                    <div className="flex items-center justify-between gap-4 mt-1.5">
                        <Link to={`/creator/${course.creatorId}`} className="text-xs md:text-sm text-zinc-400 font-medium hover:text-zinc-200 transition-colors truncate">
                            {course.creatorName}
                        </Link>

                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                            <PlayCircle className="w-3 h-3" />
                            <span>{course.lessonCount || 0} Lessons</span>
                        </div>
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
