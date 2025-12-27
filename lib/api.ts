
import { supabase } from './supabase';
import { Creator, Video, Course, Lesson, TrainingLog, UserSkill, SkillCategory, SkillStatus, BeltLevel, Bundle, Coupon, SkillSubcategory, FeedbackSettings, FeedbackRequest, AppNotification, Difficulty, Drill, DrillRoutine, DrillRoutineItem, Title, VideoCategory, SparringReview, Testimonial, SparringVideo } from '../types';


// Revenue split constants
export const DIRECT_PRODUCT_CREATOR_SHARE = 0.8; // 80% to creator for individual product sales
export const DIRECT_PRODUCT_PLATFORM_SHARE = 0.2;
export const SUBSCRIPTION_CREATOR_SHARE = 0.8; // 80% to creator for subscription revenue
export const SUBSCRIPTION_PLATFORM_SHARE = 0.2;



function transformCreator(data: any): Creator {
    return {
        id: data.id,
        name: data.name,
        bio: data.bio,
        profileImage: data.profile_image,
        subscriberCount: data.subscriber_count,
    };
}

function transformVideo(data: any): Video {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator?.name || 'Unknown',
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        vimeoUrl: data.vimeo_url,
        length: data.length,
        price: data.price,
        views: data.views,
        createdAt: data.created_at,
    };
}

function transformCourse(data: any): Course {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator?.name || 'Unknown',
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        price: data.price,
        views: data.views,
        lessonCount: data.lesson_count,
        createdAt: data.created_at,
        isSubscriptionExcluded: data.is_subscription_excluded,
        published: data.published,
    };
}

function transformLesson(data: any): Lesson {
    return {
        id: data.id,
        courseId: data.course_id,
        title: data.title,
        description: data.description,
        lessonNumber: data.lesson_number,
        vimeoUrl: data.vimeo_url,
        length: data.length,
        difficulty: data.difficulty,
        createdAt: data.created_at,
    };
}

