import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparringVideo } from '../../types';
import { Share2, Volume2, VolumeX, Bookmark, Heart, ChevronLeft, Clapperboard } from 'lucide-react';
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
}

export const SparringReelItem: React.FC<SparringReelItemProps> = ({ video, isActive, offset, isDailyFreeSparring }) => {
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
    const navigate = useNavigate();

    // Login modal state for non-logged-in users
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Check interaction status on load
    useEffect(() => {
        if (user && video.creatorId) {
            import('../../lib/api').then(({ getSparringInteractionStatus }) => {
                getSparringInteractionStatus(user.id, video.id, video.creatorId)
                    .then(status => {
                        setIsFollowed(status.followed);
                        setIsLiked(status.liked);
                        setIsSaved(status.saved);
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
        if (!containerRef.current || !vimeoId) return;
        if (offset !== 0) return;

        if (playerRef.current) {
            // Keep if same
        } else {
            const rawUrl = video.videoUrl || '';
            const options: any = {
                responsive: true,
                background: true,
                loop: true,
                autoplay: false,
                muted: true,
                controls: false,
                playsinline: true
            };

            // Handle different URL formats
            if (vimeoHash) {
                // If we have a hash, use the canonical private video URL format
                options.url = `https://vimeo.com/${vimeoId}/${vimeoHash}`;
                console.log('[SparringReel] Private Video URL:', options.url);
            } else if (vimeoId) {
                options.id = Number(vimeoId);
                console.log('[SparringReel] Public Video ID:', vimeoId);
            } else if (rawUrl.startsWith('http')) {
                options.url = rawUrl;
                console.log('[SparringReel] Direct URL Fallback:', rawUrl);
            }

            console.log('[SparringReel] Final options:', options);
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
            }).catch(err => {
                console.error('Vimeo player init error:', err);
            });
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

    // Watch time tracking for non-logged-in users
    useEffect(() => {
        if (!user && isActive && !isDailyFreeSparring) {
            // Start timer
            setWatchTime(0);
            timerRef.current = setInterval(() => {
                setWatchTime((prev: number) => {
                    const newTime = prev + 1;
                    if (newTime >= 5) {
                        // 5 seconds reached, show login modal and pause video
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
                    className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:scale-150"
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
                                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-3 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl">
                                    {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                </button>

                            </div>

                            {/* Middle-Right Group: Heart, Save, Share */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="relative w-full aspect-square">
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
                                </div>
                            </div>

                            {/* Bottom Info - Moved out of aspect-square to stay at screen bottom */}
                            <div className="absolute bottom-24 left-0 right-0 w-full px-4 z-[60] text-white flex flex-col items-start gap-1 pointer-events-none">
                                <div className="w-full pointer-events-auto pr-16 bg-black/30 md:bg-transparent p-4 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                    <div className="inline-block px-2 py-0.5 bg-indigo-600 rounded text-[10px] font-bold uppercase tracking-wider mb-2">SPARRING</div>

                                    {video.creator && (
                                        <div className="flex items-center gap-3 mb-3">
                                            <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                                <img src={(video.creator as any).avatar_url || (video.creator as any).image || (video.creator as any).profileImage || `https://ui-avatars.com/api/?name=${video.creator.name}`} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                                <span className="text-white font-bold text-sm drop-shadow-sm">{video.creator.name}</span>
                                            </Link>
                                            <span className="text-white/60 text-xs mt-0.5">•</span>
                                            <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                                {isFollowed ? 'Following' : 'Follow'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="mb-2">
                                        <h3 className="font-black text-xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2 md:text-3xl">{video.title}</h3>
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
            </div>

            {/* Progress Bar / Teaser Bar */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!user ? 'h-1.5 bg-violet-900/30' : 'h-[2px] bg-zinc-800/50'}`}>
                <div
                    className={`h-full transition-all ease-linear ${!user ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] duration-1000' : 'bg-violet-400 duration-100'}`}
                    style={{ width: `${!user ? (watchTime / 5) * 100 : progress}%` }}
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
