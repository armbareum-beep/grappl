import { supabase } from './supabase';

/**
 * 사용자가 접근 가능한 콘텐츠를 필터링하여 가져오는 함수들
 */

/**
 * 콘텐츠 접근 권한 확인
 * - 오늘의 무료 영상: 모두 접근 가능
 * - 구독자: 구독자용 콘텐츠 접근 가능
 * - 구매자: 개별 구매한 콘텐츠 접근 가능
 */
interface AccessCheckParams {
  userId: string | null;
  isSubscriber: boolean;
  contentId: string;
  isDailyFreeContent: boolean;
  purchasedItemIds?: string[];
}

export async function canAccessContent({
  userId,
  isSubscriber,
  contentId,
  isDailyFreeContent,
  purchasedItemIds = []
}: AccessCheckParams): Promise<boolean> {
  // 1. 오늘의 무료 영상: 모두 접근 가능
  if (isDailyFreeContent) {
    return true;
  }

  // 2. 비로그인 사용자: 오늘의 무료 영상만 가능
  if (!userId) {
    return false;
  }

  // 3. 구독자 전용 콘텐츠: 구독자만 접근 가능 (오늘의 무료 영상보다 우선순위 낮음)
  if (isSubscriber) {
    return true;
  }

  // 5. 구매한 콘텐츠: 구매자만 접근 가능
  if (purchasedItemIds.includes(contentId)) {
    return true;
  }

  return false;
}

/**
 * 콘텐츠 접근 권한 동기 확인 (필터링용)
 */
export function canAccessContentSync({
  contentId,
  isDailyFreeContent,
  isSubscriber,
  purchasedItemIds,
  isLoggedIn
}: {
  contentId: string;
  isDailyFreeContent: boolean;
  isSubscriber: boolean;
  purchasedItemIds: string[];
  isLoggedIn: boolean;
}): boolean {
  // 1. 오늘의 무료 영상: 모두 접근 가능
  if (isDailyFreeContent) {
    return true;
  }

  // 2. 비로그인 사용자: 오늘의 무료 영상만 가능
  if (!isLoggedIn) {
    return false;
  }

  // 3. 구독자 전용 콘텐츠: 구독자만 접근 가능
  if (isSubscriber) {
    return true;
  }

  // 5. 구매한 콘텐츠: 구매자만 접근 가능
  if (purchasedItemIds.includes(contentId)) {
    return true;
  }

  return false;
}

/**
 * 사용자 정보 가져오기
 */
async function getUserInfo(userId: string | null) {
  if (!userId) {
    return {
      isSubscriber: false,
      subscriptionTier: null,
      purchasedItemIds: []
    };
  }

  try {
    const [userRes, purchasesRes] = await Promise.all([
      supabase
        .from('users')
        .select('is_subscriber, subscription_tier')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('purchases')
        .select('item_id')
        .eq('user_id', userId)
    ]);

    const isSubscriber = userRes.data?.is_subscriber === true;
    const subscriptionTier = userRes.data?.subscription_tier;
    const purchasedItemIds = purchasesRes.data?.map(p => p.item_id) || [];

    return {
      isSubscriber,
      subscriptionTier,
      purchasedItemIds
    };
  } catch (error) {
    console.error('[getUserInfo] Error:', error);
    return {
      isSubscriber: false,
      subscriptionTier: null,
      purchasedItemIds: []
    };
  }
}

/**
 * 사용자가 접근 가능한 드릴 가져오기
 * - 모든 드릴 표시 (동작 영상은 무료, 설명 영상만 유료)
 * - 드릴 상세 페이지에서 설명 영상 접근 제어
 */
export async function getAccessibleDrills(userId: string | null, limit: number = 50) {
  try {
    console.log('[getAccessibleDrills] Starting fetch, userId:', userId);

    // 모든 드릴 가져오기 (필터링 없음)
    const { data: allDrills, error } = await supabase
      .from('drills')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getAccessibleDrills] Query error:', error);
      throw error;
    }

    if (!allDrills || allDrills.length === 0) {
      return { data: [], error: null };
    }

    // 모든 드릴 반환 (동작 영상은 누구나 볼 수 있음)
    console.log('[getAccessibleDrills] Total drills:', allDrills.length, 'All accessible (action videos free)');
    return { data: allDrills, error: null };
  } catch (error) {
    console.error('Error fetching accessible drills:', error);
    return { data: [], error };
  }
}

