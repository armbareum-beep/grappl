import { useState, useEffect, useMemo } from 'react';
import { Zap } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useDrillsFeed, useFeedPermissions } from '../hooks/use-feed-queries';

export function DrillReels() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const targetId = searchParams.get('id');
    const state = location.state as { source?: string; drillId?: string } | null;
    const isSavedMode = state?.source === 'saved';

    // React Query Hooks
    const { data: feedDrills, isLoading: isFeedLoading } = useDrillsFeed();

    // Local state for saved drills (still needed as they come from localStorage)
    const [savedDrills, setSavedDrills] = useState<any[]>([]);
    const [isSavedLoading, setIsSavedLoading] = useState(false);
    const [initialIndex, setInitialIndex] = useState(0);

    // Load Saved Drills from localStorage if in saved mode
    useEffect(() => {
        if (isSavedMode) {
            try {
                setIsSavedLoading(true);
                const savedStr = localStorage.getItem('saved_drills');
                if (savedStr) {
                    const saved = JSON.parse(savedStr);
                    if (Array.isArray(saved) && saved.length > 0) {
                        setSavedDrills(saved);
                        if (state?.drillId) {
                            const idx = saved.findIndex((d: any) => d.id === state.drillId);
                            if (idx !== -1) setInitialIndex(idx);
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load saved drills", error);
            } finally {
                setIsSavedLoading(false);
            }
        }
    }, [isSavedMode, state?.drillId]);

    // Derived State
    const drills = isSavedMode ? savedDrills : (feedDrills || []);
    const loading = isSavedMode ? isSavedLoading : isFeedLoading;

    // Handle initialId (id param) for feed mode - move to front if found
    const displayDrills = useMemo(() => {
        if (!isSavedMode && targetId && drills.length > 0) {
            const targetIdx = (drills as any[]).findIndex(d => d.id === targetId);
            if (targetIdx !== -1) {
                const newDrills = [...drills];
                const [targetItem] = newDrills.splice(targetIdx, 1);
                newDrills.unshift(targetItem);
                return newDrills;
            }
        }
        return drills;
    }, [isSavedMode, targetId, drills]);

    return (
        <div className="h-[calc(100dvh-64px)] md:h-screen bg-black text-white flex md:pl-28 relative overflow-hidden pb-24 md:pb-0">
            {/* Simple Left Sub-Navigation Sidebar */}
            <div className="hidden sm:flex w-20 md:w-24 flex-col items-center py-8 gap-8 border-r border-zinc-900 bg-zinc-950/20 backdrop-blur-sm z-50">
                <div className="flex flex-col gap-6">
                    <button className="group flex flex-col items-center gap-1.5 transition-all outline-none opacity-100 scale-110">
                        <div className="p-3 rounded-2xl transition-all duration-300 bg-zinc-800 shadow-lg shadow-white/5 ring-1 ring-white/10">
                            <Zap className="w-5 h-5 text-indigo-400" />
                        </div>
                        <span className="text-[10px] font-bold tracking-tight text-white uppercase">
                            Drills
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile Top Header */}
            <div className="sm:hidden absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-5 py-2.5 flex items-center pointer-events-auto shadow-2xl">
                    <Zap className="w-4 h-4 text-indigo-400 mr-2" />
                    <span className="text-xs font-black uppercase tracking-widest text-white">Daily Drills</span>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full relative">
                <div className="w-full h-full">
                    {displayDrills.length > 0 ? (
                        <DrillReelsFeed
                            drills={displayDrills}
                            initialIndex={initialIndex}
                            onDrillsUpdate={(_updatedDrills) => {
                                // Normally with React Query we'd use setQueryData, 
                                // but DrillReelsFeed might expect to update its own copy.
                                // For now we'll just ignore or implementation local shuffle if needed.
                            }}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-500">
                            <p>표시할 드릴이 없습니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default DrillReels;
