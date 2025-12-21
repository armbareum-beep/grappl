import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { Play, BookOpen } from 'lucide-react';
import Player from '@vimeo/player';

interface CourseCardProps {
    course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const cardRef = useRef<HTMLDivElement>(null);
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

    const difficultyLabel = course.difficulty === 'Beginner' ? '초급' :
        course.difficulty === 'Intermediate' ? '중급' : '상급';

    const difficultyColor = course.difficulty === 'Advanced' ? 'bg-red-500' :
        course.difficulty === 'Intermediate' ? 'bg-yellow-500' : 'bg-green-500';

    const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;

    return (
        <Link
            to={`/courses/${course.id}`}
            className="group block h-full relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-1"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Aspect Ratio Container */}
            <div
                ref={cardRef}
                className="aspect-video w-full relative bg-slate-900"
            >

                {/* Background Image */}
                <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-transform duration-700 ${isHovering ? 'scale-110' : 'scale-100'}`}
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

                {/* Gradient Overlay - only shows when NOT hovering */}
                <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${!isHovering ? 'opacity-100' : 'opacity-0'}`} />

                {/* Top Badges - always visible */}
                <div className="absolute top-4 left-4 flex gap-2 z-20">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full text-white shadow-sm ${difficultyColor}`}>
                        {difficultyLabel}
                    </span>
                    {course.lessonCount && (
                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {course.lessonCount}
                        </span>
                    )}
                </div>

                {/* Content - only visible when NOT hovering */}
                <div className={`absolute inset-0 p-5 flex flex-col justify-end z-20 transition-opacity duration-300 ${!isHovering ? 'opacity-100' : 'opacity-0'}`}>

                    {/* Category */}
                    <div className="text-xs font-bold text-blue-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        {course.category}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-white text-xl mb-3 leading-tight line-clamp-2">
                        {course.title}
                    </h3>

                    {/* Creator */}
                    <div className="text-xs text-slate-300 font-medium">
                        {course.creatorName}
                    </div>
                </div>

                {/* Seek Bar - only visible when hovering and video is playing */}
                {showVideo && isHovering && (
                    <div
                        ref={seekBarRef}
                        className="absolute bottom-0 left-0 right-0 h-12 z-30 flex items-center px-4 bg-gradient-to-t from-black/60 to-transparent cursor-pointer"
                        onMouseDown={handleSeekBarMouseDown}
                        onClick={handleSeekBarClick}
                    >
                        {/* Progress Bar Background */}
                        <div className="relative w-full h-1 bg-white/30 rounded-full overflow-visible">
                            {/* Progress Bar Fill */}
                            <div
                                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all"
                                style={{ width: `${progressPercentage}%` }}
                            />
                            {/* Draggable Handle */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg cursor-grab active:cursor-grabbing transform hover:scale-125 transition-transform"
                                style={{ left: `${progressPercentage}%`, marginLeft: '-8px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Play Button Overlay (Hidden when video plays) */}
                {!showVideo && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-blue-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                            <Play className="w-6 h-6 text-white fill-current ml-1" />
                        </div>
                    </div>
                )}
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
        </Link>
    );
};