/**
 * 사용자가 접근 가능한 레슨 가져오기
 * - 무료 레슨 (price = 0)
 * - 구독자: 모든 레슨 접근 가능 (subscription_excluded 아닌 경우)
 * - 구매자: 구매한 강좌의 레슨만 접근 가능
 */
export async function getAccessibleLessons(userId: string | null, limit: number = 50) {
  try {
    console.log('[getAccessibleLessons] Fetching accessible lessons, userId:', userId);

    // 모든 레슨 가져오기
    const { data: allLessons, error } = await supabase
      .from('lessons')
      .select(`
                *,
                course:courses (
                    id,
                    title,
                    thumbnail_url,
                    creator_id,
                    price,
                    is_subscription_excluded
                )
            `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getAccessibleLessons] Query error:', error);
      throw error;
    }

    if (!allLessons || allLessons.length === 0) {
      return { data: [], error: null };
    }

    // 사용자 정보 가져오기
    const userInfo = await getUserInfo(userId);

    // 권한에 따라 레슨 필터링
    const accessibleLessons = allLessons.filter(lesson => {
      const courseId = lesson.course?.id || lesson.course_id;
      const isSubscriptionExcluded = lesson.course?.is_subscription_excluded ||
        lesson.is_subscription_excluded;

      // 1. 비로그인 사용자: 접근 불가
      if (!userId) {
        return false;
      }

      // 2. 구독자 전용 강좌(구독 제외 아님): 구독자 접근 가능
      if (!isSubscriptionExcluded && userInfo.isSubscriber) {
        return true;
      }

      // 4. 구매한 강좌: 구매자만 접근 가능
      if (courseId && userInfo.purchasedItemIds.includes(courseId)) {
        return true;
      }

      return false;
    });

    console.log('[getAccessibleLessons] Total lessons:', allLessons.length, 'Accessible:', accessibleLessons.length);
    return { data: accessibleLessons, error: null };
  } catch (error) {
    console.error('Error fetching accessible lessons:', error);
    return { data: [], error };
  }
}

/**
 * 사용자가 접근 가능한 스파링 영상 가져오기
 * - 무료 스파링 (price = 0 또는 NULL): 모든 로그인 사용자 접근 가능
 * - 구독자: 모든 스파링 영상 접근 가능
 * - 구매자: 구매한 스파링만 접근 가능
 */
export async function getAccessibleSparring(userId: string | null, limit: number = 20) {
  try {
    console.log('[getAccessibleSparring] Fetching accessible sparring, userId:', userId);

    const { data: videos, error } = await supabase
      .from('sparring_videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    if (!videos || videos.length === 0) return { data: [], error: null };

    // 사용자 정보 가져오기
    const userInfo = await getUserInfo(userId);

    // Extract creator IDs
    const creatorIds = Array.from(new Set(videos.map(v => v.creator_id).filter(Boolean)));

    // Fetch creators
    let userMap: Record<string, any> = {};
    if (creatorIds.length > 0) {
      const { data: users } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', creatorIds);

      if (users) {
        users.forEach(u => {
          userMap[u.id] = u;
        });
      }
    }

    // 권한에 따라 스파링 필터링
    const accessibleVideos = videos.filter(v => {
      return canAccessContentSync({
        contentId: v.id,
        isDailyFreeContent: false,
        isSubscriber: userInfo.isSubscriber,
        purchasedItemIds: userInfo.purchasedItemIds,
        isLoggedIn: !!userId
      });
    });

    // Map data
    const mappedVideos = accessibleVideos.map(v => {
      const creator = userMap[v.creator_id];
      return {
        id: v.id,
        creatorId: v.creator_id,
        title: v.title || 'Sparring Video',
        description: v.description || '',
        videoUrl: v.video_url,
        thumbnailUrl: v.thumbnail_url,
        relatedItems: v.related_items || [],
        views: v.views || 0,
        likes: v.likes || 0,
        price: v.price || 0,
        creator: creator ? {
          id: creator.id,
          name: creator.name || 'Unknown',
          profileImage: creator.avatar_url,
          bio: '',
          subscriberCount: 0
        } : undefined,
        createdAt: v.created_at,
        category: v.category,
        uniformType: v.uniform_type
      };
    });

    console.log('[getAccessibleSparring] Total videos:', videos.length, 'Accessible:', mappedVideos.length);
    return { data: mappedVideos, error: null };
  } catch (error) {
    console.error('Error fetching accessible sparring:', error);
    return { data: [], error };
  }
}
