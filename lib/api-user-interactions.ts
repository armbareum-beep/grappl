/**
 * Unified User Interactions API
 * 
 * This module provides a single, consistent interface for all user interactions
 * (save, like, view) with content across the platform.
 * 
 * Replaces legacy functions:
 * - toggleDrillSave, toggleLessonSave, toggleCourseSave, etc.
 * - toggleCourseLike, etc.
 * - recordRoutineView, recordSparringView, etc.
 */

import { supabase } from './supabase';

export type ContentType = 'drill' | 'lesson' | 'course' | 'routine' | 'sparring' | 'creator';
export type InteractionType = 'save' | 'like' | 'view' | 'follow';

export interface UserInteraction {
    id: string;
    user_id: string;
    content_type: ContentType;
    content_id: string;
    interaction_type: InteractionType;
    view_count?: number;
    last_interacted_at: string;
    created_at: string;
}

/**
 * Toggle an interaction (save/like/follow) for a piece of content
 * @returns true if interaction was added, false if removed
 */
export async function toggleInteraction(
    contentType: ContentType,
    contentId: string,
    interactionType: 'save' | 'like' | 'follow'
): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Optimized client-side toggle without RPC (fallback)

    // 1. Try to fetch existing interaction
    const { data: existing, error: fetchError } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('interaction_type', interactionType)
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching interaction status:', fetchError);
        throw fetchError;
    }

    if (existing) {
        // Remove interaction
        const { error: deleteError } = await supabase
            .from('user_interactions')
            .delete()
            .eq('id', existing.id);

        if (deleteError) {
            console.error('Error deleting interaction:', deleteError);
            throw deleteError;
        }
        return false; // Removed
    } else {
        // Add interaction
        const { error: insertError } = await supabase
            .from('user_interactions')
            .insert({
                user_id: user.id,
                content_type: contentType,
                content_id: contentId,
                interaction_type: interactionType
            });

        if (insertError) {
            console.error('Error inserting interaction:', insertError);
            throw insertError;
        }
        return true; // Added
    }
}

/**
 * Check if user has a specific interaction with content
 */
export async function hasInteraction(
    contentType: ContentType,
    contentId: string,
    interactionType: InteractionType
): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .eq('content_id', contentId)
        .eq('interaction_type', interactionType)
        .maybeSingle();

    return !!data;
}

/**
 * Record or update a view for content
 * Increments view count if already viewed
 */
export async function recordView(
    contentType: ContentType,
    contentId: string
): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Don't record views for non-authenticated users

    // Use the database function for atomic upsert
    const { error } = await supabase.rpc('record_content_view', {
        p_user_id: user.id,
        p_content_type: contentType,
        p_content_id: contentId
    });

    if (error) {
        console.error('Failed to record view:', error);
    }
}

/**
 * Get all interactions of a specific type for the current user
 */
