import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
} from 'recharts';
import { Brain, ChevronRight, Zap, Target, Sparkles } from 'lucide-react';
import { TrainingLog } from '../types';
import { DeepAnalysisResult } from '../lib/gemini';
import { calculateRadarStats, RadarStats, analyzeBalance, BalanceAnalysis } from '../lib/analysis';
import { useAuth } from '../contexts/AuthContext';

interface AICoachWidgetProps {
    logs: TrainingLog[];
}

export const AICoachWidget: React.FC<AICoachWidgetProps> = ({ logs }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [hasAnalysis, setHasAnalysis] = useState(false);
    const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisResult | null>(null);
    const [radarStats, setRadarStats] = useState<RadarStats[]>([]);
    const [balance, setBalance] = useState<BalanceAnalysis | null>(null);

    useEffect(() => {
        if (!user) return;

        // Check for cached deep analysis
        const cachedResult = localStorage.getItem(`ai_analysis_result_${user.id}`);
        if (cachedResult) {
            try {
                const parsed = JSON.parse(cachedResult);
                setDeepAnalysis(parsed);
                setHasAnalysis(true);
            } catch (e) {
                console.error("Failed to parse cached analysis", e);
            }
        } else {
            // Check legacy key just in case
            const lastAnalysis = localStorage.getItem('ai_coach_last_analysis');
            if (lastAnalysis) {
                setHasAnalysis(true);
            }
        }
    }, [user]);

    useEffect(() => {
        // Run analysis even on empty logs to show accurate (0%) baselines
        setRadarStats(calculateRadarStats(logs));
        setBalance(analyzeBalance(logs));
        console.log(`[AICoachWidget] Logs updated: ${logs.length} entries`);
    }, [logs]);

    // Fallback radar data if no logs
    const defaultRadarData = [
        { subject: '스탠딩', A: 10, fullMark: 100 },
        { subject: '가드', A: 10, fullMark: 100 },
        { subject: '패스', A: 10, fullMark: 100 },
        { subject: '사이드', A: 10, fullMark: 100 },
        { subject: '마운트', A: 10, fullMark: 100 },
        { subject: '백', A: 10, fullMark: 100 }
    ];

    // Map English subjects to Korean for the widget display
    const translateSubject = (subject: string) => {
        const map: { [key: string]: string } = {
            'Standing': '스탠딩',
            'Guard': '가드',
            'Passing': '패스',
            'Side': '사이드',
            'Mount': '마운트',
            'Back': '백'
        };
        return map[subject] || subject;
    };

    const displayRadarData = (() => {
        if (deepAnalysis?.styleProfile?.fingerprint) {
            const f = deepAnalysis.styleProfile.fingerprint;
            return [
                { subject: '스탠딩', A: f.Standing || 10, fullMark: 100 },
                { subject: '가드', A: f.Guard || 10, fullMark: 100 },
                { subject: '패스', A: f.Passing || 10, fullMark: 100 },
                { subject: '사이드', A: f.Side || 10, fullMark: 100 },
                { subject: '마운트', A: f.Mount || 10, fullMark: 100 },
                { subject: '백', A: f.Back || 10, fullMark: 100 },
            ];
        }

        if (radarStats.length > 0) {
            return radarStats.map(s => ({ ...s, subject: translateSubject(s.subject) }));
        }

        return defaultRadarData;
    })();

    return (
        <div
            onClick={() => navigate('/ai-coach')}
            className="lg:col-span-5 relative overflow-hidden bg-zinc-900 border border-zinc-800 p-0 rounded-[32px] group flex flex-col h-full cursor-pointer transition-all duration-300 hover:border-violet-500/50 hover:shadow-[0_0_50px_-10px_rgba(124,58,237,0.2)]"
        >
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-900/10 via-zinc-900 to-zinc-950 z-0" />
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-violet-600/20 blur-[100px] rounded-full group-hover:bg-violet-600/30 transition-all duration-700" />

            {/* Unanalyzed Overlay */}
            {!hasAnalysis && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/40 backdrop-blur-md p-8 text-center border border-white/5 rounded-[32px]">
                    <div className="mb-4 relative">
                        <div className="absolute inset-0 bg-violet-500/20 blur-xl rounded-full"></div>
                        <div className="relative w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center border-2 border-white/10 shadow-2xl">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h4 className="text-xl font-black text-white mb-2 tracking-tight">AI Coach 분석 전입니다</h4>
                    <p className="text-zinc-400 text-sm mb-6 leading-relaxed max-w-[200px] mx-auto">
                        맞춤 기술 분석과 능력치 그래프를 확인하려면 분석을 시작하세요.
                    </p>
                    <div className="px-6 py-3 bg-white text-zinc-950 font-bold rounded-xl text-sm flex items-center gap-2 group-hover:scale-105 transition-transform">
                        <Sparkles className="w-4 h-4" />
                        AI 분석 시작하기
                    </div>
                </div>
            )}

            <div className={`relative z-10 flex flex-col h-full p-6 md:p-8 ${!hasAnalysis ? 'filter blur-[4px] grayscale-[0.5] opacity-30 select-none' : ''}`}>
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                            <Brain className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-violet-400 uppercase tracking-wider mb-0.5">AI Coach 분석</div>
                            <h3 className="text-lg font-black text-white leading-none">전투 프로필</h3>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors duration-300">
                        <ChevronRight className="w-5 h-5 text-zinc-400 group-hover:text-white" />
                    </div>
                </div>

                {/* Content Content */}
                <div className="flex-1 flex flex-col md:flex-row items-center gap-6">
                    {/* Left: Text Info */}
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">내 주짓수 스타일</p>
                            <h4 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400 leading-tight">
                                {deepAnalysis?.styleProfile.identity ? (
                                    <>
                                        {deepAnalysis.styleProfile.identity.split(' ').slice(0, -1).join(' ')}{' '}
                                        <span className="text-violet-400">{deepAnalysis.styleProfile.identity.split(' ').slice(-1)}</span>
                                    </>
                                ) : (
                                    <>Tactical <span className="text-violet-400">Grappler</span></>
                                )}
                            </h4>
                        </div>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between md:justify-start gap-4 px-3 py-2 bg-zinc-950/50 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-xs text-zinc-300 font-medium">Top Possession</span>
                                </div>
                                <span className="text-sm font-bold text-white">
                                    {deepAnalysis?.styleProfile?.fingerprint?.topPossession !== undefined
                                        ? `${deepAnalysis.styleProfile.fingerprint.topPossession}%`
                                        : (balance ? `${balance.topRatio}%` : '0%')}
                                </span>
                            </div>
                            <div className="flex items-center justify-between md:justify-start gap-4 px-3 py-2 bg-zinc-950/50 rounded-lg border border-white/5">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-3.5 h-3.5 text-zinc-400" />
                                    <span className="text-xs text-zinc-300 font-medium">Submission Rate</span>
                                </div>
                                <span className="text-sm font-bold text-white">
                                    {deepAnalysis?.styleProfile?.fingerprint?.submissionRate !== undefined
                                        ? `${deepAnalysis.styleProfile.fingerprint.submissionRate}%`
                                        : (balance ? `${Math.round(balance.attack * 0.8)}%` : '0%')}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Mini Radar */}
                    <div className="w-32 h-32 md:w-40 md:h-40 relative flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={displayRadarData}>
                                <PolarGrid stroke="#3f3f46" strokeOpacity={0.5} />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 8, fontWeight: 700 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar
                                    name="나의 능력치"
                                    dataKey="A"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="#8b5cf6"
                                    fillOpacity={0.4}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                        {/* Overlay Flash */}
                        <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-xl animate-pulse-slow pointer-events-none" />
                    </div>
                </div>

                {/* Footer Text */}
                <p className="mt-6 text-xs text-zinc-500 text-center md:text-left leading-relaxed">
                    <strong className="text-violet-400">분석 요약:</strong> {deepAnalysis?.styleProfile.description || "당신의 수련 로그를 분석하여 AI 코치가 개인화된 공략법을 제안합니다."}
                </p>
            </div>
        </div>
    );
};
