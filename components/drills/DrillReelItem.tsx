import React, { useRef, useState, useEffect } from 'react';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, MoreVertical, Play, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DrillReelItemProps {
    drill: Drill;
    isActive: boolean;
    isMuted: boolean;
    onToggleMute: () => void;
    isLiked: boolean;
    onLike: () => void;
    likeCount: number;
    isSaved: boolean;
    onSave: () => void;
    onShare: () => void;
    onViewRoutine: () => void;
    offset: number; // -1, 0, 1 for sliding effect
}

export const DrillReelItem: React.FC<DrillReelItemProps> = ({
    drill,
    isActive,
    isMuted,
    onToggleMute,
    isLiked,
    onLike,
    likeCount,
    isSaved,
    onSave,
    onShare,
    onViewRoutine,
    offset
}) => {
    const navigate = useNavigate();

    // Internal state
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');

    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Reset state when drill changes or becomes active/inactive
    useEffect(() => {
        if (!isActive) {
            setIsPlaying(false);
            // Reset to main view when scrolling away
            // setTimeout to avoid flickering during transition
            const timer = setTimeout(() => setCurrentVideoType('main'), 500);
            return () => clearTimeout(timer);
        } else {
            setIsPlaying(true);
        }
    }, [isActive]);

    // Handle Playback
    useEffect(() => {
        const handlePlayback = async () => {
            if (useVimeo) {
                const iframe = iframeRef.current;
                if (iframe?.contentWindow) {
                    const method = isPlaying ? 'play' : 'pause';
                    iframe.contentWindow.postMessage(`{"method":"${method}"}`, '*');

                    // Sync volume
                    const volume = isMuted ? 0 : 1;
                    iframe.contentWindow.postMessage(`{"method":"setVolume", "value": ${volume}}`, '*');
                }
            } else {
                const video = videoRef.current;
                if (video) {
                    video.muted = isMuted; // Always sync mute state

                    if (isPlaying) {
                        try {
                            await video.play();
                        } catch (err) {
                            console.log('Play failed:', err);
                            setIsPlaying(false);
                        }
                    } else {
                        video.pause();
                    }
                }
            }
        };

        handlePlayback();
    }, [isPlaying, isMuted, currentVideoType, isActive]);

    // Helpers
    const extractVimeoId = (url?: string) => {
        if (!url) return undefined;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : undefined;
    };

    const isActionVideo = currentVideoType === 'main';
    const rawVimeoUrl = isActionVideo
        ? drill.vimeoUrl
        : (drill.descriptionVideoUrl || drill.vimeoUrl);

    const vimeoId = extractVimeoId(rawVimeoUrl);
    const useVimeo = !!vimeoId;

    const videoSrc = isActionVideo
        ? (drill.videoUrl || '/placeholder-drill.mp4')
        : (drill.descriptionVideoUrl || drill.videoUrl || '/placeholder-drill-desc.mp4');

    // Touch handling for swipe
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const xDistance = touchStart.x - touchEnd.x;
        const yDistance = touchStart.y - touchEnd.y;

        // Horizontal swipe only (Vertical is handled by parent feed)
        if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > 50) {
            if (xDistance > 0) {
                // Swipe Left -> Show Description
                if (currentVideoType === 'main') setCurrentVideoType('description');
            } else {
                // Swipe Right -> Show Main
                if (currentVideoType === 'description') setCurrentVideoType('main');
            }
        }
        setTouchStart(null);
    };

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleShare = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsShareModalOpen(true);
    };

    // Detect Processing State
    const isProcessing = !useVimeo && (!drill.videoUrl || drill.videoUrl.includes('placeholder') || drill.videoUrl.includes('placehold.co'));

    if (isProcessing) {
        return (
            <div
                className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950 transition-transform duration-300 ease-out"
                style={{ transform: `translateY(${offset * 100}%)` }}
            >
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white mb-2">영상 처리 중입니다...</h2>
                <p className="text-slate-400 text-center max-w-xs mb-8">
                    서버에서 고화질로 변환하고 있습니다.<br />
                    잠시만 기다려주세요.
                </p>
            </div>
        );
    }

    return (
        <>
            <div
                className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
                style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Video Container */}
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="relative w-full h-full max-w-[56.25vh]">
                        {useVimeo ? (
                            <iframe
                                ref={iframeRef}
                                src={`https://player.vimeo.com/video/${vimeoId}?background=0&autoplay=0&loop=1&autopause=0&muted=1&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1&color=ffffff`}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                style={{ opacity: isActive ? 1 : 0 }} // Hide inactive iframes to save resources but keep loaded
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                                loop
                                playsInline
                                muted={isMuted}
                                src={videoSrc}
                                poster={drill.thumbnailUrl}
                                preload="auto"
                                onPlaying={() => setVideoReady(true)}
                                onWaiting={() => setVideoReady(false)}
                            />
                        )}

                        {/* Click Overlay for Play/Pause */}
                        <div
                            className="absolute inset-0 z-30"
                            onClick={() => setIsPlaying(!isPlaying)}
                        />

                        {/* Thumbnail Overlay (while loading) */}
                        {!videoReady && !useVimeo && (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                                <img
                                    src={drill.thumbnailUrl}
                                    className="w-full h-full object-cover"
                                    alt=""
                                />
                                {isActive && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                                        <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Play/Pause Icon Overlay */}
                        {!isPlaying && isActive && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
                                <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                    <Play className="w-10 h-10 text-black ml-1" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Video Type Toggles (Top Left) - Only show if active */}
                {isActive && (
                    <div className="absolute top-6 left-6 z-40 flex pointer-events-none">
                        <div className="flex items-center gap-2 bg-black/30 backdrop-blur-sm p-1 rounded-full pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentVideoType('main'); }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${currentVideoType === 'main' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                            >
                                동작
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setCurrentVideoType('description'); }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${currentVideoType === 'description' ? 'bg-white text-black' : 'text-white hover:bg-white/10'}`}
                            >
                                설명
                            </button>
                        </div>
                    </div>
                )}

                {/* Content & Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-40 pointer-events-none">
                    <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                        {/* Info */}
                        <div className="flex-1 pr-4">
                            <h2 className="text-white font-bold text-xl mb-2 line-clamp-2">
                                {drill.title}
                                {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
                            </h2>
                            <p className="text-white/80 text-sm mb-3">
                                @{drill.creatorName || 'Instructor'}
                            </p>

                            {/* Tags */}
                            {drill.tags && drill.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {drill.tags.slice(0, 3).map((tag: string, idx: number) => (
                                        <span key={idx} className="text-white/90 text-sm">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Side Actions */}
                        <div className="flex flex-col gap-6 items-center pb-4">
                            {/* Like */}
                            <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex flex-col items-center gap-1 group">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                </div>
                                <span className="text-white text-xs">{likeCount}</span>
                            </button>

                            {/* Save */}
                            <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="flex flex-col items-center gap-1 group">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                                </div>
                                <span className="text-white text-xs">저장</span>
                            </button>

                            {/* Share */}
                            <button onClick={handleShare} className="flex flex-col items-center gap-1 group">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <Share2 className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-white text-xs">공유</span>
                            </button>

                            {/* Mute */}
                            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="flex flex-col items-center gap-1 group">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
                                </div>
                                <span className="text-white text-xs">{isMuted ? '음소거' : '소리'}</span>
                            </button>

                            {/* View Routine */}
                            <button onClick={(e) => { e.stopPropagation(); onViewRoutine(); }} className="flex flex-col items-center gap-1 group">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                                    <MoreVertical className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-white text-xs">루틴</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Modal Portal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={drill.title}
                        text={`Check out this BJJ drill: ${drill.title}`}
                    />
                )}
            </React.Suspense>
        </>
    );
};
// Lazy load
const ShareModal = React.lazy(() => import('../social/ShareModal'));
