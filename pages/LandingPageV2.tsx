import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Play, Star, ChevronRight, Zap, Users, BookOpen, Clapperboard, Map, Trophy } from 'lucide-react';
import { InstructorCarousel } from '../components/InstructorCarousel';
import { FreeDrillShowcase } from '../components/FreeDrillShowcase';
import { RandomSparringShowcase } from '../components/RandomSparringShowcase';
import { ClassShowcase } from '../components/ClassShowcase';
import { ParticleBackground } from '../components/ParticleBackground';
import { getTestimonials, getPlatformStats, getRoutines, getPublicSparringVideos, getSparringVideos } from '../lib/api';
import { Testimonial } from '../types';

export const LandingPageV2: React.FC = () => {
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
                },
            ]);
        }
    };

    const loadStats = async () => {
        const platformStats = await getPlatformStats();
        setStats(platformStats);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    // 로그인한 사용자에게는 아무것도 보여주지 않음 (리다이렉트 중)
    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-zinc-100 font-sans overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Navigation Header */}
            <header className="fixed top-0 left-0 right-0 z-50 px-4 md:px-6 py-4 bg-black/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => window.location.reload()}>
                        <img
                            src="/logo_v2_final.png"
                            alt="Grapplay"
                            className="h-8 md:h-10 w-auto object-contain brightness-0 invert"
                        />
                    </div>
                    <div className="flex items-center gap-2 md:gap-4">
                        <Button
                            variant="ghost"
                            className="text-zinc-400 hover:text-white hover:bg-white/5 text-sm px-3 md:px-4 transition-colors duration-200"
                            onClick={() => navigate('/login')}
                        >
                            로그인
                        </Button>
                        <Button
                            className="bg-white text-black hover:bg-zinc-200 rounded-full px-5 md:px-6 text-sm md:text-base font-medium transition-colors duration-200 border-0"
                            onClick={() => navigate('/pricing')}
                        >
                            시작하기
                        </Button>
                    </div>
                </div>
            </header>

            {/* 1. Hero Section - Modern Minimalist Dark with Glows */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20 md:pt-0 border-b border-zinc-800">
                {/* Minimalist Background with Spotlights */}
                <div className="absolute inset-0 z-0 bg-black">
                    <ParticleBackground />
                    <div className="absolute inset-0 bg-[url('/grid_pattern.png')] bg-[length:32px_32px] opacity-[0.03] invert"></div>
                    {/* Primary Glow - Indigo */}
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                    {/* Secondary Glow - Purple (Bottom) */}
                    <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>
                </div>

                <div className="relative z-10 text-center px-4 max-w-5xl mx-auto py-12 md:py-20 mt-10 md:mt-0">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-8 border border-indigo-500/20 rounded-full bg-indigo-500/5 backdrop-blur-sm shadow-[0_0_15px_-3px_rgba(99,102,241,0.1)]">
                        <Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                        <span className="text-indigo-200 text-xs font-bold tracking-wide uppercase">
                            The Ultimate BJJ Platform
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05] text-white">
                        매트를 지배하는 <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-white animate-gradient">
                            기술의 정점
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                        세계적인 블랙벨트들과 함께, 당신의 BJJ를 성장시키세요. <br className="hidden md:block" />
                        체계적인 커리큘럼과 레벨업 시스템으로 블랙벨트를 향한 여정을 시작하세요.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto text-lg px-8 py-6 rounded-full bg-white text-black hover:bg-indigo-50 font-semibold border-0 transition-all duration-200 hover:scale-105 hover:shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]"
                            onClick={() => navigate('/courses')}
                        >
                            <Play className="w-5 h-5 mr-2 fill-black" />
                            무료 영상으로 시작
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto text-lg px-8 py-6 rounded-full border border-zinc-700 bg-transparent text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-white/5 transition-all duration-200"
                            onClick={() => navigate('/instructors')}
                        >
                            인스트럭터 보기
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-20 flex flex-wrap justify-center gap-x-8 gap-y-4 text-xs md:text-sm text-zinc-500 border-t border-zinc-800/50 pt-10 max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 group cursor-default">
                            <Users className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                            <span className="font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{stats.totalUsers.toLocaleString()}+</span> 수련생
                        </div>
                        <div className="flex items-center gap-2 group cursor-default">
                            <BookOpen className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                            <span className="font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{stats.totalCourses.toLocaleString()}+</span> 클래스
                        </div>
                        <div className="flex items-center gap-2 group cursor-default">
                            <Zap className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                            <span className="font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{stats.totalRoutines.toLocaleString()}+</span> 루틴
                        </div>
                        <div className="flex items-center gap-2 group cursor-default">
                            <Clapperboard className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 transition-colors" />
                            <span className="font-medium text-zinc-400 group-hover:text-zinc-200 transition-colors">{stats.totalSparring.toLocaleString()}+</span> 스파링
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Instructor Authority Section */}
            <section id="instructors" className="py-24 bg-zinc-950 border-b border-zinc-800 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-black to-zinc-950 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <div className="inline-block px-3 py-1 mb-4 border border-zinc-700 rounded-full bg-zinc-900">
                                <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">World Class Instructors</span>
                            </div>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-2">
                                세계 최고의 블랙벨트들이 <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-400 to-zinc-600">직접 가르칩니다</span>
                            </h2>
                        </div>
                        <p className="text-zinc-400 text-lg max-w-md leading-relaxed pb-2">
                            IBJJF, ADCC, Pan American 챔피언들의 검증된 기술을 배우세요.
                        </p>
                    </div>

                    <div className="relative">
                        <InstructorCarousel />
                        <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-zinc-950 to-transparent pointer-events-none z-10"></div>
                        <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-zinc-950 to-transparent pointer-events-none z-10"></div>
                    </div>
                </div>
            </section>

            {/* 3. Sparring Showcase Section */}
            <div className="border-b border-zinc-800 bg-black">
                <RandomSparringShowcase />
            </div>

            {/* 4. Class Showcase Section */}
            <div className="border-b border-zinc-800 bg-black">
                <ClassShowcase />
            </div>

            {/* 5. Drill Video Showcase */}
            <section className="py-24 bg-zinc-950 relative overflow-hidden border-b border-zinc-800">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/5 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white">
                                실전 <span className="text-indigo-400">드릴 라이브러리</span>
                            </h2>
                            <p className="text-zinc-400 text-lg">
                                언제 어디서나 짧고 강력한 드릴 영상을 확인하세요
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            className="bg-transparent border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-900 hover:border-zinc-500 rounded-full px-6 transition-all"
                            onClick={() => navigate('/drills')}
                        >
                            더 많은 드릴 보기
                            <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                    </div>

                    <FreeDrillShowcase />
                </div>
            </section>

            {/* 6. Arena System Promotion Section */}
            <section className="py-24 bg-black border-b border-zinc-800 overflow-hidden relative">
                {/* Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[150px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-6 border border-indigo-500/30 rounded-full bg-indigo-500/10 backdrop-blur-sm">
                            <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                            <span className="text-indigo-300 text-xs font-bold tracking-[0.2em] uppercase">
                                ARENA SYSTEM
                            </span>
                        </div>

                        <h2 className="text-4xl md:text-7xl font-black mb-6 tracking-tight leading-[0.9] text-white">
                            LEVEL UP <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600">
                                YOUR JIU-JITSU
                            </span>
                        </h2>

                        <p className="text-zinc-400 text-lg max-w-xl mx-auto font-medium">
                            성장을 위한 3가지 코어 시스템
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6 mb-16" id="arena-cards">
                        {/* Card 1: 수련일지 */}
                        <div className="group relative bg-zinc-900/30 rounded-3xl p-8 border border-zinc-800 hover:border-indigo-500/40 hover:bg-zinc-900/50 transition-all duration-500 hover:-translate-y-1">
                            <div className="absolute top-4 right-6 text-[80px] font-black text-white/[0.02] group-hover:text-indigo-500/[0.05] transition-colors leading-none select-none -z-10">
                                01
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_-5px_rgba(99,102,241,0.2)]">
                                <BookOpen className="w-6 h-6" />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">수련일지</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 h-[40px]">
                                AI 분석과 함께 훈련과 스파링을<br />데이터로 기록하고 추적하세요.
                            </p>

                            <ul className="space-y-3">
                                {[
                                    '훈련/스파링 데이터 기록',
                                    'AI 코치 퍼포먼스 분석',
                                    '성장 그래프 시각화'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover:bg-indigo-400"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Card 2: 훈련루틴 */}
                        <div className="group relative bg-zinc-900/30 rounded-3xl p-8 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900/50 transition-all duration-500 hover:-translate-y-1">
                            <div className="absolute top-4 right-6 text-[80px] font-black text-white/[0.02] group-hover:text-amber-500/[0.05] transition-colors leading-none select-none -z-10">
                                02
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 text-amber-500 group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-black transition-all duration-300 shadow-[0_0_20px_-5px_rgba(245,158,11,0.2)]">
                                <Zap className="w-6 h-6" />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-amber-400 transition-colors">훈련루틴</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 h-[40px]">
                                나만의 드릴 루틴을 설계하고<br />매일 10분, 체계적으로 연습하세요.
                            </p>

                            <ul className="space-y-3">
                                {[
                                    '커스텀 드릴 루틴 생성',
                                    '주간 스케줄 플래너',
                                    'XP 보상 시스템'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40 group-hover:bg-amber-400"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Card 3: 테크닉로드맵 */}
                        <div className="group relative bg-zinc-900/30 rounded-3xl p-8 border border-zinc-800 hover:border-violet-500/40 hover:bg-zinc-900/50 transition-all duration-500 hover:-translate-y-1">
                            <div className="absolute top-4 right-6 text-[80px] font-black text-white/[0.02] group-hover:text-violet-500/[0.05] transition-colors leading-none select-none -z-10">
                                03
                            </div>

                            <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-500 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_-5px_rgba(124,58,237,0.2)]">
                                <Map className="w-6 h-6" />
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">테크닉 로드맵</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 h-[40px]">
                                기술의 연결고리를 시각화하여<br />나만의 주짓수 지도를 완성하세요.
                            </p>

                            <ul className="space-y-3">
                                {[
                                    '기술 트리 시각화',
                                    '레슨 & 드릴 연결 관리',
                                    '마스터리 레벨 추적'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/40 group-hover:bg-violet-400"></div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="text-center">
                        <Button
                            size="lg"
                            className="bg-indigo-600/90 text-white hover:bg-indigo-500 px-12 py-7 rounded-full font-bold text-lg transition-all hover:scale-105 border-0 shadow-[0_0_40px_-10px_rgba(79,70,229,0.4)]"
                            onClick={() => navigate('/arena')}
                        >
                            ARENA 입장하기
                        </Button>
                    </div>
                </div>
            </section>

            {/* 7. Social Proof Section */}
            <section className="py-24 bg-zinc-950 border-t border-zinc-900 relative">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
                            수련생들의 <span className="text-indigo-400">생생한 후기</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {testimonials.map((review, i) => (
                            <div key={i} className="bg-zinc-900/30 backdrop-blur-sm rounded-2xl border border-zinc-800 p-8 hover:border-indigo-500/30 transition-all hover:-translate-y-1">
                                <div className="flex gap-1 mb-4">
                                    {[...Array(review.rating)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                                    ))}
                                </div>
                                <p className="text-zinc-300 mb-6 leading-relaxed">"{review.comment}"</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-600/20 flex items-center justify-center border border-indigo-500/30 text-indigo-300">
                                        <span className="font-bold text-sm">{review.name[0]}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm">{review.name}</p>
                                        <p className="text-xs text-zinc-500">{review.belt}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. Final CTA Section */}
            <section className="py-32 bg-black relative overflow-hidden border-t border-zinc-800">
                {/* Subtle Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[150px] pointer-events-none opacity-50"></div>

                <div className="max-w-5xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-5xl md:text-8xl font-black mb-8 tracking-tight leading-tight text-white">
                        지금 바로 <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 to-indigo-400">
                            시작하세요
                        </span>
                    </h2>

                    <p className="text-xl md:text-2xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                        무료 영상으로 시작하세요. <br />
                        세계적인 블랙벨트들과 함께하는 당신의 주짓수 여정
                    </p>

                    <Button
                        size="lg"
                        className="text-xl px-16 py-8 rounded-full bg-white text-black hover:bg-zinc-200 transition-all duration-300 shadow-[0_0_30px_-5px_rgba(255,255,255,0.2)] hover:scale-105"
                        onClick={() => navigate('/courses')}
                    >
                        <Play className="w-6 h-6 mr-3 fill-black" />
                        무료 영상으로 시작
                    </Button>

                    <p className="mt-8 text-sm text-zinc-500">
                        신용카드 정보 입력 없이 시작할 수 있습니다.
                    </p>

                    <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
                            <span>무료 영상 제공</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
                            <span>카드 등록 불필요</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
                            <span>언제든 취소 가능</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

