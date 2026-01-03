import { useNavigate } from 'react-router-dom';
import { Network, Search, ChevronRight, Shield, Target, Key, Zap } from 'lucide-react';

const CHAIN_PREVIEWS = [
    {
        id: 1,
        title: "데라히바 시스템",
        creator: "Mendes Bros",
        nodes: 12,
        color: "from-blue-600 to-cyan-500",
        tags: ["Guard", "Sweep"],
        icon: Shield
    },
    {
        id: 2,
        title: "기본 암바 연계",
        creator: "John Danaher",
        nodes: 8,
        color: "from-violet-600 to-purple-500",
        tags: ["Submission", "Armbar"],
        icon: Target
    },
    {
        id: 3,
        title: "레그락 엔트리",
        creator: "Lachlan Giles",
        nodes: 15,
        color: "from-red-600 to-orange-500",
        tags: ["Leglock", "Entry"],
        icon: Key
    },
    {
        id: 4,
        title: "버터플라이 가드 패스",
        creator: "Gordon Ryan",
        nodes: 10,
        color: "from-emerald-600 to-teal-500",
        tags: ["Pass", "No-Gi"],
        icon: Zap
    }
];

const ChainPreviewCard = ({ chain }: { chain: typeof CHAIN_PREVIEWS[0] }) => {
    const Icon = chain.icon;
    return (
        <div className="p-4 border-b border-zinc-800 hover:bg-zinc-900/40 transition-colors cursor-pointer group flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${chain.color} flex items-center justify-center shrink-0 shadow-lg`}>
                <Icon className="w-8 h-8 text-white/80" />
            </div>
            <div className="flex-1 min-w-0 text-left">
                <h4 className="font-bold text-zinc-100 text-base mb-1 group-hover:text-violet-400 transition-colors">{chain.title}</h4>
                <p className="text-xs text-zinc-500 font-medium mb-2">{chain.creator} • {chain.nodes} steps</p>
                <div className="flex gap-1.5">
                    {chain.tags.map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-400">
                            {tag}
                        </span>
                    ))}
                </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-700 group-hover:text-zinc-500" />
        </div>
    );
};

export const TechniqueChainPreviewSection = () => {
    const navigate = useNavigate();

    return (
        <section className="py-24 bg-gradient-to-b from-zinc-950 via-zinc-950/50 to-zinc-950 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-xl mx-auto px-4 relative z-10">
                <div className="text-center mb-12 relative">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                        <Network className="w-4 h-4 text-violet-400 mr-2" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">TECHNIQUE CHAIN</span>
                    </div>
                    <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-4">
                        기술의 연결고리<br />
                        <span className="text-violet-500">체인 라이브러리</span>
                    </h2>
                    <p className="text-zinc-500 text-lg">
                        검증된 챔피언들의 기술 체계를 로드맵으로 확인하세요.
                    </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px] flex flex-col">
                    <div className="h-14 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
                        <span className="font-black text-lg tracking-tighter text-white">
                            Chain Library
                        </span>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto relative scrollbar-hide">
                        <div className="p-4 pb-0">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="테크닉 체인 검색..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-violet-500/50 placeholder:text-zinc-600"
                                    readOnly
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-zinc-900">
                            {CHAIN_PREVIEWS.map(chain => (
                                <ChainPreviewCard key={chain.id} chain={chain} />
                            ))}
                        </div>
                    </div>

                    {/* Fading Overlay */}
                    <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none" />

                    {/* CTA Button Overlay */}
                    <div className="absolute bottom-0 inset-x-0 flex items-end justify-center pb-8 z-30 pointer-events-none">
                        <button
                            onClick={() => navigate('/community?tab=library')}
                            className="pointer-events-auto bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm px-6 py-3 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Network className="w-4 h-4" /> 전체 라이브러리 보기
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-zinc-600 text-sm">
                        상황에 따른 연속기(Chain)를 학습하고, 나만의 패턴을 설계하세요.
                    </p>
                </div>
            </div>
        </section>
    );
};
