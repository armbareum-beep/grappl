import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSparringVideos, getDailyFreeSparring, extractVimeoId } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, Share2, ChevronLeft, ChevronRight, Volume2, VolumeX, Bookmark, Search, PlaySquare, ChevronDown, Lock, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ContentBadge } from '../components/common/ContentBadge';

import { cn } from '../lib/utils';
/* eslint-disable react-hooks/exhaustive-deps */

import Player from '@vimeo/player';
import { useWakeLock } from '../hooks/useWakeLock';
import { VideoPlayer } from '../components/VideoPlayer';

const VideoItem: React.FC<{
    video: SparringVideo;
    isActive: boolean;
    dailyFreeId?: string | null;
}> = ({ video, isActive, dailyFreeId }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [muted, setMuted] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    useWakeLock(isActive && isPlaying);

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
    }, [user, video.id, video.creatorId]);

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

    const [previewEnded, setPreviewEnded] = useState(false);

    // Helper to get Vimeo ID and Hash
    const vimeoFullId = extractVimeoId(video.videoUrl);

    const isDailyFree = dailyFreeId === video.id;
    // Allow access if: Daily Free OR Purchased OR (User Logged In AND (Subscribed OR Admin OR Creator of global video))
    const hasAccess = isDailyFree || owns || (user && (isSubscribed || isAdmin || video.creatorId === user.id));

    // Determine which video to play
    // If has access -> Main Video
    // If no access -> NULL (Do not play preview in feed, show lock screen/thumbnail only)
    const activeVimeoId = hasAccess ? vimeoFullId : null;

    // Initialize Player
    useEffect(() => {
        if (!containerRef.current || !activeVimeoId || activeVimeoId === 'undefined' || activeVimeoId === 'null') return;

        // Ensure ID is valid number or string with hash
        if (isNaN(Number(activeVimeoId)) && !String(activeVimeoId).includes(':')) {
            return;
        }

        if (playerRef.current) {
            playerRef.current.destroy();
        }

        const sourceUrlOrId = activeVimeoId;

        // Manual Iframe Strategy for Private Videos
        const isPrivateWithHash = String(sourceUrlOrId).includes(':');

        if (isPrivateWithHash) {
            const [id, hash] = String(sourceUrlOrId).split(':');
            const iframe = document.createElement('iframe');
            iframe.src = `https://player.vimeo.com/video/${id}?h=${hash}&autoplay=1&loop=${hasAccess ? 1 : 0}&background=1&muted=1&dnt=1`;
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');

            // Force 1:1 aspect ratio
            iframe.style.setProperty('width', '177.78%', 'important');
            iframe.style.setProperty('height', '177.78%', 'important');
            iframe.style.setProperty('position', 'absolute', 'important');
            iframe.style.setProperty('top', '50%', 'important');
            iframe.style.setProperty('left', '50%', 'important');
            iframe.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
            iframe.style.setProperty('object-fit', 'cover', 'important');

            containerRef.current.appendChild(iframe);
            const player = new Player(iframe);

            player.ready().then(() => {
                setIsPlayerReady(true);
                playerRef.current = player;
                if (isActive) player.play().catch(console.error);
                if (!hasAccess && video.previewVimeoId) {
                    player.on('ended', () => setPreviewEnded(true));
                }
            });
        } else {
            const options: any = {
                id: Number(sourceUrlOrId),
                width: window.innerWidth,
                background: true,
                loop: hasAccess,
                autoplay: false,
                muted: true,
                controls: false,
                dnt: true
            };

            const player = new Player(containerRef.current, options);
            player.ready().then(() => {
                setIsPlayerReady(true);
                playerRef.current = player;

                // Force 1:1 aspect ratio on SDK-created iframe
                const applySquareCrop = () => {
                    const iframe = containerRef.current?.querySelector('iframe');
                    if (iframe) {
                        iframe.style.setProperty('width', '177.78%', 'important');
                        iframe.style.setProperty('height', '177.78%', 'important');
                        iframe.style.setProperty('position', 'absolute', 'important');
                        iframe.style.setProperty('top', '50%', 'important');
                        iframe.style.left = '50%', 'important';
                        iframe.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
                        iframe.style.setProperty('object-fit', 'cover', 'important');
                        console.log('[SparringFeed] Applied 1:1 crop');
                    }
                };

                // Apply immediately and retry with delays
                applySquareCrop();
                setTimeout(applySquareCrop, 100);
                setTimeout(applySquareCrop, 300);

                if (isActive) player.play().catch(console.error);
                if (!hasAccess && video.previewVimeoId) {
                    player.on('ended', () => setPreviewEnded(true));
                }
            }).catch(err => console.error('Vimeo player init error:', err));
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
            if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, [activeVimeoId, hasAccess]); // Re-run if access changes or ID changes

    // Handle Active State Changes
    useEffect(() => {
        if (!playerRef.current || !isPlayerReady) return;

        if (isActive) {
            playerRef.current.play().catch(() => {
                playerRef.current?.setVolume(0);
                setMuted(true);
                playerRef.current?.play().catch(console.error);
            });
        } else {
            playerRef.current.pause().catch(console.error);
            playerRef.current.setCurrentTime(0).catch(console.error);
        }
    }, [isActive, isPlayerReady]);

    // Record View History
    useEffect(() => {
        if (isActive && user && video.id) {
            import('../lib/api').then(({ recordSparringView }) => {
                recordSparringView(user.id, video.id).catch(console.error);
            });
        }
    }, [isActive, user, video.id]);

    const toggleMute = async () => {
        const newMuteState = !muted;
        setMuted(newMuteState);

        if (playerRef.current) {
            await playerRef.current.setVolume(newMuteState ? 0 : 1);
            await playerRef.current.setMuted(newMuteState);
        } else if (containerRef.current) {
            const videoEl = containerRef.current.querySelector('video');
            if (videoEl) videoEl.muted = newMuteState;
        }
    };

    const renderVideoContent = () => {
        // Show Lock Screen ONLY if:
        // 1. User has NO access
        // 2. AND (No preview available OR Preview has ended)
        const showLockScreen = !hasAccess && (!video.previewVimeoId || previewEnded);

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
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">영상 처리 실패</h3>
                    <p className="text-sm text-center text-zinc-400 mb-4 max-w-xs break-all">
                        {video.videoUrl.replace('ERROR:', '').trim()}
                    </p>
                    <div className="text-xs text-zinc-500 text-center">
                        영상을 처리할 수 없습니다. 대시보드에서 삭제 후 다시 시도해주세요.
                    </div>
                </div>
            );
        }

        if (activeVimeoId) {
            return (
                <VideoPlayer
                    vimeoId={activeVimeoId}
                    title={video.title}
                    playing={isActive}
                    showControls={false}
                    fillContainer={true}
                    forceSquareRatio={true}
                    onProgress={(s) => {
                        // Sparse logging to avoid too many renders if not needed
                    }}
                    onDoubleTap={handleLike}
                    onEnded={() => {
                        if (!hasAccess && video.previewVimeoId) {
                            setPreviewEnded(true);
                        }
                    }}
                />
            );
        }

        return (
            <VideoPlayer
                vimeoId={video.videoUrl}
                title={video.title}
                playing={isActive}
                showControls={false}
                fillContainer={true}
                forceSquareRatio={true}
                onDoubleTap={handleLike}
            />
        );
    };

    return (
        <>
            <div className="w-full h-[calc(100vh-56px)] sm:h-screen relative snap-start shrink-0 bg-black flex items-start justify-center overflow-hidden pt-16">
                <div className="relative w-full max-w-[min(100vw,calc(100vh-140px))] aspect-square z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    {renderVideoContent()}
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={toggleMute} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-30" />
                <div className="absolute inset-0 pointer-events-none z-40">
                    <div className="relative w-full h-full mx-auto max-w-[min(100vw,calc(100vh-140px))]">
                        {/* Top-Left Group: Back Button - Sticks to top left INSIDE container */}
                        <div className="absolute top-8 left-4 z-[100] pointer-events-auto">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        {/* Top-Right Group: Speaker & Grid View - Sticks to top right INSIDE container */}
                        <div className="absolute top-8 right-4 flex flex-col gap-4 z-50 pointer-events-auto items-center">
                            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl">
                                {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>

                        </div>

                        {/* Video Overlay Layer (Bottom parts) */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-full aspect-square">
                                {/* Middle-Right Group: Heart, Save, Share */}
                                <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-5 z-50 pointer-events-auto items-center">
                                    <div className="flex flex-col items-center gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                            <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                        </button>
                                        <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{localLikes.toLocaleString()}</span>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                        <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-white' : ''}`} />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl">
                                        <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                    </button>
                                </div>

                                {/* Bottom Info: Attached to Video Bottom */}
                                <div className="absolute -bottom-24 md:-bottom-28 left-0 right-0 w-full px-4 z-[60] text-white flex flex-col items-start gap-1 pointer-events-none">
                                    <div className="w-full pointer-events-auto pr-16">
                                        {/* Learn This */}
                                        {video.relatedItems && video.relatedItems.length > 0 && (
                                            <div className="w-full pointer-events-auto mb-4">
                                                <div className="flex flex-row gap-3 overflow-x-auto flex-nowrap pb-2 no-scrollbar snap-x">
                                                    {video.relatedItems.map((item: any, idx) => {
                                                        const isDrill = item.type === 'drill';
                                                        const targetUrl = isDrill ? `/drills/${item.id}` : `/watch?tab=lesson&id=${item.id}`;

                                                        return (
                                                            <Link
                                                                key={idx}
                                                                to={targetUrl}
                                                                className="snap-start group flex-shrink-0 w-64 md:w-72 flex gap-3 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all cursor-pointer items-center active:scale-95"
                                                            >
                                                                <div className="w-20 aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-white/20 shrink-0 relative">
                                                                    {item.thumbnailUrl ? (
                                                                        <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700">
                                                                            <PlaySquare className="w-6 h-6" />
                                                                        </div>
                                                                    )}
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                                                                        <PlaySquare className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="text-sm font-bold text-white line-clamp-2 drop-shadow-sm">{item.title}</h4>
                                                                    <div className="flex items-center gap-2 mt-1.5">
                                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${isDrill ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                                                                            {isDrill ? 'DRILL' : 'LESSON'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {video.creator && (
                                            <div className="flex items-center gap-3 mb-3">
                                                <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                    <img src={video.creatorProfileImage || (video.creator as any).profileImage || (video.creator as any).image || (video.creator as any).avatar_url || `https://ui-avatars.com/api/?name=${video.creator.name}`} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                                    <span className="text-white font-bold text-sm drop-shadow-sm">{video.creator.name}</span>
                                                </Link>
                                                <span className="text-white/60 text-xs mt-0.5">•</span>
                                                <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                                    {isFollowed ? 'Following' : 'Follow'}
                                                </button>
                                            </div>
                                        )}
                                        <div className="mb-4">
                                            <h3 className="font-black text-2xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2 md:text-3xl">{video.title}</h3>
                                        </div>
                                        <p className="text-sm text-white/90 line-clamp-1 drop-shadow-sm md:text-base" onClick={(e) => e.stopPropagation()}>{video.description}</p>
                                    </div>
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
                </React.Suspense>
            </div>
        </>
    );
};

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

import { LibraryTabs } from '../components/library/LibraryTabs';

export const SparringFeed: React.FC<{
    isEmbedded?: boolean;
    activeTab?: 'classes' | 'routines' | 'sparring';
    onTabChange?: (tab: 'classes' | 'routines' | 'sparring') => void;
    forceViewMode?: 'grid' | 'reels';
}> = ({ isEmbedded, activeTab, onTabChange, forceViewMode }) => {
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const { user } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const [dailyFreeIdState, setDailyFreeIdState] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();

    const initialView = searchParams.get('view') === 'grid' ? 'grid' : 'reels';
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>(forceViewMode || (isEmbedded ? 'grid' : initialView));

    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalCategory, setInternalCategory] = useState<string>('All');

    const searchTerm = internalSearchTerm;
    const selectedCategory = internalCategory;

    const [selectedUniform, setSelectedUniform] = useState('All');
    const [selectedOwnership, setSelectedOwnership] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'shuffled' | 'latest' | 'popular'>('shuffled');
    const [openDropdown, setOpenDropdown] = useState<'uniform' | 'ownership' | 'sort' | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

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

                setVideos(processed);
            }
        };
        init();
    }, []);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== activeIndex && videos[index]) {
                setActiveIndex(index);
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [videos, activeIndex]);

    const initialId = searchParams.get('id');

    useEffect(() => {
        if (videos.length > 0 && initialId && containerRef.current) {
            const index = videos.findIndex(v => v.id === initialId);
            if (index !== -1) {
                setActiveIndex(index);
                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTo({
                            top: index * containerRef.current.clientHeight,
                            behavior: 'instant'
                        });
                    }
                }, 100);
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
        if (selectedOwnership === 'Purchased') {
            matchesOwnership = user?.ownedVideoIds?.includes(video.id) || false;
        } else if (selectedOwnership === 'Not Purchased') {
            matchesOwnership = !(user?.ownedVideoIds?.includes(video.id));
        }

        return matchesSearch && matchesUniform && matchesCategory && matchesOwnership;
    }).sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortBy === 'popular') {
            return (b.views || 0) - (a.views || 0);
        }
        return 0; // Keep shuffled order if sortBy is 'shuffled'
    });

    if (viewMode === 'reels') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col md:pl-28 overflow-hidden">
                {/* Header Controls (Removed - Back button moved inside VideoItem) */}

                {/* Main Content Area */}
                <div className="flex-1 relative overflow-hidden">
                    <div ref={containerRef} className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
                        {/* If filtered videos are empty (e.g. from search), show all or handle nicely. 
                            Usually Reels view ignores search unless navigated from search grid. 
                            Here we use filteredVideos if we have them, else all. */}
                        {filteredVideos.length > 0 ? (
                            filteredVideos.map((video, idx) => (
                                <VideoItem
                                    key={video.id}
                                    video={video}
                                    isActive={idx === activeIndex}
                                    dailyFreeId={dailyFreeIdState}
                                />
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                                <p>영상이 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
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
                <div className="flex flex-col gap-8 mb-12">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 md:gap-8">
                        {filteredVideos.map((video, idx) => (
                            <div
                                key={video.id}
                                className="group cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveIndex(idx);
                                    setViewMode('reels');
                                }}
                            >
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
                                        {/* Badges */}
                                        <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
                                            {video.isDailyFree && (
                                                <ContentBadge type="daily_free" />
                                            )}
                                            <div className="ml-auto">
                                                {video.rank ? (
                                                    <ContentBadge type="popular" rank={video.rank} />
                                                ) : (video.createdAt && new Date(video.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                                                    <ContentBadge type="recent" />
                                                ) : null}
                                            </div>
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                            <PlaySquare className="w-4 h-4" />
                                        </div>
                                    </Link>
                                </div>

                                {/* Info Area */}
                                <div className="flex gap-3 px-1">
                                    {/* Creator Avatar */}
                                    <Link to={`/creator/${video.creatorId}`} className="shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
                                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-800 overflow-hidden hover:border-violet-500/50 transition-colors">
                                            {(video.creator as any)?.avatar_url || (video.creator as any)?.profileImage ? (
                                                <img src={(video.creator as any)?.avatar_url || (video.creator as any)?.profileImage} alt={video.creator?.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                                    {video.creator?.name?.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </Link>

                                    {/* Text Info */}
                                    <div className="flex-1 min-w-0 pr-1">
                                        <div onClick={(e) => {
                                            e.preventDefault();
                                            setActiveIndex(idx);
                                            setViewMode('reels');
                                        }}>
                                            <h3 className="text-zinc-100 font-bold text-sm md:text-base leading-tight mb-1 line-clamp-2 group-hover:text-violet-400 transition-colors">
                                                {video.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 mt-1.5">
                                            <Link to={`/creator/${video.creatorId}`} className="text-xs md:text-sm text-zinc-400 font-medium truncate hover:text-zinc-200 transition-colors" onClick={e => e.stopPropagation()}>
                                                {video.creator?.name || 'Unknown'}
                                            </Link>

                                            <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                                                <PlaySquare className="w-3 h-3" />
                                                <span>{video.views || 0} Views</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};
