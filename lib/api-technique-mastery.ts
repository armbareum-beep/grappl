import { supabase } from './supabase';
import {
    Technique,
    UserTechniqueMastery,
    TechniqueXpTransaction,
    TechniqueGoal,
    TechniqueSummary,
    TechniqueDetailData,
    TechniqueXpSourceType,
    TechniqueCategory,
    MasteryLevel,
    Course,
    Drill,
    DrillRoutine
} from '../types';

// ============================================================================
// Transform Functions
// ============================================================================

function transformTechnique(data: any): Technique {
    return {
        id: data.id,
        category: data.category,
        name: data.name,
        nameEn: data.name_en,
        description: data.description,
        difficulty: data.difficulty,
        impactStanding: parseFloat(data.impact_standing) || 0,
        impactGuard: parseFloat(data.impact_guard) || 0,
        impactPass: parseFloat(data.impact_pass) || 0,
        impactSubmission: parseFloat(data.impact_submission) || 0,
        recommendedCourseIds: data.recommended_course_ids,
        recommendedDrillIds: data.recommended_drill_ids,
        createdAt: data.created_at
    };
}

function transformUserTechniqueMastery(data: any): UserTechniqueMastery {
    return {
        id: data.id,
        userId: data.user_id,
        techniqueId: data.technique_id,
        masteryLevel: data.mastery_level,
        masteryXp: data.mastery_xp,
        progressPercent: parseFloat(data.progress_percent) || 0,
        totalSuccessCount: data.total_success_count,
        totalAttemptCount: data.total_attempt_count,
        lastSuccessDate: data.last_success_date,
        lastPracticeDate: data.last_practice_date,
        technique: data.techniques ? transformTechnique(data.techniques) : undefined,
        createdAt: data.created_at,
        updatedAt: data.updated_at
    };
}

function transformTechniqueXpTransaction(data: any): TechniqueXpTransaction {
    return {
        id: data.id,
        userId: data.user_id,
        techniqueId: data.technique_id,
        xpAmount: data.xp_amount,
        sourceType: data.source_type,
        sourceId: data.source_id,
        oldLevel: data.old_level,
        newLevel: data.new_level,
        oldXp: data.old_xp,
        newXp: data.new_xp,
        createdAt: data.created_at
    };
}

// ============================================================================
// Technique CRUD
// ============================================================================

export async function getTechniques(category?: TechniqueCategory) {
    let query = supabase
        .from('techniques')
        .select('*')
        .order('name', { ascending: true });

    if (category) {
        query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching techniques:', error);
        return { data: null, error };
    }

    return { data: data?.map(transformTechnique) || [], error: null };
}

export async function getTechniqueById(id: string) {
    const { data, error } = await supabase
        .from('techniques')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching technique:', error);
        return { data: null, error };
    }

    return { data: transformTechnique(data), error: null };
}

// ============================================================================
// User Technique Mastery
// ============================================================================

export async function getUserTechniqueMastery(userId: string, category?: TechniqueCategory) {
    let query = supabase
        .from('user_technique_mastery')
        .select(`
            *,
            techniques (*)
        `)
        .eq('user_id', userId)
        .order('mastery_level', { ascending: false });

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching user technique mastery:', error);
        return { data: null, error };
    }

    let masteryData = data?.map(transformUserTechniqueMastery) || [];

    // Filter by category if specified
    if (category) {
        masteryData = masteryData.filter(m => m.technique?.category === category);
    }

    return { data: masteryData, error: null };
}

export async function getUserTechniqueMasteryById(userId: string, techniqueId: string) {
    const { data, error } = await supabase
        .from('user_technique_mastery')
        .select(`
            *,
            techniques (*)
        `)
        .eq('user_id', userId)
        .eq('technique_id', techniqueId)
        .maybeSingle();

    if (error) {
        if (error.code === 'PGRST116') {
            // No mastery record yet, return null
            return { data: null, error: null };
        }
        console.error('Error fetching user technique mastery:', error);
        return { data: null, error };
    }

    return { data: transformUserTechniqueMastery(data), error: null };
}

