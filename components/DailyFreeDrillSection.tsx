import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Target, BarChart, Clock } from 'lucide-react';
import { getDailyFreeDrill, getDailyFreeLesson, getDailyFreeSparring } from '../lib/api';
import { Drill, Lesson, SparringVideo } from '../types';

export const DailyFreeDrillSection: React.FC = () => {
    const navigate = useNavigate();
    const [drill, setDrill] = useState<Drill | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [sparring, setSparring] = useState<SparringVideo | null>(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        fetchDailyContent();

        const timer = setInterval(() => {
            const now = new Date();
            const today = now.toISOString().split('T')[0];

            // 날짜가 바뀌면 콘텐츠 새로고침
            if (today !== currentDate) {
                setCurrentDate(today);
                fetchDailyContent();
            }

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
    }, [currentDate]);

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

                {/* 2. Daily Content Cards - Clean Gallery Style (Text Below) */}
                <div className="max-w-7xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-12 items-end mb-24">

                        {/* 1. Drill Card (4:5 Image) */}
                        <div className="w-full group cursor-pointer" onClick={() => navigate(`/drills/${drill?.id}`)}>
                            {drill ? (
                                <>
                                    <div className="w-full aspect-[4/5] rounded-[24px] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:ring-violet-500/50 group-hover:shadow-[0_20px_50px_rgba(124,58,237,0.2)] relative mb-5">
                                        <img
                                            src={drill.thumbnailUrl}
                                            alt={drill.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                    </div>

                                    <div className="px-1 h-[160px] flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Drill</span>
                                            </div>

                                            <h3 className="text-zinc-50 text-xl md:text-2xl font-bold leading-tight mb-3 line-clamp-2 group-hover:text-violet-300 transition-colors">
                                                {drill.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={drill.creatorProfileImage || `https://ui-avatars.com/api/?name=${drill.creatorName}&background=random`}
                                                    className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                                                    alt=""
                                                />
                                                <span className="text-xs font-bold text-zinc-400 truncate max-w-[100px]">{drill.creatorName || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-zinc-500">
                                                <BarChart className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{drill.difficulty || 'All Levels'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="aspect-[4/5] bg-zinc-900/40 rounded-[24px] animate-pulse ring-1 ring-white/5" />
                            )}
                        </div>

                        {/* 2. Lesson Card (5:4 Image) */}
                        <div className="w-full group cursor-pointer" onClick={() => navigate('/watch?tab=lesson')}>
                            {lesson ? (
                                <>
                                    <div className="w-full aspect-[5/4] rounded-[24px] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:ring-violet-500/50 group-hover:shadow-[0_20px_50px_rgba(124,58,237,0.2)] relative mb-5">
                                        <img
                                            src={lesson.thumbnailUrl}
                                            alt={lesson.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                    </div>

                                    <div className="px-1 h-[160px] flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Lesson</span>
                                            </div>

                                            <h3 className="text-zinc-50 text-xl md:text-2xl font-bold leading-tight mb-3 line-clamp-2 group-hover:text-violet-300 transition-colors">
                                                {lesson.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={lesson.creatorProfileImage || `https://ui-avatars.com/api/?name=${lesson.creatorName}&background=random`}
                                                    className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                                                    alt=""
                                                />
                                                <span className="text-xs font-bold text-zinc-400 truncate max-w-[100px]">{lesson.creatorName || 'Unknown'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-zinc-500">
                                                <Target className="w-3.5 h-3.5" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider">{lesson.category || 'Technique'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="aspect-[5/4] bg-zinc-900/40 rounded-[24px] animate-pulse ring-1 ring-white/5" />
                            )}
                        </div>

                        {/* 3. Sparring Card (1:1 Image) */}
                        <div className="w-full group cursor-pointer" onClick={() => navigate(`/watch?tab=sparring&id=${sparring?.id}`)}>
                            {sparring ? (
                                <>
                                    <div className="w-full aspect-square rounded-[24px] overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/10 transition-all duration-500 group-hover:scale-[1.02] group-hover:ring-violet-500/50 group-hover:shadow-[0_20px_50px_rgba(124,58,237,0.2)] relative mb-5">
                                        <img
                                            src={sparring.thumbnailUrl}
                                            alt={sparring.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                                            <div className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl shadow-black/20">
                                                <Play className="w-6 h-6 text-white fill-white ml-1" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-1 h-[160px] flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">Sparring</span>
                                            </div>

                                            <h3 className="text-zinc-50 text-xl md:text-2xl font-bold leading-tight mb-3 line-clamp-1 group-hover:text-violet-300 transition-colors">
                                                {sparring.title}
                                            </h3>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={sparring.creator?.profileImage || sparring.creatorProfileImage || `https://ui-avatars.com/api/?name=${sparring.creator?.name || 'Unknown'}&background=random`}
                                                    className="w-6 h-6 rounded-full border border-zinc-700 object-cover"
                                                    alt=""
                                                />
                                                <span className="text-xs font-bold text-zinc-400 truncate max-w-[100px]">{sparring.creator?.name || 'Unknown'}</span>
                                            </div>
                                            <div className="px-2 py-1 rounded-md bg-zinc-800/50 border border-zinc-700/50">
                                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{sparring.uniformType || 'GI'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="aspect-square bg-zinc-900/40 rounded-[24px] animate-pulse ring-1 ring-white/5" />
                            )}
                        </div>

                    </div>

                    {/* 3. CTA Button */}
                    <div className="text-center pb-20">
                        <button
                            onClick={() => navigate('/watch?tab=mix')}
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
