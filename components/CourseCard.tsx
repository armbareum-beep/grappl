import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Course } from '../types';
import { PlayCircle, Bookmark, Share2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toggleCourseSave, checkCourseSaved } from '../lib/api';
import Player from '@vimeo/player';
import { cn } from '../lib/utils';
import { ContentBadge } from './common/ContentBadge';
import { ActionMenuModal } from './library/ActionMenuModal';

const ShareModal = React.lazy(() => import('./social/ShareModal'));

interface CourseCardProps {
    course: Course;
    className?: string;
    isDailyFree?: boolean;
    rank?: number;
    hasAccess?: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course, className, isDailyFree, rank, hasAccess = false }) => {
    const [isHovering, setIsHovering] = useState(false);
    const [showVideo, setShowVideo] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef<Player | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const seekBarRef = useRef<HTMLDivElement>(null);

    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    useEffect(() => {
        if (user) {
            checkCourseSaved(user.id, course.id).then(setIsSaved).catch(console.error);
        }
    }, [user, course.id]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) { navigate('/login'); return; }

        const newStatus = !isSaved;
        setIsSaved(newStatus);

        try {
            await toggleCourseSave(user.id, course.id);
        } catch {
            setIsSaved(!newStatus);
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        setIsShareModalOpen(true);
    };

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : url;
    };

    const [vimeoId, setVimeoId] = useState<string | null>(getVimeoId(course.previewVideoUrl));

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isHovering && hasAccess) {
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
    }, [isHovering, vimeoId, course.id, hasAccess]);

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
            className={cn("group flex flex-col gap-3 h-full", className)}
            onMouseEnter={() => setIsHovering(true && hasAccess)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* Video/Thumbnail Area (16:9) */}
            <div className={cn(
                "relative aspect-video bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 transition-all duration-500",
                "hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:ring-1 hover:ring-violet-500/30"
            )}>
                <Link to={`/courses/${course.id}`} className="absolute inset-0 block overflow-hidden">
                    <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className={cn("absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700")}
                    />

                    {/* Badge — top-left, single: FREE > HOT > NEW */}
                    <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                        {(isDailyFree || (course as any).isDailyFree) ? (
                            <ContentBadge type="daily_free" />
                        ) : (rank || (course as any).rank) ? (
                            <ContentBadge type="popular" rank={rank || (course as any).rank} />
                        ) : (course.createdAt && new Date(course.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
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
                        onClick={handleSave}
                        aria-label="저장"
                    >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-violet-500")} />
                    </button>

                    {/* Share — bottom-right */}
                    <button
                        className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900"
                        onClick={handleShare}
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

            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={course.title}
                        text={`${course.creatorName || 'Grapplay'}님의 강좌를 확인해보세요!`}
                        imageUrl={course.thumbnailUrl}
                        url={`${window.location.origin}/courses/${course.id}`}
                    />
                )}
            </React.Suspense>

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
                    <div className="flex justify-between items-start gap-2">
                        <Link to={`/courses/${course.id}`} className="flex-1 min-w-0">
                            <h3 className="text-zinc-100 font-bold text-sm md:text-base leading-tight mb-0 truncate group-hover:text-violet-400 transition-colors">
                                {course.title}
                            </h3>
                        </Link>
                        <button
                            className="shrink-0 p-1 -mr-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsActionMenuOpen(true);
                            }}
                            aria-label="더보기"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-0">
                        <Link to={`/creator/${course.creatorId}`} className="text-xs md:text-sm text-zinc-400 font-medium hover:text-zinc-200 transition-colors truncate">
                            {course.creatorName}
                        </Link>

                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                            <PlayCircle className="w-3 h-3" />
                            <span>{(course.views || 0).toLocaleString()} 조회수</span>
                        </div>
                    </div>
                </div>
            </div>

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                item={{
                    id: course.id,
                    type: 'class',
                    title: course.title,
                    thumbnailUrl: course.thumbnailUrl,
                    creatorName: course.creatorName,
                    creatorProfileImage: course.creatorProfileImage,
                    creatorId: course.creatorId,
                    originalData: course,
                } as any}
                isSaved={isSaved}
                onSave={handleSave}
                onShare={handleShare}
            />

            <style>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};
