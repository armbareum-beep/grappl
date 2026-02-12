import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import {
    Play
} from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { Lesson, SparringVideo } from '../types';
import { UserDashboard } from '../components/home/UserDashboard';
import { ContentRow } from '../components/home/ContentRow';
import { useHomeQueries } from '../hooks/use-home-queries';
import { useVideoPreloadSafe } from '../contexts/VideoPreloadContext';
import { getOptimizedThumbnail } from '../lib/utils';

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Data fetching using React Query hook
    const {
        dailyDrill,
        dailyLesson,
        dailySparring,
        continueItems,
        trendingSparring,
        featuredRoutines,
        trendingCourses,
        newCourses,
        newRoutines,
        newSparring,
        isLoading: loading // Aliased to loading to match existing code
    } = useHomeQueries(user?.id);

    // Preload first drill video for instant playback when navigating to /drills
    const videoPreload = useVideoPreloadSafe();
    useEffect(() => {
        if (!videoPreload || !dailyDrill) return;

        // Preload the daily drill video so it's ready when user clicks "훈련 시작"
        const url = dailyDrill.vimeoUrl || dailyDrill.videoUrl;
        if (url) {
            console.log('[Home] Preloading daily drill:', dailyDrill.id);
            videoPreload.startPreload({
                id: dailyDrill.id,
                vimeoUrl: dailyDrill.vimeoUrl,
                videoUrl: dailyDrill.videoUrl,
            });
        }
    }, [dailyDrill, videoPreload]);

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

    const getDisplayName = () => {
        if (!user) return '친구';
        return user.user_metadata?.full_name || user.email?.split('@')[0] || '친구';
    };

    const userAvatar = user?.profile_image_url || user?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    const displayName = getDisplayName();

    const getCarouselAspect = () => {
        // Standardize aspect ratio by screen size to prevent height jumps
        // Mobile: 3:4 | Tablet (md): 1:1 | Desktop (lg): 4:3
        return 'aspect-[3/4] md:aspect-square lg:aspect-[4/3] w-full max-w-6xl';
    };

    const slides = useMemo(() => [
        dailyLesson && { type: 'lesson', data: dailyLesson },
        dailyDrill && { type: 'drill', data: dailyDrill },
        dailySparring && { type: 'sparring', data: dailySparring }
    ].filter(Boolean), [dailyLesson, dailyDrill, dailySparring]);

    // Only show loading screen if we are loading AND have no content yet
    if (loading && slides.length === 0 && trendingCourses.length === 0) {
        return (
            <div className="min-h-screen bg-black text-white p-4 md:p-12 animate-pulse">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-12">
                    <div className="h-12 w-64 bg-zinc-800 rounded-lg" />
                    <div className="w-12 h-12 rounded-full bg-zinc-800" />
                </div>

                {/* Hero Carousel Skeleton */}
                <div className="w-full aspect-[3/4] md:aspect-square lg:aspect-[4/3] max-w-6xl mx-auto bg-zinc-900 rounded-[32px] mb-16 border border-zinc-800/50" />

                {/* Rows Skeleton */}
                {[1, 2, 3].map((i) => (
                    <div key={i} className="mb-12">
                        <div className="h-8 w-48 bg-zinc-800 rounded mb-6" />
                        <div className="flex gap-4 overflow-hidden">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-40 w-72 bg-zinc-900 rounded-xl flex-shrink-0" />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

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
                                                <div className="relative w-full h-full overflow-hidden">
                                                    {/* Full-bleed Background Thumbnail */}
                                                    {drill.thumbnailUrl ? (
                                                        <img
                                                            src={getOptimizedThumbnail(drill.thumbnailUrl, idx === 0 ? 'large' : 'medium')}
                                                            className="absolute inset-0 !w-full !h-full !max-w-none !max-h-none object-cover !scale-[1.21] transition-transform duration-500"
                                                            alt={drill.title}
                                                            fetchPriority={idx === 0 ? "high" : "low"}
                                                            loading={idx === 0 ? "eager" : "lazy"}
                                                            decoding={idx === 0 ? "sync" : "async"}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-900" />
                                                    )}

                                                    {/* Cinematic Gradient Overlays */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

                                                    {/* Cinematic Left-aligned Content */}
                                                    <div className={`absolute inset-x-0 bottom-0 pb-12 px-8 md:px-16 flex flex-col items-start gap-8 z-10 transition-all duration-1000 ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                                        <div className="flex flex-col items-start gap-6 max-w-3xl">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 bg-violet-600 text-white text-[10px] md:text-xs font-black rounded-sm uppercase tracking-widest italic shadow-lg shadow-violet-900/40">데일리 드릴</span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                                            </div>

                                                            <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-2xl uppercase italic break-words">
                                                                {drill.title}
                                                            </h2>

                                                            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider backdrop-blur-md bg-white/5 p-2 rounded-lg border border-white/5">
                                                                <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                                                                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-zinc-800 border-2 border-white/10 flex-shrink-0 shadow-xl">
                                                                        {drill.creatorProfileImage ? (
                                                                            <img src={drill.creatorProfileImage} className="w-full h-full object-cover" alt={`${drill.creatorName || '크리에이터'} 프로필`} />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{drill.creatorName?.charAt(0) || 'U'}</div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-white">{drill.creatorName || 'Grapplay Team'}</span>
                                                                </div>
                                                                <span className="text-zinc-400">{drill.category || 'Fundamentals'}</span>
                                                            </div>
                                                        </div>

                                                        <button onClick={() => navigate(`/drills?id=${drill.id}`)} className="bg-white text-black font-black rounded-full px-14 py-5 h-16 hover:bg-violet-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 text-xl tracking-tight group/btn">
                                                            <Play className="w-6 h-6 fill-current" /> 훈련 시작 <span className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">🥋</span>
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
                                                        <img
                                                            src={getOptimizedThumbnail(lesson.thumbnailUrl, idx === 0 ? 'large' : 'medium')}
                                                            className="absolute inset-0 w-full h-full object-cover"
                                                            alt={lesson.title}
                                                            fetchPriority={idx === 0 ? "high" : "low"}
                                                            loading={idx === 0 ? "eager" : "lazy"}
                                                            decoding={idx === 0 ? "sync" : "async"}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-900" />
                                                    )}

                                                    {/* Cinematic Gradient Overlays */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

                                                    {/* Cinematic Left-aligned Content */}
                                                    <div className={`absolute inset-x-0 bottom-0 pb-12 px-8 md:px-16 flex flex-col items-start gap-8 z-10 transition-all duration-1000 ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                                        <div className="flex flex-col items-start gap-6 max-w-4xl">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 bg-violet-600 text-white text-[10px] md:text-xs font-black rounded-sm uppercase tracking-widest italic shadow-lg shadow-violet-900/40">데일리 레슨</span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                                            </div>

                                                            <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-2xl uppercase italic break-words">
                                                                {lesson.title}
                                                            </h2>

                                                            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider backdrop-blur-md bg-white/5 p-2 rounded-lg border border-white/5">
                                                                <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                                                                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-zinc-800 border-2 border-white/10 flex-shrink-0 shadow-xl">
                                                                        {(lesson as any).creatorProfileImage ? (
                                                                            <img src={(lesson as any).creatorProfileImage} className="w-full h-full object-cover" alt={`${(lesson as any).creatorName || '크리에이터'} 프로필`} />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{(lesson as any).creatorName?.charAt(0) || 'U'}</div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-white">{(lesson as any).creatorName || 'Grapplay Team'}</span>
                                                                </div>
                                                                <span className="text-zinc-400">{lesson.courseTitle || 'Exclusive Course'}</span>
                                                            </div>
                                                        </div>

                                                        <button onClick={() => navigate(`/lessons/${lesson.id}`)} className="bg-white text-black font-black rounded-full px-14 py-5 h-16 hover:bg-violet-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 text-xl tracking-tight group/btn">
                                                            <Play className="w-6 h-6 fill-current" /> 레슨 보기 <span className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">🥋</span>
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
                                                        <img
                                                            src={getOptimizedThumbnail(sparring.thumbnailUrl, idx === 0 ? 'large' : 'medium')}
                                                            className="absolute inset-0 w-full h-full object-cover"
                                                            alt={sparring.title}
                                                            fetchPriority={idx === 0 ? "high" : "low"}
                                                            loading={idx === 0 ? "eager" : "lazy"}
                                                            decoding={idx === 0 ? "sync" : "async"}
                                                        />
                                                    ) : (
                                                        <div className="absolute inset-0 bg-zinc-900" />
                                                    )}

                                                    {/* Cinematic Gradient Overlays */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent hidden md:block" />

                                                    {/* Cinematic Left-aligned Content */}
                                                    <div className={`absolute inset-x-0 bottom-0 pb-12 px-8 md:px-16 flex flex-col items-start gap-8 z-10 transition-all duration-1000 ${idx === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-12'}`}>
                                                        <div className="flex flex-col items-start gap-6 max-w-4xl">
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 bg-violet-600 text-white text-[10px] md:text-xs font-black rounded-sm uppercase tracking-widest italic shadow-lg shadow-violet-900/40">데일리 스파링</span>
                                                                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                                                            </div>

                                                            <h2 className="text-white text-3xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-2xl uppercase italic break-words">
                                                                {sparring.title}
                                                            </h2>

                                                            <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-300 font-bold uppercase tracking-wider backdrop-blur-md bg-white/5 p-2 rounded-lg border border-white/5">
                                                                <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                                                                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-full overflow-hidden bg-zinc-800 border-2 border-white/10 flex-shrink-0 shadow-xl">
                                                                        {sparring.creator?.profileImage ? (
                                                                            <img src={sparring.creator.profileImage} className="w-full h-full object-cover" alt={`${sparring.creator?.name || '크리에이터'} 프로필`} />
                                                                        ) : (
                                                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">{sparring.creator?.name?.charAt(0) || 'U'}</div>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-white">{typeof sparring.creator?.name === 'string' ? sparring.creator.name : 'Unknown Grappler'}</span>
                                                                </div>
                                                                <span className="text-zinc-400">{sparring.category || 'Sparring Session'}</span>
                                                            </div>
                                                        </div>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (sparring.id && sparring.id !== 'undefined') {
                                                                    navigate(`/sparring/${sparring.id}`);
                                                                }
                                                            }}
                                                            className="bg-white text-black font-black rounded-full px-14 py-5 h-16 hover:bg-violet-500 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-center gap-3 text-xl tracking-tight group/btn">
                                                            <Play className="w-6 h-6 fill-current" /> 스파링 보기 <span className="opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all">🥋</span>
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
                    <div className="bg-zinc-900/40 border border-zinc-800 p-12 rounded-[32px] text-center flex flex-col items-center gap-4">
                        {loading ? (
                            <>
                                <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                <p className="text-zinc-500 font-medium">오늘의 추천 콘텐츠를 불러오는 중입니다...</p>
                            </>
                        ) : (
                            <>
                                <p className="text-zinc-400 font-bold text-lg">추천 콘텐츠가 없습니다.</p>
                                <p className="text-zinc-500 text-sm">잠시 후 다시 시도해보세요.</p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="mt-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm font-bold transition-colors"
                                >
                                    새로고침
                                </button>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* 2. User Dashboard (Consolidated) */}
            < UserDashboard
                continueItems={continueItems}
            />

            {/* 5-10. Netflix Style Content Rows (6 Rows) */}
            < div className="pb-20" >

                {/* 1. Popular Courses (Standard - No Numbers) */}
                {
                    trendingCourses.length > 0 && (
                        <ContentRow
                            title="오늘의 TOP 10 클래스"
                            items={trendingCourses}
                            type="course"
                            variant="standard"
                            basePath="/courses"
                        />
                    )
                }

                {/* 2. New Courses (Standard) */}
                {
                    newCourses.length > 0 && (
                        <ContentRow
                            title="새로 올라온 클래스"
                            items={newCourses}
                            type="course"
                            variant="standard"
                            basePath="/courses"
                        />
                    )
                }

                {/* 3. Popular Routines (Ranking - Keep Numbers, 9:16) */}
                {
                    featuredRoutines.length > 0 && (
                        <ContentRow
                            title="인기 급상승 루틴"
                            items={featuredRoutines}
                            type="routine"
                            variant="ranking"
                            basePath="/routines"
                        />
                    )
                }

                {/* 4. New Routines (Standard - 9:16) */}
                {
                    newRoutines.length > 0 && (
                        <ContentRow
                            title="따끈따끈한 신규 루틴"
                            items={newRoutines}
                            type="routine"
                            variant="standard"
                            basePath="/routines"
                        />
                    )
                }

                {/* 5. Popular Sparring (Standard - No Numbers, 1:1) */}
                {
                    trendingSparring.length > 0 && (
                        <ContentRow
                            title="많이 보는 스파링"
                            items={trendingSparring}
                            type="sparring"
                            variant="standard"
                            basePath="/sparring"
                        />
                    )
                }

                {/* 6. New Sparring (Standard) */}
                {
                    newSparring.length > 0 && (
                        <ContentRow
                            title="최신 스파링 영상"
                            items={newSparring}
                            type="sparring"
                            variant="standard"
                            basePath="/sparring"
                        />
                    )
                }

            </div >

        </div >
    );
};
