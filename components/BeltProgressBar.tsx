import React, { useEffect, useState } from 'react';
import { getUserProgress } from '../lib/api';
import { getBeltInfo, getXPProgress, getXPToNextBelt, getBeltIcon } from '../lib/belt-system';
import type { UserProgress } from '../types';

interface BeltProgressBarProps {
    userId: string;
    compact?: boolean;
}

export const BeltProgressBar: React.FC<BeltProgressBarProps> = ({ userId, compact = false }) => {
    const [progress, setProgress] = useState<UserProgress | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProgress();
    }, [userId]);

    const loadProgress = async () => {
        const data = await getUserProgress(userId);
        setProgress(data);
        setLoading(false);
    };

    if (loading || !progress) {
        return null;
    }

    const currentBelt = getBeltInfo(progress.beltLevel);
    const nextBelt = getBeltInfo(progress.beltLevel + 1);
    const xpProgress = getXPProgress(progress.totalXp, progress.beltLevel);
    const xpToNext = getXPToNextBelt(progress.beltLevel);
    const beltIcon = getBeltIcon(currentBelt.belt);

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-lg">{beltIcon}</span>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-slate-700 truncate">
                        {currentBelt.name}
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                        <div
                            className="h-1.5 rounded-full transition-all duration-300"
                            style={{
                                width: `${xpProgress * 100}%`,
                                backgroundColor: currentBelt.color === '#FFFFFF' ? '#94A3B8' : currentBelt.color
                            }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{beltIcon}</span>
                <div className="flex-1">
                    <div className="text-lg font-bold text-slate-900">{currentBelt.name}</div>
                    <div className="text-xs text-slate-500">
                        {progress.beltLevel < 30 ? `다음: ${nextBelt.name}` : '최고 단계 달성!'}
                    </div>
                </div>
            </div>

            {progress.beltLevel < 30 && (
                <>
                    <div className="relative w-full bg-slate-200 rounded-full h-3 mb-2">
                        <div
                            className="h-3 rounded-full transition-all duration-300 relative overflow-hidden"
                            style={{
                                width: `${xpProgress * 100}%`,
                                backgroundColor: currentBelt.color === '#FFFFFF' ? '#94A3B8' : currentBelt.color
                            }}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                        <span>{progress.currentXp} / {xpToNext} XP</span>
                        <span>{Math.round(xpProgress * 100)}%</span>
                    </div>
                </>
            )}
        </div>
    );
};
