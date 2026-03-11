/**
 * Shared utilities for daily content selection
 * Ensures consistency between Landing Page and Home Page
 */

// Centralized query limits to ensure same data set for selection
export const DAILY_QUERY_LIMITS = {
    DRILLS: 100,
    LESSONS: 100,
    SPARRING: 100
};

// Deterministic seeds for each type
export const DAILY_SEEDS = {
    DRILL: 456,
    LESSON: 789,
    SPARRING: 123
};

/**
 * Get KST date string in YYYY-MM-DD format
 */
export function getKSTDateString(): string {
    return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
}

/**
 * Deterministic random index selection based on date seed
 */
export function calculateDailyIndex(arrayLength: number, typeSeed: number): number {
    if (arrayLength === 0) return 0;
    
    const today = new Date();
    const kstParts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    }).formatToParts(today);
    
    const year = parseInt(kstParts.find(p => p.type === 'year')!.value);
    const month = parseInt(kstParts.find(p => p.type === 'month')!.value);
    const day = parseInt(kstParts.find(p => p.type === 'day')!.value);
    
    const seed = year * 10000 + month * 100 + day;
    const x = Math.sin(seed + typeSeed) * 10000;
    return Math.floor((x - Math.floor(x)) * arrayLength);
}

/**
 * Standardize slide order and structure for Daily Carousels
 */
export function createDailySlides(lesson: any, drill: any, sparring: any) {
    return [
        lesson && { type: 'lesson', data: lesson },
        drill && { type: 'drill', data: drill },
        sparring && { type: 'sparring', data: sparring }
    ].filter(Boolean);
}
