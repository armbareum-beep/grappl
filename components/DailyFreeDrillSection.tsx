import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, BarChart3, BookOpen, Layers } from 'lucide-react';
import { getDailyRoutine, getDailyFreeCourse } from '../lib/api';
import { DrillRoutine, Course as CourseType } from '../types';

export const DailyFreeDrillSection: React.FC = () => {
    const navigate = useNavigate();
    const [routine, setRoutine] = useState<DrillRoutine | null>(null);
    const [course, setCourse] = useState<CourseType | null>(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        fetchDailyContent();

        const timer = setInterval(() => {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(now.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);

            const diff = tomorrow.getTime() - now.getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            setTimeLeft(`${h}h ${m}m ${s}s`);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const fetchDailyContent = async () => {
        try {
            const [routineRes, courseRes] = await Promise.all([
                getDailyRoutine(),
                getDailyFreeCourse()
            ]);

            if (routineRes.data) setRoutine(routineRes.data);
            if (courseRes.data) setCourse(courseRes.data);
        } catch (e) {
            console.error('Error in DailyFreeDrillSection fetch:', e);
        }
    };

    return (
        <section className="py-24 md:py-40 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-violet-900/25 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* 1. Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-block mb-4">
                        <div className="bg-zinc-900/50 px-6 py-2 rounded-full inline-flex items-center gap-3 backdrop-blur-sm border border-zinc-800">
                            <Clock className="w-4 h-4 text-violet-500" />
                            <span className="text-zinc-400 font-mono text-sm tracking-wider">
                                Next Refresh in: <span className="text-zinc-200">{timeLeft}</span>
                            </span>
                        </div>
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black text-zinc-50 mb-6 tracking-tight">
                        TODAY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">FREE PASS</span>
                    </h2>

                    <p className="text-violet-300/80 text-xl font-medium max-w-2xl mx-auto break-keep">
                        매일 프리미엄 클래스와 루틴이 무료로 공개됩니다.
                    </p>
                </div>

                {/* 2. Daily Content Cards - Optimized for all screens */}
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-20">
                        {/* Class/Course Card */}
                        {course ? (
                            <div
                                onClick={() => navigate(`/courses/${course.id}`)}
                                className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 rounded-[24px] md:rounded-[32px] overflow-hidden cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                            >
                                <div className="w-full aspect-video relative overflow-hidden shrink-0">
                                    <img
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                </div>

                                <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-between relative">
                                    <div className="mb-4 md:mb-6">
                                        <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-2 text-violet-400">
                                            <div className="w-1 h-1 rounded-full bg-violet-500" />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-80">Class</span>
                                        </div>
                                        <h3 className="text-zinc-50 text-sm md:text-xl font-bold md:font-black tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                                            {course.title}
                                        </h3>
                                        <p className="hidden md:block text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">
                                            {course.description || "블랙벨트의 체계적인 커리큘럼으로 주짓수를 마스터하세요."}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                            <div className="flex items-center gap-1.5 md:gap-2 text-zinc-400">
                                                <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                    <Layers className="w-2.5 h-2.5 md:w-3 h-3 text-zinc-500" />
                                                </div>
                                                <span className="text-[10px] md:text-[11px] font-bold text-zinc-500">{course.lessonCount || 0}L</span>
                                            </div>
                                            {course.creatorName && (
                                                <div className="flex items-center gap-1.5 md:gap-2 text-zinc-400">
                                                    <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                        <BookOpen className="w-2.5 h-2.5 md:w-3 h-3 text-zinc-500" />
                                                    </div>
                                                    <span className="text-[10px] md:text-[11px] font-bold text-zinc-500 truncate max-w-[60px] md:max-w-none">{course.creatorName}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end">
                                            <div className="flex items-center gap-1 md:gap-2 text-zinc-100 text-[9px] md:text-[11px] font-black uppercase tracking-widest group/btn py-1.5 px-3 md:py-2 md:px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 hover:bg-violet-600 hover:border-violet-400 transition-all duration-300 whitespace-nowrap">
                                                <span className="hidden xs:inline">Check</span>
                                                <ArrowRight className="w-3 h-3 md:w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] md:rounded-[32px] overflow-hidden animate-pulse">
                                <div className="w-full aspect-video bg-zinc-800/50" />
                                <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="h-4 w-16 md:w-24 bg-zinc-800/50 rounded-full" />
                                        <div className="h-6 md:h-8 w-full bg-zinc-800/50 rounded-lg" />
                                    </div>
                                    <div className="h-8 md:h-10 w-20 md:w-28 bg-zinc-800/50 ml-auto rounded-full" />
                                </div>
                            </div>
                        )}

                        {/* Routine Card */}
                        {routine ? (
                            <div
                                onClick={() => navigate(`/routines/${routine.id}`)}
                                className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 rounded-[24px] md:rounded-[32px] overflow-hidden cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                            >
                                <div className="w-full aspect-video relative overflow-hidden shrink-0">
                                    <img
                                        src={routine.thumbnailUrl}
                                        alt={routine.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                </div>

                                <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-between relative">
                                    <div className="mb-4 md:mb-6">
                                        <div className="flex items-center gap-1 md:gap-2 mb-1.5 md:mb-2 text-violet-400">
                                            <div className="w-1 h-1 rounded-full bg-violet-500" />
                                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-80">Routine</span>
                                        </div>
                                        <h3 className="text-zinc-50 text-sm md:text-xl font-bold md:font-black tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-1">
                                            {routine.title}
                                        </h3>
                                        <p className="hidden md:block text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">
                                            {routine.description || "이 루틴을 통해 기초부터 탄탄하게 주짓수 실력을 향상시키세요."}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-2 md:gap-4">
                                            <div className="flex items-center gap-1.5 md:gap-2 text-zinc-400">
                                                <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                    <Clock className="w-2.5 h-2.5 md:w-3 h-3 text-zinc-500" />
                                                </div>
                                                <span className="text-[10px] md:text-[11px] font-bold text-zinc-500">{routine.totalDurationMinutes || 10}m</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 md:gap-2 text-zinc-400">
                                                <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                    <BarChart3 className="w-2.5 h-2.5 md:w-3 h-3 text-zinc-500" />
                                                </div>
                                                <span className="text-[10px] md:text-[11px] font-bold text-zinc-500 truncate max-w-[60px] md:max-w-none">{routine.difficulty || "Beginner"}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end">
                                            <div className="flex items-center gap-1 md:gap-2 text-zinc-100 text-[9px] md:text-[11px] font-black uppercase tracking-widest group/btn py-1.5 px-3 md:py-2 md:px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 hover:bg-violet-600 hover:border-violet-400 transition-all duration-300 whitespace-nowrap">
                                                <span className="hidden xs:inline">Start</span>
                                                <ArrowRight className="w-3 h-3 md:w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] md:rounded-[32px] overflow-hidden animate-pulse">
                                <div className="w-full aspect-video bg-zinc-800/50" />
                                <div className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col justify-between gap-6">
                                    <div className="space-y-4">
                                        <div className="h-4 w-16 md:w-24 bg-zinc-800/50 rounded-full" />
                                        <div className="h-6 md:h-8 w-full bg-zinc-800/50 rounded-lg" />
                                    </div>
                                    <div className="h-8 md:h-10 w-20 md:w-28 bg-zinc-800/50 ml-auto rounded-full" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. CTA Button */}
                    <div className="text-center pb-20">
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-xl font-bold py-5 px-12 rounded-full shadow-[0_20px_40px_rgba(124,58,237,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            로그인 하기
                        </button>
                        <p className="mt-4 text-zinc-500 text-sm font-medium break-keep">
                            지금 로그인하고 오늘의 무료 기술을 확인하세요.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
