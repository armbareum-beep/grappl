
import { supabase } from './supabase';
import { Lesson, Difficulty } from '../types';

// ==================== Lessons ====================

export async function createLesson(lessonData: {
    courseId?: string | null;
    title: string;
    description: string;
    lessonNumber: number;
    vimeoUrl: string;
    length: number;
    difficulty: Difficulty;
}) {
    const { data, error } = await supabase
        .from('lessons')
        .insert([{
            course_id: lessonData.courseId || null, // Allow null for standalone lessons
            title: lessonData.title,
            description: lessonData.description,
            lesson_number: lessonData.lessonNumber,
            vimeo_url: lessonData.vimeoUrl,
            length: lessonData.length,
            difficulty: lessonData.difficulty,
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
            lesson_number: updates.lessonNumber,
            vimeo_url: updates.vimeoUrl,
            length: updates.length,
            difficulty: updates.difficulty,
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
