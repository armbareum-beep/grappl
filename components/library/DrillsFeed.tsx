import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getPersonalizedDrills } from '../../lib/api-recommendations';
import { Drill } from '../../types';
import { Search, ChevronDown } from 'lucide-react';

import { GridSkeleton } from '../common/Skeleton';
import { cn, calculateHotScore, getOptimizedThumbnail } from '../../lib/utils';

import { LibraryTabs, LibraryTabType } from './LibraryTabs';
import { useAuth } from '../../contexts/AuthContext';

export const DrillsFeed: React.FC<{
    isEmbedded?: boolean;
    activeTab?: LibraryTabType;
    onTabChange?: (tab: LibraryTabType) => void;
}> = ({ isEmbedded, activeTab, onTabChange }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchParams] = useSearchParams();

    const getInitialSort = (): 'shuffled' | 'latest' | 'popular' => {
        const sortParam = searchParams.get('sort');
        if (sortParam === 'latest' || sortParam === 'popular') return sortParam;
        return 'shuffled';
    };

    const [internalSearchTerm, setInternalSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
    const [sortBy, setSortBy] = useState<'shuffled' | 'latest' | 'popular'>(getInitialSort);
    const [openDropdown, setOpenDropdown] = useState<'difficulty' | 'sort' | null>(null);

    const searchTerm = internalSearchTerm;

    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const categories = ['All', 'Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back', 'Submission'];
    const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

    useEffect(() => {
        loadDrills();
    }, [user?.id]);

    const loadDrills = async () => {
        try {
            setLoading(true);
            setError(null);

            // Use personalized recommendations if user is logged in
            const drillsData = await getPersonalizedDrills(user?.id || null, 200);

            if (drillsData) {
                const now = Date.now();
                const getHotScore = (item: any) => {
                    const views = item.views || 0;
                    const createdDate = item.createdAt ? new Date(item.createdAt).getTime() : now;
                    const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
                    return views / Math.pow(hoursSinceCreation + 2, 1.5);
                };

                const hotDrills = [...drillsData]
                    .filter((d: Drill) => (d.views || 0) >= 5)
                    .sort((a, b) => getHotScore(b) - getHotScore(a));

                const processed = drillsData.map((d: Drill) => {
                    const hotIndex = hotDrills.findIndex(s => s.id === d.id);
                    return {
                        ...d,
                        rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    };
                });

                // Personalized order is already applied, no need to shuffle
                setDrills(processed);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to load drills');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 md:pl-28 pt-8 pb-20 px-6 md:px-10">
            <div className="max-w-[1600px] mx-auto p-4 md:px-12">
                <div className="h-10 w-32 bg-zinc-800 rounded-lg animate-pulse mb-8" />
                <GridSkeleton count={12} columns={4} />
            </div>
        </div>
    );

    if (error) return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button onClick={loadDrills} className="px-4 py-2 bg-violet-600 rounded-lg">재시도</button>
            </div>
        </div>
    );

    const filteredDrills = drills.filter(d => {
        const matchesSearch = !searchTerm ||
            d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (d.description && d.description.toLowerCase().includes(searchTerm.toLowerCase()));

        let matchesCategory = selectedCategory === 'All';
        if (selectedCategory !== 'All') {
            matchesCategory = d.category === selectedCategory;
        }

        const matchesDifficulty = selectedDifficulty === 'All' || d.difficulty === selectedDifficulty;

        return matchesSearch && matchesCategory && matchesDifficulty;
    }).sort((a, b) => {
        if (sortBy === 'latest') {
            return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        if (sortBy === 'popular') {
            return calculateHotScore(b.views, b.createdAt) - calculateHotScore(a.views, a.createdAt);
        }
        return 0;
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

                <div className="flex flex-col gap-8 mb-8 mt-8">
                    {!isEmbedded && <h1 className="text-3xl font-bold text-white mb-2">드릴</h1>}

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500">
                                <Search className="h-4 w-4 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="드릴 검색..."
                                aria-label="드릴 검색"
                                value={searchTerm}
                                onChange={(e) => setInternalSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                            />
                        </div>

                        <div className="text-zinc-500 text-sm font-medium">
                            총 <span className="text-zinc-200 font-bold">{filteredDrills.length}</span>개의 드릴
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
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

                        <div className="flex flex-wrap items-center gap-3">
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

                            {(selectedCategory !== 'All' || selectedDifficulty !== 'All' || searchTerm) && (
                                <button
                                    onClick={() => {
                                        setSelectedCategory('All');
                                        setSelectedDifficulty('All');
                                        setInternalSearchTerm('');
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

            {filteredDrills.length === 0 ? (
                <div className="text-center py-32 bg-zinc-900/20 rounded-[2.5rem] border border-zinc-900 backdrop-blur-sm">
                    <div className="relative inline-block mb-6">
                        <Search className="w-16 h-16 text-zinc-800 mx-auto" />
                    </div>
                    <h3 className="text-2xl font-bold text-zinc-200 mb-3">검색 결과가 없습니다</h3>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-8">
                    {filteredDrills.map(drill => (
                        <div
                            key={drill.id}
                            onClick={() => navigate(`/drills?id=${drill.id}`)}
                            className="group cursor-pointer"
                        >
                            <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-zinc-900 mb-3">
                                <img
                                    src={getOptimizedThumbnail(drill.thumbnailUrl, 'medium')}
                                    alt={drill.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                {drill.difficulty && (
                                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full text-[10px] font-bold text-white uppercase">
                                        {drill.difficulty}
                                    </div>
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-white truncate group-hover:text-violet-400 transition-colors">
                                {drill.title}
                            </h3>
                            <p className="text-xs text-zinc-500 truncate mt-1">
                                {drill.category || 'Drill'}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
