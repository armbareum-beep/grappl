import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSparringVideos, getDailyFreeSparring } from '../lib/api';
import { SparringVideo } from '../types';
import { Search, ChevronDown, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

import { cn } from '../lib/utils';
/* eslint-disable react-hooks/exhaustive-deps */

import { SparringReelItem } from '../components/reels/SparringReelItem';

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

import { LibraryTabs } from '../components/library/LibraryTabs';

export const SparringFeed: React.FC<{
    isEmbedded?: boolean;
    activeTab?: 'classes' | 'routines' | 'sparring';
    onTabChange?: (tab: 'classes' | 'routines' | 'sparring') => void;
    forceViewMode?: 'grid' | 'reels';
}> = ({ isEmbedded, activeTab, onTabChange, forceViewMode }) => {
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const { user, isSubscribed, isAdmin } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const [dailyFreeId, setDailyFreeId] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [purchasedItemIds, setPurchasedItemIds] = useState<string[]>([]);

    // Fetch user purchases
    useEffect(() => {
        if (user) {
            import('../lib/supabase').then(({ supabase }) => {
                supabase
                    .from('purchases')
                    .select('product_id')
                    .eq('user_id', user.id)
                    .eq('status', 'completed')
                    .then(({ data }) => {
                        if (data) {
                            setPurchasedItemIds(data.map((p: any) => p.product_id));
                        }
                    });
            });
        }
    }, [user]);

    const initialView = searchParams.get('view') === 'grid' ? 'grid' : 'reels';
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>(forceViewMode || (isEmbedded ? 'grid' : initialView));

    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalCategory, setInternalCategory] = useState<string>('All');

    const searchTerm = internalSearchTerm;
    const selectedCategory = internalCategory;

    const [selectedUniform, setSelectedUniform] = useState('All');
    const [selectedOwnership, setSelectedOwnership] = useState<string>('All');
    const [openDropdown, setOpenDropdown] = useState<'uniform' | 'ownership' | null>(null);
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
                setDailyFreeId(dailyRes.data.id);
                // Ensure daily free video is in the list
                const exists = loadedVideos.some(v => v.id === dailyRes.data!.id);
                if (!exists) {
                    loadedVideos = [dailyRes.data as unknown as SparringVideo, ...loadedVideos];
                }
            }

            if (loadedVideos.length > 0) {
                const shuffled = [...loadedVideos];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }
                setVideos(shuffled);
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
                        {(searchTerm ? filteredVideos : videos).length > 0 ? (
                            (searchTerm ? filteredVideos : videos).map((video, idx) => (
                                <SparringReelItem
                                    key={video.id}
                                    video={video}
                                    isActive={idx === activeIndex}
                                    offset={idx - activeIndex}
                                    isDailyFreeSparring={dailyFreeId === video.id}
                                    isSubscriber={isSubscribed || isAdmin}
                                    purchasedItemIds={purchasedItemIds}
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

                            {/* Reset Filter Button */}
                            {(selectedCategory !== 'All' || searchTerm || selectedUniform !== 'All' || selectedOwnership !== 'All') && (
                                <button
                                    onClick={() => {
                                        setInternalCategory('All');
                                        isEmbedded ? setInternalSearchTerm('') : setSearchParams({});
                                        setSelectedUniform('All');
                                        setSelectedOwnership('All');
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
                                    {dailyFreeId === video.id && (
                                        <div className="absolute top-2 left-2 px-2 py-1 bg-violet-600/90 backdrop-blur-md rounded-md shadow-lg border border-violet-400/20 z-10">
                                            <span className="text-[10px] font-bold text-white tracking-wide">오늘의 무료</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                        <Play className="w-4 h-4" />
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