// Platform Statistics
export async function getPlatformStats() {
    try {
        const [usersResult, coursesResult, routinesResult] = await Promise.all([
            supabase.from('users').select('id', { count: 'exact', head: true }),
            supabase.from('courses').select('id', { count: 'exact', head: true }),
            supabase.from('routines').select('id', { count: 'exact', head: true })
        ]);

        return {
            totalUsers: usersResult.count || 0,
            totalCourses: coursesResult.count || 0,
            totalRoutines: routinesResult.count || 0
        };
    } catch (error) {
        console.error('Error fetching platform stats:', error);
        return {
            totalUsers: 1000,
            totalCourses: 100,
            totalRoutines: 50
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


// Courses API
// Courses API
export async function getCourses(limit: number = 50, offset: number = 0): Promise<Course[]> {
    try {
        const { data, error } = await withTimeout(
            supabase
                .from('courses')
                .select(`
                    *,
                    creator:creators(name, profile_image),
                    lessons:lessons(count)
                `)
                .eq('published', true) // Re-enable published filter
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1),
            5000
        );

        if (error) {
            console.error('getCourses Error Details:', error);
            throw error;
        }

        return (data || []).map((d: any) => ({
            ...transformCourse(d),
            lessonCount: d.lessons?.[0]?.count || 0,
            creatorProfileImage: d.creator?.profile_image || null
        }));
    } catch (e) {
        console.error('getCourses timeout/fail:', e);
        return [];
    }
}

export async function searchContent(query: string) {
    try {
        const searchTerm = `%${query}%`;

        // Parallel fetch
        const [coursesResponse, routinesResponse] = await Promise.all([
            supabase
                .from('courses')
                .select('*, creator:creators(*)')
                .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .eq('published', true)
                .limit(20),
            supabase
                .from('routines')
                .select('*, creator:creators(*)')
                .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
                .limit(20)
        ]);

        if (coursesResponse.error) throw coursesResponse.error;
        if (routinesResponse.error) throw routinesResponse.error;

        return {
            courses: (coursesResponse.data || []).map(transformCourse),
            routines: (routinesResponse.data || []).map(transformDrillRoutine)
        };
    } catch (error) {
        console.error('Error searching content:', error);
        return { courses: [], routines: [] };
    }
}

export async function getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      creator:creators(name),
      lessons:lessons(count),
      preview_lessons:lessons(vimeo_url, lesson_number)
    `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching course:', error);
        return null;
    }

    // Find first lesson for preview
    const firstLesson = data.preview_lessons?.sort((a: any, b: any) => a.lesson_number - b.lesson_number)[0];

    return data ? {
        ...transformCourse(data),
        lessonCount: data.lessons?.[0]?.count || 0,
        previewVideoUrl: firstLesson?.vimeo_url
    } : null;
}

export async function getCoursesByCreator(creatorId: string): Promise<Course[]> {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      creator:creators(name),
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
export async function getLessonsByCourse(courseId: string): Promise<Lesson[]> {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true });

    if (error) {
        console.error('Error fetching lessons:', error);
        throw error;
    }

    return (data || []).map(transformLesson);
}

export async function getLessons(limit: number = 200): Promise<(Lesson & { course?: { title: string } })[]> {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('lesson_number', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('Error fetching all lessons:', error);
        return [];
    }

    // Transform lessons and fetch course titles
    const lessons = (data || []).map(transformLesson);

    // Get unique course IDs
    const courseIds = [...new Set(lessons.map(l => l.courseId).filter(Boolean))];

    if (courseIds.length === 0) {
        return lessons.map(l => ({ ...l, course: undefined }));
    }

    // Fetch course titles
    const { data: courses } = await supabase
        .from('courses')
        .select('id, title')
        .in('id', courseIds);

    const courseMap = new Map((courses || []).map(c => [c.id, c.title]));

    return lessons.map(lesson => ({
        ...lesson,
        course: lesson.courseId ? { title: courseMap.get(lesson.courseId) || 'Unknown Course' } : undefined
    }));
}

export async function getAllCreatorLessons(creatorId: string): Promise<Lesson[]> {
    // Get all courses by this creator first
    const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('creator_id', creatorId);

    const courseIds = courses?.map(c => c.id) || [];

    // Get lessons from two sources:
    // 1. Lessons belonging to creator's courses
    // 2. Standalone lessons (course_id is null) - we need to add creator_id to lessons table for this
    // For now, we'll just get all standalone lessons and filter client-side

    const queries = [];

    // Get lessons from creator's courses
    if (courseIds.length > 0) {
        queries.push(
            supabase
                .from('lessons')
                .select('*')
                .in('course_id', courseIds)
        );
    }

    // Get standalone lessons (course_id is null)
    // TODO: Add creator_id column to lessons table for better filtering
    queries.push(
        supabase
            .from('lessons')
            .select('*')
            .is('course_id', null)
    );

    const results = await Promise.all(queries);
    const allLessons = results.flatMap(r => r.data || []);

    // Remove duplicates and sort by created_at
    const uniqueLessons = Array.from(
        new Map(allLessons.map(lesson => [lesson.id, lesson])).values()
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return uniqueLessons.map(transformLesson);
}

export async function getLessonById(id: string): Promise<Lesson | null> {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching lesson:', error);
        return null;
    }

    return data ? transformLesson(data) : null;
}

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
        .single();

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
        const { data, error } = await supabase
            .from('sparring_videos')
            .select('id, creator_id, title, description, video_url, thumbnail_url, related_items, views, likes, created_at')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching public sparring videos:', error);
            return [];
        }

        // Filter out videos with invalid URLs (FFmpeg errors) and map to SparringVideo type
        const validVideos = (data || [])
            .filter(v => v.video_url && !v.video_url.includes('ERROR'))
            .map(v => ({
                id: v.id,
                creatorId: v.creator_id,
                title: v.title || 'Sparring Video',
                description: v.description || '',
                videoUrl: v.video_url,
                thumbnailUrl: v.thumbnail_url,
                relatedItems: v.related_items || [],
                views: v.views || 0,
                likes: v.likes || 0,
                creator: undefined,
                createdAt: v.created_at
            }));

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

// Sparring Interactions
export async function toggleCreatorFollow(userId: string, creatorId: string): Promise<{ followed: boolean }> {
    // Check if already followed
    const { data } = await supabase
        .from('creator_follows')
        .select('*')
        .eq('follower_id', userId)
        .eq('creator_id', creatorId)
        .maybeSingle();

    if (data) {
        // Unfollow
        await supabase
            .from('creator_follows')
            .delete()
            .eq('follower_id', userId)
            .eq('creator_id', creatorId);
        return { followed: false };
    } else {
        // Follow
        await supabase
            .from('creator_follows')
            .insert({ follower_id: userId, creator_id: creatorId });
        return { followed: true };
    }
}

export async function toggleSparringLike(userId: string, videoId: string): Promise<{ liked: boolean }> {
    // Check if already liked
    const { data } = await supabase
        .from('user_sparring_likes')
        .select('*')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

    if (data) {
        // Unlike
        await supabase
            .from('user_sparring_likes')
            .delete()
            .eq('user_id', userId)
            .eq('video_id', videoId);
        return { liked: false };
    } else {
        // Like
        await supabase
            .from('user_sparring_likes')
            .insert({ user_id: userId, video_id: videoId });
        return { liked: true };
    }
}

export async function getSparringInteractionStatus(userId: string, videoId: string, creatorId: string) {
    const [likeData, followData, saveData] = await Promise.all([
        supabase.from('user_sparring_likes').select('id').eq('user_id', userId).eq('video_id', videoId).maybeSingle(),
        supabase.from('creator_follows').select('id').eq('follower_id', userId).eq('creator_id', creatorId).maybeSingle(),
        supabase.from('user_saved_sparring').select('id').eq('user_id', userId).eq('video_id', videoId).maybeSingle()
    ]);

    return {
        liked: !!likeData.data,
        followed: !!followData.data,
        saved: !!saveData.data
    };
}

export async function toggleSparringSave(userId: string, videoId: string) {
    // Check if already saved
    const { data } = await supabase
        .from('user_saved_sparring')
        .select('id')
        .eq('user_id', userId)
        .eq('video_id', videoId)
        .maybeSingle();

    if (data) {
        // Unsave
        await supabase
            .from('user_saved_sparring')
            .delete()
            .eq('id', data.id);
        return { saved: false };
    } else {
        // Save
        await supabase
            .from('user_saved_sparring')
            .insert({ user_id: userId, video_id: videoId });
        return { saved: true };
    }
}

export async function getSavedSparringVideos(userId: string): Promise<SparringVideo[]> {
    const { data } = await supabase
        .from('user_saved_sparring')
        .select(`
            video_id,
            sparring_videos!inner (
                *,
                creator:creators(*)
            )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (!data) return [];

    // Transform to flat SparringVideo array
    return data.map((item: any) => ({
        ...item.sparring_videos,
        creator: item.sparring_videos.creator,
        // Ensure camelCase
        videoUrl: item.sparring_videos.video_url,
        thumbnailUrl: item.sparring_videos.thumbnail_url,
        creatorId: item.sparring_videos.creator_id,
        relatedItems: item.sparring_videos.related_items || []
    }));
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
        .single();

    if (error) {
        return false;
    }

    return !!data;
}

export async function getUserCourses(userId: string): Promise<Course[]> {
    const { data, error } = await supabase
        .from('user_courses')
        .select(`
      course_id,
      courses (
        *,
        creator:creators(name),
        lessons:lessons(count),
        preview_lessons:lessons(vimeo_url, lesson_number)
      )
    `)
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user courses:', error);
        return [];
    }

    return (data || []).map((item: any) => {
        // Find first lesson for preview
        const firstLesson = item.courses.preview_lessons?.sort((a: any, b: any) => a.lesson_number - b.lesson_number)[0];

        return {
            ...transformCourse(item.courses),
            lessonCount: item.courses.lessons?.[0]?.count || 0,
            previewVideoUrl: firstLesson?.vimeo_url
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
    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('course_id', courseId);

    if (lessonsError || !lessons) {
        return { completed: 0, total: 0, percentage: 0 };
    }

    const total = lessons.length;

    // Get completed lessons
    const { data: progress, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', userId)
        .in('lesson_id', lessons.map(l => l.id))
        .eq('completed', true);

    if (progressError) {
        return { completed: 0, total, percentage: 0 };
    }

    const completed = progress?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
}

export async function updateLastWatched(userId: string, lessonId: string) {
    const { error } = await supabase
        .from('lesson_progress')
        .upsert({
            user_id: userId,
            lesson_id: lessonId,
            last_watched_at: new Date().toISOString(),
        }, {
            onConflict: 'user_id,lesson_id'
        });

    return { error };
}

export async function getRecentActivity(userId: string) {
    const { data, error } = await supabase
        .from('lesson_progress')
        .select(`
            *,
            lesson:lessons (
                id,
                title,
                lesson_number,
                course:courses (
                    title,
                    thumbnail_url,
                    category
                )
            )
        `)
        .eq('user_id', userId)
        .order('last_watched_at', { ascending: false })
        .limit(3);

    if (error) {
        // If table doesn't exist or other error, return empty
        if (error.code === 'PGRST116' || error.code === '42P01') return [];
        console.error('Error fetching recent activity:', error);
        return [];
    }

    return data.map((item: any) => ({
        id: item.lesson?.id,
        type: 'lesson',
        title: item.lesson?.title,
        courseTitle: item.lesson?.course?.title,
        progress: item.completed ? 100 : 50,
        thumbnail: item.lesson?.course?.thumbnail_url,
        lastWatched: new Date(item.last_watched_at).toLocaleDateString(),
        lessonNumber: item.lesson?.lesson_number
    }));
}

// Creator Dashboard API
export async function getCreatorCourses(creatorId: string) {
    const { data, error } = await supabase
        .from('courses')
        .select(`
            *,
            lessons:lessons(count)
        `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching creator courses:', error);
        return [];
    }

    return (data || []).map((course: any) => ({
        ...transformCourse(course),
        lessonCount: course.lessons?.[0]?.count || 0,
    }));
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
    if (courseData.category) dbData.category = courseData.category;
    if (courseData.difficulty) dbData.difficulty = courseData.difficulty;
    if (courseData.thumbnailUrl) dbData.thumbnail_url = courseData.thumbnailUrl;
    if (courseData.price !== undefined) dbData.price = courseData.price;
    if (courseData.isSubscriptionExcluded !== undefined) dbData.is_subscription_excluded = courseData.isSubscriptionExcluded;
    if (courseData.published !== undefined) dbData.published = courseData.published;

    const { data, error } = await supabase
        .from('courses')
        .update(dbData)
        .eq('id', courseId)
        .select()
        .single();

    if (error) return { error };
    return { data: transformCourse(data), error: null };
}

export async function createLesson(lessonData: Partial<Lesson>) {
    const dbData = {
        course_id: lessonData.courseId,
        title: lessonData.title,
        description: lessonData.description,
        lesson_number: lessonData.lessonNumber,
        vimeo_url: lessonData.vimeoUrl,
        length: lessonData.length,
        difficulty: lessonData.difficulty,
    };

    const { data, error } = await supabase
        .from('lessons')
        .insert(dbData)
        .select()
        .single();

    if (error) {
        console.error('Error creating lesson:', error);
        return { error };
    }
    return { data: transformLesson(data), error: null };
}

export async function updateLesson(lessonId: string, lessonData: Partial<Lesson>) {
    const dbData: any = {};
    if (lessonData.title) dbData.title = lessonData.title;
    if (lessonData.description) dbData.description = lessonData.description;
    if (lessonData.lessonNumber !== undefined) dbData.lesson_number = lessonData.lessonNumber;
    if (lessonData.vimeoUrl) dbData.vimeo_url = lessonData.vimeoUrl;
    if (lessonData.length) dbData.length = lessonData.length;
    if (lessonData.difficulty) dbData.difficulty = lessonData.difficulty;

    const { data, error } = await supabase
        .from('lessons')
        .update(dbData)
        .eq('id', lessonId)
        .select()
        .single();

    if (error) return { error };
    return { data: transformLesson(data), error: null };
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

    return { error };
}



export async function reorderLessons(lessonOrders: { id: string, lessonNumber: number }[]) {
    const promises = lessonOrders.map(item =>
        supabase
            .from('lessons')
            .update({ lesson_number: item.lessonNumber })
            .eq('id', item.id)
    );

    const results = await Promise.all(promises);
    const firstError = results.find(r => r.error)?.error;

    return { error: firstError || null };
}


// ==================== FEATURED CONTENT (HOME PAGE) ====================

/**
 * Get featured content for Home page
 */
export async function getFeaturedContent() {
    // In a real app, this would fetch from a 'featured_content' table
    // For MVP, we'll use a mock or local storage to simulate persistence
    const stored = localStorage.getItem('featured_content');
    if (stored) {
        return { data: JSON.parse(stored), error: null };
    }

    // Default fallback
    return {
        data: {
            heroVideoId: null, // Use default logic if null
            heroImageUrl: null, // Custom hero image URL
            featuredCourseIds: [], // Empty means use default "Popular" logic
            featuredCreatorIds: [] // Empty means use default logic
        },
        error: null
    };
}

/**
 * Update featured content
 */
export async function updateFeaturedContent(content: any) {
    // In a real app, this would update a table
    localStorage.setItem('featured_content', JSON.stringify(content));
    return { error: null };
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
        .single();

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
        .single();

    return { data: data?.email || null, error };
}

/**
 * Approve a creator application
 */
export async function approveCreator(creatorId: string) {
    const { error } = await supabase
        .from('creators')
        .update({ approved: true })
        .eq('id', creatorId);

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
        .single();

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
        // Wise/International fields
        wiseEmail?: string;
        wiseAccountNumber?: string;
        wiseRoutingNumber?: string;
        wiseSwiftBic?: string;
        wiseAccountName?: string;
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
        .single();

    if (error) return { data: null, error };

    return {
        data: {
            stripeAccountId: data.stripe_account_id,
            payoutSettings: data.payout_settings
        },
        error: null
    };
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
        .single();

    if (error) return false;
    return !!data;
}


/**
 * Delete a lesson (admin only)
 */
export async function deleteLesson(lessonId: string) {
    const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', lessonId);

    return { error };
}

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

    // 1.5 Calculate Bundle Revenue
    const { data: bundles } = await supabase.from('bundles').select('id').eq('creator_id', creatorId);
    const bundleIds = bundles?.map((b: { id: string }) => b.id) || [];
    let bundleRevenue = 0;
    if (bundleIds.length > 0) {
        const { data: bundleSales } = await supabase
            .from('user_bundles')
            .select('price_paid')
            .in('bundle_id', bundleIds);
        const totalBundleSales = bundleSales?.reduce((sum: number, sale: { price_paid: number }) => sum + (sale.price_paid || 0), 0) || 0;
        bundleRevenue = totalBundleSales * directShare;
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

    const ownershipMap = new Map<string, boolean>();
    ownedCourses?.forEach(uc => {
        ownershipMap.set(`${uc.user_id}_${uc.course_id}`, true);
    });

    // Get actual watch seconds from video_watch_logs
    const { data: watchLogs } = await supabase
        .from('video_watch_logs')
        .select(`
            user_id,
            watch_seconds,
            lesson_id,
            lessons (
                id,
                course_id,
                courses ( creator_id )
            )
        `);

    let totalWatchTime = 0;
    let creatorWatchTime = 0;

    watchLogs?.forEach((log: any) => {
        const seconds = log.watch_seconds || 0;
        const lessonCreatorId = log.lessons?.courses?.creator_id;
        const courseId = log.lessons?.course_id;
        const userId = log.user_id;

        // Skip if user owns this course (should not count towards subscription pool)
        if (ownershipMap.has(`${userId}_${courseId}`)) {
            return;
        }

        totalWatchTime += seconds;

        if (lessonCreatorId === creatorId) {
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

        const today = new Date();
        const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

        const stats = (data || []).map((row: any) => {
            const date = new Date(row.settlement_month);
            const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            return {
                period,
                amount: row.settlement_amount, // Use the calculated 80% amount
                // Logic: Past months are "paid" (assumed), current month is "pending"
                status: period < currentMonth ? 'paid' : 'pending'
            };
        });

        return { data: stats, error: null };

    } catch (error) {
        console.error('Error calculating creator revenue stats:', error);
        return { data: null, error };
    }
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
        .single();

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
        // 2. Exclude if type is explicitly a feed type
        if (log.type && ['sparring', 'routine', 'mastery', 'title_earned', 'level_up', 'technique', 'general'].includes(log.type)) {
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
 * Create a new training log
 */
export async function createTrainingLog(log: Omit<TrainingLog, 'id' | 'createdAt'>, skipDailyCheck = false) {
    // Daily check removed - users can create multiple logs per day
    // XP is controlled by quest system which has daily limits



    const { data, error } = await supabase
        .from('training_logs')
        .insert({
            user_id: log.userId,
            date: log.date,
            duration_minutes: log.durationMinutes,
            techniques: log.techniques,
            sparring_rounds: log.sparringRounds,
            notes: log.notes,
            is_public: log.isPublic,
            location: log.location,
            youtube_url: log.youtubeUrl,
            media_url: log.mediaUrl,
            metadata: log.metadata
        })
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
            mediaUrl: data.media_url,
            metadata: data.metadata,
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
export async function getPublicTrainingLogs(page: number = 1, limit: number = 10) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 1. Fetch ONLY feed posts (shared content from Arena)
    const fetchPromise = supabase
        .from('training_logs')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .eq('duration_minutes', -1)  // Feed posts are marked with -1
        .like('location', '__FEED__%')  // Feed posts have location starting with __FEED__
        .order('created_at', { ascending: false })
        .range(from, to);

    let data, count, error;
    try {
        const result = await fetchPromise;
        data = result.data;
        count = result.count;
        error = result.error;
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

    // 3. Fetch user names from users table
    const userMap: Record<string, string> = {};
    try {
        if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, name')
                .in('id', userIds);

            if (!usersError && usersData) {
                usersData.forEach((u: any) => {
                    if (u.name) {
                        userMap[u.id] = u.name;
                    }
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
                .select('id, name')
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

        return {
            id: log.id,
            userId: log.user_id,
            userName: userMap[log.user_id] || 'User',
            userAvatar: avatarMap[log.user_id],
            userBelt: beltMap[log.user_id],
            user: {
                name: userMap[log.user_id] || 'User',
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
        .single();

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
        .single();

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
    const { data, error } = await supabase
        .from('bundles')
        .select(`
            *,
            creator:users(name),
            bundle_courses(course_id),
            bundle_drills(drill_id)
        `)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    const bundles: Bundle[] = data.map((bundle: any) => ({
        id: bundle.id,
        creatorId: bundle.creator_id,
        creatorName: bundle.creator?.name,
        title: bundle.title,
        description: bundle.description,
        price: bundle.price,
        thumbnailUrl: bundle.thumbnail_url,
        courseIds: bundle.bundle_courses?.map((bc: any) => bc.course_id) || [],
        drillIds: bundle.bundle_drills?.map((bd: any) => bd.drill_id) || [],
        createdAt: bundle.created_at
    }));

    return { data: bundles, error: null };
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
        .single();

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
        .single();

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
        .select(`
            *,
            creator:users(name)
        `)
        .order('created_at', { ascending: false });

    if (error) return { data: null, error };

    const coupons: Coupon[] = data.map((coupon: any) => ({
        id: coupon.id,
        code: coupon.code,
        creatorId: coupon.creator_id,
        creatorName: coupon.creator?.name,
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
        .single();

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
        .single();

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
        .single();

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
    const { data, error } = await supabase
        .rpc('get_all_users_admin');

    if (error) {
        console.error('Error fetching users:', error);
        return { data: null, error };
    }

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

    return { error: null };
}

/**
 * Record watch time for a video or lesson
 * Adds the delta seconds to the daily log
 */
export async function recordWatchTime(userId: string, seconds: number, videoId?: string, lessonId?: string) {
    if (!videoId && !lessonId) return { error: new Error('VideoId or LessonId required') };
    if (seconds <= 0) return { error: null };

    const today = new Date().toISOString().split('T')[0];
    const matchQuery: any = { user_id: userId, date: today };
    if (videoId) matchQuery.video_id = videoId;
    if (lessonId) matchQuery.lesson_id = lessonId;

    // 1. Get current log
    const { data: currentLog, error: fetchError } = await supabase
        .from('video_watch_logs')
        .select('id, watch_seconds')
        .match(matchQuery)
        .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "Row not found"
        console.error('Error fetching watch log:', fetchError);
        return { error: fetchError };
    }

    // 2. Upsert
    const newSeconds = (currentLog?.watch_seconds || 0) + seconds;

    const { error } = await supabase
        .from('video_watch_logs')
        .upsert({
            ...matchQuery,
            watch_seconds: newSeconds,
            updated_at: new Date().toISOString()
        }, {
            onConflict: videoId ? 'user_id,video_id,date' : 'user_id,lesson_id,date'
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
        .single();

    // If no progress exists, create it
    if (error && error.code === 'PGRST116') {
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
            { type: 'sparring_review', target: 1, reward: 30 },
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
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Error fetching login streak:', error);
        return { data: null, error };
    }

    return { data, error: null };
}
// ============================================================================
// Drill & Routine System
// ============================================================================

export async function getDrills(creatorId?: string, limit: number = 50) {
    let query = supabase
        .from('drills')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (creatorId) {
        query = query.eq('creator_id', creatorId);
    }

    // Add 5s timeout to prevent hanging
    let data, error;
    try {
        const result = await query;
        data = result.data;
        error = result.error;
    } catch (e) {
        console.error('getDrills failed:', e);
        return { data: null, error: e };
    }

    console.log('getDrills result:', { creatorId, data, error });
    console.log('Raw drill data (first item):', data?.[0]);

    if (error) {
        console.error('Error fetching drills:', error);
        return { data: null, error };
    }

    return { data: data?.map(transformDrill) || [], error: null };
}

// Helper for timeout
const withTimeout = (promise: Promise<any>, ms: number) => {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), ms))
    ]);
};

export async function createDrill(drillData: Partial<Drill>) {
    const dbData = {
        title: drillData.title,
        description: drillData.description,
        creator_id: drillData.creatorId,
        category: drillData.category,
        difficulty: drillData.difficulty,
        thumbnail_url: drillData.thumbnailUrl,
        vimeo_url: drillData.vimeoUrl,
        description_video_url: drillData.descriptionVideoUrl,
        duration_minutes: drillData.durationMinutes,
        length: drillData.length,
    };

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
    if (drillData.length) dbData.length = drillData.length;

    const { data, error } = await supabase
        .from('drills')
        .update(dbData)
        .eq('id', drillId)
        .select()
        .single();

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

function transformSparringVideo(data: any): SparringVideo {
    return {
        id: data.id,
        creatorId: data.creator_id,
        title: data.title,
        description: data.description,
        videoUrl: data.video_url,
        thumbnailUrl: data.thumbnail_url,
        relatedItems: data.related_items || [],
        views: data.views,
        likes: data.likes,
        creator: data.creators ? transformCreator(data.creators) : undefined,
        createdAt: data.created_at,
    };
}

export async function createSparringVideo(videoData: Partial<SparringVideo>) {
    const dbData = {
        creator_id: videoData.creatorId,
        title: videoData.title,
        description: videoData.description,
        video_url: videoData.videoUrl,
        thumbnail_url: videoData.thumbnailUrl,
        related_items: videoData.relatedItems,
    };

    const { data, error } = await supabase
        .from('sparring_videos')
        .insert(dbData)
        .select()
        .single();

    if (error) {
        console.error('Error creating sparring video:', error);
        return { data: null, error };
    }

    return { data: transformSparringVideo(data), error: null };
}

export async function getSparringVideos(limit = 10, creatorId?: string) {
    let query = supabase
        .from('sparring_videos')
        .select('id, creator_id, title, description, video_url, thumbnail_url, related_items, views, likes, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (creatorId) {
        query = query.eq('creator_id', creatorId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching sparring videos:', error);
        return { data: null, error };
    }

    return { data: (data || []).map(transformSparringVideo), error: null };
}

export async function deleteSparringVideo(id: string) {
    const { error } = await supabase
        .from('sparring_videos')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting sparring video:', error);
        return { error };
    }

    return { error: null };
}

export async function getSparringVideoById(id: string) {
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*, profiles(*)')
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching sparring video:', error);
        return { data: null, error };
    }

    return { data: transformSparringVideo(data), error: null };
}

export async function updateSparringVideo(id: string, updates: Partial<SparringVideo>) {
    const dbData: any = {};
    if (updates.title) dbData.title = updates.title;
    if (updates.description) dbData.description = updates.description;
    if (updates.videoUrl) dbData.video_url = updates.videoUrl;
    if (updates.thumbnailUrl) dbData.thumbnail_url = updates.thumbnailUrl;
    if (updates.relatedItems) dbData.related_items = updates.relatedItems;

    const { data, error } = await supabase
        .from('sparring_videos')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('Error updating sparring video:', error);
        return { data: null, error };
    }

    return { data: transformSparringVideo(data), error: null };
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
        .select('id, title, description, creator_id, creator_name, price, thumbnail_url, total_duration_minutes, created_at, views')
        .order('created_at', { ascending: false });

    if (creatorId) {
        query = query.eq('creator_id', creatorId);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching routines:', error);
        return [];
    }

    return (data || []).map(transformDrillRoutine);
}

/**
 * Get a routine for the day (changes daily based on date)
 */
export async function getDailyRoutine() {
    // 1. Fetch all public routines (or a reasonable limit)
    const { data, error } = await supabase
        .from('routines')
        .select('*')
        .limit(50); // Fetch enough to rotate

    if (error) {
        console.error('Error fetching routines for daily:', error);
        return { data: null, error };
    }

    if (!data || data.length === 0) {
        return { data: null, error: null };
    }

    // 2. Select one based on date (Deterministic)
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);

    // Use dayOfYear to pick an index
    const index = dayOfYear % data.length;
    const selectedRoutine = data[index];

    return { data: transformDrillRoutine(selectedRoutine), error: null };
}

// Alias for backward compatibility
export const getDrillRoutines = getRoutines;

export async function getRoutineById(id: string) {
    console.log('[getRoutineById] Fetching routine:', id);

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
        .single();

    if (error) {
        console.error('[getRoutineById] Error fetching routine:', {
            routineId: id,
            error: error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
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

    // Fetch creator info separately to avoid join syntax issues
    let creatorName = 'Unknown';
    if (data.creator_id) {
        try {
            const { data: creatorData } = await supabase
                .from('creators')
                .select('name')
                .eq('id', data.creator_id)
                .single();

            if (creatorData) {
                creatorName = creatorData.name;
            }
        } catch (e) {
            console.warn('[getRoutineById] Could not fetch creator:', e);
        }
    }

    // Transform to match DrillRoutine interface with items
    const routine = {
        ...transformDrillRoutine(data),
        creatorName: creatorName,
        drills: data.items?.sort((a: any, b: any) => a.order_index - b.order_index).map((item: any) => ({
            ...transformDrill(item.drill),
            orderIndex: item.order_index
        })) || []
    };

    console.log('[getRoutineById] Transformed routine:', {
        id: routine.id,
        title: routine.title,
        creatorName: routine.creatorName,
        drillCount: routine.drills?.length || 0,
        totalDuration: routine.totalDurationMinutes
    });

    return { data: routine as DrillRoutine, error: null };
}

export async function createRoutine(routineData: Partial<DrillRoutine>, drillIds: string[]) {
    // If no thumbnail provided, get it from the first drill
    let thumbnailUrl = routineData.thumbnailUrl;
    if (!thumbnailUrl && drillIds.length > 0) {
        const { data: firstDrill } = await supabase
            .from('drills')
            .select('thumbnail_url')
            .eq('id', drillIds[0])
            .single();

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
    };

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .insert(dbData)
        .select()
        .single();

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
            // Should probably rollback routine creation here in a real transaction
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

    const { data: routine, error: routineError } = await supabase
        .from('routines')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

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
    const { data: purchasedData, error: purchasedError } = await supabase
        .from('user_routine_purchases')
        .select(`
            routine:routines(
                *
            )
        `)
        .eq('user_id', userId);

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

    // Add purchased routines
    if (purchasedData) {
        const purchased = purchasedData.map((item: any) => {
            const routine = item.routine;
            return {
                ...transformDrillRoutine(routine),
                creatorName: 'Unknown Creator',
                purchasedAt: item.purchased_at
            };
        });
        routines.push(...purchased);
    }

    // Add created routines
    if (createdData) {
        const created = createdData.map((routine: any) => ({
            ...transformDrillRoutine(routine),
            creatorName: 'Me',
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

    const routines = data.map((routine: any) => ({
        ...transformDrillRoutine(routine),
        creatorName: 'Me',
        isOwned: true
    }));

    return { data: routines as DrillRoutine[], error: null };
}

// Helper for transforming drill data
function transformDrill(data: any): Drill {
    console.log('transformDrill input:', data);
    const result = {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        creatorName: data.creator_name || 'Unknown', // Removed broken relation
        category: data.category,
        difficulty: data.difficulty,
        thumbnailUrl: data.thumbnail_url,
        videoUrl: data.video_url,
        vimeoUrl: data.vimeo_url,
        descriptionVideoUrl: data.description_video_url,
        aspectRatio: '9:16' as const,
        views: data.views || 0,
        durationMinutes: data.duration_minutes || 0,
        duration: data.duration || data.length, // Ensure duration is mapped for list display
        length: data.length || data.duration,
        tags: data.tags || [],
        likes: data.likes || 0,
        price: data.price || 0,
        createdAt: data.created_at,
    };
    console.log('transformDrill output:', result);
    return result;
}

// Helper for transforming routine data
function transformDrillRoutine(data: any): DrillRoutine {
    return {
        id: data.id,
        title: data.title,
        description: data.description,
        creatorId: data.creator_id,
        thumbnailUrl: data.thumbnail_url,
        price: data.price,
        difficulty: data.difficulty,
        category: data.category,
        totalDurationMinutes: data.drill_count, // 1 drill = 1 minute rule
        drillCount: data.drill_count,
        views: data.views || 0,
        createdAt: data.created_at,
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
        const { data, error } = await withTimeout(
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
        if (!data || data.length === 0) {
            console.warn(`[getDrillById] Drill ${id} not found in database`);
            return { error: { message: 'Drill not found', code: '404' } };
        }

        console.log(`[getDrillById] Successfully fetched drill ${id}`);
        return transformDrill(data[0]);
    } catch (e: any) {
        console.error(`[getDrillById] Failed/timeout for drill ${id}:`, e);
        return { error: e.message || 'Request timed out. Please check your connection and try again.' };
    }
}



/**
 * Find the routine that contains a specific drill
 * Returns the first routine found that contains this drill
 */
export async function getRoutineByDrillId(drillId: string): Promise<{ data: DrillRoutine | null; error: any }> {
    try {
        console.log('getRoutineByDrillId lookup for:', drillId);
        // Query database for routine containing this drill
        // Use .limit(1) instead of .single() to avoid errors if multiple routines contain the drill
        const { data: associations, error } = await supabase
            .from('routine_drills')
            .select(`
                routine_id,
                routines (
                    *
                )
            `)
            .eq('drill_id', drillId)
            .limit(1);

        if (error) {
            console.warn('Error fetching routine by drill:', error);
            return { data: null, error: null };
        }

        if (!associations || associations.length === 0) {
            console.log('No routine associated with drill:', drillId);
            return { data: null, error: null };
        }

        const association = associations[0];
        // Handle cases where routines might be returned as an array or object
        const rawRoutine = Array.isArray(association.routines) ? association.routines[0] : association.routines;

        if (!rawRoutine) {
            console.warn('Association exists but routine data is missing:', association);
            return { data: null, error: null };
        }

        console.log('Found routine for drill:', { routineId: rawRoutine.id, drillId });

        // Fetch drills for this routine to build the full object
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
                creatorId: rawRoutine.creator_id,
                creatorName: (rawRoutine.creator as any)?.name || 'Unknown',
                price: rawRoutine.price || 0,
                views: rawRoutine.views || 0,
                createdAt: rawRoutine.created_at
            },
            error: null
        };
    } catch (error) {
        console.warn('Exception in getRoutineByDrillId:', error);
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
    const { error } = await supabase.rpc('increment_drill_views', { p_drill_id: drillId });
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
    return getRoutineById(id);
}

export async function checkDrillRoutineOwnership(userId: string, routineId: string) {
    if (routineId.startsWith('mock-')) return true;

    const { data, error } = await supabase
        .from('user_routine_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('routine_id', routineId)
        .single();

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
    const { data, error } = await supabase
        .from('course_drill_bundles')
        .select(`
            *,
            drill:drills(*)
        `)
        .eq('course_id', courseId);

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
                'User';

            await supabase
                .from('users')
                .upsert({
                    id: post.userId,
                    name: userName,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'id'
                });
        }
    } catch (e) {
        console.warn('Failed to upsert user info:', e);
    }

    const { data, error } = await supabase
        .from('training_logs')
        .insert({
            user_id: post.userId,
            date: new Date().toISOString().split('T')[0],
            duration_minutes: -1, // MARKER: -1 indicates a feed post
            techniques: [],
            sparring_rounds: 0,
            notes: post.content,
            is_public: true,
            // type: post.type, // REMOVED: Causing insert error if column is missing
            location: `__FEED__${post.type}`,
            metadata: post.metadata || {},
            media_url: post.mediaUrl,
            youtube_url: post.youtubeUrl
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating feed post:', error);
        return { data: null, error };
    }

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
            type: data.type,
            metadata: data.metadata,
            createdAt: data.created_at,
            mediaUrl: data.media_url,
            youtubeUrl: data.youtube_url
        } as TrainingLog,
        error: null
    };
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
        return { data: null, error };
    }

    return { data, error: null };
}

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

/**
 * Toggle like on a drill
 */
export async function toggleDrillLike(userId: string, drillId: string): Promise<{ liked: boolean; error?: any }> {
    try {
        // Check if already liked
        const { data: existing } = await supabase
            .from('user_drill_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('drill_id', drillId)
            .limit(1);

        if (existing && existing.length > 0) {
            // Unlike
            const { error } = await supabase
                .from('user_drill_likes')
                .delete()
                .eq('user_id', userId)
                .eq('drill_id', drillId);

            return { liked: false, error };
        } else {
            // Like
            const { error } = await supabase
                .from('user_drill_likes')
                .insert({ user_id: userId, drill_id: drillId });

            return { liked: true, error };
        }
    } catch (error) {
        console.error('Error toggling drill like:', error);
        return { liked: false, error };
    }
}

/**
 * Check if user has liked a drill
 */
export async function checkDrillLiked(userId: string, drillId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_drill_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('drill_id', drillId)
        .limit(1);

    if (error && error.code !== 'PGRST116') console.error('Error checking drill liked:', error);
    return !!(data && data.length > 0);
}

/**
 * Get drill like count
 */
export async function getDrillLikeCount(drillId: string): Promise<number> {
    const { count } = await supabase
        .from('user_drill_likes')
        .select('*', { count: 'exact', head: true })
        .eq('drill_id', drillId);

    return count || 0;
}

/**
 * Toggle save/bookmark on a drill
 */
export async function toggleDrillSave(userId: string, drillId: string): Promise<{ saved: boolean; error?: any }> {
    try {
        // Check if already saved
        const { data: existing } = await supabase
            .from('user_saved_drills')
            .select('id')
            .eq('user_id', userId)
            .eq('drill_id', drillId)
            .limit(1);

        if (existing && existing.length > 0) {
            // Unsave
            const { error } = await supabase
                .from('user_saved_drills')
                .delete()
                .eq('user_id', userId)
                .eq('drill_id', drillId);

            return { saved: false, error };
        } else {
            // Save
            const { error } = await supabase
                .from('user_saved_drills')
                .insert({ user_id: userId, drill_id: drillId });

            return { saved: true, error };
        }
    } catch (error) {
        console.error('Error toggling drill save:', error);
        return { saved: false, error };
    }
}

/**
 * Check if user has saved a drill
 */
export async function checkDrillSaved(userId: string, drillId: string): Promise<boolean> {
    const { data } = await supabase
        .from('user_saved_drills')
        .select('id')
        .eq('user_id', userId)
        .eq('drill_id', drillId)
        .limit(1);

    return !!(data && data.length > 0);
}

/**
 * Get user's saved drills
 */
export async function getUserSavedDrills(userId: string): Promise<Drill[]> {
    const { data } = await supabase
        .from('user_saved_drills')
        .select('drill_id')
        .eq('user_id', userId);

    if (!data || data.length === 0) return [];

    // Fetch full drill data for saved drill IDs
    const drillIds = data.map(item => item.drill_id);
    const drills: Drill[] = [];

    for (const drillId of drillIds) {
        const result: any = await getDrillById(drillId);
        if (result && !result.error) drills.push(result);
    }

    return drills;
}

/**
 * Get user's liked drills
 */
export async function getUserLikedDrills(userId: string): Promise<Drill[]> {
    const { data } = await supabase
        .from('user_drill_likes')
        .select('drill_id')
        .eq('user_id', userId);

    if (!data || data.length === 0) return [];

    // Fetch full drill data for liked drill IDs
    const drillIds = data.map(item => item.drill_id);
    const drills: Drill[] = [];

    for (const drillId of drillIds) {
        const result: any = await getDrillById(drillId);
        if (result && !result.error) drills.push(result);
    }

    return drills;
}

export async function getCoursePreviewVideo(courseId: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('vimeo_url')
        .eq('course_id', courseId)
        .order('lesson_number', { ascending: true })
        .limit(1)
        .single();

    return data?.vimeo_url;
}





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
            creatorName: 'Loading...', // Placeholder
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
 * Fetch filtered drills for public feed:
 * 1. Must be part of a routine
 * 2. Must be the FIRST drill (display_order = 1) -> "Free Drill"
 * 3. Must have valid video URL (not processing)
 */
export async function fetchPublicFeedDrills(limit: number = 20) {
    try {
        // Step 1: Get drill IDs that are the first item in a routine (Free Drills)
        // Step 1: Get drill IDs that are the first item in a routine (Free Drills)
        const fetchIdsPromise = supabase
            .from('routine_drills')
            .select('drill_id')
            .eq('order_index', 0) // First item is index 0
            .limit(100); // Fetch enough candidates

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Drills feed timeout')), 5000)
        );

        const { data: requestItems, error: itemsError } = await Promise.race([fetchIdsPromise, timeoutPromise]) as any;

        if (itemsError) throw itemsError;
        if (!requestItems || requestItems.length === 0) return { data: [], error: null };

        const drillIds = requestItems.map((item: any) => item.drill_id);

        // Step 2: Fetch the actual drills that match these IDs and have videos ready
        const fetchDrillsPromise = supabase
            .from('drills')
            .select('*')
            .in('id', drillIds)
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
            creatorName: 'Loading...', // Will be populated by Drills.tsx
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
        console.error('Error in fetchPublicFeedDrills:', error);
        return { data: null, error };
    }
}

/**
 * Fetch creators by IDs
 */
export async function fetchCreatorsByIds(creatorIds: string[]) {
    if (!creatorIds || creatorIds.length === 0) return {};

    try {
        const uniqueIds = [...new Set(creatorIds)];
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name')
            .in('id', uniqueIds);

        const creatorsMap: Record<string, string> = {};
        if (creators) {
            creators.forEach((c: any) => {
                creatorsMap[c.id] = c.name;
            });
        }
        return creatorsMap;
    } catch (error) {
        console.warn('Error fetching creators:', error);
        return {};
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
        creatorName: creatorsMap[d.creatorId] || 'Unknown'
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
    const { data, error } = await supabase
        .from('sparring_videos')
        .select('*, profiles(*)')
        .contains('related_items', JSON.stringify([{ type: 'course', id: courseId }]));

    if (error) {
        console.error('Error fetching course sparring videos:', error);
        return { data: null, error };
    }

    return { data: (data || []).map(transformSparringVideo), error: null };
}

/**
 * Toggle like on a course
 */
export async function toggleCourseLike(userId: string, courseId: string): Promise<{ liked: boolean; error?: any }> {
    try {
        const { data: existing } = await supabase
            .from('user_course_likes')
            .select('id')
            .eq('user_id', userId)
            .eq('course_id', courseId)
            .limit(1);

        if (existing && existing.length > 0) {
            const { error } = await supabase
                .from('user_course_likes')
                .delete()
                .eq('user_id', userId)
                .eq('course_id', courseId);
            return { liked: false, error };
        } else {
            const { error } = await supabase
                .from('user_course_likes')
                .insert({ user_id: userId, course_id: courseId });
            return { liked: true, error };
        }
    } catch (error) {
        console.error('Error toggling course like:', error);
        return { liked: false, error };
    }
}

/**
 * Check if user has liked a course
 */
export async function checkCourseLiked(userId: string, courseId: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('user_course_likes')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .limit(1);

    if (error && error.code !== 'PGRST116') console.error('Error checking course liked:', error);
    return !!(data && data.length > 0);
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

