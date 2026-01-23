import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { MixedReelsFeed, MixedItem } from '../components/reels/MixedReelsFeed';
import { supabase } from '../lib/supabase';

interface UserPermissions {
    isSubscriber: boolean;
    purchasedItemIds: string[];
}

export function LessonReels() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [lessons, setLessons] = useState<MixedItem[]>([]);
    const [userPermissions, setUserPermissions] = useState<UserPermissions>({
        isSubscriber: false,
        purchasedItemIds: []
    });

    // Load user permissions
    useEffect(() => {
        const loadUserPermissions = async () => {
            if (!user?.id) return;
            try {
                const [userRes, purchasesRes] = await Promise.all([
                    supabase.from('users').select('is_subscriber').eq('id', user.id).maybeSingle(),
                    supabase.from('purchases').select('item_id').eq('user_id', user.id)
                ]);
                setUserPermissions({
                    isSubscriber: userRes.data?.is_subscriber === true,
                    purchasedItemIds: purchasesRes.data?.map(p => p.item_id) || []
                });
            } catch (error) {
                console.error('Error loading permissions:', error);
            }
        };
        loadUserPermissions();
    }, [user?.id]);

    // Load Lesson Content
    useEffect(() => {
        loadLessonContent();
    }, [userPermissions]);

    const loadLessonContent = async () => {
        try {
            setLoading(true);

            const { fetchCreatorsByIds, transformLesson, getDailyFreeLesson } = await import('../lib/api');
            const { canAccessContentSync } = await import('../lib/api-accessible-content');

            // Get lessons that belong to a published course
            const { data: allLessons, error: lessonError } = await supabase
                .from('lessons')
                .select('*, course:courses!inner(id, title, thumbnail_url, creator_id, price, is_subscription_excluded, published)')
                .eq('course.published', true)
                .order('created_at', { ascending: false })
                .limit(200);

            if (lessonError) throw lessonError;

            // Get daily free lesson
            const dailyLessonRes = await getDailyFreeLesson();
            const dailyFreeLessonId = dailyLessonRes.data?.id;

            const allCreatorIds = allLessons?.map((l: any) => l.course?.creator_id || l.creator_id).filter(Boolean) || [];
            const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

            const processedLessons = (allLessons || []).map((l: any) => {
                const transformed = transformLesson(l);
                const creatorId = l.course?.creator_id || l.creator_id;
                const creator = creatorsMap[creatorId];

                const isDailyFree = dailyFreeLessonId === l.id;
                const canAccess = canAccessContentSync({
                    contentId: l.id,
                    isDailyFreeContent: isDailyFree,
                    isSubscriber: userPermissions.isSubscriber,
                    purchasedItemIds: userPermissions.purchasedItemIds,
                    isLoggedIn: !!user?.id
                });

                return {
                    type: 'lesson' as const,
                    data: {
                        ...transformed,
                        creatorId: creatorId,
                        creatorName: creator?.name || 'Instructor',
                        creatorProfileImage: creator?.avatarUrl || undefined,
                    },
                    accessInfo: { canAccess }
                };
            }).filter(item => item.accessInfo.canAccess);

            // Improved Shuffle to ensure diversity
            const diversifyContent = (array: MixedItem[]) => {
                const grouped: Record<string, MixedItem[]> = {};
                array.forEach(item => {
                    let key = 'unknown';
                    if (item.type === 'lesson') key = item.data.courseId || 'lesson-misc';

                    if (!grouped[key]) grouped[key] = [];
                    grouped[key].push(item);
                });

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

            const finalizedLessons = diversifyContent(processedLessons);

            setLessons(finalizedLessons);
            setLoading(false);

        } catch (error) {
            console.error("Failed to load lesson content", error);
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100dvh-64px)] md:h-screen bg-black text-white flex relative overflow-hidden">
            {/* Content area */}
            <div className="flex-1 h-full relative">
                <div className="w-full h-full">
                    {loading ? (
                        <LoadingScreen message="레슨을 준비하고 있습니다..." />
                    ) : lessons.length > 0 ? (
                        <MixedReelsFeed
                            items={lessons}
                            userPermissions={userPermissions}
                            isLoggedIn={!!user?.id}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-500">
                            <p>시청 가능한 레슨이 없습니다</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LessonReels;
