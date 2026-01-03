import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchCreatorsByIds } from '../lib/api';
import { Drill } from '../types';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { PlaySquare, Search, X } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const Drills: React.FC = () => {
    // const navigate = useNavigate(); // Not needed if not used
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('search');

    // const { user } = useAuth();
    // const { error: toastError } = useToast();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>((searchParams.get('view') as 'reels' | 'grid') || 'reels'); // Default to reels for immersive experience
    const [initialReelIndex, setInitialReelIndex] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const categories = ['All', 'Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'];

    useEffect(() => {
        loadDrills();
        if (searchTerm) {
            setViewMode('grid'); // Force grid view when searching
            setSearchParams(prev => { prev.set('view', 'grid'); return prev; });
        }
    }, [searchTerm]);

    const handleViewChange = (mode: 'reels' | 'grid') => {
        setViewMode(mode);
        setSearchParams(prev => {
            if (mode === 'grid') prev.set('view', 'grid');
            else prev.delete('view');
            return prev;
        });
    };

    // ... (loadDrills stays same)

    const loadDrills = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch filtered drills (Free/First only, No processing)
            const { fetchPublicFeedDrills } = await import('../lib/api');
            // Fetch more if searching to increase hit rate
            const limit = searchTerm ? 50 : 20;
            const { data: drillsData, error: apiError } = await fetchPublicFeedDrills(limit);

            if (apiError) throw apiError;

            if (drillsData) {
                let filteredDrills = drillsData;

                // Client-side Filtering
                if (searchTerm) {
                    const term = searchTerm.toLowerCase();
                    filteredDrills = drillsData.filter((d: Drill) =>
                        d.title.toLowerCase().includes(term) ||
                        d.description?.toLowerCase().includes(term) ||
                        (d.tags && d.tags.some(t => t.toLowerCase().includes(term))) ||
                        d.category?.toLowerCase().includes(term)
                    );
                }

                // Shuffle drills randomly using Fisher-Yates algorithm
                const shuffled = [...filteredDrills];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                setDrills(shuffled);

                // 2. Fetch creators in background for filtered items
                const creatorIds = filteredDrills.map((d: Drill) => d.creatorId);
                if (creatorIds.length > 0) {
                    // Use a separate async function to avoid blocking UI render
                    fetchCreatorsByIds(creatorIds).then(creatorsMap => {
                        setDrills(prevDrills => prevDrills.map(d => ({
                            ...d,
                            creatorName: creatorsMap[d.creatorId]?.name || d.creatorName || 'Unknown',
                            creatorProfileImage: creatorsMap[d.creatorId]?.profileImage || (d as any).creatorProfileImage
                        })));
                    }).catch(e => console.warn('Failed to fetch creators', e));
                }

                setLoading(false);
            } else {
                setLoading(false);
            }
        } catch (error: any) {
            console.error('Failed to load drills:', error);
            setError(error.message || '드릴을 불러오는 중 오류가 발생했습니다.');
            setLoading(false);
        }
    };

    if (loading) {
        return <LoadingScreen message={searchTerm ? `'${searchTerm}' 검색 중...` : "드릴을 불러오는 중..."} />;
    }

    if (error) {
        return <ErrorScreen error={error} resetMessage="드릴 목록을 불러오는 중 오류가 발생했습니다." />;
    }


    // Reels mode - fullscreen immersive
    if (viewMode === 'reels' && !searchTerm) {
        return <DrillReelsFeed drills={drills} initialIndex={initialReelIndex} onChangeView={() => handleViewChange('grid')} />;
    }


    const filteredDrills = drills.filter(drill => {
        const matchesSearch = !searchTerm ||
            drill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            drill.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = selectedCategory === 'All' ||
            drill.category === selectedCategory ||
            (selectedCategory === 'Side' && (drill.category as string) === 'Side Control') ||
            (selectedCategory === 'Back' && (drill.category as string) === 'Back Control') ||
            (drill.tags && drill.tags.includes(selectedCategory));

        return matchesSearch && matchesCategory;
    });

    // Grid mode - clean drill display
    return (
        <div className="min-h-screen bg-zinc-950 md:pl-28 pt-8 pb-20 px-6 md:px-10">
            <div className="max-w-[1600px] mx-auto">
                {/* Header & Filter System */}
                <div className="flex flex-col gap-8 mb-12">

                    {/* Search & Reels Toggle */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="flex items-center gap-3 w-full max-w-sm sm:max-w-md">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-violet-500" />
                                <input
                                    type="text"
                                    placeholder="드릴 검색..."
                                    value={searchTerm || ''}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        setSearchParams(prev => {
                                            if (value) prev.set('search', value);
                                            else prev.delete('search');
                                            return prev;
                                        });
                                    }}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-100 pl-11 pr-4 py-3 rounded-2xl focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm placeholder:text-zinc-600 text-sm font-medium"
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
                            onClick={() => handleViewChange('reels')}
                            className="flex items-center gap-2 px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-2xl hover:text-violet-400 hover:border-violet-500/50 transition-all shadow-xl group whitespace-nowrap"
                        >
                            <PlaySquare className="w-4 h-4 transition-transform group-hover:scale-110" />
                            <span className="text-xs font-bold tracking-tight">릴스 뷰</span>
                        </button>
                    </div>

                    {/* Filter Rows */}
                    <div className="space-y-4">
                        {/* Row 1: Primary Filter (Position/Category) */}
                        <div className="flex items-center gap-3">
                            <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`h-10 px-6 rounded-full text-xs font-bold transition-all duration-200 whitespace-nowrap border flex items-center justify-center ${selectedCategory === cat
                                            ? 'bg-violet-600 border-violet-500 text-white shadow-violet-500/20'
                                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(selectedCategory !== 'All' || searchTerm) && (
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedCategory('All');
                                        setSearchParams({});
                                    }}
                                    className="h-10 px-4 text-xs text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
                                >
                                    필터 초기화
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {filteredDrills.length === 0 ? (
                    <div className="text-center py-32 bg-zinc-900/20 rounded-[2.5rem] border border-zinc-900 backdrop-blur-sm">
                        <div className="relative inline-block mb-6">
                            <Search className="w-16 h-16 text-zinc-800 mx-auto" />
                            <div className="absolute inset-0 bg-violet-500/5 blur-2xl rounded-full"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-200 mb-3">검색 결과가 없습니다</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto mb-8">다른 키워드나 카테고리를 시도해보세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6 md:gap-8">
                        {filteredDrills.map((drill) => (
                            <div
                                key={drill.id}
                                className="group cursor-pointer"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const fullIndex = drills.findIndex(d => d.id === drill.id);
                                    setInitialReelIndex(fullIndex !== -1 ? fullIndex : 0);
                                    if (searchTerm) setSearchParams({});
                                    handleViewChange('reels');
                                }}
                            >
                                {/* Thumbnail Card */}
                                <div className="relative aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] group-hover:ring-1 group-hover:ring-violet-500/30">
                                    <img
                                        src={drill.thumbnailUrl}
                                        alt={drill.title}
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                    {/* Play Mini Icon */}
                                    <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                        <PlaySquare className="w-4 h-4" />
                                    </div>
                                </div>

                                {/* Text Info */}
                                <div className="px-1">
                                    <h3 className="text-zinc-100 text-sm font-bold line-clamp-1 mb-0.5 group-hover:text-violet-400 transition-colors">
                                        {drill.title}
                                    </h3>
                                    <p className="text-zinc-500 text-[11px] font-medium">{drill.creatorName}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
