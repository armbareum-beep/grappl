import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { GitBranch } from 'lucide-react';


// Types for our node data
interface NodeData {
    id: string;
    label: string;
    x: number; // Percentage for responsive positioning
    y: number; // Percentage
    mastery: number; // 1-5
    status: 'locked' | 'available' | 'mastered' | 'active';
    connections: string[]; // IDs of nodes this connects TO
}

const nodes: NodeData[] = [
    { id: 'root', label: 'Closed Guard', x: 50, y: 15, mastery: 5, status: 'mastered', connections: ['sweep', 'sub'] },
    { id: 'sweep', label: 'Hip Bump Sweep', x: 25, y: 50, mastery: 3, status: 'active', connections: ['mount'] },
    { id: 'sub', label: 'Triangle Choke', x: 75, y: 50, mastery: 4, status: 'available', connections: ['armbar'] },
    { id: 'mount', label: 'Mount Maintain', x: 25, y: 85, mastery: 0, status: 'locked', connections: [] },
    { id: 'armbar', label: 'Armbar Finish', x: 75, y: 85, mastery: 2, status: 'available', connections: [] },
];

export const CapsuleRoadmapSection: React.FC = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(containerRef, { once: true, margin: "-100px" });

    return (
        <section className="py-24 md:py-40 relative overflow-hidden">
            {/* Background Radial Gradient */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-violet-900/25 rounded-full blur-[150px]"></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-center">

                {/* 1. Typography & CTA */}
                <div className="text-center max-w-4xl mx-auto mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl md:text-6xl font-black mb-6 leading-tight text-white tracking-tight break-keep"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
                                <GitBranch className="w-3.5 h-3.5 text-violet-500 mr-2" />
                                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-400">
                                    SKILL SYSTEM
                                </span>
                            </div>
                        </div>
                        길을 잃지 않는 수련, <br className="md:hidden" />
                        <span className="text-violet-500">당신의 다음 테크닉은 무엇입니까?</span>
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-zinc-400 text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto break-keep"
                    >
                        단편적인 기술 습득은 성장을 늦출 뿐입니다. <br />
                        레슨과 드릴을 연결하여 당신의 주짓수를 끊김 없는 하나의 흐름으로 만듭니다.
                    </motion.p>

                    <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/arena?tab=skills')}
                        className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full px-12 py-5 text-xl transition-all shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)]"
                    >
                        기술 시스템 구축하기
                    </motion.button>
                </div>

                {/* 2. Visual Identity: Capsule Roadmap */}
                <div className="w-full pb-8">
                    <div
                        ref={containerRef}
                        className="relative w-full max-w-4xl aspect-[4/5] md:aspect-[2/1] bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-3xl p-4 md:p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Subtle Grid Background */}
                        <div className="absolute inset-0 opacity-[0.05]" style={{
                            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                            backgroundSize: '40px 40px'
                        }}></div>

                        {/* Connection Lines (SVG) - REMOVED AS REQUESTED */}

                        {/* Nodes */}
                        {nodes.map((node, i) => (
                            <motion.div
                                key={node.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
                                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={isInView ? { scale: 1, opacity: 1 } : {}}
                                transition={{ delay: 0.2 + (i * 0.1), type: "spring", stiffness: 200, damping: 20 }}
                            >
                                <div className={`
                    relative px-4 py-2 md:px-6 md:py-3 rounded-full border transition-all duration-300 flex items-center gap-2 md:gap-3 cursor-pointer group hover:scale-105
                    ${node.status === 'active'
                                        ? 'bg-violet-600 border-violet-400 shadow-[0_0_25px_rgba(124,58,237,0.6)]'
                                        : node.status === 'mastered'
                                            ? 'bg-zinc-800 border-zinc-600 shadow-lg'
                                            : 'bg-zinc-950/80 border-zinc-800 opacity-60'
                                    }
                  `}>
                                    {/* Visual Pulse for active node */}
                                    {node.status === 'active' && (
                                        <div className="absolute inset-0 rounded-full animate-ping bg-violet-500/30"></div>
                                    )}

                                    <span className={`font-bold text-[10px] md:text-sm whitespace-nowrap ${node.status === 'active' ? 'text-white' : 'text-zinc-300'}`}>
                                        {node.label}
                                    </span>

                                    {/* Mastery Dots */}
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map(dot => (
                                            <div
                                                key={dot}
                                                className={`w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${dot <= node.mastery
                                                    ? (node.status === 'active' ? 'bg-white' : 'bg-violet-500')
                                                    : 'bg-zinc-700'
                                                    }`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                    </div>
                </div>

            </div>
        </section>
    );
};
