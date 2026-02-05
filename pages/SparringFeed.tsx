import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSparringVideos, getDailyFreeSparring, extractVimeoId } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, Share2, ChevronLeft, Volume2, VolumeX, Bookmark, Search, PlayCircle, ChevronDown, Lock, Zap, MoreHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ContentBadge } from '../components/common/ContentBadge';
import { ReelLoginModal } from '../components/auth/ReelLoginModal';

import { cn } from '../lib/utils';
/* eslint-disable react-hooks/exhaustive-deps */

import { VideoPlayer } from '../components/VideoPlayer';
import { ActionMenuModal } from '../components/library/ActionMenuModal';

const VideoItem: React.FC<{
    video: SparringVideo;
    isActive: boolean;
    dailyFreeId?: string | null;
    offset: number;
    onVideoReady?: () => void;
}> = ({ video, isActive, dailyFreeId, offset, onVideoReady }) => {
    const [muted, setMuted] = useState(false);

    // Interaction State
    const { user, isSubscribed, isAdmin } = useAuth();
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [owns, setOwns] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const navigate = useNavigate();

    // Check interaction status on load
    useEffect(() => {
        if (user && video.creatorId) {
            import('../lib/api').then(({ getSparringInteractionStatus, checkSparringOwnership }) => {
                getSparringInteractionStatus(user.id, video.id, video.creatorId)
                    .then(status => {
                        setIsFollowed(status.followed);
                        setIsLiked(status.liked);
                        setIsSaved(status.saved);
                    })
                    .catch(console.error);

                checkSparringOwnership(user.id, video.id)
                    .then(hasPurchased => {
                        setOwns(hasPurchased);
                    })
                    .catch(console.error);
            });
        }
    }, [user?.id, video.id, video.creatorId]);

    // Handlers
    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!video.creatorId) return;

        // Optimistic UI
        const newStatus = !isFollowed;
        setIsFollowed(newStatus);

        try {
            const { toggleCreatorFollow } = await import('../lib/api');
            const result = await toggleCreatorFollow(user.id, video.creatorId);
            setIsFollowed(result.followed);
        } catch (error) {
            console.error('Follow failed', error);
            setIsFollowed(!newStatus); // Revert
        }
    };

    const handleLike = async () => {
        if (!user) { navigate('/login'); return; }

        // Optimistic UI
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLocalLikes(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const { toggleSparringLike } = await import('../lib/api');
            const result = await toggleSparringLike(user.id, video.id);
            setIsLiked(result.liked);
        } catch (error) {
            console.error('Like failed', error);
            setIsLiked(!newStatus); // Revert
            setLocalLikes(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }

        // Optimistic UI
        const newStatus = !isSaved;
        setIsSaved(newStatus);

        try {
            const { toggleSparringSave } = await import('../lib/api');
            const result = await toggleSparringSave(user.id, video.id);
            setIsSaved(result.saved);
        } catch (error) {
            console.error('Save failed', error);
            setIsSaved(!newStatus); // Revert
        }
    };

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleShare = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsShareModalOpen(true);
    };

    // Helper to get Vimeo ID and Hash
    const vimeoFullId = extractVimeoId(video.videoUrl);

    const isDailyFree = dailyFreeId === video.id;
    // Allow access if: Daily Free OR 0 Won Video OR Purchased OR (User Logged In AND (Subscribed OR Admin OR Creator of global video))
    const hasAccess = isDailyFree || video.price === 0 || owns || (user && (isSubscribed || isAdmin || video.creatorId === user.id));

    // Determine which video to play
    // If has access -> Main Video
    // If no access -> Play nothing (show lock screen immediately)
    const activeVimeoId = hasAccess ? vimeoFullId : null;

    // Record View History
    useEffect(() => {
        if (isActive && user && video.id && hasAccess) {
            import('../lib/api').then(({ recordSparringView }) => {
                recordSparringView(user.id, video.id).catch(console.error);
            });
        }
    }, [isActive, user, video.id, hasAccess]);

    const toggleMute = () => {
        setMuted(prev => !prev);
    };

    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // No preview timer for paid content anymore
    useEffect(() => {
        if (!hasAccess && isActive) {
            setIsLoginModalOpen(true);
        }
    }, [isActive, hasAccess]);

    const renderVideoContent = () => {
        // Show Lock Screen ONLY if User has NO access
        const showLockScreen = !hasAccess;

        if (showLockScreen) {
            const canPurchase = video.price && video.price > 0;

            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md z-50 p-6 text-center select-none" onClick={e => e.stopPropagation()}>
                    <div className="mb-6 relative">
                        <div className="absolute -inset-4 bg-violet-500/20 blur-xl rounded-full"></div>
                        <Lock className="w-12 h-12 text-zinc-400 relative z-10" />
                    </div>

                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-2">Membership or Purchase</span>
                    <h3 className="text-2xl font-black text-white mb-2">
                        {canPurchase ? '유료 스파링 영상' : '멤버십 전용 콘텐츠'}
                    </h3>
                    <p className="text-sm text-zinc-400 font-medium mb-8 max-w-xs leading-relaxed">
                        {canPurchase
                            ? '이 영상을 시청하려면 단품으로 구매하거나 멤버십을 구독하세요.'
                            : '이 스파링 영상은 구독 후 시청할 수 있습니다.'}
                        {isDailyFree && <span className="text-violet-400 font-black block mt-2">(오늘의 무료 영상!)</span>}
                    </p>

                    {/* ... purchase buttons ... */}
                    <div className="w-full max-w-xs space-y-3">
                        {canPurchase && (
                            <Link
                                to={`/checkout/sparring/${video.id}?price=${video.price}`}
                                className="flex items-center justify-center w-full h-14 bg-white text-black font-black rounded-2xl transition-all shadow-lg active:scale-95 text-lg"
                            >
                                ₩{video.price.toLocaleString()} 단품 구매
                            </Link>
                        )}

                        {canPurchase && (
                            <div className="relative py-2">
                                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                    <span className="bg-zinc-950 px-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">or</span>
                                </div>
                            </div>
                        )}

                        <Link
                            to="/pricing"
                            className="flex items-center justify-center w-full h-14 bg-violet-600 text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-900/40 active:scale-95 text-lg gap-2"
                        >
                            <Zap className="w-5 h-5 fill-current" /> 멤버십 구독하기
                        </Link>
                    </div>
                </div>
            );
        }

        if (video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error')) {
            // ... error state
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4">
                    {/* ... */}
                </div>
            );
        }

        if (activeVimeoId) {
            return (
                <VideoPlayer
                    vimeoId={activeVimeoId}
                    title={video.title}
                    playing={isActive}
                    autoplay={isActive}
                    muted={muted}
                    showControls={false}
                    fillContainer={true}
                    forceSquareRatio={true}
                    onProgress={(s) => {
                        // Sparse logging to avoid too many renders if not needed
                    }}
                    onReady={onVideoReady}
                    onAutoplayBlocked={() => setMuted(true)}
                    onDoubleTap={handleLike}
                    onEnded={() => {
                        // Logic moved to parent/state if needed, but no more automatic preview end
                    }}
                />
            );
        }

        return (
            <VideoPlayer
                vimeoId={vimeoFullId || video.videoUrl}
                title={video.title}
                playing={isActive}
                autoplay={isActive}
                muted={muted}
                showControls={false}
                fillContainer={true}
                forceSquareRatio={true}
                onReady={onVideoReady}
                onAutoplayBlocked={() => setMuted(true)}
                onDoubleTap={handleLike}
            />
        );
    };

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black flex items-center justify-center overflow-hidden transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div
                className="relative w-full max-w-[min(100vw,calc(100vh-140px))] z-10 flex items-center justify-center overflow-hidden rounded-lg transition-all duration-300 ease-out aspect-square shadow-2xl border border-white/5"
                style={{ aspectRatio: 1 }}
            >
                {renderVideoContent()}
                <div className="absolute inset-0 z-20 cursor-pointer" onClick={toggleMute} />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-30" />
            <div className="absolute inset-0 pointer-events-none z-40">
                <div className="relative w-full h-full mx-auto max-w-[min(100vw,calc(100vh-140px))]">
                    {/* Top-Left Group: Back Button - Sticks to top left INSIDE container */}
                    <div className="absolute top-10 left-4 z-[100] pointer-events-auto">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95"
                        >
                            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>

                    {/* Top-Right Group: Speaker & Grid View - Sticks to top right INSIDE container */}
                    <div className="absolute top-10 right-4 flex flex-col gap-4 z-50 pointer-events-auto items-center">
                        <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl">
                            {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                        </button>

                    </div>

                    {/* Bottom-Right Actions */}
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

                    {/* Bottom Info */}
                    <div className="absolute bottom-10 left-0 right-0 w-full px-6 z-[60] text-white pointer-events-none">
                        <div className="w-full max-w-[min(100vw,calc(100vh-140px))] mx-auto flex flex-col items-start gap-2 md:gap-4">
                            {/* Creator Info & Title */}
                            <div className="w-full pointer-events-auto pr-20 bg-gradient-to-t from-black/20 to-transparent p-3 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                {/* Category Tag */}
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
                                    <p className="text-xs md:text-base text-white/70 line-clamp-2 max-w-xl font-medium drop-shadow-md">{video.description}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
                        redirectUrl={`/watch?tab=sparring&id=${video.id}`}
                    />
                )}
            </React.Suspense>
        </div >
    );
};

