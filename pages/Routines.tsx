import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCreatorsByIds, fetchRoutines, getDailyFreeDrill } from '../lib/api';
import { supabase } from '../lib/supabase';
import { DrillRoutine } from '../types';
import { Search } from 'lucide-react';

import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { cn } from '../lib/utils';


import { LibraryTabs } from '../components/library/LibraryTabs';
import { useAuth } from '../contexts/AuthContext';

export const Routines: React.FC<{
    isEmbedded?: boolean;
    activeTab?: 'classes' | 'routines' | 'sparring';
    onTabChange?: (tab: 'classes' | 'routines' | 'sparring') => void;
}> = ({ isEmbedded, activeTab, onTabChange }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [internalCategory, setInternalCategory] = useState<string>('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
    const [selectedUniform, setSelectedUniform] = useState<string>('All');
    const [selectedOwnership, setSelectedOwnership] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'shuffled' | 'latest' | 'popular'>('shuffled');
    const [openDropdown, setOpenDropdown] = useState<'uniform' | 'difficulty' | 'ownership' | 'sort' | null>(null);

    const searchTerm = internalSearchTerm;
    const selectedCategory = internalCategory;

    const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
    const uniforms = ['All', 'Gi', 'No-Gi'];
    const ownershipOptions = ['All', 'Purchased', 'Not Purchased'];

    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const categories = ['All', 'Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'];

    useEffect(() => {
        loadRoutines();
    }, []);

    const loadRoutines = async () => {
        try {
            setLoading(true);
            setError(null);

            const [routinesRes, dailyDrillRes] = await Promise.all([
                fetchRoutines(100),
                getDailyFreeDrill()
            ]);

            if (routinesRes.error) throw routinesRes.error;

            let freeIds: string[] = [];
            if (dailyDrillRes.data) {
                const { data: relations } = await supabase
                    .from('routine_drills')
                    .select('routine_id')
                    .eq('drill_id', dailyDrillRes.data.id);
                if (relations) {
                    freeIds = relations.map(r => r.routine_id);
                }
            }

            if (routinesRes.data) {
                const data = routinesRes.data;
                const creatorIds = data.map((r: DrillRoutine) => r.creatorId).filter(Boolean) as string[];
                let enriched = data;

                if (creatorIds.length > 0) {
                    const creatorsMap = await fetchCreatorsByIds(creatorIds);
                    enriched = data.map((r: DrillRoutine) => ({
                        ...r,
                        creatorName: creatorsMap[r.creatorId]?.name || r.creatorName,
                        creatorProfileImage: creatorsMap[r.creatorId]?.avatarUrl || r.creatorProfileImage
                    }));
                }

                // Inject ranks and free status (Hot Score Logic)
                const now = Date.now();
                const getHotScore = (item: any) => {
                    const views = item.views || 0;
                    const createdDate = item.createdAt ? new Date(item.createdAt).getTime() : now;
                    const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
                    return views / Math.pow(hoursSinceCreation + 2, 1.5);
                };

                const hotRoutines = [...enriched]
                    .filter((r: DrillRoutine) => (r.views || 0) >= 5)
                    .sort((a, b) => getHotScore(b) - getHotScore(a));

                const processed = enriched.map((r: DrillRoutine) => {
                    const hotIndex = hotRoutines.findIndex(s => s.id === r.id);
                    return {
                        ...r,
                        rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                        isDailyFree: freeIds.includes(r.id)
                    };
                });

                // Shuffle for browse fresh feel
                const shuffled = [...processed].sort(() => Math.random() - 0.5);
                setRoutines(shuffled);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load routines');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen message="루틴을 불러오는 중..." />;
    if (error) return <ErrorScreen error={error} resetMessage="루틴 목록을 불러오는 중 오류가 발생했습니다." />;

    const filteredRoutines = routines.filter(r => {
        const matchesSearch = !searchTerm ||
            r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.creatorName && r.creatorName.toLowerCase().includes(searchTerm.toLowerCase()));

        // Category mapping
        // Category mapping
        let matchesCategory = selectedCategory === 'All';

        if (selectedCategory === 'Standing') matchesCategory = (r.category as string) === 'Takedown' || r.category === 'Standing';
        if (selectedCategory === 'Guard') matchesCategory = r.category === 'Guard';
        if (selectedCategory === 'Passing') matchesCategory = r.category === 'Passing';
        if (selectedCategory === 'Side') matchesCategory = (r.category as string) === 'Defense' || r.category === 'Side' || (r.category as string) === 'Side Control';
        if (selectedCategory === 'Mount') matchesCategory = (r.category as string) === 'Submission' || r.category === 'Mount';
        if (selectedCategory === 'Back') matchesCategory = r.category === 'Back' || (r.category as string) === 'Back Control';

        // Difficulty & Uniform
        const matchesDifficulty = selectedDifficulty === 'All' || r.difficulty === selectedDifficulty;
        const matchesUniform = selectedUniform === 'All' || (r as any).uniformType === selectedUniform; // Soft check for uniform

        let matchesOwnership = true;
        if (selectedOwnership === 'Purchased') {
            matchesOwnership = user?.ownedVideoIds?.includes(r.id) || false;
        } else if (selectedOwnership === 'Not Purchased') {
            matchesOwnership = !(user?.ownedVideoIds?.includes(r.id));
        }

        return matchesSearch && matchesCategory && matchesDifficulty && matchesUniform && matchesOwnership;
    }).sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortBy === 'popular') {
            return (b.views || 0) - (a.views || 0);
        }
        return 0; // Keep shuffled order if sortBy is 'shuffled'
    });

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
                <div className="flex flex-col gap-8 mb-12">
                    {!isEmbedded && <h1 className="text-3xl font-bold text-white mb-2">루틴</h1>}

                    {/* Search & Stats */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500">
                                <Search className="h-4 w-4 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="루틴 검색..."
                                value={searchTerm}
                                onChange={(e) => setInternalSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                            />
                        </div>

                        <div className="text-zinc-500 text-sm font-medium">
                            총 <span className="text-zinc-200 font-bold">{filteredRoutines.length}</span>개의 루틴
                        </div>
                    </div>

                    {/* Filter Rows */}
                    <div className="space-y-4">
                        {/* Row 1: Primary Filter (Category) */}
                        <div className="flex items-center gap-3">
                            <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                                {categories.map(cat => (
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

                            {/* Difficulty Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setOpenDropdown(openDropdown === 'difficulty' ? null : 'difficulty')}
                                    className={cn(
                                        "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                                        selectedDifficulty !== 'All' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                                    )}
                                >
                                    <span className="whitespace-nowrap">Level: {selectedDifficulty}</span>
                                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'difficulty' && "rotate-180")} />
                                </button>
                                {openDropdown === 'difficulty' && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                        <div className="absolute top-full left-0 mt-2 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20 py-1">
                                            {difficulties.map(option => (
                                                <button
                                                    key={option}
                                                    onClick={() => {
                                                        setSelectedDifficulty(option);
                                                        setOpenDropdown(null);
                                                    }}
                                                    className={cn(
                                                        "w-full px-4 py-2.5 text-left text-xs hover:bg-zinc-800 transition-colors",
                                                        selectedDifficulty === option ? "text-violet-500 font-bold bg-violet-500/5" : "text-zinc-400"
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
                            {(selectedCategory !== 'All' || searchTerm || selectedDifficulty !== 'All' || selectedUniform !== 'All' || selectedOwnership !== 'All') && (
                                <button
                                    onClick={() => {
                                        setInternalCategory('All');
                                        setInternalSearchTerm('');
                                        setSelectedDifficulty('All');
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
            </div>

            {/* Grid */}
            {filteredRoutines.length === 0 ? (
                <div className="text-center py-32 bg-zinc-900/20 rounded-[2.5rem] border border-zinc-900 backdrop-blur-sm">
                    <div className="relative inline-block mb-6">
                        <Search className="w-16 h-16 text-zinc-800 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-200 mb-3">검색 결과가 없습니다</h3>
                </div>
            ) : (
                <div className={cn(
                    "grid gap-6 md:gap-8",
                    isEmbedded
                        ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
                        : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                )}>
                    {filteredRoutines.map(routine => (
                        <div
                            key={routine.id}
                            onClick={() => navigate(`/routines/${routine.id}`)}
                            className="group cursor-pointer"
                        >
                            {/* Thumbnail Card */}
                            <div className={cn(
                                "relative bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] group-hover:ring-1 group-hover:ring-violet-500/30",
                                isEmbedded ? "aspect-[9/16]" : "aspect-video"
                            )}>
                                {/* Badges */}
                                <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none z-10">
                                    {routine.isDailyFree && (
                                        <ContentBadge type="daily_free" />
                                    )}
                                    <div className="ml-auto">
                                        {routine.rank ? (
                                            <ContentBadge type="popular" rank={routine.rank} />
                                        ) : (routine.createdAt && new Date(routine.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                                            <ContentBadge type="recent" />
                                        ) : null}
                                    </div>
                                </div>
                                {routine.thumbnailUrl ? (
                                    <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold text-xs uppercase">No Image</div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                {/* Play Mini Icon */}
                                <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                    <PlayCircle className="w-4 h-4" />
                                </div>
                            </div>

                            {/* Text Info */}
                            <div className="px-1">
                                <h3 className="text-zinc-100 text-sm font-bold line-clamp-1 mb-0.5 group-hover:text-violet-400 transition-colors">
                                    {routine.title}
                                </h3>
                                <p className="text-zinc-500 text-[11px] font-medium">{routine.creatorName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
