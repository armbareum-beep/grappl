import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { fetchDrillsBase, fetchCreatorsByIds } from '../lib/api';
import { Drill } from '../types';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { PlaySquare } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const Drills: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { error: toastError } = useToast();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'reels' | 'grid'>('reels');

    useEffect(() => {
        loadDrills();
    }, []);

    const loadDrills = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch filtered drills (Free/First only, No processing)
            const { fetchPublicFeedDrills } = await import('../lib/api');
            const { data: drillsData, error: apiError } = await fetchPublicFeedDrills(20);

            if (apiError) throw apiError;

            if (drillsData) {
                setDrills(drillsData);
                // Stop loading spinner immediately to show drills
                setLoading(false);

                // 2. Fetch creators in background
                const creatorIds = drillsData.map((d: Drill) => d.creatorId);
                if (creatorIds.length > 0) {
                    const creatorsMap = await fetchCreatorsByIds(creatorIds);

                    // 3. Update drills with creator names
                    setDrills(prevDrills => prevDrills.map(d => ({
                        ...d,
                        creatorName: creatorsMap[d.creatorId] || d.creatorName || 'Unknown'
                    })));
                }
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
        return <LoadingScreen message="드릴을 불러오는 중..." />;
    }

    if (error) {
        return <ErrorScreen error={error} resetMessage="드릴 목록을 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }


    // Reels mode - fullscreen immersive
    if (viewMode === 'reels') {
        return <DrillReelsFeed drills={drills} onChangeView={() => setViewMode('grid')} />;
    }

    // Grid mode - clean drill display
    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">드릴</h1>
                    <button
                        onClick={() => setViewMode('reels')}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25"
                    >
                        <PlaySquare className="w-4 h-4" />
                        <span className="text-sm font-medium">릴스 뷰</span>
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {drills.map(drill => (
                        <div
                            key={drill.id}
                            className="aspect-[9/16] bg-slate-900 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-500 relative group"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigate(`/drills/${drill.id}`);
                            }}
                        >
                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                                <h3 className="text-white font-bold text-sm line-clamp-2">{drill.title}</h3>
                                <p className="text-slate-400 text-xs mt-1">{drill.creatorName}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
