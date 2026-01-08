import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Calendar, ChevronRight } from 'lucide-react';

// Mock data for the weekly planner grid
const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const plannedTechniques = [
    { day: 0, label: 'Armbar', color: 'bg-violet-500' },
    { day: 1, label: 'Triangle', color: 'bg-indigo-500' },
    { day: 3, label: 'Sweeps', color: 'bg-violet-600' },
    { day: 4, label: 'Passing', color: 'bg-zinc-600' },
    { day: 5, label: 'Sparring', color: 'bg-rose-500' },
];

const drillItems = [
    { id: 1, text: 'Armbar from Guard', reps: '20 reps' },
    { id: 2, text: 'Triangle Setup Drill', reps: '15 reps' },
    { id: 3, text: 'Hip Escape Movement', reps: '30 reps' },
];

export const RoutinePromotionSection: React.FC = () => {
    const navigate = useNavigate();
    const [checkedItems, setCheckedItems] = useState<number[]>([]);

    const toggleCheck = (id: number) => {
        if (checkedItems.includes(id)) {
            setCheckedItems(checkedItems.filter(item => item !== id));
        } else {
            setCheckedItems([...checkedItems, id]);
        }
    };

    return (
        <section className="py-24 md:py-40 relative overflow-hidden text-white">
            {/* Background Elements */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-violet-900/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/4"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                <div className="flex flex-col-reverse md:flex-row items-center gap-12 md:gap-20">

                    {/* 1. Visuals (Left) - Interactive Mockup */}
                    <div className="w-full md:w-1/2 relative">
                        <div className="relative z-10 flex flex-col gap-6">

                            {/* Element A: Weekly Planner Mockup */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8 }}
                                className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-violet-400" />
                                        <span className="text-sm font-bold text-zinc-300">Weekly Schedule</span>
                                    </div>
                                    <span className="text-xs text-zinc-500 font-mono">Jan 2026</span>
                                </div>

                                <div className="grid grid-cols-7 gap-2">
                                    {days.map((day, i) => {
                                        const technique = plannedTechniques.find(t => t.day === i);
                                        return (
                                            <div key={i} className="flex flex-col gap-2 group cursor-pointer">
                                                <div className="text-[10px] text-zinc-500 text-center font-bold tracking-wider group-hover:text-zinc-300 transition-colors">{day}</div>
                                                <div className={`h-24 rounded-lg bg-zinc-950/50 border border-zinc-800/50 flex flex-col items-center justify-start p-1 transition-all ${technique ? 'group-hover:border-violet-500/30' : 'group-hover:bg-zinc-900'}`}>
                                                    {technique && (
                                                        <div className={`w-full py-1 px-1 rounded text-[9px] font-bold text-white text-center shadow-lg mb-1 ${technique.color}`}>
                                                            {technique.label}
                                                        </div>
                                                    )}
                                                    {i === 2 && !technique && (
                                                        <div className="w-full h-full border-2 border-dashed border-zinc-800/80 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-zinc-600 text-xs">+</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>

                            {/* Element B: Drill Card (Floating) */}
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="absolute -bottom-8 -right-4 md:-right-8 w-[280px] bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-5 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] z-20"
                            >
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800/50">
                                    <span className="text-sm font-bold text-white">Today's Drills</span>
                                    <span className="text-xs text-violet-400 font-bold bg-violet-400/10 px-2 py-0.5 rounded-full">3 Tasks</span>
                                </div>

                                <div className="space-y-3">
                                    {drillItems.map((item) => {
                                        const isChecked = checkedItems.includes(item.id);
                                        return (
                                            <div
                                                key={item.id}
                                                className="flex items-start gap-3 cursor-pointer group"
                                                onClick={() => toggleCheck(item.id)}
                                            >
                                                <div className={`relative flex items-center justify-center w-5 h-5 rounded border transition-all duration-300 shrink-0 mt-0.5 ${isChecked ? 'bg-violet-600 border-violet-600' : 'border-zinc-700 bg-zinc-900 group-hover:border-zinc-500'
                                                    }`}>
                                                    <AnimatePresence>
                                                        {isChecked && (
                                                            <motion.div
                                                                initial={{ scale: 0 }}
                                                                animate={{ scale: 1 }}
                                                                exit={{ scale: 0 }}
                                                            >
                                                                <Check className="w-3.5 h-3.5 text-white" />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                    {/* Pulse Effect */}
                                                    {isChecked && (
                                                        <span className="absolute inset-0 rounded-full animate-ping bg-violet-500/50"></span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className={`text-sm font-medium transition-all duration-300 ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-200'
                                                        }`}>
                                                        {item.text}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 mt-0.5">{item.reps}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        </div>

                        {/* Decorative blob behind visuals */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-zinc-800/5 rounded-full blur-3xl -z-10"></div>
                    </div>

                    {/* 2. Text Content (Right) */}
                    <div className="w-full md:w-1/2 text-left md:pl-10">
                        <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                            <Calendar className="w-3.5 h-3.5 text-violet-500 mr-2" />
                            <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400">
                                TRAINING ROUTINE
                            </span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
                            반복이 <br />
                            실력을 만듭니다. <br />
                            <span className="text-zinc-500">지치지 않는 꾸준함.</span>
                        </h2>
                        <p className="text-zinc-400 text-lg md:text-xl leading-relaxed mb-10 max-w-lg">
                            생각하기 전에 몸이 먼저 반응해야 합니다. <br className="hidden md:block" />
                            오늘 연습할 기술과 연결 동작들을 주간 단위로 플래닝하고 실천하세요.
                        </p>

                        <button
                            onClick={() => navigate('/training-routines')}
                            className="group flex items-center gap-2 border border-violet-600/50 text-violet-400 hover:bg-violet-600 hover:text-white hover:border-violet-600 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 shadow-[0_0_20px_rgba(124,58,237,0.0)] hover:shadow-[0_0_25px_rgba(124,58,237,0.3)]"
                        >
                            <span>주간 훈련 스케줄 짜기</span>
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                </div>
            </div>
        </section>
    );
};