export async function getUserInteractions(
    interactionType: InteractionType,
    contentType?: ContentType
): Promise<UserInteraction[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    let query = supabase
        .from('user_interactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('interaction_type', interactionType)
        .order('last_interacted_at', { ascending: false });

    if (contentType) {
        query = query.eq('content_type', contentType);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Failed to fetch user interactions:', error);
        return [];
    }

    return (data || []).map(item => ({
        ...item,
        content_type: item.content_type as ContentType
    })) as UserInteraction[];
}

/**
 * Get interaction counts for a piece of content
 */
export async function getInteractionCounts(
    contentType: ContentType,
    contentId: string
): Promise<{ saves: number; likes: number; views: number }> {
    const { data, error } = await supabase
        .from('user_interactions')
        .select('interaction_type')
        .eq('content_type', contentType)
        .eq('content_id', contentId);

    if (error || !data) {
        return { saves: 0, likes: 0, views: 0 };
    }

    const counts = {
        saves: data.filter(i => i.interaction_type === 'save').length,
        likes: data.filter(i => i.interaction_type === 'like').length,
        views: data.filter(i => i.interaction_type === 'view').length
    };

    return counts;
}

/**
 * Batch check if user has interactions with multiple content items
 * Useful for displaying saved/liked state in lists
 */
export async function batchCheckInteractions(
    contentType: ContentType,
    contentIds: string[],
    interactionType: InteractionType
): Promise<Map<string, boolean>> {
    const { data: { user } } = await supabase.auth.getUser();
    const resultMap = new Map<string, boolean>();

    // Initialize all as false
    contentIds.forEach(id => resultMap.set(id, false));

    if (!user || contentIds.length === 0) return resultMap;

    const { data, error } = await supabase
        .from('user_interactions')
        .select('content_id')
        .eq('user_id', user.id)
        .eq('content_type', contentType)
        .eq('interaction_type', interactionType)
        .in('content_id', contentIds);

    if (error || !data) return resultMap;

    // Mark found interactions as true
    data.forEach(item => {
        resultMap.set(item.content_id, true);
    });

    return resultMap;
}

// ============================================================================
// Helper functions for fetching saved content
// ============================================================================

/**
 * Get all saved lessons for a user
 */
export async function getUserSavedLessons(userId: string) {
    // Step 1: Get saved lesson IDs
    const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('content_id, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'lesson')
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

    if (interactionsError || !interactions || interactions.length === 0) {
        if (interactionsError) console.error('Failed to fetch saved lesson interactions:', interactionsError);
        return [];
    }

    const lessonIds = interactions.map(i => i.content_id);

    // Step 2: Fetch actual lesson data
    const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            duration_minutes,
            lesson_number,
            course_id,
            courses (
                id,
                title,
                creator:creators (
                    name,
                    profile_image
                )
            )
        `)
        .in('id', lessonIds);

    if (lessonsError) {
        console.error('Failed to fetch lessons:', lessonsError);
        return [];
    }

    // Map lessons with saved timestamps
    const savedAtMap = new Map(interactions.map(i => [i.content_id, i.created_at]));

    return (lessons || []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        thumbnailUrl: lesson.thumbnail_url,
        durationMinutes: lesson.duration_minutes,
        lessonNumber: lesson.lesson_number,
        courseId: lesson.course_id,
        courseTitle: lesson.courses?.title,
        creatorName: lesson.courses?.creator?.name,
        creatorProfileImage: lesson.courses?.creator?.profile_image,
        savedAt: savedAtMap.get(lesson.id)
    }));
}

/**
 * Get all saved courses for a user
 */
export async function getUserSavedCourses(userId: string) {
    // Step 1: Get saved course IDs
    const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('content_id, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'course')
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

    if (interactionsError || !interactions || interactions.length === 0) {
        if (interactionsError) console.error('Failed to fetch saved course interactions:', interactionsError);
        return [];
    }

    const courseIds = interactions.map(i => i.content_id);

    // Step 2: Fetch actual course data
    const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            price,
            difficulty,
            creator:creators (
                name,
                profile_image
            )
        `)
        .in('id', courseIds);

    if (coursesError) {
        console.error('Failed to fetch courses:', coursesError);
        return [];
    }

    const savedAtMap = new Map(interactions.map(i => [i.content_id, i.created_at]));

    return (courses || []).map((course: any) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        thumbnailUrl: course.thumbnail_url,
        price: course.price,
        difficulty: course.difficulty,
        creatorName: course.creator?.name,
        creatorProfileImage: course.creator?.profile_image,
        savedAt: savedAtMap.get(course.id)
    }));
}

/**
 * Get all saved routines for a user
 */
