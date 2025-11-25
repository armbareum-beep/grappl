import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Play, Shield, Trophy, Star, Lock, ChevronRight, Zap, Users } from 'lucide-react';

export const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [showLoginModal, setShowLoginModal] = useState(false);

    const handleLoginRedirect = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans">
            {/* 1. Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop"
                        alt="BJJ Sparring"
                        className="w-full h-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-900"></div>
                </div>

                <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                    <div className="inline-block px-3 py-1 mb-6 border border-blue-500/30 rounded-full bg-blue-500/10 backdrop-blur-sm">
                        <span className="text-blue-400 text-sm font-medium tracking-wide uppercase">The Ultimate BJJ Platform</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
                        매트를 지배하는 <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">기술의 정점</span>
                    </h1>
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                        세계 챔피언들의 노하우가 담긴 체계적인 커리큘럼. <br className="hidden md:block" />
                        단순한 시청을 넘어, 당신의 주짓수를 완벽하게 성장시키세요.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            size="lg"
                            className="w-full sm:w-auto text-lg px-8 py-6 rounded-full shadow-lg shadow-blue-900/20 hover:shadow-blue-500/40 transition-all duration-300"
                            onClick={() => navigate('/signup')}
                        >
                            무료로 시작하기
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="w-full sm:w-auto text-lg px-8 py-6 rounded-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-500 transition-all"
                            onClick={() => document.getElementById('curriculum')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            커리큘럼 보기
                        </Button>
                    </div>
                </div>
            </section>

            {/* 2. Core Values */}
            <section id="curriculum" className="py-24 bg-slate-900 relative">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">왜 Grapplay인가요?</h2>
                        <p className="text-slate-400 text-lg">성장을 위한 최적의 환경을 제공합니다</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Value 1 */}
                        <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500/20 transition-colors">
                                <Play className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">체계적인 커리큘럼</h3>
                            <p className="text-slate-400 leading-relaxed">
                                초보자부터 숙련자까지, 단계별로 구성된 로드맵을 따라
                                빈틈없는 기술 체계를 완성하세요.
                            </p>
                        </div>

                        {/* Value 2 */}
                        <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                                <Shield className="w-7 h-7 text-indigo-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">검증된 인스트럭터</h3>
                            <p className="text-slate-400 leading-relaxed">
                                세계 무대에서 증명된 블랙벨트 챔피언들이
                                직접 제작하고 가르치는 프리미엄 콘텐츠입니다.
                            </p>
                        </div>

                        {/* Value 3 */}
                        <div className="bg-slate-800/50 p-8 rounded-3xl border border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 group">
                            <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-500/20 transition-colors">
                                <Trophy className="w-7 h-7 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">성장 시스템 (ARENA)</h3>
                            <p className="text-slate-400 leading-relaxed">
                                수련을 기록하고 XP를 획득하세요.
                                게임처럼 즐겁게 성장하며 블랙벨트를 향해 나아갑니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Drill Teaser (Instagram Style) */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>

                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">실전 드릴 라이브러리</h2>
                            <p className="text-slate-400 text-lg max-w-xl">
                                언제 어디서나 짧고 강력한 드릴 영상을 확인하세요. <br />
                                검증된 인스트럭터들의 시크릿 노하우가 담겨있습니다.
                            </p>
                        </div>
                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:text-white" onClick={handleLoginRedirect}>
                            더 많은 드릴 보기 <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>

                    {/* Drill Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map((item) => (
                            <div
                                key={item}
                                className="aspect-[9/16] bg-slate-800 rounded-xl overflow-hidden relative group cursor-pointer border border-slate-800 hover:border-slate-600 transition-all"
                                onClick={handleLoginRedirect}
                            >
                                {/* Placeholder Image */}
                                <img
                                    src={`https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=400&auto=format&fit=crop&ixlib=rb-4.0.3`}
                                    alt="Drill Thumbnail"
                                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500"
                                />

                                {/* Overlay Content */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-700 border border-slate-600"></div>
                                        <span className="text-xs font-medium text-slate-300">Instructor Name</span>
                                    </div>
                                    <h4 className="font-bold text-sm text-white mb-1 line-clamp-2">Armbar Setup from Guard</h4>
                                    <div className="flex items-center gap-3 text-xs text-slate-400">
                                        <span className="flex items-center gap-1"><Play className="w-3 h-3" /> 1.2k</span>
                                        <span className="flex items-center gap-1"><Star className="w-3 h-3" /> 4.8</span>
                                    </div>
                                </div>

                                {/* Lock Icon Overlay */}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                                    <div className="bg-white/10 backdrop-blur-md p-3 rounded-full border border-white/20">
                                        <Lock className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. Free Preview Section */}
            <section className="py-24 bg-slate-900">
                <div className="max-w-5xl mx-auto px-4">
                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl border border-slate-700 overflow-hidden shadow-2xl relative">
                        {/* Decorative Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

                        <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12 items-center relative z-10">
                            <div className="space-y-6">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
                                    <Star className="w-3 h-3 fill-blue-400" /> Popular Course
                                </div>
                                <h2 className="text-3xl font-bold leading-tight">
                                    가드 패스의 정석: <br />
                                    <span className="text-blue-400">기본부터 심화까지</span>
                                </h2>
                                <p className="text-slate-400">
                                    가장 인기 있는 강좌를 무료로 체험해보세요.
                                    첫 번째 챕터가 무료로 제공됩니다.
                                </p>
                                <ul className="space-y-3">
                                    {['압박 패스의 원리', '토레안도 패스 디테일', '실전 스파링 적용법'].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                                            <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                                <ChevronRight className="w-3 h-3 text-green-400" />
                                            </div>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                                <Button size="lg" className="w-full md:w-auto rounded-full mt-4" onClick={handleLoginRedirect}>
                                    무료 강의 시청하기
                                </Button>
                            </div>

                            {/* Course Card Preview */}
                            <div className="relative group cursor-pointer" onClick={handleLoginRedirect}>
                                <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                                <div className="relative bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-lg transform group-hover:-translate-y-1 transition-transform duration-300">
                                    <img
                                        src="https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2072&auto=format&fit=crop"
                                        alt="Course Thumbnail"
                                        className="w-full aspect-video object-cover"
                                    />
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-bold text-lg text-white">Guard Passing Mastery</h3>
                                            <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded">FREE</span>
                                        </div>
                                        <p className="text-slate-400 text-sm mb-4">By Marcus Almeida</p>
                                        <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-700 pt-3">
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> 1,234 Students</span>
                                            <span className="flex items-center gap-1"><Play className="w-3 h-3" /> 12 Lessons</span>
                                        </div>
                                    </div>

                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-white text-slate-900 px-6 py-3 rounded-full font-bold flex items-center gap-2 transform scale-95 group-hover:scale-100 transition-transform">
                                            <Play className="w-4 h-4 fill-slate-900" /> Watch Preview
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Arena Intro (Gamification) */}
            <section className="py-24 bg-black relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <div className="inline-block mb-6">
                        <Zap className="w-10 h-10 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">
                            수련이 <span className="text-yellow-400 italic">게임</span>이 됩니다
                        </h2>
                    </div>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-12">
                        기술을 배우고, 수련 일지를 작성하고, 레벨을 올리세요. <br />
                        온라인에서의 성장이 매트 위에서의 실력 향상으로 이어집니다.
                    </p>

                    {/* Gamification Visuals */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                        {[
                            { label: 'White Belt', xp: '0 XP', color: 'bg-white text-slate-900' },
                            { label: 'Blue Belt', xp: '2,000 XP', color: 'bg-blue-600 text-white' },
                            { label: 'Purple Belt', xp: '6,000 XP', color: 'bg-purple-600 text-white' },
                            { label: 'Brown Belt', xp: '12,000 XP', color: 'bg-amber-800 text-white' },
                        ].map((belt, i) => (
                            <div key={i} className={`p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col items-center justify-center gap-2 ${i === 1 ? 'border-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.2)] transform -translate-y-4' : ''}`}>
                                <div className={`w-full h-2 rounded-full ${belt.color} mb-2`}></div>
                                <span className="font-bold text-lg">{belt.label}</span>
                                <span className="text-xs text-slate-500">{belt.xp}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. Final CTA */}
            <section className="py-32 bg-gradient-to-b from-slate-900 to-blue-900/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">
                        지금 바로 시작하세요
                    </h2>
                    <p className="text-xl text-slate-300 mb-10">
                        더 이상 망설이지 마세요. <br />
                        당신의 주짓수 여정을 Grapplay가 함께합니다.
                    </p>
                    <Button
                        size="lg"
                        className="text-xl px-12 py-8 rounded-full shadow-2xl shadow-blue-500/30 hover:scale-105 transition-transform"
                        onClick={() => navigate('/signup')}
                    >
                        무료 체험 시작하기
                    </Button>
                    <p className="mt-6 text-sm text-slate-500">
                        신용카드 정보 입력 없이 시작할 수 있습니다.
                    </p>
                </div>
            </section>
        </div>
    );
};
