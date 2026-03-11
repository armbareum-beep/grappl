/**
 * Optimized Home Page API
 * Combines multiple queries into efficient batches to reduce network overhead
 * Includes retry logic for cold start scenarios (returning to app after being away)
 */

import { supabase } from './supabase';
import { withTimeout } from './api';
import { warmupConnection } from './connection-manager';
import { Course, DrillRoutine, SparringVideo } from '../types';
import { 
    fetchDailyDrill, 
    fetchDailyLesson, 
    fetchDailySparring,
    transformToDailyDrill,
    transformToDailyLesson,
    transformToDailySparring
} from './api-daily';

// Longer timeout for cold start scenarios
const API_TIMEOUT = 15000; // 15 seconds (was 3-5 seconds)

// Batch fetch creators by IDs from users table (matching api.ts logic)
async function batchFetchCreators(creatorIds: string[]): Promise<Map<string, { name: string; profileImage?: string }>> {
    if (creatorIds.length === 0) return new Map();

    const { data } = await supabase
        .from('users')
        .select('id, name, avatar_url, profile_image_url')
        .in('id', creatorIds);

    const map = new Map();
    (data || []).forEach((c: any) => {
        map.set(c.id, { 
            name: c.name || '알 수 없음', 
            profileImage: c.profile_image_url || c.avatar_url 
        });
    });
    return map;
}

export interface HomePageData {
    dailyDrill: any | null;
    dailyLesson: any | null;
    dailySparring: any | null;
    trendingCourses: Course[];
    newCourses: Course[];
    featuredRoutines: DrillRoutine[];
    trendingSparring: SparringVideo[];
    newRoutines: any[];
    newSparring: SparringVideo[];
}

/**
 * Fetch all home page data in optimized batches
 */
