/**
 * Optimized Home Page API
 * Combines multiple queries into efficient batches to reduce network overhead
 * Includes retry logic for cold start scenarios (returning to app after being away)
 */

import { supabase } from './supabase';
import { withTimeout } from './api';
import { warmupConnection } from './connection-manager';
import { Course, DrillRoutine, SparringVideo, Drill } from '../types';

// Longer timeout for cold start scenarios
const API_TIMEOUT = 15000; // 15 seconds (was 3-5 seconds)

// Helper to get KST date string
function getKSTDateString() {
    return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

// Helper for deterministic random selection based on date
function getDailyIndex(arrayLength: number, offset: number = 0): number {
    const today = new Date();
    const kstParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(today);
    const year = parseInt(kstParts.find(p => p.type === 'year')!.value);
    const month = parseInt(kstParts.find(p => p.type === 'month')!.value);
    const day = parseInt(kstParts.find(p => p.type === 'day')!.value);
    const seed = year * 10000 + month * 100 + day + offset;
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * arrayLength);
}

// Batch fetch creators by IDs (single query)
async function batchFetchCreators(creatorIds: string[]): Promise<Map<string, { name: string; profileImage?: string }>> {
    if (creatorIds.length === 0) return new Map();

    const { data } = await supabase
        .from('creators')
        .select('id, name, profile_image')
        .in('id', creatorIds);

    const map = new Map();
    (data || []).forEach((c: any) => {
        map.set(c.id, { name: c.name || '알 수 없음', profileImage: c.profile_image });
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
 * Reduces 10+ sequential API calls to 2-3 parallel batches
 */
export async function getHomePageData(): Promise<HomePageData> {
    const kstDate = getKSTDateString();

    // Warm up connection before making requests (handles cold start)
    await warmupConnection();

    // ===== BATCH 1: All featured content + raw data in parallel =====
    const [
        featuredResult,
        coursesResult,
        routinesResult,
        sparringResult,
        drillsResult,
        lessonsResult
    ] = await Promise.all([
        // Featured content for today
        withTimeout(
            supabase
                .from('daily_featured_content')
                .select('featured_type, featured_id')
                .eq('date', kstDate),
            API_TIMEOUT
        ),
        // Courses (both trending and new can share this)
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
        // Sparring videos
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
        // Drills for daily selection
        withTimeout(
            supabase
                .from('routine_drills')
                .select('drill_id, drills!inner(*)')
                .neq('drills.vimeo_url', '')
                .not('drills.vimeo_url', 'like', 'ERROR%')
                .limit(100),
            API_TIMEOUT
        ),
        // Lessons for daily selection
        withTimeout(
            supabase
                .from('lessons')
                .select('*, courses!inner(id, title, thumbnail_url, creator_id)')
                .not('vimeo_url', 'is', null)
                .neq('vimeo_url', '')
                .limit(100),
            API_TIMEOUT
        )
    ]);

    // Parse featured content
    const featuredMap = new Map<string, string>();
    ((featuredResult as any)?.data || []).forEach((f: any) => {
        featuredMap.set(f.featured_type, f.featured_id);
    });

    // Extract raw data
    const courses = (coursesResult as any)?.data || [];
    const routines = (routinesResult as any)?.data || [];
    const sparringVideos = (sparringResult as any)?.data || [];
    const drillsData = (drillsResult as any)?.data || [];
    const lessonsData = (lessonsResult as any)?.data || [];

    // ===== PROCESS: Select daily content =====

    // Daily Drill
    let dailyDrill = null;
    const featuredDrillId = featuredMap.get('drill');
    if (featuredDrillId) {
        const found = drillsData.find((rd: any) => rd.drills?.id === featuredDrillId);
        if (found) dailyDrill = found.drills;
    }
    if (!dailyDrill && drillsData.length > 0) {
        const uniqueDrills = Array.from(
            new Map(drillsData.map((rd: any) => [rd.drills?.id, rd.drills])).values()
        ).filter(Boolean);
        if (uniqueDrills.length > 0) {
            dailyDrill = uniqueDrills[getDailyIndex(uniqueDrills.length, 456)];
        }
    }

    // Daily Lesson
    let dailyLesson = null;
    const featuredLessonId = featuredMap.get('lesson');
    if (featuredLessonId) {
        dailyLesson = lessonsData.find((l: any) => l.id === featuredLessonId);
    }
    if (!dailyLesson && lessonsData.length > 0) {
        dailyLesson = lessonsData[getDailyIndex(lessonsData.length, 123)];
    }

    // Daily Sparring
    let dailySparring = null;
    const featuredSparringId = featuredMap.get('sparring');
    if (featuredSparringId) {
        dailySparring = sparringVideos.find((s: any) => s.id === featuredSparringId);
    }
    if (!dailySparring && sparringVideos.length > 0) {
        dailySparring = sparringVideos[getDailyIndex(sparringVideos.length, 789)];
    }

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

    // Transform daily drill
    const transformedDailyDrill = dailyDrill ? {
        id: dailyDrill.id,
        title: dailyDrill.title,
        description: dailyDrill.description,
        vimeoUrl: dailyDrill.vimeo_url,
        thumbnailUrl: dailyDrill.thumbnail_url,
        duration: dailyDrill.duration_seconds,
        difficulty: dailyDrill.difficulty,
        creatorName: creatorMap.get(dailyDrill.creator_id)?.name || 'Grapplay Team',
        creatorProfileImage: creatorMap.get(dailyDrill.creator_id)?.profileImage
    } : null;

    // Transform daily lesson
    const transformedDailyLesson = dailyLesson ? {
        id: dailyLesson.id,
        title: dailyLesson.title,
        description: dailyLesson.description,
        vimeoUrl: dailyLesson.vimeo_url,
        thumbnailUrl: dailyLesson.thumbnail_url || dailyLesson.courses?.thumbnail_url,
        duration: dailyLesson.duration,
        courseId: dailyLesson.course_id,
        courseTitle: dailyLesson.courses?.title,
        creatorName: creatorMap.get(dailyLesson.courses?.creator_id)?.name || 'Grapplay Team',
        creatorProfileImage: creatorMap.get(dailyLesson.courses?.creator_id)?.profileImage
    } : null;

    // Transform daily sparring
    const transformedDailySparring = dailySparring ? {
        id: dailySparring.id,
        title: dailySparring.title,
        description: dailySparring.description,
        videoUrl: dailySparring.video_url,
        thumbnailUrl: dailySparring.thumbnail_url,
        views: dailySparring.views || 0,
        likes: dailySparring.likes || 0,
        category: dailySparring.category,
        difficulty: dailySparring.difficulty,
        creator: creatorMap.get(dailySparring.creator_id) ? {
            id: dailySparring.creator_id,
            name: creatorMap.get(dailySparring.creator_id)?.name || '알 수 없음',
            profileImage: creatorMap.get(dailySparring.creator_id)?.profileImage
        } : undefined
    } : null;

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
        totalDuration: c.total_duration || 0,
        views: c.views || 0,
        likes: c.likes || 0,
        rating: c.rating || 0,
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
        durationMinutes: r.total_duration_minutes || r.duration_minutes || 10,
        category: r.category || 'General',
        views: r.views || 0,
        likes: r.likes || 0,
        createdAt: r.created_at,
        drills: []
    });

    const featuredRoutines = scoredRoutines.slice(0, 20).map(transformRoutine);
    const newRoutines = routines.slice(0, 20).map(transformRoutine);

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
        creator: creatorMap.get(s.creator_id) ? {
            id: s.creator_id,
            name: creatorMap.get(s.creator_id)?.name || '알 수 없음',
            profileImage: creatorMap.get(s.creator_id)?.profileImage
        } : undefined,
        createdAt: s.created_at
    });

    const trendingSparring = scoredSparring.slice(0, 10).map(transformSparring);
    const newSparring = sparringVideos.slice(0, 20).map(transformSparring);

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