export async function getUserTechniqueSummary(userId: string) {
    const { data, error } = await supabase
        .rpc('get_user_technique_summary', { p_user_id: userId });

    if (error) {
        console.error('Error fetching technique summary:', error);
        return { data: null, error };
    }

    const summary: TechniqueSummary[] = (data || []).map((item: any) => ({
        category: item.category,
        totalTechniques: parseInt(item.total_techniques) || 0,
        masteredTechniques: parseInt(item.mastered_techniques) || 0,
        avgMasteryLevel: parseFloat(item.avg_mastery_level) || 0,
        totalXp: parseInt(item.total_xp) || 0
    }));

    return { data: summary, error: null };
}

// ============================================================================
// Award XP
// ============================================================================

export async function awardTechniqueXp(
    userId: string,
    techniqueId: string,
    sourceType: TechniqueXpSourceType,
    sourceId?: string,
    isSuccess?: boolean,
    customXpAmount?: number
) {
    // Determine XP amount
    const xpAmount = customXpAmount !== undefined ? customXpAmount :
        (sourceType === 'sparring_success' && isSuccess) ? 10 :
            (sourceType === 'sparring_attempt' && !isSuccess) ? 3 :
                getDefaultXpForSource(sourceType);

    const { data, error } = await supabase.rpc('award_technique_xp', {
        p_user_id: userId,
        p_technique_id: techniqueId,
        p_xp_amount: xpAmount,
        p_source_type: sourceType,
        p_source_id: sourceId,
        p_is_success: isSuccess
    });

    if (error) {
        console.error('Error awarding technique XP:', error);
        return { data: null, error };
    }

    const result = data?.[0];
    return {
        data: {
            leveledUp: result?.leveled_up || false,
            oldLevel: result?.old_level || 1,
            newLevel: result?.new_level || 1,
            newXp: result?.new_xp || 0,
            combatStatsUpdated: result?.combat_stats_updated || {}
        },
        error: null
    };
}

function getDefaultXpForSource(sourceType: TechniqueXpSourceType): number {
    const xpMap: Record<TechniqueXpSourceType, number> = {
        course_lesson: 30,
        routine_completion: 20,
        drill_practice: 15,
        sparring_success: 10,
        sparring_attempt: 3,
        training_log: 5,
        feed_post: 3,
        instructor_endorsement: 50,
        manual: 0
    };
    return xpMap[sourceType] || 0;
}

// ============================================================================
// XP Transactions (History)
// ============================================================================

export async function getTechniqueXpHistory(userId: string, techniqueId?: string, limit = 50) {
    let query = supabase
        .from('technique_xp_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (techniqueId) {
        query = query.eq('technique_id', techniqueId);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching XP history:', error);
        return { data: null, error };
    }

    return { data: data?.map(transformTechniqueXpTransaction) || [], error: null };
}

// ============================================================================
// Technique Detail Data (Comprehensive)
// ============================================================================

