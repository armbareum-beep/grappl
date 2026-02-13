/**
 * Rule-based Personalized Recommendation API
 *
 * Recommendation scoring based on:
 * 1. Followed creators (highest priority)
 * 2. Frequently viewed categories
 * 3. User's skill level matching
 * 4. Recency boost for new content
 */

import { supabase } from './supabase';
import { Drill } from '../types';

interface UserPreferences {
    followedCreatorIds: string[];
    topCategories: string[];
    preferredDifficulty: string | null;
    viewedContentIds: string[];
}

/**
 * Get user's preference data for personalization
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences> {
    const [followedCreators, categoryStats, viewHistory] = await Promise.all([
        // 1. Get followed creators
        supabase
            .from('user_interactions')
            .select('content_id')
            .eq('user_id', userId)
            .eq('content_type', 'creator')
            .eq('interaction_type', 'follow'),

        // 2. Get most viewed categories (from drill views)
        supabase
            .from('user_interactions')
            .select('content_id, view_count')
            .eq('user_id', userId)
            .eq('content_type', 'drill')
            .eq('interaction_type', 'view')
            .order('view_count', { ascending: false })
            .limit(50),

        // 3. Get recently viewed drills (to exclude from recommendations)
        supabase
            .from('user_interactions')
            .select('content_id')
            .eq('user_id', userId)
            .eq('content_type', 'drill')
            .eq('interaction_type', 'view')
            .order('last_interacted_at', { ascending: false })
            .limit(100)
    ]);

    const followedCreatorIds = (followedCreators.data || []).map(f => f.content_id);
    const viewedContentIds = (viewHistory.data || []).map(v => v.content_id);

    // Fetch categories from viewed drills
    let topCategories: string[] = [];
    if (categoryStats.data && categoryStats.data.length > 0) {
        const drillIds = categoryStats.data.map(v => v.content_id);
        const { data: drillData } = await supabase
            .from('drills')
            .select('category')
            .in('id', drillIds);

        if (drillData) {
            // Count category frequency
            const categoryCount: Record<string, number> = {};
            drillData.forEach(d => {
                if (d.category) {
                    categoryCount[d.category] = (categoryCount[d.category] || 0) + 1;
                }
            });

            // Sort by frequency and get top 3
            topCategories = Object.entries(categoryCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([cat]) => cat);
        }
    }

    // Get user's preferred difficulty from profile or interaction history
    let preferredDifficulty: string | null = null;
    const { data: profile } = await supabase
        .from('profiles')
        .select('skill_level')
        .eq('id', userId)
        .single();

    if (profile?.skill_level) {
        preferredDifficulty = profile.skill_level;
    }

    return {
        followedCreatorIds,
        topCategories,
        preferredDifficulty,
        viewedContentIds
    };
}

/**
 * Calculate recommendation score for a drill
 */
function calculateRecommendationScore(
    drill: any,
    preferences: UserPreferences,
    now: number
): number {
    let score = 0;

    // 1. Followed creator boost (+50 points)
    if (preferences.followedCreatorIds.includes(drill.creator_id)) {
        score += 50;
    }

    // 2. Preferred category boost (+30 points for top category, +20 for 2nd, +10 for 3rd)
    const categoryIndex = preferences.topCategories.indexOf(drill.category);
    if (categoryIndex === 0) score += 30;
    else if (categoryIndex === 1) score += 20;
    else if (categoryIndex === 2) score += 10;

    // 3. Difficulty match boost (+15 points)
    if (preferences.preferredDifficulty && drill.difficulty === preferences.preferredDifficulty) {
        score += 15;
    }

    // 4. Recency boost (up to +20 points for content from last 7 days)
    if (drill.created_at) {
        const createdAt = new Date(drill.created_at).getTime();
        const daysSinceCreation = (now - createdAt) / (1000 * 60 * 60 * 24);
        if (daysSinceCreation <= 7) {
            score += Math.round(20 * (1 - daysSinceCreation / 7));
        }
    }

    // 5. Popularity boost (up to +10 points based on views)
    const views = drill.views || 0;
    score += Math.min(10, Math.floor(views / 100));

    // 6. Already viewed penalty (-100 points to push to end)
    if (preferences.viewedContentIds.includes(drill.id)) {
        score -= 100;
    }

    return score;
}

/**
 * Get personalized drill recommendations
 */
