import { useState, useEffect } from 'react';
import { Shuffle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { MixedReelsFeed, MixedItem } from '../components/reels/MixedReelsFeed';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface UserPermissions {
    isSubscriber: boolean;
    purchasedItemIds: string[];
}

type WatchTab = 'mix';

export function Watch() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState<WatchTab>('mix');
    const [loadingMix, setLoadingMix] = useState(false);
    const [mixedItems, setMixedItems] = useState<MixedItem[]>([]);
    const [userPermissions, setUserPermissions] = useState<UserPermissions>({
        isSubscriber: false,
        purchasedItemIds: []
    });

    const tabs = [
        { id: 'mix' as const, label: '믹스', icon: Shuffle, color: 'text-pink-500' },
    ];

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

    // Load Mix Data
    useEffect(() => {
        if (activeTab === 'mix' && mixedItems.length === 0) {
            loadMixedContent();
        }
    }, [activeTab, mixedItems.length]);

    const loadMixedContent = async () => {
        try {
            setLoadingMix(true);

            const { canAccessContentSync } = await import('../lib/api-accessible-content');
            const { fetchCreatorsByIds, transformLesson, getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } = await import('../lib/api');
            const userId = user?.id || null;

            // Get all content (not just accessible)
            const [allDrillsRes, allSparringRes, allLessonsRes] = await Promise.all([
                supabase.from('drills').select('*').order('created_at', { ascending: false }).limit(50),
                supabase.from('sparring_videos').select('*').order('created_at', { ascending: false }).limit(20),
                supabase.from('lessons').select('*, course:courses(id, title, thumbnail_url, creator_id, price, is_subscription_excluded)').order('created_at', { ascending: false }).limit(50)
            ]);

            // Get daily free content IDs (랜덤하게 매일 변경됨)
            const [dailyDrillRes, dailyLessonRes, dailySparringRes] = await Promise.all([
                getDailyFreeDrill(),
                getDailyFreeLesson(),
                getDailyFreeSparring()
            ]);

            // Daily free content IDs
            const dailyFreeDrillIds = dailyDrillRes.data?.id ? [dailyDrillRes.data.id] : [];
            const dailyFreeLessonIds = dailyLessonRes.data?.id ? [dailyLessonRes.data.id] : [];
            const dailyFreeSparringIds = dailySparringRes.data?.id ? [dailySparringRes.data.id] : [];

            // Helper function to calculate access info
            const calculateAccessInfo = (contentType: 'drill' | 'sparring' | 'lesson', content: any) => {
                const price = content.price; // Do not default to 0, if undefined it should not be free
                let isDailyFree = false;
                if (contentType === 'drill') {
                    isDailyFree = dailyFreeDrillIds.includes(content.id);
                } else if (contentType === 'lesson') {
                    isDailyFree = dailyFreeLessonIds.includes(content.id);
                } else if (contentType === 'sparring') {
                    isDailyFree = dailyFreeSparringIds.includes(content.id);
                }

                const canAccess = canAccessContentSync({
                    contentId: content.id,
                    isDailyFreeContent: isDailyFree,
                    isSubscriber: userPermissions.isSubscriber,
                    purchasedItemIds: userPermissions.purchasedItemIds,
                    isLoggedIn: !!userId
                });

                if (canAccess) {
                    return { canAccess: true };
                }

                // Determine why access is denied
                if (!userId) {
                    return {
                        canAccess: false,
                        requiresLogin: true
                    };
                }

                // If it's not daily free and we reached here, it's not yet accessible.
                // We show purchase/sub prompt regardless of price (0 or >0)
                if (!userPermissions.isSubscriber) {
                    if (userPermissions.purchasedItemIds.includes(content.id)) {
                        return { canAccess: false };
                    }
                    return {
                        canAccess: false,
                        requiresPurchase: true,
                        requiresSubscription: true,
                        price: price || 0
                    };
                }

                return {
                    canAccess: false,
                    requiresSubscription: true
                };
            };

            let items: MixedItem[] = [];
            const allCreatorIds: string[] = [];

            // Collect Creator IDs from all content
            if (allDrillsRes.data) {
                allDrillsRes.data.forEach((d: any) => {
                    if (d.creator_id) allCreatorIds.push(d.creator_id);
                });
            }
            if (allLessonsRes.data) {
                allLessonsRes.data.forEach((l: any) => {
                    if (l.creator_id) allCreatorIds.push(l.creator_id);
                    if (l.course?.creator_id) allCreatorIds.push(l.course.creator_id);
                });
            }
            if (allSparringRes.data) {
                allSparringRes.data.forEach((s: any) => {
                    if (s.creator_id) allCreatorIds.push(s.creator_id);
                });
            }

            // Fetch all creators at once
            const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

            // Process Drills
            if (allDrillsRes.data && allDrillsRes.data.length > 0) {
                const drills: MixedItem[] = allDrillsRes.data.map((d: any) => ({
                    type: 'drill' as const,
                    data: {
                        id: d.id,
                        title: d.title,
                        description: d.description,
                        creatorId: d.creator_id,
                        creatorName: creatorsMap[d.creator_id]?.name || 'Instructor',
                        creatorProfileImage: creatorsMap[d.creator_id]?.avatarUrl || undefined,
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
                    },
                    accessInfo: calculateAccessInfo('drill', d)
                }));
                items = [...items, ...drills];
            }

            // Process Sparring
            if (allSparringRes.data && allSparringRes.data.length > 0) {
                const sparring: MixedItem[] = allSparringRes.data.map((s: any) => {
                    const creator = creatorsMap[s.creator_id];
                    return {
                        type: 'sparring' as const,
                        data: {
                            ...s,
                            creator: creator ? {
                                id: s.creator_id,
                                name: creator.name,
                                avatar_url: creator.avatarUrl
                            } : s.creator
                        },
                        accessInfo: calculateAccessInfo('sparring', s)
                    };
                });
                items = [...items, ...sparring];
            }

            // Process Lessons
            if (allLessonsRes.data && allLessonsRes.data.length > 0) {
                const lessons: MixedItem[] = allLessonsRes.data.map((l: any) => {
                    const transformed = transformLesson(l);
                    const creatorId = l.course?.creator_id || l.creator_id;
                    const creator = creatorsMap[creatorId];

                    return {
                        type: 'lesson' as const,
                        data: {
                            ...transformed,
                            creatorId: creatorId,
                            creatorName: creator?.name || 'Instructor',
                            creatorProfileImage: creator?.avatarUrl || undefined,
                        },
                        accessInfo: calculateAccessInfo('lesson', l.course || l)
                    };
                });
                items = [...items, ...lessons];
            }

            // Filter out items the user cannot access
            const accessibleItems = items.filter(item => item.accessInfo?.canAccess);

            // Shuffle
            for (let i = accessibleItems.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [accessibleItems[i], accessibleItems[j]] = [accessibleItems[j], accessibleItems[i]];
            }

            setMixedItems(accessibleItems);
            setLoadingMix(false);

        } catch (error) {
            console.error("Failed to load mixed content", error);
            setLoadingMix(false);
        }
    };

    return (
        <div className="h-[calc(100dvh-64px)] md:h-screen bg-black text-white flex md:pl-28 relative overflow-hidden">
            {/* Left Sub-Navigation Sidebar */}
            <div className="hidden sm:flex w-20 md:w-24 flex-col items-center py-8 gap-8 border-r border-zinc-900 bg-zinc-950/20 backdrop-blur-sm z-50">
                <div className="flex flex-col gap-6">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "group flex flex-col items-center gap-1.5 transition-all outline-none",
                                    isActive ? "opacity-100 scale-110" : "opacity-40 hover:opacity-100"
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-2xl transition-all duration-300",
                                    isActive ? "bg-zinc-800 shadow-lg shadow-white/5 ring-1 ring-white/10" : "bg-transparent group-hover:bg-zinc-900"
                                )}>
                                    <Icon className={cn("w-5 h-5", isActive ? tab.color : "text-zinc-400")} />
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold tracking-tight transition-colors",
                                    isActive ? "text-white" : "text-zinc-500"
                                )}>
                                    {tab.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Mobile Top Tab Picker */}
            <div className="sm:hidden absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full p-1.5 flex items-center pointer-events-auto shadow-2xl">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap",
                                    isActive ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-white"
                                )}
                            >
                                <Icon className={cn("w-3.5 h-3.5", isActive ? tab.color : "text-zinc-600")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 h-full relative">
                <div className="w-full h-full">
                    {loadingMix ? (
                        <LoadingScreen message="영상을 섞고 있습니다..." />
                    ) : mixedItems.length > 0 ? (
                        <MixedReelsFeed
                            items={mixedItems}
                            userPermissions={userPermissions}
                            isLoggedIn={!!user?.id}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-500">
                            <p>표시할 콘텐츠가 없습니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
