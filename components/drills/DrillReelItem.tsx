import React, { useRef, useState, useEffect } from 'react';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, Play, Zap, MessageCircle, ListVideo, Volume2, VolumeX, Grid, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

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
    isFollowed: boolean;
    onFollow: () => void;
    onShare: () => void;
    onViewRoutine: () => void;
    onChangeView: () => void;
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
    isFollowed,
    onFollow,
    onShare,
    onViewRoutine,
    onChangeView,
    offset
}) => {

    // Internal state
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');
    const [progress, setProgress] = useState(0);

    const navigate = useNavigate();
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
        <div
                className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
                style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Video Container */}
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="relative w-full h-full max-w-[56.25vh]">
                        {/* Video */}
                        <div className="relative w-full h-full">
                            {useVimeo ? (
                                <iframe
                                    ref={iframeRef}
                                    src={`https://player.vimeo.com/video/${vimeoId}?background=0&autoplay=1&loop=1&autopause=0&muted=1&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1&color=ffffff`}
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
                                    onTimeUpdate={(e) => {
                                        const video = e.currentTarget;
                                        const percent = (video.currentTime / video.duration) * 100;
                                        setProgress(percent);
                                    }}
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
                                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-black ml-1" />
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>



                {/* Right Side Actions - Unified Container for both Mobile & Desktop */}
                {/* Mobile: Inside video (absolute right), Desktop: Outside video (relative to video container) */}
                {isActive && (
                    <div className="absolute inset-0 z-40 pointer-events-none flex justify-center">
                        <div className="relative h-full w-full max-w-[56.25vh] flex">
                            {/* Back button Group - Sticks to left edge of video on web */}
                            <div className="absolute left-0 md:relative md:left-auto top-0 bottom-0 flex flex-col items-center py-6 pl-4 md:pl-0 pointer-events-auto
                                            md:-translate-x-full md:mr-4">
                                <button
                                    onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                                    className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95 mb-4"
                                >
                                    <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                                </button>

                                {/* View Toggles (Moved here) */}
                                <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentVideoType('main'); }}
                                        className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'main' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                        title="Main Video"
                                    >
                                        <Zap className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'main' ? "currentColor" : "none"} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setCurrentVideoType('description'); }}
                                        className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                                        title="Description Video"
                                    >
                                        <MessageCircle className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'description' ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>

                            {/* Spacer for video width */}
                            <div className="flex-1"></div>

                            {/* Actions Container - Sticks to right edge of video on mobile, outside on desktop */}
                            <div className="absolute right-0 md:relative md:right-auto top-0 bottom-0 flex flex-col justify-between py-6 pointer-events-auto
                                            md:translate-x-full md:ml-4">
                                {/* Top Actions: Mute & Grid View */}
                                <div className="flex flex-col gap-3 items-center pr-4 md:pr-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
                                        className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-xl"
                                    >
                                        {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onChangeView(); }}
                                        className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl"
                                    >
                                        <Grid className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>
                                </div>

                                {/* Bottom Actions: Like, Routine, Save, Share */}
                                <div className="flex flex-col gap-3 items-center pr-4 md:pr-0 pb-24 md:pb-0">
                                    {/* Like */}
                                    <div className="flex flex-col items-center gap-0.5">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onLike(); }}
                                            className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                        >
                                            <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                        </button>
                                        <span className="text-[10px] md:text-sm font-bold text-white drop-shadow-md">{likeCount.toLocaleString()}</span>
                                    </div>

                                    {/* Routine View */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onViewRoutine(); }}
                                        className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                    >
                                        <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>

                                    {/* Save */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onSave(); }}
                                        className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                    >
                                        <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-zinc-100' : ''}`} />
                                    </button>

                                    {/* Share */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onShare(); }}
                                        className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                                    >
                                        <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content & Info - Bottom (Attached to Video) */}
                <div className="absolute left-0 right-0 w-full bottom-24 px-6 z-40 pointer-events-none">
                    <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                        {/* Info - Always inside video */}
                        <div className="flex-1 pr-16">
                            <div className="inline-block px-2 py-0.5 bg-yellow-600 rounded text-[10px] font-bold uppercase tracking-wider mb-2">DRILL</div>
                            <div className="flex items-center gap-3 mb-3">
                                <Link
                                    to={`/creator/${drill.creatorId}`}
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                >
                                    {(drill as any).creatorProfileImage && (
                                        <img
                                            src={(drill as any).creatorProfileImage}
                                            alt=""
                                            className="w-8 h-8 rounded-full border border-white/20 object-cover"
                                        />
                                    )}
                                    <span className="text-white font-bold text-sm drop-shadow-sm">
                                        {drill.creatorName || 'Instructor'}
                                    </span>
                                </Link>
                                <span className="text-white/60 text-xs leading-none mt-0.5">•</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onFollow(); }}
                                    className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed
                                        ? 'bg-violet-600 text-white border-violet-600'
                                        : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'
                                        }`}
                                >
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>

                            <h2 className="text-white font-bold text-base mb-2 line-clamp-2 drop-shadow-sm">
                                {drill.title}
                                {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
                            </h2>

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
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800/50 z-50">
                    <div
                        className="h-full bg-violet-500 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
    );
};
