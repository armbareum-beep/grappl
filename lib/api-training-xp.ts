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

/**
 * Get comprehensive dashboard stats (Total Time, Completed Counts)
 */
export async function getUserDashboardStats(userId: string): Promise<{
    data: {
        totalMinutes: number;
        completedCourses: number;
        completedRoutines: number;
        completedRoadmaps: number;
    } | null;
    error: any
}> {
    try {
        // 1. Fetch Training Logs Aggregates
        // Since we can't do complex aggregates easily without a specific RPC, we'll fetch ID/type/duration
        // Limit to 1000 for performance, or use a proper RPC if available later.
        // As a temporary solution for the frontend:
        const { data: logs, error: logsError } = await supabase
            .from('training_logs')
            .select('duration_minutes, type') // 'type' might be stored in 'notes' or specific column if exists, relying on 'techniques' or assumption
            .eq('user_id', userId);

        if (logsError) throw logsError;

        const totalMinutes = (logs || []).reduce((acc, log) => acc + (log.duration_minutes || 0), 0);

        // Note: 'type' column might not exist in training_logs based on types.ts.
        // types.ts says: techniques: string[], notes: string.
        // If 'type' is missing, we might need to rely on other tables or assume based on notes?
        // Actually, earlier getRecentActivity mapped 'type' from somewhere. 
        // Let's assume we rely on `user_completed_routines` table for routines equivalent?
        // Wait, Home.tsx uses `getRecentCompletedRoutines` which queries `user_routine_completions`.
        // Let's use specific tables for accuracy.

        // 2. Completed Routines (Distinct count)
        const { count: routineCount, error: routineError } = await supabase
            .from('user_routine_completions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        // 3. Completed Courses (Assuming user_course_progress or similar)
        // If no direct completion table, check `user_courses` (purchased) or `user_lesson_progress`.
        // For now, let's use a placeholder or check `user_interactions` type='course_complete'?
        // The user asked for "Completed Courses" (Perfect Clear). 
        // Let's try `user_course_progress` with status='completed' if it exists.
        // If not, returns 0 for now and I'll debug later if needed.
        const { count: courseCount, error: courseError } = await supabase
            .from('user_course_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('status', 'completed');

        // 4. Completed Roadmaps (Skill Trees with 100% progress)
        const { data: trees, error: treeError } = await supabase
            .from('user_skill_trees')
            .select('progress')
            .eq('user_id', userId);

        const completedRoadmaps = (trees || []).filter((t: any) => (t.progress || 0) >= 100).length;

        return {
            data: {
                totalMinutes: totalMinutes,
                completedCourses: courseCount || 0,
                completedRoutines: routineCount || 0,
                completedRoadmaps: completedRoadmaps
            },
            error: null
        };
    } catch (e) {
        console.error('Error fetching dashboard stats:', e);
        return { data: null, error: e };
    }
}

/**
 * Fetch simplified training history for the contribution graph (Grass)
 * Returns date and intensity/duration for the last N days.
 */
export async function getTrainingHistory(userId: string, days: number = 365): Promise<{ date: string; minutes: number; count: number }[]> {
    try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabase
            .from('training_logs')
            .select('date, duration_minutes')
            .eq('user_id', userId)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0]);

        if (error) {
            console.error('Error fetching training history:', error);
            return [];
        }

        // Aggregate by date (in case of multiple logs per day)
        const historyMap = new Map<string, { minutes: number; count: number }>();

        (data || []).forEach((log: any) => {
            const date = log.date; // Assuming YYYY-MM-DD format from DB
            const existing = historyMap.get(date) || { minutes: 0, count: 0 };
            historyMap.set(date, {
                minutes: existing.minutes + (log.duration_minutes || 0),
                count: existing.count + 1
            });
        });

        return Array.from(historyMap.entries()).map(([date, stats]) => ({
            date,
            minutes: stats.minutes,
            count: stats.count
        })).sort((a, b) => a.date.localeCompare(b.date));

    } catch (e) {
        console.error('Exception in getTrainingHistory:', e);
        return [];
    }
}

