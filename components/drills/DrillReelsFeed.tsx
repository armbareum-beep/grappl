import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, MoreVertical, Grid, Play, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toggleDrillLike, checkDrillLiked, toggleDrillSave, checkDrillSaved, getUserLikedDrills, getUserSavedDrills } from '../../lib/api';

interface DrillReelsFeedProps {
    drills: Drill[];
    onChangeView: () => void;
    initialIndex?: number;
}

export const DrillReelsFeed: React.FC<DrillReelsFeedProps> = ({ drills, onChangeView, initialIndex = 0 }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(true);
    const [liked, setLiked] = useState<Set<string>>(new Set());
    const [saved, setSaved] = useState<Set<string>>(new Set());
    const [progress, setProgress] = useState(0);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
    const [hasInteracted, setHasInteracted] = useState(false);

    // Touch handling
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

    // Video type state: 'main' (action) or 'description' (explanation)
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');

    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const currentDrill = drills[currentIndex];

    // --- Video Logic ---
    // Helper to extract Vimeo ID
    const extractVimeoId = (url?: string) => {
        if (!url) return undefined;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : undefined;
    };

    const isActionVideo = currentVideoType === 'main';
    const rawVimeoUrl = isActionVideo
        ? currentDrill?.vimeoUrl
        : (currentDrill?.descriptionVideoUrl || currentDrill?.vimeoUrl);

    const vimeoId = extractVimeoId(rawVimeoUrl);
    const useVimeo = !!vimeoId;

    const videoSrc = isActionVideo
        ? (currentDrill?.videoUrl || '/placeholder-drill.mp4')
        : (currentDrill?.descriptionVideoUrl || currentDrill?.videoUrl || '/placeholder-drill-desc.mp4');

    // Reset video type when drill changes
    useEffect(() => {
        setCurrentVideoType('main');
        setIsVideoReady(false); // Reset ready state when changing drills
    }, [currentIndex]);

    // Unified Play/Pause logic
    const applyPlaybackState = (playing: boolean) => {
        if (useVimeo) {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
                const message = playing ? '{"method":"play"}' : '{"method":"pause"}';
                iframe.contentWindow.postMessage(message, '*');

                // Also ensures volume is synced
                const volumeMessage = `{"method":"setVolume", "value": ${isMuted ? 0 : 1}}`;
                iframe.contentWindow.postMessage(volumeMessage, '*');
            }
        } else {
            const video = videoRef.current;
            if (video) {
                if (playing) {
                    video.play().catch(err => console.log('Play error:', err));
                } else {
                    video.pause();
                }
            }
        }
    };

    // Auto-play current video and sync state changes
    useEffect(() => {
        applyPlaybackState(isPlaying);
    }, [currentIndex, isPlaying, currentVideoType, useVimeo, isMuted]);

    // Sync volume/muted state for HTML5 video
    useEffect(() => {
        if (videoRef.current && !useVimeo) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted, useVimeo]);

    // Update progress
    useEffect(() => {
        const video = videoRef.current;
        if (!video || useVimeo) return;

        const updateProgress = () => {
            const progress = (video.currentTime / video.duration) * 100;
            setProgress(progress);
        };

        video.addEventListener('timeupdate', updateProgress);
        return () => video.removeEventListener('timeupdate', updateProgress);
    }, [currentIndex, currentVideoType, useVimeo]);

    // Handle video end - loop
    useEffect(() => {
        const video = videoRef.current;
        if (!video || useVimeo) return;

        const handleEnded = () => {
            video.currentTime = 0;
            video.play();
        };

        video.addEventListener('ended', handleEnded);
        return () => video.removeEventListener('ended', handleEnded);
    }, [currentIndex, currentVideoType, useVimeo]);

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

    // Fetch initial liked/saved state
    useEffect(() => {
        const fetchUserInteractions = async () => {
            if (!user) return;

            try {
                const [likedDrills, savedDrills] = await Promise.all([
                    getUserLikedDrills(user.id),
                    getUserSavedDrills(user.id)
                ]);

                setLiked(new Set(likedDrills.map(d => d.id)));
                setSaved(new Set(savedDrills.map(d => d.id)));
            } catch (error) {
                console.error('Error fetching user interactions:', error);
            }
        };

        fetchUserInteractions();
    }, [user]);
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
        const nextPlaying = !isPlaying;
        // On first interaction, unmute the video
        if (!hasInteracted) {
            setHasInteracted(true);
            setIsMuted(false);
        }
        setIsPlaying(nextPlaying);
        applyPlaybackState(nextPlaying); // Immediate apply
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

    const handleLike = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        const isLiked = liked.has(currentDrill.id);
        const newLiked = new Set(liked);
        if (isLiked) {
            newLiked.delete(currentDrill.id);
        } else {
            newLiked.add(currentDrill.id);
        }
        setLiked(newLiked); // Optimistic update

        const { error } = await toggleDrillLike(user.id, currentDrill.id);
        if (!hasInteracted) setHasInteracted(true);
        if (error) {
            console.error('Error toggling like:', error);
            // Revert
            setLiked(liked);
        }
    };

    const handleSave = async () => {
        if (!user) {
            navigate('/login');
            return;
        }

        const isSaved = saved.has(currentDrill.id);
        const newSaved = new Set(saved);

        if (isSaved) {
            newSaved.delete(currentDrill.id);
        } else {
            newSaved.add(currentDrill.id);
        }
        setSaved(newSaved); // Optimistic update

        const { saved: savedState, error } = await toggleDrillSave(user.id, currentDrill.id);
        if (!hasInteracted) setHasInteracted(true);
        if (error) {
            console.error('Error toggling save:', error);
            setSaved(saved); // Revert
            alert('저장에 실패했습니다.');
        } else {
            // Sync with localStorage for backward compatibility
            let savedDrills = JSON.parse(localStorage.getItem('saved_drills') || '[]');

            if (savedState) {
                // Create a clean drill object
                const drillToSave: Drill = {
                    ...currentDrill
                };

                if (!savedDrills.find((d: Drill) => d.id === drillToSave.id)) {
                    savedDrills.push(drillToSave);
                }
                alert('드릴이 저장되었습니다!');
            } else {
                savedDrills = savedDrills.filter((d: Drill) => d.id !== currentDrill.id);
                alert('저장된 드릴에서 제거되었습니다.');
            }
            localStorage.setItem('saved_drills', JSON.stringify(savedDrills));

            if (savedState) {
                // Only navigate if saving (adding), not removing
                // Actually, maybe don't navigate away? The user might want to keep watching.
                // The original code navigated to arena. Let's ask user preference or keep it?
                // Original code: navigate('/arena?tab=routines');
                // I'll keep it for now but maybe it's annoying?
                // "드릴이 개별 드릴로 저장되었습니다!\n아레나 > 훈련 루틴에서 나만의 맞춤형 루틴을 만들 수 있습니다."
                if (confirm('드릴이 저장되었습니다! 보관함으로 이동하시겠습니까?')) {
                    navigate('/arena?tab=routines');
                }
            }
        }
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
            <div className="h-screen bg-black flex flex-col items-center justify-center p-4 text-center">
                <p className="text-white text-xl font-bold mb-2">드릴이 없습니다</p>
                {!user && (
                    <p className="text-slate-400 mb-4">
                        로그인하면 더 많은 드릴을 볼 수 있습니다.
                    </p>
                )}
                {!user && (
                    <button
                        onClick={() => navigate('/login')}
                        className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    >
                        로그인하기
                    </button>
                )}
            </div>
        );
    }

    // Detect Processing State
    const isProcessing = !useVimeo && (!currentDrill.videoUrl || currentDrill.videoUrl.includes('placeholder') || currentDrill.videoUrl.includes('placehold.co'));

    if (isProcessing) {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white mb-2">영상 처리 중입니다...</h2>
                <p className="text-slate-400 text-center max-w-xs mb-8">
                    서버에서 고화질로 변환하고 있습니다.<br />
                    잠시만 기다려주세요. (약 1~2분 소요)
                </p>
                <div className="flex gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition"
                    >
                        홈으로 돌아가기
                    </button>
                </div>
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

            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="w-full p-6">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <div className="flex items-center gap-3 pointer-events-auto">
                            <button
                                onClick={() => setCurrentVideoType('main')}
                                className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${currentVideoType === 'main' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
                            >
                                동작
                            </button>
                            <button
                                onClick={() => setCurrentVideoType('description')}
                                className={`text-sm font-bold px-3 py-1 rounded-full transition-colors ${currentVideoType === 'description' ? 'bg-white text-black' : 'bg-white/20 text-white'}`}
                            >
                                설명
                            </button>
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
                    {useVimeo ? (
                        <iframe
                            key={`${currentDrill.id}-${currentVideoType}`}
                            ref={iframeRef}
                            src={`https://player.vimeo.com/video/${vimeoId}?background=0&autoplay=1&loop=1&autopause=0&muted=${isMuted ? 1 : 0}&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1&color=ffffff`}
                            className="absolute inset-0 w-full h-full"
                            frameBorder="0"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                        />
                    ) : (
                        <video
                            key={`${currentDrill.id}-${currentVideoType}`}
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                            loop
                            playsInline
                            muted={isMuted}
                            src={videoSrc}
                            poster={currentDrill.thumbnailUrl}
                            preload="auto"
                            onPlaying={() => setIsVideoReady(true)}
                            onWaiting={() => setIsVideoReady(false)}
                            onLoadStart={() => setIsVideoReady(false)}
                        />
                    )}

                    {/* Video Click Overlay - Must be AFTER video/iframe to appear on top */}
                    <div
                        className="absolute inset-0 z-30"
                        onClick={() => togglePlayPause()}
                    />

                    {/* Thumbnail Overlay */}
                    {!isVideoReady && !useVimeo && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                            <img
                                src={currentDrill.thumbnailUrl}
                                className="w-full h-full object-cover"
                                alt=""
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                            </div>
                        </div>
                    )}

                    {/* Hidden Preloader for Next Drill */}
                    {currentIndex < drills.length - 1 && (
                        <div className="hidden" aria-hidden="true">
                            <video
                                src={drills[currentIndex + 1].videoUrl}
                                preload="auto"
                                muted
                            />
                            {drills[currentIndex + 1].descriptionVideoUrl && (
                                <video
                                    src={drills[currentIndex + 1].descriptionVideoUrl}
                                    preload="auto"
                                    muted
                                />
                            )}
                        </div>
                    )}

                    {/* Play/Pause Icon Overlay */}
                    {!isPlaying && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-10 h-10 text-black ml-1" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Info & Action Buttons */}
            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-40 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                    {/* Info */}
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

                    {/* Actions */}
                    <div className="flex flex-col gap-6">
                        {/* Like */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
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
                            onClick={(e) => { e.stopPropagation(); handleSave(); }}
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
                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                <Share2 className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-white text-xs">공유</span>
                        </button>

                        {/* Mute/Unmute */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMuted(!isMuted);
                                if (!hasInteracted) setHasInteracted(true);
                            }}
                            className="flex flex-col items-center gap-1 group"
                        >
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                {isMuted ? (
                                    <VolumeX className="w-6 h-6 text-white" />
                                ) : (
                                    <Volume2 className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <span className="text-white text-xs">{isMuted ? '음소거' : '소리'}</span>
                        </button>

                        {/* More */}
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
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
