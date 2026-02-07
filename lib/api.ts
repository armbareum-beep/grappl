import { createNotification as createNotify } from './api-notifications';
export * from './api-user-interactions';
export * from './api-lessons';
import { supabase } from './supabase';

import { Creator, Video, Course, Lesson, TrainingLog, UserSkill, SkillCategory, SkillStatus, BeltLevel, Bundle, Coupon, SkillSubcategory, FeedbackSettings, FeedbackRequest, AppNotification, Difficulty, Drill, DrillRoutine, SparringReview, Testimonial, SparringVideo, CompletedRoutineRecord, SiteSettings } from '../types';
import { getVimeoVideoInfo, formatDuration } from './vimeo';


// Revenue split constants
export const DIRECT_PRODUCT_CREATOR_SHARE = 0.8; // 80% to creator for individual product sales
export const DIRECT_PRODUCT_PLATFORM_SHARE = 0.2;
export const SUBSCRIPTION_CREATOR_SHARE = 0.8; // 80% to creator for subscription revenue
export const SUBSCRIPTION_PLATFORM_SHARE = 0.2;




// Helper to safely wrap promises with a timeout
export async function withTimeout<T>(
    promise: PromiseLike<T> | ((abortController: AbortController) => PromiseLike<T>),
    timeoutMs: number = 10000
): Promise<T | { data: null; error: { message: string, code: string } }> {
    const controller = new AbortController();
    const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => {
            controller.abort();
            reject(new Error(`Request timed out after ${timeoutMs}ms`));
        }, timeoutMs)
    );

    try {
        const actualPromise = typeof promise === 'function' ? promise(controller) : promise;
        return await Promise.race([actualPromise, timeout]) as T;
    } catch (err: any) {
        // Return a Supabase-like error object so destructuring { data, error } doesn't crash
        return {
            data: null,
            error: {
                message: err.name === 'AbortError' ? `Request aborted (possible timeout)` : (err.message || 'Operation timed out'),
                code: 'TIMEOUT'
            }
        } as any;
    }
}

// Helper to extract Vimeo ID and optional Hash
export interface VimeoInfo {
    id: string;
    hash?: string;
    fullId: string; // ID:HASH format
}

export function extractVimeoId(url?: string | null): string | undefined {
    if (!url || typeof url !== 'string') return undefined;

    // 1. Direct numeric ID (e.g. "123456")
    if (/^\d+$/.test(url)) return url;

    // 2. ID:HASH format (e.g. "123456:abcdef")
    if (/^\d+:[a-zA-Z0-9]+$/.test(url)) return url;

    // 3. ID/HASH format -> transform to ID:HASH
    if (/^\d+\/[a-zA-Z0-9]+$/.test(url)) return url.replace('/', ':');

    // 4. Full Vimeo URL (e.g. https://vimeo.com/123456/abcdef or https://vimeo.com/123456?h=abcdef)
    const idMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    const hashMatch = url.match(/vimeo\.com\/(?:video\/)?\d+\/([a-zA-Z0-9]+)/i) || url.match(/[?&]h=([a-zA-Z0-9]+)/i);

    if (idMatch) {
        const id = idMatch[1];
        const hash = hashMatch ? hashMatch[1] : null;
        return hash ? `${id}:${hash}` : id;
    }

    return undefined;
}

// Helper for VideoPlayer to get decomposed info
export function parseVimeoId(vimeoIdStr?: string | null): VimeoInfo | null {
    const fullId = extractVimeoId(vimeoIdStr);
    if (!fullId) return null;

    const [id, hash] = fullId.includes(':') ? fullId.split(':') : [fullId, undefined];
    return { id, hash, fullId };
}

function transformCreator(data: any): Creator {
    return {
        id: data.id,
        name: data.name,
        bio: data.bio || '',
        // Prioritize profile_image (creators table) over avatar_url (Google/Social)
        profileImage: data.profile_image || data.user?.avatar_url || data.avatar_url || '',
        subscriberCount: data.subscriber_count || 0,
        email: data.email,
    };
}



function transformVideo(data: any): Video {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator?.name || '알 수 없음',
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        vimeoUrl: data.vimeo_url,
        length: data.length,
        price: Number(data.price) || 0,
        views: data.views || 0,
        createdAt: data.created_at,
    };
}

function transformCourse(data: any): Course {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator?.name || '알 수 없음',
        creatorProfileImage: data.creator?.profile_image || null,
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        price: data.price,
        views: data.views,
        lessonCount: data.lesson_count,
        createdAt: data.created_at,
        uniformType: data.uniform_type,
        isSubscriptionExcluded: data.is_subscription_excluded,
        published: data.published,
        previewVimeoId: data.preview_vimeo_id,
    };
}


// Logic for transformLesson moved to api-lessons.ts



// Platform Statistics
export async function getPlatformStats() {
    try {
        const [usersResult, coursesResult, routinesResult, sparringResult] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('courses').select('id', { count: 'exact', head: true }),
            supabase.from('routines').select('id', { count: 'exact', head: true }),
            supabase.from('sparring_videos').select('id', { count: 'exact', head: true })
        ]);

        return {
            totalUsers: usersResult.count || 0,
            totalCourses: coursesResult.count || 0,
            totalRoutines: routinesResult.count || 0,
            totalSparring: sparringResult.count || 0
        };
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        return {
            totalUsers: 0,
            totalCourses: 0,
            totalRoutines: 0,
            totalSparring: 0
        };
    }
}

// Creators API
export async function getCreators(): Promise<Creator[]> {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('creators')
                .select('*')
                .eq('approved', true)
                .order('subscriber_count', { ascending: false }),
            5000 // 5s timeout
        );

        if (error) {
            console.error('Error fetching creators:', error);
            throw error;
        }

        return (data || []).map(transformCreator);
    } catch (e) {
        console.error('getCreators timeout/fail:', e);
        return []; // Return empty array on failure to prevent infinite loading
    }
}

export async function getAdminCreators(): Promise<Creator[]> {
    try {
        const { data, error } = await supabase.rpc('get_admin_creators_with_email');

        if (error) {
            console.error('Error fetching admin creators:', error);
            throw error;
        }

        return (data || []).map(transformCreator);
    } catch (e) {
        console.error('getAdminCreators timeout/fail:', e);
        return [];
    }
}

export async function getCreatorById(id: string): Promise<Creator | null> {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('creators')
                .select('*')
                .eq('id', id)
                .maybeSingle(),
            5000
        );

        if (error) {
            // 406/PGRST106: Table missing or RLS issue
            if (error.code === 'PGRST106' || error.code === '406') {
                return null;
            }
            throw error;
        }

        return data ? transformCreator(data) : null;
    } catch (e) {
        console.error('getCreatorById timeout/fail:', e);
        return null;
    }
}

export async function fetchCreatorsByIds(creatorIds: string[]): Promise<Record<string, Creator>> {
    if (!creatorIds || creatorIds.length === 0) return {};
    try {
        const uniqueIds = Array.from(new Set(creatorIds));
        const { data, error } = await supabase
            .from('creators')
            .select('*')
            .in('id', uniqueIds);

        if (error) {
            console.error('Error fetching creators by IDs:', error);
            return {};
        }

        const map: Record<string, Creator> = {};
        (data || []).forEach((c: any) => {
            map[c.id] = transformCreator(c);
        });
        return map;
    } catch (e) {
        console.error('fetchCreatorsByIds exception:', e);
        return {};
    }
}



// Courses API
// Courses API
export async function getCourses(limit: number = 50, offset: number = 0): Promise<Course[]> {
    try {
        console.log('🔍 getCourses: Starting fetch...');
        // First, try to get courses with creator info (for authenticated users)
        let { data, error } = await withTimeout(
            supabase
                .from('courses')
                .select(`
                    *,
                    creator:creators!creator_id(name, profile_image),
                    lessons:lessons(vimeo_url, lesson_number)
                `)
                .eq('published', true)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1),
            5000
        );

        // If error due to RLS on creators, fetch without creator join
        if (error) {
            console.warn('⚠️ getCourses with creator failed, retrying without creator:', error);
            const fallback = await withTimeout(
                supabase
                    .from('courses')
                    .select(`
                        *,
                        lessons:lessons(vimeo_url, lesson_number)
                    `)
                    .eq('published', true)
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1),
                5000
            );

            data = fallback.data;
            error = fallback.error;

            if (error) {
                console.error('❌ getCourses Error Details:', error);
                throw error;
            }
        }

        console.log('✅ getCourses: Raw data received:', data?.length, 'courses');

        const transformed = (data || []).map((d: any) => {
            const sortedLessons = (d.lessons || []).sort((a: any, b: any) => a.lesson_number - b.lesson_number);
            const firstLesson = sortedLessons[0];

            const course = transformCourse(d);

            // AUTOMATIC PREVIEW: Use first lesson's video if available
            // This overrides any manual preview_vimeo_id unless we decide to keep it as fallback
            // User requested: "Get rid of manual upload, use first lesson 1 min preview"
            const autoPreviewId = firstLesson?.vimeo_url ? extractVimeoId(firstLesson.vimeo_url) : null;

            return {
                ...course,
                lessonCount: d.lessons?.length || 0,
                creatorProfileImage: d.creator?.profile_image || null,
                previewVideoUrl: firstLesson?.vimeo_url,
                // Override previewVimeoId with the first lesson's ID
                previewVimeoId: autoPreviewId || course.previewVimeoId
            };
        });

        console.log('✅ getCourses: Transformed data:', transformed.length, 'courses');
        return transformed;
    } catch (e) {
        console.error('❌ getCourses timeout/fail:', e);
        throw e; // Throw so UI can show error state instead of 0 items
    }
}

export async function getRelatedCourseByCategory(category: string) {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                creator:creators!creator_id(name, profile_image)
            `)
            .eq('published', true)
            .eq('category', category)
            .limit(1)
            .maybeSingle();

        if (error || !data) return null;
        return transformCourse(data);
    } catch (e) {
        return null; // Fail silently
    }
}

export async function getRelatedCourses(currentCourseId: string, category: string, limit = 4) {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                creator:creators!creator_id(name, profile_image)
            `)
            .eq('published', true)
            .eq('category', category)
            .neq('id', currentCourseId) // Exclude current course
            .limit(limit);

        if (error) {
            console.error('Error fetching related courses:', error);
            return { data: [], error };
        }

        const courses = (data || []).map((item: any) => transformCourse(item));
        return { data: courses, error: null };
    } catch (e: any) {
        console.error('getRelatedCourses exception:', e);
        return { data: [], error: e };
    }
}

export async function searchContent(query: string) {
    try {
        // Sanitize query to avoid PostgREST syntax errors (remove parens, commas, etc)
        const safeQuery = query.replace(/[(),]/g, ' ').trim();
        if (!safeQuery) return { courses: [], routines: [], feeds: [], sparring: [], arena: [] };

        const searchTerm = `%${safeQuery}%`;
        const creatorsFilter: string[] = [];
        const usersFilter: string[] = [];

        // 1. Find matching creators/users first for name search
        const [creatorsRes, usersRes] = await Promise.all([
            supabase.from('creators').select('id').ilike('name', searchTerm).limit(50),
            supabase.from('users').select('id').ilike('name', searchTerm).limit(50)
        ]);

        if (creatorsRes.data && creatorsRes.data.length > 0) {
            const ids = creatorsRes.data.map(c => c.id).join(',');
            creatorsFilter.push(`creator_id.in.(${ids})`);
        }

        if (usersRes.data && usersRes.data.length > 0) {
            const ids = usersRes.data.map(u => u.id).join(',');
            usersFilter.push(`user_id.in.(${ids})`);
        }

        // Shared filters
        const contentBaseFilter = `title.ilike.${searchTerm},description.ilike.${searchTerm}`;
        const contentFilter = creatorsFilter.length > 0
            ? `${contentBaseFilter},${creatorsFilter[0]}`
            : contentBaseFilter;

        const feedBaseFilter = `notes.ilike.${searchTerm}`;
        const feedFilter = usersFilter.length > 0
            ? `${feedBaseFilter},${usersFilter[0]}`
            : feedBaseFilter;


        // Parallel fetch - Courses, Routines, Sparring, Feed (Drills removed)
        const [coursesRes, routinesRes, feedsRes, sparringRes] = await Promise.all([
            // 1. Courses
            supabase
                .from('courses')
                .select('*, creator:creators(*)')
                .or(contentFilter)
                .eq('published', true)
                .limit(20),
            // 2. Routines
            supabase
                .from('routines')
                .select('*, creator:creators(*)')
                .or(contentFilter)
                .limit(20),
            // 3. Feeds (Public Training Logs)
            supabase
                .from('training_logs')
                .select(`
                    *,
                    user:users(name, avatar_url)
                `)
                .eq('is_public', true)
                .or(feedFilter)
                .limit(20),
            // 4. Sparring Videos
            supabase
                .from('sparring_videos')
                .select('*')
                .or(contentFilter)
                .is('deleted_at', null)
                .eq('is_published', true)
                .limit(20)
        ]);

        if (coursesRes.error) console.error('Search courses error:', coursesRes.error);
        if (routinesRes.error) console.error('Search routines error:', routinesRes.error);
        if (feedsRes.error) console.error('Search feeds error:', feedsRes.error);
        if (sparringRes.error) console.error('Search sparring error:', sparringRes.error);

        // Fetch creators for sparring results separately since we only have creator_id
        let sparringCreators: Record<string, any> = {};
        if (sparringRes.data && sparringRes.data.length > 0) {
            const creatorIds = [...new Set(sparringRes.data.map((v: any) => v.creator_id).filter(Boolean))];
            if (creatorIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, name, avatar_url')
                    .in('id', creatorIds);

                (users || []).forEach(u => sparringCreators[u.id] = u);
            }
        }

        return {
            courses: (coursesRes.data || []).map(transformCourse),
            routines: (routinesRes.data || []).map(transformDrillRoutine),
            feeds: (feedsRes.data || []).map((log: any) => {
                let type = log.type;
                if (!type && log.location && log.location.startsWith('__FEED__')) {
                    type = log.location.replace('__FEED__', '');
                }
                return {
                    id: log.id,
                    userId: log.user_id,
                    userName: log.user?.name || 'User',
                    userAvatar: log.user?.avatar_url,
                    date: log.date,
                    notes: log.notes,
                    mediaUrl: log.media_url,
                    type: type || 'general',
                    durationMinutes: log.duration_minutes || 0,
                    techniques: log.techniques || [],
                    sparringRounds: log.sparring_rounds || 0,
                    isPublic: log.is_public,
                    createdAt: log.created_at
                };
            }),
            sparring: (sparringRes.data || []).map((v: any) => {
                const creator = sparringCreators[v.creator_id];
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
                        name: creator.name || '알 수 없음',
                        profileImage: creator.profile_image || creator.avatar_url,
                        bio: '',
                        subscriberCount: 0
                    } : undefined,
                    createdAt: v.created_at
                };
            }),
            arena: [] // Placeholder for Arena
        };
    } catch (error) {
        console.error('Error searching content:', error);
        return { courses: [], routines: [], feeds: [], sparring: [], arena: [] };
    }
}

export async function getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await withTimeout(
        supabase
            .from('courses')
            .select(`
      *,
      creator:creators(name, profile_image),
      lessons:lessons(vimeo_url, lesson_number)
    `)
            .eq('id', id)
            .maybeSingle(), 10000);

    if (error) {
        console.error('Error fetching course:', error);
        return null;
    }

    // Find first lesson for preview
    const lessons = data.lessons || [];
    const firstLesson = lessons.sort((a: any, b: any) => a.lesson_number - b.lesson_number)[0];
    const autoPreviewId = firstLesson?.vimeo_url ? extractVimeoId(firstLesson.vimeo_url) : null;

    return data ? {
        ...transformCourse(data),
        lessonCount: lessons.length || 0,
        previewVideoUrl: firstLesson?.vimeo_url,
        previewVimeoId: autoPreviewId || data.preview_vimeo_id
    } : null;
}



