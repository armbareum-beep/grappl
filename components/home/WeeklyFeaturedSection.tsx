import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Dumbbell, Video, ArrowRight, Star, GraduationCap, Zap, Target } from 'lucide-react';
import { motion } from 'framer-motion';
import { Course, DrillRoutine, SparringVideo } from '../../types';

interface WeeklyFeaturedSectionProps {
    course: Course | null;
    routine: DrillRoutine | null;
    sparring: SparringVideo | null;
}

export const WeeklyFeaturedSection: React.FC<WeeklyFeaturedSectionProps> = ({
    course,
    routine,
    sparring
}) => {
    const navigate = useNavigate();

    // Fallback if data is missing
    if (!course && !routine && !sparring) return null;

    // Derived Theme (In real app, this would come from a 'WeeklyTheme' API)
    const weeklyTheme = routine?.category || course?.category || "ADVANCED SYSTEMS";
    const themeDisplay = weeklyTheme.toUpperCase();

    return (
        <section className="px-6 md:px-12 max-w-7xl mx-auto mb-24 relative">
            {/* Background Aesthetic Glow */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute top-1/2 -right-24 w-64 h-64 bg-blue-600/5 blur-[100px] rounded-full pointer-events-none" />

            <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">
                            Weekly Technique Chain
                        </span>
                        <div className="h-[1px] w-12 bg-zinc-800" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-none mb-4">
                        이주의 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-500">테크닉 체인</span>
                    </h2>
                    <p className="text-zinc-500 text-sm md:text-base font-medium max-w-xl">
                        단편적인 학습을 넘어, 하나의 연속기를 완성하는 최적의 경로를 따라가 보세요.
                    </p>
                </div>

                <div className="flex items-center gap-3 p-1.5 px-4 bg-zinc-900/50 border border-white/5 rounded-full backdrop-blur-sm shadow-xl">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Theme:</span>
                    <span className="text-white text-xs font-black tracking-tight">{themeDisplay}</span>
                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
                </div>
            </div>

            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 min-h-[500px]">
                {/* SVG Connectors (Desktop Only) */}
                <div className="hidden lg:block absolute inset-0 pointer-events-none z-0">
                    <svg className="w-full h-full" overflow="visible">
                        <defs>
                            <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
                                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.2" />
                            </linearGradient>
                        </defs>
                        {/* Path from Course to Routine */}
                        <motion.path
                            d="M 60% 30% C 65% 30%, 70% 20%, 75% 20%"
                            stroke="url(#flowGradient)"
                            strokeWidth="3"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                        {/* Path from Routine to Sparring */}
                        <motion.path
                            d="M 85% 45% L 85% 55%"
                            stroke="url(#flowGradient)"
                            strokeWidth="3"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                        />
                    </svg>
                </div>

                {/* 1. Step: Understanding (Course) */}
                <div
                    className="lg:col-span-7 group cursor-pointer relative"
                    onClick={() => course && navigate(`/courses/${course.id}`)}
                >
                    <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-zinc-950 border border-violet-500/50 flex items-center justify-center z-20 shadow-2xl group-hover:scale-110 transition-transform">
                        <span className="text-violet-400 text-xs font-black italic">01</span>
                    </div>

                    <div className="relative h-full min-h-[340px] overflow-hidden rounded-[40px] border border-zinc-800 bg-zinc-900 group transition-all duration-500 hover:border-violet-500/50 hover:shadow-[0_20px_60px_-15px_rgba(139,92,246,0.3)]">
                        {/* Background */}
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-60"
                            style={{ backgroundImage: `url(${course?.thumbnailUrl || 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&q=80'})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />

                        {/* Content */}
                        <div className="absolute inset-0 p-8 md:p-12 flex flex-col justify-end">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-xl bg-violet-600 shadow-lg shadow-violet-900/40">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-white/60 text-[10px] font-black tracking-widest uppercase">Step 1: Learn</span>
                            </div>

                            <h3 className="text-3xl md:text-5xl font-black text-white mb-6 line-clamp-2 leading-[1.1] tracking-tight group-hover:translate-x-2 transition-transform duration-500">
                                {course?.title || '로딩 중...'}
                            </h3>

                            <div className="flex flex-wrap items-center gap-6 text-zinc-300 text-sm font-bold">
                                <span className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                                    <Video className="w-4 h-4 text-violet-400" />
                                    {course?.lessonCount || 0} Lessons
                                </span>
                                <span className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                    4.9 Choice
                                </span>
                            </div>
                        </div>

                        {/* Play Indicator */}
                        <div className="absolute top-10 right-10 w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 scale-90 group-hover:scale-100">
                            <Play className="w-8 h-8 text-white fill-current ml-1" />
                        </div>
                    </div>
                </div>

                {/* 2 & 3. Steps: Practice & Application */}
                <div className="lg:col-span-5 flex flex-col gap-6 lg:gap-8">
                    {/* Step 2: Repetition (Routine) */}
                    <div
                        className="group cursor-pointer relative"
                        onClick={() => routine && navigate(`/routines/${routine.id}`)}
                    >
                        <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-zinc-950 border border-violet-500/30 flex items-center justify-center z-20 shadow-xl group-hover:scale-110 transition-transform">
                            <span className="text-violet-400 text-[10px] font-black italic">02</span>
                        </div>

                        <div className="relative h-full min-h-[220px] overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900 transition-all duration-500 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-900/10">
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-40"
                                style={{ backgroundImage: `url(${routine?.thumbnailUrl || 'https://images.unsplash.com/photo-1599058917233-57c0e620c40e?auto=format&fit=crop&q=80'})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] to-transparent opacity-80" />

                            <div className="absolute inset-0 p-8 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-3">
                                    <Zap className="w-4 h-4 text-violet-500 fill-current" />
                                    <span className="text-zinc-500 text-[9px] font-black tracking-widest uppercase">Step 2: Drill</span>
                                </div>
                                <h4 className="text-xl md:text-2xl font-black text-white mb-2 line-clamp-1 tracking-tight group-hover:text-violet-300 transition-colors">
                                    {routine?.title || '추천 드릴'}
                                </h4>
                                <div className="flex items-center gap-4 text-zinc-500 text-[11px] font-bold">
                                    <span className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 rounded-full border border-violet-500/10 text-violet-400">
                                        <Dumbbell className="w-3.5 h-3.5" />
                                        {routine?.category || 'Fundamentals'}
                                    </span>
                                    <span>+150 XP Reward</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Proof (Sparring) */}
                    <div
                        className="group cursor-pointer relative"
                        onClick={() => sparring && navigate(`/sparring/${sparring.id}`)}
                    >
                        <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-zinc-950 border border-violet-500/30 flex items-center justify-center z-20 shadow-xl group-hover:scale-110 transition-transform">
                            <span className="text-violet-400 text-[10px] font-black italic">03</span>
                        </div>

                        <div className="relative h-full min-h-[220px] overflow-hidden rounded-[32px] border border-zinc-800 bg-zinc-900 transition-all duration-500 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-900/10">
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-40"
                                style={{ backgroundImage: `url(${sparring?.thumbnailUrl || 'https://images.unsplash.com/photo-1510271378393-24239846b9a8?auto=format&fit=crop&q=80'})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#09090b] to-transparent opacity-80" />

                            <div className="absolute inset-0 p-8 flex flex-col justify-center">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="w-4 h-4 text-violet-500" />
                                    <span className="text-zinc-500 text-[9px] font-black tracking-widest uppercase">Step 3: Apply</span>
                                </div>
                                <h4 className="text-xl md:text-2xl font-black text-white mb-2 line-clamp-1 tracking-tight group-hover:text-violet-300 transition-colors">
                                    {sparring?.title || '화제의 스파링'}
                                </h4>
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-2">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#09090b] bg-zinc-800 overflow-hidden">
                                                    <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="user" loading="lazy" className="w-full h-full object-cover grayscale" />
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-zinc-600 text-[10px] font-bold">1.2k viewed</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-600 transition-colors">
                                        <ArrowRight className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom CTA / Progress Info */}
            <div className="mt-12 flex flex-col md:flex-row items-center justify-center gap-8 p-8 border-t border-white/5">
                <div className="flex items-center gap-12">
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">3</div>
                        <div className="text-zinc-600 text-[10px] font-black uppercase">Content Linked</div>
                    </div>
                    <div className="h-8 w-[1px] bg-zinc-800" />
                    <div className="text-center">
                        <div className="text-2xl font-black text-white">+500</div>
                        <div className="text-zinc-600 text-[10px] font-black uppercase">Potenial XP</div>
                    </div>
                </div>

                <button
                    onClick={() => navigate('/skill-tree')}
                    className="px-8 py-4 bg-white text-black font-black text-sm rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.2)]"
                >
                    전체 체인 탐색하기
                </button>
            </div>
        </section>
    );
};

