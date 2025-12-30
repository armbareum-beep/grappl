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
                    <div className="mt-16 flex flex-wrap justify-center gap-4 md:gap-8 text-xs md:text-sm text-slate-400">
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <Users className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{stats.totalUsers.toLocaleString()}+ 수련생</span>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{stats.totalCourses.toLocaleString()}+ 클래스</span>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <Zap className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{stats.totalRoutines.toLocaleString()}+ 루틴</span>
                        </div>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                            <Clapperboard className="w-4 h-4 md:w-5 md:h-5 text-blue-400 flex-shrink-0" />
                            <span className="truncate">{stats.totalSparring.toLocaleString()}+ 스파링</span>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <button
                    onClick={() => {
                        const nextSection = document.getElementById('instructors');
                        if (nextSection) {
                            nextSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce cursor-pointer hover:scale-110 transition-transform"
                >
                    <ChevronRight className="w-6 h-6 text-slate-400 rotate-90" />
                </button>
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
                            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 text-slate-300 hover:text-white px-8 py-6 rounded-full transition-all duration-300 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] hover:-translate-y-1 group backdrop-blur-sm"
                            onClick={() => navigate('/drills')}
                        >
                            더 많은 드릴 보기
                            <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1 text-slate-500 group-hover:text-white" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* 6. Arena System Promotion Section */}
            <section className="py-16 md:py-32 bg-[#050505] relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Very subtle purple tint for cohesion */}
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/5 via-transparent to-black"></div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid_pattern.png')] opacity-[0.03]"></div>
                    {/* Floating Orbs - Adjusted colors */}
                    <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[100px]"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    {/* Section Header */}
                    <div className="text-center mb-16 md:mb-24">
                        <div className="inline-block px-3 py-1 mb-6 border border-indigo-500/30 rounded-lg bg-indigo-500/5 backdrop-blur-md">
                            <span className="text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2 justify-center">
                                <Trophy className="w-3 h-3" />
                                ARENA SYSTEM
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black mb-6 tracking-tight leading-[0.9]">
                            LEVEL UP <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                                YOUR JIU-JITSU
                            </span>
                        </h2>

                        <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                            성장을 위한 3가지 코어 시스템
                        </p>
                    </div>

                    {/* 3 Feature Cards */}
                    <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16" id="arena-cards">
                        {/* Card 1: 수련일지 */}
                        <div className="group relative bg-[#0A0A0A] rounded-3xl p-8 border border-white/5 hover:border-blue-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                            {/* Hover Gradient Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 to-blue-500/0 group-hover:to-blue-500/10 transition-all duration-500"></div>

                            {/* Watermark Number */}
                            <div className="absolute -right-4 -top-4 text-[120px] font-black text-white/[0.02] group-hover:text-blue-500/[0.05] transition-colors leading-none select-none">
                                01
                            </div>

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]">
                                    <BookOpen className="w-7 h-7" />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">수련일지</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 h-[40px]">
                                    AI 분석과 함께 훈련과 스파링을<br />데이터로 기록하고 추적하세요.
                                </p>

                                <ul className="space-y-3">
                                    {[
                                        '훈련/스파링 데이터 기록',
                                        'AI 코치 퍼포먼스 분석',
                                        '성장 그래프 시각화'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 group-hover:shadow-[0_0_8px_rgba(59,130,246,0.8)] transition-all"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Card 2: 훈련루틴 */}
                        <div className="group relative bg-[#0A0A0A] rounded-3xl p-8 border border-white/5 hover:border-amber-500/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                            {/* Hover Gradient Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/0 to-amber-500/0 group-hover:to-amber-500/10 transition-all duration-500"></div>

                            {/* Watermark Number */}
                            <div className="absolute -right-4 -top-4 text-[120px] font-black text-white/[0.02] group-hover:text-amber-500/[0.05] transition-colors leading-none select-none">
                                02
                            </div>

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-400 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]">
                                    <Zap className="w-7 h-7" />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-amber-400 transition-colors">훈련루틴</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 h-[40px]">
                                    나만의 드릴 루틴을 설계하고<br />매일 10분, 체계적으로 연습하세요.
                                </p>

                                <ul className="space-y-3">
                                    {[
                                        '커스텀 드릴 루틴 생성',
                                        '주간 스케줄 플래너',
                                        'XP 보상 시스템'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50 group-hover:bg-amber-400 group-hover:shadow-[0_0_8px_rgba(245,158,11,0.8)] transition-all"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Card 3: 테크닉로드맵 */}
                        <div className="group relative bg-[#0A0A0A] rounded-3xl p-8 border border-white/5 hover:border-teal-400/50 transition-all duration-500 hover:-translate-y-2 overflow-hidden">
                            {/* Hover Gradient Glow */}
                            <div className="absolute inset-0 bg-gradient-to-b from-teal-400/0 to-teal-400/0 group-hover:to-teal-400/10 transition-all duration-500"></div>

                            {/* Watermark Number */}
                            <div className="absolute -right-4 -top-4 text-[120px] font-black text-white/[0.02] group-hover:text-teal-400/[0.05] transition-colors leading-none select-none">
                                03
                            </div>

                            <div className="relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center mb-6 text-teal-400 group-hover:scale-110 group-hover:bg-teal-400 group-hover:text-black transition-all duration-300 shadow-[0_0_30px_-10px_rgba(45,212,191,0.5)]">
                                    <Map className="w-7 h-7" />
                                </div>

                                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-teal-400 transition-colors">테크닉 로드맵</h3>
                                <p className="text-slate-400 text-sm leading-relaxed mb-6 h-[40px]">
                                    기술의 연결고리를 시각화하여<br />나만의 주짓수 지도를 완성하세요.
                                </p>

                                <ul className="space-y-3">
                                    {[
                                        '기술 트리 시각화',
                                        '레슨 & 드릴 연결 관리',
                                        '마스터리 레벨 추적'
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-slate-500 group-hover:text-slate-300 transition-colors">
                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-400/50 group-hover:bg-teal-400 group-hover:shadow-[0_0_8px_rgba(45,212,191,0.8)] transition-all"></div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                    </div>

                    {/* CTA Button */}
                    <div className="text-center">
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-12 py-7 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-[0_0_40px_-10px_rgba(99,102,241,0.5)] border border-white/10"
                            onClick={() => navigate('/arena')}
                        >
                            ARENA 입장하기
                        </Button>
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