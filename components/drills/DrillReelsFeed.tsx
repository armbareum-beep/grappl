import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, MoreVertical, Grid, X, Play, Pause } from 'lucide-react';
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
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientY);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isSwipeUp = distance > 50;
        const isSwipeDown = distance < -50;

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
            // TODO: Add to Training Routines in Arena
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
            // Fallback: copy to clipboard
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
            className="relative h-screen w-screen bg-black overflow-hidden"
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
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-40 bg-gradient-to-b from-black/60 to-transparent">
                <div className="text-white font-bold text-lg">드릴</div>
                <button
                    onClick={onChangeView}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                    <Grid className="w-5 h-5 text-white" />
                </button>
            </div>

            {/* Video */}
            <div className="absolute inset-0 flex items-center justify-center">
                <video
                    ref={videoRef}
                    className="h-full w-full object-cover"
                    loop
                    playsInline
                    muted={false}
                    onClick={togglePlayPause}
                    src={currentDrill.videoUrl || '/placeholder-drill.mp4'}
                />

                {/* Play/Pause Overlay */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-10 h-10 text-black ml-1" />
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-30">
                <div className="flex items-end justify-between">
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
                                {currentDrill.tags.slice(0, 3).map((tag, idx) => (
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

            {/* Swipe Indicators */}
            {currentIndex > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="text-white/50 text-sm animate-bounce">
                        ↑ 이전 드릴
                    </div>
                </div>
            )}
            {currentIndex < drills.length - 1 && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none">
                    <div className="text-white/50 text-sm animate-bounce">
                        ↓ 다음 드릴
                    </div>
                </div>
            )}

            {/* Drill Counter */}
            <div className="absolute top-20 right-4 text-white/60 text-xs z-40">
                {currentIndex + 1} / {drills.length}
            </div>
        </div>
    );
};
