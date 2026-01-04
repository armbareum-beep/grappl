
import { TrainingLog } from '../types';

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

    // Calculate UNIQUE training days in the last 30 days
    const uniqueDays = new Set(recentLogs.map(l => new Date(l.date).toDateString())).size;

    // Target: 3.5 sessions per week ≈ 14 sessions in 30 days
    const consistencyScore = Math.min(100, Math.round((uniqueDays / 14) * 100));

    // Volume Assessment (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyLogs = logs.filter(l => new Date(l.date) >= sevenDaysAgo);

    let volume: 'low' | 'optimal' | 'high' | 'overtraining' = 'low';
    const weeklyUniqueDays = new Set(weeklyLogs.map(l => new Date(l.date).toDateString())).size;

    // Injury Risk Mapping:
    // 5+ days/week -> Overtraining (HIGH Risk)
    // 4 days/week -> High (MEDIUM Risk)
    // 2-3 days/week -> Optimal (LOW Risk)
    // 0-1 days/week -> Low (LOW Risk)
    if (weeklyUniqueDays >= 5) volume = 'overtraining';
    else if (weeklyUniqueDays === 4) volume = 'high';
    else if (weeklyUniqueDays >= 2) volume = 'optimal';
    else volume = 'low';

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
        const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase().replace(/\s/g, '');

        // Simple keyword matching (no-space comparison)
        if (text.includes('top') || text.includes('pass') || text.includes('mount') || text.includes('side') ||
            text.includes('탑') || text.includes('패스') || text.includes('마운트') || text.includes('사이드') || text.includes('상위') ||
            text.includes('압박') || text.includes('스매시') || text.includes('무릎누르기')) topCount++;

        if (text.includes('bottom') || text.includes('guard') || text.includes('escape') ||
            text.includes('바텀') || text.includes('가드') || text.includes('이스케이프') || text.includes('하위') ||
            text.includes('리텐션') || text.includes('브릿지')) bottomCount++;

        // User preference or specific logs (Assuming default Gi if not specified?)
        if (text.includes('no-gi') || text.includes('nogi') || text.includes('no gi') || text.includes('노기')) {
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
        const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase().replace(/\s/g, '');

        if (text.includes('stand') || text.includes('takedown') || text.includes('judo') || text.includes('wrestle') || text.includes('스탠딩') || text.includes('테이크다운') || text.includes('유도') || text.includes('레슬링')) performedCategories.add('Standing');
        if (text.includes('guard') || text.includes('bottom') || text.includes('가드') || text.includes('하프') || text.includes('클로즈') || text.includes('데라히바') || text.includes('버터플라이')) performedCategories.add('Guard');
        if (text.includes('pass') || text.includes('top') || text.includes('패스') || text.includes('탑') || text.includes('압박')) performedCategories.add('Passing');
        if (text.includes('side') || text.includes('northsouth') || text.includes('kesa') || text.includes('사이드') || text.includes('곁누르기') || text.includes('남북')) performedCategories.add('Side');
        if (text.includes('mount') || text.includes('마운트')) performedCategories.add('Mount');
        if (text.includes('back') || text.includes('turtle') || text.includes('백') || text.includes('터틀')) performedCategories.add('Back');
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
        { key: 'Standing', keywords: ['standing', 'takedown', 'throw', 'wrestle', 'judo', 'singleleg', 'doubleleg', 'stand', '스탠딩', '테이크다운', '메치기', '레슬링', '유도', '싱글렉', '더블렉'] },
        { key: 'Guard', keywords: ['guard', 'bottom', 'spider', 'lasso', 'xguard', 'halfguard', 'retention', '가드', '바텀', '스파이더', '라쏘', '엑스가드', '하프가드', '클로즈가드', '데라히바', '버터플라이'] },
        { key: 'Passing', keywords: ['pass', 'top', 'torreando', 'kneecut', 'stack', 'pressure', 'smash', '패스', '탑', '토레안도', '니컷', '스택', '압박', '스매시'] },
        { key: 'Side', keywords: ['side', 'sidecontrol', 'northsouth', 'kesa', 'crossface', 'underhook', '사이드', '사이드컨트롤', '남북', '곁누르기', '크로스페이스', '언더훅'] },
        { key: 'Mount', keywords: ['mount', 'smount', 'highmount', '마운트', 's마운트', '하이마운트'] },
        { key: 'Back', keywords: ['back', 'backcontrol', 'hooks', 'turtle', 'rearnaked', 'choke', '백', '백컨트롤', '훅', '터틀', '리어네이키드', '초크'] }
    ];

    // Basic scoring: 1 occurrence = 20 points, max 100
    const recentLogs = logs.slice(0, 30);

    return categories.map(cat => {
        let score = 0;
        recentLogs.forEach(log => {
            const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase().replace(/\s/g, '');
            if (cat.keywords.some(k => text.includes(k))) {
                score += 20; // Revert to +20 per occurrence
            }
        });

        // Lowered minimum visual baseline to 10 for better accuracy
        const finalScore = Math.min(100, Math.max(10, score));

        return {
            subject: cat.key,
            A: finalScore,
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

    // Score: 0-100 based on consistency and volume trend
    // Baseline 70. Reverted to be a bit more generous.
    const avg = (weeks[1] + weeks[2] + weeks[3]) / 3 || 1;
    const ratio = weeks[0] / avg;
    const score = Math.min(100, Math.max(0, Math.round(70 * ratio)));

    return {
        weeklyXPTrend: reversedWeeks,
        trendDirection: trend,
        trend: uiTrend,
        score
    };
};
