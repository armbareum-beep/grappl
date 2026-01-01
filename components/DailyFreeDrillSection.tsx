import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, BarChart3, BookOpen, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Routine {
    id: string;
    title: string;
    thumbnail_url: string;
    description?: string;
    difficulty?: string;
    total_duration_minutes?: number;
    creator_name?: string;
}

interface Course {
    id: string;
    title: string;
    thumbnail_url: string;
    description?: string;
    lesson_count?: number;
    difficulty?: string;
    creator_name?: string;
}

export const DailyFreeDrillSection: React.FC = () => {
    const navigate = useNavigate();
    const [routine, setRoutine] = useState<Routine | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        fetchDailyContent();

        // Timer logic
        const calculateTimeLeft = () => {
            const now = new Date();
            const midnight = new Date();
            midnight.setHours(24, 0, 0, 0);

            const diff = midnight.getTime() - now.getTime();

            const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const m = Math.floor((diff / 1000 / 60) % 60);
            const s = Math.floor((diff / 1000) % 60);

            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        };

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        setTimeLeft(calculateTimeLeft());

        return () => clearInterval(timer);
    }, []);

    const fetchDailyContent = async () => {
        // Date seeded random helper
        const getDateSeededRandom = (max: number) => {
            const today = new Date();
            const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
            const x = Math.sin(seed) * 10000;
            return Math.floor((x - Math.floor(x)) * max);
        };

        // Fallback Data
        const fallbackRoutine: Routine = {
            id: 'fallback-routine-1',
            title: '기초 힙 이스케이프 드릴',
            description: '주짓수의 가장 기본이 되는 움직임인 힙 이스케이프를 완벽하게 마스터하는 하루 10분 루틴입니다.',
            thumbnail_url: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop',
            difficulty: 'Beginner',
            total_duration_minutes: 10,
            creator_name: 'Grapplay Team'
        };

        const fallbackCourse: Course = {
            id: 'fallback-course-1',
            title: '화이트벨트 탈출하기: 기초 완성',
            description: '주짓수를 처음 시작하는 분들을 위한 필수 가이드. 기본 포지션부터 서브미션 방어까지 체계적으로 배웁니다.',
            thumbnail_url: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop',
            lesson_count: 12,
            difficulty: 'Beginner',
            creator_name: 'Master Marcus'
        };

        try {
            // Fetch Routines
            const { data: routineData, error: routineError } = await supabase
                .from('routines')
                .select('id, title, thumbnail_url, description, difficulty, total_duration_minutes')
                .limit(20);

            if (!routineError && routineData && routineData.length > 0) {
                const randomIndex = getDateSeededRandom(routineData.length);
                setRoutine(routineData[randomIndex]);
            } else {
                console.log('Using fallback routine due to error or no data');
                setRoutine(fallbackRoutine);
            }

            // Fetch Courses
            const { data: courseData, error: courseError } = await supabase
                .from('courses')
                .select('id, title, thumbnail_url, description, difficulty, creator:creators(name)') // Assuming creator relation exists or will fail gracefully
                .eq('published', true)
                .limit(20);

            if (!courseError && courseData && courseData.length > 0) {
                const randomIndex = getDateSeededRandom(courseData.length);
                const selectedCourse = courseData[randomIndex];

                // Fetch lesson count separately if needed, or use a default/estimate
                // For now, let's hardcode or try to fetch
                const { count } = await supabase
                    .from('lessons')
                    .select('*', { count: 'exact', head: true })
                    .eq('course_id', selectedCourse.id);

                setCourse({
                    id: selectedCourse.id,
                    title: selectedCourse.title,
                    thumbnail_url: selectedCourse.thumbnail_url,
                    description: selectedCourse.description,
                    difficulty: selectedCourse.difficulty,
                    lesson_count: count || 8,
                    creator_name: (selectedCourse.creator as any)?.name || 'Unknown'
                });
            } else {
                console.log('Using fallback course due to error or no data');
                // Try to fallback with what we had before if exact query fails, but 'courses' table usually exists
                setCourse(fallbackCourse);
            }
        } catch (e) {
            console.error('Error in fetchDailyContent:', e);
            setRoutine(fallbackRoutine);
            setCourse(fallbackCourse);
        }
    };


    return (
        <section className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* 1. Header Section */}
                <div className="text-center mb-16">
                    <div className="inline-block mb-4">
                        <div className="bg-zinc-800/40 px-6 py-2 rounded-full inline-flex items-center gap-3 backdrop-blur-sm border border-zinc-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                            <span className="text-zinc-400 font-mono text-sm tracking-wider">
                                Next Refresh in: <span className="text-zinc-200">{timeLeft}</span>
                            </span>
                        </div>
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black text-zinc-50 mb-6 tracking-tight">
                        TODAY'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">FREE PASS</span>
                    </h2>

                    <p className="text-violet-300/80 text-xl font-medium max-w-2xl mx-auto">
                        매일 프리미엄 클래스와 루틴이 무료로 공개됩니다.
                    </p>
                </div>

                {/* 2. Daily Content Cards - 2 Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20 px-4">
                    {/* Class/Course Card */}
                    {course ? (
                        <div
                            onClick={() => navigate(`/courses/${course.id}`)}
                            className="group flex flex-row bg-zinc-900/30 border border-zinc-800/50 rounded-[32px] overflow-hidden h-[240px] cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                        >
                            {/* Left: Media Section (16:9 Aspect - Width 320px) */}
                            <div className="w-[320px] h-full relative overflow-hidden shrink-0">
                                <img
                                    src={course.thumbnail_url}
                                    alt={course.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-zinc-900/40" />
                            </div>

                            {/* Right: Content Section */}
                            <div className="flex-1 p-5 lg:p-6 flex flex-col justify-between relative pl-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-1 rounded-full bg-violet-500" />
                                        <span className="text-violet-400/80 text-[10px] font-black uppercase tracking-[0.2em]">Premium Class</span>
                                    </div>
                                    <h3 className="text-zinc-50 text-xl font-black tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                                        {course.title}
                                    </h3>
                                    <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">
                                        {course.description || "블랙벨트의 체계적인 커리큘럼으로 주짓수를 마스터하세요."}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                <Layers className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            <span className="text-[11px] font-bold text-zinc-400">{course.lesson_count || 0} Lessons</span>
                                        </div>
                                        {course.creator_name && (
                                            <div className="flex items-center gap-2 text-zinc-400">
                                                <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                    <BookOpen className="w-3 h-3 text-zinc-500" />
                                                </div>
                                                <span className="text-[11px] font-bold text-zinc-400">{course.creator_name}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <div className="flex items-center gap-2 text-zinc-100 text-[11px] font-black uppercase tracking-widest group/btn py-2 px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 hover:bg-violet-600 hover:border-violet-400 transition-all duration-300 whitespace-nowrap">
                                            <span>Check Class</span>
                                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-row bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] h-[240px] animate-pulse">
                            <div className="w-[320px] h-full bg-zinc-800/50" />
                            <div className="flex-1 p-5 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="h-4 w-20 bg-zinc-800/50 rounded-full" />
                                    <div className="h-6 w-full bg-zinc-800/50 rounded-lg" />
                                    <div className="h-10 w-full bg-zinc-800/50 rounded-lg" />
                                </div>
                                <div className="h-8 w-20 bg-zinc-800/50 ml-auto rounded-full" />
                            </div>
                        </div>
                    )}

                    {/* Routine Card */}
                    {routine ? (
                        <div
                            onClick={() => navigate(`/routines/${routine.id}`)}
                            className="group flex flex-row bg-zinc-900/30 border border-zinc-800/50 rounded-[32px] overflow-hidden h-[240px] cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                        >
                            {/* Left: Media Section (9:16 Aspect - Fixed Width 135px) */}
                            <div className="w-[135px] h-full relative overflow-hidden shrink-0">
                                <img
                                    src={routine.thumbnail_url}
                                    alt={routine.title}
                                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-zinc-900/40" />
                            </div>

                            {/* Right: Content Section */}
                            <div className="flex-1 p-5 lg:p-6 flex flex-col justify-between relative pl-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1 h-1 rounded-full bg-violet-500" />
                                        <span className="text-violet-400/80 text-[10px] font-black uppercase tracking-[0.2em]">Premium Routine</span>
                                    </div>
                                    <h3 className="text-zinc-50 text-xl font-black tracking-tight leading-tight mb-2 group-hover:text-violet-300 transition-colors line-clamp-1">
                                        {routine.title}
                                    </h3>
                                    <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">
                                        {routine.description || "이 루틴을 통해 기초부터 탄탄하게 주짓수 실력을 향상시키세요."}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                <Clock className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            <span className="text-[11px] font-bold text-zinc-400">{routine.total_duration_minutes || 10}m</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-zinc-400">
                                            <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                                                <BarChart3 className="w-3 h-3 text-zinc-500" />
                                            </div>
                                            <span className="text-[11px] font-bold text-zinc-400">{routine.difficulty || "Beginner"}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end">
                                        <div className="flex items-center gap-2 text-zinc-100 text-[11px] font-black uppercase tracking-widest group/btn py-2 px-4 rounded-full bg-zinc-800/30 border border-zinc-700/30 hover:bg-violet-600 hover:border-violet-400 transition-all duration-300 whitespace-nowrap">
                                            <span>Start</span>
                                            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-row bg-zinc-900/40 border border-zinc-800/50 rounded-[32px] h-[240px] animate-pulse">
                            <div className="w-[135px] h-full bg-zinc-800/50" />
                            <div className="flex-1 p-5 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="h-4 w-20 bg-zinc-800/50 rounded-full" />
                                    <div className="h-6 w-full bg-zinc-800/50 rounded-lg" />
                                    <div className="h-10 w-full bg-zinc-800/50 rounded-lg" />
                                </div>
                                <div className="h-8 w-20 bg-zinc-800/50 ml-auto rounded-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. CTA Button */}
                <div className="text-center">
                    <button
                        onClick={() => navigate('/courses')}
                        className="bg-violet-600 hover:bg-violet-500 text-white text-xl font-bold py-5 px-12 rounded-full shadow-[0_20px_40px_rgba(124,58,237,0.3)] transition-all hover:scale-105 active:scale-95"
                    >
                        모든 클래스 보기
                    </button>
                    <p className="mt-4 text-zinc-500 text-sm font-medium">
                        언제 어디서나 무제한으로 수련하세요.
                    </p>
                </div>
            </div>
        </section>
    );
};
