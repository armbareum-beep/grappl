import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparringVideo } from '../../types';
import { Share2, Volume2, VolumeX, Bookmark, Heart, ChevronLeft, Clapperboard, List, CheckCircle, ChevronRight, Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import Player from '@vimeo/player';
import { ReelLoginModal } from '../auth/ReelLoginModal';
import { extractVimeoId } from '../../lib/api';

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../social/ShareModal'));

interface SparringReelItemProps {
    video: SparringVideo;
    isActive: boolean;
    offset: number;
    isDailyFreeSparring?: boolean;
    isSubscriber?: boolean;
    purchasedItemIds?: string[];
}

export const SparringReelItem: React.FC<SparringReelItemProps> = ({ video, isActive, offset, isDailyFreeSparring, isSubscriber, purchasedItemIds = [] }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [muted, setMuted] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Interaction State
    const { user } = useAuth();
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const [relatedDrills, setRelatedDrills] = useState<any[]>([]);
    const [showTechniques, setShowTechniques] = useState(false);
    const navigate = useNavigate();

    // Login modal state for non-logged-in users
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check interaction status and fetch related drills on load
    useEffect(() => {
        if (isActive) {
            if (user && video.creatorId) {
                import('../../lib/api').then(({ getSparringInteractionStatus, getDrillsByIds }) => {
                    getSparringInteractionStatus(user.id, video.id, video.creatorId)
                        .then(status => {
                            setIsFollowed(status.followed);
                            setIsLiked(status.liked);
                            setIsSaved(status.saved);
                        })
                        .catch(console.error);

                    // Fetch related drills if any
                    if (video.relatedItems && video.relatedItems.length > 0) {
                        const ids = video.relatedItems.map((item: any) => typeof item === 'string' ? item : item.id);
                        getDrillsByIds(ids).then(({ data: drills }) => {
                            if (drills) setRelatedDrills(drills);
                        });
                    }
                });
            } else if (video.relatedItems && video.relatedItems.length > 0) {
                // Not logged in but still try to show related items if they are already objects
                // In this app, we usually need to fetch details.
                import('../../lib/api').then(({ getDrillsByIds }) => {
                    const ids = video.relatedItems.map((item: any) => typeof item === 'string' ? item : item.id);
                    getDrillsByIds(ids).then(({ data: drills }) => {
                        if (drills) setRelatedDrills(drills);
                    });
                });
            }
        }
    }, [user, video.id, video.creatorId, isActive]);

    // Handlers
    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!video.creatorId) return;

        // Optimistic UI
        const newStatus = !isFollowed;
        setIsFollowed(newStatus);

        try {
            const { toggleCreatorFollow } = await import('../../lib/api');
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
            const { toggleSparringLike } = await import('../../lib/api');
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
            const { toggleSparringSave } = await import('../../lib/api');
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

    // Use the robust common extractor
    const vimeoFullId = extractVimeoId(video.videoUrl);
    const [vimeoId, vimeoHash] = vimeoFullId?.split(':') || [vimeoFullId, null];
    // vimeoHash is re-calculated inside useEffect for options construction to ensure freshness
    // const vimeoHash = getVimeoHash(video.videoUrl);

    // Initialize Player
    useEffect(() => {
        if (!containerRef.current || !vimeoId || vimeoId === 'undefined' || vimeoId === 'null') return;
        if (offset !== 0) return;

        // Ensure vimeoId is actually a number or a valid string
        const numericId = Number(vimeoId);
        if (isNaN(numericId) && !String(vimeoId).includes(':')) {
            console.error('[SparringReel] Invalid vimeoId:', vimeoId);
            return;
        }

        if (playerRef.current) {
            // Keep if same
        } else {
            const rawUrl = video.videoUrl || '';
            const options: any = {
                background: true,
                loop: true,
                autoplay: false,
                muted: true,
                controls: false,
                playsinline: true
            };

            console.log('[SparringReel] Strategy - vimeoId:', vimeoId, 'vimeoHash:', vimeoHash);

            // Strategy: Manual Iframe for private videos (Vimeo Hash)
            if (vimeoId && vimeoHash) {
                const iframe = document.createElement('iframe');
                const params = new URLSearchParams();
                params.append('h', vimeoHash);
                params.append('title', '0');
                params.append('byline', '0');
                params.append('portrait', '0');
                params.append('badge', '0');
                params.append('autopause', '1');
                params.append('background', '1');
                params.append('player_id', containerRef.current.id || `vimeo-${vimeoId}`);

                iframe.src = `https://player.vimeo.com/video/${vimeoId}?${params.toString()}`;
                iframe.width = '100%';
                iframe.height = '100%';
                iframe.frameBorder = '0';
                iframe.allow = 'autoplay; fullscreen; picture-in-picture';
                iframe.className = 'w-full h-full'; // Remove static scale class
                iframe.style.setProperty('position', 'absolute', 'important');
                iframe.style.setProperty('top', '50%', 'important');
                iframe.style.setProperty('left', '50%', 'important');
                iframe.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
                iframe.style.setProperty('width', '177.78%', 'important');
                iframe.style.setProperty('height', '177.78%', 'important');
                iframe.style.setProperty('object-fit', 'cover', 'important');

                // Clear container and mount iframe
                containerRef.current.innerHTML = '';
                containerRef.current.appendChild(iframe);

                const player = new Player(iframe);
                player.ready().then(() => {
                    setIsPlayerReady(true);
                    playerRef.current = player;
                    player.on('timeupdate', (data) => {
                        setProgress(data.percent * 100);
                    });
                    if (isActive) {
                        player.play().catch(console.error);
                    }
                }).catch(err => {
                    console.error('Vimeo player init error (Manual Iframe):', err);
                });
            } else {
                // Public video or ID/URL - SDK handles it
                if (vimeoId) {
                    options.id = Number(vimeoId);
                } else if (rawUrl.startsWith('http')) {
                    options.url = rawUrl;
                }

                console.log('[SparringReel] Using SDK strategy with options:', options);
                const player = new Player(containerRef.current, options);

                player.ready().then(() => {
                    setIsPlayerReady(true);
                    playerRef.current = player;
                    player.on('timeupdate', (data) => {
                        setProgress(data.percent * 100);
                    });
                    if (isActive) {
                        player.play().catch(console.error);
                    }

                    // Force 1:1 aspect ratio on SDK-created iframe
                    const applySquareCrop = () => {
                        const iframe = containerRef.current?.querySelector('iframe');
                        if (iframe) {
                            iframe.style.setProperty('position', 'absolute', 'important');
                            iframe.style.setProperty('top', '50%', 'important');
                            iframe.style.setProperty('left', '50%', 'important');
                            iframe.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
                            iframe.style.setProperty('width', '177.78%', 'important');
                            iframe.style.setProperty('height', '177.78%', 'important');
                            iframe.style.setProperty('object-fit', 'cover', 'important');
                            console.log('[SparringReel] Applied 1:1 crop');
                        }
                    };

                    // Apply multiple times to ensure stability
                    applySquareCrop();
                    setTimeout(applySquareCrop, 100);
                    setTimeout(applySquareCrop, 300);
                    setTimeout(applySquareCrop, 600);
                }).catch(err => {
                    console.error('Vimeo player init error (SDK):', err);
                });
            }
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [vimeoId, offset]);

    // Handle Active State Changes
    useEffect(() => {
        if (!playerRef.current || !isPlayerReady) return;

        if (isActive && !isPaused) {
            playerRef.current.play().catch(() => {
                playerRef.current?.setVolume(0);
                setMuted(true);
                playerRef.current?.play().catch(console.error);
            });
        } else {
            playerRef.current.pause().catch(console.error);
            playerRef.current.setCurrentTime(0).catch(console.error);
        }
    }, [isActive, isPlayerReady, isPaused]);

    // Record View History
    useEffect(() => {
        if (isActive && user && video.id) {
            import('../../lib/api').then(({ recordSparringView }) => {
                recordSparringView(user.id, video.id).catch(console.error);
            });
        }
    }, [isActive, user, video.id]);

    // Watch time tracking for preview limit (1 min)
    useEffect(() => {
        if (!user && isActive) {
            // Start timer
            setWatchTime(0);
            timerRef.current = setInterval(() => {
                setWatchTime((prev: number) => {
                    const newTime = prev + 1;
                    if (newTime >= 30) {
                        // 30 seconds reached (updated from 60s)
                        setIsLoginModalOpen(true);
                        if (playerRef.current) {
                            playerRef.current.pause().catch(console.error);
                        }
                        if (timerRef.current) {
                            clearInterval(timerRef.current);
                        }
                    }
                    return newTime;
                });
            }, 1000);
        } else {
            // Clear timer when not active or user is logged in
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            setWatchTime(0);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [isActive, user]);

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

    // Click Handling for Play/Pause and Like
    const handleVideoClick = () => {
        if (clickTimeoutRef.current) {
            // Double click detected
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;

            // Trigger like
            handleLike();
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 800);
        } else {
            // Single click - wait to see if double click follows
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                // Toggle play/pause
                setIsPaused(!isPaused);
            }, 250);
        }
    };

    const renderVideoContent = () => {
        const isError = video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error');
        // Processing means we have a vimeoId but no full URL AND no thumbnail yet
        const isProcessing = vimeoId && !isPlayerReady && !isError && !video.thumbnailUrl;

        if (isError) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">영상 처리 실패</h3>
                    <p className="text-sm text-center text-zinc-400 mb-4 max-w-xs break-all">
                        {video.videoUrl.replace('ERROR:', '').trim()}
                    </p>
                </div>
            );
        }

        if (isProcessing) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-md text-white p-6 z-50">
                    <div className="relative w-20 h-20 mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clapperboard className="w-8 h-8 text-violet-500" />
                        </div>
                    </div>
                    <h3 className="text-2xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
                        영상을 처리 중입니다
                    </h3>
                    <p className="text-base text-center text-zinc-400 max-w-xs leading-relaxed">
                        Vimeo에서 고화질 인코딩을 진행하고 있습니다.<br />
                        잠시 후면 감상하실 수 있습니다! ✨
                    </p>
                    <div className="mt-8 flex gap-2">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
                        ))}
                    </div>
                </div>
            );
        }

        if (vimeoId) {
            return (
                <div
                    ref={containerRef}
                    className="absolute inset-0 w-full h-full overflow-hidden"
                    onClick={toggleMute}
                />
            );
        }

        return (
            <video
                ref={(el) => {
                    if (el && isActive) {
                        el.play().catch(() => {
                            setMuted(true);
                            if (el) el.muted = true;
                            if (el) el.play();
                        });
                        el.muted = muted;
                    } else if (el) {
                        el.pause();
                        el.currentTime = 0;
                    }
                }}
                src={video.videoUrl}
                className="w-full h-full object-cover"
                loop
                playsInline
                onClick={toggleMute}
                onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    const percent = (video.currentTime / video.duration) * 100;
                    setProgress(percent);
                }}
            />
        );
    };

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            <div className="w-full h-full relative flex items-start justify-center pt-24">
                <div className="relative w-full max-w-[min(100vw,calc(100vh-200px))] aspect-square z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    {renderVideoContent()}
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={handleVideoClick} />

                    {/* Like Animation */}
                    {showLikeAnimation && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <Heart
                                className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                                style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                            />
                        </div>
                    )}
                </div>

                {/* Background Blur Effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-30" />

                {/* Overlay Contents */}
                <div className="absolute inset-0 pointer-events-none z-40 flex justify-center">
                    <div className="relative w-full h-full max-w-[min(100vw,calc(100vh-200px))] flex">
                        {/* Back button Group - Sticks to left edge of video on web */}
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center py-6 pl-4 pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95 mb-4"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="flex-1 relative">
                            {/* Top-Right Group */}
                            <div className="absolute top-8 right-4 flex flex-col gap-4 z-50 pointer-events-auto items-center">
                                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-xl">
                                    {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                </button>
                            </div>

                            {/* Middle-Right Group: Heart, Save, Share, Techniques (MATCHING LIBRARY DETAIL) */}
                            <div className="absolute top-1/2 -translate-y-1/2 right-4 flex flex-col gap-5 z-50 pointer-events-auto items-center">
                                <div className="flex flex-col items-center gap-1">
                                    <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-3 md:p-3.5 rounded-full bg-black/50 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 transition-all active:scale-90 shadow-2xl">
                                        <Heart className={`w-6 h-6 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                    </button>
                                    <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{localLikes.toLocaleString()}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-3 md:p-3.5 rounded-full bg-black/50 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 transition-all active:scale-90 shadow-2xl">
                                    <Bookmark className={`w-6 h-6 md:w-7 md:h-7 ${isSaved ? 'fill-white' : ''}`} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-3 md:p-3.5 rounded-full bg-black/50 backdrop-blur-xl text-white border border-white/10 hover:bg-black/70 transition-all active:scale-90 shadow-2xl">
                                    <Share2 className="w-6 h-6 md:w-7 md:h-7" />
                                </button>

                                {/* Group for Related Techniques (Matching SparringDetail Sidebar icon style if needed, 
                                    but here we show the cards directly. User image 2 shows small cards above name.) */}
                            </div>

                            {/* Bottom Info - Techniques Hooks & Metadata */}
                            <div className="absolute bottom-24 left-0 right-0 w-full px-4 z-[60] text-white flex flex-col items-start gap-4 pointer-events-none">
                                {/* LEARN THIS Cards (Horizontal Scroll) */}
                                {relatedDrills.length > 0 && (
                                    <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pointer-events-auto pb-2 -mx-2 px-2">
                                        {relatedDrills.map((drill) => (
                                            <div
                                                key={drill.id}
                                                onClick={(e) => { e.stopPropagation(); navigate(`/drills/${drill.id}`); }}
                                                className="flex-shrink-0 w-44 md:w-56 p-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 hover:border-violet-500/50 transition-all cursor-pointer group"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 shrink-0 flex items-center justify-center relative">
                                                        {drill.thumbnailUrl ? (
                                                            <img src={drill.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                                        ) : (
                                                            <Play className="w-4 h-4 text-white/30" />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Play className="w-6 h-6 text-white fill-white/20" />
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                        <span className="text-[10px] md:text-[11px] font-black text-violet-400 uppercase tracking-widest mb-0.5">LEARN THIS</span>
                                                        <h4 className="text-[12px] md:text-sm font-bold text-white leading-tight line-clamp-2">{drill.title}</h4>
                                                    </div>
                                                    <div className="flex items-center">
                                                        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="w-full pointer-events-auto pr-24 bg-gradient-to-t from-black/60 to-transparent p-4 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                    <div className="flex items-center gap-3 mb-4">
                                        {video.category && (
                                            <div className={`inline-block px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-tighter uppercase border ${video.category === 'Competition'
                                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                }`}>
                                                {video.category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                                            </div>
                                        )}
                                    </div>

                                    {video.creator && (
                                        <div className="flex items-center gap-3 mb-4">
                                            <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                <div className="relative">
                                                    <img src={(video.creator as any).avatar_url || (video.creator as any).image || (video.creator as any).profileImage || `https://ui-avatars.com/api/?name=${video.creator.name}`} className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shadow-xl" />
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-violet-500 rounded-full border-2 border-black flex items-center justify-center">
                                                        <CheckCircle className="w-2.5 h-2.5 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-base drop-shadow-md">{video.creator.name}</span>
                                                </div>
                                            </Link>
                                            <span className="text-white/40 text-xs mt-0.5">•</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-black border-2 transition-all active:scale-95 shadow-lg ${isFollowed ? 'bg-white/10 text-white border-white/20' : 'bg-violet-600 text-white border-violet-500 hover:bg-violet-500 hover:border-violet-400'}`}>
                                                {isFollowed ? 'Following' : 'Follow'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="mb-2">
                                        <h3 className="font-black text-2xl md:text-4xl leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] line-clamp-2">{video.title}</h3>
                                    </div>
                                    {video.description && (
                                        <p className="text-sm md:text-base text-white/70 line-clamp-2 max-w-xl font-medium drop-shadow-md">{video.description}</p>
                                    )}
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
            </div>

            {/* Progress Bar / Teaser Bar */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!user ? 'h-1.5 bg-violet-900/30' : 'h-[2px] bg-zinc-800/50'}`}>
                <div
                    className={`h-full transition-all ease-linear ${!user ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] duration-1000' : 'bg-violet-400 duration-100'}`}
                    style={{ width: `${!user ? (watchTime / 30) * 100 : progress}%` }}
                />
            </div>

            {/* Login Modal for non-logged-in users */}
            <ReelLoginModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                redirectUrl={`/watch?tab=sparring&id=${video.id}`}
            />
        </div>
    );
};
