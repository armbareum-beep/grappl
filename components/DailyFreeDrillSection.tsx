import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, BookOpen, Layers, Play } from 'lucide-react';
import { getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } from '../lib/api';
import { Drill, Lesson, SparringVideo } from '../types';

export const DailyFreeDrillSection: React.FC = () => {
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [sparring, setSparring] = useState<SparringVideo | null>(null);
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
            const [drillRes, lessonRes, sparringRes] = await Promise.all([
                getDailyFreeDrill(),
                getDailyFreeLesson(),
                getDailyFreeSparring()
            ]);

            if (drillRes.data) setDrill(drillRes.data);
            if (lessonRes.data) setLesson(lessonRes.data);
            if (sparringRes.data) setSparring(sparringRes.data);
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
                        매일 프리미엄 콘텐츠가 무료로 공개됩니다.
                    </p>
                </div>

                {/* 2. Daily Content Cards - Optimized for 3 columns */}
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-20">
                        {/* Drill Card */}
                        {drill ? (
                            <div
                                onClick={() => navigate(`/drills/${drill.id}`)}
                                className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 rounded-[24px] overflow-hidden cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                            >
                                <div className="w-full aspect-[4/5] relative overflow-hidden shrink-0">
                                    <img
                                        src={drill.thumbnailUrl}
                                        alt={drill.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                </div>

                                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative">
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2 text-violet-400">
                                            <div className="w-1 h-1 rounded-full bg-violet-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Drill</span>
                                        </div>
                                        <h3 className="text-zinc-50 text-base md:text-lg font-bold tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                                            {drill.title}
                                        </h3>
                                        <p className="hidden md:block text-zinc-500 text-[11px] line-clamp-2 leading-relaxed font-medium">
                                            {drill.description || "기초 드릴로 주짓수 실력을 향상시키세요."}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-zinc-400">
                                                <Clock className="w-3 h-3 text-zinc-500" />
                                                <span className="text-[11px] font-bold text-zinc-500">{drill.durationMinutes || 5}m</span>
                                            </div>
                                            {drill.creatorName && (
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <BookOpen className="w-3 h-3 text-zinc-500" />
                                                    <span className="text-[11px] font-bold text-zinc-500 truncate max-w-[80px]">{drill.creatorName}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end">
                                            <div className="flex items-center gap-2 text-zinc-100 text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 group-hover:bg-violet-600 group-hover:border-violet-400 transition-all duration-300">
                                                <span>Practice</span>
                                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-[4/5] bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] animate-pulse" />
                        )}

                        {/* Lesson Card */}
                        {lesson ? (
                            <div
                                onClick={() => navigate(`/lessons/${lesson.id}`)}
                                className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 rounded-[24px] overflow-hidden cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                            >
                                <div className="w-full aspect-[5/4] relative overflow-hidden shrink-0">
                                    <img
                                        src={lesson.thumbnailUrl}
                                        alt={lesson.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                </div>

                                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative">
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2 text-violet-400">
                                            <div className="w-1 h-1 rounded-full bg-violet-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Lesson</span>
                                        </div>
                                        <h3 className="text-zinc-50 text-base md:text-lg font-bold tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                                            {lesson.title}
                                        </h3>
                                        <p className="hidden md:block text-zinc-500 text-[11px] line-clamp-2 leading-relaxed font-medium">
                                            {lesson.description || "블랙벨트의 디테일한 기술을 배워보세요."}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5 text-zinc-400">
                                                <Layers className="w-3 h-3 text-zinc-500" />
                                                <span className="text-[11px] font-bold text-zinc-500">{lesson.courseTitle || '강좌'}</span>
                                            </div>
                                            {lesson.creatorName && (
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <BookOpen className="w-3 h-3 text-zinc-500" />
                                                    <span className="text-[11px] font-bold text-zinc-500 truncate max-w-[80px]">{lesson.creatorName}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end">
                                            <div className="flex items-center gap-2 text-zinc-100 text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 group-hover:bg-violet-600 group-hover:border-violet-400 transition-all duration-300">
                                                <span>Watch</span>
                                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-[5/4] bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] animate-pulse" />
                        )}

                        {/* Sparring Card */}
                        {sparring ? (
                            <div
                                onClick={() => navigate(`/watch?tab=sparring&id=${sparring.id}`)}
                                className="group flex flex-col bg-zinc-900/30 border border-zinc-800/50 rounded-[24px] overflow-hidden cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                            >
                                <div className="w-full aspect-square relative overflow-hidden shrink-0">
                                    <img
                                        src={sparring.thumbnailUrl}
                                        alt={sparring.title}
                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <div className="w-12 h-12 rounded-full bg-violet-600/80 backdrop-blur-sm flex items-center justify-center">
                                            <Play className="w-6 h-6 text-white fill-white ml-1" />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 p-5 md:p-6 flex flex-col justify-between relative">
                                    <div className="mb-4">
                                        <div className="flex items-center gap-2 mb-2 text-violet-400">
                                            <div className="w-1 h-1 rounded-full bg-violet-500" />
                                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Sparring</span>
                                        </div>
                                        <h3 className="text-zinc-50 text-base md:text-lg font-bold tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                                            {sparring.title}
                                        </h3>
                                        <p className="hidden md:block text-zinc-500 text-[11px] line-clamp-2 leading-relaxed font-medium">
                                            {sparring.description || "실전 스파링 영상을 통해 블랙벨트의 움직임을 직접 관찰하세요."}
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4">
                                            {sparring.creator && (
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={sparring.creator.profileImage || `https://ui-avatars.com/api/?name=${sparring.creator.name}`}
                                                        className="w-4 h-4 rounded-full border border-zinc-700"
                                                        alt=""
                                                    />
                                                    <span className="text-[11px] font-bold text-zinc-500 truncate max-w-[100px]">{sparring.creator.name}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-zinc-500">
                                                <span className="text-[11px] font-bold uppercase tracking-tighter">{sparring.uniformType || 'GI'}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-end">
                                            <div className="flex items-center gap-2 text-zinc-100 text-[10px] font-black uppercase tracking-widest py-1.5 px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 group-hover:bg-violet-600 group-hover:border-violet-400 transition-all duration-300">
                                                <span>Watch</span>
                                                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="aspect-square bg-zinc-900/40 border border-zinc-800/50 rounded-[24px] animate-pulse" />
                        )}
                    </div>

                    {/* 3. CTA Button */}
                    <div className="text-center pb-20">
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-violet-600 hover:bg-violet-500 text-white text-xl font-bold py-5 px-12 rounded-full shadow-[0_20px_40px_rgba(124,58,237,0.3)] transition-all hover:scale-105 active:scale-95"
                        >
                            무료 기술 시청하기
                        </button>
                        <p className="mt-4 text-zinc-500 text-sm font-medium break-keep">
                            지금 바로 오늘의 무료 기술을 확인하고 훈련을 시작하세요.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};
