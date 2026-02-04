import React, { useEffect, useState, useRef } from 'react';
import { Lesson } from '../../types';
import { Share2, Volume2, VolumeX, Bookmark, Heart, ChevronLeft, BookOpen } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toggleLessonLike, toggleLessonSave, getLessonInteractionStatus, toggleCreatorFollow, updateLastWatched, extractVimeoId } from '../../lib/api';
import { ReelLoginModal } from '../auth/ReelLoginModal';
import { VideoPlayer } from '../VideoPlayer';
import { useOrientationFullscreen } from '../../hooks/useOrientationFullscreen';

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../social/ShareModal'));

interface LessonReelItemProps {
    lesson: Lesson;
    isActive: boolean;
    offset: number;
    isSubscriber?: boolean;
    purchasedItemIds?: string[];
    isLoggedIn?: boolean;
    isDailyFreeLesson?: boolean;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onVideoReady?: () => void;
}

export const LessonReelItem: React.FC<LessonReelItemProps> = ({
    lesson,
    isActive,
    offset,
    isSubscriber,
    purchasedItemIds = [],
    isLoggedIn,
    isDailyFreeLesson = false,
    isMuted = false,
    onToggleMute,
    onVideoReady
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowed, setIsFollowed] = useState(false);
    const [likeCount, setLikeCount] = useState((lesson as any).likes || 0);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isPausedRef = useRef(isPaused);

    // Fullscreen on landscape
    const containerRef = useRef<HTMLDivElement>(null);
    useOrientationFullscreen(containerRef, isActive);

    useEffect(() => {
        isPausedRef.current = isPaused;
    }, [isPaused]);

    const vimeoFullId = extractVimeoId(lesson.vimeoUrl || lesson.videoUrl || '');

    // Notify parent when this item is ready to display
    const [videoPlayerReady, setVideoPlayerReady] = useState(false);
    const onVideoReadyRef = useRef(onVideoReady);
    onVideoReadyRef.current = onVideoReady;
    useEffect(() => {
        if (videoPlayerReady) {
            onVideoReadyRef.current?.();
        }
    }, [videoPlayerReady]);

    useEffect(() => {
        if (user && isActive && lesson.creatorId) {
            getLessonInteractionStatus(user.id, lesson.id, lesson.creatorId)
                .then(status => {
                    setIsLiked(status.liked);
                    setIsSaved(status.saved);
                    setIsFollowed(status.followed);
                });
        }
    }, [user, lesson.id, isActive, lesson.creatorId]);

    // Watch time tracking for non-logged-in users AND logged-in users (history)
    const lastTickRef = useRef<number>(0);
    const accumulatedTimeRef = useRef<number>(0);

    // Initial View Record (mark as recent)
    // Initial View Record (mark as recent)
    useEffect(() => {
        if (isActive && user) {
            // Record initial view to mark as recent without resetting progress
            updateLastWatched(user.id, lesson.id).catch(console.error);
        }
    }, [isActive, user, lesson.id]);

    useEffect(() => {
        // Non-logged in users: 30s preview limit
        if (!user && isActive) {
            // Start timer
            setWatchTime(0);
            timerRef.current = setInterval(() => {
                if (!isPausedRef.current) {
                    setWatchTime((prev: number) => {
                        const newTime = prev + 1;
                        if (newTime >= 30) {
                            // 30 seconds reached, show login modal
                            setIsLoginModalOpen(true);
                            if (timerRef.current) {
                                clearInterval(timerRef.current);
                            }
                        }
                        return newTime;
                    });
                }
            }, 1000);
        }
        // Logged-in users: Record watch progress
        else if (user && isActive) {
            lastTickRef.current = Date.now();
            accumulatedTimeRef.current = 0;

            timerRef.current = setInterval(() => {
                const now = Date.now();
                const elapsed = (now - lastTickRef.current) / 1000;
                lastTickRef.current = now;

                if (elapsed > 0 && elapsed < 5 && !isPausedRef.current) {
                    accumulatedTimeRef.current += elapsed;
                }

                // Record every 5 seconds
                if (accumulatedTimeRef.current >= 5) {
                    const timeToSend = Math.floor(accumulatedTimeRef.current);
                    accumulatedTimeRef.current -= timeToSend;

                    updateLastWatched(user.id, lesson.id, timeToSend).catch(console.error);
                }
            }, 1000);
        }
        else {
            // Clear timer when not active
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            setWatchTime(0);
            accumulatedTimeRef.current = 0;
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isActive, user, lesson.id]);

    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }
        setIsLiked(!isLiked);
        setLikeCount((prev: number) => isLiked ? prev - 1 : prev + 1);
        await toggleLessonLike(user.id, lesson.id);
    };

    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!lesson.creatorId) return;
        setIsFollowed(!isFollowed);
        await toggleCreatorFollow(user.id, lesson.creatorId);
    };

    // Click Handling for Play/Pause and Like
    const handleVideoClick = () => {
        if (!hasAccess) return;
        if (clickTimeoutRef.current) {
            // Double click detected
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;

            // Trigger like
            handleLike();
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 800);
        } else {
            // Single click - wait to see if double click follows
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                // Toggle play/pause
                setIsPaused(!isPaused);
            }, 250);
        }
    };

    // Access Control
    const hasAccess = isDailyFreeLesson || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(lesson.id)));

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className="w-full h-full relative flex items-center justify-center">
                <div className="relative w-full max-w-[min(100vw,calc((100vh-200px)*16/9))] aspect-video z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    <VideoPlayer
                        vimeoId={vimeoFullId || lesson.videoUrl || ''}
                        title={lesson.title}
                        playing={isActive && !isPaused}
                        showControls={false}
                        fillContainer={true}
                        onProgress={(s) => setProgress(s)}
                        onReady={() => setVideoPlayerReady(true)}
                        onDoubleTap={handleLike}
                        muted={isMuted}
                    />
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={handleVideoClick} />

                    {/* Like Animation */}
                    {showLikeAnimation && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <Heart
                                className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                                style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                            />
                        </div>
                    )}
                </div>

                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-30" />

                <div className="absolute inset-0 pointer-events-none z-40 flex justify-center">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-[min(100vw,calc((100vh-200px)*16/9))] flex justify-between px-4 pointer-events-none">
                        <div className="pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleMute?.(); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full h-full max-w-[min(100vw,calc((100vh-200px)*16/9))] flex">
                        <div className="flex-1 relative">

                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-full h-full">
                                    <div className="absolute bottom-10 right-4 flex flex-col gap-5 z-[70] pointer-events-auto items-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                                <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                            </button>
                                            <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{likeCount.toLocaleString()}</span>
                                        </div>
                                        {lesson.courseId && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/courses/${lesson.courseId}`);
                                                }}
                                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                                title="클래스 보기"
                                            >
                                                <BookOpen className="w-5 h-5 md:w-6 md:h-6" />
                                            </button>
                                        )}
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!user) { navigate('/login'); return; }
                                                const { saved } = await toggleLessonSave(user.id, lesson.id);
                                                setIsSaved(saved);
                                            }}
                                            className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                        >
                                            <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-white' : ''}`} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="absolute bottom-10 left-0 right-0 w-full px-6 z-[60] text-white flex flex-col items-start gap-1 pointer-events-none">
                                <div className="w-full pointer-events-auto pr-20 bg-black/30 md:bg-transparent p-4 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                    <div className="inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 bg-violet-500/10 text-violet-400 border border-violet-500/20">LESSON</div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <Link to={`/creator/${lesson.creatorId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                            {lesson.creatorProfileImage && (
                                                <img src={lesson.creatorProfileImage} alt={lesson.creatorName} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                            )}
                                            <span className="text-white font-bold text-sm drop-shadow-sm">{lesson.creatorName}</span>
                                        </Link>
                                        <span className="text-white/60 text-xs mt-0.5">•</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                            {isFollowed ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                    <div className="mb-2">
                                        <h3 className="font-black text-lg md:text-xl lg:text-3xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">{lesson.title}</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar / Teaser Bar */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!user ? 'h-1.5 bg-violet-900/30' : 'h-[2px] bg-zinc-800/50'}`}>
                <div
                    className={`h-full transition-all ease-linear ${!user ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] duration-1000' : 'bg-violet-400 duration-100'}`}
                    style={{ width: `${!user ? (watchTime / 30) * 100 : progress}%` }}
                />
            </div>

            {/* Login Modal for non-logged-in users */}
            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl={`/watch?tab=lesson&id=${lesson.id}`}
            />

            {/* Share Modal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={lesson.title}
                        text={`${lesson.creatorName}님의 레슨을 확인해보세요`}
                        imageUrl={lesson.thumbnailUrl}
                        url={`${window.location.origin}/watch?tab=lesson&id=${lesson.id}`}
                    />
                )}
            </React.Suspense>
        </div>
    );
};
