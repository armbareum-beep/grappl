import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, Star, Zap, Share2 } from 'lucide-react';
import { getBeltInfo, getBeltIcon } from '../lib/belt-system';
import { ShareModal } from './social/ShareModal';
import { motion, AnimatePresence } from 'framer-motion';

interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    oldLevel: number;
    newLevel: number;
    beltLevel: number;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
    isOpen,
    onClose,
    oldLevel,
    newLevel,
    beltLevel
}) => {
    const [showRewards, setShowRewards] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const beltInfo = getBeltInfo(beltLevel);
    const beltIcon = getBeltIcon(beltInfo.belt);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setShowRewards(true), 2000);
            return () => clearTimeout(timer);
        } else {
            setShowRewards(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[32px] overflow-hidden shadow-2xl"
                    >
                        {/* Level Up Content */}
                        <div className="p-8 pb-12 text-center relative overflow-hidden">
                            {/* Animated Background Elements */}
                            <motion.div
                                animate={{
                                    rotate: 360,
                                    scale: [1, 1.2, 1],
                                }}
                                transition={{
                                    duration: 10,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px]"
                            />

                            <div className="relative z-10">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="inline-flex p-4 rounded-3xl bg-violet-600/20 text-violet-400 mb-6"
                                >
                                    <Trophy className="w-10 h-10" />
                                </motion.div>

                                <motion.h2
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-4xl font-black text-white mb-2"
                                >
                                    LEVEL UP!
                                </motion.h2>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                    className="flex items-center justify-center gap-6 mb-8"
                                >
                                    <div className="text-center">
                                        <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">From</div>
                                        <div className="text-3xl font-black text-zinc-400">Lv.{oldLevel}</div>
                                    </div>
                                    <Zap className="w-6 h-6 text-violet-500" />
                                    <div className="text-center">
                                        <div className="text-violet-400 text-xs font-bold uppercase tracking-wider mb-1">To</div>
                                        <div className="text-5xl font-black text-white">Lv.{newLevel}</div>
                                    </div>
                                </motion.div>

                                <AnimatePresence>
                                    {showRewards && (
                                        <motion.div
                                            initial={{ y: 20, opacity: 0 }}
                                            animate={{ y: 0, opacity: 1 }}
                                            className="space-y-4"
                                        >
                                            <div className="p-6 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                                                    {beltIcon}
                                                </div>
                                                <div className="text-left">
                                                    <div className="text-zinc-400 text-xs font-bold uppercase">뉴 벨트 달성</div>
                                                    <div className="text-white font-bold">{beltInfo.belt} Belt</div>
                                                </div>
                                                <div className="ml-auto">
                                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <button
                                                    onClick={onClose}
                                                    className="py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all"
                                                >
                                                    계속하기
                                                </button>
                                                <button
                                                    onClick={() => setShowShareModal(true)}
                                                    className="py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/20"
                                                >
                                                    <Share2 className="w-4 h-4" />
                                                    자랑하기
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                title="레벨 업 달성!"
                text={`그랩플레이에서 Lv.${newLevel}을 달성했습니다!`}
            />
        </AnimatePresence>
    );
};
