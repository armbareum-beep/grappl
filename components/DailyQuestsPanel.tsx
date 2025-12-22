import React, { useEffect, useState } from 'react';
import { getDailyQuests } from '../lib/api';
import type { DailyQuest } from '../types';
import { PenTool, Swords, Target, CheckCircle2, Ticket } from 'lucide-react';

interface DailyQuestsPanelProps {
    userId: string;
}

const QUEST_INFO: Record<string, { icon: React.ElementType; name: string; description: string; color: string }> = {
    write_log: {
        icon: PenTool,
        name: '수련 일지',
        description: '오늘의 훈련 기록하기',
        color: 'text-emerald-400'
    },
    add_skill: {
        icon: Target,
        name: '기술 연구',
        description: '새로운 기술 1개 등록',
        color: 'text-purple-400'
    },
    give_feedback: {
        icon: PenTool,
        name: '피드백 주기',
        description: '동료에게 피드백 남기기',
        color: 'text-yellow-400'
    },
    sparring_review: {
        icon: Swords,
        name: '스파링 복기',
        description: '스파링 영상 분석/복기',
        color: 'text-orange-400'
    },
    complete_routine: {
        icon: CheckCircle2,
        name: '루틴 완료',
        description: '오늘의 추천 루틴 완료',
        color: 'text-green-400'
    }
};

export const DailyQuestsPanel: React.FC<DailyQuestsPanelProps> = ({ userId }) => {
    const [quests, setQuests] = useState<DailyQuest[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) loadQuests();
    }, [userId]);

    const loadQuests = async () => {
        try {
            const data = await getDailyQuests(userId);
            setQuests(data);
        } catch (error) {
            console.error('Failed to load quests', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 animate-pulse">
                <div className="h-6 bg-slate-800 rounded w-32 mb-6"></div>
                <div className="space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-20 bg-slate-800/50 rounded-xl"></div>
                    ))}
                </div>
            </div>
        );
    }

    const totalXP = quests.reduce((sum, q) => sum + q.xpReward, 0);
    const earnedXP = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xpReward, 0);
    const progress = totalXP > 0 ? (earnedXP / totalXP) * 100 : 0;
    const completedCount = quests.filter(q => q.completed).length;

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 relative overflow-hidden group h-full flex flex-col">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors duration-500"></div>

            {/* Header */}
            <div className="flex justify-between items-center mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            오늘의 훈련
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                                {completedCount}/{quests.length} 완료
                            </span>
                        </h3>
                        <p className="text-xs text-slate-400">매일 오전 0시 초기화</p>
                    </div>
                </div>

                {/* Total XP Badge */}
                <div className="text-right">
                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
                        {earnedXP}
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Earned XP
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-8 relative z-10">
                <div className="flex justify-between text-xs text-slate-400 mb-2">
                    <span>일일 진행도</span>
                    <span>{Math.round(progress)}%</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-[1px]">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Quest List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent content-start">
                {quests.filter(q => QUEST_INFO[q.questType]).map((quest) => {
                    const info = QUEST_INFO[quest.questType];
                    const Icon = info.icon;
                    const isCompleted = quest.completed;
                    const itemProgress = quest.targetCount > 0 ? (quest.currentCount / quest.targetCount) * 100 : 0;

                    return (
                        <div
                            key={quest.id}
                            className={`
                                relative p-4 rounded-xl border transition-all duration-300
                                ${isCompleted
                                    ? 'bg-slate-900/80 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                                }
                            `}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon container */}
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center transition-colors
                                    ${isCompleted ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}
                                `}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className={`font-bold text-sm ${isCompleted ? 'text-slate-200 line-through opacity-70' : 'text-white'}`}>
                                            {info.name}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${isCompleted ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-yellow-500'}`}>
                                            +{quest.xpReward} XP
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 truncate mb-1.5">{info.description}</p>

                                    {/* Mini Progress Bar for incomplete items */}
                                    {!isCompleted && (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${info.color.replace('text', 'bg')}`}
                                                    style={{ width: `${itemProgress}%` }}
                                                />
                                            </div>
                                            <span className="text-[10px] text-slate-500 font-mono">
                                                {quest.currentCount}/{quest.targetCount}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Animated Shine Effect for Completed items */}
                            {isCompleted && (
                                <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                                    <div className="absolute top-0 -left-full w-1/2 h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 animate-shimmer" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
