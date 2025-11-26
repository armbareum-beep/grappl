// BJJ Belt System Constants and Utilities

export interface BeltLevel {
    level: number;
    belt: 'White' | 'Blue' | 'Purple' | 'Brown' | 'Black' | 'Red-Black' | 'Red-White' | 'Red';
    stripes: number;
    name: string;
    nameEn: string;
    color: string;
    xpRequired: number;
}

export const BELT_LEVELS: BeltLevel[] = [
    // White Belt (1-5) - 1-2 years, easier progression
    { level: 1, belt: 'White', stripes: 0, name: '하얀띠', nameEn: 'White Belt', color: '#FFFFFF', xpRequired: 0 },
    { level: 2, belt: 'White', stripes: 1, name: '하얀띠 1 스트라이프', nameEn: 'White Belt 1 Stripe', color: '#FFFFFF', xpRequired: 500 },
    { level: 3, belt: 'White', stripes: 2, name: '하얀띠 2 스트라이프', nameEn: 'White Belt 2 Stripes', color: '#FFFFFF', xpRequired: 1200 },
    { level: 4, belt: 'White', stripes: 3, name: '하얀띠 3 스트라이프', nameEn: 'White Belt 3 Stripes', color: '#FFFFFF', xpRequired: 2000 },
    { level: 5, belt: 'White', stripes: 4, name: '하얀띠 4 스트라이프', nameEn: 'White Belt 4 Stripes', color: '#FFFFFF', xpRequired: 3000 },

    // Blue Belt (6-10) - 2-3 years
    { level: 6, belt: 'Blue', stripes: 0, name: '파란띠', nameEn: 'Blue Belt', color: '#3B82F6', xpRequired: 5000 },
    { level: 7, belt: 'Blue', stripes: 1, name: '파란띠 1 스트라이프', nameEn: 'Blue Belt 1 Stripe', color: '#3B82F6', xpRequired: 7500 },
    { level: 8, belt: 'Blue', stripes: 2, name: '파란띠 2 스트라이프', nameEn: 'Blue Belt 2 Stripes', color: '#3B82F6', xpRequired: 10500 },
    { level: 9, belt: 'Blue', stripes: 3, name: '파란띠 3 스트라이프', nameEn: 'Blue Belt 3 Stripes', color: '#3B82F6', xpRequired: 14000 },
    { level: 10, belt: 'Blue', stripes: 4, name: '파란띠 4 스트라이프', nameEn: 'Blue Belt 4 Stripes', color: '#3B82F6', xpRequired: 18000 },

    // Purple Belt (11-15) - 2-3 years, getting harder
    { level: 11, belt: 'Purple', stripes: 0, name: '보라띠', nameEn: 'Purple Belt', color: '#9333EA', xpRequired: 24000 },
    { level: 12, belt: 'Purple', stripes: 1, name: '보라띠 1 스트라이프', nameEn: 'Purple Belt 1 Stripe', color: '#9333EA', xpRequired: 31000 },
    { level: 13, belt: 'Purple', stripes: 2, name: '보라띠 2 스트라이프', nameEn: 'Purple Belt 2 Stripes', color: '#9333EA', xpRequired: 39000 },
    { level: 14, belt: 'Purple', stripes: 3, name: '보라띠 3 스트라이프', nameEn: 'Purple Belt 3 Stripes', color: '#9333EA', xpRequired: 48000 },
    { level: 15, belt: 'Purple', stripes: 4, name: '보라띠 4 스트라이프', nameEn: 'Purple Belt 4 Stripes', color: '#9333EA', xpRequired: 58000 },

    // Brown Belt (16-20) - 2-3 years, much harder
    { level: 16, belt: 'Brown', stripes: 0, name: '갈띠', nameEn: 'Brown Belt', color: '#92400E', xpRequired: 72000 },
    { level: 17, belt: 'Brown', stripes: 1, name: '갈띠 1 스트라이프', nameEn: 'Brown Belt 1 Stripe', color: '#92400E', xpRequired: 88000 },
    { level: 18, belt: 'Brown', stripes: 2, name: '갈띠 2 스트라이프', nameEn: 'Brown Belt 2 Stripes', color: '#92400E', xpRequired: 106000 },
    { level: 19, belt: 'Brown', stripes: 3, name: '갈띠 3 스트라이프', nameEn: 'Brown Belt 3 Stripes', color: '#92400E', xpRequired: 126000 },
    { level: 20, belt: 'Brown', stripes: 4, name: '갈띠 4 스트라이프', nameEn: 'Brown Belt 4 Stripes', color: '#92400E', xpRequired: 148000 },

    // Black Belt (21-27) - Lifetime achievement
    { level: 21, belt: 'Black', stripes: 0, name: '검정띠', nameEn: 'Black Belt', color: '#000000', xpRequired: 180000 },
    { level: 22, belt: 'Black', stripes: 1, name: '검정띠 1 스트라이프', nameEn: 'Black Belt 1 Stripe', color: '#000000', xpRequired: 220000 },
    { level: 23, belt: 'Black', stripes: 2, name: '검정띠 2 스트라이프', nameEn: 'Black Belt 2 Stripes', color: '#000000', xpRequired: 270000 },
    { level: 24, belt: 'Black', stripes: 3, name: '검정띠 3 스트라이프', nameEn: 'Black Belt 3 Stripes', color: '#000000', xpRequired: 330000 },
    { level: 25, belt: 'Black', stripes: 4, name: '검정띠 4 스트라이프', nameEn: 'Black Belt 4 Stripes', color: '#000000', xpRequired: 400000 },
    { level: 26, belt: 'Black', stripes: 5, name: '검정띠 5 스트라이프', nameEn: 'Black Belt 5 Stripes', color: '#000000', xpRequired: 480000 },
    { level: 27, belt: 'Black', stripes: 6, name: '검정띠 6 스트라이프', nameEn: 'Black Belt 6 Stripes', color: '#000000', xpRequired: 570000 },

    // Master Belts (28-30) - Legendary
    { level: 28, belt: 'Red-Black', stripes: 0, name: '레드블랙벨트', nameEn: 'Red & Black Belt', color: '#EF4444', xpRequired: 700000 },
    { level: 29, belt: 'Red-White', stripes: 0, name: '레드화이트벨트', nameEn: 'Red & White Belt', color: '#EF4444', xpRequired: 900000 },
    { level: 30, belt: 'Red', stripes: 0, name: '레드벨트', nameEn: 'Red Belt (Grandmaster)', color: '#EF4444', xpRequired: 1200000 },
];

