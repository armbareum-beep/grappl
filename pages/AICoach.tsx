import React, { useEffect, useRef, useState } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';
import {
    Brain,
    Zap,
    ShieldAlert,
    Activity,
    UserCheck,
    Play,
    TrendingUp,
    Flame,
    LucideIcon,
    Sparkles,
    Lock,
} from 'lucide-react';

interface MetricCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    icon: LucideIcon;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, isPositive, icon: Icon }) => (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-violet-500/20 p-6 rounded-2xl relative overflow-hidden group hover:border-violet-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-violet-500/20 transition-all"></div>
        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
                    <Icon className="w-6 h-6 text-violet-400" />
                </div>
                <div
                    className={`flex items-center space-x-1 text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                >
                    {isPositive ? (
                        <TrendingUp className="w-4 h-4" />
                    ) : (
                        <TrendingUp className="w-4 h-4 rotate-180" />
                    )}
                    <span>{change}</span>
                </div>
            </div>
            <h3 className="text-zinc-400 text-sm font-medium mb-1">{title}</h3>
            <div className="text-3xl font-black text-white tracking-tight">{value}</div>
        </div>
    </div>
);

interface RecommendationCardProps {
    type: string;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    color: string;
    image: string;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ type, title, subtitle, icon: Icon, color, image }) => (
    <div className="min-w-[320px] h-[420px] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 relative group cursor-pointer hover:border-zinc-700 transition-all">
        <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent"></div>

        <div className="absolute top-6 left-6">
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${color} bg-black/50 backdrop-blur-md border border-white/10`}>
                <Icon className="w-3 h-3" />
                <span>{type}</span>
            </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
            <h3 className="text-2xl font-black text-white mb-2 leading-tight">{title}</h3>
            <p className="text-zinc-400 text-sm mb-6 line-clamp-2 leading-relaxed">{subtitle}</p>
            <button className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center space-x-2 hover:bg-violet-50 transition-colors">
                <Play className="w-4 h-4 fill-current" />
                <span>Start Training</span>
            </button>
        </div>
    </div>
);