export async function getUserSavedRoutines(userId: string) {
    // Step 1: Get saved routine IDs
    const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('content_id, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'routine')
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

    if (interactionsError || !interactions || interactions.length === 0) {
        if (interactionsError) console.error('Failed to fetch saved routine interactions:', interactionsError);
        return [];
    }

    const routineIds = interactions.map(i => i.content_id);

    // Step 2: Fetch actual routine data
    const { data: routines, error: routinesError } = await supabase
        .from('routines')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            difficulty,
            creator_id,
            views,
            price
        `)
        .in('id', routineIds);

    if (routinesError) {
        console.error('Failed to fetch routines:', routinesError);
        return [];
    }

    // Step 3: Fetch creator info separately
    const creatorIds = [...new Set((routines || []).map((r: any) => r.creator_id).filter(Boolean))];
    let creatorMap = new Map<string, { name: string; profile_image: string }>();

    if (creatorIds.length > 0) {
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name, profile_image')
            .in('id', creatorIds);

        (creators || []).forEach((c: any) => {
            creatorMap.set(c.id, { name: c.name, profile_image: c.profile_image });
        });
    }

    const savedAtMap = new Map(interactions.map(i => [i.content_id, i.created_at]));

    return (routines || []).map((routine: any) => {
        const creator = creatorMap.get(routine.creator_id);
        return {
            id: routine.id,
            title: routine.title,
            description: routine.description,
            thumbnailUrl: routine.thumbnail_url,
            difficulty: routine.difficulty,
            creatorId: routine.creator_id,
            creatorName: creator?.name,
            creatorProfileImage: creator?.profile_image,
            views: routine.views || 0,
            price: routine.price || 0,
            savedAt: savedAtMap.get(routine.id)
        };
    });
}

/**
 * Get all saved sparring videos for a user
 */
export async function getSavedSparringVideos(userId: string) {
    // Step 1: Get saved sparring IDs
    const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('content_id, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'sparring')
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

    if (interactionsError || !interactions || interactions.length === 0) {
        if (interactionsError) console.error('Failed to fetch saved sparring interactions:', interactionsError);
        return [];
    }

    const sparringIds = interactions.map(i => i.content_id);

    // Step 2: Fetch actual sparring data (without embedded creator select)
    const { data: sparringVideos, error: sparringError } = await supabase
        .from('sparring_videos')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            price,
            creator_id
        `)
        .in('id', sparringIds);

    if (sparringError) {
        console.error('Failed to fetch sparring videos:', sparringError);
        return [];
    }

    // Step 3: Fetch creator info separately
    const creatorIds = [...new Set((sparringVideos || []).map((v: any) => v.creator_id).filter(Boolean))];
    let creatorMap = new Map<string, { name: string; profile_image: string }>();

    if (creatorIds.length > 0) {
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name, profile_image')
            .in('id', creatorIds);

        (creators || []).forEach((c: any) => {
            creatorMap.set(c.id, { name: c.name, profile_image: c.profile_image });
        });
    }

    const savedAtMap = new Map(interactions.map(i => [i.content_id, i.created_at]));

    return (sparringVideos || []).map((video: any) => {
        const creator = creatorMap.get(video.creator_id);
        return {
            id: video.id,
            title: video.title,
            description: video.description,
            thumbnailUrl: video.thumbnail_url,
            price: video.price,
            creatorName: creator?.name,
            creator: creator,
            savedAt: savedAtMap.get(video.id)
        };
    });
}

// ============================================================================
// Legacy function wrappers for backward compatibility
// These can be gradually replaced with direct toggleInteraction calls
// ============================================================================

// Save toggles - return { saved: boolean } for backward compatibility
export const toggleLessonSave = async (_userId: string, lessonId: string) => {
    const saved = await toggleInteraction('lesson', lessonId, 'save');
    return { saved };
};

export const toggleSparringSave = async (_userId: string, sparringId: string) => {
    const saved = await toggleInteraction('sparring', sparringId, 'save');
    return { saved };
};

export const toggleCourseSave = async (_userId: string, courseId: string) => {
    const saved = await toggleInteraction('course', courseId, 'save');
    return { saved };
};

export const toggleRoutineSave = async (_userId: string, routineId: string) => {
    const saved = await toggleInteraction('routine', routineId, 'save');
    return { saved };
};

export const toggleDrillSave = async (_userId: string, drillId: string) => {
    const saved = await toggleInteraction('drill', drillId, 'save');
    return { saved };
};

