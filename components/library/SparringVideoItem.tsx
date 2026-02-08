import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { extractVimeoId } from '../../lib/api';
import { SparringVideo } from '../../types';
import { Heart, Share2, ChevronLeft, Volume2, VolumeX, Bookmark, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { VideoPlayer } from '../VideoPlayer';
import { MarqueeText } from '../common/MarqueeText';
import { ReelLoginModal } from '../auth/ReelLoginModal';

const ShareModal = React.lazy(() => import('../social/ShareModal'));

export interface VideoItemRef {
    seekTo: (time: number) => void;
}

export const SparringVideoItem = React.forwardRef<VideoItemRef, {
    video: SparringVideo;
    isActive: boolean;
    dailyFreeId?: string | null;
    offset: number;
    onVideoReady?: () => void;
    onProgressUpdate?: (seconds: number) => void;
    totalSessionSeconds?: number;
    isSubscriber?: boolean;
    isAdmin?: boolean;
    viewMode?: string;
    isCached?: boolean;
}>(({
    video,
    isActive,
    dailyFreeId,
    offset,
    onVideoReady,
    onProgressUpdate,
    totalSessionSeconds,
    isSubscriber: propIsSubscriber,
    isAdmin: propIsAdmin,
    isCached = false,
}, ref) => {
    const { user, isSubscribed: authIsSubscribed, isAdmin: authIsAdmin } = useAuth();
    const isSubscribed = propIsSubscriber ?? authIsSubscribed;
    const isAdmin = propIsAdmin ?? authIsAdmin;
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [owns, setOwns] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const [localProgress, setLocalProgress] = useState({ seconds: 0, duration: 45, percent: 0, hasAccess: true });
    const [shouldLoadPlayer, setShouldLoadPlayer] = useState(false);
    const navigate = useNavigate();
    const playerRef = useRef<any>(null);

    useEffect(() => {
        if (!isActive && Math.abs(offset) > 1) {
            setShouldLoadPlayer(false);
            return;
        }

        if (isActive) {
            setShouldLoadPlayer(true);
        } else if (Math.abs(offset) === 1) {
            const timer = setTimeout(() => {
                setShouldLoadPlayer(true);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isActive, offset]);

    useEffect(() => {
        if (user && video.creatorId) {
            import('../../lib/api').then(({ getSparringInteractionStatus, checkSparringOwnership }) => {
                getSparringInteractionStatus(user.id, video.id, video.creatorId)
                    .then(status => {
                        setIsFollowed(status.followed);
                        setIsLiked(status.liked);
                        setIsSaved(status.saved);
                    })
                    .catch(() => { });

                checkSparringOwnership(user.id, video.id)
                    .then(hasPurchased => {
                        setOwns(hasPurchased);
                    })
                    .catch(() => { });
            });
        }
    }, [user?.id, video.id, video.creatorId]);

    React.useImperativeHandle(ref, () => ({
        seekTo: (time: number) => {
            if (playerRef.current) {
                playerRef.current.seekTo(time);
            }
        }
    }));

    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!video.creatorId) return;

        const newStatus = !isFollowed;
        setIsFollowed(newStatus);

        try {
            const { toggleCreatorFollow } = await import('../../lib/api');
            const result = await toggleCreatorFollow(user.id, video.creatorId);
            setIsFollowed(result.followed);
        } catch (error) {
            setIsFollowed(!newStatus);
        }
    };

    const handleLike = async () => {
        if (!user) { navigate('/login'); return; }

        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLocalLikes(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const { toggleSparringLike } = await import('../../lib/api');
            const result = await toggleSparringLike(user.id, video.id);
            setIsLiked(result.liked);
        } catch (error) {
            setIsLiked(!newStatus);
            setLocalLikes(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }

        const newStatus = !isSaved;
        setIsSaved(newStatus);

        try {
            const { toggleSparringSave } = await import('../../lib/api');
            const result = await toggleSparringSave(user.id, video.id);
            setIsSaved(result.saved);
        } catch (error) {
            setIsSaved(!newStatus);
        }
    };

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleShare = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsShareModalOpen(true);
    };

    const vimeoFullId = extractVimeoId(video.videoUrl);
    const isDailyFree = dailyFreeId === video.id;
    const hasAccess = !!(isDailyFree || video.price === 0 || owns || (user && (isSubscribed || isAdmin || video.creatorId === user.id)));
    const activeVimeoId = vimeoFullId;

    useEffect(() => {
        if (isActive && user && video.id && hasAccess) {
            import('../../lib/api').then(({ recordSparringView }) => {
                recordSparringView(video.id).catch(() => { });
            });
        }
    }, [isActive, user, video.id, hasAccess]);

    const [muted, setMuted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<number>(45);
    const hasTriggeredModalRef = useRef(false);

    useEffect(() => {
        if (totalSessionSeconds !== undefined) {
            const remaining = Math.max(0, 45 - totalSessionSeconds);
            setTimeRemaining(remaining);

            // Trigger modal when time runs out (0:00)
            if (remaining === 0 && !hasTriggeredModalRef.current && (!user || !hasAccess)) {
                hasTriggeredModalRef.current = true;
                handlePreviewLimitReached();
            }
        }
    }, [totalSessionSeconds, user, hasAccess]);

    const toggleMute = () => {
        setMuted(prev => !prev);
    };

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isSubscribeModalOpen, setIsSubscribeModalOpen] = useState(false);

    const handlePreviewLimitReached = () => {
        if (!user) {
            setIsLoginModalOpen(true);
        } else if (!isSubscribed && !isAdmin) {
            setIsSubscribeModalOpen(true);
        }
    };

    const renderVideoContent = () => {
        if (video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error')) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4">
                    <p>Video Error</p>
                </div>
            );
        }

        const currentPlayerVimeoId = activeVimeoId || vimeoFullId || video.videoUrl;

        return (
            <VideoPlayer
                ref={playerRef}
                vimeoId={currentPlayerVimeoId}
                title={video.title}
                playing={isActive || offset === 1 || offset === 2}
                autoplay={shouldLoadPlayer || isCached}
                muted={muted}
                showControls={false}
                fillContainer={true}
                forceSquareRatio={true}
                onProgress={(seconds, duration, percent) => {
                    if (isActive) {
                        const reportSec = seconds || 0;
                        const reportDuration = duration || 45;
                        const reportPercent = percent !== undefined ? percent * 100 : (reportSec / reportDuration) * 100;

                        setLocalProgress({
                            seconds: reportSec,
                            duration: reportDuration,
                            percent: reportPercent,
                            hasAccess
                        });

                        onProgressUpdate?.(reportSec);
                    }
                }}
                onReady={onVideoReady}
                onAutoplayBlocked={() => setMuted(true)}
                onDoubleTap={handleLike}
                isPreviewMode={!hasAccess}
                maxPreviewDuration={45}
                onPreviewLimitReached={handlePreviewLimitReached}
                onEnded={handlePreviewLimitReached}
                hideInternalOverlay={true}
                thumbnailUrl={video.thumbnailUrl}
            />
        );
    };

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div
                className="relative w-full h-full z-10 flex items-center justify-center overflow-hidden transition-all duration-300 ease-out"
            >
                {renderVideoContent()}
            </div>
            <div className="absolute inset-0 pointer-events-none z-40">
                <div className="relative w-full h-full mx-auto max-w-[min(100vw,calc(100vh-140px))]">
                    <div className="absolute top-4 left-4 z-[100] pointer-events-auto">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 rounded-full bg-black/20 backdrop-blur-sm border border-white/5 text-white hover:bg-black/40 transition-all active:scale-95"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="absolute top-4 right-4 flex flex-col gap-3 z-50 pointer-events-auto items-end">
                        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-3 rounded-full bg-black/20 backdrop-blur-sm text-white border border-white/5 hover:bg-black/40 transition-all">
                            {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                        </button>

                        {isActive && timeRemaining > 0 && (!user || !hasAccess) && (
                            <div className="px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-violet-500/30 pointer-events-none">
                                <span className="text-xs font-bold text-violet-300">
                                    프리뷰: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} 남음
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="absolute bottom-10 right-4 flex flex-col gap-5 z-[70] pointer-events-auto items-center">
                        <div className="flex flex-col items-center gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                            </button>
                            <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{localLikes.toLocaleString()}</span>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                            <Bookmark className={cn("w-5 h-5 md:w-6 md:h-6", isSaved && "fill-white")} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    <div className="absolute bottom-10 left-0 right-0 w-full px-6 z-[60] text-white pointer-events-none">
                        <div className="w-full max-w-xl mx-auto flex flex-col items-start gap-4">
                            <div className="w-full pointer-events-auto pr-24">
                                {(video as any).category && (
                                    <div className="flex items-center gap-3">
                                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border mb-2 ${(video as any).category === 'Competition'
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            }`}>
                                            {(video as any).category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                                        </div>
                                    </div>
                                )}

                                {video.creator && (
                                    <div className="flex items-center gap-3 mb-2 md:mb-3">
                                        <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                            <div className="relative">
                                                <img src={(video.creator as any).profileImage || (video.creator as any).avatar_url || (video.creator as any).image || `https://ui-avatars.com/api/?name=${video.creator.name}`} className="w-7 md:w-8 h-7 md:h-8 rounded-full border border-white/20 object-cover" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold text-xs md:text-sm drop-shadow-sm">{video.creator.name}</span>
                                            </div>
                                        </Link>
                                        <span className="text-white/60 text-xs">•</span>
                                        <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                            {isFollowed ? 'Following' : 'Follow'}
                                        </button>
                                    </div>
                                )}

                                <div className="mb-1 md:mb-2">
                                    <h3 className="font-black text-lg md:text-xl lg:text-3xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">{video.title}</h3>
                                </div>
                                {video.description && (
                                    <p className="text-xs md:text-base text-white/70 line-clamp-2 max-w-xl font-medium drop-shadow-md mb-2">{video.description}</p>
                                )}

                                {video.relatedItems && video.relatedItems.length > 0 && (
                                    <div className="w-full max-w-[200px] md:max-w-[300px] overflow-hidden">
                                        <div
                                            className="bg-black/30 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 flex items-center transition-transform"
                                        >
                                            <MarqueeText
                                                items={video.relatedItems.map(item => ({
                                                    id: item.id,
                                                    text: `${item.type === 'lesson' ? 'Lesson' : item.type === 'drill' ? 'Drill' : 'Course'}: ${item.title}`,
                                                    onClick: () => {
                                                        if (item.type === 'lesson') navigate(`/lessons/${item.id}`);
                                                        else if (item.type === 'drill') navigate(`/drills/${item.id}`);
                                                        else if (item.type === 'course') navigate(`/courses/${item.id}`);
                                                    }
                                                }))}
                                                icon={<ArrowUpRight className="w-3 h-3 text-white/70" />}
                                                className="text-[10px] md:text-xs font-bold text-white/90"
                                                speed={20}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-[200001] group">
                    <div
                        className={cn(
                            "absolute inset-x-0 bottom-0 h-6 flex items-end cursor-pointer z-50",
                            !hasAccess && "pointer-events-none"
                        )}
                    >
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="0.1"
                            value={localProgress.percent || 0}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setLocalProgress(prev => ({ ...prev, percent: val }));
                                if (playerRef.current) {
                                    playerRef.current.seekTo(localProgress.duration * (val / 100));
                                }
                            }}
                            className="w-full h-full opacity-0 cursor-pointer touch-none z-50"
                        />
                    </div>

                    <div
                        className="h-full bg-violet-500 relative transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                        style={{
                            width: `${Math.max(0, Math.min(100, localProgress.percent))}%`
                        }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200" />
                    </div>
                </div>
            )}

            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={video.title}
                        text={`${video.creator?.name}님의 스파링 영상을 확인해보세요`}
                        imageUrl={video.thumbnailUrl}
                        url={`${window.location.origin}/sparring?id=${video.id}`}
                    />
                )}
                {isLoginModalOpen && (
                    <ReelLoginModal
                        isOpen={isLoginModalOpen}
                        onClose={() => setIsLoginModalOpen(false)}
                        redirectUrl="/sparring"
                    />
                )}
                {isSubscribeModalOpen && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
                        <div className="relative w-full max-w-md mx-4 bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl">
                            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
                                <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>

                            <h3 className="text-2xl font-black text-white mb-2 text-center">스파링 전체 시청하기</h3>
                            <p className="text-zinc-400 text-sm mb-8 text-center max-w-[280px] mx-auto font-medium">
                                이 스파링 영상의 뒷부분을 시청하시려면 단품으로 구매하거나 그래플레이 멤버십을 구독하세요.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={() => navigate(`/checkout/sparring/${video.id}`)}
                                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
                                >
                                    ₩{video.price?.toLocaleString()} 단품 구매
                                </button>

                                <div className="relative py-2">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                        <span className="bg-zinc-900 px-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">or</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/pricing')}
                                    className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black text-lg hover:bg-violet-500 transition-all active:scale-95 shadow-xl shadow-violet-500/20"
                                >
                                    멤버십 구독하기
                                </button>
                            </div>

                            <p className="text-[10px] text-center text-zinc-500 mt-6 max-w-[220px] mx-auto">
                                멤버십 구독 시 모든 클래스, 드릴, 스파링 영상을 무제한으로 시청할 수 있습니다.
                            </p>

                            <button
                                onClick={() => setIsSubscribeModalOpen(false)}
                                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 transition-colors"
                            >
                                <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </React.Suspense>
        </div>
    );
});

SparringVideoItem.displayName = 'SparringVideoItem';
