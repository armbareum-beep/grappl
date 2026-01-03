
import { TrainingLog } from './types';

export interface ReadinessAnalysis {
    daysSinceLastTraining: number;
    hoursSinceLastTraining: number;
    muscleMemoryStatus: 'optimal' | 'decaying' | 'critical';
    consistencyScore: number;
    trainingVolumeAssessment: 'low' | 'optimal' | 'high' | 'overtraining';
}

export interface BalanceAnalysis {
    topRatio: number;
    bottomRatio: number;
    giRatio: number;
    noGiRatio: number;
    isBalanced: boolean;
    attack: number;
    defense: number;
}

/**
 * 1. Readiness Calculator
 * Based on 72-hour muscle memory theory
 */
export const analyzeReadiness = (logs: TrainingLog[]): ReadinessAnalysis => {
    if (logs.length === 0) {
        return {
            daysSinceLastTraining: -1,
            hoursSinceLastTraining: -1,
            muscleMemoryStatus: 'critical',
            consistencyScore: 0,
            trainingVolumeAssessment: 'low'
        };
    }

    const lastLog = logs[0]; // Assumes logs are sorted desc
    const now = new Date();
    const lastDate = new Date(lastLog.date);

    // Calculate hours diff
    const diffMs = now.getTime() - lastDate.getTime();
    const hoursSince = Math.floor(diffMs / (1000 * 60 * 60));
    const daysSince = Math.floor(hoursSince / 24);

    let status: 'optimal' | 'decaying' | 'critical' = 'optimal';
    if (hoursSince > 72) status = 'critical'; // > 3 days
    else if (hoursSince > 48) status = 'decaying'; // 2-3 days

    // Consistency Score (Last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentLogs = logs.filter(l => new Date(l.date) >= thirtyDaysAgo);

    // Simple consistency logic: 3+ times a week is 100%
    // 30 days ~ 4 weeks. Target 12 sessions.
    const consistencyScore = Math.min(100, Math.round((recentLogs.length / 12) * 100));

    // Volume Assessment (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyLogs = logs.filter(l => new Date(l.date) >= sevenDaysAgo);

    let volume: 'low' | 'optimal' | 'high' | 'overtraining' = 'optimal';
    if (weeklyLogs.length < 2) volume = 'low';
    else if (weeklyLogs.length > 6) volume = 'overtraining';
    else if (weeklyLogs.length > 4) volume = 'high';

    return {
        daysSinceLastTraining: daysSince,
        hoursSinceLastTraining: hoursSince,
        muscleMemoryStatus: status,
        consistencyScore,
        trainingVolumeAssessment: volume
    };
};

/**
 * 2. Balance Analyzer
 * Top vs Bottom, Gi vs No-Gi
 */
export const analyzeBalance = (logs: TrainingLog[]): BalanceAnalysis => {
    let topCount = 0;
    let bottomCount = 0;
    let giCount = 0;
    let noGiCount = 0;

    logs.forEach(log => {
        const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase();

        // Simple keyword matching
        if (text.includes('top') || text.includes('pass') || text.includes('mount') || text.includes('side')) topCount++;
        if (text.includes('bottom') || text.includes('guard') || text.includes('escape')) bottomCount++;

        // User preference or specific logs (Assuming default Gi if not specified?)
        // Let's look for explicit 'no-gi' or 'nogi'. Default to Gi.
        if (text.includes('no-gi') || text.includes('nogi') || text.includes('no gi')) {
            noGiCount++;
        } else {
            giCount++; // Roughly assume Gi unless specified NoGi
        }
    });

    const totalPos = topCount + bottomCount || 1;
    const totalType = giCount + noGiCount || 1;

    return {
        topRatio: Math.round((topCount / totalPos) * 100),
        bottomRatio: Math.round((bottomCount / totalPos) * 100),
        giRatio: Math.round((giCount / totalType) * 100),
        noGiRatio: Math.round((noGiCount / totalType) * 100),
        isBalanced: Math.abs(topCount - bottomCount) < (totalPos * 0.2), // Within 20% diff
        attack: Math.round((topCount / totalPos) * 100), // Mapping Top -> Attack for simplicity
        defense: Math.round((bottomCount / totalPos) * 100) // Mapping Bottom -> Defense
    };
};

/**
 * 3. Blind Spot Identification
 * Returns categories that haven't been trained in the last 30 days
 */
