import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
    getDailyFreeSparring,
    getSparringVideos,
    // getDailyFreeLesson, // Unused top-level (used via dynamic import below)
    fetchCreatorsByIds
} from '../lib/api';
import { calculateHotScore } from '../lib/utils';

/**
 * 사용자 권한 정보를 가져오는 훅
 * - 구독 상태
 * - 구매한 아이템 ID 목록
 */
export function useFeedPermissions() {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['user-permissions', user?.id],
        queryFn: async () => {
            if (!user?.id) {
                return {
                    isSubscriber: false,
                    purchasedItemIds: [] as string[]
                };
            }

            const [userRes, purchasesRes] = await Promise.all([
                supabase
                    .from('users')
                    .select('is_subscriber, is_complimentary_subscription, is_admin')
                    .eq('id', user.id)
                    .maybeSingle(),
                (supabase as any)
                    .from('purchases')
                    .select('item_id')
                    .eq('user_id', user.id)
            ]);

            const isSubscriber = !!(
                userRes.data?.is_subscriber ||
                userRes.data?.is_complimentary_subscription ||
                userRes.data?.is_admin
            );

            return {
                isSubscriber,
                purchasedItemIds: purchasesRes.data?.map((p: any) => p.item_id) || []
            };
        },
        staleTime: 1000 * 60 * 5, // 5분
        // enabled: !!user?.id  <-- REMOVED: Allow fetch for anonymous users (returns default false)
    });
}

/**
 * 드릴 피드 데이터를 가져오는 훅
 * - 무료 루틴의 드릴만 가져옴
 * - 자동 셔플
 * - 1분마다 자동 새로고침 (폴링 대체)
 */
export function useDrillsFeed() {
    const { user: _user } = useAuth();
    const { data: permissions } = useFeedPermissions();

    return useQuery({
        queryKey: ['drills-feed', permissions?.isSubscriber, permissions?.purchasedItemIds],
        queryFn: async () => {
            console.log('[useDrillsFeed] Loading content...');
            const { fetchCreatorsByIds } = await import('../lib/api');
            // const { canAccessContentSync } = await import('../lib/api-accessible-content'); // No longer filtering here

            // Get drills from routines (no longer filtering by price=0 here)
            // Note: related_lesson join is done separately to handle cases where migration hasn't been applied
            const { data: routineDrills, error: drillError } = await supabase
                .from('routine_drills')
                .select(`
                    drill:drills!inner (*),
                    routines!inner (
                        id,
                        price,
                        title
                    )
                `)
                .limit(50); // Reduced from 200 for better performance

            // Try to fetch related lessons separately (gracefully handles missing column)
            let relatedLessonsMap: Record<string, any> = {};
            try {
                const drillIds = routineDrills?.map((rd: any) => rd.drill.id) || [];
                if (drillIds.length > 0) {
                    const { data: drillsWithRelated } = await supabase
                        .from('drills')
                        .select('id, related_lesson_id')
                        .in('id', drillIds)
                        .not('related_lesson_id', 'is', null);

                    if (drillsWithRelated && drillsWithRelated.length > 0) {
                        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                        const lessonIds = drillsWithRelated
                            .map((d: any) => d.related_lesson_id)
                            .filter((id: any) => id && uuidRegex.test(id));
                        const { data: lessons } = await supabase
                            .from('lessons')
                            .select('id, title, thumbnail_url, course_id')
                            .in('id', lessonIds);

                        const lessonsById = Object.fromEntries((lessons || []).map((l: any) => [l.id, l]));
                        drillsWithRelated.forEach((d: any) => {
                            if (d.related_lesson_id && lessonsById[d.related_lesson_id]) {
                                relatedLessonsMap[d.id] = lessonsById[d.related_lesson_id];
                            }
                        });
                    }
                }
            } catch (e) {
                // Column might not exist yet - that's okay
                console.log('[useDrillsFeed] related_lesson_id column not available yet');
            }

            if (drillError) {
                console.error('[useDrillsFeed] Fetch error:', drillError);
                throw drillError;
            }

            // Extract drills from the Join result
            const allDrills = routineDrills?.map((item: any) => item.drill) || [];
            console.log('[useDrillsFeed] Raw drills fetched:', allDrills?.length);
            console.log('[useDrillsFeed] routineDrills sample:', routineDrills?.slice(0, 2));

            const allCreatorIds = allDrills?.map((d: any) => d.creator_id).filter(Boolean) || [];
            const creatorsMap = await fetchCreatorsByIds([...new Set(allCreatorIds)]);

            const processedDrills = (allDrills || [])
                .filter((d: any) => {
                    const hasError = (d.vimeo_url?.toString().includes('ERROR')) ||
                        (d.video_url?.toString().includes('ERROR')) ||
                        (d.description_video_url?.toString().includes('ERROR'));

                    return !hasError;
                });

            console.log('[useDrillsFeed] After filter, drills count:', processedDrills.length);

            const mappedDrills = processedDrills.map((d: any) => ({
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
                price: 0, // We use routine price for access, setting 0 here for UI display compatibility if needed
                createdAt: d.created_at,
                // Related lesson for Instagram-style thumbnail
                relatedLessonId: relatedLessonsMap[d.id]?.id,
                relatedLesson: relatedLessonsMap[d.id] ? {
                    id: relatedLessonsMap[d.id].id,
                    title: relatedLessonsMap[d.id].title,
                    thumbnailUrl: relatedLessonsMap[d.id].thumbnail_url,
                    courseId: relatedLessonsMap[d.id].course_id,
                } : undefined,
            }));

            console.log('[useDrillsFeed] Final mapped drills count:', mappedDrills.length);

            // Shuffle
            for (let i = mappedDrills.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [mappedDrills[i], mappedDrills[j]] = [mappedDrills[j], mappedDrills[i]];
            }

            return mappedDrills;
        },
        staleTime: 1000 * 60 * 10, // 10분
        enabled: !!permissions,
        // refetchInterval: 1000 * 60 // REMOVED: 1분마다 자동 새로고침은 불필요한 부하를 발생시킴
    });
}

