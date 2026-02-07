import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { DrillReelsFeed } from '../components/drills/DrillReelsFeed';
import { supabase } from '../lib/supabase';
import { useLocation, useSearchParams } from 'react-router-dom';

export function DrillReels() {
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [drills, setDrills] = useState<any[]>([]);
    const [initialIndex, setInitialIndex] = useState(0);

    const [searchParams] = useSearchParams();
    const targetId = searchParams.get('id');

    // Load Drill Content
    useEffect(() => {
        const state = location.state as { source?: string; drillId?: string } | null;

        if (state?.source === 'saved') {
            loadSavedDrills(state.drillId);
        } else {
            loadDrillContent(targetId || undefined);
        }

        // Auto-refresh drills every 5 seconds to detect when processing is complete
        const pollInterval = setInterval(() => {
            if (!location.state?.source) {
                loadDrillContent(undefined, true);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [location.state]);

    const loadSavedDrills = (initialId?: string) => {
        try {
            setLoading(true);
            const savedStr = localStorage.getItem('saved_drills');
            if (savedStr) {
                const saved = JSON.parse(savedStr);
                // Ensure valid data structure if needed
                if (Array.isArray(saved) && saved.length > 0) {
                    setDrills(saved);

                    // If initialId provided, bring it to front or find index?
                    // DrillReelsFeed takes initialIndex. We need to find the index of initialId.
                    // But we should NOT shuffle saved drills order probably, or maybe user wants it?
                    // Let's keep order but set initial index.
                    if (initialId) {
                        const idx = saved.findIndex((d: any) => d.id === initialId);
                        if (idx !== -1) {
                            // DrillReelsFeed takes initialIndex prop, wait!
                            // DrillReelsFeed is rendered below. We just need to pass the index.
                            // But DrillReelsFeed updates its own state. 
                            // We need to pass the initialIndex to DrillReelsFeed.
                            // Let's store it in a state or ref if DrillReelsFeed accounts for prop changes?
                            // Currently DrillReelsFeed uses `useState(initialIndex)` so it only reads it once on mount.
                            // That is fine since we are mounting it conditional on !loading.
                            setInitialIndex(idx);
                        }
                    }
                } else {
                    setDrills([]);
                }
            } else {
                setDrills([]);
            }
            setLoading(false);
        } catch (error) {
            console.error("Failed to load saved drills", error);
            setLoading(false);
        }
    };

    const loadDrillContent = async (initialId?: string, isPolling: boolean = false) => {
        try {
            // Only show full loading screen if we don't have any drills yet
            if (drills.length === 0 && !isPolling) {
                setLoading(true);
            }

            const { fetchCreatorsByIds } = await import('../lib/api');

            console.log('[DrillReels] Loading content...');

            // Get drills strictly from FREE routines
            const { data: freeRoutineDrills, error: drillError } = await supabase
                .from('routine_drills')
                .select(`
                    drill:drills!inner (
                         *
                    ),
                    routines!inner (
                        price
                    )
                `)
                .eq('routines.price', 0)
                .order('created_at', { ascending: false })
                .limit(100);

            // Extract drills from the Join result
            const allDrills = freeRoutineDrills?.map((item: any) => item.drill) || [];

            if (drillError) {
                console.error('[DrillReels] Fetch error:', drillError);
                throw drillError;
            }

            console.log('[DrillReels] Raw drills fetched:', allDrills?.length);

            const allCreatorIds = allDrills?.map((d: any) => d.creator_id).filter(Boolean) || [];
            const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

            console.log('[DrillReels] Creators map keys:', Object.keys(creatorsMap).length);

            const processedDrills = (allDrills || [])
                .filter((d: any) => {
                    // Filter out drills with known error messages in URLs
                    const hasError = (d.vimeo_url?.toString().includes('ERROR')) ||
                        (d.video_url?.toString().includes('ERROR')) ||
                        (d.description_video_url?.toString().includes('ERROR'));

                    if (hasError) console.warn('[DrillReels] Skipping drill likely due to error URL:', d.id);
                    return !hasError;
                })
                .map((d: any) => ({
                    id: d.id,
                    title: d.title,
                    description: d.description,
                    creatorId: d.creator_id,
                    creatorName: creatorsMap[d.creator_id]?.name || 'Instructor',
                    creatorProfileImage: creatorsMap[d.creator_id]?.profileImage || undefined,
                    category: d.category,
                    difficulty: d.difficulty,
                    thumbnailUrl: d.thumbnail_url,
                    videoUrl: d.video_url,
                    vimeoUrl: d.vimeo_url,
                    descriptionVideoUrl: d.description_video_url,
                    aspectRatio: '9:16' as const,
                    views: d.views || 0,
                    durationMinutes: d.duration_minutes || 0,
                    length: d.length || d.duration,
                    tags: d.tags || [],
                    likes: d.likes || 0,
                    price: d.price || 0,
                    createdAt: d.created_at,
                }));

            // Shuffle
            for (let i = processedDrills.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [processedDrills[i], processedDrills[j]] = [processedDrills[j], processedDrills[i]];
            }

            // If initialId provided, move it to front
            if (initialId) {
                const targetIdx = processedDrills.findIndex(d => d.id === initialId);
                if (targetIdx !== -1) {
                    const targetItem = processedDrills[targetIdx];
                    processedDrills.splice(targetIdx, 1);
                    processedDrills.unshift(targetItem);
                }
            }

            setDrills(processedDrills);
            setLoading(false);

        } catch (error) {
            console.error("Failed to load drill content", error);
            setLoading(false);
        }
    };

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
                    {loading ? (
                        <LoadingScreen message="드릴을 준비하고 있습니다..." />
                    ) : drills.length > 0 ? (
                        <DrillReelsFeed
                            drills={drills}
                            initialIndex={initialIndex}
                            onDrillsUpdate={(updatedDrills) => setDrills(updatedDrills)}
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
