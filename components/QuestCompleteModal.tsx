import React from 'react';
import { Flame, Trophy, Zap, Star } from 'lucide-react';

interface QuestCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContinue?: () => void;
    questName: string;
    xpEarned: number;
    combatPowerEarned?: number;
    streak?: number;
    bonusReward?: {
        type: 'xp_boost' | 'badge' | 'unlock';
        value: string;
    };
    continueLabel?: string;
}

import { motion, AnimatePresence } from 'framer-motion';

export const QuestCompleteModal: React.FC<QuestCompleteModalProps> = ({
    isOpen,
    onClose,
    onContinue,
    questName,
    xpEarned,
    combatPowerEarned,
    streak,
    bonusReward,
    continueLabel
}) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        className="relative w-full max-w-sm"
                    >
                        {/* Ambient Glow */}
                        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-violet-600/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />

                        <div className="relative bg-zinc-900 border-2 border-violet-500/30 rounded-[3rem] p-10 shadow-2xl shadow-violet-500/10 overflow-hidden text-center ring-1 ring-white/10">
                            {/* Particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                                {[...Array(10)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, x: 0, y: 0 }}
                                        animate={{ scale: [0, 1, 0], x: (i % 2 === 0 ? 1 : -1) * (Math.random() * 150), y: (Math.random() * -200) }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                                        className="absolute top-1/2 left-1/2 w-1 h-1 bg-violet-400 rounded-full"
                                    />
                                ))}
                            </div>

                            <div className="relative z-10">
                                {/* Success Icon */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -15 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                                    className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-zinc-800 border-2 border-violet-500/50 shadow-xl shadow-violet-900/40 mb-8 overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-tr from-violet-600/20 to-transparent" />
                                    <Flame className="w-12 h-12 text-violet-400 fill-violet-500/30 animate-pulse relative z-10" />
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="mb-10"
                                >
                                    <h2 className="text-4xl font-black text-white mb-2 tracking-tighter">
                                        수련 완료!
                                    </h2>
                                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">{questName}</p>
                                    {streak && streak > 0 && (
                                        <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-800/80 rounded-full border border-zinc-700/50">
                                            <span className="text-amber-400 text-sm font-black italic">{streak}일 연속 달성 중! 🔥</span>
                                        </div>
                                    )}
                                </motion.div>

                                {/* Rewards */}
                                <div className="space-y-4 mb-10">
                                    <motion.div
                                        initial={{ x: -20, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        transition={{ delay: 0.6 }}
                                        className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 flex items-center justify-between group hover:border-violet-500/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                                <Zap className="w-6 h-6 text-violet-400 fill-violet-500/20" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-white">XP 획득</p>
                                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Growth progress</p>
                                            </div>
                                        </div>
                                        <span className="text-2xl font-black italic text-violet-400">
                                            {xpEarned > 0 ? `+${xpEarned}` : 'COMPLETED'}
                                        </span>
                                    </motion.div>

                                    {(combatPowerEarned || bonusReward) && (
                                        <motion.div
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            transition={{ delay: 0.7 }}
                                            className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl p-4 flex items-center justify-between group hover:border-amber-500/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                                                    {bonusReward?.type === 'badge' ? (
                                                        <Trophy className="w-6 h-6 text-amber-500" />
                                                    ) : (
                                                        <Star className="w-6 h-6 text-amber-500 fill-amber-500/20" />
                                                    )}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-black text-white">
                                                        {combatPowerEarned ? '전투력 상승' : '보너스'}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                                        {bonusReward?.value || 'Power up'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-xl font-black text-amber-500">
                                                {combatPowerEarned ? `+${combatPowerEarned}` : 'CLAIMED'}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>

                                <motion.button
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.9 }}
                                    onClick={() => (onContinue ? onContinue() : onClose())}
                                    className="w-full py-5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-lg rounded-[1.5rem] transition-all shadow-xl shadow-violet-900/30 hover:shadow-violet-600/40 active:scale-95 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    {continueLabel || '수련 마치기'}
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