/**
 * 레슨 피드 데이터를 가져오는 훅
 * - 발행된 코스의 레슨만 가져옴
 * - 권한에 따라 필터링
 * - 다양성을 위한 셔플
 */
export function useLessonsFeed() {
    const { user } = useAuth();
    const { data: permissions } = useFeedPermissions();

    return useQuery({
        queryKey: ['lessons-feed', permissions?.isSubscriber, permissions?.purchasedItemIds],
        queryFn: async () => {
            const { transformLesson, getDailyFreeLesson } = await import('../lib/api');
            const { canAccessContentSync } = await import('../lib/api-accessible-content');

            // Get lessons that belong to a published course
            const { data: allLessons, error: lessonError } = await supabase
                .from('lessons')
                .select('*, course:courses!inner(id, title, thumbnail_url, creator_id, price, is_subscription_excluded, published)')
                .eq('course.published', true)
                .order('created_at', { ascending: false })
                .limit(50); // Reduced from 200

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
                    isSubscriber: permissions?.isSubscriber || false,
                    purchasedItemIds: permissions?.purchasedItemIds || [],
                    isLoggedIn: !!user?.id
                });

                return {
                    type: 'lesson' as const,
                    data: {
                        ...transformed,
                        creatorId: creatorId,
                        creatorName: creator?.name || 'Instructor',
                        creatorProfileImage: (creator as any)?.profileImage || (creator as any)?.avatarUrl || undefined,
                    },
                    accessInfo: { canAccess }
                };
            });

            // Improved Shuffle to ensure diversity
            const diversifyContent = (array: any[]) => {
                const grouped: Record<string, any[]> = {};
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

                const result: any[] = [];
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

            return {
                lessons: finalizedLessons,
                dailyFreeLessonId
            };
        },
        staleTime: 1000 * 60 * 10, // 10분
        enabled: !!permissions
    });
}

/**
 * 스파링 피드 데이터를 가져오는 훅
 * - Daily Free 스파링 포함
 * - Hot 랭킹 계산
 * - 자동 셔플
 */
export function useSparringFeed() {
    return useQuery({
        queryKey: ['sparring-feed'],
        queryFn: async () => {
            // Fetch daily free and videos in parallel
            const [dailyRes, videosRes] = await Promise.all([
                getDailyFreeSparring(),
                getSparringVideos(100, undefined, true)
            ]);

            let loadedVideos = videosRes.data || [];

            if (dailyRes.data) {
                // Ensure daily free video is in the list
                const exists = loadedVideos.some((v: any) => v.id === dailyRes.data!.id);
                if (!exists) {
                    loadedVideos = [dailyRes.data as any, ...loadedVideos];
                }
            }

            if (loadedVideos.length > 0) {
                // Calculate hot rankings
                const hotVideos = [...loadedVideos]
                    .filter((v: any) => (v.views || 0) >= 5)
                    .sort((a, b) => calculateHotScore(b.views, b.createdAt) - calculateHotScore(a.views, a.createdAt));

                const processed = loadedVideos.map((v: any) => {
                    const hotIndex = hotVideos.findIndex(s => s.id === v.id);
                    return {
                        ...v,
                        rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                        isDailyFree: v.id === dailyRes.data?.id
                    };
                });

                // Shuffle the array using Fisher-Yates algorithm
                const shuffled = [...processed];
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                }

                return {
                    videos: shuffled,
                    dailyFreeId: dailyRes.data?.id || null
                };
            }

            return {
                videos: [],
                dailyFreeId: null
            };
        },
        staleTime: 1000 * 60 * 10 // 10분
    });
}
