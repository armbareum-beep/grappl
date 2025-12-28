import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { fetchDrillsBase, fetchCreatorsByIds } from '../lib/api';
import { Drill } from '../types';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { PlaySquare, Search, X } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const Drills: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const searchTerm = searchParams.get('search');

    const { user } = useAuth();
    const { error: toastError } = useToast();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels'); // Default to reels for immersive experience
    const [initialReelIndex, setInitialReelIndex] = useState(0);

    useEffect(() => {
        loadDrills();
        if (searchTerm) {
            setViewMode('grid'); // Force grid view when searching
        }
    }, [searchTerm]);

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
                            creatorName: creatorsMap[d.creatorId] || d.creatorName || 'Unknown'
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
        return <DrillReelsFeed drills={drills} initialIndex={initialReelIndex} onChangeView={() => setViewMode('grid')} />;
    }

    // Grid mode - clean drill display
    return (
        <div className="min-h-screen bg-black p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold text-white">
                            {searchTerm ? `'${searchTerm}' 검색 결과` : '드릴'}
                        </h1>
                        {searchTerm && (
                            <button
                                onClick={() => {
                                    setSearchParams({});
                                    setViewMode('reels');
                                }}
                                className="text-sm text-white/60 hover:text-white flex items-center gap-1 bg-black/50 px-3 py-1 rounded-full border border-white/10"
                            >
                                <X className="w-4 h-4" />
                                검색 초기화
                            </button>
                        )}
                    </div>

                    {!searchTerm && (
                        <button
                            onClick={() => setViewMode('reels')}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25"
                        >
                            <PlaySquare className="w-4 h-4" />
                            <span className="text-sm font-medium">릴스 뷰</span>
                        </button>
                    )}
                </div>

                {drills.length === 0 ? (
                    <div className="text-center py-20 bg-black/50 rounded-2xl border border-white/10">
                        <Search className="w-12 h-12 text-white/40 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">검색 결과가 없습니다</h3>
                        <p className="text-white/60">다른 키워드로 검색해보거나 새로운 드릴을 찾아보세요.</p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchParams({})}
                                className="mt-6 text-white hover:text-white/80 font-bold"
                            >
                                전체 목록 보기
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {drills.map((drill, index) => (
                            <div
                                key={drill.id}
                                className="aspect-[9/16] bg-black rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-white/30 relative group border border-white/10"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Switch to reels view starting at this drill
                                    setInitialReelIndex(index);

                                    // If search is active, we need to clear it to enter immersive mode
                                    if (searchTerm) {
                                        setSearchParams({});
                                    }

                                    setViewMode('reels');
                                }}
                            >
                                <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                    <h3 className="text-white font-bold text-sm line-clamp-2">{drill.title}</h3>
                                    <p className="text-slate-400 text-xs mt-1">{drill.creatorName}</p>

                                    {/* Tech Tags */}
                                    {drill.tags && drill.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {drill.tags.slice(0, 2).map((tag, idx) => (
                                                <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
