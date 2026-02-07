import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { TechniqueChainLibrarySection } from './TechniqueChainLibrarySection';
import { BookOpen as BookOpenIcon, Zap, Map } from 'lucide-react'; // Imports for Arena content cards
import { Button } from '../../components/Button'; // Assuming basic Button component exists

export const ArenaAndChainSection = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'arena' | 'chain'>('arena');

    return (
        <section className="py-24 md:py-32 bg-zinc-950 relative overflow-hidden min-h-[900px]">
            {/* Background elements are handled by internal sections or can be global here */}

            {/* Floating Toggle Tab */}
            <div className="absolute top-8 right-4 md:right-8 z-30 flex justify-end w-full px-4">
                <div className="bg-zinc-900/80 backdrop-blur-md rounded-full p-1 border border-zinc-800 flex gap-1 shadow-2xl">
                    <button
                        onClick={() => setViewMode('arena')}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'arena'
                                ? "bg-white text-black shadow-lg"
                                : "text-zinc-500 hover:text-white"
                        )}
                    >
                        <BookOpen className="w-4 h-4" />
                        Arena System
                    </button>
                    <button
                        onClick={() => setViewMode('chain')}
                        className={cn(
                            "px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2",
                            viewMode === 'chain'
                                ? "bg-violet-600 text-white shadow-lg"
                                : "text-zinc-500 hover:text-white"
                        )}
                    >
                        <Network className="w-4 h-4" />
                        Chain Library
                    </button>
                </div>
            </div>

            <div className="relative">
                <AnimatePresence mode="wait">
                    {viewMode === 'arena' ? (
                        <motion.div
                            key="arena"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Original Arena System Content */}
                            <div className="max-w-7xl mx-auto px-4 relative z-10">
                                {/* Background Elements for Arena */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-violet-900/10 rounded-full blur-[150px] pointer-events-none"></div>
                                <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid_pattern.png')] opacity-[0.02] pointer-events-none"></div>

                                {/* Section Header */}
                                <div className="text-center mb-16 md:mb-24">
                                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                                        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-violet-500 inline-block animate-pulse" />
                                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">
                                            ARENA SYSTEM
                                        </span>
                                    </div>

                                    <h2 className="text-4xl md:text-5xl font-black mb-6 text-zinc-50 leading-tight">
                                        성장을 데이터로 증명하다: <br className="md:hidden" />
                                        <span className="text-violet-400">ARENA SYSTEM</span>
                                    </h2>

                                    <p className="text-zinc-400 text-xl max-w-3xl mx-auto leading-relaxed">
                                        감각에 의존하는 수련은 끝났습니다. <br className="hidden md:block" />
                                        AI 분석과 체계적인 로드맵으로 당신의 주짓수를 객관적으로 추적하세요.
                                    </p>
                                </div>

                                {/* 3 Feature Cards */}
                                <div className="grid md:grid-cols-3 gap-6 md:gap-8 mb-16" id="arena-cards">
                                    {/* Card 1: 수련일지 */}
                                    <div className="group relative bg-zinc-900/40 rounded-2xl p-8 border border-zinc-800 hover:border-violet-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-violet-500/10 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/0 to-violet-500/0 group-hover:to-violet-500/5 transition-all duration-500"></div>
                                        <div className="absolute -right-4 -top-4 text-[120px] font-black text-zinc-800/20 group-hover:text-violet-500/5 transition-colors leading-none select-none">01</div>
                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-500 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_-5px_rgba(124,58,237,0.2)]">
                                                <BookOpenIcon className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-zinc-50 mb-3 group-hover:text-violet-300 transition-colors">수련일지</h3>
                                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 h-[40px]">AI 분석과 함께 훈련과 스파링을<br />데이터로 기록하고 추적하세요.</p>
                                            <ul className="space-y-3">
                                                {['훈련/스파링 데이터 기록', 'AI 코치 퍼포먼스 분석', '성장 그래프 시각화'].map((item, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 group-hover:bg-violet-400 group-hover:shadow-[0_0_8px_rgba(124,58,237,0.5)] transition-all"></div>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Card 2: 훈련루틴 */}
                                    <div className="group relative bg-zinc-900/40 rounded-2xl p-8 border border-zinc-800 hover:border-violet-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-violet-500/10 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/0 to-violet-500/0 group-hover:to-violet-500/5 transition-all duration-500"></div>
                                        <div className="absolute -right-4 -top-4 text-[120px] font-black text-zinc-800/20 group-hover:text-violet-500/5 transition-colors leading-none select-none">02</div>
                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-500 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_-5px_rgba(124,58,237,0.2)]">
                                                <Zap className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-zinc-50 mb-3 group-hover:text-violet-300 transition-colors">훈련루틴</h3>
                                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 h-[40px]">나만의 드릴 루틴을 설계하고<br />매일 10분, 체계적으로 연습하세요.</p>
                                            <ul className="space-y-3">
                                                {['커스텀 드릴 루틴 생성', '주간 스케줄 플래너', 'XP 보상 시스템'].map((item, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 group-hover:bg-violet-400 group-hover:shadow-[0_0_8px_rgba(124,58,237,0.5)] transition-all"></div>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Card 3: 테크닉로드맵 */}
                                    <div className="group relative bg-zinc-900/40 rounded-2xl p-8 border border-zinc-800 hover:border-violet-500/30 transition-all duration-500 hover:-translate-y-2 hover:shadow-violet-500/10 overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-b from-violet-500/0 to-violet-500/0 group-hover:to-violet-500/5 transition-all duration-500"></div>
                                        <div className="absolute -right-4 -top-4 text-[120px] font-black text-zinc-800/20 group-hover:text-violet-500/5 transition-colors leading-none select-none">03</div>
                                        <div className="relative z-10">
                                            <div className="w-14 h-14 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 text-violet-500 group-hover:scale-110 group-hover:bg-violet-500 group-hover:text-white transition-all duration-300 shadow-[0_0_20px_-5px_rgba(124,58,237,0.2)]">
                                                <Map className="w-7 h-7" />
                                            </div>
                                            <h3 className="text-2xl font-bold text-zinc-50 mb-3 group-hover:text-violet-300 transition-colors">테크닉 로드맵</h3>
                                            <p className="text-zinc-400 text-sm leading-relaxed mb-6 h-[40px]">기술의 연결고리를 시각화하여<br />나만의 주짓수 지도를 완성하세요.</p>
                                            <ul className="space-y-3">
                                                {['기술 트리 시각화', '레슨 & 드릴 연결 관리', '마스터리 레벨 추적'].map((item, i) => (
                                                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-500 group-hover:text-zinc-300 transition-colors">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500/50 group-hover:bg-violet-400 group-hover:shadow-[0_0_8px_rgba(124,58,237,0.5)] transition-all"></div>
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* CTA Button */}
                                    <div className="text-center md:col-span-3">
                                        <Button
                                            size="lg"
                                            className="bg-violet-600 hover:bg-violet-500 text-white px-12 py-7 rounded-full font-bold text-lg transition-all hover:scale-105 shadow-violet-500/40 shadow-lg border border-violet-500/20"
                                            onClick={() => navigate('/arena')}
                                        >
                                            ARENA 입장하기
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="chain"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Render Technique Chain Library Section */}
                            {/* We modify the internal padding of the component or just render it as is. 
                                 TechniqueChainLibrarySection has py-24, which might stack. 
                                 We can override styles or just accept it. The container here has py-24 too. 
                                 Let's actually just render the inner content if possible, but importing the component is easier.
                                 We will wrap it in a div that potentially negative margins or just accept double padding if needed, 
                                 but better: Remove parent padding if mode is chain? 
                                 The parent section has padding. The child has padding. 
                                 Let's adjust the wrapper div to minimal.
                             */}
                            <div className="-my-24">
                                <TechniqueChainLibrarySection />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </section>
    );
};