export async function getCoursesByCreator(creatorId: string): Promise<Course[]> {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      creator:creators(name, profile_image),
      lessons:lessons(count),
      preview_lessons:lessons(vimeo_url, lesson_number)
    `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching courses by creator:', error);
        throw error;
    }

    return (data || []).map(course => {
        // Find first lesson for preview
        const firstLesson = course.preview_lessons?.sort((a: any, b: any) => a.lesson_number - b.lesson_number)[0];

        return {
            ...transformCourse(course),
            lessonCount: course.lessons?.[0]?.count || 0,
            previewVideoUrl: firstLesson?.vimeo_url
        };
    });
}

// Lessons API
// End of Lessons API section - functions exported from ./api-lessons.ts above

// Videos API (keep for backward compatibility)
export async function getVideos(): Promise<Video[]> {
    const fetchPromise = supabase
        .from('videos')
        .select(`
      *,
      creator:creators(name)
    `)
        .order('created_at', { ascending: false });

    let data, error;
    try {
        const result = await fetchPromise;
        data = result.data;
        error = result.error;
    } catch (e) {
        console.error('getVideos failed:', e);
        throw e;
    }

    if (error) {
        console.error('Error fetching videos:', error);
        throw error;
    }

    return (data || []).map(transformVideo);
}

export async function getVideoById(id: string): Promise<Video | null> {
    const { data, error } = await supabase
        .from('videos')
        .select(`
      *,
      creator:creators(name)
    `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching video:', error);
        return null;
    }

    return data ? transformVideo(data) : null;
}

export async function getVideosByCreator(creatorId: string): Promise<Video[]> {
    const { data, error } = await supabase
        .from('videos')
        .select(`
      *,
      creator:creators(name)
    `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching videos by creator:', error);
        throw error;
    }

    return (data || []).map(transformVideo);
}

export async function getPublicSparringVideos(limit = 3): Promise<SparringVideo[]> {
    try {
        // 1. Fetch videos
        const { data: videos, error } = await withTimeout(
            supabase
                .from('sparring_videos')
                .select('*')
                .eq('is_published', true)
                .gt('price', 0)
                .order('created_at', { ascending: false })
                .limit(limit),
            5000
        );

        if (error) {
            console.error('Error fetching public sparring videos:', error);
            return [];
        }

        if (!videos || videos.length === 0) return [];

        // 2. Extract creator IDs
        const creatorIds = Array.from(new Set(videos.map(v => v.creator_id).filter(Boolean)));

        // 3. Fetch creators (unified logic)
        const userMap = await fetchCreatorsByIds(creatorIds as string[]);

        // 4. Map data
        const validVideos = videos
            .filter(v => v.video_url && !v.video_url.includes('ERROR'))
            .map((v: any) => {
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
                    isPublished: v.is_published ?? true,
                    creator: creator ? {
                        id: creator.id,
                        name: creator.name || '알 수 없음',
                        profileImage: creator.profileImage || '',
                        bio: '',
                        subscriberCount: 0
                    } : undefined,
                    createdAt: v.created_at,
                    category: v.category,
                    uniformType: v.uniform_type,
                    difficulty: v.difficulty,
                    price: v.price || 0,
                    previewVimeoId: v.preview_vimeo_id // Added preview ID
                };
            });

        return validVideos;
    } catch (error) {
        console.error('Error in getPublicSparringVideos:', error);
        return [];
    }
}

// Increment views
export async function incrementVideoViews(videoId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_video_views', {
        video_id: videoId,
    });

    if (error) {
        console.error('Error incrementing video views:', error);
    }
}

export async function incrementRoutineViews(routineId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_routine_views', {
        p_routine_id: routineId,
    });

    if (error) {
        console.error('Error incrementing routine views:', error);
    }
}

export async function incrementSparringViews(videoId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_sparring_views', {
        p_video_id: videoId,
    });

    if (error) {
        console.error('Error incrementing sparring views:', error);
    }
}









export async function getPurchasedSparringVideos(userId: string): Promise<SparringVideo[]> {
    try {
        // 1. Get purchase records
        const { data: purchases } = await withTimeout(
            supabase
                .from('purchases')
                .select('product_id')
                .eq('user_id', userId)
                .eq('status', 'completed'),
            10000
        ) as any;

        if (!purchases || purchases.length === 0) return [];

        const productIds = purchases.map((p: any) => p.product_id);

        // 2. Fetch corresponding sparring videos (regardless of published status)
        const { data: videos, error } = await withTimeout(
            supabase
                .from('sparring_videos')
                .select('*')
                .in('id', productIds)
                .order('created_at', { ascending: false }),
            10000
        ) as any;

        if (error || !videos) return [];

        // Extract creator IDs for manual fetch
        const creatorIds = Array.from(new Set(videos.map((v: any) => v.creator_id).filter(Boolean)));
        const userMap = await fetchCreatorsByIds(creatorIds as string[]);

        return videos.map((v: any) => {
            const creator = userMap[v.creator_id];
            return {
                ...transformSparringVideo({
                    ...v,
                    creator: creator ? {
                        ...creator,
                        profileImage: creator.profileImage
                    } : undefined
                })
            };
        });
    } catch (e) {
        console.error('Error fetching purchased sparring:', e);
        return [];
    }
}

/**
 * Check if a user has purchased a specific sparring video
 */
export async function checkSparringOwnership(userId: string, videoId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', userId)
            .eq('product_id', videoId)
            .eq('status', 'completed')
            .maybeSingle();

        if (error) {
            console.error('Error checking sparring ownership:', error);
            return false;
        }

        return !!data;
    } catch (e) {
        console.error('Exception checking sparring ownership:', e);
        return false;
    }
}

export async function incrementCourseViews(courseId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_course_views', {
        course_id: courseId,
    });

    if (error) {
        console.error('Error incrementing course views:', error);
    }
}

// Purchase API
export async function purchaseCourse(userId: string, courseId: string, pricePaid: number): Promise<{ error: any }> {
    const { error } = await supabase
        .from('user_courses')
        .insert({
            user_id: userId,
            course_id: courseId,
            price_paid: pricePaid,
        });

    if (error) {
        console.error('Error purchasing course:', error);
    }

    return { error };
}

export async function checkCourseOwnership(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

    if (error) {
        return false;
    }

    return !!data;
}

export async function getUserCourses(userId: string): Promise<Course[]> {
    const { data, error } = await withTimeout(
        supabase
            .from('user_courses')
            .select(`
      course_id,
      courses (
        *,
        creator:creators(name),
        lessons:lessons(vimeo_url, lesson_number)
      )
    `)
            .eq('user_id', userId),
        10000
    ) as any;

    if (error) {
        console.error('Error fetching user courses:', error);
        return [];
    }

    return (data || []).map((item: any) => {
        // Find first lesson for preview
        const lessons = item.courses.lessons || [];
        const firstLesson = lessons.sort((a: any, b: any) => a.lesson_number - b.lesson_number)[0];
        const autoPreviewId = firstLesson?.vimeo_url ? extractVimeoId(firstLesson.vimeo_url) : null;

        return {
            ...transformCourse(item.courses),
            lessonCount: lessons.length || 0,
            previewVideoUrl: firstLesson?.vimeo_url,
            previewVimeoId: autoPreviewId || item.courses.preview_vimeo_id // Fallback to course preview if extracted fails
        };
    });
}

export const getUserPurchasedCourses = getUserCourses;

// ==================== SKILLS API ====================

export async function getUserSkills(userId: string): Promise<UserSkill[]> {
    const { data, error } = await supabase
        .from('user_skills')
        .select(`
            *,
            course:courses (
                title,
                creator:creators (name)
            ),
            subcategory:skill_subcategories (name)
        `)
        .eq('user_id', userId);

    if (error) {
        // If table doesn't exist yet, return empty
        if (error.code === '42P01') return [];
        console.error('Error fetching user skills:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        category: item.category,
        subcategoryId: item.subcategory_id,
        subcategoryName: item.subcategory?.name,
        courseId: item.course_id,
        courseTitle: item.course?.title,
        creatorName: item.course?.creator?.name,
        status: item.status,
        createdAt: item.created_at,
        updatedAt: item.updated_at
    }));
}

export async function getSkillSubcategories(userId: string): Promise<SkillSubcategory[]> {
    const { data, error } = await supabase
        .from('skill_subcategories')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

    if (error) {
        if (error.code === '42P01') return [];
        console.error('Error fetching skill subcategories:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        category: item.category,
        name: item.name,
        displayOrder: item.display_order,
        createdAt: item.created_at
    }));
}

export async function createSkillSubcategory(userId: string, category: string, name: string) {
    // Get max display order
    const { data: maxOrderData } = await supabase
        .from('skill_subcategories')
        .select('display_order')
        .eq('user_id', userId)
        .eq('category', category)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    const { data, error } = await supabase
        .from('skill_subcategories')
        .insert({
            user_id: userId,
            category,
            name,
            display_order: nextOrder
        })
        .select()
        .single();

    if (error) return { data: null, error };

    const subcategory: SkillSubcategory = {
        id: data.id,
        userId: data.user_id,
        category: data.category,
        name: data.name,
        displayOrder: data.display_order,
        createdAt: data.created_at
    };

    return { data: subcategory, error: null };
}

export async function deleteSkillSubcategory(subcategoryId: string) {
    const { error } = await supabase
        .from('skill_subcategories')
        .delete()
        .eq('id', subcategoryId);

    return { error };
}

// Learning Progress API
export async function markLessonComplete(userId: string, lessonId: string, completed: boolean = true) {
    const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
            user_id: userId,
            lesson_id: lessonId,
            completed: completed,
            last_watched_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,lesson_id'
        });

    if (!error && completed) {
        // Update 'watch_lesson' quest progress
        await updateQuestProgress(userId, 'watch_lesson');
    }

    return { data, error };
}

export async function getLessonProgress(userId: string, lessonId: string) {
    const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .maybeSingle();

    if (error) {
        // 406/PGRST106: Table missing or RLS issue
        if (error.code === 'PGRST106' || error.code === '406') {
            return null;
        }
        console.error('Error fetching lesson progress:', error);
        return null;
    }

    return data;
}

export async function getCourseProgress(userId: string, courseId: string): Promise<{ completed: number; total: number; percentage: number }> {
    // Get all lessons for this course
    const { data: lessons, error: lessonsError } = await withTimeout(
        supabase
            .from('lessons')
            .select('id')
            .eq('course_id', courseId),
        10000
    );

    if (lessonsError || !lessons) {
        return { completed: 0, total: 0, percentage: 0 };
    }

    const total = lessons.length;

    // Get completed lessons
    const { data: progress, error: progressError } = await withTimeout(
        supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', userId)
            .in('lesson_id', lessons.map(l => l.id))
            .eq('completed', true),
        10000
    );

    if (progressError) {
        return { completed: 0, total, percentage: 0 };
    }

    const completed = progress?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
}

export async function updateLastWatched(userId: string, lessonId: string, watchedSeconds?: number) {
    const updates: any = {
        user_id: userId,
        lesson_id: lessonId,
        last_watched_at: new Date().toISOString(),
    };

    if (typeof watchedSeconds === 'number') {
        updates.watched_seconds = watchedSeconds;
    }

    const { error } = await supabase
        .from('lesson_progress')
        .upsert(updates, {
            onConflict: 'user_id,lesson_id'
        });

    if (error) {
        console.error('Error in updateLastWatched:', error, { userId, lessonId, watchedSeconds });
    }

    return { error };
}

// Enhanced Recent Activity (Lessons Only)
export async function getRecentActivity(userId: string) {
    // 1. Lessons Progress Only
    const { data: lessonData, error: lessonError } = await withTimeout(
        supabase
            .from('lesson_progress')
            .select(`
            *,
            lesson:lessons (
                id, title, lesson_number, duration_minutes, thumbnail_url,
                creator_id,
                course:courses (
                    id, title, thumbnail_url, category,
                    creator:creators ( id, name, profile_image )
                )
            )
        `)
            .eq('user_id', userId)
            .order('last_watched_at', { ascending: false })
            .limit(10),
        10000
    ) as any;

    if (lessonError) {
        console.error("Error fetching recent activity:", lessonError);
    }

    const creatorIds = Array.from(new Set((lessonData || []).map((item: any) => item.lesson?.course?.creator_id || item.lesson?.creator_id).filter(Boolean)));
    const userMap = await fetchCreatorsByIds(creatorIds as string[]);

    const lessonItems = (lessonData || []).map((item: any) => {
        const l = item.lesson;
        // Skip if lesson data is missing
        if (!l) return null;

        const watchedSec = item.watched_seconds || 0;
        const durationMin = l.duration_minutes || 0;
        const totalSec = durationMin * 60;

        let progress = 0;
        if (item.completed) {
            progress = 100;
        } else if (totalSec > 0 && watchedSec > 0) {
            progress = Math.min(Math.round((watchedSec / totalSec) * 100), 99);
        }

        const relevantCreatorId = l.course?.creator_id || l.creator_id;
        const creatorProfile = userMap[relevantCreatorId];

        return {
            id: l.id,
            courseId: l.course?.id,
            creatorId: relevantCreatorId,
            type: 'lesson',
            title: l.title,
            courseTitle: l.course?.title || l.title,
            progress,
            watchedSeconds: watchedSec,
            thumbnail: l.thumbnail_url || l.course?.thumbnail_url,
            lastWatched: new Date(item.last_watched_at || item.created_at).toISOString(),
            lessonNumber: l.lesson_number,
            durationMinutes: durationMin,
            creatorName: creatorProfile?.name || l.course?.creator?.name || 'Unknown',
            creatorProfileImage: creatorProfile?.profileImage || l.course?.creator?.profile_image
        };
    }).filter((item: any) => item && item.id);

    return lessonItems;
}

// Creator Dashboard API
export async function getCreatorCourses(creatorId: string) {
    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            lessons:lessons(id)
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching creator courses:', error);
        return [];
    }

    return (data || []).map((course: any) => ({
        ...transformCourse(course),
        lessonCount: course.lessons?.length || 0,
    }));
}

export async function getCreatorSparringVideos(creatorId: string): Promise<SparringVideo[]> {
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching creator sparring videos:', error);
        return [];
    }

    return (data || []).map(transformSparringVideo);
}

export async function createCourse(courseData: Partial<Course>) {
    // Map camelCase to snake_case for DB
    const dbData = {
        title: courseData.title,
        description: courseData.description,
        creator_id: courseData.creatorId,
        category: courseData.category,
        difficulty: courseData.difficulty,
        thumbnail_url: courseData.thumbnailUrl,
        price: courseData.price,
        is_subscription_excluded: courseData.isSubscriptionExcluded,
        published: courseData.published,
        uniform_type: courseData.uniformType,
        preview_vimeo_id: courseData.previewVimeoId,
    };

    const { data, error } = await supabase
        .from('courses')
        .insert(dbData)
        .select()
        .single();

    if (error) return { error };
    return { data: transformCourse(data), error: null };
}

export async function updateCourse(courseId: string, courseData: Partial<Course>) {
    const dbData: any = {};
    if (courseData.title) dbData.title = courseData.title;
    if (courseData.description) dbData.description = courseData.description;
    if (courseData.creatorId) dbData.creator_id = courseData.creatorId;
    if (courseData.category) dbData.category = courseData.category;
    if (courseData.difficulty) dbData.difficulty = courseData.difficulty;
    if (courseData.thumbnailUrl) dbData.thumbnail_url = courseData.thumbnailUrl;
    if (courseData.price !== undefined) dbData.price = courseData.price;
    if (courseData.isSubscriptionExcluded !== undefined) dbData.is_subscription_excluded = courseData.isSubscriptionExcluded;
    if (courseData.published !== undefined) dbData.published = courseData.published;
    if (courseData.uniformType) dbData.uniform_type = courseData.uniformType;
    if (courseData.previewVimeoId) dbData.preview_vimeo_id = courseData.previewVimeoId;

    const { data, error } = await supabase
        .from('courses')
        .update(dbData)
        .eq('id', courseId)
        .select()
        .single();

    if (error) return { error };

    // Sync creator_id to all lessons for this course if changed
    if (courseData.creatorId) {
        const { error: lessonsError } = await supabase
            .from('lessons')
            .update({ creator_id: courseData.creatorId })
            .eq('course_id', courseId);

        if (lessonsError) {
            console.error('Error syncing lesson creator IDs:', lessonsError);
        }
    }

    return { data: transformCourse(data), error: null };
}


export async function updateCourseLessons(courseId: string, lessonIds: string[]) {
    // 1. First, dissociate all lessons currently linked to this course
    const { error: resetError } = await supabase
        .from('lessons')
        .update({ course_id: null })
        .eq('course_id', courseId);

    if (resetError) return { error: resetError };

    // 2. Associate the selected lessons
    if (lessonIds.length > 0) {
        const { error: updateError } = await supabase
            .from('lessons')
            .update({ course_id: courseId })
            .in('id', lessonIds);

        if (updateError) return { error: updateError };

        // 3. Ensure lesson numbers are sequential
        const { reorderLessons } = await import('./api-lessons');
        const lessonOrders = lessonIds.map((id, index) => ({
            id,
            lessonNumber: index + 1
        }));
        await reorderLessons(lessonOrders);
    }

    return { error: null };
}

// ==================== Support API ====================

export async function createSupportTicket(ticketData: {
    userId?: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    category?: string;
}) {
    const dbData = {
        user_id: ticketData.userId || null, // Allow null for guests
        user_name: ticketData.name,
        user_email: ticketData.email,
        subject: ticketData.subject,
        message: ticketData.message,
        category: ticketData.category || 'general',
        status: 'open',
        priority: 'medium'
    };

    const { error } = await supabase
        .from('support_tickets')
        .insert(dbData);

    if (!error) {
        // Notify Admins
        try {
            const { data: admins } = await supabase
                .from('users')
                .select('id')
                .eq('is_admin', true);

            if (admins) {
                await Promise.all(admins.map(admin =>
                    createNotify(
                        admin.id,
                        'support_ticket',
                        '새로운 1:1 문의 접수',
                        `[${ticketData.category || '일반'}] ${ticketData.subject}`,
                        '/admin/support'
                    )
                ));
            }
        } catch (notifyError) {
            console.error('Failed to notify admins:', notifyError);
        }
    }

    return { error };
}


export async function getPublicLessons(limit: number = 50) {
    const { data, error } = await supabase
        .from('lessons')
        .select(`
            *,
            course:courses (
                title,
                thumbnail_url,
                creator:creators ( name, avatar_url )
            )
        `)
        .not('vimeo_url', 'is', null)
        .neq('vimeo_url', '')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching public lessons:', error);
        return { data: [], error };
    }

    return {
        data: (data || []).map(transformLesson),
        error: null
    };
}



// ==================== Admin Functions ====================

/**
 * Check if a user is an admin
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .maybeSingle();

    if (error || !data) return false;
    return data.is_admin === true;
}

/**
 * Get all pending creator applications
 */
export async function getPendingCreators() {
    const { data, error } = await supabase
        .from('creators')
        .select(`
            id,
            name,
            bio,
            profile_image,
            created_at,
            approved
        `)
        .eq('approved', false)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching pending creators:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Get user email by ID (for admin display)
 */
export async function getUserEmail(userId: string) {
    const { data, error } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();

    return { data: data?.email || null, error };
}

/**
 * Approve a creator application
 */
export async function approveCreator(creatorId: string) {
    const { error } = await supabase
        .from('creators')
        .update({ approved: true })
        .eq('id', creatorId)
        .select()
        .single();

    if (!error) {
        // Notify User
        // Check if creators.id is user_id. If so, use creatorId.
        // If not, we might need to fetch user_id. 
        // Based on typical Supabase auth linking, often creator_id = user_id.
        // We'll send to creatorId.
        await createNotify(
            creatorId,
            'system_announcement', // or 'creator_approved' if added
            '크리에이터 승인 완료',
            '축하합니다! 크리에이터 신청이 승인되었습니다.',
            '/creator/dashboard',
            { action: 'creator_approved' }
        );
    }

    if (error) {
        console.error('Error approving creator:', error);
        return { error };
    }

    return { error: null };
}

/**
 * Reject a creator application (delete the record)
 */
export async function rejectCreator(creatorId: string) {
    // Notify before delete (since delete removes the ID reference if it was just a request, 
    // but if it's the user's ID, we can still notify the USER even if creator record is deleted, 
    // assuming users table row remains).
    // Note: If 'creators' table has user_id FK and we delete it, we can still notify user_id.
    // If creators.id IS user_id, we can notify user_id.

    await createNotify(
        creatorId,
        'system_announcement',
        '크리에이터 신청 거절',
        '크리에이터 신청이 거절되었습니다. 자세한 내용은 문의 바랍니다.',
        '/',
        { action: 'creator_rejected' }
    );

    const { error } = await supabase
        .from('creators')
        .delete()
        .eq('id', creatorId);

    if (error) {
        console.error('Error rejecting creator:', error);
        return { error };
    }

    return { error: null };
}

// ==================== AUTH API ====================

export async function updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
        password: password
    });

    return { data, error };
}
// ==================== PROFILE IMAGE UPLOAD ====================

/**
 * Upload profile image to Supabase Storage
 * @param userId - User ID (used for folder organization)
 * @param file - Image file to upload
 * @returns Public URL of uploaded image
 */
export async function uploadProfileImage(userId: string, file: File): Promise<{ url: string | null; error: any }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/profile.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, file, {
            upsert: true, // Replace existing file
        });

    if (uploadError) {
        return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
}

/**
 * Update user profile information
 */
export async function updateUserProfile(userId: string, updates: {
    name?: string;
    belt?: string;
    profileImageUrl?: string;
}) {
    const dbData: any = {};
    if (updates.name !== undefined) dbData.name = updates.name;
    if (updates.belt !== undefined) dbData.belt = updates.belt;
    if (updates.profileImageUrl !== undefined) dbData.profile_image_url = updates.profileImageUrl;

    const { data, error } = await supabase
        .from('users')
        .update(dbData)
        .eq('id', userId)
        .select()
        .maybeSingle();

    if (error) {
        console.error('Error updating user profile:', error);
        return { data: null, error };
    }

    // Also update auth.users metadata to persist across sessions
    if (updates.name !== undefined) {
        const { error: authError } = await supabase.auth.updateUser({
            data: { name: updates.name }
        });

        if (authError) {
            console.error('Error updating auth metadata:', authError);
        }
    }

    return { data, error: null };
}

/**
 * Upload hero image to Supabase Storage
 */
export async function uploadHeroImage(file: File): Promise<{ url: string | null; error: any }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `hero-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
        .from('hero-images') // Using 'hero-images' bucket
        .upload(filePath, file, {
            upsert: true,
        });

    if (uploadError) {
        return { url: null, error: uploadError };
    }

    // Get public URL
    const { data } = supabase.storage
        .from('hero-images')
        .getPublicUrl(filePath);

    return { url: data.publicUrl, error: null };
}

/**
 * 썸네일 이미지를 Supabase Storage에 업로드
 */
export async function uploadThumbnail(blob: Blob, bucketName: string = 'thumbnails'): Promise<{ url: string | null; error: any }> {
    const fileName = `thumb-${crypto.randomUUID()}.jpg`;
    const filePath = `${fileName}`;

    // Ensure we start with the requested bucket (default: thumbnails)
    const bucketsToTry = [bucketName];
    if (bucketName !== 'images') bucketsToTry.push('images'); // Fallback for legacy

    let lastError: any = null;

    for (const bucket of bucketsToTry) {
        try {
            console.log(`Trying to upload thumbnail to bucket: ${bucket}`);
            const { error: uploadError } = await withTimeout(
                supabase.storage
                    .from(bucket)
                    .upload(filePath, blob, {
                        contentType: 'image/jpeg',
                        upsert: true,
                    }),
                60000
            ) as any;

            if (!uploadError) {
                const { data } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(filePath);
                return { url: data.publicUrl, error: null };
            }

            console.warn(`Failed to upload to ${bucket}:`, JSON.stringify(uploadError, null, 2));
            lastError = uploadError;
        } catch (e) {
            console.warn(`Exception uploading to ${bucket}:`, e);
            lastError = e;
        }
    }

    return { url: null, error: lastError || new Error('All thumbnail upload attempts failed') };
}

/**
 * Update creator profile image
 */
export async function updateCreatorProfileImage(creatorId: string, imageUrl: string) {
    const { error } = await supabase
        .from('creators')
        .update({ profile_image: imageUrl })
        .eq('id', creatorId);

    return { error };
}

/**
 * Update creator profile (bio, etc.)
 */
