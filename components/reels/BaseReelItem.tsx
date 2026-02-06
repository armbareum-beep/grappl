import React, { useState, useRef, useEffect, memo } from 'react';
import { Heart, Bookmark, Share2, Volume2, VolumeX, ChevronLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { VideoPlayer } from '../VideoPlayer';
import { ReelLoginModal } from '../auth/ReelLoginModal';
import { useOrientationFullscreen } from '../../hooks/useOrientationFullscreen';

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../social/ShareModal'));

export interface BaseReelItemProps {
    id: string;
    type: 'drill' | 'lesson' | 'sparring';
    title: string;
    videoUrl: string;
    thumbnailUrl?: string;
    creatorId?: string;
    creatorName?: string;
    creatorProfileImage?: string;
    isActive: boolean;
    offset: number;
    isLiked: boolean;
    likeCount: number;
    onLike: () => void;
    isSaved: boolean;
    onSave: () => void;
    isFollowed: boolean;
    onFollow: () => void;
    isMuted: boolean;
    onToggleMute: () => void;
    hasAccess: boolean;
    isLoggedIn: boolean;
    redirectUrl: string;
    shareText?: string;
    renderExtraActions?: () => React.ReactNode;
    renderHeaderActions?: () => React.ReactNode;
    renderFooterInfo?: () => React.ReactNode;
    customVideoContent?: (isPaused: boolean, reportProgress: (percent: number) => void, onPreviewLimitReached: () => void) => React.ReactNode;
    onProgress?: (percent: number) => void;
    onVideoReady?: () => void;
    onPauseChange?: (isPaused: boolean) => void;
    aspectRatio?: 'portrait' | 'landscape' | 'square';
    maxPreviewDuration?: number;
}

export const BaseReelItem: React.FC<BaseReelItemProps> = memo(({
    type,
    title,
    videoUrl,
    thumbnailUrl,
    creatorId,
    creatorName,
    creatorProfileImage,
    isActive,
    offset,
    isLiked,
    likeCount,
    onLike,
    isSaved,
    onSave,
    isFollowed,
    onFollow,
    isMuted,
    onToggleMute,
    hasAccess,
    isLoggedIn,
    redirectUrl,
    shareText,
    renderExtraActions,
    renderHeaderActions,
    renderFooterInfo,
    customVideoContent,
    onProgress,
    onVideoReady,
    onPauseChange,
    aspectRatio = type === 'drill' ? 'portrait' : 'landscape',
    maxPreviewDuration = 60
}) => {
    const navigate = useNavigate();
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [videoPlayerReady, setVideoPlayerReady] = useState(false);
    const [videoStarted, setVideoStarted] = useState(false);

    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useOrientationFullscreen(containerRef, isActive);

    // Notify parent when video is ready
    // For active items: wait for actual playback start
    // For neighbors (inactive): ready when loaded
    useEffect(() => {
        if (!videoPlayerReady) return;

        if (isActive) {
            // Active item: wait for actual playback
            if (videoStarted) {
                console.log('[BaseReelItem] Active video started, notifying parent');
                onVideoReady?.();
            }
        } else {
            // Neighbor: ready as soon as loaded
            console.log('[BaseReelItem] Neighbor video loaded, notifying parent');
            onVideoReady?.();
        }
    }, [videoPlayerReady, videoStarted, isActive, onVideoReady]);

    // Reset video started state when becoming inactive
    useEffect(() => {
        if (!isActive) {
            setVideoStarted(false);
        }
    }, [isActive]);

    // Safety timeout: hide thumbnail after 2s even if video hasn't started
    useEffect(() => {
        if (!isActive) return;
        const timeout = setTimeout(() => {
            if (!videoStarted) {
                console.log('[BaseReelItem] Safety timeout - forcing video started');
                setVideoStarted(true);
            }
        }, 2000);
        return () => clearTimeout(timeout);
    }, [isActive, videoStarted]);

    // Sync pause state with parent
    useEffect(() => {
        onPauseChange?.(isPaused);
    }, [isPaused, onPauseChange]);

    // Show login modal ONLY on preview limit reached (removed automatic trigger)
    // useEffect(() => {
    //     if (!hasAccess && isActive) {
    //         setIsLoginModalOpen(true);
    //     }
    // }, [isActive, hasAccess]);

    const handleVideoClick = () => {
        if (!hasAccess) return;
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            onLike();
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 800);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                setIsPaused(!isPaused);
            }, 250);
        }
    };

    const typeLabel = type.toUpperCase();
    const typeColorClass = type === 'drill' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
        type === 'lesson' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
            'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className={`w-full h-full relative flex items-center justify-center`}>
                <div className={`relative w-full z-10 flex items-center justify-center overflow-hidden rounded-lg ${aspectRatio === 'square'
                    ? 'max-w-[min(100vw,calc(100vh-140px))] aspect-square'
                    : aspectRatio === 'portrait'
                        ? 'max-w-[min(100vw,56.25vh)] h-full'
                        : 'max-w-[min(100vw,calc((100vh-200px)*16/9))] aspect-video'
                    }`}>
                    {customVideoContent ? (
                        customVideoContent(isPaused, (p) => {
                            setProgress(p);
                            onProgress?.(p);
                        }, () => setIsLoginModalOpen(true))
                    ) : (
                        <VideoPlayer
                            vimeoId={videoUrl}
                            title={title}
                            playing={isActive && !isPaused}  // ONLY play active item to prevent device resource exhaustion and auto-pause conflicts
                            showControls={false}
                            fillContainer={true}
                            muted={!isActive || isMuted}  // Neighbors always muted
                            forceSquareRatio={aspectRatio === 'square'}
                            onProgress={(seconds, __, p) => {
                                const val = p ? p * 100 : 0;
                                setProgress(val);
                                onProgress?.(val);
                                // Mark video as started when we have playback progress
                                if (seconds > 0.1 && !videoStarted) {
                                    setVideoStarted(true);
                                }
                            }}
                            onReady={() => setVideoPlayerReady(true)}
                            onPlayingChange={(playing) => {
                                if (playing && !videoStarted) {
                                    setVideoStarted(true);
                                }
                            }}
                            onDoubleTap={onLike}
                            isPreviewMode={!isLoggedIn || !hasAccess}
                            maxPreviewDuration={maxPreviewDuration}
                            onPreviewLimitReached={() => setIsLoginModalOpen(true)}
                            hideInternalOverlay={true}
                        />
                    )}

                    {/* Thumbnail Poster - Fades out when video starts playing */}
                    {thumbnailUrl && !videoStarted && (
                        <div
                            className="absolute inset-0 z-15 pointer-events-none transition-opacity duration-500"
                            style={{ display: videoStarted ? 'none' : 'block' }}
                        >
                            <img src={thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                    )}

                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={handleVideoClick} />

                    {showLikeAnimation && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <Heart className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping" style={{ animationDuration: '0.8s', animationIterationCount: '1' }} />
                        </div>
                    )}
                </div>

                {/* Removed bottom gradient per user request */}

                <div className="absolute inset-0 pointer-events-none z-40 flex justify-center">
                    <div className={`absolute top-6 left-1/2 -translate-x-1/2 w-full flex justify-between px-4 pointer-events-none ${aspectRatio === 'square'
                        ? 'max-w-[min(100vw,calc(100vh-140px))]'
                        : aspectRatio === 'portrait'
                            ? 'max-w-[min(100vw,56.25vh)]'
                            : 'max-w-[min(100vw,calc((100vh-200px)*16/9))]'
                        }`}>
                        <div className="pointer-events-auto flex flex-col gap-4 items-center">
                            <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95">
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            {renderHeaderActions?.()}
                        </div>
                        <div className="pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl">
                                {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>

                    <div className={`relative w-full h-full flex ${aspectRatio === 'square'
                        ? 'max-w-[min(100vw,calc(100vh-140px))]'
                        : aspectRatio === 'portrait'
                            ? 'max-w-[min(100vw,56.25vh)]'
                            : 'max-w-[min(100vw,calc((100vh-200px)*16/9))]'
                        }`}>
                        <div className="flex-1 relative">
                            <div className="absolute bottom-10 right-4 flex flex-col gap-5 z-[70] pointer-events-auto items-center">
                                <div className="flex flex-col items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                        <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''}`} />
                                    </button>
                                    <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{likeCount.toLocaleString()}</span>
                                </div>
                                {renderExtraActions?.()}
                                <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                    <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-white text-white' : ''}`} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                            </div>

                            <div className="absolute bottom-10 left-0 right-0 w-full px-6 z-[60] text-white flex flex-col items-start gap-1 pointer-events-none">
                                <div className="w-full pointer-events-auto pr-20 p-4 md:p-0 rounded-2xl">
                                    <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-2 border ${typeColorClass}`}>
                                        {typeLabel}
                                    </div>

                                    {creatorId && (
                                        <div className="flex items-center gap-3 mb-3">
                                            <Link to={`/creator/${creatorId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                {creatorProfileImage && (
                                                    <img src={creatorProfileImage} alt={creatorName} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                                )}
                                                <span className="text-white font-bold text-sm drop-shadow-sm">{creatorName}</span>
                                            </Link>
                                            <span className="text-white/60 text-xs mt-0.5">•</span>
                                            <button onClick={(e) => { e.stopPropagation(); onFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                                {isFollowed ? 'Following' : 'Follow'}
                                            </button>
                                        </div>
                                    )}

                                    <div className="mb-2">
                                        <h3 className="font-black text-lg md:text-xl lg:text-3xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">{title}</h3>
                                    </div>
                                    {renderFooterInfo?.()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 h-1`}>
                <div
                    className={`h-full transition-all ease-linear bg-violet-500 duration-300`}
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Login Modal */}
            <ReelLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} redirectUrl={redirectUrl} />

            {/* Share Modal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={title}
                        text={shareText || `${creatorName}님의 콘텐츠를 확인해보세요`}
                        imageUrl={thumbnailUrl}
                        url={`${window.location.origin}${redirectUrl}`}
                    />
                )}
            </React.Suspense>
        </div>
    );
}, (prevProps, nextProps) => {
    // Only re-render if these critical props change
    return (
        prevProps.videoUrl === nextProps.videoUrl &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.offset === nextProps.offset &&
        prevProps.isMuted === nextProps.isMuted &&
        prevProps.isLiked === nextProps.isLiked &&
        prevProps.isSaved === nextProps.isSaved &&
        prevProps.isFollowed === nextProps.isFollowed &&
        prevProps.likeCount === nextProps.likeCount &&
        prevProps.hasAccess === nextProps.hasAccess &&
        // Render props must be checked because they are new functions on every parent render
        // and contain the updated state logic (e.g. video switching)
        prevProps.customVideoContent === nextProps.customVideoContent &&
        prevProps.renderHeaderActions === nextProps.renderHeaderActions &&
        prevProps.renderFooterInfo === nextProps.renderFooterInfo &&
        prevProps.renderExtraActions === nextProps.renderExtraActions
    );
});