export async function getPersonalizedDrills(
    userId: string | null,
    limit: number = 200
): Promise<Drill[]> {
    // Fetch all drills
    const { data: drills, error } = await supabase
        .from('drills')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            vimeo_url,
            category,
            difficulty,
            duration_minutes,
            views,
            created_at,
            creator_id,
            creators (
                id,
                name,
                profile_image
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !drills) {
        console.error('Failed to fetch drills:', error);
        return [];
    }

    // If no user, return shuffled drills
    if (!userId) {
        return shuffleArray(drills.map(transformDrill));
    }

    // Get user preferences
    const preferences = await getUserPreferences(userId);

    // If user has no interaction history, return shuffled
    const hasPreferences =
        preferences.followedCreatorIds.length > 0 ||
        preferences.topCategories.length > 0 ||
        preferences.preferredDifficulty;

    if (!hasPreferences) {
        return shuffleArray(drills.map(transformDrill));
    }

    const now = Date.now();

    // Score and sort drills
    const scoredDrills = drills.map(drill => ({
        drill,
        score: calculateRecommendationScore(drill, preferences, now)
    }));

    // Sort by score (descending), then add randomness within same score range
    scoredDrills.sort((a, b) => {
        const scoreDiff = b.score - a.score;
        // If scores are within 5 points, randomize
        if (Math.abs(scoreDiff) <= 5) {
            return Math.random() - 0.5;
        }
        return scoreDiff;
    });

    return scoredDrills.map(({ drill }) => transformDrill(drill));
}

/**
 * Transform database drill to app Drill type
 */
function transformDrill(drill: any): Drill {
    return {
        id: drill.id,
        title: drill.title,
        description: drill.description || '',
        thumbnailUrl: drill.thumbnail_url,
        vimeoUrl: drill.vimeo_url,
        category: drill.category,
        difficulty: drill.difficulty,
        durationMinutes: drill.duration_minutes,
        views: drill.views || 0,
        createdAt: drill.created_at,
        creatorId: drill.creator_id,
        creatorName: drill.creators?.name || 'Unknown',
        creatorProfileImage: drill.creators?.profile_image
    };
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Get recommendation debug info (for development/testing)
 */
export async function getRecommendationDebugInfo(userId: string) {
    const preferences = await getUserPreferences(userId);
    return {
        followedCreators: preferences.followedCreatorIds.length,
        topCategories: preferences.topCategories,
        preferredDifficulty: preferences.preferredDifficulty,
        viewedDrills: preferences.viewedContentIds.length
    };
}

/**
 * Get user preferences for lessons
 */
async function getUserLessonPreferences(userId: string) {
    const [followedCreators, viewHistory] = await Promise.all([
        supabase
            .from('user_interactions')
            .select('content_id')
            .eq('user_id', userId)
            .eq('content_type', 'creator')
            .eq('interaction_type', 'follow'),

        supabase
            .from('user_interactions')
            .select('content_id')
            .eq('user_id', userId)
            .eq('content_type', 'lesson')
            .eq('interaction_type', 'view')
            .order('last_interacted_at', { ascending: false })
            .limit(100)
    ]);

    return {
        followedCreatorIds: (followedCreators.data || []).map(f => f.content_id),
        viewedContentIds: (viewHistory.data || []).map(v => v.content_id)
    };
}

/**
 * Get personalized lesson recommendations
 */
export async function getPersonalizedLessons(
    userId: string | null,
    limit: number = 200
) {
    const { data: lessons, error } = await supabase
        .from('lessons')
        .select(`
            id,
            title,
            description,
            thumbnail_url,
            duration_minutes,
            lesson_number,
            views,
            created_at,
            course_id,
            courses (
                id,
                title,
                creator_id,
                creators (
                    id,
                    name,
                    profile_image
                )
            )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !lessons) {
        console.error('Failed to fetch lessons:', error);
        return [];
    }

    const transformed = lessons.map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description || '',
        thumbnailUrl: lesson.thumbnail_url,
        durationMinutes: lesson.duration_minutes,
        lessonNumber: lesson.lesson_number,
        views: lesson.views || 0,
        createdAt: lesson.created_at,
        courseId: lesson.course_id,
        courseTitle: lesson.courses?.title,
        creatorId: lesson.courses?.creator_id,
        creatorName: lesson.courses?.creators?.name || 'Unknown',
        creatorProfileImage: lesson.courses?.creators?.profile_image
    }));

    if (!userId) {
        return shuffleArray(transformed);
    }

    const preferences = await getUserLessonPreferences(userId);

    if (preferences.followedCreatorIds.length === 0) {
        return shuffleArray(transformed);
    }

    const now = Date.now();

    const scored = transformed.map(lesson => {
        let score = 0;

        // Followed creator boost
        if (preferences.followedCreatorIds.includes(lesson.creatorId)) {
            score += 50;
        }

        // Recency boost
        if (lesson.createdAt) {
            const daysSince = (now - new Date(lesson.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince <= 7) {
                score += Math.round(20 * (1 - daysSince / 7));
            }
        }

        // Already viewed penalty
        if (preferences.viewedContentIds.includes(lesson.id)) {
            score -= 100;
        }

        return { lesson, score };
    });

    scored.sort((a, b) => {
        const diff = b.score - a.score;
        if (Math.abs(diff) <= 5) return Math.random() - 0.5;
        return diff;
    });

    return scored.map(({ lesson }) => lesson);
}