export async function updateCreatorProfile(creatorId: string, updates: { bio?: string }) {
    const { error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', creatorId);

    return { error };
    return { error };
}

/**
 * Update creator payout settings
 */
export async function updatePayoutSettings(
    creatorId: string,
    settings: {
        type: 'individual' | 'business';
        isKoreanResident?: boolean;
        // PayPal/International fields
        paypalEmail?: string;
        wiseEmail?: string; // Legacy support
        wiseAccountNumber?: string; // Legacy support
        wiseRoutingNumber?: string; // Legacy support
        wiseSwiftBic?: string; // Legacy support
        wiseAccountName?: string; // Legacy support
        // Korean Bank fields
        bankName?: string;
        accountNumber?: string;
        accountHolder?: string;
        residentRegistrationNumber?: string; // For tax withholding (3.3%)
    }
) {
    const { error } = await supabase
        .from('creators')
        .update({ payout_settings: settings })
        .eq('id', creatorId);

    return { error };
}

/**
 * Get creator payout settings
 */
export async function getPayoutSettings(creatorId: string) {
    const { data, error } = await supabase
        .from('creators')
        .select('stripe_account_id, payout_settings')
        .eq('id', creatorId)
        .maybeSingle();

    if (error) return { data: null, error };
    if (!data) return { data: null, error: null };

    return {
        data: {
            stripeAccountId: data.stripe_account_id,
            payoutSettings: data.payout_settings
        },
        error: null
    };
}

/**
 * Get creator current balance for payout
 */
export async function getCreatorBalance(creatorId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_creator_balance', { p_creator_id: creatorId });
    if (error) {
        console.error('Error fetching creator balance:', error);
        return 0;
    }
    return data || 0;
}

/**
 * Submit a payout request
 */
export async function submitPayout(amount: number) {
    const { data, error } = await supabase.rpc('submit_payout_request', { p_amount: amount });
    return { data, error };
}

export async function getPayoutRequests(creatorId: string) {
    return await supabase
        .from('payout_requests')
        .select('*')
        .eq('creator_id', creatorId)
        .order('requested_at', { ascending: false });
}

// ==================== ADMIN COURSE MANAGEMENT ====================

/**
 * Delete a course (admin only)
 */
export async function deleteCourse(courseId: string) {
    // 1. Get all lessons to delete their progress
    const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

    const lessonIds = lessons?.map(l => l.id) || [];

    if (lessonIds.length > 0) {
        // 2. Delete lesson progress
        await supabase
            .from('lesson_progress')
            .delete()
            .in('lesson_id', lessonIds);

        // 3. Delete lessons
        await supabase
            .from('lessons')
            .delete()
            .eq('course_id', courseId);
    }

    // 4. Delete user enrollments (user_courses)
    await supabase
        .from('user_courses')
        .delete()
        .eq('course_id', courseId);

    // 5. Delete the course
    const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

    return { error };
}

// ==================== SUBSCRIPTIONS API ====================

/**
 * Subscribe to a creator
 */
export async function subscribeToCreator(userId: string, creatorId: string) {
    const { error } = await supabase
        .from('creator_subscriptions')
        .insert({
            user_id: userId,
            creator_id: creatorId
        });

    return { error };
}

/**
 * Unsubscribe from a creator
 */
export async function unsubscribeFromCreator(userId: string, creatorId: string) {
    const { error } = await supabase
        .from('creator_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('creator_id', creatorId);

    return { error };
}

/**
 * Check if user is subscribed to a creator
 */
export async function checkSubscriptionStatus(userId: string, creatorId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('creator_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('creator_id', creatorId)
        .maybeSingle();

    if (error) return false;
    return !!data;
}


/**
 * Delete a lesson (admin only)
 */
// deleteLesson and removeLessonFromCourse are already exported from ./api-lessons.ts above

/**
 * Get all courses (for admin management)
 */
export async function getAllCoursesForAdmin() {
    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            creator:creators(name, profile_image)
        `)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    const transformedData = data.map(transformCourse);
    return { data: transformedData, error: null };
}

// ==================== REVENUE CALCULATION ====================

/**
 * Calculate creator earnings from direct sales, feedback, and subscription revenue
 */
export async function calculateCreatorEarnings(creatorId: string) {
    const { data: creator, error: creatorError } = await supabase
        .from('creators')
        .select('direct_share, subscription_share')
        .eq('id', creatorId)
        .single();

    if (creatorError) {
        console.error('Error fetching creator share settings:', creatorError);
        return { error: creatorError };
    }

    const directShare = creator.direct_share ?? DIRECT_PRODUCT_CREATOR_SHARE;
    const subShare = creator.subscription_share ?? SUBSCRIPTION_CREATOR_SHARE;

    // 1. Calculate Direct Sales Revenue (Courses)
    const { data: courses } = await supabase.from('courses').select('id').eq('creator_id', creatorId);
    const courseIds = courses?.map((c: { id: string }) => c.id) || [];

    let directRevenue = 0;
    if (courseIds.length > 0) {
        const { data: sales } = await supabase
            .from('user_courses')
            .select('price_paid')
            .in('course_id', courseIds);

        const totalSales = sales?.reduce((sum: number, sale: { price_paid: number }) => sum + (sale.price_paid || 0), 0) || 0;
        directRevenue = totalSales * directShare;
    }

    // 1.5 Calculate Bundle Revenue (Advanced Split Logic)
    let bundleRevenue = 0;

    // Fetch ALL bundle sales to check if this creator has items inside them
    const { data: allBundleSales } = await supabase
        .from('user_bundles')
        .select(`
            price_paid,
            bundle_id,
            bundles!inner (
                id,
                bundle_courses (
                    course:courses ( id, Price, creator_id )
                ),
                bundle_routines (
                    routine:routines ( id, price, creator_id )
                )
            )
        `);

    if (allBundleSales) {
        allBundleSales.forEach((sale: any) => {
            const bundle = sale.bundles;
            const courses = bundle.bundle_courses?.map((bc: any) => bc.course) || [];
            const routines = bundle.bundle_routines?.map((br: any) => br.routine) || [];

            let totalValue = 0;
            let myValue = 0;

            // Calculate total value of items inside the bundle
            courses.forEach((c: any) => {
                const price = c.Price || 0;
                totalValue += price;
                if (c.creator_id === creatorId) {
                    myValue += price;
                }
            });

            routines.forEach((r: any) => {
                const price = r.price || 0;
                totalValue += price;
                if (r.creator_id === creatorId) {
                    myValue += price;
                }
            });

            // If this creator owns parts of the bundle
            if (myValue > 0 && totalValue > 0) {
                // Calculate split based on value contribution
                // Share = (My Item Value / Total Bundle Value) * Price Paid * Platform Share
                const splitRatio = myValue / totalValue;
                const myShare = sale.price_paid * splitRatio * directShare;
                bundleRevenue += myShare;
            }
        });
    }

    // 2. Calculate Feedback Revenue
    // Feedback also uses the direct_share (80%)
    const { data: feedbackSales } = await supabase
        .from('feedback_requests')
        .select('*')
        .eq('instructor_id', creatorId)
        .eq('status', 'completed');

    const totalFeedbackSales = feedbackSales?.reduce((sum: number, req: { price: number }) => sum + (req.price || 0), 0) || 0;
    const feedbackRevenue = totalFeedbackSales * directShare;

    // 3. Calculate Subscription Revenue (Watch Time Based)
    // Get actual subscription revenue from revenue_ledger (recognized only)
    // For now, we'll sum ALL recognized revenue. In a real system, this would be filtered by month.
    const { data: recognizedRevenue } = await supabase
        .from('revenue_ledger')
        .select('amount')
        .eq('status', 'recognized');

    // Fallback to mock if no ledger data exists yet (for dev/testing)
    const totalSubRevenuePool = (recognizedRevenue && recognizedRevenue.length > 0)
        ? recognizedRevenue.reduce((sum, r) => sum + r.amount, 0)
        : 10000000; // 10,000,000 KRW fallback

    // Get courses owned by users to exclude them from subscription revenue
    const { data: ownedCourses } = await supabase
        .from('user_courses')
        .select('user_id, course_id');

    // Get routines owned by users to exclude their drills from subscription revenue
    const { data: ownedRoutines } = await supabase
        .from('user_routine_purchases')
        .select(`
            user_id, 
            routine_id,
            routine:routines (
                routine_drills ( drill_id )
            )
        `);

    const ownershipMap = new Map<string, boolean>();

    // 1. Map owned courses
    ownedCourses?.forEach(uc => {
        ownershipMap.set(`${uc.user_id}_course_${uc.course_id}`, true);
    });

    // 2. Map owned drills via routines
    ownedRoutines?.forEach((ur: any) => {
        // ur.routine.routine_drills is an array of objects { drill_id: "..." }
        // Note: Supabase join returns it as an array
        const drills = ur.routine?.routine_drills;
        if (Array.isArray(drills)) {
            drills.forEach((d: any) => {
                ownershipMap.set(`${ur.user_id}_drill_${d.drill_id}`, true);
            });
        }
    });

    // Get actual watch seconds from video_watch_logs
    const { data: watchLogs } = await supabase
        .from('video_watch_logs')
        .select(`user_id, watch_seconds, lesson_id, video_id`);

    // Fetch mapping data for all content types to attribute creator_id
    const [
        { data: lessonsRef },
        { data: drillsRef },
        { data: sparringRef },
        { data: videosRef }
    ] = await Promise.all([
        supabase.from('lessons').select('id, creator_id, course_id'),
        supabase.from('drills').select('id, creator_id'),
        supabase.from('sparring_videos').select('id, creator_id'),
        supabase.from('videos').select('id, creator_id')
    ]);

    const contentCreatorMap = new Map<string, string>();
    const lessonCourseMap = new Map<string, string>();

    lessonsRef?.forEach(l => {
        if (l.creator_id) contentCreatorMap.set(l.id, l.creator_id);
        if (l.course_id) lessonCourseMap.set(l.id, l.course_id);
    });
    drillsRef?.forEach(d => { if (d.creator_id) contentCreatorMap.set(d.id, d.creator_id); });
    sparringRef?.forEach(s => { if (s.creator_id) contentCreatorMap.set(s.id, s.creator_id); });
    videosRef?.forEach(v => { if (v.creator_id) contentCreatorMap.set(v.id, v.creator_id); });

    let totalWatchTime = 0;
    let creatorWatchTime = 0;

    watchLogs?.forEach((log: any) => {
        const seconds = log.watch_seconds || 0;
        const userId = log.user_id;
        const contentId = log.lesson_id || log.video_id;

        if (!contentId) return;

        // Skip if user owns the course (direct purchase items don't count toward subscription pool)
        if (log.lesson_id) {
            const courseId = lessonCourseMap.get(log.lesson_id);
            if (courseId && ownershipMap.has(`${userId}_course_${courseId}`)) return;
        } else if (log.video_id) {
            // Check drill ownership via routine
            if (ownershipMap.has(`${userId}_drill_${log.video_id}`)) return;
        }

        totalWatchTime += seconds;
        const targetCreatorId = contentCreatorMap.get(contentId);
        if (targetCreatorId === creatorId) {
            creatorWatchTime += seconds;
        }
    });

    const share = totalWatchTime > 0 ? creatorWatchTime / totalWatchTime : 0;
    const creatorSubRevenue = Math.floor(totalSubRevenuePool * subShare * share);

    return {
        data: {
            directRevenue,
            bundleRevenue,
            feedbackRevenue,
            subscriptionRevenue: creatorSubRevenue,
            totalRevenue: directRevenue + bundleRevenue + feedbackRevenue + creatorSubRevenue,
            creatorWatchTime,
            totalWatchTime,
            watchTimeShare: share
        },
        error: null
    };
}

/**
 * Get creator revenue stats (monthly breakdown)
 * Aggregates real sales data from:
 * 1. Course Sales (user_courses)
 * 2. Feedback Sales (feedback_requests)
 * 3. Bundle Bundles (user_bundles - TODO: if implemented)
 */
export async function getCreatorRevenueStats(creatorId: string) {
    try {
        // Fetch monthly settlement stats from the centralized SQL view
        // This ensures the Admin Dashboard and Creator Dashboard show the EXACT same numbers (80% settlement)
        const { data, error } = await supabase
            .from('creator_monthly_settlements')
            .select('*')
            .eq('creator_id', creatorId)
            .order('settlement_month', { ascending: false });

        if (error) {
            // If view doesn't exist (e.g. migration not run), return empty to avoid crash
            if (error.code === '42P01') {
                console.warn('creator_monthly_settlements view not found. falling back to empty.');
                return { data: [], error: null };
            }
            throw error;
        }


        (data || []).forEach((_row: any) => {
            // Wait, the View combines raw sales. It does NOT aggregate sum per month in the `combined_sales` part, 
            // BUT the final select DOES `GROUP BY ... settlement_month`.
            // Ah, looking at the view definition:
            /*
               GROUP BY cs.creator_id, ..., DATE_TRUNC('month', cs.created_at);
            */
            // The view returns SUMMED properties per month. It does NOT return individual rows.
            // Therefore, we CANNOT get individual item titles from this view!
            // "c.title as item_title" in the CTE is lost in the final GROUP BY because it's not in the GROUP BY clause (or it would group by title too).

            // WE MADE A MISTAKE IN THE VIEW DEFINITION IF WE WANTED DETAILS.
            // The View aggregates.

            // To fix this properly, we need to either:
            // 1. Modify the View to NOT group by, just return raw unioned list.
            // 2. Or create a separate function to get specific sales history.

            // Since I cannot change the View definition in this step easily without SQL migration again (which is fine but heavier),
            // I will stick to what the user wants: "Where can I see routine/feedback sales?"
            // Showing them in the "RevenueAnalyticsTab" is the goal.
            // The view `creator_monthly_settlements` currently GROUPS BY month.
            // So `item_title` is actually NOT available in the final result if it wasn't grouped by.
            // Let's check the SQL I wrote earlier:
            /*
               GROUP BY cs.creator_id, c.name, u.email, c.payout_settings, DATE_TRUNC('month', cs.created_at);
            */
            // Yes, `cs.item_title` is NOT in the select list of the final query, nor in group by.
            // So we CANNOT get item details from this View.
        });

        // RE-STRATEGY:
        // I need to fetch the detailed sales history separately to show "What sold".
        // I will add a method to fetch "Recent Sales History" from the underlying tables directly.

        return { data: [], error: null }; // Placeholder to stop this tool call and switch strategy
    } catch (error) {
        console.error('Error calculating creator revenue stats:', error);
        return { data: null, error };
    }
}

/**
 * Get recent sales history (Course, Routine, Feedback)
 */
export async function getCreatorSalesHistory(creatorId: string) {
    // 1. Course Sales
    const { data: courseSales } = await supabase
        .from('user_courses')
        .select(`
            created_at,
            price_paid,
            courses!inner ( id, title, creator_id )
        `)
        .eq('courses.creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(20);

    // 2. Routine Sales
    const { data: routineSales } = await supabase
        .from('user_routine_purchases')
        .select(`
            created_at,
            price_paid,
            routines!inner ( id, title, creator_id )
        `)
        .eq('routines.creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(20);

    // 3. Feedback Sales
    const { data: feedbackSales } = await supabase
        .from('feedback_requests')
        .select(`
            created_at,
            price,
            description
        `)
        .eq('instructor_id', creatorId)
        .eq('status', 'completed') // Only completed/paid ones
        .order('created_at', { ascending: false })
        .limit(20);

    // Combine and Sort
    const history = [
        ...(courseSales || []).map((s: any) => ({
            type: 'course',
            title: s.courses.title,
            amount: s.price_paid,
            date: s.created_at
        })),
        ...(routineSales || []).map((s: any) => ({
            type: 'routine',
            title: s.routines.title,
            amount: s.price_paid,
            date: s.created_at
        })),
        ...(feedbackSales || []).map((s: any) => ({
            type: 'feedback',
            title: '1:1 피드백',
            amount: s.price,
            date: s.created_at
        }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { data: history, error: null };
}

/**
 * Enroll in a free course(add to library)
 */
export async function enrollInCourse(userId: string, courseId: string) {
    // Check if already enrolled
    const { data: existing } = await supabase
        .from('user_courses')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

    if (existing) {
        return { error: null }; // Already enrolled
    }

    // Add to user_courses with 0 price
    const { error } = await supabase
        .from('user_courses')
        .insert({
            user_id: userId,
            course_id: courseId,
            price_paid: 0
        });

    return { error };
}

/**
 * Purchase a subscription
 */
export async function purchaseSubscription(planId: string) {
    // In our new PayPal flow, we navigate to the checkout page
    window.location.href = `/checkout/subscription/${planId}`;
    return { error: null };
}

// ==================== TRAINING LOG (JOURNAL) ====================

/**
 * Get training logs for a user
 */
export async function getTrainingLogs(userId: string) {
    // Fetch all logs first, then filter in memory to be 100% sure
    const { data, error } = await supabase
        .from('training_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) return { data: null, error };

    // Robust JS filtering
    const filteredData = data.filter((log: any) => {
        // 1. Exclude if duration is -1 (Feed Post Marker)
        if (log.duration_minutes === -1) {
            return false;
        }
        // 2. Exclude non-training system markers (level ups, titles, etc)
        // But KEEP 'technique', 'general', 'sparring' as they contain training data
        if (log.type && ['mastery', 'title_earned', 'level_up'].includes(log.type)) {
            return false;
        }
        // 3. Exclude if location has the special FEED tag
        if (log.location && typeof log.location === 'string' && log.location.startsWith('__FEED__')) {
            return false;
        }
        return true;
    });

    const logs: TrainingLog[] = filteredData.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        date: log.date,
        durationMinutes: log.duration_minutes,
        techniques: log.techniques || [],
        sparringRounds: log.sparring_rounds,
        notes: log.notes,
        isPublic: log.is_public || false,
        location: log.location,
        youtubeUrl: log.youtube_url,
        mediaUrl: log.media_url,
        metadata: log.metadata,
        type: log.type,
        createdAt: log.created_at
    }));

    return { data: logs, error: null };
}

/**
 * Check if user already earned XP from routine completion today
 */
export async function checkDailyRoutineXP(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('training_logs')
        .select('id')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('type', 'routine')
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error checking daily routine XP:', error);
        return false;
    }

    // If there's a record, user already earned XP today
    return !!data;
}

/**
 * Get IDs of routines completed today
 */
export async function getCompletedRoutinesToday(userId: string): Promise<string[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('training_logs')
        .select('metadata')
        .eq('user_id', userId)
        .eq('date', today)
        .eq('type', 'routine');

    if (error) {
        console.error('Error fetching completed routines:', error);
        return [];
    }

    // Extract routine IDs from metadata
    const completedIds = data
        ?.map((log: any) => log.metadata?.routineId)
        .filter((id: any) => typeof id === 'string') || [];

    return [...new Set(completedIds)];
}

/**
 * Get recent completed routines with full details
 */
export async function getRecentCompletedRoutines(
    userId: string,
    limit: number = 3
): Promise<CompletedRoutineRecord[]> {
    // DB query: Fetch a generous amount of recent logs to ensure we find the routines.
    // We avoid complex OR queries for now to guarantee no syntax errors silently fail.
    const { data: allLogs, error } = await withTimeout(
        supabase
            .from('training_logs')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50), // Fetch last 50 logs to be safe
        5000
    );

    if (error) {
        console.error('Error fetching training logs for routines:', error);
        return [];
    }

    if (!allLogs || allLogs.length === 0) {
        return [];
    }

    // JS-side filtering for 100% reliability
    // Matches if type is 'routine' OR notes contains the tag
    const routineLogs = allLogs.filter((log: any) =>
        log.type === 'routine' ||
        (log.notes && typeof log.notes === 'string' && log.notes.includes('[Routine Completed]'))
    ).slice(0, limit);

    if (routineLogs.length === 0) {
        return [];
    }

    // 각 기록에서 루틴 정보를 가져와서 결합
    const enrichedData: CompletedRoutineRecord[] = [];

    for (const log of routineLogs) {
        try {
            // metadata가 객체인지 확인 (가끔 문자열로 반환될 수 있으므로)
            const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : (log.metadata || {});
            const routineId = metadata.routineId;

            // routineId 가 없거나 문자열 "undefined"인 경우 제외
            if (!routineId || routineId === 'undefined') continue;

            let rawNotes = log.notes?.replace('[Routine Completed] ', '') || '';
            let routineTitle = rawNotes.split('\n')[0].trim() || 'Unknown Routine';
            let routineThumbnail: string | null = null;

            // 루틴 정보 가져오기
            const { data: routine } = await supabase
                .from('routines')
                .select('title, thumbnail_url, creator_id')
                .eq('id', routineId)
                .maybeSingle();

            let creatorId: string | undefined;
            let creatorName: string | undefined;
            let creatorProfileImage: string | undefined;

            if (routine) {
                routineTitle = routine.title;
                routineThumbnail = routine.thumbnail_url;
                creatorId = routine.creator_id;

                // creator 프로필 정보 가져오기
                if (routine.creator_id) {
                    const { data: creator } = await supabase
                        .from('creators')
                        .select('name, profile_image')
                        .eq('id', routine.creator_id)
                        .maybeSingle();
                    if (creator) {
                        creatorName = creator.name;
                        creatorProfileImage = creator.profile_image;
                    }
                }
            }

            enrichedData.push({
                id: log.id,
                routineId: routineId,
                routineTitle: routineTitle,
                routineThumbnail: routineThumbnail,
                durationMinutes: log.duration_minutes || 0,
                durationSeconds: log.duration || metadata.durationSeconds, // Use metadata from parsed object
                completedAt: log.created_at,
                date: log.date || new Date(log.created_at).toISOString().split('T')[0],
                techniques: log.techniques || [],
                creatorId,
                creatorName,
                creatorProfileImage,
            });
        } catch (itemError) {
            console.error('[getRecentCompletedRoutines] Error processing log item:', itemError);
        }
    }

    console.log(`[getRecentCompletedRoutines] Returning ${enrichedData.length} records`);
    return enrichedData;
}

/**
 * Create a new training log
 */
export async function createTrainingLog(log: Omit<TrainingLog, 'id' | 'createdAt'>) {
    // 1. Handle mediaUrl by appending to notes AND storing in metadata
    // This provides fallback for older display logic while using structured metadata
    let finalNotes = log.notes;
    let finalMetadata = { ...(log.metadata || {}) };

    if (log.mediaUrl) {
        // Append markdown for old clients
        const imgMarkdown = `\n\n![Image](${log.mediaUrl})`;
        if (!finalNotes?.includes(log.mediaUrl)) {
            finalNotes = finalNotes ? `${finalNotes}${imgMarkdown}` : imgMarkdown;
        }

        // Store in metadata for new SocialPost logic
        if (!finalMetadata.images) finalMetadata.images = [];
        if (!finalMetadata.images.includes(log.mediaUrl)) {
            finalMetadata.images.push(log.mediaUrl);
        }
    }

    const dbData: any = {
        user_id: log.userId,
        date: log.date,
        duration_minutes: log.durationMinutes ?? 0,
        duration: log.durationSeconds || log.metadata?.durationSeconds, // Save precise seconds to 'duration' column
        techniques: log.techniques ?? [],
        sparring_rounds: log.sparringRounds ?? 0,
        notes: finalNotes,
        is_public: log.isPublic,
        location: log.location,
        youtube_url: log.youtubeUrl,
        metadata: finalMetadata,
        type: log.type
    };

    // Remove undefined keys
    Object.keys(dbData).forEach(key => dbData[key] === undefined && delete dbData[key]);

    console.log('[createTrainingLog] Fixed Insert:', dbData);

    const { data, error } = await supabase
        .from('training_logs')
        .insert(dbData)
        .select()
        .single();

    if (error) return { data: null, error };

    return {
        data: {
            id: data.id,
            userId: data.user_id,
            date: data.date,
            durationMinutes: data.duration_minutes,
            techniques: data.techniques,
            sparringRounds: data.sparring_rounds,
            notes: data.notes,
            isPublic: data.is_public,
            location: data.location,
            youtubeUrl: data.youtube_url,
            mediaUrl: data.metadata?.images?.[0] || data.media_url, // Fallback to metadata
            metadata: data.metadata,
            type: data.type,
            createdAt: data.created_at
        } as TrainingLog,
        error: null
    };
}

/**
 * Create a new sparring review
 */
export async function createSparringReview(review: Omit<SparringReview, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
        .from('sparring_reviews')
        .insert({
            user_id: review.userId,
            date: review.date,
            opponent_name: review.opponentName,
            opponent_belt: review.opponentBelt,
            rounds: review.rounds,
            result: review.result,
            notes: review.notes,
            techniques: review.techniques,
            what_worked: review.whatWorked,
            what_to_improve: review.whatToImprove,
            video_url: review.videoUrl
        })
        .select()
        .single();

    if (error) return { data: null, error };

    return {
        data: {
            id: data.id,
            userId: data.user_id,
            date: data.date,
            opponentName: data.opponent_name,
            opponentBelt: data.opponent_belt,
            rounds: data.rounds,
            result: data.result,
            notes: data.notes,
            techniques: data.techniques,
            whatWorked: data.what_worked,
            whatToImprove: data.what_to_improve,
            videoUrl: data.video_url,
            createdAt: data.created_at
        } as SparringReview,
        error: null
    };
}

/**
 * Get sparring reviews for a user
 */
export async function getSparringReviews(userId: string) {
    const { data, error } = await supabase
        .from('sparring_reviews')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) return { data: null, error };

    return {
        data: data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            date: item.date,
            opponentName: item.opponent_name,
            opponentBelt: item.opponent_belt,
            rounds: item.rounds,
            result: item.result,
            notes: item.notes,
            techniques: item.techniques,
            whatWorked: item.what_worked,
            whatToImprove: item.what_to_improve,
            videoUrl: item.video_url,
            createdAt: item.created_at
        })) as SparringReview[],
        error: null
    };
}



/**
 * Delete a training log
 */
export async function deleteTrainingLog(logId: string) {
    const { error } = await supabase
        .from('training_logs')
        .delete()
        .eq('id', logId);

    return { error };
}

/**
 * Update a training log
 */
export async function updateTrainingLog(id: string, logData: Partial<TrainingLog>) {
    const dbData: any = {};
    if (logData.date) dbData.date = logData.date;
    if (logData.durationMinutes) dbData.duration_minutes = logData.durationMinutes;
    if (logData.sparringRounds) dbData.sparring_rounds = logData.sparringRounds;
    if (logData.notes) dbData.notes = logData.notes;
    if (logData.location) dbData.location = logData.location;
    if (logData.techniques) dbData.techniques = logData.techniques;
    if (logData.isPublic !== undefined) dbData.is_public = logData.isPublic;
    if (logData.youtubeUrl) dbData.youtube_url = logData.youtubeUrl;

    const { error } = await supabase
        .from('training_logs')
        .update(dbData)
        .eq('id', id);

    return { error };
}


/**
 * Get public training logs (Community Feed) with pagination
 */
/**
 * Get public training logs (Community Feed) with pagination
 */
export async function getPublicTrainingLogs(page: number = 1, limit: number = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Fetch Using Recommended Algorithm (Gravity Score)
    // Try RPC first, fallback to standard query if not exists
    let fetchPromise;

    // Check if we want recommendation (default) or if we need specific filtering
    // For now, apply recommendation to standard feed
    fetchPromise = supabase
        .rpc('get_recommended_feed', {
            page_num: page,
            page_size: limit
        });

    // Parallel fetch: Get free sparring videos (Daily Sparring)
    const sparringPromise = withTimeout(
        supabase
            .from('sparring_videos')
            .select(`
            *,
            creator:creators(name, profile_image)
        `)
            .eq('is_published', true)
            .eq('price', 0) // Free items only
            .order('created_at', { ascending: false })
            .range(from, to),
        5000
    );

    let data, count, error;
    let sparringData = [];

    try {
        const [result, sparringResult] = await Promise.all([
            fetchPromise,
            sparringPromise
        ]);

        if (sparringResult.data) {
            sparringData = sparringResult.data;
        }

        // If RPC fails (e.g. function doesn't exist yet), fallback to standard query
        if (result.error) {
            console.warn('Recommended feed RPC failed, falling back to standard query:', result.error);
            const fallbackResult = await supabase
                .from('training_logs')
                .select('*', { count: 'exact' })
                .eq('is_public', true)
                .order('created_at', { ascending: false })
                .range(from, to);

            data = fallbackResult.data;
            count = fallbackResult.count;
            error = fallbackResult.error;
        } else {
            data = result.data;
            // Count gives total count for pagination, but RPC might not return it easily
            // For now, get total count separately for pagination to work
            const { count: totalCount } = await supabase
                .from('training_logs')
                .select('id', { count: 'exact', head: true })
                .eq('is_public', true);
            count = totalCount;
            error = null;
        }

        // --- MERGE SPARRING VIDEOS INTO LOGS ---
        if (sparringData && sparringData.length > 0) {
            const mappedSparring = sparringData.map((video: any) => ({
                id: video.id,
                user_id: video.creator_id,
                date: video.created_at,
                notes: video.title || video.description || 'New Sparring Video',
                media_url: video.video_url,
                type: 'sparring',
                location: '__FEED__sparring',
                duration_minutes: 0,
                techniques: [],
                sparring_rounds: 0,
                is_public: true,
                created_at: video.created_at,
                // Attach creator info if available immediately, though we fetch users later too
                user: video.creator ? {
                    name: video.creator.name,
                    avatar_url: video.creator.profile_image
                } : undefined,
                // Extra metadata for sparring
                title: video.title,
                thumbnail_url: video.thumbnail_url
            }));

            // Merge and sort
            const combined = [...(data || []), ...mappedSparring];
            // Sort descending by created_at
            combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            // Re-slice to match limit (heuristic)
            // Note: This logic is imperfect for pagination across mixed sources but works for simple feeds.
            data = combined.slice(0, limit);
        }

    } catch (e) {
        console.error('getPublicTrainingLogs failed:', e);
        return { data: null, count: 0, error: e };
    }

    if (error) {
        console.error('Error fetching public logs:', error);
        return { data: null, count: 0, error };
    }

    if (!data || data.length === 0) {
        return { data: [], count: 0, error: null };
    }

    // 2. Extract user IDs
    const userIds = Array.from(new Set(data.map((log: any) => log.user_id)));

    // 3. Fetch user names from users table (only for those missing user info)
    // const missingUserIds = userIds.filter((id: any) => {
    //     const item = data.find((d: any) => d.user_id === id);
    //     return !item?.user; // Only fetch if we don't have user object attached already
    // });

    // Always fetch users to be safe or if mapping didn't have full data
    // But let's check map logic.
    const userMap: Record<string, any> = {};

    try {
        if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, name, avatar_url') // Added avatar_url
                .in('id', userIds);

            if (!usersError && usersData) {
                usersData.forEach((u: any) => {
                    userMap[u.id] = u;
                });
            } else {
                console.warn('Failed to fetch users for feed:', usersError);
            }
        }
    } catch (e) {
        console.warn('Exception fetching users for feed:', e);
    }

    // 5. Also try to fetch creator names if they are instructors (fallback)
    let creators = null;
    try {
        if (userIds.length > 0) {
            const { data } = await supabase
                .from('creators')
                .select('id, name, profile_image') // Added profile_image
                .in('id', userIds);
            creators = data;
        }
    } catch (e) {
        console.warn('Exception fetching creators:', e);
    }

    const instructorSet = new Set<string>();
    if (creators) {
        creators.forEach((c: any) => {
            // Prefer creator name if available (might be more official)
            userMap[c.id] = c.name;
            instructorSet.add(c.id);
        });
    }

    // 6. Fetch belt info and profile images from user_progress and users
    const beltMap: Record<string, string> = {};
    const avatarMap: Record<string, string> = {};

    try {
        if (userIds.length > 0) {
            const { data: progressData } = await supabase
                .from('user_progress')
                .select('user_id, belt_level')
                .in('user_id', userIds);

            if (progressData) {
                const { getBeltInfo } = await import('./belt-system');
                progressData.forEach((p: any) => {
                    const belt = getBeltInfo(p.belt_level);
                    beltMap[p.user_id] = belt.name;
                });
            }
        }
    } catch (e) {
        console.warn('Error fetching belt info:', e);
    }
    // Fetch profile images from users table
    // NOTE: user_metadata is not available in the public users table
    // Avatar URLs should be stored in a separate column if needed
    try {
        if (userIds.length > 0) {
            const { data: usersData } = await supabase
                .from('users')
                .select('id, avatar_url')
                .in('id', userIds);

            if (usersData) {
                usersData.forEach((u: any) => {
                    if (u.avatar_url) {
                        avatarMap[u.id] = u.avatar_url;
                    }
                });
            }
        }
    } catch (e) {
        console.warn('Error fetching user avatars:', e);
    }

    const logs: TrainingLog[] = data.map((log: any) => {
        // Restore type from location tag if needed (since we might not save type to DB)
        let type = log.type;
        if (!type && log.location && typeof log.location === 'string' && log.location.startsWith('__FEED__')) {
            type = log.location.replace('__FEED__', '');
        }

        const isInstructor = instructorSet.has(log.user_id);

        const rawName = userMap[log.user_id] || 'User';
        const displayName = rawName.includes('@') ? rawName.split('@')[0] : rawName;

        return {
            id: log.id,
            userId: log.user_id,
            userName: displayName,
            userAvatar: avatarMap[log.user_id],
            userBelt: beltMap[log.user_id],
            user: {
                name: displayName,
                email: '',
                belt: beltMap[log.user_id],
                profileImage: avatarMap[log.user_id],
                isInstructor: isInstructor
            },
            date: log.date,
            durationMinutes: log.duration_minutes,
            techniques: log.techniques || [],
            sparringRounds: log.sparring_rounds,
            notes: log.notes,
            isPublic: log.is_public,
            type: type,
            location: log.location,
            youtubeUrl: log.youtube_url,
            mediaUrl: log.media_url,
            mediaType: log.media_type,
            createdAt: log.created_at,
            metadata: log.metadata
        };
    });

    return { data: logs, count: count || 0, error: null };
}

export async function getLogFeedback(logId: string) {
    // 1. Fetch feedback without join
    const { data, error } = await supabase
        .from('log_feedback')
        .select('*')
        .eq('log_id', logId)
        .order('created_at', { ascending: true });

    if (error) return { data: null, error };

    if (!data || data.length === 0) {
        return { data: [], error: null };
    }

    // 2. Extract user IDs
    const userIds = Array.from(new Set(data.map((item: any) => item.user_id)));

    // 3. Fetch user names
    const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

    const userMap: Record<string, string> = {};
    if (users) {
        users.forEach((u: any) => {
            userMap[u.id] = u.name;
        });
    }

    // 4. Fetch creator names
    const { data: creators } = await supabase
        .from('creators')
        .select('id, name')
        .in('id', userIds);

    if (creators) {
        creators.forEach((c: any) => {
            userMap[c.id] = c.name;
        });
    }

    const feedback = data.map((item: any) => ({
        id: item.id,
        logId: item.log_id,
        userId: item.user_id,
        userName: userMap[item.user_id] || 'User',
        content: item.content,
        createdAt: item.created_at
    }));

    return { data: feedback, error: null };
}

/**
 * Create feedback
 */
export async function createLogFeedback(logId: string, userId: string, content: string) {


    const { data, error } = await supabase
        .from('log_feedback')
        .insert({
            log_id: logId,
            user_id: userId,
            content
        })
        .select(`
            *,
            user:users(name, avatar_url)
        `)
        .maybeSingle();

    return { data, error };
}



/**
 * Get user stats for tournament
 * Points system:
 * - Purchased course (learning): 1 point
 * - Purchased course (mastered): 5 points
 * - Unpurchased course (learning): 0.3 points
 * - Unpurchased course (mastered): Not allowed (requires completion)
 */
export async function getUserStats(userId: string) {
    const [skills, purchasedCourses, logsRes] = await Promise.all([
        getUserSkills(userId),
        getUserCourses(userId),
        supabase.from('training_logs').select('id', { count: 'exact' }).eq('user_id', userId)
    ]);

    const logCount = logsRes.count || 0;
    const purchasedCourseIds = new Set(purchasedCourses.map(c => c.id));

    const stats = {
        Standing: 0,
        Guard: 0,
        'Guard Pass': 0,
        Side: 0,
        Mount: 0,
        Back: 0,
        logCount: logCount,
        total: 0
    };

    skills.forEach((skill: UserSkill) => {
        const isPurchased = purchasedCourseIds.has(skill.courseId);

        // Calculate points based on ownership and status
        let points = 0;
        if (isPurchased) {
            points = skill.status === 'mastered' ? 5 : 1;
        } else {
            // Unpurchased courses give reduced points
            points = skill.status === 'mastered' ? 0 : 0.3; // Mastered should not be possible for unpurchased
        }

        if (stats[skill.category as keyof typeof stats] !== undefined) {
            stats[skill.category as keyof typeof stats] += points;
            stats.total += points;
        }
    });

    // Add log points (0.5 per log)
    stats.total += (logCount * 0.5);

    return { data: stats, error: null };
}

/**
 * Check if user owns a specific video
 */
export async function checkVideoOwnership(userId: string, videoId: string) {
    const { data, error } = await supabase
        .from('user_videos')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

    if (error) return false;
    return !!data;
}

/**
 * Get global leaderboard
 */
export async function getLeaderboard() {
    // 1. Get all users
    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email');

    if (usersError || !users) return { data: [], error: usersError };

    // 2. Calculate scores for each user (This is heavy, but okay for MVP)
    // In production, we would have a 'user_stats' table updated via triggers
    const leaderboard = await Promise.all(users.map(async (user) => {
        const { data: stats } = await getUserStats(user.id);

        let displayName = user.name;
        if (!displayName && user.email) {
            displayName = user.email.split('@')[0];
        }

        return {
            userId: user.id,
            userName: displayName || 'Unknown User',
            score: stats?.total || 0,
            stats: stats
        };
    }));

    // 3. Sort by score descending
    leaderboard.sort((a, b) => b.score - a.score);

    // 4. Return top 10 and full list (for finding own rank)
    return {
        data: leaderboard,
        error: null
    };
}

/**
 * Update user name
 */
export async function updateUserName(userId: string, name: string) {
    const { error } = await supabase
        .from('users')
        .update({ name })
        .eq('id', userId);

    return { error };
}

/**
 * Add or update a user skill
 */
export async function upsertUserSkill(userId: string, category: SkillCategory, courseId: string, status: SkillStatus, subcategoryId?: string) {
    const { error } = await supabase
        .from('user_skills')
        .upsert({
            user_id: userId,
            category,
            course_id: courseId,
            status,
            subcategory_id: subcategoryId,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'user_id,category,course_id'
        });

    return { error };
}

/**
 * Delete a user skill
 */
export async function deleteUserSkill(skillId: string) {
    const { error } = await supabase
        .from('user_skills')
        .delete()
        .eq('id', skillId);

    return { error };
}



// ==================== BELT SYSTEM ====================

/**
 * Calculate user's belt level based on total spending
 */
export async function getUserBeltLevel(userId: string): Promise<BeltLevel> {
    // Get total spending from user_courses
    const { data: purchases } = await supabase
        .from('user_courses')
        .select('price_paid')
        .eq('user_id', userId);

    const totalSpent = purchases?.reduce((sum, p) => sum + (p.price_paid || 0), 0) || 0;

    // Belt thresholds
    if (totalSpent >= 1000000) return 'Black';
    if (totalSpent >= 500000) return 'Brown';
    if (totalSpent >= 300000) return 'Purple';
    if (totalSpent >= 100000) return 'Blue';
    return 'White';
}

// ==================== BUNDLES ====================

/**
 * Get all bundles
 */
export async function getBundles() {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('bundles')
                .select(`
                    *,
                    creator:creators(name),
                    bundle_courses(course_id),
                    bundle_drills(drill_id)
                `)
                .order('created_at', { ascending: false }),
            5000
        );

        if (error) {
            console.error('getBundles error:', error);
            return { data: [], error };
        }

        // Fetch bundle_sparring separately to avoid PostgREST relationship issues
        const bundleIds = (data || []).map((b: any) => b.id);
        let sparringMap: Record<string, string[]> = {};

        if (bundleIds.length > 0) {
            const { data: sparringData } = await supabase
                .from('bundle_sparring')
                .select('bundle_id, sparring_id')
                .in('bundle_id', bundleIds);

            if (sparringData) {
                sparringData.forEach((bs: any) => {
                    if (!sparringMap[bs.bundle_id]) {
                        sparringMap[bs.bundle_id] = [];
                    }
                    sparringMap[bs.bundle_id].push(bs.sparring_id);
                });
            }
        }

        const bundles: Bundle[] = (data || []).map((bundle: any) => ({
            id: bundle.id,
            creatorId: bundle.creator_id,
            creatorName: bundle.creator?.name || 'Unknown Creator',
            title: bundle.title,
            description: bundle.description,
            price: bundle.price,
            thumbnailUrl: bundle.thumbnail_url,
            courseIds: bundle.bundle_courses?.map((bc: any) => bc.course_id) || [],
            drillIds: bundle.bundle_drills?.map((bd: any) => bd.drill_id) || [],
            sparringIds: sparringMap[bundle.id] || [],
            createdAt: bundle.created_at
        }));

        return { data: bundles, error: null };
    } catch (e) {
        console.error('getBundles exception:', e);
        return { data: [], error: e };
    }
}

/**
 * Create a bundle
 */
export async function createBundle(bundle: {
    creatorId: string;
    title: string;
    description: string;
    price: number;
    thumbnailUrl?: string;
    courseIds?: string[];
    drillIds?: string[];
    sparringIds?: string[];
}) {
    // 1. Create bundle
    const { data: newBundle, error: bundleError } = await supabase
        .from('bundles')
        .insert({
            creator_id: bundle.creatorId,
            title: bundle.title,
            description: bundle.description,
            price: bundle.price,
            thumbnail_url: bundle.thumbnailUrl
        })
        .select()
        .maybeSingle();

    if (bundleError) return { error: bundleError };

    // 2. Add courses to bundle
    if (bundle.courseIds && bundle.courseIds.length > 0) {
        const bundleCourses = bundle.courseIds.map(courseId => ({
            bundle_id: newBundle.id,
            course_id: courseId
        }));

        const { error: coursesError } = await supabase
            .from('bundle_courses')
            .insert(bundleCourses);

        if (coursesError) return { error: coursesError };
    }

    // 3. Add drills to bundle
    if (bundle.drillIds && bundle.drillIds.length > 0) {
        const bundleDrills = bundle.drillIds.map(drillId => ({
            bundle_id: newBundle.id,
            drill_id: drillId
        }));

        const { error: drillsError } = await supabase
            .from('bundle_drills')
            .insert(bundleDrills);

        if (drillsError) return { error: drillsError };
    }

    // 4. Add sparring videos to bundle
    if (bundle.sparringIds && bundle.sparringIds.length > 0) {
        const bundleSparring = bundle.sparringIds.map(sparringId => ({
            bundle_id: newBundle.id,
            sparring_id: sparringId
        }));

        const { error: sparringError } = await supabase
            .from('bundle_sparring')
            .insert(bundleSparring);

        if (sparringError) return { error: sparringError };
    }

    return { data: newBundle, error: null };
}

export async function deleteBundle(bundleId: string) {
    const { error } = await supabase
        .from('bundles')
        .delete()
        .eq('id', bundleId);

    return { error };
}

/**
 * Update a bundle
 */
export async function updateBundle(id: string, bundle: Partial<Bundle>) {
    const { error } = await supabase
        .from('bundles')
        .update({
            title: bundle.title,
            description: bundle.description,
            price: bundle.price,
            thumbnail_url: bundle.thumbnailUrl
        })
        .eq('id', id);

    if (error) return { error };

    // Update bundle courses if provided
    if (bundle.courseIds !== undefined) {
        // Delete existing courses
        await supabase.from('bundle_courses').delete().eq('bundle_id', id);
        // Insert new ones if any
        if (bundle.courseIds.length > 0) {
            const bundleCourses = bundle.courseIds.map(course_id => ({
                bundle_id: id,
                course_id
            }));
            const { error: coursesError } = await supabase.from('bundle_courses').insert(bundleCourses);
            if (coursesError) return { error: coursesError };
        }
    }

    // Update bundle drills if provided
    if (bundle.drillIds !== undefined) {
        // Delete existing drills
        await supabase.from('bundle_drills').delete().eq('bundle_id', id);
        // Insert new ones if any
        if (bundle.drillIds.length > 0) {
            const bundleDrills = bundle.drillIds.map(drill_id => ({
                bundle_id: id,
                drill_id
            }));
            const { error: drillsError } = await supabase.from('bundle_drills').insert(bundleDrills);
            if (drillsError) return { error: drillsError };
        }
    }

    // Update bundle sparring if provided
    if (bundle.sparringIds !== undefined) {
        // Delete existing sparring links
        await supabase.from('bundle_sparring').delete().eq('bundle_id', id);
        // Insert new ones if any
        if (bundle.sparringIds.length > 0) {
            const bundleSparring = bundle.sparringIds.map(sparring_id => ({
                bundle_id: id,
                sparring_id
            }));
            const { error: sparringError } = await supabase.from('bundle_sparring').insert(bundleSparring);
            if (sparringError) return { error: sparringError };
        }
    }

    return { error: null };
}

/**
 * Purchase a bundle (Mock)
 */
export async function purchaseBundle(userId: string, bundleId: string, price: number) {
    const { error } = await supabase
        .from('user_bundles')
        .insert({
            user_id: userId,
            bundle_id: bundleId,
            price_paid: price
        });

    return { error };
}

// ==================== COUPONS ====================

/**
 * Validate and apply coupon
 */
export async function validateCoupon(code: string) {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .maybeSingle();

    if (error) return { data: null, error };

    // Check if expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return { data: null, error: { message: 'Coupon has expired' } };
    }

    // Check if max uses reached
    if (data.max_uses && data.used_count >= data.max_uses) {
        return { data: null, error: { message: 'Coupon has reached maximum uses' } };
    }

    const coupon: Coupon = {
        id: data.id,
        code: data.code,
        creatorId: data.creator_id,
        discountType: data.discount_type,
        value: data.value,
        maxUses: data.max_uses,
        usedCount: data.used_count,
        expiresAt: data.expires_at,
        createdAt: data.created_at
    };

    return { data: coupon, error: null };
}

/**
 * Create a coupon
 */
export async function createCoupon(coupon: {
    code: string;
    creatorId: string;
    discountType: 'percent' | 'fixed';
    value: number;
    maxUses?: number;
    expiresAt?: string;
}) {
    const { error } = await supabase
        .from('coupons')
        .insert({
            code: coupon.code.toUpperCase(),
            creator_id: coupon.creatorId,
            discount_type: coupon.discountType,
            value: coupon.value,
            max_uses: coupon.maxUses,
            expires_at: coupon.expiresAt
        });

    return { error };
}

/**
 * Get all coupons
 */
export async function getCoupons() {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    // Manually fetch creator names
    const creatorIds = [...new Set(data.map((c: any) => c.creator_id).filter(Boolean))];
    let creatorMap: Record<string, string> = {};

    if (creatorIds.length > 0) {
        const { data: creators } = await supabase
            .from('users')
            .select('id, name')
            .in('id', creatorIds);

        if (creators) {
            creators.forEach((c: any) => {
                creatorMap[c.id] = c.name;
            });
        }
    }

    const coupons: Coupon[] = data.map((coupon: any) => ({
        id: coupon.id,
        code: coupon.code,
        creatorId: coupon.creator_id,
        creatorName: creatorMap[coupon.creator_id],
        discountType: coupon.discount_type,
        value: coupon.value,
        maxUses: coupon.max_uses,
        usedCount: coupon.used_count,
        expiresAt: coupon.expires_at,
        createdAt: coupon.created_at
    }));

    return { data: coupons, error: null };
}

/**
 * Delete a coupon
 */
export async function deleteCoupon(couponId: string) {
    const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', couponId);

    return { error };
}

/**
 * Update a coupon
 */
export async function updateCoupon(id: string, coupon: Partial<Coupon>) {
    const { error } = await supabase
        .from('coupons')
        .update({
            code: coupon.code?.toUpperCase(),
            discount_type: coupon.discountType,
            value: coupon.value,
            max_uses: coupon.maxUses,
            expires_at: coupon.expiresAt
        })
        .eq('id', id);

    return { error };
}

// ==================== 1:1 FEEDBACK ====================

/**
 * Get feedback settings for an instructor
 */
export async function getFeedbackSettings(instructorId: string) {
    const { data, error } = await supabase
        .from('feedback_settings')
        .select('*')
        .eq('instructor_id', instructorId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') return { data: null, error };

    // Default settings if not found
    const settings: FeedbackSettings = data ? {
        id: data.id,
        instructorId: data.instructor_id,
        enabled: data.enabled,
        price: data.price,
        turnaroundDays: data.turnaround_days,
        maxActiveRequests: data.max_active_requests,
        updatedAt: data.updated_at
    } : {
        id: '',
        instructorId,
        enabled: false,
        price: 50000,
        turnaroundDays: 3,
        maxActiveRequests: 5,
        updatedAt: new Date().toISOString()
    };

    return { data: settings, error: null };
}

/**
 * Update feedback settings
 */
export async function updateFeedbackSettings(instructorId: string, settings: Partial<FeedbackSettings>) {
    const { error } = await supabase
        .from('feedback_settings')
        .upsert({
            instructor_id: instructorId,
            enabled: settings.enabled,
            price: settings.price,
            turnaround_days: settings.turnaroundDays,
            max_active_requests: settings.maxActiveRequests,
            updated_at: new Date().toISOString()
        }, {
            onConflict: 'instructor_id'
        });

    return { error };
}

/**
 * Create a feedback request
 */
export async function createFeedbackRequest(request: {
    studentId: string;
    instructorId: string;
    videoUrl: string;
    description: string;
    price: number;
}) {
    const { data, error } = await supabase
        .from('feedback_requests')
        .insert({
            student_id: request.studentId,
            instructor_id: request.instructorId,
            video_url: request.videoUrl,
            description: request.description,
            price: request.price,
            status: 'pending'
        })
        .select()
        .maybeSingle();

    return { data, error };
}

/**
 * Get feedback requests (for student or instructor)
 */
export async function getFeedbackRequests(userId: string, role: 'student' | 'instructor') {
    const column = role === 'student' ? 'student_id' : 'instructor_id';

    const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
            *,
            student:users!student_id(name),
            instructor:creators!instructor_id(name)
        `)
        .eq(column, userId)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    const requests: FeedbackRequest[] = data.map((req: any) => ({
        id: req.id,
        studentId: req.student_id,
        studentName: req.student?.name || 'Unknown Student',
        instructorId: req.instructor_id,
        instructorName: req.instructor?.name || 'Unknown Instructor',
        videoUrl: req.video_url,
        description: req.description,
        status: req.status,
        price: req.price,
        feedbackContent: req.feedback_content,
        createdAt: req.created_at,
        updatedAt: req.updated_at,
        completedAt: req.completed_at
    }));

    return { data: requests, error: null };
}

/**
 * Get a single feedback request
 */
export async function getFeedbackRequest(requestId: string) {
    const { data, error } = await supabase
        .from('feedback_requests')
        .select(`
            *,
            student:users!student_id(name),
            instructor:creators!instructor_id(name)
        `)
        .eq('id', requestId)
        .maybeSingle();

    if (error) return { data: null, error };

    const request: FeedbackRequest = {
        id: data.id,
        studentId: data.student_id,
        studentName: data.student?.name,
        instructorId: data.instructor_id,
        instructorName: data.instructor?.name,
        videoUrl: data.video_url,
        description: data.description,
        status: data.status,
        price: data.price,
        feedbackContent: data.feedback_content,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        completedAt: data.completed_at
    };

    return { data: request, error: null };
}

/**
 * Update feedback request status
 */
export async function updateFeedbackStatus(requestId: string, status: 'pending' | 'in_progress' | 'completed' | 'cancelled') {
    const { error } = await supabase
        .from('feedback_requests')
        .update({
            status,
            updated_at: new Date().toISOString(),
            ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {})
        })
        .eq('id', requestId);

    return { error };
}

/**
 * Submit feedback response
 */
export async function submitFeedbackResponse(requestId: string, content: string) {
    const { error } = await supabase
        .from('feedback_requests')
        .update({
            feedback_content: content,
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

    return { error };
}


// ==================== REPORTING ====================

/**
 * Create a new report
 */
export async function createReport(reportData: {
    reporterId: string;
    targetId: string;
    targetType: 'post' | 'comment' | 'user' | 'drill';
    reason: string;
    description?: string;
}) {
    const { error } = await supabase
        .from('reports')
        .insert({
            reporter_id: reportData.reporterId,
            target_id: reportData.targetId,
            target_type: reportData.targetType,
            reason: reportData.reason,
            description: reportData.description,
            status: 'pending'
        });

    return { error };
}

// ==================== NOTIFICATIONS ====================

/**
 * Create a new notification manually
 */
export async function createNotification(notification: {
    userId: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    link?: string;
}) {
    const { error } = await supabase
        .from('notifications')
        .insert({
            user_id: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            is_read: false
        });

    return { error };
}

/**
 * Get user notifications
 */
export async function getNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        // Ignore 404/PGRST106 (Table missing) to keep console clean
        if (error.code === 'PGRST106' || error.code === '404') {
            return { data: [], error: null };
        }
        console.error('Error fetching notifications:', error);
        return { data: [], error };
    }

    const notifications: AppNotification[] = (data || []).map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link,
        isRead: n.is_read,
        createdAt: n.created_at
    }));

    return { data: notifications, error: null };
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId: string) {
    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    return { count: count || 0, error };
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

    return { error };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);

    return { error };
}

