import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { extractVimeoId } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, Share2, ChevronLeft, Volume2, VolumeX, Bookmark, Search, PlayCircle, ChevronDown, MoreHorizontal, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ContentBadge } from '../components/common/ContentBadge';
import { ReelLoginModal } from '../components/auth/ReelLoginModal';
import { cn, calculateHotScore } from '../lib/utils';
import { VideoPlayer } from '../components/VideoPlayer';
import { ActionMenuModal } from '../components/library/ActionMenuModal';
import { LibraryTabs, LibraryTabType } from '../components/library/LibraryTabs';
import { useSparringFeed, useFeedPermissions } from '../hooks/use-feed-queries';
import { MarqueeText } from '../components/common/MarqueeText'; // New Import
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

/* eslint-disable react-hooks/exhaustive-deps */

import { SparringVideoItem, VideoItemRef } from '../components/library/SparringVideoItem';
import { SparringGridItem } from '../components/library/SparringGridItem';


export const SparringFeed: React.FC<{
    isEmbedded?: boolean;
    activeTab?: LibraryTabType;
    onTabChange?: (tab: LibraryTabType) => void;
    forceViewMode?: 'grid' | 'reels';
}> = ({ isEmbedded, activeTab, onTabChange, forceViewMode }) => {
    const { user } = useAuth();
    const [activeIndex, setActiveIndex] = useState(0);
    const [searchParams, setSearchParams] = useSearchParams();

    // Caching for seen videos
    const [cachedIndices, setCachedIndices] = useState<number[]>([]);
    const MAX_CACHE_SIZE = 100; // 세션 내 시청한 모든 영상 캐시
    const prevIndexRef = useRef(0);

    // Refs for VideoItems to control seeking
    const videoItemRefs = useRef<{ [key: number]: any }>({});

    // Session-based progress (Global 45s limit for unauthorized users)
    const [sessionProgress, setSessionProgress] = useState<{ [id: string]: number }>({});
    const totalSessionSeconds = Object.values(sessionProgress).reduce((acc, curr) => acc + curr, 0);

    const handleProgressUpdate = useCallback((id: string, seconds: number) => {
        const roundedSec = Math.floor(seconds);
        setSessionProgress(prev => {
            if (prev[id] === roundedSec) return prev;
            return {
                ...prev,
                [id]: roundedSec
            };
        });
    }, []);

    // Reset progress when switching videos - Handled internally in VideoItem

    // React Query Hooks
    const { data: permissions } = useFeedPermissions();
    const { data: feedData, isLoading: isFeedLoading } = useSparringFeed();

    const videoData = feedData?.videos || [];
    const dailyFreeIdState = feedData?.dailyFreeId;
    const isSubscribed = permissions?.isSubscriber || false;
    const isAdmin = permissions?.isSubscriber || false; // Note: useFeedPermissions includes isAdmin in isSubscriber usually, adjust if needed

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

    // Get initial sort from URL parameter
    const getInitialSort = (): 'shuffled' | 'latest' | 'popular' => {
        const sortParam = searchParams.get('sort');
        if (sortParam === 'latest' || sortParam === 'popular') return sortParam;
        return 'shuffled';
    };

    const [sortBy, setSortBy] = useState<'shuffled' | 'latest' | 'popular'>(getInitialSort);
    const [openDropdown, setOpenDropdown] = useState<'uniform' | 'ownership' | 'sort' | null>(null);
    const [reelTouchStart, setReelTouchStart] = useState<{ y: number } | null>(null);

    const uniforms = ['All', 'Gi', 'No-Gi'];
    const ownershipOptions = ['All', 'Purchased', 'Not Purchased'];

    const videos = videoData;

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
            return matchesSearchAndFilters;
        }

        return matchesSearchAndFilters;
    }).sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortBy === 'popular') {
            return calculateHotScore(b.views, b.createdAt) - calculateHotScore(a.views, a.createdAt);
        }
        return 0; // Keep shuffled order if sortBy is 'shuffled'
    });

    // Sync activeIndex and handle caching
    useEffect(() => {
        const prevIndex = prevIndexRef.current;
        if (prevIndex !== activeIndex && prevIndex >= 0 && prevIndex < filteredVideos.length) {
            setCachedIndices(prev => {
                // Keep the current item and its neighbors out of the explicit "cache" array 
                // because they are already in the "windowIndices" used for rendering.
                const windowIndices = new Set([activeIndex - 1, activeIndex, activeIndex + 1]);
                const filtered = prev.filter(i => !windowIndices.has(i) && i !== prevIndex);
                if (!windowIndices.has(prevIndex)) {
                    return [prevIndex, ...filtered].slice(0, MAX_CACHE_SIZE);
                }
                return filtered.slice(0, MAX_CACHE_SIZE);
            });
        }
        prevIndexRef.current = activeIndex;
    }, [activeIndex, filteredVideos.length]);

    // Keyboard navigation (reels mode)
    useEffect(() => {
        if (viewMode !== 'reels') return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = activeIndex - 1;
                if (prev >= 0) {
                    setActiveIndex(prev);
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = activeIndex + 1;
                if (next < filteredVideos.length) {
                    setActiveIndex(next);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, filteredVideos.length, activeIndex]);

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
                    if (next < filteredVideos.length) {
                        setActiveIndex(next);
                    }
                } else {
                    const prev = activeIndex - 1;
                    if (prev >= 0) {
                        setActiveIndex(prev);
                    }
                }
                lastScrollTime.current = now;
            }
        };
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [viewMode, filteredVideos.length, activeIndex]);

    if (viewMode === 'reels') {
        return (
            <div
                className="fixed inset-0 bg-black z-[200000] md:pl-28 overflow-hidden touch-none"
                onWheel={(e) => {
                    // Prevent rapid switching
                    if (Math.abs(e.deltaY) < 30) return;

                    if (e.deltaY > 0) {
                        const next = activeIndex + 1;
                        if (next < filteredVideos.length) setActiveIndex(next);
                    } else {
                        const prev = activeIndex - 1;
                        if (prev >= 0) setActiveIndex(prev);
                    }
                }}
                onTouchStart={(e) => setReelTouchStart({ y: e.targetTouches[0].clientY })}
                onTouchEnd={(e) => {
                    if (!reelTouchStart) return;
                    const yDist = reelTouchStart.y - e.changedTouches[0].clientY;
                    if (Math.abs(yDist) > 50) {
                        if (yDist > 0) {
                            const next = activeIndex + 1;
                            if (next < filteredVideos.length) {
                                setActiveIndex(next);
                            }
                        } else {
                            const prev = activeIndex - 1;
                            if (prev >= 0) {
                                setActiveIndex(prev);
                            }
                        }
                    }
                    setReelTouchStart(null);
                }}
            >
                {filteredVideos.length > 0 ? (() => {
                    const windowOffsets = [-3, -2, -1, 0, 1, 2, 3];
                    const renderIndices = windowOffsets
                        .map(o => activeIndex + o)
                        .filter(i => i >= 0 && i < filteredVideos.length);

                    return renderIndices.map(index => {
                        const video = filteredVideos[index];
                        const offset = index - activeIndex;
                        const isCached = cachedIndices.includes(index);

                        return (
                            <SparringVideoItem
                                key={video.id}
                                ref={(el: VideoItemRef | null) => {
                                    if (el) videoItemRefs.current[index] = el;
                                    else delete videoItemRefs.current[index];
                                }}
                                video={video}
                                isActive={index === activeIndex}
                                dailyFreeId={dailyFreeIdState}
                                offset={offset}
                                isCached={isCached}
                                onVideoReady={() => { }}
                                isSubscriber={isSubscribed}
                                isAdmin={isAdmin}
                                onProgressUpdate={(sec) => handleProgressUpdate(video.id, sec)}
                                totalSessionSeconds={totalSessionSeconds}
                                viewMode={viewMode}
                            />
                        );
                    });
                })() : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                        <p>영상이 없습니다.</p>
                    </div>
                )}

                {/* Progress bar moved inside VideoItem */}
            </div>
        );
    }

    // Grid View - Standard Page Layout
    return (
        <div className={cn(
            "min-h-screen bg-zinc-950 text-zinc-100 flex flex-col flex-1 p-4 md:px-12 md:pb-8 overflow-y-auto",
            !isEmbedded && "md:pt-0"
        )}>
            <div className={cn("max-w-[1600px] mx-auto w-full", isEmbedded && "px-0")}>
                {isEmbedded && activeTab && onTabChange && (
                    <LibraryTabs activeTab={activeTab} onTabChange={onTabChange} />
                )}

                {/* Header & Filter System */}
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
                                aria-label="스파링 검색"
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

                        <div className="flex items-center gap-4">
                            <div className="text-zinc-500 text-sm font-medium">
                                총 <span className="text-zinc-200 font-bold">{filteredVideos.length}</span>개의 스파링
                            </div>
                            {isFeedLoading && videos.length === 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500" />
                                    <span className="text-zinc-600 text-xs">로딩 중...</span>
                                </div>
                            )}
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
            </div>
        </div>
    );
};

export default SparringFeed;
