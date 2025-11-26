import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, MoreVertical, Grid, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DrillReelsFeedProps {
    drills: Drill[];
    onChangeView: () => void;
}

export const DrillReelsFeed: React.FC<DrillReelsFeedProps> = ({ drills, onChangeView }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentDrill = drills[currentIndex];

    // Auto-play current video
    useEffect(() => {
        if (videoRef.current && isPlaying) {
            videoRef.current.play().catch(err => console.log('Play error:', err));
        } else if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [currentIndex, isPlaying]);

    // Update progress
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const updateProgress = () => {
            const progress = (video.currentTime / video.duration) * 100;
            setProgress(progress);
        };

        video.addEventListener('timeupdate', updateProgress);
        return () => video.removeEventListener('timeupdate', updateProgress);
    }, [currentIndex]);

    // Handle video end - loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleEnded = () => {
            video.currentTime = 0;
            video.play();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [currentIndex]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                goToNext();
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex]);

    // Mouse wheel navigation
    useEffect(() => {
        let wheelTimeout: NodeJS.Timeout;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();

            // Debounce wheel events to prevent too many triggers
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                if (e.deltaY > 0) {
                    // Scrolling down → next drill
                    goToNext();
                } else if (e.deltaY < 0) {
                    // Scrolling up → previous drill
                    goToPrevious();
                }
            }, 100);
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleWheel);
            clearTimeout(wheelTimeout);
        };
    }, [currentIndex]);

    const goToNext = () => {
        if (currentIndex < drills.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setProgress(0);
            setIsPlaying(true);
        }
    };

    const goToPrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
            setProgress(0);
            setIsPlaying(true);
        }
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart(e.targetTouches[0].clientY);
        setTouchEnd(e.targetTouches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const minSwipeDistance = 30;
        const isSwipeUp = distance > minSwipeDistance;
        const isSwipeDown = distance < -minSwipeDistance;

        console.log('Swipe:', { distance, isSwipeUp, isSwipeDown, currentIndex });

        if (isSwipeUp) {
            goToNext();
        } else if (isSwipeDown) {
            goToPrevious();
        }

        setTouchStart(0);
        setTouchEnd(0);
    };

    const handleLike = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        const newLiked = new Set(liked);
        if (newLiked.has(currentDrill.id)) {
            newLiked.delete(currentDrill.id);
        } else {
            newLiked.add(currentDrill.id);
        }
        setLiked(newLiked);
    };

    const handleSave = () => {
        if (!user) {
            navigate('/login');
            return;
        }

        const newSaved = new Set(saved);
        if (newSaved.has(currentDrill.id)) {
            newSaved.delete(currentDrill.id);
        } else {
            newSaved.add(currentDrill.id);
            alert('드릴이 아레나 > 수련일지에 저장되었습니다!');
        }
        setSaved(newSaved);
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: currentDrill.title,
                    text: `Check out this drill: ${currentDrill.title}`,
                    url: window.location.href
                });
            } catch (err) {
                console.log('Share error:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert('링크가 복사되었습니다!');
        }
    };

    if (!currentDrill) {
        return (
            <div className="h-screen bg-black flex items-center justify-center">
                <p className="text-white">드릴이 없습니다</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="relative h-screen w-screen bg-black overflow-hidden select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div
                    className="h-full bg-white transition-all duration-100"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="w-full p-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="text-white font-bold text-xl pointer-events-auto">드릴</div>
                        <button
                            onClick={onChangeView}
                            className="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all group"
                        >
                            <Grid className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-medium">그리드 뷰</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Video Container - 9:16 aspect ratio */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="relative w-full h-full max-w-[56.25vh]">
                    <video
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        loop
                        playsInline
                        muted={false}
                        onClick={togglePlayPause}
                        src={currentDrill.videoUrl || '/placeholder-drill.mp4'}
                    />

                    {/* Play/Pause Overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-10 h-10 text-black ml-1" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                    {/* Left: Info */}
                    <div className="flex-1 pr-4">
                        <h2 className="text-white font-bold text-xl mb-2 line-clamp-2">
                            {currentDrill.title}
                        </h2>
                        <p className="text-white/80 text-sm mb-3">
                            @{currentDrill.creatorName || 'Instructor'}
                        </p>

                        {/* Tags */}
                        {currentDrill.tags && currentDrill.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {currentDrill.tags.slice(0, 3).map((tag: string, idx: number) => (
                                    <span key={idx} className="text-white/90 text-sm">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Drill Info */}
                        <div className="flex items-center gap-4 text-white/70 text-xs">
                            <span>{currentDrill.length || '0:30'}</span>
                            <span>•</span>
                            <span>{currentDrill.views || 0} views</span>
                        </div>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-6">
                        {/* Like */}
                        <button
                            onClick={handleLike}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Heart
                                    className={`w-6 h-6 ${liked.has(currentDrill.id) ? 'fill-red-500 text-red-500' : 'text-white'}`}
                                />
                            </div>
                            <span className="text-white text-xs">
                                {(currentDrill.likes || 0) + (liked.has(currentDrill.id) ? 1 : 0)}
                            </span>
                        </button>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Bookmark
                                    className={`w-6 h-6 ${saved.has(currentDrill.id) ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`}
                                />
                            </div>
                            <span className="text-white text-xs">저장</span>
                        </button>

                        {/* Share */}
                        <button
                            onClick={handleShare}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Share2 className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white text-xs">공유</span>
                        </button>

                        {/* More */}
                        <button
                            onClick={() => navigate(`/drills/${currentDrill.id}`)}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <MoreVertical className="w-6 h-6 text-white" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Drill Counter */}
            <div className="absolute top-20 right-4 text-white/60 text-xs z-40">
                {currentIndex + 1} / {drills.length}
            </div>

            {/* Debug Info */}
            <div className="absolute top-24 left-4 text-white/60 text-xs z-40 bg-black/50 p-2 rounded">
                Swipe, Wheel, or Arrow keys to navigate
            </div>
        </div>
    );
};
