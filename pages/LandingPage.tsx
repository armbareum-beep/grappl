import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Play, Shield, Trophy, Star, ChevronRight, Zap, Users, BookOpen, Award, Target, CheckCircle } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth();

    // 로그인한 사용자는 /browse로 리다이렉트
    useEffect(() => {
        if (!loading && user) {
            navigate('/browse');
        }
    }, [user, loading, navigate]);

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
            <header className="absolute top-0 left-0 right-0 z-50 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center cursor-pointer" onClick={() => window.location.reload()}>
                        <img src="/logo_v2.png" alt="Grapplay" className="h-14 w-auto object-contain mix-blend-screen" />
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            className="text-slate-300 hover:text-white hover:bg-white/10"
                            onClick={() => navigate('/login')}
                        >
                            로그인
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
                            onClick={() => navigate('/pricing')}
                        >
                            시작하기
                        </Button>
                    </div>
                </div>
            </header>

            {/* 1. Hero Section */}
            <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
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

                <div className="relative z-10 text-center px-4 max-w-5xl mx-auto py-20">
                    {/* Badge */}
                    <div className="inline-block px-4 py-2 mb-8 border border-blue-500/40 rounded-full bg-blue-500/10 backdrop-blur-md">
                        <span className="text-blue-300 text-sm font-semibold tracking-wider uppercase flex items-center gap-2">
                            <Star className="w-4 h-4 fill-blue-400 text-blue-400" />
                            The Ultimate BJJ Platform
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-8 leading-[1.1]">
                        매트를 지배하는 <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 animate-gradient">
                            기술의 정점
                        </span>
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
                        세계 챔피언들과 함께, 당신의 BJJ를 성장시키세요. <br className="hidden md:block" />
                        체계적인 커리큘럼과 레벨업 시스템으로 블랙벨트를 향한 여정을 시작하세요.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto text-lg px-10 py-7 rounded-full shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                            onClick={() => navigate('/pricing')}
                        >
                            <Play className="w-5 h-5 mr-2" />
                            7일 무료 체험 시작
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto text-lg px-10 py-7 rounded-full border-2 border-slate-600 text-slate-200 hover:bg-white/10 hover:border-slate-400 transition-all backdrop-blur-sm"
                            onClick={() => document.getElementById('instructors')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            인스트럭터 보기
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>

                    {/* Trust Indicators */}
                    <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <span>1,000+ 수련생</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-400" />
                            <span>100+ 강좌</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-blue-400" />
                            <span>세계 챔피언 인스트럭터</span>
                        </div>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                    <ChevronRight className="w-6 h-6 text-slate-400 rotate-90" />
                </div>
            </section>

            {/* 2. Instructor Authority Section - 짐워크 스타일 */}
            <section id="instructors" className="py-32 bg-gradient-to-b from-black to-slate-900 relative overflow-hidden">
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

                    {/* Instructor Cards - 짐워크 스타일 */}
                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                        {[
                            {
                                name: 'Marcus Almeida',
                                nickname: '"Buchecha"',
                                title: 'IBJJF World Champion',
                                achievements: [
                                    '🏆 IBJJF 월드 챔피언 13회',
                                    '🥇 ADCC 챔피언 3회',
                                    '⭐ 블랙벨트 5단'
                                ],
                                specialty: 'Guard Passing & Pressure',
                                students: '2,500+',
                                belt: 'from-slate-900 to-slate-700'
                            },
                            {
                                name: 'Ana Silva',
                                nickname: '"The Spider Queen"',
                                title: 'Pan American Champion',
                                achievements: [
                                    '🏆 Pan American 챔피언 5회',
                                    '🥇 IBJJF European 챔피언',
                                    '⭐ 블랙벨트 3단'
                                ],
                                specialty: 'Spider Guard & Sweeps',
                                students: '1,800+',
                                belt: 'from-purple-600 to-purple-400'
                            },
                            {
                                name: 'Carlos Mendes',
                                nickname: '"The Leg Hunter"',
                                title: 'ADCC Medalist',
                                achievements: [
                                    '🏆 ADCC 메달리스트',
                                    '🥇 No-Gi World 챔피언',
                                    '⭐ 블랙벨트 4단'
                                ],
                                specialty: 'Leg Locks & No-Gi',
                                students: '3,200+',
                                belt: 'from-amber-800 to-amber-600'
                            }
                        ].map((instructor, i) => (
                            <div
                                key={i}
                                className="group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl border border-slate-700/50 hover:border-blue-500/50 overflow-hidden transition-all duration-500 hover:transform hover:-translate-y-3 hover:shadow-2xl hover:shadow-blue-500/20"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-transparent transition-all duration-500"></div>

                                <div className="p-8 relative">
                                    {/* Avatar with Belt Color */}
                                    <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${instructor.belt} p-1 mb-6 mx-auto ring-4 ring-slate-700/50 group-hover:ring-blue-500/50 transition-all duration-300`}>
                                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                            <Shield className="w-16 h-16 text-blue-400" />
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="text-center space-y-3">
                                        <div>
                                            <h3 className="text-2xl font-black text-white mb-1">{instructor.name}</h3>
                                            <p className="text-blue-400 font-semibold italic text-sm">{instructor.nickname}</p>
                                        </div>

                                        <div className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                                            <p className="text-blue-300 text-sm font-bold">{instructor.title}</p>
                                        </div>

                                        {/* Achievements */}
                                        <div className="pt-4 space-y-2">
                                            {instructor.achievements.map((achievement, j) => (
                                                <div key={j} className="flex items-center gap-2 text-slate-300 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                                    <span>{achievement}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-4 border-t border-slate-700/50">
                                            <p className="text-slate-400 font-medium mb-2 text-sm">전문 분야</p>
                                            <p className="text-white font-semibold">{instructor.specialty}</p>
                                        </div>

                                        <div className="flex items-center justify-center gap-2 text-slate-500 text-sm pt-2">
                                            <Users className="w-4 h-4 text-blue-400" />
                                            <span className="text-blue-400 font-bold">{instructor.students}</span>
                                            <span>수련생</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hover Effect */}
                                <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/50 rounded-3xl transition-all duration-300 pointer-events-none"></div>
                            </div>
                        ))}
                    </div>

                    {/* CTA */}
                    <div className="text-center">
                        <Button
                            size="lg"
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-10 py-6 text-lg rounded-full shadow-xl hover:shadow-2xl transition-all"
                            onClick={() => navigate('/pricing')}
                        >
                            이 인스트럭터들에게 배우기
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* 3. Drill Video Showcase */}
            <section className="py-32 bg-slate-900 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            실전 <span className="text-blue-400">드릴 라이브러리</span>
                        </h2>
                        <p className="text-slate-400 text-xl max-w-2xl mx-auto">
                            언제 어디서나 짧고 강력한 드릴 영상을 확인하세요
                        </p>
                    </div>

                    {/* Drill Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                        {[
                            { title: 'Armbar Setup', instructor: 'Marcus A.', views: '1.2k' },
                            { title: 'Guard Retention', instructor: 'Ana Silva', views: '890' },
                            { title: 'Sweep Drill', instructor: 'Carlos M.', views: '2.1k' },
                            { title: 'Passing Drill', instructor: 'Marcus A.', views: '1.5k' }
                        ].map((drill, i) => (
                            <div
                                key={i}
                                className="aspect-[9/16] bg-slate-800 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-700 hover:border-blue-500/50 transition-all duration-300"
                                onClick={() => navigate('/pricing')}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40"></div>

                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                                        <Play className="w-8 h-8 text-slate-900 fill-slate-900 ml-1" />
                                    </div>
                                </div>

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4">
                                    <h4 className="font-bold text-white mb-1">{drill.title}</h4>
                                    <p className="text-xs text-slate-300 mb-2">{drill.instructor}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <Play className="w-3 h-3" />
                                        <span>{drill.views}</span>
                                    </div>
                                </div>

                                <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full border border-white/20">
                                    <span className="text-xs text-white font-bold">PRO</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center">
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white rounded-full px-8"
                            onClick={() => navigate('/pricing')}
                        >
                            더 많은 드릴 보기
                            <ChevronRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* 4. Social Proof Section */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black mb-4">
                            수련생들의 <span className="text-blue-400">생생한 후기</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                name: '김민수',
                                belt: 'Blue Belt',
                                comment: 'Marcus 인스트럭터의 가드 패스 강의 덕분에 3개월 만에 블루벨트를 땄습니다. 세계 챔피언한테 직접 배우는 느낌이 정말 좋아요!',
                                rating: 5
                            },
                            {
                                name: '박지영',
                                belt: 'Purple Belt',
                                comment: 'Ana 인스트럭터의 스파이더 가드 시리즈가 최고입니다. 실전에서 바로 써먹을 수 있는 디테일이 가득해요.',
                                rating: 5
                            },
                            {
                                name: '이준호',
                                belt: 'White Belt',
                                comment: '초보자도 쉽게 따라할 수 있어요. 7일 무료 체험으로 시작했는데 바로 1년 구독했습니다. 35% 할인 혜택도 좋았어요!',
                                rating: 5
                            }
                        ].map((review, i) => (
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

            {/* 5. Final CTA Section */}
            <section className="py-40 bg-gradient-to-b from-black to-slate-900 relative overflow-hidden">
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
                    <div className="inline-block mb-8 px-6 py-3 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full">
                        <span className="text-amber-400 font-bold text-lg">🎉 오픈 특가: 1년 구독 시 35% 할인</span>
                    </div>

                    <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tight leading-tight">
                        지금 바로 <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                            시작하세요
                        </span>
                    </h2>

                    <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
                        7일 무료 체험으로 시작하세요. <br />
                        세계 챔피언들과 함께하는 당신의 주짓수 여정
                    </p>

                    <Button
                        size="lg"
                        className="text-xl px-16 py-8 rounded-full shadow-2xl shadow-blue-500/40 hover:shadow-blue-500/60 hover:scale-105 transition-all duration-300 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500"
                        onClick={() => navigate('/pricing')}
                    >
                        <Play className="w-6 h-6 mr-3" />
                        7일 무료 체험 시작
                    </Button>

                    <p className="mt-8 text-sm text-slate-500">
                        신용카드 정보 입력 없이 시작할 수 있습니다.
                    </p>

                    <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>7일 무료 체험</span>
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
