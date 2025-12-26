import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSparringVideos } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, MessageCircle, Share2, MoreVertical, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

/* eslint-disable react-hooks/exhaustive-deps */
import Player from '@vimeo/player';

const VideoItem: React.FC<{
    video: SparringVideo;
    isActive: boolean;
}> = ({ video, isActive }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [muted, setMuted] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Interaction State
    const { user } = useAuth();
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const navigate = useNavigate();

    // Check interaction status on load
    useEffect(() => {
        if (user && video.creatorId) {
            import('../lib/api').then(({ getSparringInteractionStatus }) => {
                getSparringInteractionStatus(user.id, video.id, video.creatorId)
                    .then(status => {
                        setIsFollowed(status.followed);
                        setIsLiked(status.liked);
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

    const handleShare = async () => {
        const url = window.location.href; // Or specific URL if available
        if (navigator.share) {
            try {
                await navigator.share({
                    title: video.title,
                    text: `Check out this sparring video by ${video.creator?.name}`,
                    url
                });
            } catch (err) {
                console.log('Share aborted', err);
            }
        } else {
            // Fallback
            navigator.clipboard.writeText(url);
            alert('링크가 복사되었습니다!');
        }
    };

    // Helper to get Vimeo ID
    const getVimeoId = (url: string) => {
        if (!url) return null;
        // If it's just numbers, it's an ID
        if (/^\d+$/.test(url)) return url;
        // Try to extract from URL
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    const vimeoId = getVimeoId(video.videoUrl);

    // Initialize Player
    useEffect(() => {
        if (!containerRef.current || !vimeoId) return;

        // Cleanup previous player if exists
        if (playerRef.current) {
            playerRef.current.destroy();
        }

        const player = new Player(containerRef.current, {
            id: Number(vimeoId),
            width: window.innerWidth, // Responsive width
            background: true, // Use background mode for simpler UI
            loop: true,
            autoplay: false,
            muted: true,
            controls: false,
            dnt: true // Do Not Track
        });

        player.ready().then(() => {
            setIsPlayerReady(true);
            playerRef.current = player;

            // If active when ready, play
            if (isActive) {
                player.play().catch(console.error);
            }
        }).catch(err => {
            console.error('Vimeo player init error:', err);
        });

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, [vimeoId]);

    // Handle Active State Changes
    useEffect(() => {
        if (!playerRef.current || !isPlayerReady) return;

        if (isActive) {
            playerRef.current.play().catch(() => {
                // If play fails (e.g. requires mute), ensure muted and try again
                playerRef.current?.setVolume(0);
                setMuted(true);
                playerRef.current?.play().catch(console.error);
            });
        } else {
            playerRef.current.pause().catch(console.error);
            playerRef.current.setCurrentTime(0).catch(console.error);
        }
    }, [isActive, isPlayerReady]);

    // Handle Mute Toggle (Shared)
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

    // Render Content
    const renderVideoContent = () => {
        // 1. Vimeo Player
        if (vimeoId) {
            return (
                <div
                    ref={containerRef}
                    className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                    onClick={toggleMute}
                />
            );
        }

        // 2. Standard Video (Fallback / Generic MP4)
        return (
            <video
                ref={(el) => {
                    // Type casting/assertion workaround if needed, or simple ref callback
                    // We can reuse container logic or just manage it simply
                    if (el) {
                        if (isActive) el.play().catch(() => {
                            setMuted(true);
                            el.muted = true;
                            el.play();
                        });
                        else {
                            el.pause();
                            el.currentTime = 0;
                        }
                        el.muted = muted;
                    }
                }}
                src={video.videoUrl}
                className="w-full h-full object-contain"
                loop
                playsInline
                onClick={toggleMute}
            />
        );
    };

    return (
        <div className="w-full h-[calc(100vh-56px)] sm:h-screen relative snap-start shrink-0 bg-black flex items-center justify-center overflow-hidden">
            {/* Aspect Ratio Video Container */}
            <div className="relative w-full h-full">
                {renderVideoContent()}

                {/* CLICK OVERLAY FIX: Explicit layer for click-to-pause (actually mute toggle here as per req?) 
                    The user complained about "pause" but the current code calls toggleMute on click.
                    I'll keep it as toggleMute unless requested otherwise, but ensure it covers everything.
                */}
                <div
                    className="absolute inset-0 z-10"
                    onClick={toggleMute}
                />
            </div>

            {/* Gradient Overlay - pointer-events-none */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

            {/* Mute Indicator */}
            <div className="absolute top-4 right-4 z-40 pointer-events-none">
                {muted && (
                    <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm animate-pulse">
                        <span className="text-white text-xs font-bold px-2">Click to Unmute</span>
                    </div>
                )}
            </div>

            {/* Right Sidebar Actions - pointer-events-auto */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-30 pointer-events-auto">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleLike(); }}
                        className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-colors group"
                    >
                        <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : ''} group-hover:scale-110 transition-transform`} />
                    </button>
                    <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{localLikes}</span>
                </div>

                {/* Removed Comment Button as requested */}

                <button
                    onClick={(e) => { e.stopPropagation(); handleShare(); }}
                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-green-500 transition-colors"
                >
                    <Share2 className="w-7 h-7" />
                </button>

                <button className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
                    <MoreVertical className="w-6 h-6" />
                </button>
            </div>

            {/* Bottom Info Area - FIX: pointer-events-none on container, auto on children */}
            <div className="absolute left-0 right-0 bottom-0 p-4 pb-20 sm:pb-8 z-20 text-white flex flex-col items-start gap-4 pointer-events-none">
                {/* Related Technique Link (The "Hook") */}
                {video.relatedItems && video.relatedItems.length > 0 && (
                    <div className="flex flex-col gap-2 w-full max-w-sm pointer-events-auto">
                        {video.relatedItems.map((item, idx) => (
                            <Link
                                key={idx}
                                to={item.type === 'drill' ? `/drills/${item.id}` : `/courses/${item.id}`}
                                className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/20 p-3 rounded-xl hover:bg-black/80 transition-all group"
                            >
                                <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition-colors">
                                    <BookOpen className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-xs text-blue-300 font-bold uppercase mb-0.5">이 기술 배우기</p>
                                    <p className="text-sm font-semibold truncate text-white">{item.title}</p>
                                </div>
                                <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold group-hover:bg-white/20">
                                    이동
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Metadata */}
                <div className="max-w-[85%] pointer-events-auto">
                    <div className="flex items-center gap-3 mb-3">
                        {video.creator && (
                            <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80">
                                <img
                                    src={video.creator.profileImage || 'https://via.placeholder.com/40'}
                                    alt={video.creator.name}
                                    className="w-10 h-10 rounded-full border border-white/20"
                                />
                                <span className="font-bold text-shadow-sm">{video.creator.name}</span>
                            </Link>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                            className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10 transition-all ${isFollowed ? 'bg-white text-black hover:bg-gray-200' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                        >
                            {isFollowed ? 'Following' : 'Follow'}
                        </button>
                    </div>

                    <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight text-shadow-sm">{video.title}</h3>
                    <p className="text-sm text-white/80 line-clamp-2 text-shadow-sm">{video.description}</p>
                </div>
            </div>
        </div>
    );
};

export const SparringFeed: React.FC = () => {
    const { user, isCreator } = useAuth();
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        const { data } = await getSparringVideos();
        if (data) setVideos(data);
    };

    // Scroll Observer to detect active video
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

    // Deep Linking Effect
    const [searchParams] = useSearchParams();
    const initialId = searchParams.get('id');

    useEffect(() => {
        if (videos.length > 0 && initialId && containerRef.current) {
            const index = videos.findIndex(v => v.id === initialId);
            if (index !== -1) {
                // Set active index immediately
                setActiveIndex(index);

                // Scroll to position after a brief delay to ensure layout is ready
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

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="pointer-events-auto font-bold text-lg text-white drop-shadow-md">
                    Sparring
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Scroll Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                {videos.length > 0 ? (
                    videos.map((video, idx) => (
                        <VideoItem
                            key={video.id}
                            video={video}
                            isActive={idx === activeIndex}
                        />
                    ))
                ) : (
                    <div className="h-screen flex flex-col items-center justify-center text-slate-500 gap-4">
                        <p>아직 등록된 스파링 영상이 없습니다.</p>
                        {user && isCreator && (
                            <Button onClick={() => navigate('/creator/sparring/new')}>
                                첫 영상 올리기
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
