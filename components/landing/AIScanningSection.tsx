import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Brain, Zap } from 'lucide-react';

export const AIScanningSection = () => {
    const navigate = useNavigate();
    const [phase, setPhase] = useState<'journal' | 'scanning' | 'result'>('journal');

    useEffect(() => {
        const loop = async () => {
            // 1. Show Journal
            setPhase('journal');
            await new Promise(r => setTimeout(r, 2000));

            // 2. Start Scanning
            setPhase('scanning');
            await new Promise(r => setTimeout(r, 1500)); // Scan duration

            // 3. Show Result
            setPhase('result');
            await new Promise(r => setTimeout(r, 3000)); // Hold result

            // Loop
            loop();
        };
        loop();
    }, []);

    return (
        <section className="relative py-24 md:py-32 bg-zinc-950 overflow-hidden px-4">
            {/* Background Effects: Dot Pattern & Glow Unified with Brand Identity */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Dot Pattern - Shared Canvas Style */}
                <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, #8b5cf6 1px, transparent 0)',
                    backgroundSize: '40px 40px',
                    maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)'
                }}></div>

                {/* Massive Violet Glow - repositioned higher to catch transition */}
                <div className="absolute top-0 right-0 w-[1000px] h-[1000px] bg-violet-600/5 rounded-full blur-[160px] opacity-40 mix-blend-screen" />
            </div>

            <div className="max-w-7xl w-full mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
                {/* LEFT COLUMN: Message */}
                <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center px-3 py-1 mb-8 rounded-full border border-violet-500/30 bg-violet-500/10 backdrop-blur-md"
                    >
                        <span className="w-2 h-2 rounded-full bg-violet-400 mr-2 animate-pulse" />
                        <span className="text-xs font-bold tracking-widest text-violet-300 uppercase">
                            AI-Powered BJJ Coach
                        </span>
                    </motion.div>

                    {/* Main Headings */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="text-5xl md:text-7xl font-black text-zinc-50 leading-[1.1] tracking-tighter mb-6"
                    >
                        관장님은 퇴근해도,<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                            당신의 코치는<br className="lg:hidden" /> 잠들지 않습니다.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-lg md:text-xl text-zinc-400 mb-10 max-w-xl leading-relaxed"
                    >
                        어제 적은 <span className="text-zinc-200 font-semibold">'패배의 기록'</span>을 내일의 <span className="text-zinc-200 font-semibold">'승리 공식'</span>으로.<br />
                        AI가 당신의 수련일지를 분석해 최적의 드릴을 설계합니다.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/login')}
                        className="group relative px-8 py-5 bg-violet-600 rounded-full font-bold text-white text-lg shadow-[0_0_40px_-10px_rgba(124,58,237,0.5)] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500 w-[200%]" />
                        <span className="relative flex items-center gap-3">
                            <Sparkles className="w-5 h-5 fill-white" />
                            AI 코치와 시작하기
                        </span>
                    </motion.button>
                </div>

                {/* RIGHT COLUMN: AI Scanning Interaction */}
                <div className="relative flex items-center justify-center p-8 min-h-[500px]">
                    {/* The Scanner Container */}
                    <div className="relative w-full max-w-[400px] aspect-[4/5] perspective-1000">
                        {/* Glow Behind */}
                        <div className="absolute inset-0 bg-violet-500/20 blur-3xl -z-10 rounded-full transform scale-75 animate-pulse-slow" />

                        {/* CONTENT AREA */}
                        <AnimatePresence mode="wait">
                            {phase === 'result' ? (
                                /* RESULT: Technique Recommendation */
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, scale: 0.9, rotateX: -10 }}
                                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                                    exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
                                    transition={{ type: "spring", bounce: 0.4 }}
                                    className="w-full h-full bg-zinc-900/80 backdrop-blur-xl border border-violet-500/50 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden"
                                >
                                    {/* Success Glow */}
                                    <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-violet-500/20 to-transparent pointer-events-none" />

                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/40">
                                        <Brain className="w-8 h-8 text-white" />
                                    </div>

                                    <div className="text-center space-y-2">
                                        <div className="text-emerald-400 text-sm font-bold tracking-wider uppercase mb-2 flex items-center justify-center gap-2">
                                            <Zap className="w-4 h-4 fill-emerald-400" />
                                            Analysis Complete
                                        </div>
                                        <h3 className="text-2xl font-bold text-white leading-tight">
                                            추천 드릴: <br />
                                            <span className="text-violet-400">시저 스윕 (Scissor Sweep)</span>
                                        </h3>
                                        <div className="inline-block px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs mt-2">
                                            패턴 일치율 98%
                                        </div>
                                    </div>

                                    {/* Fake Progress Bar */}
                                    <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-8 overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: "100%" }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                        />
                                    </div>
                                </motion.div>
                            ) : (
                                /* JOURNAL: User's Entry */
                                <motion.div
                                    key="journal"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95, filter: "brightness(1.2)" }}
                                    className="w-full h-full bg-zinc-900/40 backdrop-blur-sm border border-zinc-800 rounded-3xl p-8 relative overflow-hidden"
                                >
                                    {/* Paper Texture/Header */}
                                    <div className="flex items-center gap-4 mb-6 opacity-50">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800" />
                                        <div className="space-y-2">
                                            <div className="w-24 h-2 bg-zinc-800 rounded" />
                                            <div className="w-16 h-2 bg-zinc-800 rounded" />
                                        </div>
                                    </div>

                                    {/* Handwritten Text */}
                                    <div className="space-y-4 font-handwriting text-zinc-300 text-xl leading-relaxed">
                                        <p className="opacity-80">"오늘 스파링에서 가드가 너무 쉽게 뚫림..."</p>
                                        <p className="opacity-60 text-lg">"상대가 일어설 때 힙 무브먼트가 부족했던 것 같다."</p>
                                        <p className="opacity-90 text-violet-300">"어떻게 방어해야 하지?"</p>
                                    </div>

                                    {/* Date Stamp */}
                                    <div className="absolute bottom-8 right-8 text-zinc-600 text-sm font-mono rotate-[-5deg] border-2 border-zinc-700 px-2 py-1 rounded opacity-50">
                                        2024.12.28
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* SCANNING OVERLAY */}
                        <AnimatePresence>
                            {phase === 'scanning' && (
                                <motion.div
                                    initial={{ top: "0%", opacity: 0 }}
                                    animate={{ top: "100%", opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 1.5, ease: "linear" }}
                                    className="absolute left-[-10%] w-[120%] h-24 bg-gradient-to-b from-violet-500/0 via-violet-500/50 to-violet-500/0 z-20 pointer-events-none flex items-center justify-center"
                                >
                                    {/* Laser Line */}
                                    <div className="w-full h-[2px] bg-violet-400 shadow-[0_0_20px_rgba(139,92,246,1)] box-shadow-lg" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};
