
import { supabase } from './supabase';
import { Lesson, Difficulty, VideoCategory } from '../types';

// ==================== Lessons ====================

export function transformLesson(data: any): Lesson {
    return {
        id: data.id,
        courseId: data.course_id,
        creatorId: data.creator_id,
        title: data.title,
        description: data.description,
        category: data.category,
        lessonNumber: data.lesson_number,
        vimeoUrl: data.vimeo_url || data.action_video,
        videoUrl: data.video_url || data.action_video,
        thumbnailUrl: data.thumbnail_url || data.course?.thumbnail_url,
        courseTitle: data.course?.title,
        length: data.length,
        durationMinutes: data.duration_minutes || data.duration || 0,
        views: data.views || 0,
        difficulty: data.difficulty,
        createdAt: data.created_at,
        isSubscriptionExcluded: data.is_subscription_excluded ?? data.course?.is_subscription_excluded ?? false,
        isPreview: !!data.is_preview,
        isHidden: data.is_hidden ?? false,
        uniformType: data.uniform_type,
        price: data.price ?? data.course?.price ?? 0,
        likes: data.likes || 0,
    };
}

export async function createLesson(lessonData: {
    courseId?: string | null;
    creatorId?: string;
    title: string;
    description: string;
    category?: VideoCategory;
    lessonNumber: number;
    vimeoUrl?: string; // Optional for early creation
    length: string | number;
    difficulty: Difficulty;
    durationMinutes?: number;
    thumbnailUrl?: string;
    uniformType?: string;
}) {
    let finalThumbnailUrl = lessonData.thumbnailUrl;

    // Auto-fetch thumbnail if missing
    if (!finalThumbnailUrl && lessonData.vimeoUrl) {
        try {
            const { getVimeoVideoInfo } = await import('./vimeo');
            const videoInfo = await getVimeoVideoInfo(lessonData.vimeoUrl);
            if (videoInfo?.thumbnail) {
                finalThumbnailUrl = videoInfo.thumbnail;
            }
        } catch (err) {
            console.warn('Failed to auto-fetch lesson thumbnail:', err);
        }
    }

    const { data, error } = await supabase
        .from('lessons')
        .insert([{
            course_id: lessonData.courseId || null,
            creator_id: lessonData.creatorId || null,
            title: lessonData.title,
            description: lessonData.description,
            category: lessonData.category || null,
            lesson_number: lessonData.lessonNumber,
            vimeo_url: lessonData.vimeoUrl || null,
            length: lessonData.length ? String(lessonData.length) : null,
            difficulty: lessonData.difficulty,
            duration_minutes: lessonData.durationMinutes,
            thumbnail_url: finalThumbnailUrl,
            uniform_type: lessonData.uniformType,
        }])

        .select()
        .single();

    return { data, error };
}

export async function updateLesson(id: string, updates: Partial<Lesson>) {
    const dbData: any = {};
    if (updates.title) dbData.title = updates.title;
    if (updates.description) dbData.description = updates.description;
    if (updates.courseId !== undefined) dbData.course_id = updates.courseId;
    if (updates.creatorId) dbData.creator_id = updates.creatorId;
    if (updates.lessonNumber !== undefined) dbData.lesson_number = updates.lessonNumber;
    if (updates.vimeoUrl) dbData.vimeo_url = updates.vimeoUrl;
    if (updates.difficulty) dbData.difficulty = updates.difficulty;
    if (updates.uniformType) dbData.uniform_type = updates.uniformType;
    if (updates.durationMinutes !== undefined) dbData.duration_minutes = updates.durationMinutes;
    if (updates.length) dbData.length = String(updates.length);
    if (updates.thumbnailUrl) dbData.thumbnail_url = updates.thumbnailUrl;
    if (updates.category) dbData.category = updates.category;

    const { data, error } = await supabase
        .from('lessons')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function deleteLesson(id: string) {
    try {
        // Use backend API to delete lesson and associated Vimeo videos
        const res = await fetch('/api/delete-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentType: 'lesson', contentId: id })
        });

        if (!res.ok) {
            const data = await res.json();
            return { error: new Error(data.error || 'Failed to delete lesson') };
        }

        return { error: null };
    } catch (err: any) {
        console.error('Delete lesson error:', err);
        return { error: err };
    }
}

export async function getLessonById(id: string) {
    // First try with creator info
    const { data: dataWithCreator, error: errorWithCreator } = await supabase
        .from('lessons')
        .select('*,Creators:creators(name, profile_image)') // Use Creators alias if needed, or check supabase types. Using implicit join syntax first
        // If 'creators' is the table name, it usually works. Note: supabase JS client returns object structure mirroring query.
        .select('*, creators(name, profile_image)')
        .eq('id', id)
        .maybeSingle();

    if (!errorWithCreator && dataWithCreator) {
        return { data: transformLesson(dataWithCreator), error: null };
    }

    // If that fails (e.g., missing FK), try fetching just the lesson
    if (errorWithCreator) {
        console.warn('Fetching lesson with creator info failed, falling back to simple fetch:', errorWithCreator);
    }

    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    return { data: data ? transformLesson(data) : null, error };
}

export async function getLessons(limit: number = 200) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*, course:courses(title, thumbnail_url, is_subscription_excluded, price)')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('Error fetching lessons:', error);
        return [];
    }

    return (data || []).map(transformLesson);
}

export async function getCreatorLessons(creatorId: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    return { data: (data || []).map(transformLesson), error };

}

export async function getAllCreatorLessons(creatorId: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

    return { data: (data || []).map(transformLesson), error };

}

export async function getLessonsByCourse(courseId: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_number');

    return { data: (data || []).map(transformLesson), error };

}

export async function reorderLessons(lessonOrders: { id: string, lessonNumber: number }[]) {
    const updates = lessonOrders.map(({ id, lessonNumber }) =>
        supabase
            .from('lessons')
            .update({ lesson_number: lessonNumber })
            .eq('id', id)
    );

    const results = await Promise.all(updates);
    const firstError = results.find(r => r.error)?.error;

    return { error: firstError };
}

export async function removeLessonFromCourse(lessonId: string) {
    const { error } = await supabase
        .from('lessons')
        .update({ course_id: null })
        .eq('id', lessonId);

    return { error };
}

export async function getStandaloneLessons(creatorId?: string) {
    let query = supabase
        .from('lessons')
        .select('*')
        .is('course_id', null);

    if (creatorId) {
        // If we need to filter by creator, we'd need to join with courses table
        // For now, just return all standalone lessons
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    return { data: (data || []).map(transformLesson), error };

}
