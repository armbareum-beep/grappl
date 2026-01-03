import React, { useState } from 'react';
import { Sparkles, Share2, Medal } from 'lucide-react';
import { ShareToFeedModal } from './social/ShareToFeedModal';
import { useAuth } from '../contexts/AuthContext';
import { createFeedPost } from '../lib/api';

interface TitleEarnedModalProps {
    isOpen: boolean;
    onClose: () => void;
    titleName: string;
    description?: string;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

import { motion, AnimatePresence } from 'framer-motion';

export const TitleEarnedModal: React.FC<TitleEarnedModalProps> = ({
    isOpen,
    onClose,
    titleName,
    description = "새로운 칭호를 획득했습니다!",
    rarity = 'common'
}) => {
    const { user } = useAuth();
    const [showShareModal, setShowShareModal] = useState(false);

    const handleShareToFeed = async (comment: string) => {
        if (!user) return;
        await createFeedPost({
            userId: user.id,
            content: comment,
            type: 'title_earned',
            metadata: { titleName, rarity, description }
        });
        setShowShareModal(false);
        onClose();
    };

    const getRarityStyles = (r: string) => {
        switch (r) {
            case 'legendary': return {
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/40',
                text: 'text-amber-400',
                glow: 'shadow-amber-500/20',
                gradient: 'from-amber-600 to-orange-600'
            };
            case 'epic': return {
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/40',
                text: 'text-purple-400',
                glow: 'shadow-purple-500/20',
                gradient: 'from-purple-600 to-pink-600'
            };
            case 'rare': return {
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/40',
                text: 'text-blue-400',
                glow: 'shadow-blue-500/20',
                gradient: 'from-blue-600 to-indigo-600'
            };
            default: return {
                bg: 'bg-zinc-500/10',
                border: 'border-zinc-500/40',
                text: 'text-zinc-400',
                glow: 'shadow-zinc-500/20',
                gradient: 'from-zinc-600 to-zinc-700'
            };
        }
    };

    const styles = getRarityStyles(rarity);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 40 }}
                        className="relative w-full max-w-md"
                    >
                        {/* Ambient Glow */}
                        <div className={`absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 opacity-20 blur-[100px] rounded-full animate-pulse pointer-events-none ${styles.bg.replace('/10', '/50')}`} />

                        <div className={`relative bg-zinc-900 border-2 rounded-[3rem] p-10 shadow-2xl overflow-hidden ring-1 ring-white/10 ${styles.border} ${styles.glow}`}>
                            {/* Particles */}
                            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                                {[...Array(15)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ scale: 0, x: 0, y: 0 }}
                                        animate={{ scale: [0, 1, 0], x: (i % 2 === 0 ? 1 : -1) * (Math.random() * 200), y: (Math.random() * -300) }}
                                        transition={{ duration: 2 + Math.random(), repeat: Infinity, delay: i * 0.1 }}
                                        className={`absolute top-1/2 left-1/2 w-1.5 h-1.5 rounded-full ${styles.bg.replace('/10', '/60')}`}
                                    />
                                ))}
                            </div>

                            <div className="relative z-10 text-center">
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="mb-8"
                                >
                                    <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full mb-6 border ${styles.bg} ${styles.border}`}>
                                        <Sparkles className={`w-4 h-4 ${styles.text}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${styles.text}`}>
                                            {rarity} Achievement Unlock
                                        </span>
                                    </div>
                                    <h2 className="text-4xl font-black text-white tracking-tighter mb-2 uppercase">New Title Earned</h2>
                                </motion.div>

                                <motion.div
                                    initial={{ scale: 0, rotate: -10 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: "spring", delay: 0.4 }}
                                    className="mb-8 relative inline-block"
                                >
                                    <div className={`w-32 h-32 rounded-3xl flex items-center justify-center border-2 border-white/10 relative overflow-hidden bg-zinc-800 shadow-2xl`}>
                                        <div className={`absolute inset-0 bg-gradient-to-tr opacity-20 ${styles.gradient}`} />
                                        <Medal className={`w-16 h-16 text-white relative z-10 animate-bounce-slow drop-shadow-2xl`} />
                                    </div>
                                    <div className={`absolute -inset-4 rounded-[2rem] border-2 border-dashed opacity-20 animate-spin-slow ${styles.border}`} />
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="mb-10"
                                >
                                    <h3 className={`text-4xl font-black mb-3 italic tracking-tighter ${styles.text}`}>
                                        "{titleName}"
                                    </h3>
                                    <p className="text-zinc-500 font-medium px-4">
                                        {description}
                                    </p>
                                </motion.div>

                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="flex gap-4"
                                >
                                    <button
                                        onClick={() => setShowShareModal(true)}
                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Share2 className="w-5 h-5" />
                                        자랑하기
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className={`flex-1 py-4 bg-gradient-to-r text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 ${styles.gradient} ${styles.glow.replace('/20', '/40')}`}
                                    >
                                        확인
                                    </button>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>

                    {showShareModal && (
                        <ShareToFeedModal
                            isOpen={showShareModal}
                            onClose={() => setShowShareModal(false)}
                            onShare={handleShareToFeed}
                            activityType="title_earned"
                            defaultContent={`🏆 새로운 칭호 획득!\n\n[${titleName}]\n${description}\n\n#Grappl #주짓수 #칭호획득`}
                            metadata={{ titleName, rarity, description }}
                        />
                    )}
                </div>
            )}

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
                @keyframes spin-slow {
                    to { rotate: 360deg; }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
            `}</style>
        </AnimatePresence>
    );
};