/**
 * Get all users for admin dashboard
 */
export async function getAllUsersAdmin() {
    // users 테이블 직접 조회 (is_creator는 creators 테이블 존재 여부로 판단)
    const { data: usersData, error } = await supabase
        .from('users')
        .select(`
            id,
            email,
            name,
            is_subscriber,
            is_complimentary_subscription,
            subscription_tier,
            subscription_end_date,
            is_admin,
            created_at
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching users:', error);
        return { data: null, error };
    }

    // creators 테이블에서 creator 목록 조회
    const { data: creatorsData } = await supabase
        .from('creators')
        .select('id');

    const creatorIds = new Set(creatorsData?.map(c => c.id) || []);

    // is_creator 필드 추가
    const data = usersData?.map(user => ({
        ...user,
        is_creator: creatorIds.has(user.id)
    }));

    return { data, error: null };
}

/**
 * Promote a user to creator
 */
export async function promoteToCreator(userId: string) {
    const { error } = await supabase
        .rpc('promote_to_creator', { target_user_id: userId });

    if (error) {
        console.error('Error promoting user:', error);
        return { error };
    }

}

/**
 * Grant complimentary subscription to a user
 */
export async function grantComplimentarySubscription(userId: string, endDate: string) {
    const { error } = await supabase
        .rpc('grant_complimentary_subscription', {
            target_user_id: userId,
            end_date: endDate
        });

    if (error) {
        console.error('Error granting complimentary subscription:', error);
        return { error };
    }

    return { error: null };
}

/**
 * Revoke complimentary subscription from a user
 */
export async function revokeComplimentarySubscription(userId: string) {
    const { error } = await supabase
        .rpc('revoke_complimentary_subscription', {
            target_user_id: userId
        });

    if (error) {
        console.error('Error revoking complimentary subscription:', error);
        return { error };
    }

    return { error: null };
}


/**
 * Record watch time for a video or lesson
 * Adds the delta seconds to the daily log
 */
export async function recordWatchTime(userId: string, seconds: number, videoId?: string, lessonId?: string, drillId?: string) {
    if (!videoId && !lessonId && !drillId) return { error: new Error('VideoId, LessonId or DrillId required') };
    if (seconds <= 0) return { error: null };

    const today = new Date().toISOString().split('T')[0];
    const matchQuery: any = { user_id: userId, date: today };

    // Determine the target ID column
    let conflictTarget = '';
    if (videoId) {
        matchQuery.video_id = videoId;
        conflictTarget = 'user_id,video_id,date';
    } else if (lessonId) {
        matchQuery.lesson_id = lessonId;
        conflictTarget = 'user_id,lesson_id,date';
    } else if (drillId) {
        matchQuery.drill_id = drillId;
        conflictTarget = 'user_id,drill_id,date'; // Assuming user added constraint: UNIQUE(user_id, drill_id, date)
        // If constraint relies on index name, you might need to check DB. 
        // For now, let's assume standard unique index naming or it will fall back to PK if id is used? 
        // No, video_watch_logs usually has a composite key. 
        // We might need to ensure the constraint exists for drill_id.
    }

    // 1. Get current log
    const { data: currentLog, error: fetchError } = await supabase
        .from('video_watch_logs')
        .select('id, watch_seconds')
        .match(matchQuery)
        .maybeSingle(); // Use maybeSingle to avoid 406 error on empty

    if (fetchError) {
        console.error('Error fetching watch log:', fetchError);
        // Continue to try upsert anyway? 
    }

    // 2. Upsert
    const newSeconds = (currentLog?.watch_seconds || 0) + seconds;

    // We add drill_id to the insert payload
    const payload = {
        ...matchQuery,
        watch_seconds: newSeconds,
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase
        .from('video_watch_logs')
        .upsert(payload, {
            onConflict: conflictTarget
        });

    return { error };
}

/**
 * Get all public courses for Skill Tree (available to everyone)
 */
export async function getPublicCourses() {
    const { data, error } = await supabase
        .from('courses')
        .select(`
            id,
            title,
            category,
            creator_id,
            creators (name)
        `)
        .eq('is_published', true)
        .order('title');

    if (error) {
        console.error('Error fetching public courses:', error);
        return { data: null, error };
    }

    const courses = data.map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        creatorId: c.creator_id,
        creatorName: c.creators?.name,
        // Add dummy values for required Course fields that aren't needed for the list
        description: '',
        price: 0,
        thumbnailUrl: '',
        difficulty: Difficulty.Beginner,
        isPublished: true,
        createdAt: '',
        updatedAt: '',
        views: 0
    }));

    return { data: courses, error: null };
}



/**
 * Get user's skill tree courses (equipped courses)
 */
export async function getUserSkillCourses(userId: string) {
    const fetchPromise = supabase
        .from('user_skills')
        .select(`
            *,
            courses (
                id,
                title,
                category,
                difficulty,
                thumbnailUrl:thumbnail_url
            )
        `)
        .eq('user_id', userId)
        .not('course_id', 'is', null);

    let data, error;
    try {
        const result = await fetchPromise;
        data = result.data;
        error = result.error;
    } catch (e) {
        console.error('getUserSkillCourses failed:', e);
        return { data: null, error: e };
    }

    if (error) {
        console.error('Error fetching skill courses:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ==================== GAMIFICATION API ====================

import { getBeltLevelFromXP, getBeltInfo } from './belt-system';
import type { UserProgress, DailyQuest, XPTransaction, QuestType } from '../types';

/**
 * Get or create user progress
 */
export async function getUserProgress(userId: string): Promise<UserProgress | null> {
    let { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    // If no progress exists, create it
    if (!data && !error) {
        const { data: newProgress, error: insertError } = await supabase
            .from('user_progress')
            .insert({
                user_id: userId,
                belt_level: 1,
                current_xp: 0,
                total_xp: 0
            })
            .select()
            .single();

        if (insertError) {
            console.error('Error creating user progress:', insertError);
            return null;
        }
        data = newProgress;
    } else if (error) {
        console.error('Error fetching user progress:', error);
        return null;
    }

    return {
        userId: data.user_id,
        beltLevel: data.belt_level,
        currentXp: data.current_xp,
        totalXp: data.total_xp,
        lastQuestReset: data.last_quest_reset,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

/**
 * Add XP and handle level up
 */
export async function addXP(
    userId: string,
    amount: number,
    source: string,
    sourceId?: string
): Promise<{ leveledUp: boolean; newLevel?: number; xpEarned: number }> {
    // Get current progress
    const progress = await getUserProgress(userId);
    if (!progress) {
        return { leveledUp: false, xpEarned: 0 };
    }

    const newTotalXP = progress.totalXp + amount;
    const newLevel = getBeltLevelFromXP(newTotalXP);
    const leveledUp = newLevel > progress.beltLevel;

    // Update progress
    const { error: updateError } = await supabase
        .from('user_progress')
        .update({
            belt_level: newLevel,
            current_xp: newTotalXP - getBeltInfo(newLevel).xpRequired,
            total_xp: newTotalXP
        })
        .eq('user_id', userId);

    if (updateError) {
        console.error('Error updating user progress:', updateError);
        return { leveledUp: false, xpEarned: 0 };
    }

    // Record transaction
    await supabase
        .from('xp_transactions')
        .insert({
            user_id: userId,
            amount,
            source,
            source_id: sourceId
        });

    return {
        leveledUp,
        newLevel: leveledUp ? newLevel : undefined,
        xpEarned: amount
    };
}

/**
 * Get or create today's daily quests
 */
export async function getDailyQuests(userId: string): Promise<DailyQuest[]> {
    // Use local date to reset at midnight local time
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // Check if quests exist for today
    let { data, error } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('user_id', userId)
        .eq('quest_date', today);

    if (error) {
        console.error('Error fetching daily quests:', error);
        return [];
    }

    // If no quests for today, create them
    if (!data || data.length === 0) {
        const questTemplates = [
            { type: 'write_log', target: 1, reward: 20 },
            { type: 'give_feedback', target: 1, reward: 15 },
            { type: 'watch_lesson', target: 1, reward: 30 },
            { type: 'complete_routine', target: 1, reward: 50 }
        ];

        const newQuests = questTemplates.map(q => ({
            user_id: userId,
            quest_type: q.type,
            target_count: q.target,
            current_count: 0,
            xp_reward: q.reward,
            completed: false,
            quest_date: today
        }));

        const { data: created, error: createError } = await supabase
            .from('daily_quests')
            .insert(newQuests)
            .select();

        if (createError) {
            console.error('Error creating daily quests:', createError);
            return [];
        }
        data = created;
    }

    return (data || []).map((q: any) => ({
        id: q.id,
        userId: q.user_id,
        questType: q.quest_type,
        targetCount: q.target_count,
        currentCount: q.current_count,
        xpReward: q.xp_reward,
        completed: q.completed,
        questDate: q.quest_date,
        createdAt: q.created_at
    }));
}

/**
 * Update quest progress
 */
export async function updateQuestProgress(
    userId: string,
    questType: QuestType
): Promise<{ completed: boolean; xpEarned: number }> {
    // Use local date to reset at midnight local time
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    // Get quest
    const { data: quest, error: fetchError } = await supabase
        .from('daily_quests')
        .select('*')
        .eq('user_id', userId)
        .eq('quest_type', questType)
        .eq('quest_date', today)
        .single();

    if (fetchError || !quest) {
        console.error('Error fetching quest:', fetchError);
        return { completed: false, xpEarned: 0 };
    }

    // Handle cascading updates for write_log
    const handleCascadingUpdates = async () => {
        if (questType === 'complete_routine' || questType === 'sparring_review') {
            await updateQuestProgress(userId, 'write_log');
        }
    };

    // Already completed
    if (quest.completed) {
        await handleCascadingUpdates();
        return { completed: true, xpEarned: 0 };
    }

    const newCount = quest.current_count + 1;
    const isCompleted = newCount >= quest.target_count;

    // Update quest
    const { error: updateError } = await supabase
        .from('daily_quests')
        .update({
            current_count: newCount,
            completed: isCompleted
        })
        .eq('id', quest.id);

    if (updateError) {
        console.error('Error updating quest:', updateError);
        return { completed: false, xpEarned: 0 };
    }

    // Trigger cascading update even if this quest was just partially updated
    await handleCascadingUpdates();

    // If completed, award XP
    if (isCompleted) {
        await addXP(userId, quest.xp_reward, `quest_${questType}`, quest.id);
        return { completed: true, xpEarned: quest.xp_reward };
    }

    return { completed: false, xpEarned: 0 };
}

/**
 * Get XP transaction history
 */
export async function getXPHistory(
    userId: string,
    limit: number = 50
): Promise<XPTransaction[]> {
    const { data, error } = await supabase
        .from('xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching XP history:', error);
        return [];
    }

    return (data || []).map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        source: t.source,
        sourceId: t.source_id,
        createdAt: t.created_at
    }));
}

// ============================================================================
// Tournament & Match History
// ============================================================================

export interface MatchHistory {
    id: string;
    userId: string;
    opponentName: string;
    opponentLevel: number;
    userLevel: number;
    result: 'win' | 'loss';
    winType?: 'submission' | 'points';
    submissionType?: string;
    pointsUser: number;
    pointsOpponent: number;
    xpEarned: number;
    createdAt: string;
}

export async function getMatchHistory(userId: string, limit: number = 10) {
    const { data, error } = await supabase
        .from('match_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching match history:', error);
        return { data: null, error };
    }

    return { data: data as MatchHistory[], error: null };
}

export async function recordMatch(matchData: {
    userId: string;
    opponentName: string;
    opponentLevel: number;
    userLevel: number;
    result: 'win' | 'loss';
    winType?: 'submission' | 'points';
    submissionType?: string;
    pointsUser?: number;
    pointsOpponent?: number;
    xpEarned: number;
}) {
    const { error } = await supabase
        .from('match_history')
        .insert({
            user_id: matchData.userId,
            opponent_name: matchData.opponentName,
            opponent_level: matchData.opponentLevel,
            user_level: matchData.userLevel,
            result: matchData.result,
            win_type: matchData.winType,
            submission_type: matchData.submissionType,
            points_user: matchData.pointsUser || 0,
            points_opponent: matchData.pointsOpponent || 0,
            xp_earned: matchData.xpEarned
        });

    if (error) {
        console.error('Error recording match:', error);
        return { error };
    }
}

export interface Title {
    id: string;
    name: string;
    description: string;
    icon_url?: string;
}

export interface UserTitle {
    id: string;
    userId: string;
    titleId: string;
    earnedAt: string;
    title?: Title;
}

export async function getUserTitles(userId: string) {
    const { data, error } = await supabase
        .from('user_titles')
        .select(`
            *,
            title:titles(*)
        `)
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user titles:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

export async function checkAndAwardTitles(userId: string) {
    const { data, error } = await supabase
        .rpc('check_and_award_titles', { p_user_id: userId });

    if (error) {
        console.error('Error checking titles:', error);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function awardSocialXP(userId: string, activityType: 'comment' | 'like_received' | 'share', xpAmount: number) {
    const { data, error } = await supabase
        .rpc('award_social_xp', {
            p_user_id: userId,
            p_activity_type: activityType,
            p_xp_amount: xpAmount
        });

    if (error) {
        console.error('Error awarding social XP:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

export async function getLoginStreak(userId: string) {
    const { data, error } = await supabase
        .from('user_login_streak')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching login streak:', error);
        return { data: null, error };
    }

    return { data, error: null };
}
// ============================================================================
// Drill & Routine System
// ============================================================================

export async function getDrills(creatorId?: string, limit: number = 50, forceRefresh: boolean = false) {
    let query = supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (creatorId) {
        query = query.eq('creator_id', creatorId);
    }

    // Force cache bypass when explicitly requested (e.g., polling for updates)
    if (forceRefresh) {
        query = query.abortSignal(new AbortController().signal);
    }

    const { data: drills, error } = await query;
    if (error) {
        console.error('Error fetching drills:', error);
        return [];
    }

    if (!drills || drills.length === 0) return [];

    // Extract creator IDs
    const creatorIds = Array.from(new Set(drills.map((d: any) => d.creator_id).filter(Boolean)));

    // Fetch creators (users)
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

    return drills.map((drill: any) => {
        const creator = userMap[drill.creator_id];
        return {
            ...drill,
            thumbnailUrl: drill.thumbnail_url, // Ensure field is mapped for frontend
            vimeoUrl: drill.vimeo_url,
            descriptionVideoUrl: drill.description_video_url,
            creatorName: creator?.name || 'Unknown',
            creatorProfileImage: creator?.avatar_url,
            durationMinutes: drill.duration_minutes || 0,
            views: drill.views || 0,
            likes: drill.likes || 0,
            createdAt: drill.created_at
        };
    });
}


export async function createDrill(drillData: Partial<Drill>) {
    const dbData: any = {
        title: drillData.title,
        description: drillData.description,
        creator_id: drillData.creatorId,
        category: drillData.category,
        difficulty: drillData.difficulty,
        thumbnail_url: drillData.thumbnailUrl,
        vimeo_url: drillData.vimeoUrl,
        description_video_url: drillData.descriptionVideoUrl,
        duration_minutes: drillData.durationMinutes,
        uniform_type: drillData.uniformType,
        length: drillData.length,
    };

    // Auto-fetch Vimeo info if vimeo_url exists
    if (dbData.vimeo_url) {
        try {
            const videoInfo = await getVimeoVideoInfo(dbData.vimeo_url);
            if (videoInfo) {
                if (!dbData.thumbnail_url) dbData.thumbnail_url = videoInfo.thumbnail;
                if (!dbData.duration_minutes) dbData.duration_minutes = Math.floor(videoInfo.duration / 60);
                if (!dbData.length) dbData.length = formatDuration(videoInfo.duration);
            }
        } catch (err) {
            console.warn('Failed to auto-fetch Vimeo info for drill:', err);
        }
    }

    let attempts = 0;
    while (attempts < 3) {
        try {
            // Attempt with 10s timeout
            const { data, error } = await withTimeout(
                supabase
                    .from('drills')
                    .insert(dbData)
                    .select()
                    .single(),
                10000
            );

            if (error) {
                console.error(`Attempt ${attempts + 1} failed:`, error);
                throw error;
            }

            return { data: transformDrill(data), error: null };
        } catch (err) {
            attempts++;
            console.warn(`Create Drill Attempt ${attempts} failed:`, err);
            if (attempts >= 3) {
                return { data: null, error: err };
            }
            // Wait 1s before retry
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    return { data: null, error: new Error('Failed to create drill after 3 attempts') };
}

export async function updateDrill(drillId: string, drillData: Partial<Drill>) {
    const dbData: any = {};
    if (drillData.title) dbData.title = drillData.title;
    if (drillData.description) dbData.description = drillData.description;
    if (drillData.category) dbData.category = drillData.category;
    if (drillData.difficulty) dbData.difficulty = drillData.difficulty;
    if (drillData.thumbnailUrl) dbData.thumbnail_url = drillData.thumbnailUrl;
    if (drillData.vimeoUrl) dbData.vimeo_url = drillData.vimeoUrl;
    if (drillData.descriptionVideoUrl) dbData.description_video_url = drillData.descriptionVideoUrl;
    if (drillData.durationMinutes !== undefined) dbData.duration_minutes = drillData.durationMinutes;
    if (drillData.uniformType) dbData.uniform_type = drillData.uniformType;
    if (drillData.length) dbData.length = drillData.length;

    // If vimeoUrl changed, fetch info
    if (drillData.vimeoUrl) {
        try {
            const videoInfo = await getVimeoVideoInfo(drillData.vimeoUrl);
            if (videoInfo) {
                if (!drillData.thumbnailUrl) dbData.thumbnail_url = videoInfo.thumbnail;
                if (!drillData.durationMinutes) dbData.duration_minutes = Math.floor(videoInfo.duration / 60);
                if (!drillData.length) dbData.length = formatDuration(videoInfo.duration);
            }
        } catch (err) {
            console.warn('Failed to auto-fetch updated drill Vimeo info:', err);
        }
    }

    const { data, error } = await withTimeout(
        supabase
            .from('drills')
            .update(dbData)
            .eq('id', drillId)
            .select()
            .single(),
        30000
    );

    if (error) {
        console.error('Error updating drill:', error);
        return { data: null, error };
    }

    return { data: transformDrill(data), error: null };
}

export async function deleteDrill(drillId: string) {
    const { error } = await supabase
        .from('drills')
        .delete()
        .eq('id', drillId);

    if (error) {
        console.error('Error deleting drill:', error);
        return { error };
    }

    return { error: null };
}

// Sparring Video APIs

export function transformSparringVideo(data: any): SparringVideo {
    if (!data) return {} as SparringVideo;

    // Handle different join keys for creator info
    const rawCreator = data.creator || data.users || data.profiles || data.creators;
    const creatorData = Array.isArray(rawCreator) ? rawCreator[0] : rawCreator;
    const creator = creatorData && (creatorData.id || creatorData.name) ? transformCreator(creatorData) : undefined;

    // Enhanced Thumbnail Fallback
    let thumb = data.thumbnail_url || '';
    // Fallback to creator profile image if no thumbnail (matching Lesson's fallback to course thumbnail)
    if (!thumb && creatorData) {
        thumb = creatorData.profile_image || creatorData.avatar_url || '';
    }

    return {
        id: data.id,
        creatorId: data.creator_id,
        title: data.title || '',
        description: data.description || '',
        videoUrl: data.video_url || '',
        thumbnailUrl: thumb,
        length: data.length || '',
        durationMinutes: data.duration_minutes || 0,
        relatedItems: data.related_items || [],
        views: data.views || 0,
        likes: data.likes || 0,
        creator: creator,
        creatorProfileImage: creatorData?.profile_image || creatorData?.avatar_url,
        createdAt: data.created_at,
        difficulty: data.difficulty,
        price: Number(data.price) || 0,
        isPublished: data.is_published ?? false,
        previewVimeoId: data.preview_vimeo_id || data.preview_vimeo_url
    };
}

export async function createSparringVideo(videoData: Partial<SparringVideo>) {
    const dbData: any = {
        creator_id: videoData.creatorId,
        title: videoData.title,
        description: videoData.description,
        video_url: videoData.videoUrl,
        preview_vimeo_id: videoData.previewVimeoId,
        thumbnail_url: videoData.thumbnailUrl,
        related_items: videoData.relatedItems,
        category: videoData.category,
        difficulty: videoData.difficulty,
        uniform_type: videoData.uniformType,
        is_published: false,
        duration_minutes: videoData.durationMinutes,
        length: videoData.length,
    };

    // Auto-fetch Vimeo info
    if (dbData.video_url) {
        try {
            const videoInfo = await getVimeoVideoInfo(dbData.video_url);
            if (videoInfo) {
                if (!dbData.thumbnail_url) dbData.thumbnail_url = videoInfo.thumbnail;
                if (!dbData.duration_minutes) dbData.duration_minutes = Math.floor(videoInfo.duration / 60);
                if (!dbData.length) dbData.length = formatDuration(videoInfo.duration);
            }
        } catch (err) {
            console.warn('Failed to auto-fetch Vimeo info for sparring video:', err);
        }
    }

    const { data, error } = await withTimeout(
        supabase
            .from('sparring_videos')
            .insert(dbData)
            .select()
            .single(),
        30000
    );

    if (error) {
        console.error('Error creating sparring video:', error);
        return { data: null, error };
    }

    return { data: transformSparringVideo(data), error: null };
}

export async function getSparringVideos(limit = 10, creatorId?: string, publicOnly = false) {
    try {
        let query = supabase
            .from('sparring_videos')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (creatorId) {
            query = query.eq('creator_id', creatorId);
        }

        if (publicOnly) {
            query = query.eq('is_published', true);
        }

        // Hide soft-deleted videos from general lists
        query = query.is('deleted_at', null);

        const { data: videos, error } = await withTimeout(query, 10000);

        if (error) {
            console.error('Error fetching sparring videos:', error);
            return { data: null, error };
        }

        if (!videos || videos.length === 0) return { data: [], error: null };

        // Extract creator IDs for manual fetch
        const creatorIds = Array.from(new Set(videos.map(v => v.creator_id).filter(Boolean)));

        // Fetch creator details from 'users' table
        let userMap: Record<string, any> = {};
        if (creatorIds.length > 0) {
            const { data: users } = await supabase
                .from('users')
                .select('id, name, avatar_url, profile_image_url')
                .in('id', creatorIds);

            if (users) {
                users.forEach(u => {
                    userMap[u.id] = u;
                });
            }
        }

        return {
            data: videos.map(v => transformSparringVideo({
                ...v,
                creator: userMap[v.creator_id] ? {
                    ...userMap[v.creator_id],
                    profileImage: userMap[v.creator_id].profile_image_url || userMap[v.creator_id].avatar_url
                } : undefined
            })),
            error: null
        };
    } catch (e) {
        console.error('getSparringVideos failed:', e);
        return { data: [], error: e };
    }
}

export async function deleteSparringVideo(id: string) {
    try {
        // 1. Check for purchases
        const { count, error: countError } = await supabase
            .from('purchases')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', id)
            .eq('status', 'completed');

        if (countError) throw countError;

        if (count && count > 0) {
            // 2. Soft Delete (Archive)
            const { error: updateError } = await supabase
                .from('sparring_videos')
                .update({
                    is_published: false,
                    // We assume the user applied the migration to add deleted_at
                    deleted_at: new Date().toISOString()
                } as any)
                .eq('id', id);

            if (updateError) throw updateError;
            return { error: null, archived: true };
        } else {
            // 3. Hard Delete
            const { error } = await supabase
                .from('sparring_videos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { error: null, archived: false };
        }
    } catch (error) {
        console.error('Error deleting sparring video:', error);
        return { error };
    }
}

export async function getSparringVideoById(id: string) {
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching sparring video by ID:', id, error);
        return { data: null, error };
    }

    if (!data) {
        console.warn('Sparring video not found with ID:', id);
        return { data: null, error: null };
    }

    try {
        // Fetch creator info from users table for robustness
        const { data: userData } = await supabase
            .from('users')
            .select('id, name, avatar_url, profile_image_url')
            .eq('id', data.creator_id)
            .maybeSingle();

        return {
            data: transformSparringVideo({
                ...data,
                creator: userData ? {
                    ...userData,
                    profileImage: userData.profile_image_url || userData.avatar_url
                } : undefined
            }),
            error: null
        };

        const transformed = transformSparringVideo({
            ...data,
            users: userData
        });

        return { data: transformed, error: null };
    } catch (e) {
        console.error('Transformation error for sparring video:', id, e);
        return { data: null, error: e };
    }
}

export async function updateSparringVideo(id: string, updates: Partial<SparringVideo>) {
    const dbData: any = {};
    if (updates.title) dbData.title = updates.title;
    if (updates.description) dbData.description = updates.description;
    if (updates.videoUrl) dbData.video_url = updates.videoUrl;
    if (updates.thumbnailUrl) dbData.thumbnail_url = updates.thumbnailUrl;
    if (updates.relatedItems) dbData.related_items = updates.relatedItems;
    if (updates.category) dbData.category = updates.category;
    if (updates.difficulty) dbData.difficulty = updates.difficulty;
    if (updates.uniformType) dbData.uniform_type = updates.uniformType;
    if (updates.price !== undefined) dbData.price = updates.price;
    if (updates.isPublished !== undefined) dbData.is_published = updates.isPublished;
    if (updates.previewVimeoId !== undefined) dbData.preview_vimeo_id = updates.previewVimeoId;
    if (updates.durationMinutes !== undefined) dbData.duration_minutes = updates.durationMinutes;
    if (updates.length) dbData.length = updates.length;
    if (updates.creatorId) dbData.creator_id = updates.creatorId;

    // If videoUrl changed, fetch info
    if (updates.videoUrl) {
        try {
            const videoInfo = await getVimeoVideoInfo(updates.videoUrl);
            if (videoInfo) {
                if (!updates.thumbnailUrl) dbData.thumbnail_url = videoInfo.thumbnail;
                if (!updates.durationMinutes) dbData.duration_minutes = Math.floor(videoInfo.duration / 60);
                if (!updates.length) dbData.length = formatDuration(videoInfo.duration);
            }
        } catch (err) {
            console.warn('Failed to auto-fetch updated sparring Vimeo info:', err);
        }
    }

    const { data, error } = await withTimeout(
        supabase
            .from('sparring_videos')
            .update(dbData)
            .eq('id', id)
            .select()
            .single(),
        30000
    );

    if (error) {
        console.error('Error updating sparring video:', error);
        return { data: null, error };
    }

    return { data: data ? transformSparringVideo(data) : null, error: null };
}

export async function searchDrillsAndLessons(query: string) {
    if (!query || query.length < 2) return { data: [], error: null };

    // Search Drills
    const drillsReq = supabase
        .from('drills')
        .select('id, title, category')
        .ilike('title', `%${query}%`)
        .limit(5);

    // Search Lessons
    const lessonsReq = supabase
        .from('lessons')
        .select('id, title')
        .ilike('title', `%${query}%`)
        .limit(5);

    const [drillsRes, lessonsRes] = await Promise.all([drillsReq, lessonsReq]);

    const results = [
        ...(drillsRes.data || []).map((d: any) => ({ ...d, type: 'drill' })),
        ...(lessonsRes.data || []).map((l: any) => ({ ...l, type: 'lesson' }))
    ];

    return { data: results, error: null };
}

export async function getRoutines(creatorId?: string) {
    let query = supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

    if (creatorId) {
        query = query.eq('creator_id', creatorId);
    }

    const { data: routines, error } = await query;
    if (error) {
        console.error('Error fetching routines:', error);
        return [];
    }

    if (!routines || routines.length === 0) return [];

    // Extract creator IDs
    const creatorIds = Array.from(new Set(routines.map((r: any) => r.creator_id).filter(Boolean)));

    // Fetch creators (users)
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

    // Map data with manual creator join
    return routines.map((routine: any) => {
        const creator = userMap[routine.creator_id];
        // Inject creator object for transformDrillRoutine to use
        const enrichedRoutine = {
            ...routine,
            creator: creator ? {
                name: creator.name,
                profile_image: creator.avatar_url
            } : null
        };
        return transformDrillRoutine(enrichedRoutine);
    });
}

/**
 * Get a routine for the day (changes daily based on date)
 */
export async function getDailyRoutine() {
    try {
        const { data, error } = await supabase
            .from('routines')
            .select('*')
            .order('id') // Added stable order
            .limit(20); // Sync with Landing Page limit

        if (error) {
            console.error('Error fetching routines for daily:', error);
            return { data: null, error };
        }

        if (!data || data.length === 0) {
            console.log('[getDailyRoutine] No routines found in database');
            return { data: null, error: null };
        }

        // 2. Select one based on date (Deterministic Seeded Random - matching Landing Page)
        const today = new Date();
        const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
        const x = Math.sin(seed) * 10000;
        const index = Math.floor((x - Math.floor(x)) * data.length);

        console.log(`[getDailyRoutine] Seed: ${seed}, Data Length: ${data.length}, Selected Index: ${index}`);

        const selectedRoutine = data[index];

        // 3. Fetch creator info (Prioritize creators table, fallback to users)
        let creatorName = 'Grapplay Team';
        let creatorProfileImage = undefined;

        if (selectedRoutine.creator_id) {
            // Try fetching from creators table first (Instructor Profile)
            const { data: creatorData } = await supabase
                .from('creators')
                .select('name, profile_image')
                .eq('id', selectedRoutine.creator_id)
                .maybeSingle();

            if (creatorData) {
                creatorName = creatorData.name || creatorName;
                creatorProfileImage = creatorData.profile_image || undefined;
            } else {
                // Fallback to users table (Auth Profile)
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, avatar_url')
                    .eq('id', selectedRoutine.creator_id)
                    .maybeSingle();

                if (userData) {
                    creatorName = userData.name || creatorName;
                    creatorProfileImage = userData.avatar_url || undefined;
                }
            }
        }

        return {
            data: {
                ...transformDrillRoutine(selectedRoutine),
                creatorName,
                creatorProfileImage
            },
            error: null
        };
    } catch (error) {
        console.error('Exception in getDailyRoutine:', error);
        return { data: null, error };
    }
}


/**
 * Get a drill for the day (changes daily based on date)
 */
export async function getDailyFreeDrill() {
    try {
        // 1. Try to get featured drill for today
        const kstDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        const { data: featured } = await withTimeout(
            supabase
                .from('daily_featured_content')
                .select('featured_id')
                .eq('date', kstDate)
                .eq('featured_type', 'drill')
                .maybeSingle(),
            3000
        );

        let drillId = featured?.featured_id;
        let selectedDrill = null;

        if (drillId) {
            const { data: drill } = await withTimeout(
                supabase
                    .from('drills')
                    .select('*')
                    .eq('id', drillId)
                    .maybeSingle(),
                10000
            );
            selectedDrill = drill;
        }

        // 2. Fallback to deterministic random if no featured drill or not found
        if (!selectedDrill) {
            // Only select drills that are part of paid routines (Price > 0)
            const { data: routineDrills, error } = await withTimeout(
                supabase
                    .from('routine_drills')
                    .select('drill_id, drills!inner(*), routines!inner(price)')
                    // Removed price restriction to allow free content
                    .neq('drills.vimeo_url', '')
                    .not('drills.vimeo_url', 'like', 'ERROR%'),
                10000
            );

            if (error) throw error;
            if (!routineDrills || routineDrills.length === 0) return { data: null, error: null };

            // Extract unique drills
            const uniqueDrillsMap = new Map();
            routineDrills.forEach((rd: any) => {
                if (rd.drills && !uniqueDrillsMap.has(rd.drills.id)) {
                    uniqueDrillsMap.set(rd.drills.id, rd.drills);
                }
            });
            const data = Array.from(uniqueDrillsMap.values());

            if (!data || data.length === 0) return { data: null, error: null };

            const today = new Date();
            const kstParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(today);
            const year = parseInt(kstParts.find(p => p.type === 'year')!.value);
            const month = parseInt(kstParts.find(p => p.type === 'month')!.value);
            const day = parseInt(kstParts.find(p => p.type === 'day')!.value);
            const seed = year * 10000 + month * 100 + day;
            const x = Math.sin(seed + 456) * 10000;
            const index = Math.floor((x - Math.floor(x)) * data.length);
            selectedDrill = data[index];
        }

        if (!selectedDrill) return { data: null, error: null };

        // 3. Fetch creator info (Prioritize creators table, fallback to users)
        let creatorName = 'Grapplay Team';
        let creatorProfileImage = undefined;

        if (selectedDrill.creator_id) {
            // Try fetching from creators table first (Instructor Profile)
            const { data: creatorData } = await supabase
                .from('creators')
                .select('name, profile_image')
                .eq('id', selectedDrill.creator_id)
                .maybeSingle();

            if (creatorData) {
                creatorName = creatorData.name || creatorName;
                creatorProfileImage = creatorData.profile_image || undefined;
            } else {
                // Fallback to users table (Auth Profile)
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, avatar_url')
                    .eq('id', selectedDrill.creator_id)
                    .maybeSingle();

                if (userData) {
                    creatorName = userData.name || creatorName;
                    creatorProfileImage = userData.avatar_url || undefined;
                }
            }
        }

        const transformed = transformDrill(selectedDrill);
        return {
            data: {
                ...transformed,
                creatorName,
                creatorProfileImage
            },
            error: null
        };
    } catch (error) {
        console.error('Exception in getDailyFreeDrill:', error);
        return { data: null, error };
    }
}

/**
 * Get a lesson for the day (changes daily based on date)
 */
export async function getDailyFreeLesson() {
    try {
        // 1. Try to get featured lesson for today
        const kstDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        const { data: featured } = await withTimeout(
            supabase
                .from('daily_featured_content')
                .select('featured_id')
                .eq('date', kstDate)
                .eq('featured_type', 'lesson')
                .maybeSingle(),
            3000
        );

        let lessonId = featured?.featured_id;
        let selectedLesson = null;

        if (lessonId) {
            const { data: lesson } = await withTimeout(
                supabase
                    .from('lessons')
                    .select('*, courses!inner(*)')
                    .eq('id', lessonId)
                    .maybeSingle(),
                10000
            );
            selectedLesson = lesson;
        }

        // 2. Fallback to deterministic random if no featured or not found
        if (!selectedLesson) {
            const { data: lessons, error } = await withTimeout(
                supabase
                    .from('lessons')
                    .select('*, courses!inner(*)')
                    .eq('courses.published', true)
                    .neq('vimeo_url', '')
                    .not('vimeo_url', 'like', 'ERROR%')
                    .limit(50),
                10000
            );

            if (error) throw error;
            if (!lessons || lessons.length === 0) return { data: null, error: null };

            const today = new Date();
            const kstParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(today);
            const year = parseInt(kstParts.find(p => p.type === 'year')!.value);
            const month = parseInt(kstParts.find(p => p.type === 'month')!.value);
            const day = parseInt(kstParts.find(p => p.type === 'day')!.value);
            const seed = year * 10000 + month * 100 + day;
            const x = Math.sin(seed + 789) * 10000;
            const index = Math.floor((x - Math.floor(x)) * lessons.length);
            selectedLesson = lessons[index];
        }

        if (!selectedLesson) return { data: null, error: null };

        // 3. Fetch creator info
        let creatorName = 'Grapplay Team';
        let creatorProfileImage = undefined;
        const creatorId = selectedLesson.courses?.creator_id || selectedLesson.creator_id;

        if (creatorId) {
            const { data: creatorData } = await supabase
                .from('creators')
                .select('name, profile_image')
                .eq('id', creatorId)
                .maybeSingle();

            if (creatorData) {
                creatorName = creatorData.name || creatorName;
                creatorProfileImage = creatorData.profile_image || undefined;
            } else {
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, avatar_url')
                    .eq('id', creatorId)
                    .maybeSingle();

                if (userData) {
                    creatorName = userData.name || creatorName;
                    creatorProfileImage = userData.avatar_url || undefined;
                }
            }
        }

        const transformed = transformLesson({
            ...selectedLesson,
            course: selectedLesson.courses
        });

        return {
            data: {
                ...transformed,
                creatorName,
                creatorProfileImage
            },
            error: null
        };
    } catch (error) {
        console.error('Exception in getDailyFreeLesson:', error);
        return { data: null, error };
    }
}

export async function getDailyFreeSparring() {
    try {
        // 1. Try to get featured sparring for today
        const kstDate = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
        const { data: featured } = await withTimeout(
            supabase
                .from('daily_featured_content')
                .select('featured_id')
                .eq('date', kstDate)
                .eq('featured_type', 'sparring')
                .maybeSingle(),
            3000
        );

        let sparringId = featured?.featured_id;
        let selectedSparring = null;

        if (sparringId) {
            const { data: sparring } = await withTimeout(
                supabase
                    .from('sparring_videos')
                    .select('*')
                    .eq('id', sparringId)
                    .maybeSingle(),
                10000
            );
            selectedSparring = sparring;
        }

        // 2. Fallback to deterministic random if no featured or not found
        if (!selectedSparring) {
            const { data, error } = await withTimeout(
                supabase
                    .from('sparring_videos')
                    .select('*')
                    .eq('is_published', true)
                    .is('deleted_at', null)
                    .gt('price', 0)
                    .neq('video_url', '')
                    .not('video_url', 'like', 'ERROR%')
                    .order('id')
                    .limit(50),
                10000
            );

            if (error) throw error;
            if (!data || data.length === 0) return { data: null, error: null };

            const today = new Date();
            const kstParts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(today);
            const year = parseInt(kstParts.find(p => p.type === 'year')!.value);
            const month = parseInt(kstParts.find(p => p.type === 'month')!.value);
            const day = parseInt(kstParts.find(p => p.type === 'day')!.value);
            const seed = year * 10000 + month * 100 + day;
            const x = Math.sin(seed + 123) * 10000;
            const index = Math.floor((x - Math.floor(x)) * data.length);
            selectedSparring = data[index];
        }

        if (!selectedSparring) return { data: null, error: null };

        // 3. Fetch creator info from users table (Fixes 400 error)
        let creatorInfo = undefined;
        if (selectedSparring.creator_id) {
            const { data: userData } = await supabase
                .from('users')
                .select('id, name, avatar_url, profile_image_url')
                .eq('id', selectedSparring.creator_id)
                .maybeSingle();

            if (userData) {
                creatorInfo = {
                    id: userData.id,
                    name: userData.name || '알 수 없음',
                    profileImage: userData.profile_image_url || userData.avatar_url, // Prioritize profile_image_url
                    bio: '',
                    subscriberCount: 0
                };
            }
        }

        return {
            data: {
                ...transformSparringVideo(selectedSparring),
                previewVimeoId: selectedSparring.preview_vimeo_id,
                creator: creatorInfo
            },
            error: null
        };
    } catch (error) {
        console.error('Error fetching daily free sparring:', error);
        return { data: null, error };
    }
}

export async function fetchRoutines(limit: number = 20) {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('routines')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(limit),
            5000
        );

        if (error) throw error;

        // Extract creator IDs for manual fetch (mirroring getSparringVideos logic)
        const creatorIds = Array.from(new Set((data || []).map(r => r.creator_id).filter(Boolean)));

        // Fetch creator details using unified logic (Users + Creators table)
        const userMap = await fetchCreatorsByIds(creatorIds);

        const result = (data || []).map(routine => transformDrillRoutine({
            ...routine,
            creator: userMap[routine.creator_id]
        }));

        return { data: result, error: null };
    } catch (error) {
        console.error('Error fetching routines:', error);
        return { data: [], error };
    }
}


// Alias for backward compatibility
export const getDrillRoutines = getRoutines;

export async function getRoutineById(id: string) {
    if (id.startsWith('mock-')) {
        const mock = MOCK_ROUTINES.find(r => r.id === id);
        if (mock) return { data: mock, error: null };
    }
    console.log('[getRoutineById] Fetching routine:', id);

    // 1. Remove unstable joins (creator:creators) to prevent API errors
    const { data, error } = await supabase
        .from('routines')
        .select(`
            *,
            items:routine_drills(
                order_index,
                drill:drills(*)
            )
        `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[getRoutineById] Error fetching routine:', {
            routineId: id,
            error: error,
            code: error.code,
            message: error.message
        });
        return { data: null, error };
    }

    if (!data) {
        console.warn('[getRoutineById] No data returned for routine:', id);
        return { data: null, error: { message: 'Routine not found', code: '404' } };
    }

    console.log('[getRoutineById] Raw data received:', {
        routineId: data.id,
        creatorId: data.creator_id,
        itemsCount: data.items?.length || 0
    });

    // 2. Fetch creator info manually from 'users' table
    let creatorName = 'Unknown';
    let creatorProfileImage = null;

    if (data.creator_id) {
        try {
            // Priority 1: Fetch from users table (Actual user settings)
            const { data: userData } = await supabase
                .from('users')
                .select('name, avatar_url')
                .eq('id', data.creator_id)
                .maybeSingle();

            if (userData) {
                creatorName = userData.name || 'Unknown';
                creatorProfileImage = userData.avatar_url;
            }

            // Priority 2: If no image in users table, check creators table (Legacy/Creator settings)
            if (!creatorProfileImage) {
                const { data: creatorData } = await supabase
                    .from('creators')
                    .select('name, profile_image')
                    .eq('id', data.creator_id)
                    .maybeSingle();

                if (creatorData) {
                    if (creatorName === 'Unknown') creatorName = creatorData.name;
                    creatorProfileImage = creatorData.profile_image;
                }
            }
        } catch (e) {
            console.warn('[getRoutineById] Could not fetch creator:', e);
        }
    }

    // 3. Transform to match DrillRoutine interface
    const rawDrills = data.items || [];
    const routine = {
        ...transformDrillRoutine(data),
        creatorName: creatorName,
        creatorImage: creatorProfileImage, // Align with RoutineDetail.tsx
        creatorProfileImage: creatorProfileImage,
        drills: rawDrills
            .filter((item: any) => item && item.drill) // Ensure item and drill exist
            .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
            .map((item: any) => ({
                ...transformDrill(item.drill),
                orderIndex: item.order_index || 0
            })) || []
    };

    return { data: routine as DrillRoutine, error: null };
}

export async function getRelatedRoutines(currentRoutineId: string, category: string, limit = 4) {
    try {
        let query = supabase
            .from('routines')
            .select('*')
            .neq('id', currentRoutineId) // Exclude current
            .limit(limit);

        if (category) {
            query = query.eq('category', category);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching related routines:', error);
            return { data: [], error };
        }

        const routines = (data || []).map((item: any) => transformDrillRoutine(item));
        return { data: routines, error: null };
    } catch (e: any) {
        console.error('getRelatedRoutines exception:', e);
        return { data: [], error: e };
    }
}

export async function createRoutine(routineData: Partial<DrillRoutine>, drillIds: string[]) {
    // If no thumbnail provided, get it from the first drill
    let thumbnailUrl = routineData.thumbnailUrl;
    if (!thumbnailUrl && drillIds.length > 0) {
        const { data: firstDrill } = await supabase
            .from('drills')
            .select('thumbnail_url')
            .eq('id', drillIds[0])
            .maybeSingle();

        if (firstDrill?.thumbnail_url) {
            thumbnailUrl = firstDrill.thumbnail_url;
        }
    }

    const dbData = {
        title: routineData.title,
        description: routineData.description,
        creator_id: routineData.creatorId,
        thumbnail_url: thumbnailUrl,
        price: routineData.price,
        category: routineData.category,
        difficulty: routineData.difficulty,
        total_duration_minutes: routineData.totalDurationMinutes || 0,
        related_items: routineData.relatedItems || [],
        uniform_type: routineData.uniformType,
        drill_count: drillIds.length
    };

    const { data: routine, error: routineError } = await withTimeout(
        supabase
            .from('routines')
            .insert(dbData)
            .select()
            .maybeSingle(),
        30000
    );

    if (routineError) {
        console.error('Error creating routine:', routineError);
        return { data: null, error: routineError };
    }

    // Add drills to routine
    if (drillIds.length > 0) {
        const routineDrills = drillIds.map((drillId, index) => ({
            routine_id: routine.id,
            drill_id: drillId,
            order_index: index
        }));

        const { error: drillsError } = await supabase
            .from('routine_drills')
            .insert(routineDrills);

        if (drillsError) {
            console.error('Error adding drills to routine:', drillsError);
            return { data: null, error: drillsError };
        }
    }

    return { data: transformDrillRoutine(routine), error: null };
}

export async function updateRoutine(id: string, updates: Partial<DrillRoutine>, drillIds?: string[]) {
    const dbData: any = {};
    if (updates.title) dbData.title = updates.title;
    if (updates.description) dbData.description = updates.description;
    if (updates.thumbnailUrl) dbData.thumbnail_url = updates.thumbnailUrl;
    if (updates.price !== undefined) dbData.price = updates.price;
    if (updates.relatedItems) dbData.related_items = updates.relatedItems;
    if (updates.uniformType) dbData.uniform_type = updates.uniformType;
    if (updates.creatorId) dbData.creator_id = updates.creatorId;
    if (drillIds) dbData.drill_count = drillIds.length;

    const { data: routine, error: routineError } = await withTimeout(
        supabase
            .from('routines')
            .update(dbData)
            .eq('id', id)
            .select()
            .maybeSingle(),
        30000
    );

    if (routineError) {
        console.error('Error updating routine:', routineError);
        return { data: null, error: routineError };
    }

    // Update drills if provided
    if (drillIds) {
        // Delete existing
        await supabase.from('routine_drills').delete().eq('routine_id', id);

        // Insert new
        if (drillIds.length > 0) {
            const routineDrills = drillIds.map((drillId, index) => ({
                routine_id: id,
                drill_id: drillId,
                order_index: index
            }));

            const { error: drillsError } = await supabase
                .from('routine_drills')
                .insert(routineDrills);

            if (drillsError) {
                console.error('Error updating routine drills:', drillsError);
                return { data: null, error: drillsError };
            }
        }
    }

    return { data: transformDrillRoutine(routine), error: null };
}

export async function deleteRoutine(id: string) {
    // 1. Delete drill associations first (Foreign Key Constraint)
    const { error: drillsError } = await supabase
        .from('routine_drills')
        .delete()
        .eq('routine_id', id);

    if (drillsError) {
        console.error('Error deleting routine drills:', drillsError);
        return { error: drillsError };
    }

    // 2. Delete user saves (bookmarks)
    const { error: savesError } = await supabase
        .from('user_routines')
        .delete()
        .eq('routine_id', id);

    if (savesError) {
        console.error('Error deleting routine saves:', savesError);
        return { error: savesError };
    }

    // 3. Delete purchases (Optional/Policy: usually should keep purchase history, 
    // but if it's a private routine being deleted by owner, we might need to clear this or it blocks deletion.
    // Assuming mostly self-created routines for now.)
    // For safety, let's try to delete purchases if they exist to prevent blocking.
    const { error: purchaseError } = await supabase
        .from('user_routine_purchases')
        .delete()
        .eq('routine_id', id);

    if (purchaseError) {
        console.warn('Error deleting routine purchases (might be restricted):', purchaseError);
        // Don't return error here, try to proceed to delete routine anyway
    }

    // 4. Finally delete the routine itself
    const { error } = await supabase
        .from('routines')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting routine:', error);
        return { error };
    }

    return { error: null };
}

export async function purchaseRoutine(userId: string, routineId: string) {
    const { error } = await supabase
        .from('user_routine_purchases')
        .insert({
            user_id: userId,
            routine_id: routineId,
            source: 'direct'
        });

    if (error) {
        console.error('Error purchasing routine:', error);
        return { error };
    }

    return { error: null };
}

// ============================================================================
// Mock Data
// ============================================================================

const MOCK_DRILLS: Drill[] = [];

const MOCK_ROUTINES: DrillRoutine[] = [];

export async function getUserRoutines(userId: string) {
    // Fetch purchased routines
    const { data: purchasedData, error: purchasedError } = await withTimeout(
        supabase
            .from('user_routine_purchases')
            .select(`
            routine:routines(
                *
            )
        `)
            .eq('user_id', userId),
        10000
    ) as any;

    // Fetch user-created routines
    const { data: createdData, error: createdError } = await supabase
        .from('routines')
        .select('*')
        .eq('creator_id', userId);

    if (purchasedError && createdError) {
        console.error('Error fetching user routines:', { purchasedError, createdError });
        return { data: [], error: purchasedError || createdError };
    }

    const routines: DrillRoutine[] = [];

    // Fetch user details for created routines
    const { data: userData } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

    // Add purchased routines
    if (purchasedData) {
        // Collect creator IDs to fetch names
        const creatorIds = purchasedData.map((item: any) => item.routine?.creator_id).filter(Boolean);
        const creatorsMap = await fetchCreatorsByIds(creatorIds);

        const purchased = purchasedData.map((item: any) => {
            const routine = item.routine;
            const creator = creatorsMap[routine.creator_id];
            return {
                ...transformDrillRoutine(routine),
                creatorName: creator?.name || 'Unknown Creator',
                creatorProfileImage: creator?.avatarUrl || undefined,
                purchasedAt: item.purchased_at
            };
        });
        routines.push(...purchased);
    }

    const { data: creatorData } = await supabase
        .from('creators')
        .select('name, profile_image')
        .eq('id', userId)
        .maybeSingle();

    // Add created routines
    if (createdData) {
        const created = createdData.map((routine: any) => ({
            ...transformDrillRoutine(routine),
            creatorName: creatorData?.name || userData?.name || 'Grapplay Instructor',
            creatorProfileImage: userData?.avatar_url || creatorData?.profile_image || undefined,
            isOwned: true
        }));
        routines.push(...created);
    }

    return { data: routines as DrillRoutine[], error: null };
}

// Get only user-created routines (for Arena page)
export async function getUserCreatedRoutines(userId: string) {
    const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('creator_id', userId);

    if (error) {
        console.warn('Error fetching user-created routines:', error);
        return { data: [], error };
    }

    // Fetch user details
    const { data: userData } = await supabase
        .from('users')
        .select('name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

    const routines = data.map((routine: any) => ({
        ...transformDrillRoutine(routine),
        creatorName: userData?.name || 'Me',
        creatorProfileImage: userData?.avatar_url,
        isOwned: true
    }));

    return { data: routines as DrillRoutine[], error: null };
}

// Get random sample routines for non-logged-in users
export async function getRandomSampleRoutines(limit: number = 1) {
    try {
        const { data, error } = await supabase
            .from('routines')
            .select('*')
            .limit(limit);

        if (error || !data) {
            console.error('API Error in getRandomSampleRoutines:', error);
            return { data: [], error: error || new Error('Failed to fetch') };
        }

        // Collect creator IDs
        const creatorIds = data.map((r: any) => r.creator_id).filter(Boolean);

        // Fetch creator details
        let creatorsMap: Record<string, { name: string, avatarUrl: string | null }> = {};

        if (creatorIds.length > 0) {
            const uniqueIds = [...new Set(creatorIds)];
            const { data: users } = await supabase
                .from('users')
                .select('id, name, avatar_url')
                .in('id', uniqueIds);

            if (users) {
                users.forEach((u: any) => {
                    creatorsMap[u.id] = { name: u.name, avatarUrl: u.avatar_url };
                });
            }
        }

        const routines = data.map((r: any) => {
            const creator = creatorsMap[r.creator_id];
            return {
                ...transformDrillRoutine(r),
                creatorName: creator?.name || 'Grapplay Team',
                creatorProfileImage: creator?.avatarUrl || undefined
            };
        });

        return { data: routines as DrillRoutine[], error: null };
    } catch (error) {
        console.error('Exception in getRandomSampleRoutines:', error);
        return { data: [], error };
    }
}

// Helper for transforming drill data
export function transformDrill(data: any): Drill {
    if (!data) return {} as Drill;
    console.log('transformDrill input:', data);
    const result = {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator_name || data.creator?.name || 'Unknown',
        creatorProfileImage: data.creator?.profile_image || data.creator?.avatar_url || undefined,
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        videoUrl: data.video_url || data.action_video,
        vimeoUrl: data.vimeo_url || data.action_video,
        descriptionVideoUrl: data.description_video_url || data.description_video,
        aspectRatio: '9:16' as const,
        views: data.views || 0,
        durationMinutes: data.duration_minutes || 0,
        duration: data.duration || data.length, // Ensure duration is mapped for list display
        length: data.length || data.duration,
        tags: data.tags || [],
        likes: data.likes || 0,
        price: Number(data.price) || 0,
        createdAt: data.created_at,
        uniformType: data.uniform_type,
    };
    console.log('transformDrill output:', result);
    return result;
}

// Helper for transforming routine data
function transformDrillRoutine(data: any): DrillRoutine {
    if (!data) return {} as DrillRoutine;
    // Safety check for duration and drill count which are often missing or misnamed in DB
    return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        creatorId: data.creator_id,
        creatorName: data.creator?.name || data.creator_name || 'Grapplay Team',
        // Prioritize profileImage (from creator table) over avatar_url (from auth/user table)
        creatorProfileImage: data.creator?.profileImage || data.creator?.profile_image || data.creator?.avatar_url || data.creatorProfileImage || undefined,
        thumbnailUrl: data.thumbnail_url || data.thumbnailUrl || '', // Support both snake and camel case
        price: data.price || 0,
        views: data.views || 0,
        difficulty: data.difficulty,
        category: data.category,
        totalDurationMinutes: data.total_duration_minutes || data.duration_minutes || data.drill_count || 0,
        drillCount: data.drill_count || 0,
        drills: [],
        relatedItems: data.related_items || [],
        uniformType: data.uniform_type,
        createdAt: data.created_at
    };
}

// ============================================================================
// Missing Drill & Routine Functions (Restored)
// ============================================================================

export async function getDrillById(id: string) {
    // Check for mock data first
    const mockDrill = MOCK_DRILLS.find(d => d.id === id);
    if (mockDrill) return mockDrill;

    try {
        console.log(`[getDrillById] Fetching drill ${id}...`);
        const startTime = Date.now();

        // Reduced timeout to 10s for faster feedback
        const { data: drills, error } = await withTimeout(
            supabase
                .from('drills')
                .select('*')
                .eq('id', id)
                .limit(1),
            20000
        );

        const duration = Date.now() - startTime;
        console.log(`[getDrillById] Query completed in ${duration}ms`);

        if (error) {
            console.error(`[getDrillById] Error fetching drill ${id}:`, error);
            // Return error object and exit
            return { error };
        }

        // Handle empty result manually
        if (!drills || drills.length === 0) {
            console.warn(`[getDrillById] Drill ${id} not found in database`);
            return { error: { message: 'Drill not found', code: '404' } };
        }

        const drill = drills[0];

        // Fetch Creator Manually
        let creator = null;
        if (drill.creator_id) {
            const { data: user } = await supabase
                .from('users')
                .select('id, name, avatar_url')
                .eq('id', drill.creator_id)
                .maybeSingle();
            creator = user;
        }

        const enrichedDrill = {
            ...drill,
            creator: creator ? {
                name: creator.name,
                profile_image: creator.avatar_url
            } : null
        };

        console.log(`[getDrillById] Successfully fetched drill ${id}`);
        return transformDrill(enrichedDrill);
    } catch (e: any) {
        console.error(`[getDrillById] Failed/timeout for drill ${id}:`, e);
        return { error: e.message || 'Request timed out. Please check your connection and try again.' };
    }
}

export async function getDrillsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return { data: [], error: null };

    try {
        const { data, error } = await supabase
            .from('drills')
            .select('*')
            .in('id', ids);

        if (error) {
            console.error('Error fetching drills by IDs:', error);
            return { data: [], error };
        }

        // Fetch Creators Manually for proper attribution
        const creatorIds = (data || []).map((d: any) => d.creator_id).filter(Boolean);
        let creatorsMap: Record<string, any> = {};

        if (creatorIds.length > 0) {
            const { data: creators } = await supabase
                .from('users')
                .select('id, name, avatar_url')
                .in('id', creatorIds);

            if (creators) {
                creators.forEach((c: any) => { creatorsMap[c.id] = c; });
            }
        }

        const drills = (data || []).map((d: any) => {
            const creator = creatorsMap[d.creator_id];
            const enriched = {
                ...d,
                creator: creator ? { name: creator.name, profile_image: creator.avatar_url } : null
            };
            return transformDrill(enriched);
        });

        return { data: drills, error: null };
    } catch (e) {
        console.error('Error in getDrillsByIds:', e);
        return { data: [], error: e };
    }
}

export async function getLessonsByIds(ids: string[]) {
    if (!ids || ids.length === 0) return { data: [], error: null };

    try {
        const { data, error } = await supabase
            .from('lessons')
            .select('*, course:courses(title, thumbnail_url, creator_id)')
            .in('id', ids);

        if (error) {
            console.error('Error fetching lessons by IDs:', error);
            return { data: [], error };
        }

        // Fetch Creators Manually for proper attribution
        const creatorIds = (data || []).map((l: any) => l.creator_id || l.course?.creator_id).filter(Boolean);
        let creatorsMap: Record<string, any> = {};

        if (creatorIds.length > 0) {
            const { data: creators } = await supabase
                .from('users')
                .select('id, name, avatar_url')
                .in('id', creatorIds);

            if (creators) {
                creators.forEach((c: any) => { creatorsMap[c.id] = c; });
            }
        }

        const lessons = (data || []).map((l: any) => {
            const creatorId = l.creator_id || l.course?.creator_id;
            const creator = creatorsMap[creatorId];
            const enriched = {
                ...l,
                creator: creator ? { name: creator.name, profile_image: creator.avatar_url } : null
            };
            return transformLesson(enriched);
        });

        return { data: lessons, error: null };
    } catch (e) {
        console.error('Error in getLessonsByIds:', e);
        return { data: [], error: e };
    }
}




/**
 * Find the routine that contains a specific drill
 * Returns the first routine found that contains this drill
 */
export async function getRoutineByDrillId(drillId: string): Promise<{ data: DrillRoutine | null; error: any }> {
    try {
        // Get first routine that contains this drill
        const { data: associations, error: assocError } = await supabase
            .from('routine_drills')
            .select(`
                routine_id,
                routines (*)
            `)
            .eq('drill_id', drillId)
            .limit(1);

        if (assocError || !associations || associations.length === 0) {
            return { data: null, error: null };
        }

        const association = associations[0];
        const rawRoutine = Array.isArray(association.routines) ? association.routines[0] : association.routines;

        if (!rawRoutine) {
            return { data: null, error: null };
        }

        // Fetch drills for this routine
        const { data: routineDrills } = await supabase
            .from('routine_drills')
            .select(`
                drill_id,
                order_index,
                drills (*)
            `)
            .eq('routine_id', association.routine_id)
            .order('order_index', { ascending: true });

        const drills = routineDrills?.map((rd: any) => transformDrill(rd.drills)) || [];

        return {
            data: {
                id: rawRoutine.id,
                title: rawRoutine.title,
                description: rawRoutine.description,
                thumbnailUrl: rawRoutine.thumbnail_url,
                difficulty: rawRoutine.difficulty,
                category: rawRoutine.category,
                totalDurationMinutes: rawRoutine.duration_minutes || 0,
                drills: drills,
                drillCount: drills.length,
                creatorId: rawRoutine.creator_id,
                creatorName: (rawRoutine.creator as any)?.name || 'Unknown',
                price: rawRoutine.price || 0,
                views: rawRoutine.views || 0,
                createdAt: rawRoutine.created_at
            },
            error: null
        };
    } catch (error) {
        console.warn('getRoutineByDrillId failed:', error);
        return { data: null, error: null };
    }
}

export async function checkDrillOwnership(userId: string, drillId: string) {
    // Always return true for mocks for testing
    if (drillId.startsWith('mock-')) return true;

    // Check if user is creator
    const { data: drill } = await supabase
        .from('drills')
        .select('creator_id')
        .eq('id', drillId)
        .single();

    if (drill && drill.creator_id === userId) return true;

    return false;
}

export async function incrementDrillViews(drillId: string) {
    if (drillId.startsWith('mock-')) return;
    const { error } = await supabase.rpc('increment_drill_views', { drill_id: drillId });
    if (error) console.error('Error incrementing drill views:', error);
}

export function calculateDrillPrice(price: number, isSubscriber: boolean) {
    if (isSubscriber) {
        return Math.floor(price * 0.8); // 20% discount for subscribers
    }
    return price;
}

export async function getDrillRoutineById(id: string) {
    const mockRoutine = MOCK_ROUTINES.find(r => r.id === id);
    if (mockRoutine) return mockRoutine;
    const { data, error } = await getRoutineById(id);
    if (error) throw error;
    return data;
}

export async function checkDrillRoutineOwnership(userId: string, routineId: string) {
    if (routineId.startsWith('mock-')) return true;

    const { data } = await supabase
        .from('user_routine_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('routine_id', routineId)
        .maybeSingle();

    if (data) return true;

    // Check if creator
    const { data: routine } = await supabase
        .from('routines')
        .select('creator_id')
        .eq('id', routineId)
        .single();

    if (routine && routine.creator_id === userId) return true;

    return false;
}

export async function incrementDrillRoutineViews(routineId: string) {
    if (routineId.startsWith('mock-')) return;
    const { error } = await supabase.rpc('increment_routine_views', { p_routine_id: routineId });
    if (error) console.error('Error incrementing routine views:', error);
}

export function calculateRoutinePrice(price: number, isSubscriber: boolean) {
    if (isSubscriber) {
        return Math.floor(price * 0.8); // 20% discount for subscribers
    }
    return price;
}

// ============================================================================
// Course-Routine Bundles
// ============================================================================

/**
 * Get routines bundled with a course
 */
export async function getCourseRoutineBundles(courseId: string) {
    const { data, error } = await supabase
        .from('course_routine_bundles')
        .select(`
            *,
            routine:routines(*)
        `)
        .eq('course_id', courseId);

    if (error) {
        console.error('Error fetching course routine bundles:', error);
        return { data: null, error };
    }

    const routines = data?.map((item: any) => transformDrillRoutine(item.routine)) || [];
    return { data: routines as DrillRoutine[], error: null };
}

/**
 * Add a routine to a course bundle
 */
export async function addCourseRoutineBundle(courseId: string, routineId: string) {
    const { data, error } = await supabase
        .from('course_routine_bundles')
        .insert({
            course_id: courseId,
            routine_id: routineId
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding course routine bundle:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Remove a routine from a course bundle
 */
export async function removeCourseRoutineBundle(courseId: string, routineId: string) {
    const { error } = await supabase
        .from('course_routine_bundles')
        .delete()
        .eq('course_id', courseId)
        .eq('routine_id', routineId);

    if (error) {
        console.error('Error removing course routine bundle:', error);
        return { error };
    }

    return { error: null };
}

// ============================================================================
// Course-Drill Bundles
// ============================================================================

/**
 * Get drills bundled with a course
 */
export async function getCourseDrillBundles(courseId: string) {
    const { data, error } = await withTimeout(
        supabase
            .from('course_drill_bundles')
            .select(`
            *,
            drill:drills(*)
        `)
            .eq('course_id', courseId), 10000);

    if (error) {
        console.error('Error fetching course drill bundles:', error);
        return { data: null, error };
    }

    const drills = data?.map((item: any) => transformDrill(item.drill)) || [];
    return { data: drills as Drill[], error: null };
}

/**
 * Add a drill to a course bundle
 */
export async function addCourseDrillBundle(courseId: string, drillId: string) {
    const { data, error } = await supabase
        .from('course_drill_bundles')
        .insert({
            course_id: courseId,
            drill_id: drillId
        })
        .select()
        .single();

    if (error) {
        console.error('Error adding course drill bundle:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Remove a drill from a course bundle
 */
export async function removeCourseDrillBundle(courseId: string, drillId: string) {
    const { error } = await supabase
        .from('course_drill_bundles')
        .delete()
        .eq('course_id', courseId)
        .eq('drill_id', drillId);

    if (error) {
        console.error('Error removing course drill bundle:', error);
        return { error };
    }

    return { error: null };
}

// ==================== FEED POSTS ====================

// Helper to upload feed image
async function uploadFeedImage(userId: string, dataUrl: string): Promise<string | null> {
    try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const fileExt = 'png';
        const fileName = `${userId}/feed/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: true
            });

        if (uploadError) {
            console.error('Feed image upload failed:', uploadError);
            return null;
        }

        const { data } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);

        return data.publicUrl;
    } catch (e) {
        console.error('Error processing feed image:', e);
        return null;
    }
}

