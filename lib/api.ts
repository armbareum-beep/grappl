

import { supabase } from './supabase';
import { Creator, Video, Course, Lesson, TrainingLog, UserSkill, SkillCategory, SkillStatus, BeltLevel, Bundle, Coupon, SkillSubcategory, FeedbackSettings, FeedbackRequest, AppNotification, Difficulty } from '../types';


// Revenue split constants
export const DIRECT_PRODUCT_CREATOR_SHARE = 0.8; // 80% to creator for individual product sales
export const DIRECT_PRODUCT_PLATFORM_SHARE = 0.2;
export const SUBSCRIPTION_CREATOR_SHARE = 0.8; // 80% to creator for subscription revenue
export const SUBSCRIPTION_PLATFORM_SHARE = 0.2;

// Helper functions to transform snake_case to camelCase
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

// Creators API
export async function getCreators(): Promise<Creator[]> {
    const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('approved', true)
        .order('subscriber_count', { ascending: false });

    if (error) {
        console.error('Error fetching creators:', error);
        throw error;
    }

    return (data || []).map(transformCreator);
}

export async function getCreatorById(id: string): Promise<Creator | null> {
    const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        // 406/PGRST106: Table missing or RLS issue
        if (error.code === 'PGRST106' || error.code === '406') {
            return null;
        }
        console.error('Error fetching creator:', error);
        return null;
    }

    return data ? transformCreator(data) : null;
}

// Courses API
export async function getCourses(): Promise<Course[]> {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      creator:creators(name),
      lessons:lessons(count)
    `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching courses:', error);
        throw error;
    }

    return (data || []).map(course => ({
        ...transformCourse(course),
        lessonCount: course.lessons?.[0]?.count || 0,
    }));
}

export async function getCourseById(id: string): Promise<Course | null> {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      creator:creators(name),
      lessons:lessons(count)
    `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching course:', error);
        return null;
    }

    return data ? {
        ...transformCourse(data),
        lessonCount: data.lessons?.[0]?.count || 0,
    } : null;
}

export async function getCoursesByCreator(creatorId: string): Promise<Course[]> {
    const { data, error } = await supabase
        .from('courses')
        .select(`
      *,
      creator:creators(name),
      lessons:lessons(count)
    `)
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching courses by creator:', error);
        throw error;
    }

    return (data || []).map(course => ({
        ...transformCourse(course),
        lessonCount: course.lessons?.[0]?.count || 0,
    }));
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
    const { data, error } = await supabase
        .from('videos')
        .select(`
      *,
      creator:creators(name)
    `)
        .order('created_at', { ascending: false });

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

