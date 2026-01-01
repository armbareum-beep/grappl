import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Trophy, Lock, BookOpen, Dumbbell, MessageSquare, PlayCircle, CheckCircle2 } from 'lucide-react';
import { getBeltInfo } from '../../lib/belt-system';
import { DailyQuest, QuestType } from '../../types';

interface ArenaStatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'streak' | 'belt' | 'badges' | null;
    data: {
        streak: number;
        beltLevel: number;
        xp: number;
        nextBeltXp?: number;
        badges?: any[];
        dailyQuests?: DailyQuest[];
    };
}

const QUEST_ICONS: Record<QuestType, any> = {
    write_log: BookOpen,
    add_skill: Trophy, // Fallback
    play_match: Trophy, // Fallback
    sparring_review: PlayCircle,
    complete_routine: Dumbbell,
    give_feedback: MessageSquare,
    watch_lesson: PlayCircle
};

const QUEST_LABELS: Record<QuestType, string> = {
    write_log: '수련 일지 쓰기',
    add_skill: '기술 등록하기',
    play_match: '스파링 하기',
    sparring_review: '스파링 복기',
    complete_routine: '훈련 루틴 완료',
    give_feedback: '피드백(댓글) 남기기',
    watch_lesson: '레슨 시청'
};

export const ArenaStatsModal: React.FC<ArenaStatsModalProps> = ({ isOpen, onClose, type, data }) => {
    if (!isOpen || !type) return null;

    const currentBelt = getBeltInfo(data.beltLevel);
    const nextBelt = getBeltInfo(data.beltLevel + 1);
    const xpProgress = nextBelt ? (data.xp / nextBelt.xpRequired) * 100 : 100;

    const renderContent = () => {
        switch (type) {
            case 'streak':
                return (
                    <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-orange-500/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-orange-500/20">
                            <Flame className="w-10 h-10 text-orange-500 fill-orange-500 animate-pulse" />
                        </div>
                        <h3 className="text-3xl font-black text-white mb-2">{data.streak}일 연속 수련 중!</h3>
                        <p className="text-zinc-400 mb-8 max-w-xs mx-auto">
                            꾸준함이 가장 위대한 재능입니다.<br />
                            오늘도 수련을 완료하고 스트릭을 이어가세요.
                        </p>
                        <div className="grid grid-cols-7 gap-2 mb-8 max-w-sm mx-auto">
                            {[...Array(7)].map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${i < (data.streak % 7 || 7)
                                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                                        : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                                        }`}>
                                        {i < (data.streak % 7 || 7) ? '✓' : ''}
                                    </div>
                                    <span className="text-[10px] text-zinc-500">Day {i + 1}</span>
                                </div>
                            ))}
                        </div>

                        {data.dailyQuests && data.dailyQuests.length > 0 && (
                            <div className="mt-8 border-t border-zinc-800 pt-6">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <h4 className="text-sm font-bold text-zinc-300">오늘의 미션</h4>
                                    <span className="text-xs text-zinc-500">
                                        {data.dailyQuests.filter(q => q.completed).length}/{data.dailyQuests.length} 완료
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {data.dailyQuests.map((quest) => {
                                        const Icon = QUEST_ICONS[quest.questType] || Trophy;
                                        return (
                                            <div
                                                key={quest.id}
                                                className={`flex items-center justify-between p-3 rounded-xl border ${quest.completed
                                                    ? 'bg-zinc-900/30 border-zinc-800/50'
                                                    : 'bg-zinc-900/80 border-zinc-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${quest.completed
                                                        ? 'bg-violet-500/10 text-violet-500'
                                                        : 'bg-zinc-800 text-zinc-400'
                                                        }`}>
                                                        <Icon className="w-4 h-4" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className={`text-sm font-medium ${quest.completed ? 'text-zinc-500 line-through' : 'text-zinc-200'
                                                            }`}>
                                                            {QUEST_LABELS[quest.questType]}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-orange-400 font-medium">+{quest.xpReward} XP</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    {quest.completed ? (
                                                        <CheckCircle2 className="w-5 h-5 text-violet-500" />
                                                    ) : (
                                                        <div className="text-xs text-zinc-500 font-mono">
                                                            {quest.currentCount}/{quest.targetCount}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'belt':
                return (
                    <div className="text-center">
                        <div className="w-24 h-24 mx-auto mb-6 relative">
                            <div className="absolute inset-0 bg-white/5 rounded-full blur-xl"></div>
                            {/* Belt Icon Display - simplified for now */}
                            <div className="relative w-full h-full flex items-center justify-center text-6xl">
                                🥋
                            </div>
                        </div>

                        <h3 className="text-3xl font-black text-white mb-1">{currentBelt?.name || 'White Belt'}</h3>
                        <p className="text-zinc-400 text-sm mb-8">Level {data.beltLevel}</p>

                        <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 mb-6">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-sm text-zinc-400">다음 승급까지</span>
                                <span className="text-xl font-bold text-white">{Math.floor(xpProgress)}%</span>
                            </div>
                            <div className="h-3 bg-zinc-800 rounded-full overflow-hidden relative mb-2">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${xpProgress}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="absolute top-0 left-0 h-full bg-violet-600"
                                />
                            </div>
                            <div className="flex justify-between text-xs font-mono text-zinc-500">
                                <span>{data.xp} XP</span>
                                <span>{nextBelt?.xpRequired || 1000} XP</span>
                            </div>
                        </div>

                        {nextBelt && (
                            <div className="flex items-center gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50">
                                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center opacity-50">
                                    <Lock className="w-5 h-5 text-zinc-500" />
                                </div>
                                <div className="text-left">
                                    <h4 className="font-bold text-zinc-300 text-sm">Next: {nextBelt.name}</h4>
                                    <p className="text-xs text-zinc-500">더 많은 수련과 스파링 경험이 필요합니다.</p>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'badges':
                return (
                    <div>
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 mx-auto bg-yellow-500/10 rounded-2xl flex items-center justify-center mb-4 rotate-3 border border-yellow-500/20">
                                <Trophy className="w-8 h-8 text-yellow-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">나의 업적</h3>
                            <p className="text-zinc-400 text-sm">수련을 통해 획득한 영광의 증표들입니다.</p>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {/* Coming Soon Placeholders */}
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <div key={i} className="aspect-square bg-zinc-900/50 rounded-xl border border-zinc-800/50 flex flex-col items-center justify-center gap-2 group hover:bg-zinc-800/50 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Lock className="w-4 h-4 text-zinc-600" />
                                    </div>
                                    <span className="text-[10px] text-zinc-600 font-bold uppercase">Locked</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-zinc-500">더 많은 배지가 곧 업데이트될 예정입니다.</p>
                        </div>
                    </div>
                );
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[70] pointer-events-none p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#09090b] w-full max-w-md rounded-[32px] border border-zinc-800 overflow-hidden shadow-2xl pointer-events-auto"
                        >
                            <div className="relative p-6 md:p-8">
                                <button
                                    onClick={onClose}
                                    className="absolute top-4 right-4 w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                {renderContent()}
                            </div>

                            <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex justify-center">
                                <button
                                    onClick={onClose}
                                    className="text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
                                >
                                    닫기
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