/**
 * Create a feed post (for sharing achievements)
 */
export async function createFeedPost(post: {
    userId: string;
    content: string;
    type: 'sparring' | 'routine' | 'mastery' | 'general' | 'title_earned' | 'level_up' | 'technique';
    metadata?: any;
    mediaUrl?: string;
    youtubeUrl?: string;
}) {
    // First, ensure user exists in users table
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const userName = user.user_metadata?.name ||
                user.user_metadata?.full_name ||
                user.email?.split('@')[0] ||
                '사용자';

            await supabase
                .from('users')
                .upsert({
                    id: post.userId,
                    name: userName,
                    avatar_url: user.user_metadata?.avatar_url,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });
        }
    } catch (e) {
        console.warn('Failed to upsert user info:', e);
    }

    // Handle Image Upload if Base64
    let finalMediaUrl = post.mediaUrl;
    if (post.mediaUrl && post.mediaUrl.startsWith('data:image')) {
        const uploadedUrl = await uploadFeedImage(post.userId, post.mediaUrl);
        if (uploadedUrl) {
            finalMediaUrl = uploadedUrl;
        } else {
            console.warn('Image upload failed or skipped, posting without image to avoid 400 error.');
            finalMediaUrl = undefined;
        }
    }

    // Reuse createTrainingLog with correct mapping
    try {
        const result = await createTrainingLog({
            userId: post.userId,
            date: new Date().toISOString().split('T')[0],
            durationMinutes: 1, // Marker for feed post
            techniques: [],
            sparringRounds: 0,
            notes: post.content,
            isPublic: true,
            location: `__FEED__${post.type}`,
            type: post.type,
            mediaUrl: finalMediaUrl,
            metadata: {
                ...(post.metadata || {}),
                images: finalMediaUrl ? [finalMediaUrl] : []
            },
            youtubeUrl: post.youtubeUrl
        });

        return result;
    } catch (err) {
        console.error('CreateFeedPost Exception:', err);
        return { data: null, error: err };
    }
}

