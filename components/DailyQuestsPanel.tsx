import React, { useEffect, useState } from 'react';
import { getDailyQuests } from '../lib/api';
import type { DailyQuest } from '../types';

interface DailyQuestsPanelProps {
    userId: string;
}

const QUEST_INFO: Record<string, { icon: string; name: string; description: string }> = {
    watch_lesson: {
        icon: '📺',
        name: '레슨 시청',
        description: '레슨 1개 시청하기'
    },
    write_log: {
        icon: '📝',
        name: '수련일지 작성',
        description: '오늘의 수련일지 작성하기'
    },
    tournament: {
        icon: '⚔️',
        name: '시합 참여',
        description: '시합 3회 참여하기'
    },
    add_skill: {
        icon: '🎯',
        name: '기술 추가',
        description: '새로운 기술 1개 추가하기'
    }
};

export const DailyQuestsPanel: React.FC<DailyQuestsPanelProps> = ({ userId }) => {
    const [quests, setQuests] = useState<DailyQuest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadQuests();
    }, [userId]);

    const loadQuests = async () => {
        const data = await getDailyQuests(userId);
        setQuests(data);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-32 mb-4"></div>
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-12 bg-slate-100 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const totalXP = quests.reduce((sum, q) => sum + q.xpReward, 0);
    const earnedXP = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xpReward, 0);
    const progress = totalXP > 0 ? (earnedXP / totalXP) * 100 : 0;

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">📋 오늘의 미션</h3>

            <div className="space-y-3 mb-4">
                {quests.map((quest) => {
                    const info = QUEST_INFO[quest.questType] || { icon: '❓', name: quest.questType, description: '' };
                    const isCompleted = quest.completed;
                    const progressPercent = quest.targetCount > 0
                        ? Math.min(100, (quest.currentCount / quest.targetCount) * 100)
                        : 0;

                    return (
                        <div
                            key={quest.id}
                            className={`p-4 rounded-lg border-2 transition-all ${isCompleted
                                    ? 'bg-green-50 border-green-500'
                                    : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                    <span className="text-2xl">{isCompleted ? '✅' : info.icon}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className={`font-medium ${isCompleted ? 'text-green-900' : 'text-slate-900'}`}>
                                            {info.name}
                                        </span>
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isCompleted
                                                ? 'bg-green-600 text-white'
                                                : 'bg-amber-100 text-amber-800'
                                            }`}>
                                            +{quest.xpReward} XP
                                        </span>
                                    </div>
                                    {!isCompleted && quest.targetCount > 1 && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                                <div
                                                    className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                    style={{ width: `${progressPercent}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-slate-500">
                                                {quest.currentCount}/{quest.targetCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Total Progress */}
            <div className="pt-4 border-t border-slate-200">
                <div className="flex justify-between text-sm text-slate-600 mb-2">
                    <span>진행도</span>
                    <span className="font-semibold">{earnedXP} / {totalXP} XP</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                        className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};
