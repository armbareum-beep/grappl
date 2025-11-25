import React from 'react';
import { UserTechniqueMastery, MASTERY_LEVEL_NAMES_KO } from '../../types';
import { MasteryRing } from './MasteryRing';
import { TrendingUp, Target, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TechniqueCardProps {
    mastery: UserTechniqueMastery;
    onClick?: () => void;
    compact?: boolean;
}

export const TechniqueCard: React.FC<TechniqueCardProps> = ({
    mastery,
    onClick,
    compact = false
}) => {
    const technique = mastery.technique;
    if (!technique) return null;

    const successRate = mastery.totalAttemptCount > 0
        ? Math.round((mastery.totalSuccessCount / mastery.totalAttemptCount) * 100)
        : 0;

    if (compact) {
        return (
            <button
                onClick={onClick}
                className="w-full p-4 bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500 transition-all group"
            >
                <div className="flex items-center gap-4">
                    <MasteryRing
                        level={mastery.masteryLevel}
                        currentXp={mastery.masteryXp}
                        size="sm"
                        showLevel={true}
                    />
                    <div className="flex-1 text-left">
                        <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            {technique.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            {MASTERY_LEVEL_NAMES_KO[mastery.masteryLevel]} • {successRate}% 성공률
                        </p>
                    </div>
                </div>
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            className="relative p-6 bg-slate-900 rounded-2xl border border-slate-800 hover:border-blue-500 transition-all group overflow-hidden"
        >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors mb-1">
                            {technique.name}
                        </h3>
                        {technique.nameEn && (
                            <p className="text-xs text-slate-500">{technique.nameEn}</p>
                        )}
                    </div>

                    <MasteryRing
                        level={mastery.masteryLevel}
                        currentXp={mastery.masteryXp}
                        size="md"
                        showLevel={true}
                        animated={true}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">성공률</div>
                        <div className="text-lg font-bold text-white">{successRate}%</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">시도</div>
                        <div className="text-lg font-bold text-white">{mastery.totalAttemptCount}</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-400 mb-1">XP</div>
                        <div className="text-lg font-bold text-yellow-500">{mastery.masteryXp}</div>
                    </div>
                </div>

                {/* Status badges */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800/30">
                        {MASTERY_LEVEL_NAMES_KO[mastery.masteryLevel]}
                    </span>
                    {mastery.lastPracticeDate && (
                        <span className="px-2 py-1 rounded-full bg-slate-800 text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(mastery.lastPracticeDate), 'M/d', { locale: ko })}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};

// Grid view for multiple techniques
export const TechniqueGrid: React.FC<{
    masteries: UserTechniqueMastery[];
    onTechniqueClick: (mastery: UserTechniqueMastery) => void;
    emptyMessage?: string;
}> = ({ masteries, onTechniqueClick, emptyMessage = '등록된 기술이 없습니다.' }) => {
    if (masteries.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <p className="text-slate-400">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {masteries.map(mastery => (
                <TechniqueCard
                    key={mastery.id}
                    mastery={mastery}
                    onClick={() => onTechniqueClick(mastery)}
                />
            ))}
        </div>
    );
};

// List view (compact)
export const TechniqueList: React.FC<{
    masteries: UserTechniqueMastery[];
    onTechniqueClick: (mastery: UserTechniqueMastery) => void;
    emptyMessage?: string;
}> = ({ masteries, onTechniqueClick, emptyMessage = '등록된 기술이 없습니다.' }) => {
    if (masteries.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                <p className="text-slate-400">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {masteries.map(mastery => (
                <TechniqueCard
                    key={mastery.id}
                    mastery={mastery}
                    onClick={() => onTechniqueClick(mastery)}
                    compact={true}
                />
            ))}
        </div>
    );
};
