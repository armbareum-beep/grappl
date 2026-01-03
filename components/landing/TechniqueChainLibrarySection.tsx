import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Share2, GitBranch, Zap, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Data for Technique Chains
const FEATURED_CHAINS = [
    {
        id: 1,
        title: "데라히바 시스템",
        creator: "Mendes Bros",
        nodes: 12,
        connections: 18,
        difficulty: "Advanced",
        color: "from-blue-500 to-cyan-400"
    },
    {
        id: 2,
        title: "기본 암바 연계",
        creator: "John Danaher",
        nodes: 8,
        connections: 10,
        difficulty: "Beginner",
        color: "from-violet-500 to-purple-400"
    },
    {
        id: 3,
        title: "레그락 엔트리",
        creator: "Lachlan Giles",
        nodes: 15,
        connections: 22,
        difficulty: "Expert",
        color: "from-red-500 to-orange-400"
    }
];

export const TechniqueChainLibrarySection = () => {
    const navigate = useNavigate();
    const [activeCard, setActiveCard] = useState(0);

    return (
        <section className="py-24 bg-black relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col md:flex-row gap-12 md:gap-20 items-center">

                {/* Left Content */}
                <div className="flex-1 text-left">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-violet-500/30 bg-violet-900/10 backdrop-blur-sm mb-6">
                        <Network className="w-4 h-4 text-violet-400 mr-2" />
                        <span className="text-[10px] font-bold text-violet-300 uppercase tracking-[0.2em]">TECHNIQUE CHAIN</span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black mb-6 text-white leading-[1.1]">
                        기술은 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">연결될 때</span><br />
                        비로소 완성됩니다.
                    </h2>

                    <p className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-xl">
                        한 가지 기술만으로는 상대를 제압할 수 없습니다.
                        상황에 따른 연속기(Chain)를 학습하고, 나만의 필승 패턴을 설계하세요.
                        검증된 챔피언들의 기술 체계를 로드맵으로 제공합니다.
                    </p>

                    <ul className="space-y-4 mb-10">
                        {[
                            { icon: GitBranch, text: "기술의 흐름을 시각화한 로드맵" },
                            { icon: Share2, text: "다른 유저들과 나만의 체인 공유" },
                            { icon: Zap, text: "실전 상황별 최적의 대응 시나리오" }
                        ].map((item, i) => (
                            <li key={i} className="flex items-center text-zinc-300">
                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mr-4 shrink-0">
                                    <item.icon className="w-5 h-5 text-violet-400" />
                                </div>
                                <span className="font-medium">{item.text}</span>
                            </li>
                        ))}
                    </ul>

                    <button
                        onClick={() => navigate('/arena')}
                        className="group flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-bold transition-all hover:bg-violet-500 hover:text-white"
                    >
                        체인 라이브러리 탐색
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Right Visual (Interactive Cards) */}
                <div className="flex-1 w-full max-w-md md:max-w-full relative">
                    <div className="relative h-[500px] w-full flex items-center justify-center">
                        {FEATURED_CHAINS.map((chain, index) => {
                            // Calculate position and scale based on active index
                            const offset = index - activeCard;
                            const isActive = offset === 0;

                            return (
                                <motion.div
                                    key={chain.id}
                                    className={cn(
                                        "absolute w-full max-w-sm bg-zinc-900/60 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 cursor-pointer overflow-hidden",
                                        isActive ? "z-20 border-violet-500/50 shadow-2xl shadow-violet-500/20" : "z-10 opacity-40 hover:opacity-60"
                                    )}
                                    initial={false}
                                    animate={{
                                        y: offset * 40,
                                        scale: isActive ? 1 : 0.9,
                                        opacity: isActive ? 1 : Math.max(0, 0.5 - Math.abs(offset) * 0.2), // Fade out distant cards
                                        zIndex: 100 - Math.abs(offset)
                                    }}
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    onClick={() => setActiveCard(index)}
                                >
                                    {/* Card Content */}
                                    <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${chain.color}`}></div>

                                    <div className="flex justify-between items-start mb-8 mt-2">
                                        <div>
                                            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Featured Chain</p>
                                            <h3 className="text-2xl font-bold text-white">{chain.title}</h3>
                                        </div>
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <GitBranch className="w-5 h-5 text-zinc-400" />
                                        </div>
                                    </div>

                                    {/* Mock Visualization of Nodes */}
                                    <div className="relative h-32 mb-8 bg-zinc-950/50 rounded-xl border border-zinc-800/50 p-4 flex items-center justify-center">
                                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-500/20 via-transparent to-transparent"></div>

                                        {/* Simple Node Graph SVG */}
                                        <svg width="100%" height="100%" viewBox="0 0 200 100" className="opacity-80">
                                            <circle cx="20" cy="50" r="6" className="fill-zinc-500" />
                                            <line x1="26" y1="50" x2="54" y2="20" stroke="#52525b" strokeWidth="2" />
                                            <line x1="26" y1="50" x2="54" y2="80" stroke="#52525b" strokeWidth="2" />

                                            <circle cx="60" cy="20" r="6" className="fill-violet-500 animate-pulse" />
                                            <circle cx="60" cy="80" r="6" className="fill-zinc-500" />

                                            <line x1="66" y1="20" x2="100" y2="20" stroke="#8b5cf6" strokeWidth="2" />
                                            <line x1="66" y1="80" x2="100" y2="80" stroke="#52525b" strokeWidth="2" />

                                            <circle cx="106" cy="20" r="8" className="fill-white" />
                                            <circle cx="106" cy="80" r="6" className="fill-zinc-500" />

                                            <line x1="114" y1="20" x2="150" y2="50" stroke="#8b5cf6" strokeWidth="2" strokeDasharray="4 4" />
                                            <circle cx="156" cy="50" r="6" className="fill-zinc-600" />
                                        </svg>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-zinc-900 rounded-lg p-3">
                                            <p className="text-zinc-500 text-xs mb-1">Creator</p>
                                            <p className="text-sm font-bold text-zinc-200">{chain.creator}</p>
                                        </div>
                                        <div className="bg-zinc-900 rounded-lg p-3">
                                            <p className="text-zinc-500 text-xs mb-1">Difficulty</p>
                                            <p className="text-sm font-bold text-zinc-200">{chain.difficulty}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Navigation Dots */}
                    <div className="flex justify-center gap-2 mt-8">
                        {FEATURED_CHAINS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setActiveCard(i)}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    activeCard === i ? "bg-violet-500 w-6" : "bg-zinc-800 hover:bg-zinc-700"
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
