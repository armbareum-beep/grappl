import React, { useEffect, useState } from 'react';
import { Trophy, Sparkles, Star, Zap, Share2 } from 'lucide-react';
import { getBeltInfo, getBeltIcon } from '../lib/belt-system';
import { ShareToFeedModal } from './social/ShareToFeedModal';
import { useAuth } from '../contexts/AuthContext';
import { createFeedPost } from '../lib/api';


interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    oldLevel: number;
    newLevel: number;
    beltLevel: number;
}

import { motion, AnimatePresence } from 'framer-motion';

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
    isOpen,
    onClose,
    oldLevel,
    newLevel,
    beltLevel
}) => {
    const { user } = useAuth();
    const [showRewards, setShowRewards] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    const beltInfo = getBeltInfo(beltLevel);
    const beltIcon = getBeltIcon(beltInfo.belt);

    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setShowRewards(true), 1200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleShareToFeed = async (comment: string) => {
        if (!user) return;
        await createFeedPost({
            userId: user.id,
            content: comment,
            type: 'level_up',
            metadata: {
                oldLevel,
                newLevel,
                beltName: beltInfo.name
            }
        });
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        className="relative w-full max-w-sm"
                    >
                        {/* Golden Glow Effect */}
                        <div className="absolute inset-x-0 -top-20 h-64 bg-yellow-500/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />

                        <div className="relative bg-zinc-900 border-2 border-yellow-500/30 rounded-[3rem] p-10 shadow-2xl shadow-yellow-500/10 overflow-hidden text-center ring-1 ring-white/10">
                            {/* Particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-50">
                                {[...Array(12)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ y: 200, opacity: 0, x: Math.random() * 300 - 150 }}
                                        animate={{ y: -200, opacity: [0, 1, 0] }}
                                        transition={{ duration: 3 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 5 }}
                                        className="absolute w-1 h-1 bg-yellow-400 rounded-full"
                                    />
                                ))}
                            </div>

                            <div className="relative z-10">
                                {/* Badge */}
                                <motion.div
                                    initial={{ scale: 0, rotate: -20 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
                                    className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-full text-white font-black text-xs shadow-xl shadow-yellow-500/30 mb-8"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    LEVEL UP!
                                </motion.div>

                                {/* Belt Icon */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    className="text-[120px] mb-6 drop-shadow-[0_0_30px_rgba(234,179,8,0.3)] filter brightness-110"
                                >
                                    {beltIcon}
                                </motion.div>

                                {/* Info */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    className="mb-10"
                                >
                                    <h2 className="text-4xl font-black text-white mb-3 tracking-tighter">
                                        {beltInfo.name}
                                    </h2>
                                    <div className="flex items-center justify-center gap-4">
                                        <span className="text-zinc-500 font-bold text-lg">Lv.{oldLevel}</span>
                                        <div className="w-10 h-px bg-zinc-800" />
                                        <div className="flex items-center gap-2">
                                            <Zap className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                                            <span className="text-3xl font-black text-white">Lv.{newLevel}</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Rewards Card */}
                                <AnimatePresence>
                                    {showRewards && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, y: 20 }}
                                            animate={{ opacity: 1, height: 'auto', y: 0 }}
                                            className="space-y-4 mb-10 text-left"
                                        >
                                            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-4 flex items-center justify-between group hover:border-yellow-500/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20">
                                                        <Trophy className="w-6 h-6 text-yellow-500" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white">기술 해금</p>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">New techniques ready</p>
                                                    </div>
                                                </div>
                                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                            </div>

                                            <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-4 flex items-center justify-between group hover:border-violet-500/30 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                                        <Sparkles className="w-6 h-6 text-violet-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-white">보너스 XP</p>
                                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Level bonus</p>
                                                    </div>
                                                </div>
                                                <span className="text-lg font-black text-violet-400">+50</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Actions */}
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowShareModal(true)}
                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black text-sm rounded-[1.5rem] transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        자랑하기
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="flex-3 py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-white font-black text-sm rounded-[1.5rem] transition-all shadow-xl shadow-yellow-900/20 hover:shadow-yellow-500/30 active:scale-95"
                                    >
                                        수련 계속하기
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {showShareModal && (
                <ShareToFeedModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={handleShareToFeed}
                    activityType="level_up"
                    defaultContent={`🎉 레벨 업! Level ${newLevel} 달성!\n\n${beltInfo.name} 벨트로 승급했습니다. 더 높은 곳을 향해 계속 정진하겠습니다! 🥋`}
                    metadata={{
                        oldLevel,
                        newLevel,
                        beltName: beltInfo.name
                    }}
                />
            )}
        </AnimatePresence>
    );
};
