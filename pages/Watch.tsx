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

export function Watch() {
    const { user } = useAuth();
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

    const tabs = [
        { id: 'mix' as const, label: '전체' },
        { id: 'lesson' as const, label: '레슨' },
        { id: 'drill' as const, label: '드릴' },
        { id: 'sparring' as const, label: '스파링' },
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

    // Load user permissions
    useEffect(() => {
        const loadUserPermissions = async () => {
            if (!user?.id) {
                setUserPermissions({ isSubscriber: false, purchasedItemIds: [] });
                return;
            }

            try {
                const [userRes, purchasesRes] = await Promise.all([
                    supabase
                        .from('users')
                        .select('is_subscriber')
                        .eq('id', user.id)
                        .maybeSingle(),
                    supabase
                        .from('purchases')
                        .select('item_id')
                        .eq('user_id', user.id)
                ]);

                setUserPermissions({
                    isSubscriber: userRes.data?.is_subscriber === true,
                    purchasedItemIds: purchasesRes.data?.map(p => p.item_id) || []
                });
            } catch (error) {
                console.error('Error loading user permissions:', error);
            }
        };

        loadUserPermissions();
    }, [user?.id]);

    // Load Data based on activeTab
    useEffect(() => {
        loadContent();
    }, [activeTab, userPermissions.isSubscriber, userPermissions.purchasedItemIds.length]);

    const loadContent = async () => {
        try {
            setLoading(true);

            const { canAccessContentSync } = await import('../lib/api-accessible-content');
            const { fetchCreatorsByIds, transformLesson, getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } = await import('../lib/api');
            const userId = user?.id || null;

            // Filter Drills: Must belong to at least one routine (joined via routine_drills)
            let drillQuery = supabase.from('drills')
                .select('*, routine_drills!inner(id)')
                .order('created_at', { ascending: false })
                .limit(50);

            // Filter Sparring: Must be explicitly published and have a price > 0 (Content)
            let sparringQuery = supabase.from('sparring_videos')
                .select('*')
                .eq('is_published', true)
                .gt('price', 0)
                .order('created_at', { ascending: false })
                .limit(20);

            // Filter Lessons: Fetch those belonging to a published course
            let lessonQuery = supabase.from('lessons')
                .select('*, course:courses!inner(*)')
                .eq('course.published', true)
                .order('created_at', { ascending: false })
                .limit(50);

            const queries: any[] = [];
            if (activeTab === 'mix' || activeTab === 'drill') queries.push(drillQuery);
            else queries.push(Promise.resolve({ data: [] }));

            if (activeTab === 'mix' || activeTab === 'sparring') queries.push(sparringQuery);
            else queries.push(Promise.resolve({ data: [] }));

            if (activeTab === 'mix' || activeTab === 'lesson') queries.push(lessonQuery);
            else queries.push(Promise.resolve({ data: [] }));

            const [drillsRes, sparringRes, lessonsRes] = await Promise.all(queries);

            // Get daily free content IDs
            const [dailyDrillRes, dailyLessonRes, dailySparringRes] = await Promise.all([
                getDailyFreeDrill(),
                getDailyFreeLesson(),
                getDailyFreeSparring()
            ]);

            const dailyFreeDrillIds = dailyDrillRes.data?.id ? [dailyDrillRes.data.id] : [];
            const dailyFreeLessonIds = dailyLessonRes.data?.id ? [dailyLessonRes.data.id] : [];
            const dailyFreeSparringIds = dailySparringRes.data?.id ? [dailySparringRes.data.id] : [];

            // Store daily free drill ID in state
            setDailyFreeDrillId(dailyDrillRes.data?.id);

            const isAccessible = (contentType: 'drill' | 'sparring' | 'lesson', content: any) => {
                // For other content types video/vimeo url check
                if (true) {
                    // lessons and drills use vimeo_url, sparring uses video_url
                    const url = contentType === 'sparring' ? content.video_url : content.vimeo_url;
                    // Valid if: URL starts with http, OR is a pure Vimeo ID (numeric string), OR is ID:hash format
                    const isValidVideoUrl = url && !url.includes('ERROR') && (
                        url.startsWith('http') ||
                        /^\d+$/.test(url) ||
                        /^\d+:[a-z0-9]+$/i.test(url) // ID:hash format like "1139272530:3fdc00141c"
                    );
                    if (!isValidVideoUrl) return false;
                }

                let isDailyFree = false;
                if (contentType === 'drill') isDailyFree = dailyFreeDrillIds.includes(content.id);
                else if (contentType === 'lesson') isDailyFree = dailyFreeLessonIds.includes(content.id);
                else if (contentType === 'sparring') isDailyFree = dailyFreeSparringIds.includes(content.id);

                return canAccessContentSync({
                    contentId: content.id,
                    isDailyFreeContent: isDailyFree,
                    isSubscriber: userPermissions.isSubscriber,
                    purchasedItemIds: userPermissions.purchasedItemIds,
                    isLoggedIn: !!userId
                });
            };

            let allItems: MixedItem[] = [];
            const allCreatorIds: string[] = [];

            if (drillsRes.data) drillsRes.data.forEach((d: any) => d.creator_id && allCreatorIds.push(d.creator_id));
            if (lessonsRes.data) lessonsRes.data.forEach((l: any) => (l.course?.creator_id || l.creator_id) && allCreatorIds.push(l.course?.creator_id || l.creator_id));
            if (sparringRes.data) sparringRes.data.forEach((s: any) => s.creator_id && allCreatorIds.push(s.creator_id));
            if (sparringRes.data) sparringRes.data.forEach((s: any) => s.creator_id && allCreatorIds.push(s.creator_id));

            const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

            // Transform & Filter
            if (drillsRes.data) {
                // 드릴 접근 제어: 오늘의 무료 드릴 OR 구독자/구매자만
                const accessibleDrills = drillsRes.data.filter((d: any) => {
                    const isDailyFreeDrill = dailyFreeDrillIds.includes(d.id);
                    // 오늘의 무료 드릴이거나 접근 가능한 드릴만 표시
                    return isDailyFreeDrill || isAccessible('drill', d);
                });
                allItems = [...allItems, ...accessibleDrills.map((d: any) => ({
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
                const accessibleSparring = sparringRes.data.filter((s: any) => isAccessible('sparring', s));
                allItems = [...allItems, ...accessibleSparring.map((s: any) => ({
                    type: 'sparring' as const,
                    data: {
                        ...s,
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        videoUrl: s.video_url,
                        thumbnailUrl: s.thumbnail_url,
                        creatorId: s.creator_id,
                        views: s.views,
                        likes: s.likes,
                        price: s.price,
                        category: s.category,
                        uniformType: s.uniform_type,
                        difficulty: s.difficulty,
                        creator: creatorsMap[s.creator_id] ? {
                            id: s.creator_id,
                            name: creatorsMap[s.creator_id].name,
                            avatar_url: creatorsMap[s.creator_id].avatarUrl
                        } : s.creator
                    }
                }))];
            }

            if (lessonsRes.data) {
                const accessibleLessons = lessonsRes.data.filter((l: any) => {
                    // Manual filter for published course
                    if (!l.course || l.course.published !== true) return false;
                    return isAccessible('lesson', l);
                });

                allItems = [...allItems, ...accessibleLessons.map((l: any) => {
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
                    allItems.push({
                        type: 'sparring',
                        data: dailyItem as any
                    });
                }
            }

            // Shuffle
            const shuffleArray = (array: MixedItem[]) => {
                const newArray = [...array];
                for (let i = newArray.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
                }
                return newArray;
            };

            let finalizedItems = shuffleArray(allItems);

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
        </div>
    );
}

export default Watch;