// Like toggles
export const toggleCourseLike = async (_userId: string, courseId: string) => {
    const liked = await toggleInteraction('course', courseId, 'like');
    return { liked };
};

// View records
export const recordDrillView = (drillId: string) => recordView('drill', drillId);
export const recordLessonView = (lessonId: string) => recordView('lesson', lessonId);
export const recordCourseView = (courseId: string) => recordView('course', courseId);
export const recordRoutineView = (routineId: string) => recordView('routine', routineId);
export const recordSparringView = (sparringId: string) => recordView('sparring', sparringId);

/**
 * Batch check interaction status (liked, saved, and followed) for a piece of content
 */
export async function getContentInteractionStatus(contentType: string, contentId: string, creatorId?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { liked: false, saved: false, followed: false };

    const [liked, saved, followed] = await Promise.all([
        hasInteraction(contentType as ContentType, contentId, 'like'),
        hasInteraction(contentType as ContentType, contentId, 'save'),
        creatorId ? checkCreatorFollowStatus(user.id, creatorId) : Promise.resolve(false)
    ]);

    return { liked, saved, followed };
}

/**
 * Creator Follow functions (unified with user_interactions)
 */
export async function toggleCreatorFollow(userId: string, creatorId: string): Promise<{ followed: boolean }> {
    const followed = await toggleInteraction('creator', creatorId, 'follow');
    return { followed };
}

export async function checkCreatorFollowStatus(userId: string, creatorId: string): Promise<boolean> {
    return hasInteraction('creator', creatorId, 'follow');
}

export async function getUserFollowedCreators(userId: string): Promise<string[]> {
    const interactions = await getUserInteractions('follow', 'creator');
    return interactions.map(i => i.content_id);
}

// Specialized status checkers for backward compatibility
export const getDrillInteractionStatus = (_userId: string, drillId: string, creatorId?: string) => getContentInteractionStatus('drill', drillId, creatorId);
export const getLessonInteractionStatus = (_userId: string, lessonId: string, creatorId?: string) => getContentInteractionStatus('lesson', lessonId, creatorId);
export const getCourseInteractionStatus = (_userId: string, courseId: string, creatorId?: string) => getContentInteractionStatus('course', courseId, creatorId);
export const getRoutineInteractionStatus = (_userId: string, routineId: string, creatorId?: string) => getContentInteractionStatus('routine', routineId, creatorId);
export const getSparringInteractionStatus = (_userId: string, sparringId: string, creatorId?: string) => getContentInteractionStatus('sparring', sparringId, creatorId);

// Like toggles - return { liked: boolean }
export const toggleDrillLike = async (_userId: string, drillId: string) => {
    const liked = await toggleInteraction('drill', drillId, 'like');
    return { liked };
};

export const toggleLessonLike = async (_userId: string, lessonId: string) => {
    const liked = await toggleInteraction('lesson', lessonId, 'like');
    return { liked };
};

export const toggleSparringLike = async (_userId: string, sparringId: string) => {
    const liked = await toggleInteraction('sparring', sparringId, 'like');
    return { liked };
};

// User Interacted Content List Helpers - defined above
export async function getUserLikedDrills(_userId: string) {
    const interactions = await getUserInteractions('like', 'drill');
    return interactions.map(i => ({ id: i.content_id }));
}

