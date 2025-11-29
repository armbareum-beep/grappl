import { supabase } from './supabase';

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