export async function getHomePageData(): Promise<HomePageData> {
    // Warm up connection before making requests (handles cold start)
    await warmupConnection();

    // ===== BATCH 1: Raw data pools + Daily selection in parallel =====
    const [
        coursesResult,
        routinesResult,
        sparringResult,
        dailyDrill,
        dailyLesson,
        dailySparring
    ] = await Promise.all([
        // Courses
        withTimeout(
            supabase
                .from('courses')
                .select('*, lessons(count)')
                .eq('published', true)
                .order('created_at', { ascending: false })
                .limit(30),
            API_TIMEOUT
        ),
        // Routines
        withTimeout(
            supabase
                .from('routines')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(30),
            API_TIMEOUT
        ),
        // Sparring videos (for trending/new carousels)
        withTimeout(
            supabase
                .from('sparring_videos')
                .select('*')
                .eq('is_published', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(30),
            API_TIMEOUT
        ),
        // Daily Selection (Centralized to ensure 100% consistency with LandingPage)
        fetchDailyDrill(),
        fetchDailyLesson(),
        fetchDailySparring()
    ]);

    // Extract raw data
    const courses = (coursesResult as any)?.data || [];
    const routines = (routinesResult as any)?.data || [];
    const sparringVideos = (sparringResult as any)?.data || [];

    // ===== BATCH 2: Fetch all creators at once =====
    const allCreatorIds = new Set<string>();

    // Collect all creator IDs
    if (dailyDrill?.creator_id) allCreatorIds.add(dailyDrill.creator_id);
    if (dailyLesson?.courses?.creator_id) allCreatorIds.add(dailyLesson.courses.creator_id);
    if (dailySparring?.creator_id) allCreatorIds.add(dailySparring.creator_id);
    courses.forEach((c: any) => c.creator_id && allCreatorIds.add(c.creator_id));
    routines.forEach((r: any) => r.creator_id && allCreatorIds.add(r.creator_id));
    sparringVideos.forEach((s: any) => s.creator_id && allCreatorIds.add(s.creator_id));

    const creatorMap = await batchFetchCreators(Array.from(allCreatorIds));

    // ===== TRANSFORM: Build final data =====

    // Transform daily content using unified logic
    const transformedDailyDrill = dailyDrill ? transformToDailyDrill(dailyDrill, creatorMap.get(dailyDrill.creator_id)) : null;

    const transformedDailyLesson = dailyLesson ? transformToDailyLesson(dailyLesson, creatorMap.get(dailyLesson.courses?.creator_id)) : null;

    const transformedDailySparring = dailySparring ? transformToDailySparring(dailySparring, creatorMap.get(dailySparring.creator_id)) : null;

    // Score and rank courses
    const scoredCourses = courses.map((c: any) => ({
        ...c,
        _score: (c.views || 0) * 0.3 + (c.likes || 0) * 0.5 + (c.rating || 0) * 20
    })).sort((a: any, b: any) => b._score - a._score);

    // Transform courses
    const transformCourseWithCreator = (c: any): Course => ({
        id: c.id,
        title: c.title,
        description: c.description || '',
        creatorId: c.creator_id,
        creatorName: creatorMap.get(c.creator_id)?.name || '알 수 없음',
        creatorProfileImage: creatorMap.get(c.creator_id)?.profileImage,
        thumbnailUrl: c.thumbnail_url || '',
        price: c.price || 0,
        difficulty: c.difficulty || 'Beginner',
        category: c.category || 'General',
        lessonCount: c.lessons?.[0]?.count || 0,
        views: c.views || 0,
        createdAt: c.created_at
    });

    const trendingCourses = scoredCourses.slice(0, 10).map(transformCourseWithCreator);
    const newCourses = courses.slice(0, 10).map(transformCourseWithCreator);

    // Score and transform routines
    const scoredRoutines = routines.map((r: any) => ({
        ...r,
        _score: (r.views || 0) * 0.3 + (r.likes || 0) * 0.5
    })).sort((a: any, b: any) => b._score - a._score);

    const transformRoutine = (r: any): DrillRoutine => ({
        id: r.id,
        title: r.title,
        description: r.description,
        creatorId: r.creator_id,
        creatorName: creatorMap.get(r.creator_id)?.name || '알 수 없음',
        creatorProfileImage: creatorMap.get(r.creator_id)?.profileImage,
        difficulty: r.difficulty || 'Beginner',
        thumbnailUrl: r.thumbnail_url,
        price: r.price || 0,
        totalDurationMinutes: r.total_duration_minutes || r.duration_minutes || 10,
        category: r.category || 'General',
        views: r.views || 0,
        likes: r.likes || 0,
        createdAt: r.created_at,
        drills: []
    });

    const featuredRoutines = scoredRoutines.slice(0, 12).map(transformRoutine);
    const newRoutines = routines.slice(0, 12).map(transformRoutine);

    // Score and transform sparring
    const scoredSparring = sparringVideos.map((s: any) => ({
        ...s,
        _score: (s.views || 0) * 0.3 + (s.likes || 0) * 0.5
    })).sort((a: any, b: any) => b._score - a._score);

    const transformSparring = (s: any): SparringVideo => ({
        id: s.id,
        creatorId: s.creator_id,
        title: s.title || 'Sparring Video',
        description: s.description || '',
        videoUrl: s.video_url,
        thumbnailUrl: s.thumbnail_url,
        views: s.views || 0,
        likes: s.likes || 0,
        price: s.price || 0,
        category: s.category,
        uniformType: s.uniform_type,
        difficulty: s.difficulty,
        isPublished: s.is_published ?? true,
        relatedItems: s.related_items || [],
        creator: creatorMap.get(s.creator_id) ? {
            id: s.creator_id,
            name: creatorMap.get(s.creator_id)?.name || '알 수 없음',
            profileImage: creatorMap.get(s.creator_id)?.profileImage || '',
            bio: '',
            subscriberCount: 0
        } : undefined,
        createdAt: s.created_at
    });

    const trendingSparring = scoredSparring.slice(0, 10).map(transformSparring);
    const newSparring = sparringVideos.slice(0, 12).map(transformSparring);

    return {
        dailyDrill: transformedDailyDrill,
        dailyLesson: transformedDailyLesson,
        dailySparring: transformedDailySparring,
        trendingCourses,
        newCourses,
        featuredRoutines,
        trendingSparring,
        newRoutines,
        newSparring
    };
}
