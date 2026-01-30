import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clapperboard, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { MixedReelsFeed, MixedItem } from '../components/reels/MixedReelsFeed';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface UserPermissions {
    isSubscriber: boolean;
    purchasedItemIds: string[];
}

type WatchTab = 'mix' | 'lesson' | 'drill' | 'sparring';

// Utility to diversify content by interleaving different sources
const diversifyContent = (array: MixedItem[]) => {
    const grouped: Record<string, MixedItem[]> = {};
    array.forEach(item => {
        let key = 'unknown';
        if (item.type === 'lesson') key = item.data.courseId || 'lesson-misc';
        else if (item.type === 'drill') key = (item.data as any).creatorId || 'drill-misc';
        else if (item.type === 'sparring') key = item.data.creatorId || 'sparring-misc';

        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(item);
    });

    // Shuffle each group's internal order
    Object.values(grouped).forEach(group => {
        for (let i = group.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [group[i], group[j]] = [group[j], group[i]];
        }
    });

    const result: MixedItem[] = [];
    const keys = Object.keys(grouped).sort(() => Math.random() - 0.5);
    let hasMore = true;
    let pickIndex = 0;

    while (hasMore) {
        hasMore = false;
        keys.forEach(key => {
            if (grouped[key][pickIndex]) {
                result.push(grouped[key][pickIndex]);
                hasMore = true;
            }
        });
        pickIndex++;
    }
    return result;
};