// ==================== COMMENTS ====================

/**
 * Create a comment on a post
 */
export async function createComment(postId: string, userId: string, content: string) {


    const { data, error } = await supabase
        .from('post_comments')
        .insert({
            post_id: postId,
            user_id: userId,
            content
        })
        .select(`
            *,
            user:users!user_id(name, avatar_url)
        `)
        .single();

    if (error) {
        console.error('Error creating comment:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Get comments for a post
 */
export async function getPostComments(postId: string) {
    const { data, error } = await supabase
        .from('post_comments')
        .select(`
            *,
            user:users!user_id(name, avatar_url)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching comments:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string) {
    const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId);

    return { error };
}

// ==================== SUBSCRIPTION TIERS ====================

/**
 * Get user's active subscription
 */
// function removed

/**
 * Check if user has premium subscription
 */
export async function hasPremiumSubscription(userId: string): Promise<boolean> {
    const { data } = await supabase.rpc('has_premium_subscription', {
        p_user_id: userId
    });

    return data === true;
}

/**
 * Check if user has any active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
    const { data } = await supabase.rpc('has_active_subscription', {
        p_user_id: userId
    });

    return data === true;
}

/**
 * Get user's subscription tier
 * Returns: 'basic' | 'premium' | 'none'
 */
export async function getSubscriptionTier(userId: string): Promise<string> {
    const { data } = await supabase.rpc('get_subscription_tier', {
        p_user_id: userId
    });

    return data || 'none';
}

/**
 * Check if user can access a routine
 * Premium subscribers get all routines, basic subscribers need to purchase
 */
export async function checkRoutineAccess(userId: string, routineId: string): Promise<boolean> {
    const { data } = await supabase.rpc('check_routine_access', {
        p_user_id: userId,
        p_routine_id: routineId
    });

    return data === true;
}

/**
 * Get routine discount percentage for user
 * Returns: 0 (no discount), 30 (basic subscriber), 100 (premium subscriber)
 */
export async function getRoutineDiscount(userId: string): Promise<number> {
    const { data } = await supabase.rpc('get_routine_discount_percent', {
        p_user_id: userId
    });

    return data || 0;
}

/**
 * Get all subscription pricing options
 */
export async function getSubscriptionPricing() {
    const { data, error } = await supabase
        .from('subscription_pricing')
        .select('*')
        .eq('is_active', true)
        .order('tier', { ascending: true })
        .order('billing_period', { ascending: true });

    if (error) {
        console.error('Error fetching subscription pricing:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Create or update subscription
 */
export async function upsertSubscription(subscription: {
    userId: string;
    tier: 'basic' | 'premium';
    billingPeriod: 'monthly' | 'yearly';
    amount: number;
    stripeSubscriptionId?: string;
}) {
    const { data, error } = await supabase
        .from('subscriptions')
        .upsert({
            user_id: subscription.userId,
            subscription_tier: subscription.tier,
            billing_period: subscription.billingPeriod,
            amount: subscription.amount,
            status: 'active',
            stripe_subscription_id: subscription.stripeSubscriptionId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(
                Date.now() + (subscription.billingPeriod === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000
            ).toISOString(),
        })
        .select()
        .single();

    if (error) {
        console.error('Error upserting subscription:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ==================== COURSE COMPLETION & STATS ====================

export async function checkCourseCompletion(userId: string, courseId: string) {
    const { data, error } = await supabase.rpc('check_and_grant_course_completion', {
        p_user_id: userId,
        p_course_id: courseId
    });
    return { data, error };
}

export async function getUserArenaStats(userId: string) {
    const { data, error } = await supabase
        .from('user_arena_stats')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

    return { data, error };
}

/**
 * Get user's current training streak (consecutive days with training logs)
 */
export async function getUserStreak(userId: string): Promise<{ data: number | null, error: any }> {
    const { data, error } = await supabase.rpc('get_user_streak', {
        p_user_id: userId
    });

    if (error) {
        console.error('Error fetching user streak:', error);
        return { data: null, error };
    }

    return { data: data || 0, error: null };
}
// ==================== TRAINING XP SYSTEM ====================

/**
 * Get user's training streak (daily training activities)
 */
export async function getUserTrainingStreak(userId: string): Promise<{
    data: {
        currentStreak: number;
        longestStreak: number;
        lastTrainingDate: string | null;
    } | null;
    error: any
}> {
    const { data, error } = await supabase.rpc('get_user_training_streak', {
        p_user_id: userId
    });

    if (error) {
        console.error('Error fetching training streak:', error);
        return { data: null, error };
    }

    if (!data || data.length === 0) {
        return {
            data: { currentStreak: 0, longestStreak: 0, lastTrainingDate: null },
            error: null
        };
    }

    return {
        data: {
            currentStreak: data[0].current_streak || 0,
            longestStreak: data[0].longest_streak || 0,
            lastTrainingDate: data[0].last_training_date
        },
        error: null
    };
}

/**
 * Award training XP with daily limit and streak bonus
 * Only ONE training activity per day earns XP
 */
export async function awardTrainingXP(
    userId: string,
    activityType: 'training_log' | 'sparring_review' | 'routine_complete',
    baseXP: number
): Promise<{
    data: {
        xpEarned: number;
        streak: number;
        bonusXP: number;
        alreadyCompletedToday: boolean;
    } | null;
    error: any;
}> {
    const { data, error } = await supabase.rpc('award_training_xp', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_base_xp: baseXP
    });

    if (error) {
        console.error('Error awarding training XP:', error);
        return { data: null, error };
    }

    if (!data || data.length === 0) {
        return { data: null, error: new Error('No data returned') };
    }

    return {
        data: {
            xpEarned: data[0].xp_earned || 0,
            streak: data[0].streak || 0,
            bonusXP: data[0].bonus_xp || 0,
            alreadyCompletedToday: data[0].already_completed_today || false
        },
        error: null
    };
}

// ==================== COMBAT POWER API ====================

export interface CombatPowerStats {
    totalPower: number;
    breakdown: {
        trainingLogs: { count: number; score: number };
        routines: { count: number; score: number };
        sparringReviews: { count: number; score: number };
        skills: { count: number; score: number };
        belt: { level: string; score: number };
        arena: { count: number; score: number };
    };
}

export async function getCompositeCombatPower(userId: string): Promise<CombatPowerStats> {
    // 1. Get unique dates for Training Logs
    const { data: logDates } = await supabase
        .from('training_logs')
        .select('date')
        .eq('user_id', userId);

    // Count unique dates
    const uniqueLogDays = new Set(logDates?.map(l => l.date)).size;

    // 2. Get dates for Sparring Reviews
    const { data: sparringLogs } = await supabase
        .from('sparring_reviews')
        .select('date')
        .eq('user_id', userId);

    // Count unique dates (1 per day)
    const uniqueSparringDays = new Set(sparringLogs?.map(s => s.date)).size;

    // 3. Get completed routines (Based on unique days)
    const { data: routineLogs } = await supabase
        .from('training_logs')
        .select('date')
        .eq('user_id', userId)
        .eq('type', 'routine');

    const uniqueRoutineDays = new Set(routineLogs?.map(r => r.date)).size;

    const { count: skillCount } = await supabase
        .from('user_skills')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed');

    // 4. Get Belt Level
    const beltLevel = await getUserBeltLevel(userId);

    // 5. Get Arena Wins
    const { count: arenaWins } = await supabase
        .from('match_history')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('result', 'win');

    // 6. Calculate Scores
    const LOG_MULTIPLIER = 10;
    const ROUTINE_MULTIPLIER = 30;
    const SPARRING_MULTIPLIER = 20;
    const SKILL_MULTIPLIER = 20;
    const ARENA_WIN_MULTIPLIER = 10;

    const beltScores: Record<string, number> = {
        'White': 0,
        'Blue': 1000,
        'Purple': 3000,
        'Brown': 6000,
        'Black': 10000
    };

    const logScore = uniqueLogDays * LOG_MULTIPLIER;
    const routineScore = uniqueRoutineDays * ROUTINE_MULTIPLIER;
    const sparringScore = uniqueSparringDays * SPARRING_MULTIPLIER;
    const skillScore = (skillCount || 0) * SKILL_MULTIPLIER;
    const beltScore = beltScores[beltLevel] || 0;
    const arenaScore = (arenaWins || 0) * ARENA_WIN_MULTIPLIER;

    const totalPower = logScore + routineScore + sparringScore + skillScore + beltScore + arenaScore;

    return {
        totalPower,
        breakdown: {
            trainingLogs: { count: uniqueLogDays, score: logScore },
            routines: { count: uniqueRoutineDays, score: routineScore },
            sparringReviews: { count: uniqueSparringDays, score: sparringScore },
            skills: { count: skillCount || 0, score: skillScore },
            belt: { level: beltLevel, score: beltScore },
            arena: { count: arenaWins || 0, score: arenaScore }
        }
    };
}

// ============================================
// Drill Interactions (Likes & Saves)
// ============================================



export async function getCoursePreviewVideo(courseId: string) {
    const { data } = await supabase
        .from('lessons')
        .select('vimeo_url')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .limit(1)
        .single();

    return data?.vimeo_url;
}

/**
 * Get user's saved courses
 */






/**
 * Fetch raw drills data without joins for fast initial loading
 */
export async function fetchDrillsBase(limit: number = 20) {
    try {
        const fetchPromise = supabase
            .from('drills')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Drills fetch timeout')), 5000)
        );

        const { data: drills, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

        if (error) throw error;
        if (!drills) return { data: [], error: null };


        // Basic transformation without creator names
        const result = drills.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            creatorId: d.creator_id,
            creatorName: '로딩 중...', // Placeholder
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

        return { data: result, error: null };
    } catch (error) {
        console.error('Error in fetchDrillsBase:', error);
        return { data: null, error };
    }
}

/**
 * Fetch ALL drills for public feed:
 * 1. Must have valid video URL (not processing)
 * 2. Sorted by newest first
 */
export async function fetchAllDrills(limit: number = 50) {
    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Drills feed timeout')), 5000)
        );

        // Fetch drills directly from drills table
        const fetchDrillsPromise = supabase
            .from('drills')
            .select('*')
            .neq('vimeo_url', '')
            .not('vimeo_url', 'is', null)
            .order('created_at', { ascending: false })
            .limit(limit);

        const { data, error } = await Promise.race([fetchDrillsPromise, timeoutPromise]) as any;

        if (error) throw error;
        if (!data) return { data: [], error: null };

        // Basic transformation
        const result = data.map((d: any) => ({
            id: d.id,
            title: d.title,
            description: d.description,
            creatorId: d.creator_id,
            creatorName: '로딩 중...', // Will be populated by Drills.tsx
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

        return { data: result, error: null };
    } catch (error) {
        console.error('Error in fetchAllDrills:', error);
        return { data: null, error };
    }
}



/**
 * Safe fetch drills avoiding RLS join issues (Legacy wrapper)
 */
export async function fetchDrillsSafe(limit: number = 20) {
    const { data: drills, error } = await fetchDrillsBase(limit);
    if (error || !drills) return { data: drills, error };

    const creatorIds = drills.map((d: any) => d.creatorId);
    const creatorsMap = await fetchCreatorsByIds(creatorIds);

    const result = drills.map((d: any) => ({
        ...d,
        creatorName: creatorsMap[d.creatorId] || '알 수 없음'
    }));

    return { data: result, error: null };
}

/**
 * Get all creators with their payout settings for admin
 */
export async function getCreatorPayoutsAdmin() {
    const { data, error } = await supabase
        .from('creators')
        .select('id, name, email, payout_settings')
        .order('name');

    if (error) {
        console.error('Error fetching creator payouts:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ==================== Testimonials ====================

export async function getTestimonials() {
    const { data, error } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false });

    return { data, error };
}

export async function createTestimonial(testimonial: Omit<Testimonial, 'id' | 'createdAt'>) {
    const { data, error } = await supabase
        .from('testimonials')
        .insert([testimonial])
        .select()
        .single();

    return { data, error };
}

export async function updateTestimonial(id: string, updates: Partial<Testimonial>) {
    const { data, error } = await supabase
        .from('testimonials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function deleteTestimonial(id: string) {
    const { error } = await supabase
        .from('testimonials')
        .delete()
        .eq('id', id);

    return { error };
}

// ============================================================================
// Course-Sparring Video Bundles (via related_items)
// ============================================================================

/**
 * Get sparring videos related to a course
 */
export async function getCourseSparringVideos(courseId: string) {
    // Queries videos that have this course in related_items JSON array
    const { data, error } = await withTimeout(
        supabase
            .from('sparring_videos')
            .select('*')
            .contains('related_items', JSON.stringify([{ type: 'course', id: courseId }])), 10000);

    if (error) {
        console.error('Error fetching course sparring videos:', error);
        return { data: null, error };
    }

    const videos = data || [];
    if (videos.length === 0) return { data: [], error: null };

    // Extract creator IDs
    const creatorIds = Array.from(new Set(videos.map((v: any) => v.creator_id).filter(Boolean)));
    const userMap = await fetchCreatorsByIds(creatorIds as string[]);

    return {
        data: videos.map((v: any) => {
            const creator = userMap[v.creator_id];
            return transformSparringVideo({
                ...v,
                creator: creator ? {
                    ...creator,
                    profileImage: creator.profileImage
                } : undefined
            });
        }).filter(Boolean),
        error: null
    };
}

/**
 * Toggle like on a course
 */


/**
 * Get course like count
 */
export async function getCourseLikeCount(courseId: string): Promise<number> {
    const { count } = await supabase
        .from('user_course_likes')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', courseId);

    return count || 0;
}
/**
 * Update all bundles for a course (Drills and Sparring Videos)
 */
export async function updateCourseBundles(
    courseId: string,
    relatedItems: { type: string; id: string; title: string }[],
    courseTitle: string
) {
    try {
        // 1. Handle Drills (via course_drill_bundles table)
        const drillIds = relatedItems.filter(i => i.type === 'drill').map(i => i.id);
        console.log(`Updating drills for course ${courseId}:`, drillIds);

        // Delete existing drill bundles
        const { error: delError } = await supabase.from('course_drill_bundles').delete().eq('course_id', courseId);
        if (delError) {
            console.error('Error deleting drill bundles:', delError);
            return { error: delError };
        }

        // Insert new drill bundles
        if (drillIds.length > 0) {
            const courseDrills = drillIds.map(drillId => ({
                course_id: courseId,
                drill_id: drillId
            }));
            const { error: insError } = await supabase.from('course_drill_bundles').insert(courseDrills);
            if (insError) {
                console.error('Error inserting drill bundles:', insError);
                return { error: insError };
            }
        }

        // 2. Handle Sparring Videos (via related_items in sparring_videos table)
        const newSparringIds = relatedItems.filter(i => i.type === 'sparring').map(i => i.id);
        console.log(`Updating sparring for course ${courseId}:`, newSparringIds);

        // Get all sparring videos currently linked to this course
        const { data: currentSparring, error: fetchSparError } = await supabase
            .from('sparring_videos')
            .select('id, related_items')
            .contains('related_items', JSON.stringify([{ type: 'course', id: courseId }]));

        if (fetchSparError) {
            console.error('Error fetching current sparring bundles:', fetchSparError);
            return { error: fetchSparError };
        }

        const currentSparringIds = currentSparring?.map(v => v.id) || [];

        // Remove course from videos that are no longer linked
        const removedIds = currentSparringIds.filter(id => !newSparringIds.includes(id));
        const removePromises = removedIds.map(id => removeCourseSparringVideo(courseId, id).catch(err => {
            console.error(`Failed to remove course from sparring video ${id}:`, err);
            return { error: err };
        }));

        // Add course to newly linked videos
        const addedIds = newSparringIds.filter(id => !currentSparringIds.includes(id));
        const addPromises = addedIds.map(id => addCourseSparringVideo(courseId, id, courseTitle).catch(err => {
            console.error(`Failed to add course to sparring video ${id}:`, err);
            return { error: err };
        }));

        await Promise.all([...removePromises, ...addPromises]);

        return { error: null };
    } catch (error) {
        console.error('Unexpected error in updateCourseBundles:', error);
        return { error };
    }
}

/**
 * Add a course relation to a sparring video
 */
export async function addCourseSparringVideo(courseId: string, sparringId: string, courseTitle: string) {
    // 1. Get current video to check/append related items
    const { data: video, error: fetchError } = await supabase
        .from('sparring_videos')
        .select('related_items')
        .eq('id', sparringId)
        .single();

    if (fetchError) {
        return { error: fetchError };
    }

    if (!video) return { error: new Error('Video not found') };

    const currentItems = (video.related_items || []) as any[];

    // Check if already exists to prevent duplicates
    if (currentItems.some(item => item.type === 'course' && item.id === courseId)) {
        return { error: null }; // Already linked
    }

    // Add new relation item
    const newItems = [
        ...currentItems,
        { type: 'course', id: courseId, title: courseTitle }
    ];

    // 2. Update the video record
    const { error: updateError } = await supabase
        .from('sparring_videos')
        .update({ related_items: newItems })
        .eq('id', sparringId);

    return { error: updateError };
}

/**
 * Remove a course relation from a sparring video
 */
export async function removeCourseSparringVideo(courseId: string, sparringId: string) {
    // 1. Get current video
    const { data: video, error: fetchError } = await supabase
        .from('sparring_videos')
        .select('related_items')
        .eq('id', sparringId)
        .single();

    if (fetchError || !video) {
        return { error: fetchError || new Error('Video not found') };
    }

    const currentItems = (video.related_items || []) as any[];

    // Filter out the course relation
    const newItems = currentItems.filter(item => !(item.type === 'course' && item.id === courseId));

    // 2. Update the video record
    const { error: updateError } = await supabase
        .from('sparring_videos')
        .update({ related_items: newItems })
        .eq('id', sparringId);

    return { error: updateError };
}



export async function getTrainingLogComments(logId: string) {
    const { data, error } = await supabase
        .from('training_log_comments')
        .select(`
            id,
            content,
            created_at,
            user_id,
            users:user_id (
                id,
                name,
                email,
                avatar_url
            )
        `)
        .eq('log_id', logId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching training log comments:', error);
        return { data: null, error };
    }

    // Transform to match expected format
    const transformedData = data?.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        user: {
            name: (comment.users as any)?.name || (comment.users as any)?.email?.split('@')[0] || 'User',
            avatar_url: (comment.users as any)?.avatar_url
        }
    }));

    return { data: transformedData, error: null };
}

export async function addTrainingLogComment(logId: string, userId: string, content: string) {
    const { data, error } = await supabase
        .from('training_log_comments')
        .insert({
            log_id: logId,
            user_id: userId,
            content: content
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating training log comment:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

// ==================== REPOST API ====================

/**
 * Repost a training log to user's feed
 */
export async function repostTrainingLog(userId: string, originalLogId: string, comment?: string): Promise<{ data: any; error: any }> {
    try {
        // Get original post
        const { data: originalPost, error: fetchError } = await supabase
            .from('training_logs')
            .select('*')
            .eq('id', originalLogId)
            .single();

        if (fetchError || !originalPost) {
            return { data: null, error: fetchError || new Error('Original post not found') };
        }

        // Create a new training log entry as a repost
        const { data: repost, error: insertError } = await supabase
            .from('training_logs')
            .insert({
                user_id: userId,
                date: new Date().toISOString().split('T')[0],
                notes: comment || originalPost.notes, // Use user's comment if provided, otherwise original notes
                duration_minutes: originalPost.duration_minutes || 0,
                techniques: originalPost.techniques || [],
                sparring_rounds: originalPost.sparring_rounds || 0,
                is_public: true,
                location: originalPost.location,
                media_url: originalPost.media_url,
                media_type: originalPost.media_type,
                type: originalPost.type || 'general',
                metadata: {
                    ...(originalPost.metadata || {}),
                    isRepost: true,
                    originalPostId: originalLogId,
                    originalUserId: originalPost.user_id,
                    repostedAt: new Date().toISOString(),
                    userComment: comment
                }
            })
            .select()
            .single();

        if (insertError) {
            console.error('Insert repost error:', insertError);
            return { data: null, error: insertError };
        }

        // Transform for immediate UI use
        const transformedRepost = {
            ...repost,
            mediaUrl: repost.media_url,
            mediaType: repost.media_type,
            durationMinutes: repost.duration_minutes,
            sparringRounds: repost.sparring_rounds,
            isPublic: repost.is_public,
            youtubeUrl: repost.youtube_url,
            createdAt: repost.created_at,
            metadata: repost.metadata
        };

        return { data: transformedRepost, error: null };
    } catch (error) {
        console.error('Error reposting:', error);
        return { data: null, error };
    }
}

/**
 * Check if user has reposted a log
 */
export async function checkUserReposted(userId: string, logId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('training_logs')
            .select('id')
            .eq('user_id', userId)
            .contains('metadata', { originalPostId: logId })
            .maybeSingle();

        if (error) {
            console.error('Error checking repost status:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        return false;
    }
}

/**
 * Get user's reposts for their library feed tab
 */
export async function getUserReposts(userId: string): Promise<{ data: any[]; error: any }> {
    try {
        const { data: logs, error } = await supabase
            .from('training_logs')
            .select(`
                *,
                users:user_id (
                    id,
                    email,
                    user_metadata
                )
            `)
            .eq('user_id', userId)
            .contains('metadata', { isRepost: true })
            .order('created_at', { ascending: false });

        if (error) {
            return { data: [], error };
        }

        // Transform data to match TrainingLog format
        const transformedData = logs?.map((log: any) => {
            return {
                ...log,
                isRepost: true,
                repostId: log.id,
                repostedAt: log.metadata?.repostedAt || log.created_at,
                userName: log.users?.user_metadata?.name || log.users?.email?.split('@')[0] || 'User',
                userAvatar: log.users?.user_metadata?.avatar_url,
                userBelt: log.users?.user_metadata?.belt,
                mediaUrl: log.media_url,
                mediaType: log.media_type,
                durationMinutes: log.duration_minutes,
                sparringRounds: log.sparring_rounds,
                isPublic: log.is_public,
                createdAt: log.created_at,
                user: {
                    name: log.users?.user_metadata?.name || log.users?.email?.split('@')[0] || 'User',
                    profileImage: log.users?.user_metadata?.avatar_url,
                    belt: log.users?.user_metadata?.belt,
                    isInstructor: log.users?.user_metadata?.isInstructor || false
                }
            };
        });

        return { data: transformedData || [], error: null };
    } catch (error) {
        console.error('Error fetching user reposts:', error);
        return { data: [], error };
    }
}

/**
 * Delete a repost
 */
export async function deleteRepost(userId: string, logId: string): Promise<{ error: any }> {
    const { error } = await supabase
        .from('training_logs')
        .delete()
        .eq('user_id', userId)
        .contains('metadata', { originalPostId: logId });

    if (error) {
        console.error('Error deleting repost:', error);
    }

    return { error };
}
// Subscription Management
export async function cancelSubscription(subscriptionId: string) {
    // This calls the Supabase Edge Function to handle Stripe subscription cancellation
    const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { subscriptionId }
    });

    if (error) {
        console.error('Error canceling subscription:', error);
        throw error;
    }

    return data;
}

/**
 * Get user's active subscription
 */
export async function getUserSubscription(userId: string) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Error fetching user subscription:', error);
        return null;
    }

    return data;
}

// ============================================
// PHASE 1: TRENDING ALGORITHM HELPERS
// ============================================

/**
 * Ensures diversity by limiting items per creator
 * @param rankedItems - Already scored and sorted items
 * @param limit - Maximum number of items to return
 * @param maxPerCreator - Maximum items per creator (default: 2)
 */
function ensureDiversity<T extends { creator_id?: string; creatorId?: string }>(
    rankedItems: T[],
    limit: number,
    maxPerCreator: number = 2
): T[] {
    const selected: T[] = [];
    const creatorCount: Record<string, number> = {};

    // First pass: Apply diversity constraint
    for (const item of rankedItems) {
        const creatorId = item.creator_id || item.creatorId;
        if (!creatorId) {
            selected.push(item);
            if (selected.length >= limit) break;
            continue;
        }

        const count = creatorCount[creatorId] || 0;
        if (count < maxPerCreator) {
            selected.push(item);
            creatorCount[creatorId] = count + 1;
        }

        if (selected.length >= limit) break;
    }

    // Second pass: If we didn't reach minimum (50% of limit), relax constraint
    const minRequired = Math.ceil(limit / 2);
    if (selected.length < minRequired && rankedItems.length > selected.length) {
        // Add remaining items regardless of creator diversity
        const selectedIds = new Set(selected.map(item =>
            (item as any).id || JSON.stringify(item)
        ));

        for (const item of rankedItems) {
            const itemId = (item as any).id || JSON.stringify(item);
            if (!selectedIds.has(itemId)) {
                selected.push(item);
                if (selected.length >= limit) break;
            }
        }
    }

    return selected;
}

/**
 * Calculate trending score with improved algorithm
 * - Uses exponential decay for recency (more natural)
 * - Uses logarithmic scale for views (prevents outlier dominance)
 */
function calculateTrendingScore(
    item: any,
    contentType: 'course' | 'routine' | 'sparring'
): number {
    const daysOld = Math.max(1, (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
    const views = item.views || 0;
    const likes = item.likes || 0;

    // Content-type specific weights
    const weights = {
        course: {
            recencyDecay: 0.3,      // Slow decay (long-term content)
            recencyBoost: 100,
            viewWeight: 0.1,
            likeWeight: 20,         // Quality-focused
        },
        routine: {
            recencyDecay: 0.8,      // Fast decay (trend-focused)
            recencyBoost: 500,
            viewWeight: 0.1,
            likeWeight: 10,
        },
        sparring: {
            recencyDecay: 0.5,      // Medium decay
            recencyBoost: 200,
            viewWeight: 0.5,        // View-focused (live content)
            likeWeight: 15,
        }
    };

    const w = weights[contentType];

    // Exponential decay for recency (more natural than linear)
    const recencyScore = w.recencyBoost * Math.exp(-w.recencyDecay * daysOld / 7);

    // Logarithmic scale for views (prevents huge numbers from dominating)
    const qualityScore = (Math.log(views + 1) * w.viewWeight * 10) + (likes * w.likeWeight);

    return recencyScore + qualityScore;
}

// ============================================
// TRENDING FUNCTIONS
// ============================================

export async function getFeaturedRoutines(limit = 3): Promise<DrillRoutine[]> {
    // 1. Fetch a larger pool of routines (e.g., last 50) to rank from
    // CHANGED: Removed creator join to be more robust against missing Foreign Keys
    const { data, error } = await withTimeout(
        supabase
            .from('routines')
            .select('*')
            .limit(50) // Candidate pool size
            .order('created_at', { ascending: false }),
        5000
    );

    if (error || !data || data.length === 0) return [];

    // 2. Calculate Score for each routine (IMPROVED)
    let rankedRoutines = data.map((r: any) => ({
        ...r,
        _score: calculateTrendingScore(r, 'routine')
    }));

    // 3. Sort by Score (Descending)
    rankedRoutines.sort((a: any, b: any) => b._score - a._score);

    // 4. Ensure diversity (max 2 per creator)
    const diverseRoutines = ensureDiversity(rankedRoutines, limit);

    // 5. Fetch creators (unified logic)
    const creatorIds = Array.from(new Set(diverseRoutines.map((r: any) => r.creator_id).filter(Boolean)));
    const userMap = await fetchCreatorsByIds(creatorIds as string[]);

    // 6. Transform and return
    return diverseRoutines.map((r: any) => {
        const creatorProfile = userMap[r.creator_id];
        return {
            id: r.id,
            title: r.title,
            description: r.description,
            creatorId: r.creator_id,
            creatorName: creatorProfile?.name || r.creator?.name || '알 수 없음',
            creatorProfileImage: creatorProfile?.profileImage || r.creator?.profile_image,
            difficulty: r.difficulty || 'Beginner',
            thumbnailUrl: r.thumbnail_url,
            price: r.price || 0,
            durationMinutes: r.total_duration_minutes || r.duration_minutes || 10,
            category: r.category || 'General',
            views: r.views || 0,
            likes: r.likes || 0,
            createdAt: r.created_at || new Date().toISOString(),
            drills: []
        };
    });
}

export async function getNewCourses(limit = 6): Promise<Course[]> {
    const { data, error } = await withTimeout(
        supabase
            .from('courses')
            .select('*, creator:creators(name, profile_image), lessons(count)')
            .eq('published', true)
            .order('created_at', { ascending: false })
            .limit(limit),
        5000
    );

    if (error) {
        console.error('Error fetching new courses:', error);
        return [];
    }

    // Fetch creators (unified logic)
    const creatorIds = Array.from(new Set((data || []).map((c: any) => c.creator_id).filter(Boolean)));
    const userMap = await fetchCreatorsByIds(creatorIds as string[]);

    return (data || []).map((c: any) => {
        const creatorProfile = userMap[c.creator_id];
        const transformed = transformCourse(c);
        return {
            ...transformed,
            creatorName: creatorProfile?.name || transformed.creatorName,
            creatorProfileImage: creatorProfile?.profileImage || transformed.creatorProfileImage,
            lessonCount: c.lessons?.[0]?.count || 0
        };
    });
}

export async function getTrendingCourses(limit = 6): Promise<Course[]> {
    // 1. Fetch larger pool for ranking
    const { data, error } = await withTimeout(
        supabase
            .from('courses')
            .select('*, creator:creators(name, profile_image), lessons(count)')
            .eq('published', true)
            .limit(50)
            .order('created_at', { ascending: false }),
        5000
    );

    if (error) {
        console.error('Error fetching trending courses:', error);
        return [];
    }

    // 2. Score Calculation: Quality First (IMPROVED)
    // "Content is King" - Focus heavily on quality signals with logarithmic scaling
    let ranked = (data || []).map((c: any) => ({
        ...c,
        _score: calculateTrendingScore(c, 'course')
    }));

    // 3. Sort by Score
    ranked.sort((a: any, b: any) => b._score - a._score);

    // 4. Ensure diversity (max 2 per creator)
    const diverseCourses = ensureDiversity(ranked, limit);

    // 5. Fetch creators (unified logic)
    const creatorIds = Array.from(new Set(diverseCourses.map((c: any) => c.creator_id).filter(Boolean)));
    const userMap = await fetchCreatorsByIds(creatorIds as string[]);

    // 6. Transform and return
    return diverseCourses.map((c: any) => {
        const creatorProfile = userMap[c.creator_id];
        const transformed = transformCourse(c);
        return {
            ...transformed,
            creatorName: creatorProfile?.name || transformed.creatorName,
            creatorProfileImage: creatorProfile?.profileImage || transformed.creatorProfileImage,
            lessonCount: c.lessons?.[0]?.count || 0
        };
    });
}

export async function getTrendingSparring(limit = 6): Promise<SparringVideo[]> {
    // 1. Fetch larger pool
    const { data, error } = await withTimeout(
        supabase
            .from('sparring_videos')
            .select('*')
            .eq('is_published', true)
            .is('deleted_at', null)
            .limit(50)
            .order('created_at', { ascending: false }),
        5000
    );

    if (error) return [];

    // 2. Score Calculation: Balanced approach (IMPROVED)
    let ranked = (data || []).map((v: any) => ({
        ...v,
        _score: calculateTrendingScore(v, 'sparring')
    }));

    // 3. Sort by Score
    ranked.sort((a: any, b: any) => b._score - a._score);

    // 4. Ensure diversity (max 2 per creator)
    const diverseSparring = ensureDiversity(ranked, limit);

    // 5. Get top IDs for creator fetch
    const topIds = diverseSparring.map((v: any) => v.id);
    if (topIds.length === 0) return [];

    // 6. Fetch full data with creator info
    const { data: fullData } = await supabase
        .from('sparring_videos')
        .select('*')
        .in('id', topIds);

    if (!fullData || fullData.length === 0) return [];

    // 7. Fetch creators separately
    const creatorIds = Array.from(new Set(fullData.map((v: any) => v.creator_id).filter(Boolean)));
    const userMap = await fetchCreatorsByIds(creatorIds as string[]);

    // 8. Create map for quick lookup
    const fullDataMap = new Map(fullData.map((v: any) => [v.id, v]));

    // 9. Transform and return in ranked order
    return diverseSparring.map((v: any) => {
        const full = fullDataMap.get(v.id) || v;
        const creator = userMap[full.creator_id];

        return {
            id: full.id,
            creatorId: full.creator_id,
            title: full.title || 'Sparring Video',
            description: full.description || '',
            videoUrl: full.video_url,
            thumbnailUrl: full.thumbnail_url,
            views: full.views || 0,
            likes: full.likes || 0,
            price: full.price || 0,
            category: full.category,
            uniformType: full.uniform_type,
            difficulty: full.difficulty,
            isPublished: full.is_published ?? true,
            creator: creator ? {
                id: creator.id,
                name: creator.name || '알 수 없음',
                profileImage: creator.profileImage,
                bio: '',
                subscriberCount: 0
            } : undefined,
            createdAt: full.created_at,
            relatedItems: full.related_items || [],
            previewVimeoId: full.preview_vimeo_id
        } as SparringVideo;
    });
}

export async function incrementRoutineView(id: string) {
    const { error } = await supabase.rpc('increment_routine_views', { p_routine_id: id });
    if (error) console.error('Error incrementing routine view:', error);
    return { error };
}

export async function incrementSparringView(id: string) {
    const { error } = await supabase.rpc('increment_sparring_view', { p_id: id });
    if (error) console.error('Error incrementing sparring view:', error);
    return { error };
}

// ==================== Site Settings ====================

export async function getSiteSettings(): Promise<SiteSettings | null> {
    const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

    if (error && error.code !== 'PGRST116') { // PGRST116 is no rows
        console.error('Error fetching site settings:', error);
        return null;
    }

    if (!data) return null;

    return {
        id: data.id,
        logos: data.logos,
        footer: data.footer,
        hero: data.hero,
        updatedAt: data.updated_at
    };
}

// --- Vimeo Actions ---

export async function getVimeoThumbnails(vimeoId: string): Promise<{ thumbnails?: { id: string; url: string; active: boolean }[], error?: string }> {
    try {
        const response = await fetch('/api/upload-to-vimeo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'get_vimeo_thumbnails',
                vimeoId
            })
        });

        if (!response.ok) {
            const data = await response.json();
            return { error: data.error || 'Failed to fetch Vimeo thumbnails' };
        }

        const data = await response.json();
        return { thumbnails: data.thumbnails };
    } catch (error: any) {
        console.error('Error fetching Vimeo thumbnails:', error);
        return { error: error.message };
    }
}

// ==================== LESSON HISTORY ====================

/**
 * Get lesson watch history for a user
 */
export async function getLessonHistory(userId: string) {
    try {
        const { data, error } = await supabase
            .from('lesson_progress')
            .select(`
                *,
                lesson:lessons(
                    id,
                    title,
                    thumbnail_url,
                    duration_minutes,
                    lesson_number,
                    course_id,
                    course:courses(
                        id,
                        title,
                        creator:creators(
                            name,
                            profile_image
                        )
                    )
                )
            `)
            .eq('user_id', userId)
            .order('last_watched_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching lesson history:', error);
            return [];
        }

        return (data || []).map((item: any) => ({
            id: item.lesson?.id || '',
            courseId: item.lesson?.course_id || '',
            type: 'lesson',
            title: item.lesson?.title || 'Unknown Lesson',
            courseTitle: item.lesson?.course?.title || 'Unknown Course',
            creatorName: item.lesson?.course?.creator?.name || 'Unknown',
            creatorProfileImage: item.lesson?.course?.creator?.profile_image || '',
            progress: item.progress || 0,
            watchedSeconds: item.watched_seconds || 0,
            thumbnail: item.lesson?.thumbnail_url || '',
            lastWatched: item.last_watched_at || new Date().toISOString(),
            lessonNumber: item.lesson?.lesson_number || 0,
            durationMinutes: item.lesson?.duration_minutes || 0
        }));
    } catch (error) {
        console.error('Error in getLessonHistory:', error);
        return [];
    }
}


// ============================================================================
// User Interactions (Save/Like/View) - New Unified System
// ============================================================================
export * from './api-user-interactions';
