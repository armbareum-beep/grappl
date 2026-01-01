import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Dumbbell, Video, ArrowRight, Star } from 'lucide-react';
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

    // Fallback if data is missing, but usually handled by parent
    if (!course && !routine && !sparring) return null;

    return (
        <section className="px-6 md:px-12 max-w-7xl mx-auto mb-16">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-white tracking-tighter mb-2">
                        WEEKLY <span className="text-violet-500">FEATURED</span>
                    </h2>
                    <p className="text-zinc-500 text-sm md:text-base font-medium">이번 주 반드시 정복해야 할 그래플러 추천 콘텐츠</p>
                </div>
            </div>

            <div className="flex overflow-x-auto snap-x scroll-pl-6 pb-8 -mx-6 px-6 lg:mx-0 lg:px-0 lg:pb-0 lg:grid lg:grid-cols-12 lg:grid-rows-2 gap-6 lg:min-h-[500px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
                {/* 1. Spotlight: Best Course (16:9 large) - Master Height */}
                <div className="min-w-[90%] snap-center mr-4 lg:mr-0 lg:col-span-8 lg:row-span-2 group cursor-pointer" onClick={() => course && navigate(`/courses/${course.id}`)}>
                    <div className="relative w-full aspect-video lg:aspect-auto lg:h-full min-h-[240px] lg:min-h-[300px] overflow-hidden rounded-[32px] border border-zinc-800 transition-all duration-500 hover:border-violet-500/50 hover:shadow-2xl hover:shadow-violet-900/20">
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                            style={{ backgroundImage: `url(${course?.thumbnailUrl || 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&q=80'})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                        {/* Content */}
                        <div className="absolute bottom-0 left-0 p-8 md:p-10 w-full">
                            <div className="flex items-center gap-2 mb-4">
                                <span className="px-3 py-1 bg-violet-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-900/40">
                                    Best Class
                                </span>
                                <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{course?.creatorName}</span>
                            </div>
                            <h3 className="text-3xl md:text-5xl font-black text-white mb-4 line-clamp-2 leading-[1.1] tracking-tight">
                                {course?.title || '로딩 중...'}
                            </h3>
                            <div className="flex items-center gap-6 text-zinc-300 text-sm font-bold">
                                <span className="flex items-center gap-2">
                                    <Video className="w-4 h-4 text-violet-400" />
                                    {course?.lessonCount || 0} Lessons
                                </span>
                                <span className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-yellow-400" />
                                    4.9 Rating
                                </span>
                            </div>
                        </div>

                        {/* Hover Overlay Button */}
                        <div className="absolute top-8 right-8 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                            <Play className="w-6 h-6 text-white fill-current ml-1" />
                        </div>
                    </div>
                </div>

                {/* 2. Side Grid Item 1: Routine */}
                <div
                    className="min-w-[90%] snap-center mr-4 lg:mr-0 lg:col-span-4 relative w-full aspect-video lg:aspect-auto overflow-hidden rounded-[32px] border border-zinc-800 group cursor-pointer hover:border-violet-500/50 transition-all duration-500"
                    onClick={() => routine && navigate(`/drill-routines/${routine.id}`)}
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${routine?.thumbnailUrl || 'https://images.unsplash.com/photo-1599058917233-57c0e620c40e?auto=format&fit=crop&q=80'})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                        <div className="mb-3">
                            <span className="px-2.5 py-1 bg-violet-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-900/20">
                                Daily Routine
                            </span>
                        </div>
                        <h4 className="text-xl md:text-2xl font-black text-white mb-1 line-clamp-2 tracking-tight">
                            {routine?.title || '추천 드릴'}
                        </h4>
                        <div className="flex items-center gap-3 text-zinc-400 text-xs font-bold">
                            <span className="flex items-center gap-1.5">
                                <Dumbbell className="w-3.5 h-3.5 text-violet-400" />
                                {routine?.category || 'Fundamentals'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Side Grid Item 2: Sparring */}
                <div
                    className="min-w-[90%] snap-center mr-4 lg:mr-0 lg:col-span-4 relative w-full aspect-video lg:aspect-auto overflow-hidden rounded-[32px] border border-zinc-800 group cursor-pointer hover:border-violet-500/50 transition-all duration-500"
                    onClick={() => sparring && navigate(`/sparring?action=view&id=${sparring.id}`)}
                >
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                        style={{ backgroundImage: `url(${sparring?.thumbnailUrl || 'https://images.unsplash.com/photo-1510271378393-24239846b9a8?auto=format&fit=crop&q=80'})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                        <div className="mb-3 flex gap-2">
                            <span className="px-2.5 py-1 bg-violet-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-900/20">
                                Hot Sparring
                            </span>
                            <span className="px-2.5 py-1 bg-violet-600/20 text-violet-300 border border-violet-500/30 text-[9px] font-black rounded-full uppercase tracking-widest backdrop-blur-sm">
                                Analysis
                            </span>
                        </div>
                        <h4 className="text-xl md:text-2xl font-black text-white mb-1 line-clamp-1 tracking-tight">
                            {sparring?.title || '화제의 스파링'}
                        </h4>
                        <div className="flex items-center justify-between text-zinc-400 text-xs font-bold mt-1">
                            <span className="flex items-center gap-1.5 capitalize">
                                Coach Insight Active
                            </span>
                            <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