export function Watch() {
    const { user, isSubscribed } = useAuth();
    const [searchParams] = useSearchParams();

    // Initialize tab from URL or default to 'mix'
    const initialTab = (searchParams.get('tab') as WatchTab) || 'mix';
    const targetId = searchParams.get('id');

    const [activeTab, setActiveTab] = useState<WatchTab>(initialTab);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<MixedItem[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [userPermissions, setUserPermissions] = useState<UserPermissions>({
        isSubscriber: false,
        purchasedItemIds: []
    });

    const [dailyFreeDrillId, setDailyFreeDrillId] = useState<string | undefined>(undefined);
    const [dailyFreeLessonId, setDailyFreeLessonId] = useState<string | undefined>(undefined);
    const [dailyFreeSparringId, setDailyFreeSparringId] = useState<string | undefined>(undefined);

    const tabs = [
        { id: 'mix' as const, label: '전체' },
        { id: 'lesson' as const, label: '레슨' },
        { id: 'drill' as const, label: '드릴' },
        { id: 'sparring' as const, label: '스파링' },
    ];

    const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

    // Update activeTab when URL tab param changes
    useEffect(() => {
        const tab = searchParams.get('tab') as WatchTab;
        if (tab && tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load user permissions (Sync with AuthContext + Fetch Purchases)
    useEffect(() => {
        const loadUserPermissions = async () => {
            if (!user?.id) {
                setUserPermissions({ isSubscriber: false, purchasedItemIds: [] });
                return;
            }

            try {
                // Fetch purchases only (isSubscriber comes from AuthContext)
                const { data: purchases } = await supabase
                    .from('purchases')
                    .select('item_id')
                    .eq('user_id', user.id);

                setUserPermissions({
                    isSubscriber: isSubscribed, // Use value from AuthContext
                    purchasedItemIds: purchases?.map(p => p.item_id) || []
                });
            } catch (error) {
                console.error('Error loading user permissions:', error);
                // Fallback to AuthContext value even if purchases fail
                setUserPermissions(prev => ({ ...prev, isSubscriber: isSubscribed }));
            }
        };

        loadUserPermissions();
    }, [user?.id, isSubscribed]);

    // Load Data based on activeTab
    useEffect(() => {
        loadContent();
    }, [activeTab, userPermissions.isSubscriber, userPermissions.purchasedItemIds.length]);

    const loadContent = async () => {
        try {
            setLoading(true);

            const { fetchCreatorsByIds, transformLesson, transformSparringVideo, getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } = await import('../lib/api');

            // Filter Drills: Must belong to at least one routine (joined via routine_drills)
            let drillQuery = supabase.from('drills')
                .select('*, routine_drills!inner(id)')
                .order('created_at', { ascending: false })
                .limit(100);

            // Filter Sparring: Must be explicitly published. 
            // Removed price filter to show all sparring (including free ones)
            let sparringQuery = supabase.from('sparring_videos')
                .select('*')
                .eq('is_published', true)
                .order('created_at', { ascending: false })
                .limit(100);

            // Filter Lessons: Fetch those belonging to a published course
            let lessonQuery = supabase.from('lessons')
                .select('*, course:courses!inner(*)')
                .eq('course.published', true)
                .order('created_at', { ascending: false })
                .limit(200);

            const queries: any[] = [];
            if (activeTab === 'mix' || activeTab === 'drill') queries.push(drillQuery);
            else queries.push(Promise.resolve({ data: [] }));

            if (activeTab === 'mix' || activeTab === 'sparring') queries.push(sparringQuery);
            else queries.push(Promise.resolve({ data: [] }));

            if (activeTab === 'mix' || activeTab === 'lesson') queries.push(lessonQuery);
            else queries.push(Promise.resolve({ data: [] }));

            // 4. Specific Target Request (If not in top results)
            if (targetId) {
                // Fetch from all three types just in case
                queries.push(
                    Promise.all([
                        supabase.from('drills').select('*, routine_drills(id)').eq('id', targetId).maybeSingle(),
                        supabase.from('sparring_videos').select('*').eq('id', targetId).maybeSingle(),
                        supabase.from('lessons').select('*, course:courses(*)').eq('id', targetId).maybeSingle()
                    ])
                );
            } else {
                queries.push(Promise.resolve([null, null, null]));
            }

            const [drillsRes, sparringRes, lessonsRes, targetRes] = await Promise.all(queries);

            // Get daily free content IDs
            const [dailyDrillRes, dailyLessonRes, dailySparringRes] = await Promise.all([
                getDailyFreeDrill(),
                getDailyFreeLesson(),
                getDailyFreeSparring()
            ]);

            // Daily free IDs logic

            setDailyFreeDrillId(dailyDrillRes.data?.id);
            setDailyFreeLessonId(dailyLessonRes.data?.id);
            setDailyFreeSparringId(dailySparringRes.data?.id);

            let allItems: MixedItem[] = [];
            const allCreatorIds: string[] = [];

            if (drillsRes.data) drillsRes.data.forEach((d: any) => d.creator_id && allCreatorIds.push(d.creator_id));
            if (lessonsRes.data) lessonsRes.data.forEach((l: any) => (l.course?.creator_id || l.creator_id) && allCreatorIds.push(l.course?.creator_id || l.creator_id));
            if (sparringRes.data) sparringRes.data.forEach((s: any) => s.creator_id && allCreatorIds.push(s.creator_id));
            if (sparringRes.data) sparringRes.data.forEach((s: any) => s.creator_id && allCreatorIds.push(s.creator_id));

            // Add Daily Content Creator IDs
            if (dailyDrillRes.data && dailyDrillRes.data.creatorId) allCreatorIds.push(dailyDrillRes.data.creatorId);
            if (dailyLessonRes.data && (dailyLessonRes.data.creatorId || (dailyLessonRes.data as any).course?.creator_id)) allCreatorIds.push(dailyLessonRes.data.creatorId || (dailyLessonRes.data as any).creatorId || (dailyLessonRes.data as any).course?.creator_id);
            if (dailySparringRes.data && dailySparringRes.data.creatorId) allCreatorIds.push(dailySparringRes.data.creatorId);

            // Add Target Content Creator IDs
            if (targetRes) {
                const [td, ts, tl] = targetRes;
                if (td?.data?.creator_id) allCreatorIds.push(td.data.creator_id);
                if (ts?.data?.creator_id) allCreatorIds.push(ts.data.creator_id);
                if (tl?.data?.course?.creator_id || tl?.data?.creator_id) allCreatorIds.push(tl.data.course?.creator_id || tl.data.creator_id);
            }

            const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

            // Transform
            if (drillsRes.data) {
                allItems = [...allItems, ...drillsRes.data.map((d: any) => ({
                    type: 'drill' as const,
                    data: {
                        ...d,
                        id: d.id,
                        title: d.title,
                        description: d.description,
                        category: d.category,
                        difficulty: d.difficulty,
                        thumbnailUrl: d.thumbnail_url,
                        videoUrl: d.video_url,
                        vimeoUrl: d.vimeo_url,
                        descriptionVideoUrl: d.description_video_url,
                        durationMinutes: d.duration_minutes,
                        price: d.price,
                        views: d.views,
                        creatorId: d.creator_id,
                        creatorName: creatorsMap[d.creator_id]?.name || 'Instructor',
                        creatorProfileImage: creatorsMap[d.creator_id]?.avatarUrl || undefined,
                        aspectRatio: '9:16' as const,
                    }
                }))];
            }

            if (sparringRes.data) {
                allItems = [...allItems, ...sparringRes.data.map((s: any) => {
                    const transformed = transformSparringVideo(s);
                    const creatorInfo = creatorsMap[s.creator_id];

                    // Inject creator info if available so profile/follow buttons appear
                    if (creatorInfo && s.creator_id) {
                        transformed.creator = {
                            id: s.creator_id,
                            name: creatorInfo.name || 'Unknown',
                            profileImage: creatorInfo.avatarUrl || '',
                            bio: '',
                            subscriberCount: 0
                        };
                    }

                    return {
                        type: 'sparring' as const,
                        data: transformed
                    };
                })];
            }

            if (lessonsRes.data) {
                allItems = [...allItems, ...lessonsRes.data.map((l: any) => {
                    const transformed = transformLesson(l);
                    const creatorId = l.course?.creator_id || l.creator_id;
                    const creator = creatorsMap[creatorId];
                    return {
                        type: 'lesson' as const,
                        data: {
                            ...transformed,
                            creatorId,
                            creatorName: creator?.name || 'Instructor',
                            creatorProfileImage: creator?.avatarUrl || undefined,
                        }
                    };
                })];
            }




            // Ensure Daily Free Sparring is included (even if not in the latest 20 fetch)
            // This is critical for Guest users who can ONLY see this video
            if ((activeTab === 'mix' || activeTab === 'sparring') && dailySparringRes.data) {
                const dailyItem = dailySparringRes.data;
                const exists = allItems.some(item => item.data.id === dailyItem.id);
                if (!exists) {
                    const creatorInfo = creatorsMap[dailyItem.creatorId];
                    const enrichedDailyItem = { ...dailyItem };

                    if (creatorInfo && dailyItem.creatorId) {
                        enrichedDailyItem.creator = {
                            id: dailyItem.creatorId,
                            name: creatorInfo.name || 'Unknown',
                            profileImage: creatorInfo.avatarUrl || '',
                            bio: '',
                            subscriberCount: 0
                        };
                    }

                    allItems.push({
                        type: 'sparring',
                        data: enrichedDailyItem as any
                    });
                }
            }

            // Ensure Target Content is included (even if filtered out or not in latest fetch)
            if (targetId && targetRes) {
                const [td, ts, tl] = targetRes;
                const targetData = td?.data || ts?.data || tl?.data;
                if (targetData && !allItems.some(item => item.data.id === targetId)) {
                    if (td?.data) {
                        allItems.push({
                            type: 'drill',
                            data: {
                                ...td.data,
                                creatorName: creatorsMap[td.data.creator_id]?.name || 'Instructor',
                                creatorProfileImage: creatorsMap[td.data.creator_id]?.avatarUrl || undefined,
                                aspectRatio: '9:16'
                            } as any
                        });
                    } else if (ts?.data) {
                        const transformed = transformSparringVideo(ts.data);
                        const creatorInfo = creatorsMap[ts.data.creator_id];
                        if (creatorInfo) {
                            transformed.creator = {
                                id: ts.data.creator_id,
                                name: creatorInfo.name || 'Unknown',
                                profileImage: creatorInfo.avatarUrl || '',
                                bio: '',
                                subscriberCount: 0
                            };
                        }
                        allItems.push({ type: 'sparring', data: transformed });
                    } else if (tl?.data) {
                        const transformed = transformLesson(tl.data);
                        const creatorId = tl.data.course?.creator_id || tl.data.creator_id;
                        const creator = creatorsMap[creatorId];
                        allItems.push({
                            type: 'lesson',
                            data: {
                                ...transformed,
                                creatorId,
                                creatorName: creator?.name || 'Instructor',
                                creatorProfileImage: creator?.avatarUrl || undefined
                            } as any
                        });
                    }
                }
            }

            // --- Strict Filtering Logic ---
            const dailyFreeIds = new Set([
                dailyDrillRes.data?.id,
                dailyLessonRes.data?.id,
                dailySparringRes.data?.id
            ].filter(Boolean));

            const filteredItems = allItems.filter(item => {
                // 1. Subscribers see everything
                if (userPermissions.isSubscriber) return true;

                // 2. Logged-in non-subscribers see daily free + purchased
                if (user) {
                    return dailyFreeIds.has(item.data.id) || userPermissions.purchasedItemIds.includes(item.data.id);
                }

                // 3. Guests (not logged in) see only daily free
                return dailyFreeIds.has(item.data.id);
            });

            const finalizedItems = diversifyContent(filteredItems);

            // If a specific ID is requested, find it and move to front
            if (targetId) {
                const targetIndex = finalizedItems.findIndex(item => item.data.id === targetId);
                if (targetIndex !== -1) {
                    const targetItem = finalizedItems[targetIndex];
                    finalizedItems.splice(targetIndex, 1);
                    finalizedItems.unshift(targetItem);
                }
            }

            setItems(finalizedItems);
            setLoading(false);

        } catch (error) {
            console.error("Failed to load content", error);
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100dvh-64px)] md:h-screen bg-black text-white flex md:pl-28 relative overflow-hidden pb-24 md:pb-0">

            {/* TOP DROPDOWN TABS */}
            <div className="absolute top-6 left-0 right-0 z-[100] flex justify-center pointer-events-none px-4">
                <div ref={dropdownRef} className="relative pointer-events-auto">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-4 py-2 transition-all active:scale-95 group"
                    >
                        <span className="text-sm font-bold text-white/90 group-hover:text-white items-center flex gap-1.5 uppercase tracking-widest transition-colors">
                            {currentTab.label}
                            <ChevronDown className={cn("w-3.5 h-3.5 text-zinc-500 transition-transform duration-300", isDropdownOpen && "rotate-180")} />
                        </span>
                    </button>

                    <AnimatePresence>
                        {isDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-40 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl z-50 p-2"
                            >
                                {tabs.map((tab) => {
                                    const isActive = activeTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-center px-4 py-3 rounded-2xl transition-all duration-200 group text-sm font-bold",
                                                isActive
                                                    ? "bg-violet-500/20 text-violet-400"
                                                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full relative">
                <div className="w-full h-full">
                    {loading ? (
                        <LoadingScreen message={`${currentTab.label} 피드를 준비하고 있습니다...`} />
                    ) : items.length > 0 ? (
                        <MixedReelsFeed
                            items={items}
                            userPermissions={userPermissions}
                            isLoggedIn={!!user}
                            dailyFreeDrillId={dailyFreeDrillId}
                            dailyFreeLessonId={dailyFreeLessonId}
                            dailyFreeSparringId={dailyFreeSparringId}
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4">
                            <div className="w-16 h-16 rounded-3xl bg-zinc-900 flex items-center justify-center">
                                <Clapperboard className="w-8 h-8 text-zinc-700" />
                            </div>
                            <p className="font-bold text-sm">표시할 콘텐츠가 없습니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}

export default Watch;
