import React from 'react';
import { Trophy, Flame, Target, BookOpen, Swords, Star, Award, Zap } from 'lucide-react';

export interface Patch {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    unlocked: boolean;
    unlockedAt?: string;
}

interface PatchDisplayProps {
    patches: Patch[];
    compact?: boolean;
}

export const PatchDisplay: React.FC<PatchDisplayProps> = ({ patches, compact = false }) => {
    const unlockedPatches = patches.filter(p => p.unlocked);
    const lockedPatches = patches.filter(p => !p.unlocked);

    if (compact) {
        return (
            <div className="flex flex-wrap gap-2">
                {unlockedPatches.slice(0, 5).map((patch) => {
                    const Icon = patch.icon;
                    return (
                        <div
                            key={patch.id}
                            className={`w-10 h-10 rounded-full ${patch.color} flex items-center justify-center shadow-lg border-2 border-white/20`}
                            title={patch.name}
                        >
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                    );
                })}
                {unlockedPatches.length > 5 && (
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                        +{unlockedPatches.length - 5}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Unlocked Badges */}
            {unlockedPatches.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-400" />
                        획득한 패치 ({unlockedPatches.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {unlockedPatches.map((patch) => {
                            const Icon = patch.icon;
                            return (
                                <div
                                    key={patch.id}
                                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all group"
                                >
                                    <div className={`w-16 h-16 rounded-full ${patch.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-8 h-8 text-white" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white text-center mb-1">{patch.name}</h4>
                                    <p className="text-xs text-slate-400 text-center line-clamp-2">{patch.description}</p>
                                    {patch.unlockedAt && (
                                        <p className="text-[10px] text-slate-500 text-center mt-2">
                                            {new Date(patch.unlockedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Locked Badges */}
            {lockedPatches.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold text-slate-400 mb-4">잠긴 패치 ({lockedPatches.length})</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {lockedPatches.map((patch) => {
                            const Icon = patch.icon;
                            return (
                                <div
                                    key={patch.id}
                                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 opacity-50"
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center mx-auto mb-3">
                                        <Icon className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-500 text-center mb-1">{patch.name}</h4>
                                    <p className="text-xs text-slate-600 text-center line-clamp-2">{patch.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to check patch unlocks
export const checkPatchUnlocks = (userStats: {
    streak: number;
    totalSkills: number;
    masteredSkills: number;
    tournamentWins: number;
    trainingLogs: number;
    level: number;
}): Patch[] => {
    const now = new Date().toISOString();

    return [
        {
            id: 'first_skill',
            name: '첫 걸음',
            description: '첫 번째 기술 추가',
            icon: Target,
            color: 'bg-blue-500',
            unlocked: userStats.totalSkills >= 1,
            unlockedAt: userStats.totalSkills >= 1 ? now : undefined
        },
        {
            id: 'skill_collector',
            name: '기술 수집가',
            description: '10개 이상의 기술 보유',
            icon: BookOpen,
            color: 'bg-indigo-500',
            unlocked: userStats.totalSkills >= 10,
            unlockedAt: userStats.totalSkills >= 10 ? now : undefined
        },
        {
            id: 'first_master',
            name: '첫 마스터',
            description: '첫 번째 기술 마스터',
            icon: Trophy,
            color: 'bg-yellow-500',
            unlocked: userStats.masteredSkills >= 1,
            unlockedAt: userStats.masteredSkills >= 1 ? now : undefined
        },
        {
            id: 'master_collector',
            name: '마스터 컬렉터',
            description: '5개 이상의 기술 마스터',
            icon: Award,
            color: 'bg-purple-500',
            unlocked: userStats.masteredSkills >= 5,
            unlockedAt: userStats.masteredSkills >= 5 ? now : undefined
        },
        {
            id: 'streak_week',
            name: '일주일 연속',
            description: '7일 연속 수련',
            icon: Flame,
            color: 'bg-orange-500',
            unlocked: userStats.streak >= 7,
            unlockedAt: userStats.streak >= 7 ? now : undefined
        },
        {
            id: 'streak_month',
            name: '한 달 연속',
            description: '30일 연속 수련',
            icon: Flame,
            color: 'bg-red-500',
            unlocked: userStats.streak >= 30,
            unlockedAt: userStats.streak >= 30 ? now : undefined
        },
        {
            id: 'first_tournament',
            name: '첫 시합',
            description: '첫 토너먼트 승리',
            icon: Swords,
            color: 'bg-green-500',
            unlocked: userStats.tournamentWins >= 1,
            unlockedAt: userStats.tournamentWins >= 1 ? now : undefined
        },
        {
            id: 'tournament_champion',
            name: '토너먼트 챔피언',
            description: '10회 토너먼트 승리',
            icon: Trophy,
            color: 'bg-emerald-500',
            unlocked: userStats.tournamentWins >= 10,
            unlockedAt: userStats.tournamentWins >= 10 ? now : undefined
        },
        {
            id: 'journal_keeper',
            name: '일지 작성자',
            description: '10개 이상의 수련 일지 작성',
            icon: BookOpen,
            color: 'bg-cyan-500',
            unlocked: userStats.trainingLogs >= 10,
            unlockedAt: userStats.trainingLogs >= 10 ? now : undefined
        },
        {
            id: 'level_10',
            name: '레벨 10 달성',
            description: '레벨 10 도달',
            icon: Star,
            color: 'bg-pink-500',
            unlocked: userStats.level >= 10,
            unlockedAt: userStats.level >= 10 ? now : undefined
        },
        {
            id: 'level_20',
            name: '레벨 20 달성',
            description: '레벨 20 도달',
            icon: Zap,
            color: 'bg-violet-500',
            unlocked: userStats.level >= 20,
            unlockedAt: userStats.level >= 20 ? now : undefined
        }
    ];
};