export async function getTechniqueDetailData(userId: string, techniqueId: string): Promise<{ data: TechniqueDetailData | null; error: any }> {
    try {
        // 1. Get technique info
        const { data: technique, error: techError } = await getTechniqueById(techniqueId);
        if (techError || !technique) {
            return { data: null, error: techError };
        }

        // 2. Get user mastery
        let { data: mastery, error: masteryError } = await getUserTechniqueMasteryById(userId, techniqueId);

        // If no mastery exists, create initial record
        if (!mastery) {
            mastery = {
                id: '',
                userId,
                techniqueId,
                masteryLevel: 1,
                masteryXp: 0,
                progressPercent: 0,
                totalSuccessCount: 0,
                totalAttemptCount: 0,
                technique,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
        }

        // 3. Get XP history
        const { data: xpHistory } = await getTechniqueXpHistory(userId, techniqueId, 100);

        // 4. Get related courses
        const { data: courseLinks } = await supabase
            .from('technique_course_links')
            .select('course_id')
            .eq('technique_id', techniqueId);

        const courseIds = courseLinks?.map(l => l.course_id) || technique.recommendedCourseIds || [];
        let relatedCourses: Course[] = [];
        if (courseIds.length > 0) {
            const { data: courses } = await supabase
                .from('courses')
                .select('*')
                .in('id', courseIds);
            relatedCourses = courses || [];
        }

        // 5. Get related drills
        const { data: drillLinks } = await supabase
            .from('technique_drill_links')
            .select('drill_id')
            .eq('technique_id', techniqueId);

        const drillIds = drillLinks?.map(l => l.drill_id) || technique.recommendedDrillIds || [];
        let relatedDrills: Drill[] = [];
        if (drillIds.length > 0) {
            const { data: drills } = await supabase
                .from('drills')
                .select('*')
                .in('id', drillIds);
            relatedDrills = drills || [];
        }

        // 6. Get related routines
        const { data: routineLinks } = await supabase
            .from('technique_routine_links')
            .select('routine_id')
            .eq('technique_id', techniqueId);

        const routineIds = routineLinks?.map(l => l.routine_id) || [];
        let relatedRoutines: DrillRoutine[] = [];
        if (routineIds.length > 0) {
            const { data: routines } = await supabase
                .from('routines')
                .select('*')
                .in('id', routineIds);
            relatedRoutines = routines || [];
        }

        // 7. Calculate weekly XP trend
        const weeklyXpTrend = calculateWeeklyXpTrend(xpHistory || []);

        // 8. Calculate success rate
        const successRate = mastery.totalAttemptCount > 0
            ? (mastery.totalSuccessCount / mastery.totalAttemptCount) * 100
            : 0;

        const detailData: TechniqueDetailData = {
            mastery,
            technique,
            relatedCourses,
            relatedDrills,
            relatedRoutines,
            xpHistory: xpHistory || [],
            sparringHistory: [], // TODO: Implement when sparring log is ready
            feedPosts: [], // TODO: Implement when feed is ready
            weeklyXpTrend,
            successRate
        };

        return { data: detailData, error: null };
    } catch (error) {
        console.error('Error fetching technique detail data:', error);
        return { data: null, error };
    }
}

function calculateWeeklyXpTrend(xpHistory: TechniqueXpTransaction[]): { week: string; xp: number }[] {
    const weekMap = new Map<string, number>();
    const now = new Date();

    // Get last 12 weeks
    for (let i = 11; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (i * 7));
        const weekKey = weekStart.toISOString().split('T')[0].substring(0, 10);
        weekMap.set(weekKey, 0);
    }

    // Aggregate XP by week
    xpHistory.forEach(tx => {
        const txDate = new Date(tx.createdAt);
        const weekStart = new Date(txDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0].substring(0, 10);

        if (weekMap.has(weekKey)) {
            weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + tx.xpAmount);
        }
    });

    return Array.from(weekMap.entries()).map(([week, xp]) => ({ week, xp }));
}

// ============================================================================
// Technique Goals
// ============================================================================

export async function getUserTechniqueGoals(userId: string, month?: string) {
    let query = supabase
        .from('user_technique_goals')
        .select(`
            *,
            techniques (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (month) {
        query = query.eq('target_month', month);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching technique goals:', error);
        return { data: null, error };
    }

    const goals: TechniqueGoal[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        techniqueId: item.technique_id,
        targetLevel: item.target_level,
        targetMonth: item.target_month,
        completed: item.completed,
        completedAt: item.completed_at,
        technique: item.techniques ? transformTechnique(item.techniques) : undefined,
        createdAt: item.created_at
    }));

    return { data: goals, error: null };
}

export async function createTechniqueGoal(
    userId: string,
    techniqueId: string,
    targetLevel: MasteryLevel,
    targetMonth: string
) {
    const { data, error } = await supabase
        .from('user_technique_goals')
        .insert({
            user_id: userId,
            technique_id: techniqueId,
            target_level: targetLevel,
            target_month: targetMonth
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating technique goal:', error);
        return { data: null, error };
    }

    return { data, error: null };
}

export async function deleteTechniqueGoal(goalId: string) {
    const { error } = await supabase
        .from('user_technique_goals')
        .delete()
        .eq('id', goalId);

    if (error) {
        console.error('Error deleting technique goal:', error);
        return { error };
    }

    return { error: null };
}
