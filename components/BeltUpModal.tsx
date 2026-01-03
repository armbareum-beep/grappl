import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Zap } from 'lucide-react';
import { getBeltInfo, getBeltIcon } from '../lib/belt-system';

interface BeltUpModalProps {
    oldLevel: number;
    newLevel: number;
    onClose: () => void;
}

export const BeltUpModal: React.FC<BeltUpModalProps> = ({ oldLevel, newLevel, onClose }) => {
    const oldBelt = getBeltInfo(oldLevel);
    const newBelt = getBeltInfo(newLevel);
    const oldIcon = getBeltIcon(oldBelt.belt);
    const newIcon = getBeltIcon(newBelt.belt);

    const getMessage = (level: number) => {
        if (level <= 5) return "무림의 첫 걸음을 내딛었습니다. 수련을 멈추지 마세요!";
        if (level <= 10) return "청출어람! 파란띠의 경지에 도달하여 실력을 증명했습니다.";
        if (level <= 15) return "보라띠! 이제 당신은 전술의 마스터이자 수련생들의 모범입니다.";
        if (level <= 20) return "갈띠! 고수의 반열에 올라 무림을 호령할 준비가 되었습니다.";
        if (level <= 27) return "검정띠! 진정한 마스터로서 새로운 전설을 써 내려가고 있습니다.";
        return "전설의 경지! 당신의 실력은 이미 무림의 역사가 되었습니다.";
    };

    return (
        <AnimatePresence>
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
                    className="relative w-full max-w-md bg-zinc-900 border-2 border-amber-500/30 rounded-[3rem] p-10 shadow-2xl shadow-amber-500/10 text-center overflow-hidden ring-1 ring-white/10"
                >
                    {/* Ambient Glow */}
                    <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full animate-pulse pointer-events-none" />

                    {/* Particle Effects */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                        {[...Array(12)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0, x: 0, y: 0 }}
                                animate={{ scale: [0, 1, 0], x: (i % 2 === 0 ? 1 : -1) * (Math.random() * 200), y: (Math.random() * -300) }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
                                className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-amber-400 rounded-full"
                            />
                        ))}
                    </div>

                    <div className="relative z-10">
                        <motion.div
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="mb-8"
                        >
                            <div className="inline-flex items-center gap-2 px-5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">New Rank Achieved</span>
                            </div>
                            <h2 className="text-5xl font-black text-white tracking-tighter mb-2">BELT UP!</h2>
                            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">명성이 자자한 무림인이 되고 있습니다</p>
                        </motion.div>

                        {/* Belt Transition */}
                        <div className="flex items-center justify-center gap-8 mb-10">
                            <motion.div
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-zinc-800/50 border border-zinc-800 rounded-3xl p-6 relative group"
                            >
                                <div className="text-6xl mb-3 grayscale opacity-60 transition-all group-hover:grayscale-0">{oldIcon}</div>
                                <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{oldBelt.name}</div>
                            </motion.div>

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.6, type: "spring" }}
                            >
                                <ArrowRight className="w-8 h-8 text-amber-500" />
                            </motion.div>

                            <motion.div
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-amber-500/5 border-2 border-amber-500/30 rounded-3xl p-6 shadow-xl shadow-amber-900/20 relative"
                            >
                                <div className="text-6xl mb-3 animate-bounce-slow drop-shadow-[0_10px_20px_rgba(245,158,11,0.4)]">{newIcon}</div>
                                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{newBelt.name}</div>
                                {/* Accent Glow */}
                                <div className="absolute inset-0 bg-amber-500/10 rounded-3xl animate-pulse -z-10" />
                            </motion.div>
                        </div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.7 }}
                            className="bg-zinc-800/40 border border-zinc-700/30 rounded-[2rem] p-8 mb-10 relative overflow-hidden backdrop-blur-sm"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <Zap className="w-12 h-12 text-white" />
                            </div>
                            <p className="text-zinc-300 font-medium leading-relaxed italic">
                                "{getMessage(newLevel)}"
                            </p>
                        </motion.div>

                        <motion.button
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.9 }}
                            onClick={onClose}
                            className="w-full py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black text-lg rounded-[1.5rem] transition-all shadow-xl shadow-amber-900/30 hover:shadow-amber-600/40 active:scale-95 relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            수련 계속하기
                        </motion.button>
                    </div>
                </motion.div>
            </div>

            <style>{`
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }

                .animate-bounce-slow {
                    animation: bounce-slow 2.5s ease-in-out infinite;
                }
            `}</style>
        </AnimatePresence>
    );
};