// Increment views
export async function incrementVideoViews(videoId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_video_views', {
        video_id: videoId,
    });

    if (error) {
        console.error('Error incrementing video views:', error);
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
        lessons:lessons(count)
      )
    `)
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user courses:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        ...transformCourse(item.courses),
        lessonCount: item.courses.lessons?.[0]?.count || 0,
    }));
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
    if (lessonData.lessonNumber) dbData.lesson_number = lessonData.lessonNumber;
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

/**
 * Update user profile
 */
export async function updateUserProfile(updates: { name?: string }) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) return { error: userError };
    if (!user) return { error: new Error('No user logged in') };

    // 1. Update auth.users metadata
    const { error: authError } = await supabase.auth.updateUser({
        data: { name: updates.name }
    });
    if (authError) return { error: authError };

    // 2. Update public.users table
    const { error: dbError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

    if (dbError) return { error: dbError };

    // 3. If user is a creator, update creators table as well
    // Check if user is a creator first
    const { data: creator } = await supabase
        .from('creators')
        .select('id')
        .eq('id', user.id)
        .single();

    if (creator) {
        const { error: creatorError } = await supabase
            .from('creators')
            .update({ name: updates.name })
            .eq('id', user.id);

        if (creatorError) console.error('Error updating creator name:', creatorError);
    }

    return { error: null };
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
export async function updatePayoutSettings(creatorId: string, settings: { type: 'individual' | 'business' }) {
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
 * Calculate creator earnings from direct sales and subscription revenue
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

    // 2. Calculate Direct Sales Revenue
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

    // 3. Calculate Subscription Revenue (Watch Time Based)
    // Mock Pool for MVP until subscription payments are real
    const MOCK_TOTAL_SUBSCRIPTION_REVENUE = 10000000; // 10,000,000 KRW

    // Get all completed lessons with their length
    // Note: In a real app, this query would be too heavy. We would use aggregated stats tables.
    const { data: allProgress } = await supabase
        .from('lesson_progress')
        .select(`
            lesson_id,
            lessons (
                id,
                length,
                course_id,
                courses ( creator_id )
            )
        `)
        .eq('completed', true);

    let totalWatchTime = 0;
    let creatorWatchTime = 0;

    allProgress?.forEach((p: any) => {
        const length = p.lessons?.length || 0;
        const lessonCreatorId = p.lessons?.courses?.creator_id;

        totalWatchTime += length;

        if (lessonCreatorId === creatorId) {
            creatorWatchTime += length;
        }
    });

    const share = totalWatchTime > 0 ? creatorWatchTime / totalWatchTime : 0;
    const creatorSubRevenue = Math.floor(MOCK_TOTAL_SUBSCRIPTION_REVENUE * subShare * share);

    return {
        data: {
            directRevenue,
            subscriptionRevenue: creatorSubRevenue,
            totalRevenue: directRevenue + creatorSubRevenue,
            creatorWatchTime,
            totalWatchTime,
            watchTimeShare: share
        },
        error: null
    };
}

/**
 * Get creator revenue stats (monthly breakdown)
 * Mock data for now
 */
export async function getCreatorRevenueStats(creatorId: string) {
    // Mock data
    const stats = [
        { period: '2023-10', amount: 1250000, status: 'pending' },
        { period: '2023-09', amount: 1100000, status: 'paid' },
        { period: '2023-08', amount: 950000, status: 'paid' },
        { period: '2023-07', amount: 880000, status: 'paid' },
        { period: '2023-06', amount: 1050000, status: 'paid' },
        { period: '2023-05', amount: 920000, status: 'paid' },
    ];

    return { data: stats, error: null };
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
 * Purchase a subscription (Mock)
 */
export async function purchaseSubscription(userId: string, plan: 'monthly' | 'yearly') {
    // Mock subscription purchase
    // In a real app, this would integrate with a payment gateway

    // Update user's subscription status in a 'subscriptions' table
    // For MVP, we'll just return success and save to localStorage
    localStorage.setItem('subscription_' + userId, 'true');
    localStorage.setItem('subscription_plan_' + userId, plan);

    // Force a page reload or event to update context if needed, 
    // but ideally the component calling this handles the UI update or re-checks auth

    return { error: null };
}

// ==================== TRAINING LOG (JOURNAL) ====================

/**
 * Get training logs for a user
 */
export async function getTrainingLogs(userId: string) {
    const { data, error } = await supabase
        .from('training_logs')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) return { data: null, error };

    const logs: TrainingLog[] = data.map((log: any) => ({
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
        createdAt: log.created_at
    }));

    return { data: logs, error: null };
}

/**
 * Create a new training log
 */
export async function createTrainingLog(log: Omit<TrainingLog, 'id' | 'createdAt'>) {
    // Check if log already exists for this date
    const { data: existingLogs, error: checkError } = await supabase
        .from('training_logs')
        .select('id')
        .eq('user_id', log.userId)
        .eq('date', log.date);

    if (checkError) return { error: checkError };
    if (existingLogs && existingLogs.length > 0) {
        return { error: new Error('하루에 하나의 수련 일지만 작성할 수 있습니다.') };
    }

    const { error } = await supabase
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
            youtube_url: log.youtubeUrl
        });

    return { error };
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

    // 1. Fetch logs without join first to avoid FK errors
    const { data, count, error } = await supabase
        .from('training_logs')
        .select('*', { count: 'exact' })
        .eq('is_public', true)
        .order('date', { ascending: false })
        .range(from, to);

    if (error) {
        console.error('Error fetching public logs:', error);
        return { data: null, count: 0, error };
    }

    if (!data || data.length === 0) {
        return { data: [], count: 0, error: null };
    }

    // 2. Extract user IDs
    const userIds = Array.from(new Set(data.map((log: any) => log.user_id)));

    // 3. Fetch user names manually (robust against missing FKs)
    const { data: users } = await supabase
        .from('users')
        .select('id, name')
        .in('id', userIds);

    // 4. Create a map of userId -> name
    const userMap: Record<string, string> = {};
    if (users) {
        users.forEach((u: any) => {
            userMap[u.id] = u.name;
        });
    }

    // 5. Also try to fetch creator names if they are instructors (fallback)
    const { data: creators } = await supabase
        .from('creators')
        .select('id, name')
        .in('id', userIds);

    if (creators) {
        creators.forEach((c: any) => {
            // Prefer creator name if available (might be more official)
            userMap[c.id] = c.name;
        });
    }

    const logs: TrainingLog[] = data.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userName: userMap[log.user_id] || 'User',
        date: log.date,
        durationMinutes: log.duration_minutes,
        techniques: log.techniques || [],
        sparringRounds: log.sparring_rounds,
        notes: log.notes,
        isPublic: log.is_public,
        location: log.location,
        youtubeUrl: log.youtube_url,
        createdAt: log.created_at,
    }));

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
    const { error } = await supabase
        .from('log_feedback')
        .insert({
            log_id: logId,
            user_id: userId,
            content
        });

    return { error };
}

// ==================== SKILL TREE ====================

/**
 * Get user's skills
 */
export async function getUserSkills(userId: string) {
    const { data, error } = await supabase
        .from('user_skills')
        .select(`
            *,
            courses (
                id,
                title
            )
        `)
        .eq('user_id', userId);

    if (error) return { data: null, error };

    const skills: UserSkill[] = data.map((skill: any) => ({
        id: skill.id,
        userId: skill.user_id,
        category: skill.category,
        subcategoryId: skill.subcategory_id,
        courseId: skill.course_id,
        courseTitle: skill.courses?.title,
        status: skill.status,
        createdAt: skill.created_at,
        updatedAt: skill.updated_at
    }));

    return { data: skills, error: null };
}

/**
 * Get user stats for tournament
 */
export async function getUserStats(userId: string) {
    const [skillsRes, logsRes] = await Promise.all([
        getUserSkills(userId),
        supabase.from('training_logs').select('id', { count: 'exact' }).eq('user_id', userId)
    ]);

    const skills = skillsRes.data;
    const logCount = logsRes.count || 0;

    if (!skills) {
        return {
            data: {
                Standing: 0,
                Guard: 0,
                'Guard Pass': 0,
                Side: 0,
                Mount: 0,
                Back: 0,
                logCount: 0,
                total: 0
            },
            error: skillsRes.error
        };
    }

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

    skills.forEach(skill => {
        const points = skill.status === 'mastered' ? 5 : 1;
        if (stats[skill.category] !== undefined) {
            stats[skill.category] += points;
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

// ==================== SKILL SUBCATEGORIES ====================

/**
 * Get skill subcategories
 */
export async function getSkillSubcategories(userId: string) {
    const { data, error } = await supabase
        .from('skill_subcategories')
        .select('*')
        .eq('user_id', userId)
        .order('display_order', { ascending: true });

    if (error) return { data: null, error };

    const subcategories: SkillSubcategory[] = data.map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        category: item.category,
        name: item.name,
        displayOrder: item.display_order,
        createdAt: item.created_at
    }));

    return { data: subcategories, error: null };
}

/**
 * Create skill subcategory
 */
export async function createSkillSubcategory(userId: string, category: SkillCategory, name: string) {
    // Get max display order
    const { data: maxOrderData } = await supabase
        .from('skill_subcategories')
        .select('display_order')
        .eq('user_id', userId)
        .eq('category', category)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

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

/**
 * Update skill subcategory
 */
export async function updateSkillSubcategory(subcategoryId: string, updates: Partial<SkillSubcategory>) {
    const { error } = await supabase
        .from('skill_subcategories')
        .update({
            name: updates.name,
            display_order: updates.displayOrder
        })
        .eq('id', subcategoryId);

    return { error };
}

/**
 * Delete skill subcategory
 */
export async function deleteSkillSubcategory(subcategoryId: string) {
    const { error } = await supabase
        .from('skill_subcategories')
        .delete()
        .eq('id', subcategoryId);

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
            creator:creators(name),
            bundle_courses(course_id)
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
    courseIds: string[];
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
    const bundleCourses = bundle.courseIds.map(courseId => ({
        bundle_id: newBundle.id,
        course_id: courseId
    }));

    const { error: coursesError } = await supabase
        .from('bundle_courses')
        .insert(bundleCourses);

    if (coursesError) return { error: coursesError };

    return { data: newBundle, error: null };
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


// ==================== NOTIFICATIONS ====================

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

// ==================== USER COURSES ====================

/**
 * Get user's purchased courses with details
 */
export async function getUserPurchasedCourses(userId: string) {
    const { data, error } = await supabase
        .from('user_courses')
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
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching purchased courses:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

/**
 * Get user's skill tree courses (equipped courses)
 */
export async function getUserSkillCourses(userId: string) {
    const { data, error } = await supabase
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

    if (error) {
        console.error('Error fetching skill courses:', error);
        return { data: null, error };
    }

    return { data, error: null };
}
