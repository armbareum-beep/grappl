import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { Play } from 'lucide-react';
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
            className={cn("group block h-full", className)}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Aspect Ratio Container */}
            <Link
                to={`/courses/${course.id}`}
                ref={cardRef}
                className="aspect-video w-full relative bg-muted rounded-xl overflow-hidden mb-3 block border border-border"
            >
                {/* Background Image */}
                <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isHovering ? 'scale-105' : 'scale-100'}`}
                />

                {/* Video Preview Overlay */}
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

                {/* Gradient Overlay - subtle */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 transition-opacity duration-300`} />

                {/* Seek Bar - only visible when hovering and video is playing */}
                {showVideo && isHovering && (
                    <div
                        ref={seekBarRef}
                        className="absolute bottom-0 left-0 right-0 h-10 z-30 flex items-center px-4 bg-gradient-to-t from-black/80 to-transparent cursor-pointer"
                        onMouseDown={handleSeekBarMouseDown}
                        onClick={handleSeekBarClick}
                    >
                        {/* Progress Bar Background */}
                        <div className="relative w-full h-1 bg-white/30 rounded-full overflow-visible">
                            {/* Progress Bar Fill */}
                            <div
                                className="absolute top-0 left-0 h-full bg-primary rounded-full transition-all"
                                style={{ width: `${progressPercentage}%` }}
                            />
                            {/* Draggable Handle */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing transform hover:scale-125 transition-transform"
                                style={{ left: `${progressPercentage}%`, marginLeft: '-6px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Play Button Overlay (Hidden when video plays) */}
                {!showVideo && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-6 h-6 text-primary-foreground fill-current ml-1" />
                        </div>
                    </div>
                )}
            </Link>

            {/* YouTube-style Info Section */}
            <div className="flex gap-3">
                {/* Creator Profile Image */}
                <Link to={`/creator/${course.creatorId}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                    <div className="w-9 h-9 rounded-full bg-muted border border-border overflow-hidden">
                        {course.creatorProfileImage ? (
                            <img
                                src={course.creatorProfileImage}
                                alt={course.creatorName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-bold bg-muted">
                                {course.creatorName?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </Link>

                {/* Title and Creator Info */}
                <div className="flex-1 min-w-0">
                    <Link to={`/courses/${course.id}`}>
                        <h3 className="font-semibold text-foreground text-sm leading-tight line-clamp-2 mb-1 hover:text-primary transition-colors">
                            {course.title}
                        </h3>
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Link to={`/creator/${course.creatorId}`} className="hover:text-foreground transition-colors">
                            <span className="truncate">{course.creatorName}</span>
                        </Link>
                        {course.lessonCount && (
                            <>
                                <span>•</span>
                                <span className="flex-shrink-0">{course.lessonCount}개 영상</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
            `}</style>
        </div>
    );
};
