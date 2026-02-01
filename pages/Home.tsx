import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import {
    Play
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import {
    getRecentActivity, getDailyFreeDrill, getDailyFreeLesson,
    getPublicSparringVideos, getFeaturedRoutines, getNewCourses,
    fetchRoutines, getTrendingCourses,
    getDailyFreeSparring
} from '../lib/api';
import { Lesson, DrillRoutine, SparringVideo, Course } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { UserDashboard } from '../components/home/UserDashboard';
import { ContentRow } from '../components/home/ContentRow';

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Data states
    const [dailyDrill, setDailyDrill] = useState<any | null>(null);
    const [dailyLesson, setDailyLesson] = useState<Lesson | null>(null);
    const [dailySparring, setDailySparring] = useState<SparringVideo | null>(null);

    // New Layout States
    const [continueItems, setContinueItems] = useState<any[]>([]);
    const [trendingSparring, setTrendingSparring] = useState<SparringVideo[]>([]);
    const [featuredRoutines, setFeaturedRoutines] = useState<DrillRoutine[]>([]);
    const [trendingCourses, setTrendingCourses] = useState<Course[]>([]);

    // Tab Section Data
    const [newCourses, setNewCourses] = useState<Course[]>([]);
    const [newRoutines, setNewRoutines] = useState<DrillRoutine[]>([]);
    const [newSparring, setNewSparring] = useState<SparringVideo[]>([]);

    const [currentSlide, setCurrentSlide] = useState(0);

    const [emblaRef, emblaApi] = useEmblaCarousel({
        loop: true,
        align: 'center',
        containScroll: 'trimSnaps'
    });

    useEffect(() => {
        if (!emblaApi) return;
        const onSelect = () => {
            setCurrentSlide(emblaApi.selectedScrollSnap());
        };
        emblaApi.on('select', onSelect);
        return () => { emblaApi.off('select', onSelect); };
    }, [emblaApi]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Initial Data Fetching for Carousel
                const [drillRes, lessonRes, sparringRes] = await Promise.all([
                    getDailyFreeDrill(),
                    getDailyFreeLesson(),
                    getDailyFreeSparring()
                ]);

                setDailyDrill(drillRes.data);
                setDailyLesson(lessonRes.data);
                setDailySparring(sparringRes.data);

                // 2. DashBoard Data (If logged in)
                if (user) {
                    // A. Continue Items
                    try {
                        const activity = await getRecentActivity(user.id);
                        if (activity && activity.length > 0) {
                            setContinueItems(activity);
                        }
                    } catch (e) {
                        console.error("Error fetching activity", e);
                    }

                    // B. Trending Sparring
                    try {
                        const sparring = await getPublicSparringVideos(10, user.id);
                        if (sparring && sparring.length > 0) {
                            setTrendingSparring(sparring);
                        }
                    } catch (e) {
                        console.error("Error fetching trending sparring", e);
                    }

                    // C. Featured Routines
                    try {
                        const routines = await getFeaturedRoutines(20, user.id);
                        if (routines && routines.length > 0) {
                            setFeaturedRoutines(routines);
                        }
                    } catch (e) {
                        console.error("Error fetching routines", e);
                    }

                    // D. Trending Courses
                    try {
                        const courses = await getTrendingCourses(10, user.id);
                        if (courses && courses.length > 0) {
                            setTrendingCourses(courses);
                        }
                    } catch (e) {
                        console.error("Error fetching trending courses", e);
                    }
                }

                // --- Tab Content Data ---

                // F. New Courses (For Tab)
                try {
                    const courses = await getNewCourses(10, user?.id);
                    if (courses && courses.length > 0) {
                        setNewCourses(courses);
                    }
                } catch (e) {
                    console.error("Error fetching new courses for tab", e);
                }

                // G. New Routines (For Tab)
                try {
                    const routinesRes = await fetchRoutines(20, user?.id);
                    if (routinesRes.data && routinesRes.data.length > 0) {
                        setNewRoutines(routinesRes.data);
                    }
                } catch (e) {
                    console.error("Error fetching new routines", e);
                }

                // H. New Sparring (For Tab)
                try {
                    const sparringRes = await getPublicSparringVideos(20, user?.id);
                    if (sparringRes && sparringRes.length > 0) {
                        setNewSparring(sparringRes);
                    }
                } catch (e) {
                    console.error("Error fetching new sparring", e);
                }

            } catch (error) {
                console.error("Error loading home data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    const getDisplayName = () => {
        if (!user) return '친구';
        return user.user_metadata?.full_name || user.email?.split('@')[0] || '친구';
    };

    const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const displayName = getDisplayName();

    const getCarouselAspect = () => {
        // Standardize aspect ratio by screen size to prevent height jumps
        // Mobile: 3:4 | Tablet (md): 1:1 | Desktop (lg): 4:3
        return 'aspect-[3/4] md:aspect-square lg:aspect-[4/3] w-full max-w-6xl';
    };

    const slides = [
        dailyLesson && { type: 'lesson', data: dailyLesson },
        dailyDrill && { type: 'drill', data: dailyDrill },
        dailySparring && { type: 'sparring', data: dailySparring }
    ].filter(Boolean);

    if (loading) return <LoadingScreen />;

    return (
        <div className="min-h-screen bg-black text-white selection:bg-violet-500/30">
            {/* 1. Dynamic Hero Carousel (Netflix Mobile Style) */}
            <section className="relative pt-6 md:pt-10 px-4 md:px-12 mb-12">
                {/* Profile/Header Area Overlaid or Above */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                        <h1 className="text-3xl md:text-5xl font-black tracking-tighter italic uppercase flex items-center gap-1">
                            <span>안녕하세요,</span>
                            <span className="text-violet-500">{displayName}</span>
                            <span>님.</span>
                        </h1>
                        <p className="text-zinc-500 text-[10px] md:text-sm font-bold uppercase tracking-widest mt-1">
                            오늘도 그래플레이와 함께 성장하세요 🥋
                        </p>
                    </div>
                    <div onClick={() => navigate('/settings')} className="w-11 h-11 rounded-full border-2 border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer hover:border-violet-500 transition-all shadow-lg group">
                        {userAvatar ? (
                            <img src={userAvatar} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-800 group-hover:bg-zinc-700 group-hover:text-violet-400 transition-colors">
                                {displayName[0].toUpperCase()}
                            </div>
                        )}
                    </div>
                </div>

                {slides.length > 0 ? (
                    <>
                        <div className={`relative group overflow-hidden rounded-[32px] shadow-2xl shadow-black/50 border border-white/5 transition-all duration-700 ease-in-out md:max-h-[600px] mx-auto w-full cursor-grab active:cursor-grabbing ${getCarouselAspect()}`} ref={emblaRef}>
                            <div className="flex h-full">
                                {slides.map((slide, idx) => {
                                    if (!slide || !slide.data) return null;

                                    if (slide.type === 'drill') {
                                        const drill = slide.data;
                                        return (
                                            <div key={`slide-drill-${idx}`} className="relative flex-[0_0_100%] min-w-0 h-full">
                                                <div className="relative w-full h-full">
                                                    {/* Full-bleed Background Thumbnail */}
                                                    {drill.thumbnailUrl ? (
                                                        <img src={drill.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" alt={drill.title} />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-900" />
                                                    )}

                                                    {/* Cinematic Gradient Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                                    {/* Centered Bottom Content */}
                                                    <div className={`absolute inset-x-0 bottom-0 pb-12 px-6 flex flex-col items-center text-center gap-6 z-10 transition-all duration-700 ${idx === currentSlide ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
                                                        <div className="flex flex-col items-center gap-4">
                                                            <span className="px-3 py-1 bg-white/10 text-white text-[10px] md:text-xs font-bold rounded-full border border-white/20 backdrop-blur-xl uppercase tracking-widest italic">데일리 드릴</span>
                                                            <h2 className="text-white text-4xl md:text-7xl font-black tracking-tighter leading-none drop-shadow-2xl uppercase italic max-w-2xl">
                                                                {typeof drill.title === 'string' ? drill.title : 'Drill'}
                                                            </h2>
                                                            <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider">
                                                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">{drill.category || 'Fundamentals'}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                                                                        {drill.creatorProfileImage ? (
                                                                            <img src={drill.creatorProfileImage} className="w-full h-full object-cover" alt="" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500 font-bold">{drill.creatorName?.charAt(0) || 'U'}</div>
                                                                        )}
                                                                    </div>
                                                                    <span>{drill.creatorName || 'Grapplay Team'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button onClick={() => navigate(`/drills/${drill.id}`)} className="bg-white text-black font-black rounded-full px-12 py-4 h-14 hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2.5 text-lg tracking-tight">
                                                            <Play className="w-5 h-5 fill-current" /> 훈련 시작
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (slide.type === 'lesson') {
                                        const lesson = slide.data as Lesson;
                                        if (!lesson) return null;
                                        return (
                                            <div key={`slide-lesson-${idx}`} className="relative flex-[0_0_100%] min-w-0 h-full">
                                                <div className="relative w-full h-full">
                                                    {/* Full-bleed Background Thumbnail */}
                                                    {lesson.thumbnailUrl ? (
                                                        <img src={lesson.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" alt={lesson.title} />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-900" />
                                                    )}

                                                    {/* Cinematic Gradient Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                                    {/* Centered Bottom Content */}
                                                    <div className={`absolute inset-x-0 bottom-0 pb-12 px-6 flex flex-col items-center text-center gap-6 z-10 transition-all duration-700 ${idx === currentSlide ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
                                                        <div className="flex flex-col items-center gap-4">
                                                            <span className="px-3 py-1 bg-white/10 text-white text-[10px] md:text-xs font-bold rounded-full border border-white/20 backdrop-blur-xl uppercase tracking-widest italic">데일리 레슨</span>
                                                            <h2 className="text-white text-4xl md:text-7xl font-black tracking-tighter leading-none drop-shadow-2xl uppercase italic max-w-4xl">
                                                                {typeof lesson.title === 'string' ? lesson.title : 'Lesson'}
                                                            </h2>
                                                            <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider">
                                                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">{lesson.courseTitle || 'Exclusive Course'}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                                                                        {lesson.creatorProfileImage ? (
                                                                            <img src={lesson.creatorProfileImage} className="w-full h-full object-cover" alt="" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500 font-bold">{lesson.creatorName?.charAt(0) || 'U'}</div>
                                                                        )}
                                                                    </div>
                                                                    <span>{lesson.creatorName || 'Grapplay Team'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/lessons/${lesson.id}`);
                                                            }}
                                                            className="bg-white text-black font-black rounded-full px-12 py-4 h-14 hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2.5 text-lg tracking-tight">
                                                            <Play className="w-5 h-5 fill-current" /> 클래스 보기
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    } else if (slide.type === 'sparring') {
                                        const sparring = slide.data as SparringVideo;
                                        if (!sparring) return null;
                                        return (
                                            <div key={`slide-sparring-${idx}`} className="relative flex-[0_0_100%] min-w-0 h-full">
                                                <div className="relative w-full h-full">
                                                    {/* Full-bleed Background Thumbnail */}
                                                    {sparring.thumbnailUrl ? (
                                                        <img src={sparring.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover" alt={sparring.title} />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-900" />
                                                    )}

                                                    {/* Cinematic Gradient Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

                                                    {/* Centered Bottom Content */}
                                                    <div className={`absolute inset-x-0 bottom-0 pb-12 px-6 flex flex-col items-center text-center gap-6 z-10 transition-all duration-700 ${idx === currentSlide ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}>
                                                        <div className="flex flex-col items-center gap-4">
                                                            <span className="px-3 py-1 bg-white/10 text-white text-[10px] md:text-xs font-bold rounded-full border border-white/20 backdrop-blur-xl uppercase tracking-widest italic">데일리 스파링</span>
                                                            <h2 className="text-white text-4xl md:text-7xl font-black tracking-tighter leading-none drop-shadow-2xl uppercase italic max-w-4xl">
                                                                {typeof sparring.title === 'string' ? sparring.title : 'Sparring Session'}
                                                            </h2>
                                                            <div className="flex items-center gap-3 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider">
                                                                <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded">{sparring.category || 'Sparring'}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-5 h-5 md:w-6 md:h-6 rounded-full overflow-hidden bg-zinc-800 border border-white/10 flex-shrink-0">
                                                                        {(sparring.creator as any)?.avatar_url || (sparring.creator as any)?.profileImage ? (
                                                                            <img src={(sparring.creator as any)?.avatar_url || (sparring.creator as any)?.profileImage} className="w-full h-full object-cover" alt="" />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500 font-bold">{(sparring.creator?.name as string)?.charAt(0) || 'U'}</div>
                                                                        )}
                                                                    </div>
                                                                    <span>{typeof sparring.creator?.name === 'string' ? sparring.creator.name : 'Unknown Grappler'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (sparring.id && sparring.id !== 'undefined') {
                                                                    navigate(`/sparring/${sparring.id}`);
                                                                }
                                                            }}
                                                            className="bg-white text-black font-black rounded-full px-12 py-4 h-14 hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.3)] flex items-center justify-center gap-2.5 text-lg tracking-tight">
                                                            <Play className="w-5 h-5 fill-current" /> 스파링 보기
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>

                            {/* Navigation Indicators */}
                            <div className="absolute bottom-6 right-12 z-20 flex gap-2">
                                {slides.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            emblaApi?.scrollTo(idx);
                                        }}
                                        className={`group relative flex items-center gap-2 transition-all duration-300 outline-none ${idx === currentSlide ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                                    >
                                        <div className={`h-1.5 rounded-full shadow-sm transition-all duration-500 ease-out ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/70'}`} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="bg-zinc-900/40 border border-zinc-800 p-12 rounded-[32px] text-center">
                        <p className="text-zinc-500 font-medium">오늘의 추천 콘텐츠를 불러오는 중입니다...</p>
                    </div>
                )}
            </section>

            {/* 2. User Dashboard (Consolidated) */}
            <UserDashboard
                continueItems={continueItems}
            />

            {/* 5-10. Netflix Style Content Rows (6 Rows) */}
            <div className="pb-20 mt-10 space-y-4">

                {/* 1. Popular Courses (Standard - No Numbers) */}
                {trendingCourses.length > 0 && (
                    <ContentRow
                        title="오늘의 TOP 10 클래스"
                        items={trendingCourses}
                        type="course"
                        variant="standard"
                        basePath="/courses"
                    />
                )}

                {/* 2. New Courses (Standard) */}
                {newCourses.length > 0 && (
                    <ContentRow
                        title="새로 올라온 클래스"
                        items={newCourses}
                        type="course"
                        variant="standard"
                        basePath="/courses"
                    />
                )}

                {/* 3. Popular Routines (Ranking - Keep Numbers, 9:16) */}
                {featuredRoutines.length > 0 && (
                    <ContentRow
                        title="인기 급상승 루틴"
                        items={featuredRoutines}
                        type="routine"
                        variant="ranking"
                        basePath="/routines"
                    />
                )}

                {/* 4. New Routines (Standard - 9:16) */}
                {newRoutines.length > 0 && (
                    <ContentRow
                        title="따끈따끈한 신규 루틴"
                        items={newRoutines}
                        type="routine"
                        variant="standard"
                        basePath="/routines"
                    />
                )}

                {/* 5. Popular Sparring (Standard - No Numbers, 1:1) */}
                {trendingSparring.length > 0 && (
                    <ContentRow
                        title="많이 보는 스파링"
                        items={trendingSparring}
                        type="sparring"
                        variant="standard"
                        basePath="/watch?type=sparring"
                    />
                )}

                {/* 6. New Sparring (Standard) */}
                {newSparring.length > 0 && (
                    <ContentRow
                        title="최신 스파링 영상"
                        items={newSparring}
                        type="sparring"
                        variant="standard"
                        basePath="/watch?type=sparring"
                    />
                )}

            </div>

        </div>
    );
};
