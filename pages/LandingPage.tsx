import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Play, Star, ChevronRight, Zap, Users, BookOpen, Clapperboard, Map, Trophy } from 'lucide-react';
import { InstructorCarousel } from '../components/InstructorCarousel';
import { FreeDrillShowcase } from '../components/FreeDrillShowcase';
import { RandomSparringShowcase } from '../components/RandomSparringShowcase';
import { ClassShowcase } from '../components/ClassShowcase';
import { getTestimonials, getPlatformStats, getRoutines, getPublicSparringVideos, getSparringVideos } from '../lib/api';
import { Testimonial } from '../types';

export const LandingPage: React.FC = () => {
    // Force redeploy check
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    // 로그인한 사용자는 /browse로 리다이렉트
    useEffect(() => {
        if (!loading && user) {
            navigate('/browse');
        }
    }, [user, loading, navigate]);

    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [stats, setStats] = useState({ totalUsers: 1000, totalCourses: 100, totalRoutines: 50, totalSparring: 20 });

    useEffect(() => {
        loadTestimonials();
        loadStats();
        // Prefetch data for faster page loads
        prefetchData();
    }, []);

    const prefetchData = async () => {
        // Prefetch minimal data for instant page loads
        // Landing page only needs 1 sparring video for showcase
        // Prefetch 3 routines and 3 sparring videos for their respective pages
        try {
            const [, routinesData, sparringFeedResult] = await Promise.all([
                getPublicSparringVideos(1),  // Landing page showcase - only 1 needed
                getRoutines().then(routines => routines.slice(0, 3)),  // Routines page - first 3
                getSparringVideos(3)  // Sparring feed - first 3
            ]);

            const sparringFeedData = sparringFeedResult.data || [];

            // Preload actual video files for instant playback
            const videosToPreload: string[] = [];

            // Add routine videos
            routinesData.forEach(routine => {
                if (routine.drills && routine.drills.length > 0) {
                    const firstDrill = routine.drills[0];
                    if (typeof firstDrill !== 'string' && firstDrill.videoUrl) {
                        videosToPreload.push(firstDrill.videoUrl);
                    }
                }
            });

            // Add sparring videos
            sparringFeedData.forEach((video: any) => {
                if (video.video_url) {
                    videosToPreload.push(video.video_url);
                }
            });

            // Create hidden video elements to trigger browser cache
            videosToPreload.slice(0, 6).forEach(videoUrl => {
                const video = document.createElement('video');
                video.src = videoUrl;
                video.preload = 'auto';
                video.style.display = 'none';
                document.body.appendChild(video);

                // Remove after 30 seconds to free memory
                setTimeout(() => {
                    document.body.removeChild(video);
                }, 30000);
            });
        } catch (error) {
            // Silent fail - prefetching is optional
            console.log('Prefetch completed');
        }
    };

    const loadTestimonials = async () => {
        const { data } = await getTestimonials();
        if (data && data.length > 0) {
            setTestimonials(data);
        } else {
            // Fallback to default testimonials
            setTestimonials([
                {
                    id: '1',
                    name: '김민수',
                    belt: 'Blue Belt',
                    comment: 'Marcus 인스트럭터의 가드 패스 강의 덕분에 3개월 만에 블루벨트를 땄습니다. 세계 챔피언한테 직접 배우는 느낌이 정말 좋아요!',
                    rating: 5,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: '박지영',
                    belt: 'Purple Belt',
                    comment: 'Ana 인스트럭터의 스파이더 가드 시리즈가 최고입니다. 실전에서 바로 써먹을 수 있는 디테일이 가득해요.',
                    rating: 5,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    name: '이준호',
                    belt: 'White Belt',
                    comment: '초보자도 쉽게 따라할 수 있어요. 7일 무료 체험으로 시작했는데 바로 1년 구독했습니다. 35% 할인 혜택도 좋았어요!',
                    rating: 5,
                    createdAt: new Date().toISOString()
                }
            ]);
        }
    };

    const loadStats = async () => {
        const platformStats = await getPlatformStats();
        setStats(platformStats);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // 로그인한 사용자에게는 아무것도 보여주지 않음 (리다이렉트 중)
    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden">
            {/* Navigation Header */}
            <header className="absolute top-0 left-0 right-0 z-50 px-4 md:px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => window.location.reload()}>
                        <img
                            src="/logo_v2_final.png"
                            alt="Grapplay"
                            className="h-10 md:h-14 w-auto object-contain"
                        />
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <Button
                            variant="ghost"
                            className="text-slate-300 hover:text-white hover:bg-white/10 text-sm px-3 md:px-4"
                            onClick={() => navigate('/login')}
                        >
                            로그인
                        </Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full px-4 md:px-6 text-sm md:text-base transition-colors"
                            onClick={() => navigate('/pricing')}
                        >
                            시작하기
                        </Button>
                    </div>
                </div>
            </header>

            {/* 1. Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20 md:pt-0">
                {/* Cosmic Background */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/hero_space.png"
                        alt="Cosmic Background"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black"></div>

                    {/* Animated Stars */}
                    <div className="absolute inset-0">
                        {[...Array(50)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full animate-pulse"
                                style={{
                                    top: `${Math.random() * 100}%`,
                                    left: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 3}s`,
                                    opacity: Math.random() * 0.7 + 0.3
                                }}
                            ></div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10 text-center px-4 max-w-5xl mx-auto py-12 md:py-20 mt-10 md:mt-0">
                    {/* Badge */}
                    <div className="inline-block px-4 py-2 mb-8 border border-blue-500/40 rounded-full bg-blue-500/10 backdrop-blur-md">
                        <span className="text-blue-300 text-sm font-semibold tracking-wider uppercase flex items-center gap-2">
                            <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                            The Ultimate BJJ Platform
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
                        매트를 지배하는 <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 animate-gradient">
                            기술의 정점
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                        세계적인 블랙벨트들과 함께, 당신의 BJJ를 성장시키세요. <br className="hidden md:block" />
                        체계적인 커리큘럼과 레벨업 시스템으로 블랙벨트를 향한 여정을 시작하세요.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto text-lg px-10 py-7 rounded-full shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all duration-300 hover:scale-105 bg-indigo-600 hover:bg-indigo-500 text-white"
                            onClick={() => navigate('/courses')}
                        >
                            <Play className="w-5 h-5 mr-2 fill-white" />
                            무료 영상으로 시작
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto text-lg px-10 py-7 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 transition-all"
                            onClick={() => navigate('/instructors')}
                        >
                            인스트럭터 보기
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <span>{stats.totalUsers.toLocaleString()}+ 수련생</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                            <span>{stats.totalCourses.toLocaleString()}+ 클래스</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-blue-400" />
                            <span>{stats.totalRoutines.toLocaleString()}+ 루틴</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clapperboard className="w-5 h-5 text-blue-400" />
                            <span>{stats.totalSparring.toLocaleString()}+ 스파링</span>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                    <ChevronRight className="w-6 h-6 text-slate-400 rotate-90" />
                </div>
            </section>

            {/* 2. Instructor Authority Section - Infinite Scroll Carousel */}
            <section id="instructors" className="py-16 md:py-32 bg-gradient-to-b from-black to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-5">
                    <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                        backgroundSize: '40px 40px'
                    }}></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    {/* Section Header */}
                    <div className="text-center mb-20">
                        <div className="inline-block px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full mb-6">
                            <span className="text-blue-300 text-sm font-bold uppercase tracking-wider">World Class Instructors</span>
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6">
                            세계 최고의 블랙벨트들이 <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                                직접 가르칩니다
                            </span>
                        </h2>
                        <p className="text-slate-400 text-xl max-w-3xl mx-auto leading-relaxed">
                            IBJJF, ADCC, Pan American 챔피언들의 검증된 기술을 배우세요
                        </p>
                    </div>

                    {/* Infinite Scroll Carousel */}
                    <InstructorCarousel />


                </div>
            </section>

            {/* 3. Sparring Showcase Section */}
            <RandomSparringShowcase />

            {/* 4. Class Showcase Section */}
            <ClassShowcase />

            {/* 5. Drill Video Showcase */}
            <section className="py-16 md:py-32 bg-slate-900 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            실전 <span className="text-blue-400">드릴 라이브러리</span>
                        </h2>
                        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
                            언제 어디서나 짧고 강력한 드릴 영상을 확인하세요
                        </p>
                    </div>

                    {/* Free Drill Grid */}
                    <FreeDrillShowcase />

                    <div className="text-center">
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white rounded-full px-8 transition-all"
                            onClick={() => navigate('/drills')}
                        >
                            더 많은 드릴 보기
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* 6. Arena System Promotion Section */}
            <section className="py-16 md:py-32 bg-slate-900 relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid_pattern.png')] opacity-10"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        {/* Text Content */}
                        <div className="flex-1 text-center lg:text-left">
                            <div className="inline-block px-4 py-2 mb-6 border border-purple-500/40 rounded-full bg-purple-500/10 backdrop-blur-md">
                                <span className="text-purple-300 text-sm font-semibold tracking-wider uppercase flex items-center gap-2 justify-center lg:justify-start">
                                    <Trophy className="w-4 h-4 text-purple-400" />
                                    Arena System
                                </span>
                            </div>

                            <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                                당신의 성장을 <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                                    게임처럼 즐기세요
                                </span>
                            </h2>

                            <p className="text-slate-300 text-lg md:text-xl mb-8 leading-relaxed break-keep">
                                수련일지, 훈련루틴, 테크닉로드맵, 스파링복기. <br className="hidden md:block" />
                                이 4가지 강력한 도구가 당신의 주짓수 성장을 <br className="md:hidden" />
                                체계적으로 돕습니다.
                            </p>

                            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                                    <BookOpen className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium text-sm">수련일지</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                                    <Zap className="w-4 h-4 text-yellow-400" />
                                    <span className="font-medium text-sm">훈련루틴</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                                    <Map className="w-4 h-4 text-green-400" />
                                    <span className="font-medium text-sm">테크닉로드맵</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-400 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
                                    <Clapperboard className="w-4 h-4 text-red-400" />
                                    <span className="font-medium text-sm">스파링복기</span>
                                </div>
                            </div>

                            <div className="mt-10">
                                <Button
                                    size="lg"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-6 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-lg shadow-indigo-500/20"
                                    onClick={() => navigate('/pricing')}
                                >
                                    아레나 입장하기
                                </Button>
                            </div>
                        </div>

                        {/* Image Content */}
                        <div className="flex-1 relative">
                            <div className="relative rounded-3xl overflow-hidden border border-slate-700/50 shadow-2xl shadow-purple-500/20 group">
                                <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-blue-500/10 group-hover:opacity-0 transition-opacity duration-500"></div>
                                <img
                                    src="/arena_mockup.png"
                                    alt="Arena Dashboard Interface"
                                    className="w-full h-auto transform transition-transform duration-700 group-hover:scale-105"
                                />

                                {/* Floating Badges */}
                                <div className="absolute -bottom-6 -right-6 bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                                            <Trophy className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400 font-bold uppercase">현재 랭크</p>
                                            <p className="text-white font-black">다이아몬드 리그</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 7. Social Proof Section */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            수련생들의 <span className="text-blue-400">생생한 후기</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map((review, i) => (
                            <div key={i} className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-slate-700/50 p-8 hover:border-blue-500/30 transition-all">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(review.rating)].map((_, j) => (
                                        <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    ))}
                                </div>
                                <p className="text-slate-300 mb-6 leading-relaxed">"{review.comment}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                                        <span className="text-white font-bold text-sm">{review.name[0]}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white">{review.name}</p>
                                        <p className="text-sm text-slate-400">{review.belt}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. Final CTA Section */}
            <section className="py-20 md:py-40 bg-gradient-to-b from-black to-slate-900 relative overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src="/cta_space.png"
                        alt="CTA Background"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
                </div>

                <div className="absolute inset-0">
                    {[...Array(30)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                opacity: Math.random() * 0.5 + 0.2
                            }}
                        ></div>
                    ))}
                </div>

                <div className="max-w-5xl mx-auto px-4 text-center relative z-10">


                    <h2 className="text-4xl md:text-7xl font-black mb-8 tracking-tight leading-tight">
                        지금 바로 <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                            시작하세요
                        </span>
                    </h2>

                    <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                        무료 영상으로 시작하세요. <br />
                        세계적인 블랙벨트들과 함께하는 당신의 주짓수 여정
                    </p>

                    <Button
                        size="lg"
                        className="text-xl px-16 py-8 rounded-full shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all duration-300 bg-indigo-600 hover:bg-indigo-500 text-white"
                        onClick={() => navigate('/courses')}
                    >
                        <Play className="w-6 h-6 mr-3 fill-white" />
                        무료 영상으로 시작
                    </Button>

                    <p className="mt-8 text-sm text-slate-500">
                        신용카드 정보 입력 없이 시작할 수 있습니다.
                    </p>

                    <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>무료 영상 제공</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>카드 등록 불필요</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>언제든 취소 가능</span>
                        </div>
                    </div>
                </div>
            </section>

            <style>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    );
};
