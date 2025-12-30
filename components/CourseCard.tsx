import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { Play, PlayCircle, BarChart2 } from 'lucide-react';
import Player from '@vimeo/player';
import { cn } from '../lib/utils';

interface CourseCardProps {
    course: Course;
    className?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, className }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const cardRef = useRef<HTMLAnchorElement>(null);
    const playerRef = useRef<Player | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);

    // Extract Vimeo ID if available
    const getVimeoId = (url?: string) => {
        if (!url) return null;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : url;
    };

    const [vimeoId, setVimeoId] = useState<string | null>(getVimeoId(course.previewVideoUrl));

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isHovering) {
            // Fetch video ID if missing
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
                }, 300);
            }
        } else {
            setShowVideo(false);
            playerRef.current = null;
            setProgress(0);
        }
        return () => clearTimeout(timer);
    }, [isHovering, vimeoId, course.id]);

    // Initialize Vimeo player when iframe loads
    useEffect(() => {
        if (showVideo && iframeRef.current && !playerRef.current) {
            try {
                const player = new Player(iframeRef.current);
                playerRef.current = player;

                // Get video duration
                player.getDuration().then((dur) => {
                    setDuration(dur);
                });

                // Update progress as video plays
                player.on('timeupdate', (data) => {
                    if (!isDragging) {
                        setProgress(data.seconds);
                    }
                });
            } catch (err) {
                console.error('Failed to initialize Vimeo player:', err);
            }
        }
    }, [showVideo, isDragging]);

    // Handle seek bar interaction
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
        e.preventDefault();
        e.stopPropagation();
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

        const handleMouseUp = () => {
            setIsDragging(false);
        };

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
            className={cn("group relative bg-zinc-900/20 backdrop-blur-md border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-500 hover:border-zinc-700 hover:-translate-y-1 hover:shadow-2xl", className)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <Link to={`/courses/${course.id}`} className="block relative aspect-video overflow-hidden">
                <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isHovering ? 'scale-105' : 'scale-100'}`}
                />



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

                <div className={`absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-zinc-950/10 opacity-60 transition-opacity duration-300`} />

                {showVideo && isHovering && (
                    <div
                        ref={seekBarRef}
                        className="absolute bottom-0 left-0 right-0 h-1 z-30 bg-white/20 cursor-pointer"
                        onMouseDown={handleSeekBarMouseDown}
                        onClick={handleSeekBarClick}
                    >
                        <div
                            className="absolute top-0 left-0 h-full bg-violet-500 transition-all"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                )}

                {!showVideo && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-violet-600/30 backdrop-blur-md flex items-center justify-center border border-violet-500/30 transform group-hover:scale-110 transition-transform duration-500">
                            <Play className="w-6 h-6 text-violet-400 fill-current ml-1" />
                        </div>
                    </div>
                )}
            </Link>

            <div className="px-5 py-4">
                <Link to={`/courses/${course.id}`} className="block">
                    <h3 className="font-bold text-zinc-100 text-lg mb-4 line-clamp-1 group-hover:text-violet-400 transition-colors">
                        {course.title}
                    </h3>
                </Link>

                <div className="flex items-center justify-between">
                    <Link to={`/creator/${course.creatorId}`} className="flex items-center gap-2 group/author">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700/50 overflow-hidden shrink-0">
                            {course.creatorProfileImage ? (
                                <img src={course.creatorProfileImage} alt={course.creatorName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold uppercase">
                                    {course.creatorName?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <span className="text-sm text-zinc-400 font-medium group-hover/author:text-zinc-200 transition-colors truncate">
                            {course.creatorName}
                        </span>
                    </Link>

                    <div className="flex items-center gap-1.5 text-zinc-500">
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">{course.lessonCount || 0} Lessons</span>
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
