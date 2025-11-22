
import { supabase } from './supabase';
import { Creator, Video, Course, Lesson, TrainingLog } from '../types';

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
        .single();

    if (error) {
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
    const { error } = await supabase
        .from('courses')
        .update({ views: supabase.raw('views + 1') })
        .eq('id', courseId);

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
        .single();

    if (error) {
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
export async function updateUserProfile(userId: string, updates: { name?: string }) {
    const { error } = await supabase.auth.updateUser({
        data: { name: updates.name }
    });

    return { error };
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

    const watchTimeShare = totalWatchTime > 0 ? (creatorWatchTime / totalWatchTime) : 0;
    const subscriptionRevenue = Math.floor(MOCK_TOTAL_SUBSCRIPTION_REVENUE * watchTimeShare * subShare);

    return {
        data: {
            directRevenue,
            subscriptionRevenue,
            totalRevenue: directRevenue + subscriptionRevenue,
            watchTimeShare,
            creatorWatchTime,
            totalWatchTime,
            currency: 'KRW'
        },
        error: null
    };
}

/**
 * Enroll in a free course (add to library)
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
        youtubeUrl: log.youtube_url,
        createdAt: log.created_at
    }));

    return { data: logs, error: null };
}

/**
 * Create a new training log
 */
export async function createTrainingLog(log: Omit<TrainingLog, 'id' | 'createdAt'>) {
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
 * Get public training logs (Community Feed)
 */
export async function getPublicTrainingLogs() {
    // In a real app, we would join with auth.users to get names, 
    // but Supabase doesn't allow joining auth.users directly easily.
    // For MVP, we might need a 'profiles' table or just use email from metadata if available in a public view.
    // For now, we'll assume there's a way to get user info or just show 'User'.
    // A better approach for MVP is to create a 'public_profiles' view or table.
    // Let's assume we have a 'profiles' table or similar, OR we just fetch logs and display without names for now if complex.
    // Wait, we can use the 'creators' table if they are creators, but for normal users it's harder.
    // Let's just fetch the logs for now.

    const { data, error } = await supabase
        .from('training_logs')
        .select('*')
        .eq('is_public', true)
        .order('date', { ascending: false })
        .limit(50);

    if (error) return { data: null, error };

    const logs: TrainingLog[] = data.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        date: log.date,
        durationMinutes: log.duration_minutes,
        techniques: log.techniques || [],
        sparringRounds: log.sparring_rounds,
        notes: log.notes,
        isPublic: log.is_public,
        youtubeUrl: log.youtube_url,
        createdAt: log.created_at,
        // We'll need to fetch user names separately or use a view in the future
        user: { name: 'Unknown User', email: '' }
    }));

    return { data: logs, error: null };
}

/**
 * Get feedback for a log
 */
export async function getLogFeedback(logId: string) {
    const { data, error } = await supabase
        .from('log_feedback')
        .select('*')
        .eq('log_id', logId)
        .order('created_at', { ascending: true });

    if (error) return { data: null, error };

    // Mocking user name for now as we can't join auth.users easily
    const feedback = data.map((item: any) => ({
        id: item.id,
        logId: item.log_id,
        userId: item.user_id,
        userName: 'User', // Placeholder
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
