
import React, { useRef, useState, useEffect } from 'react';
import { Drill } from '../../types';
import { Heart, Bookmark, Share2, Play, Zap, MessageCircle, ListVideo, Volume2, VolumeX, ChevronLeft, AlertCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { ReelLoginModal } from '../auth/ReelLoginModal';
import Player from '@vimeo/player';

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
    isSubscriber: boolean;
    purchasedItemIds: string[];
    isLoggedIn: boolean;
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
    offset,
    isSubscriber,
    purchasedItemIds,
    isLoggedIn
}) => {

    // Internal state
    const [isPlaying, setIsPlaying] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [currentVideoType, setCurrentVideoType] = useState<'main' | 'description'>('main');
    const [progress, setProgress] = useState(0);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [loadError, setLoadError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const navigate = useNavigate();
    const videoRef = useRef<HTMLVideoElement>(null); // For HTML5 Video
    const vimeoContainerRef = useRef<HTMLDivElement>(null); // For Vimeo Player
    const playerRef = useRef<Player | null>(null);

    // Helpers to extract ID/Hash
    const extractVimeoId = (url?: string) => {
        if (!url) return undefined;
        if (/^\d+$/.test(url)) return url;
        if (url.includes(':')) {
            const [id] = url.split(':');
            return /^\d+$/.test(id) ? id : undefined;
        }
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : undefined;
    };

    const getVimeoHash = (url?: string) => {
        if (!url) return undefined;
        if (url.includes(':')) {
            const [, hash] = url.split(':');
            return hash;
        }
        const match = url.match(/[?&]h=([a-z0-9]+)/i);
        return match ? match[1] : undefined;
    };

    const isActionVideo = currentVideoType === 'main';
    const rawVimeoUrl = isActionVideo
        ? drill.vimeoUrl
        : (drill.descriptionVideoUrl || drill.vimeoUrl);

    const vimeoId = extractVimeoId(rawVimeoUrl);
    const vimeoHash = getVimeoHash(rawVimeoUrl);
    const useVimeo = !!vimeoId;

    // Reset state when drill changes or becomes active/inactive
    useEffect(() => {
        if (!isActive) {
            setIsPlaying(false);
            const timer = setTimeout(() => setCurrentVideoType('main'), 500);
            return () => clearTimeout(timer);
        } else {
            setIsPlaying(true);
            setWatchTime(0);
        }
    }, [isActive]);

    // Auto-check Vimeo processing status when processing is detected
    useEffect(() => {
        const isProcessing = !useVimeo && (!drill.videoUrl || drill.videoUrl.includes('placeholder') || drill.videoUrl.includes('placehold.co'));

        if (!isProcessing) {
            return; // No need to poll if not processing
        }

        // Poll for processing completion
        const pollInterval = setInterval(async () => {
            try {
                // Re-fetch drill data from Supabase to check if video URL is updated
                const { supabase } = await import('../../lib/supabase');
                const { data, error } = await supabase
                    .from('drills')
                    .select('vimeo_url, video_url, description_video_url')
                    .eq('id', drill.id)
                    .single();

                if (!error && data) {
                    // If video URL was updated (no longer placeholder), trigger re-render by updating parent
                    if (data.vimeo_url && !data.vimeo_url.includes('placeholder')) {
                        // The parent component should re-render with updated drill data
                        // This will happen naturally through prop changes
                        console.log('[DrillReel] Processing complete, video URL updated:', data.vimeo_url);
                    }
                }
            } catch (err) {
                console.error('[DrillReel] Polling error:', err);
            }
        }, 3000); // Poll every 3 seconds while processing

        return () => clearInterval(pollInterval);
    }, [useVimeo, drill.videoUrl, drill.id]);

    // Watch time tracking for non-logged-in users
    useEffect(() => {
        if (!isLoggedIn && isActive && currentVideoType === 'main') {
            setWatchTime(0);
            timerRef.current = setInterval(() => {
                setWatchTime((prev) => {
                    const newTime = prev + 1;
                    if (newTime >= 5) {
                        setIsLoginModalOpen(true);
                        setIsPlaying(false);
                        if (timerRef.current) clearInterval(timerRef.current);
                    }
                    return newTime;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isActive, isLoggedIn, currentVideoType]);

    // Cleanup players on unmount
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                playerRef.current.destroy().catch(() => { });
                playerRef.current = null;
            }
        };
    }, []);


    // Fallback HTML5 src
    const videoSrc = isActionVideo
        ? (drill.videoUrl || '/placeholder-drill.mp4')
        : (drill.descriptionVideoUrl || drill.videoUrl || '/placeholder-drill-desc.mp4');


    // Initialize/Update Vimeo Player
    useEffect(() => {
        if (!useVimeo || !vimeoContainerRef.current) {
            // If switching away from Vimeo, destroy player
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
            return;
        }

        // Initialize Player if not exists or if ID changed
        // Note: SDK does not support changing video easily without loadVideo(), 
        // but re-creating player is safer for hash handling.

        let currentPlayer = playerRef.current;

        // Check if we need to re-initialize (different video)
        // We can't easily check current video ID from player instance without async call
        // So we'll simple destroy and recreate if the ID/hash target changes
        // Optimization: In a real app we might use loadVideo({id, h}) if player exists.

        if (currentPlayer) {
            currentPlayer.destroy().then(createPlayer);
        } else {
            createPlayer();
        }

        function createPlayer() {
            if (!vimeoContainerRef.current) return;

            console.log('[DrillReel] Creating Player:', { vimeoId, vimeoHash });
            setLoadError(null);
            setVideoReady(false);

            const options: any = {
                background: true,
                autoplay: isActive,
                loop: true,
                muted: isMuted,
                autopause: false,
                controls: false,
                responsive: true
            };

            if (vimeoHash) {
                options.url = `https://vimeo.com/${vimeoId}/${vimeoHash}`;
            } else {
                options.id = Number(vimeoId);
            }

            const player = new Player(vimeoContainerRef.current, options);
            playerRef.current = player;

            player.ready().then(() => {
                console.log('[DrillReel] Player Ready');
                setVideoReady(true);
                // Ensure volume sync
                player.setVolume(isMuted ? 0 : 1);
            }).catch(error => {
                console.error('[DrillReel] Player Error:', error);
                setLoadError('영상을 불러올 수 없습니다');
            });

            player.on('play', () => setIsPlaying(true));
            player.on('pause', () => setIsPlaying(false));
            player.on('timeupdate', (data) => {
                setProgress(data.percent * 100);
            });
            player.on('error', (err) => {
                console.error('[DrillReel] Playback Error:', err);
                // If "Password required" or "Privacy", this fires
                setLoadError('재생할 수 없는 영상입니다 (Privacy/Error)');
            });
        }

    }, [vimeoId, vimeoHash, useVimeo]); // Depend on ID/Hash to recreate

    // Control Playback/Mute when props change
    useEffect(() => {
        const player = playerRef.current;
        if (player && videoReady) {
            if (isActive && isPlaying) {
                player.play().catch(e => console.log('Vimeo play failed', e));
            } else {
                player.pause().catch(e => console.log('Vimeo pause failed', e));
            }
            player.setVolume(isMuted ? 0 : 1).catch(() => { });
        }
    }, [isActive, isPlaying, isMuted, videoReady]);

    // Touch handling for swipe
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const hasAccessToAction = isLoggedIn || watchTime < 5;
    const hasAccessToDescription = isLoggedIn && (isSubscriber || purchasedItemIds.includes(drill.id));

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart) return;

        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const xDistance = touchStart.x - touchEnd.x;
        const yDistance = touchStart.y - touchEnd.y;

        // Horizontal swipe only
        if (Math.abs(xDistance) > Math.abs(yDistance) && Math.abs(xDistance) > 50) {
            if (xDistance > 0) {
                // Swipe Left -> Show Description
                if (currentVideoType === 'main') {
                    if (hasAccessToDescription) {
                        setCurrentVideoType('description');
                    } else {
                        if (!isLoggedIn) {
                            alert('설명 영상은 로그인이 필요합니다.');
                            navigate('/login');
                        } else {
                            alert('설명 영상은 구독자 전용입니다.');
                        }
                    }
                }
            } else {
                // Swipe Right -> Show Main
                if (currentVideoType === 'description') {
                    if (hasAccessToAction) {
                        setCurrentVideoType('main');
                    } else {
                        navigate('/login');
                    }
                }
            }
        }
        setTouchStart(null);
    };

    // Rendering
    const isProcessing = !useVimeo && (!drill.videoUrl || drill.videoUrl.includes('placeholder') || drill.videoUrl.includes('placehold.co'));

    if (isProcessing) {
        return (
            <div
                className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-950"
                style={{ transform: `translateY(${offset * 100}%)` }}
            >
                <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-white mb-2">영상 처리 중입니다...</h2>
                <p className="text-slate-400 text-center max-w-xs mb-8">잠시만 기다려주세요.</p>
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
                    <div className="relative w-full h-full bg-black">

                        {loadError ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400">
                                <AlertCircle className="w-10 h-10 mb-2 text-red-500" />
                                <p>{loadError}</p>
                                {useVimeo && !vimeoHash && <p className="text-xs mt-2 text-zinc-600">ID found but Hash missing</p>}
                            </div>
                        ) : useVimeo ? (
                            <div
                                ref={vimeoContainerRef}
                                className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                                style={{ opacity: isActive ? 1 : 0 }}
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
                                onTimeUpdate={(e) => {
                                    const video = e.currentTarget;
                                    setProgress((video.currentTime / video.duration) * 100);
                                }}
                                onPlaying={() => { setIsPlaying(true); setVideoReady(true); }}
                                onPause={() => setIsPlaying(false)}
                                onWaiting={() => setVideoReady(false)}
                            />
                        )}

                        {/* Click Overlay */}
                        <div
                            className="absolute inset-0 z-30"
                            onClick={() => setIsPlaying(!isPlaying)}
                        />

                        {/* Loading/Thumbnail Overlay */}
                        {!videoReady && !loadError && (
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

                        {/* Play Icon */}
                        {!isPlaying && isActive && videoReady && !loadError && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/30 pointer-events-none">
                                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                    <Play className="w-8 h-8 text-black ml-1" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description Locked Overlay */}
                    {currentVideoType === 'description' && !hasAccessToDescription && (
                        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-md text-center">
                            <div className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center mb-6">
                                <MessageCircle className="w-10 h-10 text-zinc-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">설명 영상은 {isLoggedIn ? '구독자 전용' : '로그인'}입니다</h3>
                            <p className="text-zinc-400 text-sm mb-8 max-w-xs">
                                {isLoggedIn ? '이 기술의 상세한 설명과 원리를 확인하시려면 구독을 시작해보세요.' : '설명 영상을 시청하시려면 로그인이 필요합니다.'}
                            </p>
                            {!isLoggedIn ? (
                                <button onClick={() => navigate('/login')} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-zinc-200">
                                    로그인하기
                                </button>
                            ) : (
                                <button onClick={() => navigate('/pricing')} className="px-8 py-3 bg-violet-600 text-white font-bold rounded-full hover:bg-violet-700">
                                    멤버십 확인하기
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Right Controls */}
            {isActive && (
                <div className="absolute inset-0 z-40 pointer-events-none flex justify-center">
                    <div className="relative h-full w-full max-w-[56.25vh] flex">
                        <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center py-6 pl-4 pointer-events-auto">
                            <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 mb-4">
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                            <div className="flex flex-col gap-2 bg-black/30 backdrop-blur-sm p-1.5 rounded-full border border-white/10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setCurrentVideoType('main'); }}
                                    className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'main' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <Zap className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'main' ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (hasAccessToDescription) setCurrentVideoType('description');
                                        else if (!isLoggedIn) navigate('/login');
                                        else navigate('/pricing');
                                    }}
                                    className={`p-2 md:p-2.5 rounded-full transition-all ${currentVideoType === 'description' ? 'bg-white text-black shadow-lg scale-110' : 'text-white/70 hover:bg-white/10'}`}
                                >
                                    <MessageCircle className="w-5 h-5 md:w-5 md:h-5" fill={currentVideoType === 'description' ? (hasAccessToDescription ? "currentColor" : "none") : "none"} />
                                    {!hasAccessToDescription && <div className="absolute -top-1 -right-1 w-3 h-3 bg-violet-600 rounded-full flex items-center justify-center"><Zap className="w-2 h-2 text-white" fill="currentColor" /></div>}
                                </button>
                            </div>
                        </div>

                        <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-6 pointer-events-auto">
                            <div className="flex flex-col gap-3 items-center pr-4">
                                <button onClick={(e) => { e.stopPropagation(); onToggleMute(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60">
                                    {isMuted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                                </button>
                            </div>
                            <div className="flex flex-col gap-3 items-center pr-4 pb-24">
                                <div className="flex flex-col items-center gap-0.5">
                                    <button onClick={(e) => { e.stopPropagation(); onLike(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                        <Heart className={`w-5 h-5 md:w-7 md:h-7 ${isLiked ? 'fill-violet-500 text-violet-500' : ''}`} />
                                    </button>
                                    <span className="text-[10px] md:text-sm font-bold text-white shadow-black drop-shadow-md">{likeCount}</span>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); onViewRoutine(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                    <ListVideo className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onSave(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                    <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-zinc-100' : ''}`} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); onShare(); }} className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 active:scale-90">
                                    <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="absolute left-0 right-0 w-full bottom-24 px-6 z-40 pointer-events-none">
                <div className="flex items-end justify-between max-w-[56.25vh] mx-auto pointer-events-auto">
                    <div className="flex-1 pr-16">
                        <div className="inline-block px-2 py-0.5 bg-yellow-600 rounded text-[10px] font-bold uppercase tracking-wider mb-2">DRILL</div>
                        <div className="flex items-center gap-3 mb-3">
                            <Link to={`/creator/${drill.creatorId}`} className="flex items-center gap-2 hover:opacity-80">
                                {(drill as any).creatorProfileImage && (
                                    <img src={(drill as any).creatorProfileImage} alt="" className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                )}
                                <span className="text-white font-bold text-sm drop-shadow-sm">{drill.creatorName || 'Instructor'}</span>
                            </Link>
                            <span className="text-white/60 text-xs">•</span>
                            <button onClick={(e) => { e.stopPropagation(); onFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                {isFollowed ? 'Following' : 'Follow'}
                            </button>
                        </div>
                        <h2 className="text-white font-bold text-base mb-2 line-clamp-2 drop-shadow-sm">
                            {drill.title}
                            {currentVideoType === 'description' && <span className="text-sm font-normal text-white/70 ml-2">(설명)</span>}
                        </h2>
                        {drill.tags && drill.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-3">
                                {(drill.tags || []).slice(0, 3).map((tag, idx) => (
                                    <span key={idx} className="text-white/90 text-sm">#{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className={`absolute bottom-0 left-0 right-0 z-50 transition-all ${!isLoggedIn && currentVideoType === 'main' ? 'h-1.5 bg-violet-900/30' : 'h-[2px] bg-zinc-800/50'}`}>
                <div className={`h-full transition-all ease-linear ${!isLoggedIn && currentVideoType === 'main' ? 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] duration-1000' : 'bg-violet-400 duration-100'}`} style={{ width: `${!isLoggedIn && currentVideoType === 'main' ? (watchTime / 5) * 100 : progress}%` }} />
            </div>

            <ReelLoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} redirectUrl={`/watch?tab=drill&id=${drill.id}`} />
        </div>
    );
};
