import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { Star, Search, Award, Quote, Sparkles } from 'lucide-react';
import { InstructorCarousel } from '../components/InstructorCarousel';

import { RandomSparringShowcase } from '../components/RandomSparringShowcase';
import { ClassShowcase } from '../components/ClassShowcase';
import { DailyFreeDrillSection } from '../components/DailyFreeDrillSection';
import { DrillReelsSection } from '../components/DrillReelsSection';
import { RoutinePromotionSection } from '../components/landing/RoutinePromotionSection';
import { CapsuleRoadmapSection } from '../components/landing/CapsuleRoadmapSection';
import { HighlightedText } from '../components/common/HighlightedText';

import { getTestimonials, getRoutines, getPublicSparringVideos, getSparringVideos } from '../lib/api';
import { Testimonial } from '../types';
import { cn } from '../lib/utils';

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
    const [siteSettings, setSiteSettings] = useState<any>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        loadTestimonials();
        loadSettings();
        // Prefetch data for faster page loads
        prefetchData();
    }, []);

    const loadSettings = async () => {
        try {
            const { data } = await import('../lib/api-admin').then(m => m.getSiteSettings());
            if (data) setSiteSettings(data);
        } catch (e) {
            console.warn('Failed to load site settings', e);
        }
    };

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
                    comment: '가드 패스 강의 덕분에 시합에서 우승할 수 있었습니다. 챔피언한테 직접 배우는 느낌이 정말 좋아요!',
                    rating: 5,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    name: '박지영',
                    belt: 'Purple Belt',
                    comment: '스파이더 가드 시리즈가 최고입니다. 실전에서 바로 써먹을 수 있는 디테일이 가득해요.',
                    rating: 5,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    name: '이준호',
                    belt: 'White Belt',
                    comment: '초보자도 쉽게 따라할 수 있어요. 무료 강의로 시작했는데 바로 1년 구독했습니다. 2달무료 혜택도 좋았어요!',
                    rating: 5,
                    createdAt: new Date().toISOString()
                }
            ]);
        }
    };


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    // 로그인한 사용자에게는 아무것도 보여주지 않음 (리다이렉트 중)
    if (user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden break-keep relative">
            {/* Global Continuous Background Pattern */}
            <div className="absolute inset-0 opacity-[0.15] pointer-events-none z-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, #8b5cf6 1px, transparent 0)',
                backgroundSize: '40px 40px',
                maskImage: 'linear-gradient(to bottom, transparent, black 5%, black 95%, transparent)'
            }}></div>

            {/* Navigation Header */}
            <header className={cn(
                "absolute top-0 left-0 w-full z-50 transition-all duration-300 h-20 flex items-center px-4 md:px-8",
                isScrolled
                    ? "bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900"
                    : "bg-transparent"
            )}>
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group transition-transform hover:scale-105">
                        <span className="text-2xl font-black text-zinc-50 tracking-tighter transition-colors group-hover:text-violet-400">
                            Grapplay
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <button
                            className="text-zinc-400 hover:text-violet-400 text-sm font-medium px-2 py-1 transition-colors"
                            onClick={() => navigate('/login')}
                        >
                            로그인
                        </button>
                        <button
                            className="bg-violet-600 hover:bg-violet-500 text-white px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-violet-900/20"
                            onClick={() => navigate('/pricing')}
                        >
                            시작하기
                        </button>
                    </div>
                </div>
            </header>

            {/* 1. Hero Section */}
            <section className="relative min-h-screen flex flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950 px-4 overflow-hidden pt-28 md:pt-40">
                {/* 2. Top Badge (Verified Black Belt Only) */}
                <div className="z-10 mb-4 md:mb-6 flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 mr-2" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400">
                        Verified Black Belt Only
                    </span>
                </div>

                {/* 3. Main Copy */}
                <h1 className="z-10 text-center text-4xl md:text-7xl font-bold tracking-tight text-white leading-[1.1]">
                    {siteSettings?.hero?.title ? <HighlightedText text={siteSettings.hero.title} highlightClass="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-violet-500 to-violet-600" /> : <>유튜브엔 없는 <br /> <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-violet-500 to-violet-600">블랙벨트의 진짜 디테일</span></>}
                </h1>

                {/* 4. Sub Copy */}
                <p className="z-10 mt-6 md:mt-8 max-w-[600px] text-center text-zinc-400 text-base md:text-lg leading-relaxed break-keep">
                    {siteSettings?.hero?.subtitle ? <HighlightedText text={siteSettings.hero.subtitle} highlightClass="text-zinc-200 font-medium" /> : <>파편화된 영상은 이제 그만. <br className="hidden md:block" /> 매트 위에서 실제로 작동하는 <span className="text-zinc-200 font-medium">단 1%의 디테일</span>을 경험하세요.</>}
                </p>

                {/* 5. CTA Button */}
                <div className="z-10 mt-8 md:mt-12 flex flex-col sm:flex-row gap-4">
                    <button
                        className="relative group bg-zinc-100 hover:bg-white text-black font-bold rounded-full px-8 py-4 transition-all transform hover:-translate-y-1 shadow-[0_0_25px_rgba(255,255,255,0.2)] overflow-hidden"
                        onClick={() => navigate('/watch')}
                    >
                        <span className="relative z-10">독점 강의 지금 보기</span>
                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-zinc-300/30 to-transparent z-0 w-full h-full skew-x-12"></div>
                    </button>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 opacity-60 animate-bounce cursor-pointer" onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Scroll</span>
                    <div className="w-5 h-8 border-2 border-zinc-600 rounded-full flex justify-center p-1">
                        <div className="w-1 h-3 bg-zinc-400 rounded-full animate-scroll-down"></div>
                    </div>
                </div>

                {/* Bottom Fade Mask for Seamless Transition */}
                <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent z-0 pointer-events-none" />
            </section>

            {/* Section Conditional Rendering */}
            {(!siteSettings || siteSettings.sections?.dailyFreePass !== false) && <DailyFreeDrillSection
                title={siteSettings?.sectionContent?.dailyFreePass?.title}
                subtitle={siteSettings?.sectionContent?.dailyFreePass?.subtitle}
            />}

            {(!siteSettings || siteSettings.sections?.instructors !== false) && (
                <section id="instructors" className="py-24 md:py-40 relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] pointer-events-none"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                            <div className="text-left">
                                <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                                    <Award className="w-3.5 h-3.5 text-violet-500 mr-2" />
                                    <span className="text-violet-400 text-[10px] font-bold uppercase tracking-[0.2em]">WORLD CLASS INSTRUCTORS</span>
                                </div>
                                <h2 className="text-3xl md:text-6xl font-black mb-6 leading-tight text-white">
                                    {siteSettings?.sectionContent?.instructors?.title ? <HighlightedText text={siteSettings.sectionContent.instructors.title} /> : <>검증되지 않은 기술은 <br /> <span className="text-violet-500">배우지 마세요</span></>}
                                </h2>
                                <p className="text-zinc-400 text-xl max-w-2xl leading-relaxed">
                                    {siteSettings?.sectionContent?.instructors?.subtitle ? <HighlightedText text={siteSettings.sectionContent.instructors.subtitle} /> : <>IBJJF, ADCC 챔피언부터 전,현직 국가대표까지. <br className="hidden md:block" /> 최고들의 노하우만 담았습니다.</>}
                                </p>
                            </div>
                            <div className="relative w-full md:w-[320px]">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Search className="w-5 h-5 text-zinc-500" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="인스트럭터 검색..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-zinc-900/50 border border-zinc-800 text-zinc-200 text-base rounded-full pl-12 pr-6 py-4 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all placeholder:text-zinc-700 backdrop-blur-sm shadow-xl"
                                />
                            </div>
                        </div>
                        <InstructorCarousel searchQuery={searchQuery} />
                        <div className="mt-20 text-center">
                            <button
                                className="px-10 py-4 bg-transparent border border-zinc-800 text-zinc-400 font-bold rounded-full transition-all hover:border-violet-500 hover:text-violet-400 hover:bg-violet-900/10 hover:shadow-[0_0_20px_rgba(124,58,237,0.2)]"
                                onClick={() => navigate('/instructors')}
                            >
                                전체 인스트럭터 보기
                            </button>
                        </div>
                    </div>
                </section>
            )}

            {(!siteSettings || siteSettings.sections?.classShowcase !== false) && <ClassShowcase
                title={siteSettings?.sectionContent?.classShowcase?.title}
                subtitle={siteSettings?.sectionContent?.classShowcase?.subtitle}
            />}
            {(!siteSettings || siteSettings.sections?.drillReels !== false) && <DrillReelsSection
                title={siteSettings?.sectionContent?.drillReels?.title}
                subtitle={siteSettings?.sectionContent?.drillReels?.subtitle}
            />}
            {(!siteSettings || siteSettings.sections?.sparringShowcase !== false) && <RandomSparringShowcase
                title={siteSettings?.sectionContent?.sparringShowcase?.title}
                subtitle={siteSettings?.sectionContent?.sparringShowcase?.subtitle}
            />}
            {(!siteSettings || siteSettings.sections?.roadmap !== false) && <CapsuleRoadmapSection
                title={siteSettings?.sectionContent?.roadmap?.title}
                subtitle={siteSettings?.sectionContent?.roadmap?.subtitle}
            />}
            {(!siteSettings || siteSettings.sections?.routinePromotion !== false) && <RoutinePromotionSection
                title={siteSettings?.sectionContent?.routinePromotion?.title}
                subtitle={siteSettings?.sectionContent?.routinePromotion?.subtitle}
            />}

            {(!siteSettings || siteSettings.sections?.testimonials !== false) && (
                <div className="relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-violet-900/10 rounded-full blur-[160px] pointer-events-none"></div>
                    <section className="py-24 md:py-40 relative z-10">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="text-center mb-16 md:mb-24">
                                <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                                    <Quote className="w-3.5 h-3.5 text-violet-500 mr-2" />
                                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">COMMUNITY REVIEWS</span>
                                </div>
                                <h2 className="text-3xl md:text-6xl font-black mb-6 text-zinc-50 leading-tight">
                                    {siteSettings?.sectionContent?.testimonials?.title || <>매트 위에서 시작된 <br className="md:hidden" /> <span className="text-violet-400">놀라운 변화</span></>}
                                </h2>
                                <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed break-keep">
                                    {siteSettings?.sectionContent?.testimonials?.subtitle || <>블랙벨트의 디테일을 경험한 수련생들의 생생한 목소리를 확인하세요.</>}
                                </p>
                            </div>
                            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
                                {testimonials.map((review, i) => (
                                    <div key={i} className="bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-zinc-800 p-8 hover:border-violet-500/30 transition-all duration-500 hover:shadow-violet-500/5 hover:-translate-y-2 group">
                                        <div className="flex gap-1 mb-6">
                                            {[...Array(review.rating)].map((_, j) => (
                                                <Star key={j} className="w-4 h-4 fill-violet-500 text-violet-500" />
                                            ))}
                                        </div>
                                        <p className="text-zinc-300 mb-8 leading-relaxed text-base md:text-lg italic group-hover:text-zinc-100 transition-colors">"{review.comment}"</p>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
                                                <span className="text-white font-bold text-lg">{review.name[0]}</span>
                                            </div>
                                            <div className="text-left">
                                                <p className="font-bold text-zinc-100 text-base">{review.name}</p>
                                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">{review.belt}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {(!siteSettings || siteSettings.sections?.finalCTA !== false) && (
                <section className="relative py-32 md:py-48 bg-black flex flex-col items-center justify-center overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(124,58,237,0.3)_0%,rgba(244,63,94,0.15)_50%,transparent_70%)] blur-[100px] pointer-events-none"></div>
                    <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-center gap-y-12 text-center">
                        <div className="space-y-6">
                            <h2 className="text-zinc-50 text-4xl md:text-6xl font-black tracking-tighter leading-tight">
                                {siteSettings?.sectionContent?.finalCTA?.title ? <HighlightedText text={siteSettings.sectionContent.finalCTA.title} /> : <>성실함이 성장을 보장하던<br className="md:hidden" /> 시대는 끝났습니다. 차이를 만드세요.</>}
                            </h2>
                            <p className="text-zinc-400 text-lg md:text-xl mt-8 max-w-3xl mx-auto leading-relaxed break-keep">
                                {siteSettings?.sectionContent?.finalCTA?.subtitle ? <HighlightedText text={siteSettings.sectionContent.finalCTA.subtitle} /> : <>똑같은 시간 수련하고도 나만 뒤처지는 기분, 단순히 재능 탓일까요?<br className="hidden md:block" /> 전략 없는 땀방울은 가장 느린 성장의 지름길입니다.</>}
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-6">
                            <button
                                className="relative group bg-zinc-100 text-black rounded-full px-14 py-6 text-xl font-bold shadow-[0_0_50px_rgba(124,58,237,0.4)] hover:bg-violet-600 hover:text-white hover:scale-105 transition-all duration-300 overflow-hidden"
                                onClick={() => navigate('/pricing')}
                            >
                                <span className="relative z-10">{siteSettings?.sectionContent?.finalCTA?.buttonText || '지금 바로 훈련 시작'}</span>
                                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 w-full h-full skew-x-12"></div>
                            </button>
                            <p className="text-zinc-600 text-sm font-medium">
                                회원가입만으로 모든 무료 콘텐츠를 즉시 체험할 수 있습니다.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            <style>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
                .animate-shimmer {
                    animation: shimmer 3s infinite;
                    position: absolute;
                    top: 0;
                    width: 50%;
                    height: 100%;
                    content: '';
                }
            `}</style>
        </div >
    );
};