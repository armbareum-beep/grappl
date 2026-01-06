
import { supabase } from './supabase';
import { Lesson, Difficulty, VideoCategory } from '../types';

// ==================== Lessons ====================

export async function createLesson(lessonData: {
    courseId?: string | null;
    creatorId?: string;
    title: string;
    description: string;
    category?: VideoCategory;
    lessonNumber: number;
    vimeoUrl: string;
    length: string | number;
    difficulty: Difficulty;
    durationMinutes?: number;
    thumbnailUrl?: string;
}) {
    const { data, error } = await supabase
        .from('lessons')
        .insert([{
            course_id: lessonData.courseId || null,
            creator_id: lessonData.creatorId || null,
            title: lessonData.title,
            description: lessonData.description,
            category: lessonData.category || null,
            lesson_number: lessonData.lessonNumber,
            vimeo_url: lessonData.vimeoUrl,
            length: String(lessonData.length),
            difficulty: lessonData.difficulty,
            duration_minutes: lessonData.durationMinutes,
            thumbnail_url: lessonData.thumbnailUrl,
        }])

        .select()
        .single();

    return { data, error };
}

export async function updateLesson(id: string, updates: Partial<Lesson>) {
    const { data, error } = await supabase
        .from('lessons')
        .update({
            course_id: updates.courseId,
            title: updates.title,
            description: updates.description,
            category: updates.category,
            lesson_number: updates.lessonNumber,
            vimeo_url: updates.vimeoUrl,
            length: updates.length,
            difficulty: updates.difficulty,
            duration_minutes: updates.durationMinutes,
            thumbnail_url: updates.thumbnailUrl,
        })
        .eq('id', id)
        .select()
        .single();

    return { data, error };
}

export async function deleteLesson(id: string) {
    const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id);

    return { error };
}

export async function getLesson(id: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single();

    return { data, error };
}

export async function getLessonsByCourse(courseId: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('lesson_number');

    return { data, error };
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

    return { data, error };
}

export async function toggleLessonLike(userId: string, lessonId: string) {
    // Check if already liked
    const { data: existing } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', userId)
        .eq('content_type', 'lesson')
        .eq('content_id', lessonId)
        .eq('interaction_type', 'like')
        .single();

    if (existing) {
        // Unlike
        const { error } = await supabase
            .from('user_interactions')
            .delete()
            .eq('id', existing.id);
        return { liked: false, error };
    } else {
        // Like
        const { error } = await supabase
            .from('user_interactions')
            .insert([{
                user_id: userId,
                content_type: 'lesson',
                content_id: lessonId,
                interaction_type: 'like'
            }]);
        return { liked: true, error };
    }
}

export async function checkLessonLiked(userId: string, lessonId: string) {
    const { data, error } = await supabase
        .from('user_interactions')
        .select('id')
        .eq('user_id', userId)
        .eq('content_type', 'lesson')
        .eq('content_id', lessonId)
        .eq('interaction_type', 'like')
        .single();

    return { liked: !!data, error };
}