const SparringGridItem: React.FC<{
    video: SparringVideo;
    idx: number;
    setActiveIndex: (idx: number) => void;
    setViewMode: (mode: 'reels' | 'grid') => void;
}> = ({ video, idx, setActiveIndex, setViewMode }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const itemRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();
    const isTarget = searchParams.get('id') === video.id;

    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    useEffect(() => {
        if (user) {
            import('../lib/api').then(({ checkSparringSaved }) => {
                checkSparringSaved(user.id, video.id).then(setIsSaved).catch(() => { });
            });
        }
    }, [user?.id, video.id]);

    useEffect(() => {
        if (isTarget && itemRef.current) {
            setTimeout(() => {
                itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 600);
        }
    }, [isTarget]);

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }
        const newStatus = !isSaved;
        setIsSaved(newStatus);
        try {
            const { toggleSparringSave } = await import('../lib/api');
            await toggleSparringSave(user.id, video.id);
        } catch {
            setIsSaved(!newStatus);
        }
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    return (
        <div
            ref={itemRef}
            className={cn(
                "group cursor-pointer rounded-2xl transition-all duration-500",
                isTarget ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-zinc-950 p-1 bg-violet-500/10 shadow-[0_0_30px_rgba(124,58,237,0.4)] scale-[1.02]" : ""
            )}
            onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                setActiveIndex(idx);
                setViewMode('reels');
            }}
        >
            {/* Thumbnail Card */}
            <div className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:ring-1 hover:ring-violet-500/30">
                <Link to={`?view=reels&id=${video.id}`} className="absolute inset-0 block" onClick={(e) => {
                    e.preventDefault();
                    setActiveIndex(idx);
                    setViewMode('reels');
                }}>
                    <img
                        src={video.thumbnailUrl || (video.videoUrl && !video.videoUrl.startsWith('http') ? `https://vumbnail.com/${video.videoUrl}.jpg` : '')}
                        alt={video.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />

                    {/* Badge — top-left, single: FREE > HOT > NEW */}
                    <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                        {video.isDailyFree ? (
                            <ContentBadge type="daily_free" />
                        ) : video.rank ? (
                            <ContentBadge type="popular" rank={video.rank} />
                        ) : (video.createdAt && new Date(video.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                            <ContentBadge type="recent" />
                        ) : null}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                    {/* Save — top-right */}
                    <button
                        className={cn(
                            "absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white",
                            isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                        )}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }}
                        aria-label="저장"
                    >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-violet-500")} />
                    </button>

                    {/* Share — bottom-right */}
                    <button
                        className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
                        aria-label="공유"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>
                </Link>
            </div>

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
            </React.Suspense>

            {/* Info Area */}
            <div className="flex gap-3 px-1">
                {/* Creator Avatar */}

                {/* Text Info */}
                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex justify-between items-start gap-2">
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveIndex(idx);
                                setViewMode('reels');
                            }}
                            className="flex-1 min-w-0 cursor-pointer"
                        >
                            <h3 className="text-zinc-100 font-bold text-sm md:text-base leading-none mb-0 line-clamp-2 group-hover:text-violet-400 transition-colors">
                                {video.title}
                            </h3>
                        </div>
                        <button
                            className="shrink-0 p-1 -mr-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors opacity-100"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsActionMenuOpen(true);
                            }}
                            aria-label="더보기"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-0">
                        <Link to={`/creator/${video.creatorId}`} className="text-xs md:text-sm text-zinc-400 font-medium truncate hover:text-zinc-200 transition-colors" onClick={e => e.stopPropagation()}>
                            {video.creator?.name || 'Unknown'}
                        </Link>

                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                            <PlayCircle className="w-3 h-3" />
                            <span>{video.views || 0} Views</span>
                        </div>
                    </div>
                </div>
            </div>

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                item={{
                    id: video.id,
                    type: 'sparring',
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl,
                    creatorName: video.creator?.name,
                    creatorProfileImage: video.creator?.profileImage,
                    creatorId: video.creatorId,
                    originalData: video,
                    views: video.views
                } as any}
                isSaved={isSaved}
                onSave={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    handleSave();
                }}
                onShare={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    handleShare();
                }}
            />
        </div>
    );
};

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

