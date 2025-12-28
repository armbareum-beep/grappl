import React, { useRef, useState, useEffect } from 'react';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, MoreVertical, Play, Volume2, VolumeX, ListVideo } from 'lucide-react';
import { Link } from 'react-router-dom';

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
    offset
}) => {

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
                    <div className="relative w-full h-full max-w-[56.25vh] flex">
                        {/* Video */}
                        <div className="relative flex-1">
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

                        {/* Desktop Actions - Moved to bottom right style */}
                        <div className="hidden md:flex flex-col gap-5 items-center justify-end pb-12 ml-6 z-40">
                            {/* Like */}
                            <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex flex-col items-center gap-1 group">
                                <Heart className={`w-8 h-8 drop-shadow-lg transition-transform active:scale-125 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                <span className="text-white text-xs font-bold drop-shadow-md">{likeCount}</span>
                            </button>

                            {/* View Routine */}
                            <button onClick={(e) => { e.stopPropagation(); onViewRoutine(); }} className="flex flex-col items-center gap-1 group">
                                <ListVideo className="w-8 h-8 text-white drop-shadow-lg transition-transform group-hover:scale-110" />
                                <span className="text-white text-[10px] font-bold drop-shadow-md">루틴</span>
                            </button>

                            {/* Share */}
                            <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="flex flex-col items-center gap-1 group">
                                <Share2 className="w-8 h-8 text-white drop-shadow-lg transition-transform group-hover:scale-110" />
                                <span className="text-white text-[10px] font-bold drop-shadow-md">공유</span>
                            </button>

                            {/* Save */}
                            <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="flex flex-col items-center gap-1 group">
                                <Bookmark className={`w-8 h-8 transition-transform group-hover:scale-110 ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
                                <span className="text-white text-[10px] font-bold drop-shadow-md">저장</span>
                            </button>

                            {/* Mute */}
                            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="flex flex-col items-center gap-1 group">
                                {isMuted ? <VolumeX className="w-7 h-7 text-white drop-shadow-lg" /> : <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />}
                            </button>

                            {/* More Options */}
                            <button className="flex flex-col items-center gap-1 group opacity-60 hover:opacity-100 transition-opacity">
                                <MoreVertical className="w-6 h-6 text-white drop-shadow-lg" />
                            </button>
                        </div>
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
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-40 pointer-events-none md:pointer-events-auto">
                    <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                        {/* Info - Always inside video */}
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-3 mb-3">
                                <Link
                                    to={`/creator/${drill.creatorId}`}
                                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                >
                                    {drill.creatorProfileImage && (
                                        <img
                                            src={drill.creatorProfileImage}
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
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${isFollowed
                                        ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700'
                                        : 'bg-transparent text-white border-white/40 hover:bg-white/10'
                                        }`}
                                >
                                    {isFollowed ? '팔로잉' : '팔로우'}
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

                        {/* Right Side Actions - Mobile style (stacked bottom right) */}
                        <div className="flex flex-col gap-5 items-center pb-8 md:hidden">
                            {/* Like */}
                            <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="flex flex-col items-center gap-1 group">
                                <Heart className={`w-8 h-8 drop-shadow-lg transition-transform active:scale-125 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                                <span className="text-white text-[10px] font-bold drop-shadow-md text-center">{likeCount}</span>
                            </button>

                            {/* View Routine */}
                            <button onClick={(e) => { e.stopPropagation(); onViewRoutine(); }} className="flex flex-col items-center gap-1 group">
                                <ListVideo className="w-8 h-8 text-white drop-shadow-lg" />
                                <span className="text-white text-[10px] font-bold drop-shadow-md">루틴</span>
                            </button>

                            {/* Share */}
                            <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="flex flex-col items-center gap-1 group">
                                <Share2 className="w-8 h-8 text-white drop-shadow-lg" />
                                <span className="text-white text-[10px] font-bold drop-shadow-md">공유</span>
                            </button>

                            {/* Save */}
                            <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="flex flex-col items-center gap-1 group">
                                <Bookmark className={`w-8 h-8 drop-shadow-lg ${isSaved ? 'fill-white text-white' : 'text-white'}`} />
                                <span className="text-white text-[10px] font-bold drop-shadow-md">저장</span>
                            </button>

                            {/* Mute toggle indicator is usually elsewhere in TikTok/Insta Reels, but we'll put it here or as a small toggle */}
                            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="flex flex-col items-center">
                                {isMuted ? <VolumeX className="w-6 h-6 text-white/60" /> : <Volume2 className="w-6 h-6 text-white" />}
                            </button>

                            {/* More Options */}
                            <button className="flex flex-col items-center opacity-60">
                                <MoreVertical className="w-6 h-6 text-white" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
