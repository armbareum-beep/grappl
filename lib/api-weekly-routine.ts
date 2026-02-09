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

interface CreateWeeklyRoutinePlanInput {
    user_id: string;
    title: string;
    schedule: WeeklySchedule;
    is_public: boolean;
    description?: string;
    tags?: string[];
    thumbnail_url?: string | null;
}

/**
 * Create a new weekly routine plan
 */
export async function createWeeklyRoutinePlan(plan: CreateWeeklyRoutinePlanInput) {
    const { data, error } = await supabase
        .from('weekly_routine_plans')
        .insert({
            user_id: plan.user_id,
            title: plan.title,
            schedule: plan.schedule as any,
            is_public: plan.is_public,
            description: plan.description,
            tags: plan.tags,
            thumbnail_url: plan.thumbnail_url
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating weekly routine plan:', error);
        return { data: null, error };
    }

    return { data: transformWeeklyRoutinePlan(data), error: null };
}

interface UpdateWeeklyRoutinePlanInput {
    title: string;
    schedule: WeeklySchedule;
    is_public?: boolean;
    description?: string;
    tags?: string[];
    thumbnail_url?: string | null;
}

/**
 * Update an existing weekly routine plan
 */
export async function updateWeeklyRoutinePlan(
    planId: string,
    plan: UpdateWeeklyRoutinePlanInput
) {
    const updateData: any = {
        title: plan.title,
        schedule: plan.schedule as any,
        updated_at: new Date().toISOString()
    };

    if (typeof plan.is_public === 'boolean') {
        updateData.is_public = plan.is_public;
    }
    if (plan.description !== undefined) updateData.description = plan.description;
    if (plan.tags !== undefined) updateData.tags = plan.tags;
    if (plan.thumbnail_url !== undefined) updateData.thumbnail_url = plan.thumbnail_url;


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
export interface WeeklyRoutineSaveData {
    title: string;
    schedule: WeeklySchedule;
    isPublic: boolean;
    description?: string;
    tags?: string[];
    thumbnailUrl?: string | null;
}

export async function saveWeeklyRoutinePlan(
    plan: WeeklyRoutineSaveData,
    userId: string,
    planId?: string | null
) {
    if (planId) {
        return updateWeeklyRoutinePlan(planId, {
            title: plan.title,
            schedule: plan.schedule,
            is_public: plan.isPublic,
            description: plan.description,
            tags: plan.tags,
            thumbnail_url: plan.thumbnailUrl
        });
    } else {
        return createWeeklyRoutinePlan({
            user_id: userId,
            title: plan.title,
            schedule: plan.schedule,
            is_public: plan.isPublic,
            description: plan.description,
            tags: plan.tags,
            thumbnail_url: plan.thumbnailUrl
        });
    }
}