export const AICoach: React.FC = () => {
    const sectionsRef = useRef<(HTMLElement | null)[]>([]);

    // Mock Data
    const radarData = [
        { subject: 'Pass', A: 85, fullMark: 100 },
        { subject: 'Sweep', A: 65, fullMark: 100 },
        { subject: 'Submission', A: 90, fullMark: 100 },
        { subject: 'Defense', A: 50, fullMark: 100 },
        { subject: 'Stamina', A: 70, fullMark: 100 },
    ];

    const expertPosts = [
        {
            user: "Master Kim",
            rank: "Black Belt",
            title: "How I fixed my triangle chokes",
            avatar: "https://i.pravatar.cc/150?u=kim"
        },
        {
            user: "Sarah JJ",
            rank: "Brown Belt",
            title: "Guard retention drills for small players",
            avatar: "https://i.pravatar.cc/150?u=sarah"
        }
    ];

    // Analysis State Management
    const [hasAnalysis, setHasAnalysis] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [nextAnalysisTime, setNextAnalysisTime] = useState<number | null>(null);

    // Check analysis status on mount
    useEffect(() => {
        const lastAnalysis = localStorage.getItem('ai_coach_last_analysis');
        if (lastAnalysis) {
            const lastTime = parseInt(lastAnalysis);
            const now = Date.now();
            const timeDiff = now - lastTime;
            const twentyFourHours = 24 * 60 * 60 * 1000;

            if (timeDiff < twentyFourHours) {
                setHasAnalysis(true);
                setNextAnalysisTime(lastTime + twentyFourHours);
            }
        }
    }, []);

    const handleStartAnalysis = async () => {
        setIsAnalyzing(true);

        // Simulate AI analysis (replace with actual API call)
        await new Promise(resolve => setTimeout(resolve, 3000));

        const now = Date.now();
        localStorage.setItem('ai_coach_last_analysis', now.toString());
        setHasAnalysis(true);
        setNextAnalysisTime(now + 24 * 60 * 60 * 1000);
        setIsAnalyzing(false);
    };

    const getTimeUntilNextAnalysis = () => {
        if (!nextAnalysisTime) return null;
        const now = Date.now();
        const diff = nextAnalysisTime - now;
        if (diff <= 0) return null;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}시간 ${minutes}분`;
    };


    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                        entry.target.classList.remove('opacity-0', 'translate-y-10');
                    }
                });
            },
            { threshold: 0.1 }
        );

        sectionsRef.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-zinc-950 pb-24 overflow-x-hidden">
            {/* Background Glows */}
            <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-900/20 blur-[120px] rounded-full animate-pulse-slow"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full animate-pulse-slow delay-1000"></div>
            </div>

            {/* Overlay for Unanalyzed State */}
            {!hasAnalysis && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-md">
                    <div className="max-w-2xl mx-auto px-6 text-center">
                        <div className="mb-8 relative">
                            <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full"></div>
                            <div className="relative w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center border-4 border-zinc-900 shadow-2xl">
                                <Sparkles className="w-12 h-12 text-white" />
                            </div>
                        </div>

                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
                            AI 전술 분석을 시작하세요
                        </h2>
                        <p className="text-zinc-400 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
                            당신의 수련 데이터를 분석하여 <span className="text-white font-bold">맞춤형 전략</span>과 <span className="text-white font-bold">약점 보완 플랜</span>을 제공합니다.
                        </p>

                        <button
                            onClick={handleStartAnalysis}
                            disabled={isAnalyzing}
                            className="group relative px-12 py-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl transition-all duration-300 shadow-[0_0_40px_rgba(124,58,237,0.4)] hover:shadow-[0_0_60px_rgba(124,58,237,0.6)] hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out rounded-2xl"></div>
                            <div className="relative flex items-center gap-3">
                                {isAnalyzing ? (
                                    <>
                                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>분석 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-6 h-6" />
                                        <span>첫 AI 분석 시작하기</span>
                                    </>
                                )}
                            </div>
                        </button>

                        <p className="text-zinc-600 text-sm mt-6">
                            <Lock className="w-3 h-3 inline mr-1" />
                            분석은 하루에 1회만 가능합니다
                        </p>
                    </div>
                </div>
            )}

            <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8 pt-12 space-y-24">{/* Add filter blur when not analyzed */}
                <div className={!hasAnalysis ? 'filter blur-sm pointer-events-none select-none' : ''}>

                    {/* Section 1: Hero (Combat Profile) */}
                    <section
                        ref={el => { sectionsRef.current[0] = el; }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center opacity-0 translate-y-10 transition-all duration-1000 ease-out"
                    >
                        <div className="space-y-8">
                            <div>
                                <div className="inline-flex items-center space-x-2 px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
                                    <Brain className="w-3 h-3" />
                                    <span>AI 인텔리전스 V2.0</span>
                                </div>
                                <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
                                    당신의 파이팅 스타일: <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                                        전술적 압박가 (The Tactical Smasher)
                                    </span>
                                </h1>
                                <p className="text-zinc-400 text-lg max-w-xl leading-[1.7]">
                                    당신은 압박 패스와 탑 컨트롤에 뛰어나지만, 데이터 분석 결과 <span className="text-white font-bold">하프 가드 하위 포지션</span>에서 승률이 급격히 떨어지는 경향이 있습니다.
                                </p>

                                {/* Re-analysis Button */}
                                {hasAnalysis && (
                                    <div className="mt-6">
                                        {getTimeUntilNextAnalysis() ? (
                                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-zinc-500 text-sm">
                                                <Lock className="w-4 h-4" />
                                                <span>다음 분석까지 <strong className="text-white">{getTimeUntilNextAnalysis()}</strong></span>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={handleStartAnalysis}
                                                disabled={isAnalyzing}
                                                className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:scale-105 disabled:opacity-50"
                                            >
                                                {isAnalyzing ? (
                                                    <>
                                                        <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        <span>AI 재분석 진행 중...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-5 h-5 animate-pulse" />
                                                        <span>새로운 AI 분석 시작하기</span>
                                                        <div className="ml-2 px-2 py-0.5 bg-white/20 rounded text-[10px] uppercase tracking-tighter">Ready</div>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-4">
                                <div className="px-6 py-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                                    <div className="text-xs text-zinc-500 font-bold uppercase mb-1">탑 포지션 점유율</div>
                                    <div className="text-2xl font-black text-white">82%</div>
                                </div>
                                <div className="px-6 py-4 bg-zinc-900/80 rounded-2xl border border-zinc-800">
                                    <div className="text-xs text-zinc-500 font-bold uppercase mb-1">서브미션 성공률</div>
                                    <div className="text-2xl font-black text-white p-0">45%</div>
                                </div>
                            </div>
                        </div>

                        <div className="relative flex justify-center items-center">
                            <div className="absolute inset-0 bg-violet-500/10 blur-[80px] rounded-full"></div>
                            <div className="relative w-full aspect-square max-w-[500px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                        <PolarGrid stroke="#3f3f46" strokeDasharray="3 3" />
                                        <PolarAngleAxis
                                            dataKey="subject"
                                            tick={{ fill: '#e4e4e7', fontSize: 12, fontWeight: 700 }}
                                        />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="My Power"
                                            dataKey="A"
                                            stroke="#8b5cf6"
                                            strokeWidth={3}
                                            fill="#8b5cf6"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>


                    {/* Section 2: Urgency (Muscle Memory Decay) */}
                    <section
                        ref={el => { sectionsRef.current[1] = el; }}
                        className="opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-200"
                    >
                        <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-orange-500/20 rounded-3xl p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/30 shrink-0 animate-pulse">
                                        <ShieldAlert className="w-8 h-8 text-orange-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-2">근육 기억 감퇴 경고 (Muscle Memory Decay)</h2>
                                        <p className="text-zinc-400 leading-relaxed">
                                            <span className="text-white font-bold">72시간</span> 동안 수련 기록이 감지되지 않았습니다.
                                            내일 당신의 반응 속도가 <span className="text-orange-400 font-bold">15% 저하</span>될 것으로 예상됩니다.
                                        </p>
                                    </div>
                                </div>
                                <button className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-900/50 whitespace-nowrap">
                                    지금 수련 재개하기
                                </button>
                            </div>
                        </div>
                    </section>


                    {/* Section 3: Analysis (Data Cards) */}
                    <section
                        ref={el => { sectionsRef.current[2] = el; }}
                        className="opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-300"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-3xl font-black text-white">퍼포먼스 분석</h2>
                            <div className="text-sm font-bold text-violet-400 cursor-pointer hover:text-violet-300">전체 리포트 보기 {'->'}</div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard
                                title="가드 패스 성공률"
                                value="62%"
                                change="+12.5%"
                                isPositive={true}
                                icon={Zap}
                            />
                            <MetricCard
                                title="서브미션 방어율"
                                value="88%"
                                change="+5.2%"
                                isPositive={true}
                                icon={ShieldAlert}
                            />
                            <MetricCard
                                title="스윕 성공률"
                                value="34%"
                                change="-8.1%"
                                isPositive={false}
                                icon={Activity}
                            />
                            <MetricCard
                                title="주간 매트 시간"
                                value="4.5h"
                                change="-2.0h"
                                isPositive={false}
                                icon={Flame}
                            />
                        </div>
                    </section>


                    {/* Section 4: Action (AI Prescription) */}
                    <section
                        ref={el => { sectionsRef.current[3] = el; }}
                        className="opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-400"
                    >
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-white mb-2">AI 맞춤 처방</h2>
                            <p className="text-zinc-400 leading-relaxed">약점을 보완하고 마스터리를 가속화할 맞춤형 콘텐츠입니다.</p>
                        </div>

                        <div className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory scrollbar-hide -mx-6 px-6 md:mx-0 md:px-0">
                            <div className="snap-center">
                                <RecommendationCard
                                    type="약점 보완"
                                    title="하프 가드 리커버리"
                                    subtitle="납작하게 눌렸을 때 가드 리텐션 성공률이 40% 감소합니다. 프레임을 만드는 법을 익히세요."
                                    icon={ShieldAlert}
                                    color="text-rose-400 border-rose-400/30"
                                    image="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop"
                                />
                            </div>
                            <div className="snap-center">
                                <RecommendationCard
                                    type="로드맵 확장"
                                    title="X-가드 트랜지션 매트릭스"
                                    subtitle="현재의 오픈 가드 게임을 확장할 수 있는 고급 진입 기술입니다."
                                    icon={TrendingUp}
                                    color="text-violet-400 border-violet-400/30"
                                    image="https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2072&auto=format&fit=crop"
                                />
                            </div>
                            <div className="snap-center">
                                <RecommendationCard
                                    type="리텐션 부스터"
                                    title="5분 솔로 힙 드릴"
                                    subtitle="가드 리텐션을 위한 고관절 유연성 및 움직임 훈련."
                                    icon={Activity}
                                    color="text-emerald-400 border-emerald-400/30"
                                    image="https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2070&auto=format&fit=crop"
                                />
                            </div>
                        </div>
                    </section>


                    {/* Section 5: Care & Social */}
                    <section
                        ref={el => { sectionsRef.current[4] = el; }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-8 opacity-0 translate-y-10 transition-all duration-1000 ease-out delay-500"
                    >
                        {/* Injury Guard */}
                        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-rose-500/10 rounded-xl">
                                    <Activity className="w-6 h-6 text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">부상 방지 가드</h3>
                                    <p className="text-zinc-400 text-sm">최근 일지에서 감지된 키워드: "무릎 통증"</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-zinc-950 rounded-xl cursor-pointer hover:bg-zinc-950/80 transition-colors">
                                    <div className="w-16 h-10 bg-zinc-800 rounded-lg overflow-hidden relative">
                                        <Play className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">안전한 무릎 테이핑 가이드</div>
                                        <div className="text-zinc-500 text-xs text-nowrap">3분 • 부상 방지</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-950 rounded-xl cursor-pointer hover:bg-zinc-950/80 transition-colors">
                                    <div className="w-16 h-10 bg-zinc-800 rounded-lg overflow-hidden relative">
                                        <Play className="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-sm">무릎 부담 없는 패스 기술</div>
                                        <div className="text-zinc-500 text-xs">12분 • 테크닉</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Expert Matching */}
                        <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-violet-500/10 rounded-xl">
                                    <UserCheck className="w-6 h-6 text-violet-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">고수 매칭</h3>
                                    <p className="text-zinc-400 text-sm">당신의 약점(하프 가드)을 마스터한 고수들</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {expertPosts.map((post, idx) => (
                                    <div key={idx} className="flex gap-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer">
                                        <img src={post.avatar} alt={post.user} className="w-10 h-10 rounded-full object-cover border border-zinc-700" />
                                        <div>
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-white font-bold text-sm">{post.user}</span>
                                                <span className="text-xs text-violet-400 font-medium px-1.5 py-0.5 bg-violet-500/10 rounded flex items-center gap-1">
                                                    {post.rank}
                                                </span>
                                            </div>
                                            <p className="text-zinc-400 text-sm mt-1 line-clamp-1">{post.title === "How I fixed my triangle chokes" ? "트라이앵글 초크 디테일 교정법" : "작은 사람을 위한 가드 리텐션 드릴"}</p>
                                        </div>
                                    </div>
                                ))}
                                <button className="w-full py-3 text-sm font-bold text-zinc-500 hover:text-white transition-colors">
                                    커뮤니티 피드 보기 {'->'}
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default AICoach;

