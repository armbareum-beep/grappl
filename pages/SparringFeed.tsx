import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSparringVideos } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, Share2, ChevronLeft, ChevronRight, Volume2, VolumeX, Bookmark, Grid, Search, X, PlaySquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* eslint-disable react-hooks/exhaustive-deps */
import Player from '@vimeo/player';

const VideoItem: React.FC<{
    video: SparringVideo;
    isActive: boolean;
    onChangeView: () => void;
}> = ({ video, isActive, onChangeView }) => {
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

    // Check interaction status on load
    useEffect(() => {
        if (user && video.creatorId) {
            import('../lib/api').then(({ getSparringInteractionStatus }) => {
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

    // Helper to get Vimeo ID
    const getVimeoId = (url: string) => {
        if (!url) return null;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    const vimeoId = getVimeoId(video.videoUrl);

    // Initialize Player
    useEffect(() => {
        if (!containerRef.current || !vimeoId) return;

        if (playerRef.current) {
            playerRef.current.destroy();
        }

        const player = new Player(containerRef.current, {
            id: Number(vimeoId),
            width: window.innerWidth,
            background: true,
            loop: true,
            autoplay: false,
            muted: true,
            controls: false,
            dnt: true
        });

        player.ready().then(() => {
            setIsPlayerReady(true);
            playerRef.current = player;
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
                playerRef.current?.setVolume(0);
                setMuted(true);
                playerRef.current?.play().catch(console.error);
            });
        } else {
            playerRef.current.pause().catch(console.error);
            playerRef.current.setCurrentTime(0).catch(console.error);
        }
    }, [isActive, isPlayerReady]);

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
            />
        );
    };

    return (
        <>
            <div className="w-full h-[calc(100vh-56px)] sm:h-screen relative snap-start shrink-0 bg-black flex items-start justify-center overflow-hidden pt-16">
                <div className="relative w-full max-w-[min(100vw,calc(100vh-200px))] aspect-square z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    {renderVideoContent()}
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={toggleMute} />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-30" />
                <div className="absolute inset-0 pointer-events-none flex items-start justify-center pt-16 z-40">
                    <div className="relative w-full max-w-[min(100vw,calc(100vh-200px))] aspect-square">
                        {/* Top-Right Group: Speaker & Grid View */}
                        <div className="absolute top-4 right-4 flex flex-col gap-3 z-50 pointer-events-auto items-center">
                            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-xl">
                                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onChangeView(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-xl">
                                <Grid className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Bottom-Right Group: Heart, Save, Share */}
                        <div className="absolute bottom-4 right-4 flex flex-col gap-4 z-50 pointer-events-auto items-center">
                            <div className="flex flex-col items-center gap-1">
                                <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-xl">
                                    <Heart className={`w-6 h-6 ${isLiked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                                </button>
                                <span className="text-[11px] font-bold text-white drop-shadow-md">{localLikes.toLocaleString()}</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); handleSave(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-xl">
                                <Bookmark className={`w-6 h-6 ${isSaved ? 'fill-white' : ''}`} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare(); }} className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-xl">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
                <div className="fixed left-0 right-0 w-full bottom-24 px-6 z-[60] text-white flex flex-col items-start gap-1 pointer-events-none">
                    <div className="w-full pointer-events-auto pr-16">
                        {/* Learn This - Moved above Title */}
                        {video.relatedItems && video.relatedItems.length > 0 && (
                            <div className="w-full pointer-events-auto mb-4">
                                <div className="flex flex-row gap-3 overflow-x-auto flex-nowrap pb-2 scrollbar-hide snap-x">
                                    {video.relatedItems.map((item, idx) => (
                                        <Link key={idx} to={item.type === 'drill' ? `/drills/${item.id}` : `/courses/${item.id}`} className="snap-start flex items-center justify-between gap-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-3 min-w-[200px] hover:bg-zinc-900 transition-all active:scale-95 group shadow-2xl">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10px] text-violet-400 font-black tracking-wider uppercase mb-0.5">Learn This</span>
                                                <span className="text-sm font-bold text-white truncate leading-tight group-hover:text-violet-300 transition-colors uppercase">{item.title}</span>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-violet-400 group-hover:text-white transition-colors shrink-0" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {video.creator && (
                            <div className="flex items-center gap-3 mb-3">
                                <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                    <img src={(video.creator as any).avatar_url || (video.creator as any).image || `https://ui-avatars.com/api/?name=${video.creator.name}`} className="w-8 h-8 rounded-full border border-white/20 object-cover" />
                                    <span className="text-white font-bold text-sm drop-shadow-sm">{video.creator.name}</span>
                                </Link>
                                <span className="text-white/60 text-xs mt-0.5">•</span>
                                <button onClick={(e) => { e.stopPropagation(); handleFollow(); }} className={`px-4 py-1.5 rounded-full text-[11px] font-bold border transition-all active:scale-95 ${isFollowed ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}>
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>
                        )}
                        <div className="mb-4">
                            <h3 className="font-black text-2xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">{video.title}</h3>
                        </div>
                        <p className="text-sm text-white/90 line-clamp-1 drop-shadow-sm" onClick={(e) => e.stopPropagation()}>{video.description}</p>
                    </div>
                </div>
            </div>
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={video.title} text={`${video.creator?.name}님의 스파링 영상을 확인해보세요`} />
                )}
            </React.Suspense>
        </>
    );
};

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

export const SparringFeed: React.FC = () => {
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('search');
    const [selectedUniform, setSelectedUniform] = useState<string>('All');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        const { data } = await getSparringVideos();
        if (data) {
            const shuffled = [...data];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setVideos(shuffled);
        }
    };

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
        const matchesCategory = selectedCategory === 'All' || video.category === selectedCategory;

        return matchesSearch && matchesUniform && matchesCategory;
    });

    if (viewMode === 'reels') {
        return (
            <div className="fixed inset-0 bg-black z-50 flex flex-col md:pl-28 overflow-hidden">
                {/* Header Controls (Minimal - just back button) */}
                <div className="absolute top-0 left-0 right-0 md:left-28 z-50 p-6 flex justify-between items-center w-full pointer-events-none">
                    <button
                        onClick={() => navigate(-1)}
                        className="pointer-events-auto p-2.5 rounded-full bg-zinc-900/50 backdrop-blur-md border border-zinc-800 text-zinc-100 hover:bg-zinc-800 transition-all"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    {/* Note: View toggle is inside VideoItem for Reels view */}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 relative overflow-hidden">
                    <div ref={containerRef} className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar">
                        {/* If filtered videos are empty (e.g. from search), show all or handle nicely. 
                            Usually Reels view ignores search unless navigated from search grid. 
                            Here we use filteredVideos if we have them, else all. */}
                        {(searchTerm ? filteredVideos : videos).length > 0 ? (
                            (searchTerm ? filteredVideos : videos).map((video, idx) => (
                                <VideoItem key={video.id} video={video} isActive={idx === activeIndex} onChangeView={() => setViewMode('grid')} />
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
        <div className="min-h-screen bg-zinc-950 md:pl-28 pt-8 pb-20 px-6 md:px-10">
            <div className="max-w-[1600px] mx-auto">
                {/* Filter Capsuled Buttons */}
                <div className="flex flex-col gap-6 mb-12">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-3 whitespace-nowrap">Uniform</span>
                        {['All', 'Gi', 'No-Gi'].map(type => (
                            <button
                                key={type}
                                onClick={() => setSelectedUniform(type)}
                                className={`px-6 py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap border ${selectedUniform === type
                                    ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide no-scrollbar">
                        <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mr-3 whitespace-nowrap">Category</span>
                        {['All', 'Sparring', 'Competition'].map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap border ${selectedCategory === cat
                                    ? 'bg-violet-600 border-violet-500 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)]'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Header (Search & Toggle) */}
                <div className="flex items-center justify-between gap-6 mb-12">
                    <div className="flex items-center gap-3 w-full max-w-sm sm:max-w-md">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="스파링 검색..."
                                value={searchTerm || ''}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setSearchParams(prev => {
                                        if (value) prev.set('search', value);
                                        else prev.delete('search');
                                        return prev;
                                    });
                                }}
                                className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 pl-11 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-zinc-600 text-sm font-medium"
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchParams({ view: 'grid' })}
                                className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setViewMode('reels')}
                        className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-xl hover:text-violet-400 hover:border-violet-500/50 transition-all shadow-xl group whitespace-nowrap"
                    >
                        <PlaySquare className="w-4 h-4 transition-transform group-hover:scale-110" />
                        <span className="text-xs font-bold tracking-tight">릴스 뷰</span>
                    </button>
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 md:gap-8">
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
                                <div className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] group-hover:ring-1 group-hover:ring-violet-500/30">
                                    <img
                                        src={video.thumbnailUrl || (video.videoUrl && !video.videoUrl.startsWith('http') ? `https://vumbnail.com/${video.videoUrl}.jpg` : '')}
                                        alt={video.title}
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                        <PlaySquare className="w-4 h-4" />
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h3 className="text-zinc-100 text-sm font-bold line-clamp-1 mb-0.5 group-hover:text-violet-400 transition-colors">
                                        {video.title}
                                    </h3>
                                    <p className="text-zinc-500 text-[11px] font-medium">{video.creator?.name || 'Unknown'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
};