export const identifyBlindSpots = (logs: TrainingLog[]): string[] => {
    if (logs.length === 0) return [];

    // Official Categories from types.ts / Drills.tsx
    const allCategories = ['Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'];

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = logs.filter(l => new Date(l.date) >= thirtyDaysAgo);

    const performedCategories = new Set<string>();

    recentLogs.forEach(log => {
        const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase();

        if (text.includes('stand') || text.includes('takedown') || text.includes('judo') || text.includes('wrestle')) performedCategories.add('Standing');
        if (text.includes('guard') || text.includes('bottom')) performedCategories.add('Guard');
        if (text.includes('pass') || text.includes('top')) performedCategories.add('Passing');
        if (text.includes('side') || text.includes('north south') || text.includes('kesa')) performedCategories.add('Side');
        if (text.includes('mount')) performedCategories.add('Mount');
        if (text.includes('back') || text.includes('turtle')) performedCategories.add('Back');
    });

    return allCategories.filter(cat => !performedCategories.has(cat));
};


/**
 * 4. Radar Chart Stats (Hexagon)
 * Categories: Standing, Guard, Passing, Side, Mount, Back (The 6 Pillars)
 */
export interface RadarStats {
    subject: string;
    A: number; // Score 0-100
    fullMark: number;
}

export const calculateRadarStats = (logs: TrainingLog[]): RadarStats[] => {
    // Official Categories mapping with keywords
    const categories = [
        { key: 'Standing', keywords: ['standing', 'takedown', 'throw', 'wrestle', 'judo', 'single leg', 'double leg', 'stand'] },
        { key: 'Guard', keywords: ['guard', 'bottom', 'spider', 'lasso', 'x-guard', 'half guard', 'retention'] },
        { key: 'Passing', keywords: ['pass', 'top', 'torreando', 'knee cut', 'stack', 'pressure', 'smash'] },
        { key: 'Side', keywords: ['side', 'side control', 'north south', 'kesa', 'cross face', 'underhook'] },
        { key: 'Mount', keywords: ['mount', 's-mount', 'high mount'] },
        { key: 'Back', keywords: ['back', 'back control', 'hooks', 'turtle', 'rear naked', 'choke'] }
    ];

    // Basic scoring: 1 occurrence = 20 points, max 100
    const recentLogs = logs.slice(0, 30);

    return categories.map(cat => {
        let score = 0;
        recentLogs.forEach(log => {
            const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase();
            if (cat.keywords.some(k => text.includes(k))) {
                score += 20;
            }
        });

        // Normalize 40-100 range for visuals (don't show 0 usually)
        const finalScore = Math.min(100, Math.max(30, score));

        return {
            subject: cat.key,
            A: score === 0 ? 30 : finalScore, // Minimum visual baseline
            fullMark: 100
        };
    });
};

/**
 * 5. 성장 모멘텀 (Momentum)
 */
export interface MomentumAnalysis {
    weeklyXPTrend: number[]; // Last 4 weeks
    trendDirection: 'rising' | 'falling' | 'stable';
    trend: 'up' | 'down' | 'stable'; // UI Alias
    score: number;
}

export const analyzeMomentum = (logs: TrainingLog[]): MomentumAnalysis => {
    // Bucket logs by week
    const now = new Date();
    const weeks = [0, 0, 0, 0]; // 0 = this week, 3 = 3 weeks ago

    logs.forEach(log => {
        const d = new Date(log.date);
        const diffTime = Math.abs(now.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 7) weeks[0] += (log.durationMinutes || 0);
        else if (diffDays <= 14) weeks[1] += (log.durationMinutes || 0);
        else if (diffDays <= 21) weeks[2] += (log.durationMinutes || 0);
        else if (diffDays <= 28) weeks[3] += (log.durationMinutes || 0);
    });

    // Simple XP calculation: 1 min = 1 XP (simplified)
    const reversedWeeks = [...weeks].reverse(); // [3 weeks ago, ..., this week]

    const trend = weeks[0] > weeks[1] ? 'rising' : (weeks[0] < weeks[1] ? 'falling' : 'stable');
    const uiTrend = weeks[0] > weeks[1] ? 'up' : (weeks[0] < weeks[1] ? 'down' : 'stable');

    // Simple Score: 0-100 based on consistency and volume trend
    // Base 50 + (this week vs avg)
    const avg = (weeks[1] + weeks[2] + weeks[3]) / 3 || 1;
    const ratio = weeks[0] / avg;
    const score = Math.min(100, Math.max(0, Math.round(50 * ratio)));

    return {
        weeklyXPTrend: reversedWeeks,
        trendDirection: trend,
        trend: uiTrend,
        score
    };
};