/**
 * Get belt information by level
 */
export function getBeltInfo(level: number): BeltLevel {
    const belt = BELT_LEVELS.find(b => b.level === level);
    if (!belt) {
        return BELT_LEVELS[0]; // Default to White Belt
    }
    return belt;
}

/**
 * Get current belt level based on total XP
 */
export function getBeltLevelFromXP(totalXP: number): number {
    for (let i = BELT_LEVELS.length - 1; i >= 0; i--) {
        if (totalXP >= BELT_LEVELS[i].xpRequired) {
            return BELT_LEVELS[i].level;
        }
    }
    return 1; // Default to level 1
}

/**
 * Get XP required for next belt level
 */
export function getXPToNextBelt(currentLevel: number): number {
    if (currentLevel >= 30) return 0; // Max level

    const currentBelt = getBeltInfo(currentLevel);
    const nextBelt = getBeltInfo(currentLevel + 1);

    return nextBelt.xpRequired - currentBelt.xpRequired;
}

/**
 * Get XP progress to next belt (0-1)
 */
export function getXPProgress(currentXP: number, currentLevel: number): number {
    if (currentLevel >= 30) return 1; // Max level

    const currentBelt = getBeltInfo(currentLevel);
    const nextBelt = getBeltInfo(currentLevel + 1);

    const xpInCurrentLevel = currentXP - currentBelt.xpRequired;
    const xpNeededForNextLevel = nextBelt.xpRequired - currentBelt.xpRequired;

    return Math.min(1, Math.max(0, xpInCurrentLevel / xpNeededForNextLevel));
}

/**
 * Get belt icon emoji
 */
export function getBeltIcon(belt: BeltLevel['belt']): string {
    const icons: Record<BeltLevel['belt'], string> = {
        'White': '🤍',
        'Blue': '🔵',
        'Purple': '🟣',
        'Brown': '🟤',
        'Black': '⬛',
        'Red-Black': '🔴⬛',
        'Red-White': '🔴⬜',
        'Red': '🔴'
    };
    return icons[belt] || '🤍';
}
