import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TrainingLog } from '../types';
import {
    analyzeReadiness,
    analyzeBalance,
    analyzeMomentum,
    identifyBlindSpots,
    calculateRadarStats,
    ReadinessAnalysis,
    BalanceAnalysis,
    MomentumAnalysis,
    RadarStats
} from '../lib/analysis';
import { analyzeUserDeeply, DeepAnalysisResult } from '../lib/gemini';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import {
    Activity,
    Brain,
    Zap,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Swords,
    ChevronRight,
    PieChart,
    Sparkles,
    Clock,
    Play,
    Target
} from 'lucide-react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';

export const AICoach: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Data
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [recentVideos, setRecentVideos] = useState<any[]>([]);

    // Analysis Results (Rule-based)
    const [readiness, setReadiness] = useState<ReadinessAnalysis | null>(null);
    const [balance, setBalance] = useState<BalanceAnalysis | null>(null);
    const [momentum, setMomentum] = useState<MomentumAnalysis | null>(null);
    const [blindSpots, setBlindSpots] = useState<string[]>([]);
    const [radarData, setRadarData] = useState<RadarStats[]>([]);

    // AI Deep Analysis
    const [deepAnalysis, setDeepAnalysis] = useState<DeepAnalysisResult | null>(null);
    const [isAnalyzingDeeply, setIsAnalyzingDeeply] = useState(false);
    const [analysisCooldown, setAnalysisCooldown] = useState<string | null>(null);

    // Auto-run analysis if logs are loaded and no cooldown
    useEffect(() => {
        if (logs.length > 0 && user && !analysisCooldown && !deepAnalysis && !isAnalyzingDeeply) {
            handleRunAnalysis();
        }
    }, [logs, user?.id, analysisCooldown, deepAnalysis]);

    useEffect(() => {
        if (user) {
            fetchData();
            checkAnalysisCooldown();
        }
    }, [user?.id]);

    // Check localStorage for last analysis time
    const checkAnalysisCooldown = () => {
        const lastRun = localStorage.getItem(`ai_analysis_last_run_${user?.id}`);
        const cachedResult = localStorage.getItem(`ai_analysis_result_${user?.id}`);

        if (lastRun) {
            const lastDate = new Date(lastRun);
            const now = new Date();
            const diffMs = now.getTime() - lastDate.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);

            // 쿨타임이 남았고, 캐시된 결과도 있는 경우에만 쿨타임 적용
            if (diffHours < 24 && cachedResult) {
                const remainingMs = (24 * 60 * 60 * 1000) - diffMs;
                const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
                const remMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

                setAnalysisCooldown(`${remHours}시간 ${remMinutes}분 후 가능`);

                try {
                    setDeepAnalysis(JSON.parse(cachedResult));
                } catch (e) {
                    console.error("Failed to parse cached analysis", e);
                    setAnalysisCooldown(null);
                    localStorage.removeItem(`ai_analysis_last_run_${user?.id}`); // Clear cooldown if parsing fails
                }
            } else if (!cachedResult) {
                // 최근 실행 기록은 있지만 결과가 없으면 (오류 등), 쿨타임 무시하고 다시 실행
                setAnalysisCooldown(null);
                localStorage.removeItem(`ai_analysis_last_run_${user?.id}`);
            } else {
                setAnalysisCooldown(null);
            }
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!user) return;


            const { getTrainingLogs, getPublicSparringVideos } = await import('../lib/api');
            const { data: logsData, error: logsError } = await getTrainingLogs(user.id);

            console.log('Activity logs fetched:', logsData?.length || 0);

            if (logsError) throw logsError;

            const combinedLogs = logsData || [];

            const recentVids = await getPublicSparringVideos(5, user.id);
            setRecentVideos(recentVids);

            const cachedResult = localStorage.getItem(`ai_analysis_result_${user.id}`);
            if (cachedResult) {
                try {
                    setDeepAnalysis(JSON.parse(cachedResult));
                } catch (e) {
                    console.error("Failed to parse cached analysis", e);
                }
            }

            // We already have combined logs from the fixed getTrainingLogs
            setLogs(combinedLogs as any);

            if (combinedLogs.length > 0) {
                console.log('Running rule-based analysis for', combinedLogs.length, 'entries');
                try {
                    setReadiness(analyzeReadiness(combinedLogs as any));
                    setBalance(analyzeBalance(combinedLogs as any));
                    setMomentum(analyzeMomentum(combinedLogs as any));
                    setBlindSpots(identifyBlindSpots(combinedLogs as any));
                    setRadarData(calculateRadarStats(combinedLogs as any));
                } catch (analysisErr) {
                    console.error('Core analysis failed:', analysisErr);
                }
            }

        } catch (err: any) {
            console.error('Error loading AI Coach data:', err);
            setError('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleRunAnalysis = async () => {
        if (!user || analysisCooldown) return;

        // Use standard logs state which is already combined
        if (logs.length === 0) {
            console.log('No logs to analyze deeply');
            return;
        }

        setIsAnalyzingDeeply(true);
        console.log('Starting deep analysis with Gemini...');
        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
            console.log('[Debug] Loaded API Key length:', apiKey?.length);
            if (!apiKey) {
                console.error('Gemini API Key missing');
                setIsAnalyzingDeeply(false);
                return;
            }

            const userProfile = {
                name: user.user_metadata?.name || 'User',
                belt: user.user_metadata?.belt || 'White'
            };

            // Fetch REAL available content for recommendation anchoring
            const { getCourses, getRoutines } = await import('../lib/api');
            const [coursesData, routinesData] = await Promise.all([
                getCourses(15), // Top 15 courses
                getRoutines()   // All routines
            ]);

            const availableContent = {
                courses: (coursesData || []).map(c => ({ id: c.id, title: c.title, category: c.category })),
                routines: (routinesData || []).map(r => ({ id: r.id, title: r.title }))
            };

            // 1. Data Partitioning (Hybrid System)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentLogs = logs.filter(l => new Date(l.date) >= thirtyDaysAgo);
            const olderLogs = logs.filter(l => new Date(l.date) < thirtyDaysAgo);

            // 2. Generate Historical Summary (Compression)
            const historicalStats = olderLogs.reduce((acc, l) => {
                l.techniques?.forEach(t => acc.techniques.add(t));
                return acc;
            }, { techniques: new Set<string>() });

            const historicalBalance = olderLogs.length > 0 ? analyzeBalance(olderLogs) : null;

            const historicalSummary = {
                totalSessions: olderLogs.length,
                dominantTechniques: Array.from(historicalStats.techniques).slice(0, 5),
                avgTopPossession: historicalBalance?.topRatio || 0,
                avgSubmissionRate: historicalBalance ? Math.round(historicalBalance.attack * 0.8) : 0,
                periodDays: olderLogs.length > 0
                    ? Math.ceil((new Date().getTime() - new Date(olderLogs[olderLogs.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))
                    : 0
            };

            const result = await analyzeUserDeeply(
                recentLogs,
                historicalSummary,
                recentVideos,
                userProfile,
                apiKey,
                availableContent
            );
            if (result) {
                console.log('Deep analysis successful:', result.styleProfile.identity);
                setDeepAnalysis(result);
                // Save timestamp and result
                const now = new Date().toISOString();
                localStorage.setItem(`ai_analysis_last_run_${user.id}`, now);
                localStorage.setItem(`ai_analysis_result_${user.id}`, JSON.stringify(result));

                // Update cooldown state immediately
                setAnalysisCooldown("24시간 후 가능"); // This will be updated by checkAnalysisCooldown on next render if needed
            } else {
                console.warn('Gemini returned null result');
            }
        } catch (err: any) {
            console.error('Deep analysis error:', err);
            // Show detailed error
            setError(`분석 오류: ${err.message || '알 수 없는 오류'}`);
        } finally {
            setIsAnalyzingDeeply(false);
        }
    };

    if (loading) return <LoadingScreen message="데이터를 분석하고 있습니다..." />;
    if (error) return <ErrorScreen error={error} onRetry={fetchData} />;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans pb-32">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-violet-500" />
                        <h1 className="text-base font-bold tracking-tight text-white">AI COACH</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-screen-xl mx-auto px-4 pt-24 space-y-6">

                {/* 1. HERO: Combat Profile Card */}
                <section className="relative bg-[#09090b] border border-zinc-800 rounded-[32px] p-8 md:p-12 shadow-2xl relative group">
                    {/* Dynamic Background Gradient based on Style */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-black to-black opacity-80" />
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

                    <div className="relative z-10">
                        {/* Header Label */}
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3 opacity-70">
                                <div className="w-8 h-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                    <Brain className="w-4 h-4 text-violet-400" />
                                </div>
                                <span className="text-xs font-bold tracking-[0.2em] text-violet-400 uppercase">AI Combat Analysis</span>
                            </div>

                            {analysisCooldown && (
                                <div className="px-4 py-1.5 rounded-full bg-zinc-900/50 border border-white/5 text-[10px] font-bold text-zinc-500 flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    다음 분석 가능: {analysisCooldown}
                                </div>
                            )}
                        </div>

                        {/* CONTENT CONTAINER */}
                        <div className="flex flex-col lg:flex-row gap-12 lg:items-end">

                            {/* LEFT: MASSIVE TYPOGRAPHY IDENTITY */}
                            <div className="flex-1 lg:max-w-[60%] relative z-10">
                                <div className="space-y-6">
                                    {deepAnalysis ? (
                                        <>
                                            <div className="relative z-[100] max-w-full">
                                                <div className="text-zinc-500 text-[10px] font-black mb-3 tracking-[0.4em] uppercase opacity-70">Your Fighting Style</div>
                                                <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter uppercase transform -skew-x-2 drop-shadow-[0_20px_50px_rgba(139,92,246,0.3)]">
                                                    <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-zinc-500 drop-shadow-sm mr-3">
                                                        {deepAnalysis.styleProfile.identity.split(' ').slice(0, -1).join(' ') || 'BJJ'}
                                                    </span>
                                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-500">
                                                        {deepAnalysis.styleProfile.identity.split(' ').slice(-1)}
                                                    </span>
                                                </h1>
                                            </div>

                                            <div className="h-0.5 w-32 bg-gradient-to-r from-violet-600 to-transparent my-10" />

                                            <p className="text-zinc-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl bg-zinc-950/30 backdrop-blur-sm p-6 rounded-2xl border border-white/5 shadow-2xl">
                                                {deepAnalysis.styleProfile.description}
                                            </p>

                                            {/* POSSESSION & SUBMISSION STATS - Unified with Home Widget */}
                                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                                <div className="flex items-center justify-between gap-4 px-5 py-4 bg-zinc-900/50 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-colors group/stat">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover/stat:bg-violet-500/20 transition-colors">
                                                            <Target className="w-5 h-5 text-violet-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Top Possession</div>
                                                            <div className="text-2xl font-black text-white italic">
                                                                {deepAnalysis?.styleProfile?.fingerprint?.topPossession !== undefined
                                                                    ? `${deepAnalysis.styleProfile.fingerprint.topPossession}%`
                                                                    : (balance ? `${balance.topRatio}%` : '0%')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 px-5 py-4 bg-zinc-900/50 rounded-2xl border border-white/10 hover:border-violet-500/30 transition-colors group/stat">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 group-hover/stat:bg-violet-500/20 transition-colors">
                                                            <Zap className="w-5 h-5 text-violet-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Submission Rate</div>
                                                            <div className="text-2xl font-black text-white italic">
                                                                {deepAnalysis?.styleProfile?.fingerprint?.submissionRate !== undefined
                                                                    ? `${deepAnalysis.styleProfile.fingerprint.submissionRate}%`
                                                                    : (balance ? `${Math.round(balance.attack * 0.8)}%` : '0%')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Summary Footer - Refined Icons & Layout */}
                                            <div className="pt-10 flex flex-wrap gap-4 items-center">
                                                <div className="group relative">
                                                    <div className="absolute inset-0 bg-emerald-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                                                    <span className="relative flex items-center px-5 py-2.5 rounded-2xl bg-[#0F1712] border border-emerald-500/20 text-emerald-400 font-bold text-sm shadow-xl transition-transform hover:scale-105">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 animate-pulse" />
                                                        강점: {deepAnalysis.styleProfile.strength}
                                                    </span>
                                                </div>
                                                <div className="group relative">
                                                    <div className="absolute inset-0 bg-amber-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
                                                    <span className="relative flex items-center px-5 py-2.5 rounded-2xl bg-[#1A160F] border border-amber-500/20 text-amber-400 font-bold text-sm shadow-xl transition-transform hover:scale-105">
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 mr-3 animate-pulse" />
                                                        보완: {deepAnalysis.styleProfile.weakness}
                                                    </span>
                                                </div>
                                                {deepAnalysis.styleProfile.similarPro && (
                                                    <span className="flex items-center px-5 py-2.5 rounded-2xl bg-zinc-900 border border-white/5 text-zinc-400 font-bold text-sm shadow-xl hover:bg-zinc-800 transition-colors cursor-default">
                                                        <Sparkles className="w-4 h-4 mr-2 text-violet-400 font-bold" />
                                                        유사 프로: {deepAnalysis.styleProfile.similarPro}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-8 py-10">
                                            <div>
                                                <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-zinc-800 leading-[0.9] tracking-tighter uppercase italic transform -skew-x-6 select-none pr-32 mr-8">
                                                    ANALYZING...
                                                </h1>
                                            </div>

                                            <div className="space-y-4 max-w-md">
                                                <div className="flex items-center gap-3">
                                                    {isAnalyzingDeeply ? (
                                                        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                                    ) : logs.length === 0 ? (
                                                        <AlertTriangle className="w-6 h-6 text-amber-500" />
                                                    ) : (
                                                        <Sparkles className="w-6 h-6 text-violet-500 animate-pulse" />
                                                    )}
                                                    <span className="font-bold text-xl text-zinc-300">
                                                        {isAnalyzingDeeply
                                                            ? "스타일 정밀 분석 중..."
                                                            : logs.length === 0
                                                                ? "분석 데이터 없음"
                                                                : analysisCooldown
                                                                    ? `다음 분석까지 ${analysisCooldown}`
                                                                    : error || deepAnalysis === null
                                                                        ? "분석 대기 중 (클릭하여 시작)"
                                                                        : "데이터 로딩 중..."}
                                                    </span>
                                                </div>

                                                {(error || (!isAnalyzingDeeply && !deepAnalysis && logs.length > 0)) && (
                                                    <button
                                                        onClick={handleRunAnalysis}
                                                        className="inline-flex items-center px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-600/20 hover:-translate-y-0.5 active:translate-y-0"
                                                    >
                                                        <Sparkles className="w-4 h-4 mr-2" /> 분석 수동 시작하기
                                                    </button>
                                                )}

                                                {logs.length === 0 && (
                                                    <a href="/journal" className="inline-flex items-center px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-violet-600/25 hover:-translate-y-1">
                                                        첫 번째 수련 일지 기록하기 <ChevronRight className="w-4 h-4 ml-2" />
                                                    </a>
                                                )}

                                                <p className="text-zinc-500 text-sm">
                                                    {isAnalyzingDeeply ? "AI가 수련 패턴과 스타일을 분석하고 있습니다." :
                                                        logs.length === 0 ? "나만의 전투 프로필을 완성하려면 데이터가 필요합니다." :
                                                            "잠시만 기다려주세요."}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* RIGHT: RADAR CHART (Integrated visually but secondary) */}
                            <div className="flex-1 w-full flex justify-center lg:justify-end relative z-0">
                                <div className="relative w-full max-w-[400px] aspect-square">
                                    {/* Chart Glow */}
                                    <div className="absolute inset-0 bg-violet-500/10 blur-3xl rounded-full" />

                                    {(() => {
                                        const displayData = deepAnalysis?.styleProfile?.fingerprint ? [
                                            { subject: '스탠딩', A: deepAnalysis.styleProfile.fingerprint.Standing || 10, fullMark: 100 },
                                            { subject: '가드', A: deepAnalysis.styleProfile.fingerprint.Guard || 10, fullMark: 100 },
                                            { subject: '패스', A: deepAnalysis.styleProfile.fingerprint.Passing || 10, fullMark: 100 },
                                            { subject: '사이드', A: deepAnalysis.styleProfile.fingerprint.Side || 10, fullMark: 100 },
                                            { subject: '마운트', A: deepAnalysis.styleProfile.fingerprint.Mount || 10, fullMark: 100 },
                                            { subject: '백', A: deepAnalysis.styleProfile.fingerprint.Back || 10, fullMark: 100 },
                                        ] : radarData;

                                        return displayData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={displayData}>
                                                    <PolarGrid stroke="#27272a" strokeDasharray="3 3" />
                                                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 12, fontWeight: 700 }} />
                                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                                    <Radar
                                                        name="My Stats"
                                                        dataKey="A"
                                                        stroke="#8b5cf6"
                                                        strokeWidth={4}
                                                        fill="#8b5cf6"
                                                        fillOpacity={0.5}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                                                        labelStyle={{ color: '#e4e4e7', fontWeight: 'bold' }}
                                                        itemStyle={{ color: '#a78bfa' }}
                                                    />
                                                </RadarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full border border-zinc-800/50 rounded-full bg-black/20 backdrop-blur-sm">
                                                <PieChart className="w-12 h-12 text-zinc-700 mb-2 opacity-50" />
                                                <p className="text-zinc-600 font-bold text-sm">NOT ENOUGH DATA</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. Dashboard Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                    {/* A. Readiness & Prescription (Span 7) */}
                    <div className="md:col-span-12 lg:col-span-7 space-y-6 h-full flex flex-col">
                        {/* Readiness */}
                        <div className="bg-[#13111C] border border-white/5 rounded-3xl p-6 md:p-8">
                            <h3 className="text-zinc-400 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Activity className="w-4 h-4" /> Today's Readiness
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 relative overflow-hidden group hover:border-violet-500/20 transition-colors">
                                    <div className="relative z-10">
                                        <div className="text-zinc-500 text-xs font-bold mb-1">CONSISTENCY</div>
                                        <div className="text-3xl font-black text-white italic">
                                            {logs.length === 0 || !readiness ? "데이터 없음" : `${readiness.consistencyScore}%`}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-2 font-medium">Last 30 Days</div>
                                    </div>
                                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                                        <CheckCircle2 className="w-24 h-24 text-white" />
                                    </div>
                                </div>
                                <div className="bg-zinc-900/50 rounded-2xl p-5 border border-white/5 relative overflow-hidden group hover:border-red-500/20 transition-colors">
                                    <div className="relative z-10">
                                        <div className="text-zinc-500 text-xs font-bold mb-1">INJURY RISKS</div>
                                        <div className="text-3xl font-black text-white italic">
                                            {logs.length === 0 ? "데이터 없음" : deepAnalysis?.styleProfile.identity ? "LOW" : "ANALYZING"}
                                        </div>
                                        <div className="text-xs text-zinc-500 mt-2 font-medium">Based on recent load</div>
                                    </div>
                                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
                                        <Activity className="w-24 h-24 text-red-500" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Prescription Card */}
                        <div className="bg-[#13111C] border border-white/5 rounded-3xl p-6 md:p-8 md:min-h-[300px] flex-1 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-zinc-400 font-bold flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Zap className="w-4 h-4" /> AI Prescription
                                </h3>
                            </div>

                            <div className="flex-1">
                                {deepAnalysis ? (
                                    <div className="space-y-6 animate-in fade-in duration-500">
                                        <div className="p-5 rounded-2xl bg-gradient-to-br from-violet-900/10 to-transparent border border-violet-500/10">
                                            <p className="text-violet-200 text-lg font-medium leading-relaxed italic">
                                                "{deepAnalysis.prescription.summary}"
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                                                <div className="text-zinc-500 text-xs font-bold uppercase mb-1">Recommended Drills</div>
                                                <div className="text-2xl font-black text-white">{deepAnalysis.prescription.drillDurationMinutes}<span className="text-sm font-medium text-zinc-500 ml-1">mins</span></div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-zinc-900/50 border border-white/5">
                                                <div className="text-zinc-500 text-xs font-bold uppercase mb-1">Sparring Focus</div>
                                                <div className="text-2xl font-black text-white">{deepAnalysis.prescription.sparringRounds}<span className="text-sm font-medium text-zinc-500 ml-1">rounds</span></div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="text-zinc-500 text-xs font-bold uppercase">Focus Areas</div>
                                            <div className="flex flex-wrap gap-2">
                                                {deepAnalysis.prescription.focusAreas?.map((area: string, i: number) => (
                                                    <span key={i} className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold border border-zinc-700">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 min-h-[200px]">
                                        <Brain className="w-12 h-12 opacity-20" />
                                        <p className="text-sm font-medium">분석 결과가 나오면 맞춤 처방이 표시됩니다.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* B. Balance & Momentum (Span 5) */}
                    <div className="md:col-span-12 lg:col-span-5 space-y-6 h-full flex flex-col">
                        {/* Game Balance */}
                        <div className="bg-[#13111C] border border-white/5 rounded-3xl p-6 md:p-8">
                            <h3 className="text-zinc-400 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Swords className="w-4 h-4" /> Game Balance (Att/Def)
                            </h3>
                            {logs.length > 0 ? (
                                <div className="space-y-6">
                                    <div className="h-4 bg-zinc-800 rounded-full overflow-hidden flex relative">
                                        <div
                                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-600"
                                            style={{ width: `${balance?.attack || 0}%` }}
                                        />
                                        <div className="absolute top-1/2 left-3 -translate-y-1/2 text-[10px] font-black text-white drop-shadow-md">
                                            ATTACK {balance?.attack || 0}%
                                        </div>
                                        <div className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-black text-zinc-400">
                                            DEFENSE {balance?.defense || 0}%
                                        </div>
                                    </div>
                                    <p className="text-zinc-400 text-sm leading-relaxed">
                                        {(balance?.attack || 0) > 60 ? "공격적인 성향이 강합니다. 방어 밸런스를 조금 더 신경 써보세요." :
                                            (balance?.defense || 0) > 60 ? "방어 위주의 플레이를 하고 있습니다. 공격 시도 횟수를 늘려보세요." :
                                                "공격과 방어의 균형이 매우 좋습니다."}
                                    </p>
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center text-zinc-600 text-sm font-bold bg-zinc-900/30 rounded-xl">
                                    데이터 필요
                                </div>
                            )}
                        </div>

                        {/* Momentum Chart */}
                        <div className="bg-[#13111C] border border-white/5 rounded-3xl p-6 md:p-8">
                            <div className="flex items-center gap-2 mb-6 group cursor-help relative">
                                <TrendingUp className="w-4 h-4 text-zinc-500" />
                                <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">주간 성장 모멘텀</h3>
                                <div className="hidden group-hover:block absolute bottom-full left-0 mb-2 w-64 p-3 bg-zinc-800/90 backdrop-blur-md border border-zinc-700 rounded-xl z-50 shadow-xl">
                                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                                        지난 4주간의 수련 빈도와 강도를 분석하여 산출된 성장 가속도 지수입니다. 80점 이상을 유지하면 실력이 빠르게 향상됩니다.
                                    </p>
                                </div>
                            </div>
                            {logs.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="flex items-end gap-2">
                                        <span className={`text-4xl font-black italic ${momentum?.trend === 'up' ? 'text-emerald-500' : momentum?.trend === 'down' ? 'text-rose-500' : 'text-zinc-400'}`}>
                                            {momentum?.score || 0}
                                        </span>
                                        <span className="text-zinc-500 text-sm font-bold mb-2">/ 100</span>
                                    </div>
                                    <p className="text-zinc-400 text-sm">
                                        {momentum?.trend === 'up' ? "훌륭합니다! 수련 빈도가 증가하고 있습니다." :
                                            momentum?.trend === 'down' ? "최근 수련 빈도가 줄어들었습니다. 다시 힘을 내세요!" :
                                                "꾸준한 페이스를 유지하고 있습니다."}
                                    </p>
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center text-zinc-600 text-sm font-bold bg-zinc-900/30 rounded-xl">
                                    데이터 필요
                                </div>
                            )}
                        </div>

                        {/* NEW: AI Combat Simulation (Sparring Mission) */}
                        <div className="bg-[#13111C] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden group hover:border-violet-500/30 transition-colors flex-1">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Swords className="w-32 h-32 text-violet-500 transform rotate-12" />
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-zinc-400 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                    <Swords className="w-4 h-4" /> AI Sparring Mission
                                </h3>

                                {deepAnalysis?.sparringMission ? (
                                    <div className="space-y-4">
                                        <div>
                                            <div className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1">TARGET SCENARIO</div>
                                            <div className="text-xl font-black text-white italic">
                                                "{deepAnalysis.sparringMission.scenario}"
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                                <div className="text-[10px] text-zinc-500 font-bold mb-1">OPPONENT STYLE</div>
                                                <div className="text-sm font-bold text-zinc-300">{deepAnalysis.sparringMission.opponentStyle}</div>
                                            </div>
                                            <div className="bg-zinc-900/50 p-3 rounded-xl border border-white/5">
                                                <div className="text-[10px] text-zinc-500 font-bold mb-1">DURATION</div>
                                                <div className="text-sm font-bold text-zinc-300">{deepAnalysis.sparringMission.duration}</div>
                                            </div>
                                        </div>

                                        <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/30 p-3 rounded-lg border border-white/5">
                                            <span className="text-violet-400 font-bold mr-1">Why?</span>
                                            {deepAnalysis.sparringMission.reason}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-24 flex items-center justify-center text-zinc-600 text-sm font-bold">
                                        분석 후 미션이 제공됩니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Blind Spots Tags - Moved here */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-3">집중 관리 필요 (30일 미수련)</div>
                    {blindSpots.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {blindSpots.map((spot, i) => (
                                <span key={i} className="px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs font-bold border border-zinc-700">
                                    {spot}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-zinc-500 text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>모든 영역을 골고루 수련 중입니다.</span>
                        </div>
                    )}
                </div>

                {/* 3. AI 맞춤 추천 콘텐츠 (Moved to Bottom & Refined) */}
                {deepAnalysis && deepAnalysis.recommendedContent && (
                    <section className="space-y-6 pt-6 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-violet-500" />
                                AI 맞춤 추천
                            </h3>
                            <button className="text-xs font-bold text-zinc-500 hover:text-white transition-colors">
                                전체 보기
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                deepAnalysis.recommendedContent.courses?.[0] ? { ...deepAnalysis.recommendedContent.courses[0], type: 'course', label: 'Course' } : null,
                                deepAnalysis.recommendedContent.routines?.[0] ? { ...deepAnalysis.recommendedContent.routines[0], type: 'routine', label: 'Routine' } : null,
                                deepAnalysis.recommendedContent.chains?.[0] ? { ...deepAnalysis.recommendedContent.chains[0], type: 'chain', label: 'Chain' } : null
                            ].filter(Boolean).map((item: any, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        if (item.id) {
                                            navigate(`/${item.type}/${item.id}`);
                                        }
                                    }}
                                    className={`group flex flex-col bg-[#13111C] border border-white/5 rounded-2xl overflow-hidden transition-all ${item.id ? 'hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-900/10 hover:-translate-y-1 cursor-pointer' : 'opacity-80'}`}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-video bg-zinc-900 overflow-hidden">
                                        {item.thumbnail ? (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.title}
                                                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                <Play className="w-10 h-10 text-zinc-700" />
                                            </div>
                                        )}

                                        {/* Badges */}
                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider backdrop-blur-md border ${item.type === 'course' ? 'bg-blue-500/20 border-blue-500/30 text-blue-100' :
                                                item.type === 'routine' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' :
                                                    'bg-amber-500/20 border-amber-500/30 text-amber-100'
                                                }`}>
                                                {item.label}
                                            </span>
                                        </div>

                                        {/* Duration */}
                                        {item.duration && (
                                            <div className="absolute bottom-3 right-3 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white flex items-center gap-1">
                                                <Clock className="w-2.5 h-2.5" /> {item.duration}
                                            </div>
                                        )}

                                        {/* Play Overlay */}
                                        {item.id && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                                                    <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h4 className="text-white font-bold text-lg leading-snug mb-2 group-hover:text-violet-300 transition-colors line-clamp-2">
                                            {item.title}
                                        </h4>

                                        {item.instructor && (
                                            <div className="text-xs text-zinc-500 font-medium mb-4">
                                                {item.instructor}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-4 border-t border-white/5">
                                            <div className="flex items-start gap-2">
                                                <Sparkles className="w-3.5 h-3.5 text-violet-500 mt-0.5 shrink-0" />
                                                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                                                    <span className="text-violet-400 font-bold block mb-0.5">AI Recommendation</span>
                                                    {item.reason.replace(/^[🚨🚀⚡️🔥]\s*/, '')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};