export async function getUserSavedDrills(userId: string) {
    // Step 1: Get saved drill IDs
    const { data: interactions, error: interactionsError } = await supabase
        .from('user_interactions')
        .select('content_id, created_at')
        .eq('user_id', userId)
        .eq('content_type', 'drill')
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

    if (interactionsError || !interactions || interactions.length === 0) {
        if (interactionsError) console.error('Failed to fetch saved drill interactions:', interactionsError);
        return [];
    }

    const drillIds = interactions.map(i => i.content_id);

    // Step 2: Fetch actual drill data (without embedded creator select)
    const { data: drills, error: drillsError } = await supabase
        .from('drills')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            difficulty,
            duration_minutes,
            category,
            vimeo_url,
            creator_id,
            views,
            likes,
            status
        `)
        .in('id', drillIds);

    if (drillsError) {
        console.error('Failed to fetch drills:', drillsError);
        return [];
    }

    // Step 3: Fetch creator info separately
    const creatorIds = [...new Set((drills || []).map((d: any) => d.creator_id).filter(Boolean))];
    let creatorMap = new Map<string, { name: string; profile_image: string }>();

    if (creatorIds.length > 0) {
        const { data: creators } = await supabase
            .from('creators')
            .select('id, name, profile_image')
            .in('id', creatorIds);

        (creators || []).forEach((c: any) => {
            creatorMap.set(c.id, { name: c.name, profile_image: c.profile_image });
        });
    }

    const savedAtMap = new Map(interactions.map(i => [i.content_id, i.created_at]));

    return (drills || []).map((drill: any) => {
        const creator = creatorMap.get(drill.creator_id);
        const mins = drill.duration_minutes || 0;
        return {
            id: drill.id,
            title: drill.title,
            description: drill.description,
            thumbnailUrl: drill.thumbnail_url,
            difficulty: drill.difficulty,
            durationMinutes: mins,
            duration: mins > 0 ? `${mins}분` : '',
            category: drill.category,
            vimeoUrl: drill.vimeo_url,
            creatorId: drill.creator_id,
            creatorName: creator?.name,
            creatorProfileImage: creator?.profile_image,
            views: drill.views || 0,
            likes: drill.likes || 0,
            price: 0, // Drills are free
            aspectRatio: '9:16',
            savedAt: savedAtMap.get(drill.id)
        };
    });
}

export async function getUserLikedSparring(_userId: string) {
    const interactions = await getUserInteractions('like', 'sparring');
    return interactions.map(i => ({ id: i.content_id }));
}

export async function getUserSavedSparring(userId: string) {
    const { data, error } = await supabase
        .from('user_interactions')
        .select(`
      content_id,
      created_at,
      sparring_videos (
        id,
        title,
        description,
        thumbnail_url,
        duration_minutes,
        creator_id,
        video_url,
        creator:creators (
          name,
          profile_image
        )
      )
    `)
        .eq('user_id', userId)
        .eq('content_type', 'sparring')
        .eq('interaction_type', 'save')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch saved sparring:', error);
        return [];
    }

    return (data || []).map((item: any) => ({
        id: item.content_id,
        ...item.sparring_videos,
        creatorName: item.sparring_videos?.creator?.name,
        creatorProfileImage: item.sparring_videos?.creator?.profile_image,
        savedAt: item.created_at
    }));
}

// Check functions
export const checkDrillLiked = (_userId: string, drillId: string) => hasInteraction('drill', drillId, 'like');
export const checkLessonLiked = (_userId: string, lessonId: string) => hasInteraction('lesson', lessonId, 'like');
export const checkSparringLiked = (_userId: string, sparringId: string) => hasInteraction('sparring', sparringId, 'like');
export const checkCourseLiked = (_userId: string, courseId: string) => hasInteraction('course', courseId, 'like');
export const checkRoutineLiked = (_userId: string, routineId: string) => hasInteraction('routine', routineId, 'like');

// User Interacted Content List Helpers - defined above

// Check functions for backward compatibility
export const checkCourseSaved = (_userId: string, courseId: string) => hasInteraction('course', courseId, 'save');
export const checkRoutineSaved = (_userId: string, routineId: string) => hasInteraction('routine', routineId, 'save');
export const checkSparringSaved = (_userId: string, sparringId: string) => hasInteraction('sparring', sparringId, 'save');
export const checkLessonSaved = (_userId: string, lessonId: string) => hasInteraction('lesson', lessonId, 'save');
export const checkDrillSaved = (_userId: string, drillId: string) => hasInteraction('drill', drillId, 'save');

