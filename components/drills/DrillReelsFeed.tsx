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

    // Touch handling
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

    // Video type state: 'main' (action) or 'description' (explanation)
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentDrill = drills[currentIndex];

    // Reset video type when drill changes
    useEffect(() => {
        setCurrentVideoType('main');
    }, [currentIndex]);

    // Auto-play current video
    useEffect(() => {
        if (videoRef.current && isPlaying) {
            videoRef.current.play().catch(err => console.log('Play error:', err));
        } else if (videoRef.current) {
            videoRef.current.pause();
        }
    }, [currentIndex, isPlaying, currentVideoType]);

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
    }, [currentIndex, currentVideoType]);

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
    }, [currentIndex, currentVideoType]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                goToPrevious();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                goToNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (currentVideoType === 'description') setCurrentVideoType('main');
            } else if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (currentVideoType === 'main') setCurrentVideoType('description');
            } else if (e.key === ' ') {
                e.preventDefault();
                togglePlayPause();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, currentVideoType]);

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
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const xDistance = touchStart.x - touchEnd.x;
        const yDistance = touchStart.y - touchEnd.y;
        const minSwipeDistance = 50;

        // Determine if horizontal or vertical swipe was dominant
        if (Math.abs(xDistance) > Math.abs(yDistance)) {
            // Horizontal swipe
            if (Math.abs(xDistance) > minSwipeDistance) {
                if (xDistance > 0) {
                    // Swipe Left -> Show Description
                    if (currentVideoType === 'main') setCurrentVideoType('description');
                } else {
                    // Swipe Right -> Show Main
                    if (currentVideoType === 'description') setCurrentVideoType('main');
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(yDistance) > minSwipeDistance) {
                if (yDistance > 0) {
                    // Swipe Up -> Next Drill
                    goToNext();
                } else {
                    // Swipe Down -> Previous Drill
                    goToPrevious();
                }
            }
        }

        setTouchStart(null);
        setTouchEnd(null);
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
        let savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');

        if (newSaved.has(currentDrill.id)) {
            newSaved.delete(currentDrill.id);
            savedDrills = savedDrills.filter((d: Drill) => d.id !== currentDrill.id);
            alert('저장된 드릴에서 제거되었습니다.');
        } else {
            newSaved.add(currentDrill.id);

            // Create a clean drill object to avoid saving nested routine data
            const drillToSave: Drill = {
                id: currentDrill.id,
                title: currentDrill.title,
                description: currentDrill.description,
                creatorId: currentDrill.creatorId,
                creatorName: currentDrill.creatorName,
                category: currentDrill.category,
                difficulty: currentDrill.difficulty,
                thumbnailUrl: currentDrill.thumbnailUrl,
                videoUrl: currentDrill.videoUrl,
                aspectRatio: currentDrill.aspectRatio,
                duration: currentDrill.duration,
                length: currentDrill.length,
                tags: currentDrill.tags,
                price: currentDrill.price,
                views: currentDrill.views,
                createdAt: currentDrill.createdAt
            };

            // Save clean drill object to localStorage for display
            if (!savedDrills.find((d: Drill) => d.id === drillToSave.id)) {
                savedDrills.push(drillToSave);
            }

            alert('드릴이 개별 드릴로 저장되었습니다!\n아레나 > 훈련 루틴에서 나만의 맞춤형 루틴을 만들 수 있습니다.');
            navigate('/arena?tab=routines');
        }

        localStorage.setItem('saved_drills', JSON.stringify(savedDrills));
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

    // Determine video source based on type
    // Fallback to main video if description video is missing, or placeholder
    const videoSrc = currentVideoType === 'main'
        ? (currentDrill.videoUrl || '/placeholder-drill.mp4')
        : (currentDrill.descriptionVideoUrl || currentDrill.videoUrl || '/placeholder-drill-desc.mp4');

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
                        <div className="flex items-center gap-3 pointer-events-auto">
                            <span className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${currentVideoType === 'main' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                                동작
                            </span>
                            <span className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${currentVideoType === 'description' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}>
                                설명
                            </span>
                        </div>
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
                        key={`${currentDrill.id}-${currentVideoType}`} // Force re-render on change
                        ref={videoRef}
                        className="absolute inset-0 w-full h-full object-cover"
                        loop
                        playsInline
                        muted={false}
                        autoPlay={isPlaying}
                        onClick={togglePlayPause}
                        src={videoSrc}
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
                            {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
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
                            onClick={async () => {
                                // Find the routine that contains this drill
                                const { getRoutineByDrillId } = await import('../../lib/api');
                                const { data: routine } = await getRoutineByDrillId(currentDrill.id);

                                if (routine) {
                                    navigate(`/routines/${routine.id}`);
                                } else {
                                    alert('이 드릴은 아직 루틴에 포함되지 않았습니다.');
                                }
                            }}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <MoreVertical className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white text-xs">루틴보기</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Drill Counter */}
            <div className="absolute top-20 right-4 text-white/60 text-xs z-40">
                {currentIndex + 1} / {drills.length}
            </div>

            {/* Swipe Hint Animation - Only show once or occasionally */}
            {currentIndex === 0 && currentVideoType === 'main' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 animate-pulse-once delay-1000">
                    <div className="bg-black/50 px-4 py-2 rounded-full text-white text-sm">
                        ← Swipe for details
                    </div>
                </div>
            )}
        </div>
    );
};
