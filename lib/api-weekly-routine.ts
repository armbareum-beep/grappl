import { supabase } from './supabase';
import { WeeklyRoutinePlan, WeeklySchedule } from '../types';

// ============================================================================
// Transform Functions
// ============================================================================

export function transformWeeklyRoutinePlan(data: any): WeeklyRoutinePlan {
    return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        schedule: data.schedule || {},
        isPublic: data.is_public,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        thumbnailUrl: data.thumbnail_url,
        description: data.description,
        tags: data.tags || [],
        view_count: data.view_count || 0,
        creatorName: data.users?.name,
        creatorAvatar: data.users?.avatar_url
    };
}

// ============================================================================
// CRUD Operations
// ============================================================================

/**
 * List all weekly routine plans for a user
 */
export async function listUserWeeklyRoutinePlans(userId: string) {
    const { data, error } = await supabase
        .from('weekly_routine_plans')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('Error fetching weekly routine plans:', error);
        return { data: [], error };
    }

    return { data: data.map(transformWeeklyRoutinePlan), error: null };
}

/**
 * Get a single weekly routine plan by ID
 */
export async function getWeeklyRoutinePlan(planId: string) {
    const { data, error } = await supabase
        .from('weekly_routine_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();

    if (error) return { data: null, error };
    return { data: transformWeeklyRoutinePlan(data), error: null };
}

/**
 * Create a new weekly routine plan
 */
export async function createWeeklyRoutinePlan(
    userId: string,
    title: string,
    schedule: WeeklySchedule,
    isPublic: boolean = false,
    description?: string,
    tags?: string[]
) {
    const { data, error } = await supabase
        .from('weekly_routine_plans')
        .insert({
            user_id: userId,
            title: title,
            schedule: schedule,
            is_public: isPublic,
            description: description,
            tags: tags
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating weekly routine plan:', error);
        return { data: null, error };
    }

    return { data: transformWeeklyRoutinePlan(data), error: null };
}

/**
 * Update an existing weekly routine plan
 */
export async function updateWeeklyRoutinePlan(
    planId: string,
    title: string,
    schedule: WeeklySchedule,
    isPublic?: boolean,
    description?: string,
    tags?: string[]
) {
    const updateData: any = {
        title: title,
        schedule: schedule,
        updated_at: new Date().toISOString()
    };

    if (typeof isPublic === 'boolean') {
        updateData.is_public = isPublic;
    }
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;

    const { data, error } = await supabase
        .from('weekly_routine_plans')
        .update(updateData)
        .eq('id', planId)
        .select()
        .single();

    if (error) {
        console.error('Error updating weekly routine plan:', error);
        return { data: null, error };
    }

    return { data: transformWeeklyRoutinePlan(data), error: null };
}

/**
 * Delete a weekly routine plan
 */
export async function deleteWeeklyRoutinePlan(planId: string) {
    const { error } = await supabase
        .from('weekly_routine_plans')
        .delete()
        .eq('id', planId);

    return { error };
}

/**
 * Save or Update wrapper
 */
export async function saveWeeklyRoutinePlan(
    userId: string,
    schedule: WeeklySchedule,
    planId?: string,
    title: string = '나의 주간 루틴',
    isPublic: boolean = false,
    description?: string,
    tags?: string[]
) {
    if (planId) {
        return updateWeeklyRoutinePlan(planId, title, schedule, isPublic, description, tags);
    } else {
        return createWeeklyRoutinePlan(userId, title, schedule, isPublic, description, tags);
    }
}