import { LibraryTabs, LibraryTabType } from '../components/library/LibraryTabs';

export const SparringFeed: React.FC<{
    isEmbedded?: boolean;
    activeTab?: LibraryTabType;
    onTabChange?: (tab: LibraryTabType) => void;
    forceViewMode?: 'grid' | 'reels';
}> = ({ isEmbedded, activeTab, onTabChange, forceViewMode }) => {
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const { user, isSubscribed, isAdmin } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const [dailyFreeIdState, setDailyFreeIdState] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    // Track which items have their video ready (for blocking swipe to unloaded items)
    const [readyItems, setReadyItems] = useState<Set<number>>(() => new Set());
    const markReady = React.useCallback((index: number) => {
        setReadyItems(prev => {
            if (prev.has(index)) return prev;
            const next = new Set(prev);
            next.add(index);
            return next;
        });
    }, []);

    // Clear stale ready states when scrolling far (items beyond ±2 get unmounted)
    useEffect(() => {
        setReadyItems(prev => {
            const next = new Set<number>();
            for (const idx of prev) {
                if (Math.abs(idx - activeIndex) <= 2) next.add(idx);
            }
            return next.size === prev.size ? prev : next;
        });
    }, [activeIndex]);

    const initialViewParam = searchParams.get('view');
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>(
        forceViewMode || (initialViewParam === 'reels' ? 'reels' : initialViewParam === 'grid' ? 'grid' : (isEmbedded ? 'grid' : 'reels'))
    );

    // Sync viewMode with URL param
    useEffect(() => {
        if (forceViewMode) return;
        const view = searchParams.get('view');
        if (view === 'reels' || view === 'grid') {
            if (view !== viewMode) setViewMode(view);
        }
    }, [searchParams, viewMode, forceViewMode]);

    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalCategory, setInternalCategory] = useState<string>('All');

    const searchTerm = internalSearchTerm;
    const selectedCategory = internalCategory;

    const [selectedUniform, setSelectedUniform] = useState('All');
    const [selectedOwnership, setSelectedOwnership] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'shuffled' | 'latest' | 'popular'>('shuffled');
    const [openDropdown, setOpenDropdown] = useState<'uniform' | 'ownership' | 'sort' | null>(null);
    const [reelTouchStart, setReelTouchStart] = useState<{ y: number } | null>(null);

    const uniforms = ['All', 'Gi', 'No-Gi'];
    const ownershipOptions = ['All', 'Purchased', 'Not Purchased'];

    useEffect(() => {
        const init = async () => {
            // Fetch daily free and videos in parallel
            const [dailyRes, videosRes] = await Promise.all([
                getDailyFreeSparring(),
                getSparringVideos(100, undefined, true)
            ]);

            let loadedVideos = videosRes.data || [];

            if (dailyRes.data) {
                setDailyFreeIdState(dailyRes.data.id);
                // Ensure daily free video is in the list
                const exists = loadedVideos.some((v: SparringVideo) => v.id === dailyRes.data!.id);
                if (!exists) {
                    loadedVideos = [dailyRes.data as unknown as SparringVideo, ...loadedVideos];
                }
            }

            if (loadedVideos.length > 0) {
                // Enrich creator names if needed (though already done via transform)
                const now = Date.now();
                const getHotScore = (item: any) => {
                    const views = item.views || 0;
                    const createdDate = item.createdAt ? new Date(item.createdAt).getTime() : now;
                    const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
                    return views / Math.pow(hoursSinceCreation + 2, 1.5);
                };

                const hotVideos = [...loadedVideos]
                    .filter((v: SparringVideo) => (v.views || 0) >= 5)
                    .sort((a, b) => getHotScore(b) - getHotScore(a));

                const processed = loadedVideos.map((v: SparringVideo) => {
                    const hotIndex = hotVideos.findIndex(s => s.id === v.id);
                    return {
                        ...v,
                        rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                        isDailyFree: v.id === dailyRes.data?.id
                    };
                });

                // Shuffle the array using Fisher-Yates algorithm
                const shuffled = [...processed];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                setVideos(shuffled);
            }
        };
        init();
    }, []);

    const initialId = searchParams.get('id');

    useEffect(() => {
        if (videos.length > 0 && initialId) {
            const index = videos.findIndex(v => v.id === initialId);
            if (index !== -1) {
                setActiveIndex(index);
            }
        }
    }, [videos, initialId]);

    const filteredVideos = videos.filter(video => {
        const matchesSearch = !searchTerm ||
            video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            video.creator?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesUniform = selectedUniform === 'All' || video.uniformType === selectedUniform;

        // Category mapping
        let matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;

        let matchesOwnership = true;
        if (user?.ownedVideoIds) {
            const normalizedOwnedIds = user.ownedVideoIds.map(oid => String(oid).trim().toLowerCase());

            // Check video UUID
            const hasUuidMatch = normalizedOwnedIds.includes(String(video.id).trim().toLowerCase());

            // Check Vimeo IDs
            const vimeoIds = [
                video.videoUrl,
                // @ts-ignore
                video.video_url,
                // @ts-ignore
                video.vimeoUrl,
                // @ts-ignore
                video.vimeo_url
            ].filter(Boolean).map(v => String(v).trim().toLowerCase());

            const hasVimeoMatch = vimeoIds.some(vimeoId => normalizedOwnedIds.includes(vimeoId));

            const isOwnedManually = hasUuidMatch || hasVimeoMatch;

            if (selectedOwnership === 'Purchased') {
                matchesOwnership = !!isOwnedManually;
            } else if (selectedOwnership === 'Not Purchased') {
                matchesOwnership = !isOwnedManually;
            }
        } else {
            if (selectedOwnership === 'Purchased') {
                matchesOwnership = false;
            }
        }

        const matchesSearchAndFilters = matchesSearch && matchesUniform && matchesCategory && matchesOwnership;

        if (viewMode === 'reels') {
            const isDailyFree = dailyFreeIdState === video.id;
            const price = Number(video.price);
            const isPriceFree = isNaN(price) || price === 0;
            const owns = user?.ownedVideoIds?.some(oid => String(oid).trim().toLowerCase() === String(video.id).trim().toLowerCase());
            const hasAccess = isDailyFree || isPriceFree || owns || (user && (!!isSubscribed || !!isAdmin || video.creatorId === user.id));
            return matchesSearchAndFilters && hasAccess;
        }

        return matchesSearchAndFilters;
    }).sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortBy === 'popular') {
            return (b.views || 0) - (a.views || 0);
        }
        return 0; // Keep shuffled order if sortBy is 'shuffled'
    });

    // Keyboard navigation (reels mode)
    useEffect(() => {
        if (viewMode !== 'reels') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = activeIndex - 1;
                if (prev >= 0 && readyItems.has(prev)) {
                    setActiveIndex(prev);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = activeIndex + 1;
                if (next < filteredVideos.length && readyItems.has(next)) {
                    setActiveIndex(next);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, filteredVideos.length]);

    // Mouse wheel navigation (reels mode)
    const lastScrollTime = React.useRef(0);
    useEffect(() => {
        if (viewMode !== 'reels') return;
        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const now = Date.now();

            if (now - lastScrollTime.current < 800) return;

            if (Math.abs(e.deltaY) > 20) {
                if (e.deltaY > 0) {
                    const next = activeIndex + 1;
                    if (next < filteredVideos.length && readyItems.has(next)) {
                        setActiveIndex(next);
                    }
                } else {
                    const prev = activeIndex - 1;
                    if (prev >= 0 && readyItems.has(prev)) {
                        setActiveIndex(prev);
                    }
                }
                lastScrollTime.current = now;
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [viewMode, filteredVideos.length]);

    if (viewMode === 'reels') {
        return (
            <div
                className="fixed inset-0 bg-black z-[100001] md:pl-28 overflow-hidden touch-none"
                onTouchStart={(e) => setReelTouchStart({ y: e.targetTouches[0].clientY })}
                onTouchEnd={(e) => {
                    if (!reelTouchStart) return;
                    const yDist = reelTouchStart.y - e.changedTouches[0].clientY;
                    if (Math.abs(yDist) > 50) {
                        if (yDist > 0) {
                            const next = activeIndex + 1;
                            if (next < filteredVideos.length && readyItems.has(next)) {
                                setActiveIndex(next);
                            }
                        } else {
                            const prev = activeIndex - 1;
                            if (prev >= 0 && readyItems.has(prev)) {
                                setActiveIndex(prev);
                            }
                        }
                    }
                    setReelTouchStart(null);
                }}
            >
                {filteredVideos.length > 0 ? (
                    [-2, -1, 0, 1, 2].map(offset => {
                        const index = activeIndex + offset;
                        if (index < 0 || index >= filteredVideos.length) return null;
                        const video = filteredVideos[index];
                        return (
                            <VideoItem
                                key={video.id}
                                video={video}
                                isActive={offset === 0}
                                dailyFreeId={dailyFreeIdState}
                                offset={offset}
                                onVideoReady={() => markReady(index)}
                            />
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <p>영상이 없습니다.</p>
                    </div>
                )}
            </div>
        );
    }

    // Grid View - Standard Page Layout
    return (
        <div className={cn(
            "min-h-screen bg-zinc-950 flex flex-col flex-1 p-4 md:px-12 md:pb-8 overflow-y-auto",
            !isEmbedded && "md:pt-0"
        )}>
            <div className={cn("max-w-[1600px] mx-auto w-full", isEmbedded && "px-0")}>
                {isEmbedded && activeTab && onTabChange && (
                    <LibraryTabs activeTab={activeTab} onTabChange={onTabChange} />
                )}

                {/* Header & Filter System - Hidden if embedded */}
                <div className="flex flex-col gap-8 mb-8 mt-8">
                    {!isEmbedded && <h1 className="text-3xl font-bold text-white mb-2">스파링</h1>}

                    {/* Search & Stats */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500">
                                <Search className="h-4 w-4 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="스파링 검색..."
                                value={searchTerm || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (!isEmbedded) {
                                        setSearchParams(prev => {
                                            if (value) prev.set('search', value);
                                            else prev.delete('search');
                                            return prev;
                                        });
                                    } else {
                                        setInternalSearchTerm(value);
                                    }
                                }}
                                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                            />
                        </div>

                        <div className="text-zinc-500 text-sm font-medium">
                            총 <span className="text-zinc-200 font-bold">{filteredVideos.length}</span>개의 스파링
                        </div>
                    </div>

                    {/* Filter Rows */}
                    <div className="space-y-4">
                        {/* Row 1: Primary Filter (Category) */}
                        <div className="flex items-center gap-3">
                            <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                                {['All', 'Sparring', 'Competition'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setInternalCategory(cat)}
                                        className={cn(
                                            "h-10 px-5 rounded-full text-xs transition-all duration-200 whitespace-nowrap border flex items-center justify-center",
                                            selectedCategory === cat
                                                ? "bg-violet-600 border-violet-500 text-white shadow-violet-500/20 font-bold"
                                                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Row 2: Secondary Filters (Dropdowns) */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Uniform Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'uniform' ? null : 'uniform')}
                                    className={cn(
                                        "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                                        selectedUniform !== 'All' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                                    )}
                                >
                                    <span className="whitespace-nowrap">Uniform: {selectedUniform}</span>
                                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'uniform' && "rotate-180")} />
                                </button>

                                {openDropdown === 'uniform' && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 py-1">
                                            {uniforms.map(option => (
                                                <button
                                                    key={option}
                                                    onClick={() => {
                                                        setSelectedUniform(option);
                                                        setOpenDropdown(null);
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-2.5 text-left text-xs hover:bg-zinc-800 transition-colors",
                                                        selectedUniform === option ? "text-violet-500 font-bold bg-violet-500/5" : "text-zinc-400"
                                                    )}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>


                            {/* Ownership Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'ownership' ? null : 'ownership')}
                                    className={cn(
                                        "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                                        selectedOwnership !== 'All' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                                    )}
                                >
                                    <span className="whitespace-nowrap">Status: {selectedOwnership}</span>
                                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'ownership' && "rotate-180")} />
                                </button>

                                {openDropdown === 'ownership' && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 py-1">
                                            {ownershipOptions.map(option => (
                                                <button
                                                    key={option}
                                                    onClick={() => {
                                                        setSelectedOwnership(option);
                                                        setOpenDropdown(null);
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-2.5 text-left text-xs hover:bg-zinc-800 transition-colors",
                                                        selectedOwnership === option ? "text-violet-500 font-bold bg-violet-500/5" : "text-zinc-400"
                                                    )}
                                                >
                                                    {option}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                                    className={cn(
                                        "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                                        sortBy !== 'shuffled' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                                    )}
                                >
                                    <span className="whitespace-nowrap">
                                        Sort: {sortBy === 'shuffled' ? 'Recommended' : sortBy === 'latest' ? 'Latest' : 'Popular'}
                                    </span>
                                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'sort' && "rotate-180")} />
                                </button>

                                {openDropdown === 'sort' && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 py-1">
                                            {[
                                                { label: 'Recommended', value: 'shuffled' },
                                                { label: 'Latest', value: 'latest' },
                                                { label: 'Popular', value: 'popular' }
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        setSortBy(option.value as any);
                                                        setOpenDropdown(null);
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-2.5 text-left text-xs hover:bg-zinc-800 transition-colors",
                                                        sortBy === option.value ? "text-violet-500 font-bold bg-violet-500/5" : "text-zinc-400"
                                                    )}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Reset Filter Button */}
                            {(selectedCategory !== 'All' || searchTerm || selectedUniform !== 'All' || selectedOwnership !== 'All') && (
                                <button
                                    onClick={() => {
                                        setInternalCategory('All');
                                        isEmbedded ? setInternalSearchTerm('') : setSearchParams({});
                                        setSelectedUniform('All');
                                        setSelectedOwnership('All');
                                        setSortBy('shuffled');
                                    }}
                                    className="h-10 px-4 text-xs text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
                                >
                                    필터 초기화
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Grid Content */}
                {filteredVideos.length === 0 ? (
                    <div className="text-center py-32 bg-zinc-900/20 rounded-[2.5rem] border border-zinc-900 backdrop-blur-sm">
                        <div className="relative inline-block mb-6">
                            <Search className="w-16 h-16 text-zinc-800 mx-auto" />
                            <div className="absolute inset-0 bg-violet-500/5 blur-2xl rounded-full"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-200 mb-3">검색 결과가 없습니다</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto mb-8">다른 키워드를 시도해보세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
                        {filteredVideos.map((video, idx) => (
                            <SparringGridItem
                                key={video.id}
                                video={video}
                                idx={idx}
                                setActiveIndex={setActiveIndex}
                                setViewMode={setViewMode}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};
