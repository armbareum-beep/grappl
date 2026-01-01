import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Sparkles, Brain, AlertTriangle, ChevronRight, Terminal, Lock, Dumbbell, Clock, PlayCircle } from 'lucide-react';
import { Modal } from '../Modal';
import { Link, useNavigate } from 'react-router-dom';
import { TrainingLog, Course, DrillRoutine } from '../../types';
import { analyzeSparringLogs } from '../../lib/gemini';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { getCourses, getDrillRoutines } from '../../lib/api';

interface AICoachWidgetProps {
    logs?: TrainingLog[];
    autoRun?: boolean;
    isLocked?: boolean;
}

interface AnalysisResult {
    type: 'strength' | 'weakness' | 'suggestion';
    message: string;
    detail: string;
    recommendedCourse?: {
        id: string;
        title: string;
        instructor: string;
        thumbnail: string;
        price: string;
    };
    recommendedRoutine?: {
        id: string;
        title: string;
        difficulty: string;
        duration: string;
        thumbnail: string;
    };
}

export const AICoachWidget: React.FC<AICoachWidgetProps> = ({ logs = [], autoRun = false, isLocked = false }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [results, setResults] = useState<AnalysisResult[]>([]);

    // Data State
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [availableRoutines, setAvailableRoutines] = useState<DrillRoutine[]>([]);

    const hasRunRef = useRef(false);
    const { success } = useToast();
    const { user } = useAuth();
    const navigate = useNavigate();

    // Fetch Real Data on Mount
    useEffect(() => {
        const fetchContent = async () => {
            try {
                const [courses, routines] = await Promise.all([
                    getCourses(),
                    getDrillRoutines()
                ]);
                if (courses && Array.isArray(courses)) setAvailableCourses(courses);
                if (routines && (routines as any).data) {
                    setAvailableRoutines((routines as any).data);
                } else if (Array.isArray(routines)) {
                    setAvailableRoutines(routines);
                }
            } catch (e) {
                console.error("Failed to fetch recommendation content", e);
            }
        };
        fetchContent();
    }, []);

    const typeWriterEffect = useCallback((text: string) => {
        let i = 0;
        const speed = 30;
        setDisplayedText(''); // 초기화
        const interval = setInterval(() => {
            if (i < text.length) {
                setDisplayedText((prev) => prev + text.charAt(i));
                i++;
            } else {
                clearInterval(interval);
            }
        }, speed);
    }, []);

    // Load Cached Results on Mount
    useEffect(() => {
        const lastRunDate = localStorage.getItem('ai_last_run_date');
        const today = new Date().toISOString().split('T')[0];
        const cachedResults = localStorage.getItem('gemini_recommendations');

        if (lastRunDate === today && cachedResults) {
            try {
                const parsed = JSON.parse(cachedResults);
                if (parsed && parsed.length > 0) {
                    setResults(parsed);
                    setShowResult(true);
                    setDisplayedText('이전에 분석된 결과를 불러왔습니다.');
                    hasRunRef.current = true;
                }
            } catch (e) {
                console.error('Failed to parse cached results', e);
            }
        }
    }, []);

    // 🧠 분석 엔진 (Hybrid: Gemini AI + Rule-based Fallback)
    const analyzeLogs = useCallback(async () => {
        if (isAnalyzing || isLocked) return;

        if (!user) {
            if (!autoRun) {
                setShowLoginModal(true);
            }
            return;
        }

        // Rate Limiting Check
        const lastRunDate = localStorage.getItem('ai_last_run_date');
        const today = new Date().toISOString().split('T')[0];

        if (lastRunDate === today) {
            console.log('Daily limit reached');
            if (!autoRun) {
                // Instead of toast error, show Limit Modal
                setShowLimitModal(true);
            }
            return;
        }

        setIsAnalyzing(true);
        setShowResult(false);
        setDisplayedText('');

        if (logs.length === 0) {
            setTimeout(() => {
                setIsAnalyzing(false);
                setShowResult(true);
                setResults([]);
                typeWriterEffect('분석할 데이터가 없습니다. 스파링 복기를 먼저 작성해주세요.');
            }, 1000);
            return;
        }

        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

        try {
            let newResults: AnalysisResult[] = [];

            if (apiKey) {
                // Real AI Analysis
                const aiResults = await analyzeSparringLogs(logs, apiKey);

                if (aiResults && aiResults.length > 0) {
                    newResults = aiResults.map(res => {
                        let rec: any = {};

                        // Dynamic Mapping using Real Data (Courses)
                        if (res.recommendationCategory && availableCourses.length > 0) {
                            const keyword = res.recommendationCategory.toLowerCase();
                            const matchedCourse = availableCourses.find(c =>
                                c.title.toLowerCase().includes(keyword) ||
                                (c.category && c.category.toLowerCase().includes(keyword))
                            );

                            const targetCourse = matchedCourse || availableCourses[0];

                            rec.recommendedCourse = {
                                id: targetCourse.id,
                                title: targetCourse.title,
                                instructor: targetCourse.creatorName || 'Grappl Instructor',
                                thumbnail: targetCourse.thumbnailUrl,
                                price: targetCourse.price > 0 ? `₩${targetCourse.price.toLocaleString()}` : 'Free'
                            };
                        }

                        // Dynamic Mapping using Real Data (Routines)
                        if (!rec.recommendedCourse && availableRoutines.length > 0) {
                            const keyword = res.recommendationCategory ? res.recommendationCategory.toLowerCase() : '';
                            const matchedRoutine = availableRoutines.find(r =>
                                r.title.toLowerCase().includes(keyword) ||
                                (r.category && r.category.toLowerCase().includes(keyword))
                            );

                            const targetRoutine = matchedRoutine || availableRoutines[0];

                            rec.recommendedRoutine = {
                                id: targetRoutine.id,
                                title: targetRoutine.title,
                                difficulty: targetRoutine.difficulty,
                                duration: `${targetRoutine.totalDurationMinutes || 10}분`,
                                thumbnail: 'bg-slate-800'
                            };
                        }

                        // Ensure we always return a result matching the interface
                        return {
                            type: res.type,
                            message: res.message,
                            detail: res.detail,
                            ...rec
                        };
                    });
                }
            }

            // Fallback if no API key or API failed (Empty results)
            if (newResults.length === 0) {
                if (apiKey) console.warn('Gemini returned empty results, using fallback.');

                // Fallback Logic with Real Data
                const keywords = { escape: 0, guard: 0, submission: 0, pass: 0, tap: 0 };
                logs.forEach(log => {
                    const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase();
                    if (text.includes('이스케이프') || text.includes('탈출') || text.includes('escape')) keywords.escape++;
                    if (text.includes('가드') || text.includes('guard')) keywords.guard++;
                    if (text.includes('암바') || text.includes('초크') || text.includes('submission') || text.includes('탭승')) keywords.submission++;
                    if (text.includes('패스') || text.includes('pass')) keywords.pass++;
                    if (text.includes('탭패') || text.includes('패배') || text.includes('tap')) keywords.tap++;
                });

                if (availableCourses.length > 0) {
                    newResults.push({
                        type: 'suggestion',
                        message: '기초부터 탄탄하게',
                        detail: '비기너를 위한 추천 강의를 확인해보세요.',
                        recommendedCourse: {
                            id: availableCourses[0].id,
                            title: availableCourses[0].title,
                            instructor: availableCourses[0].creatorName || 'Grappl',
                            thumbnail: availableCourses[0].thumbnailUrl,
                            price: 'Free'
                        }
                    });
                }

                if (availableRoutines.length > 0) {
                    newResults.push({
                        type: 'strength',
                        message: '매일 10분, 꾸준한 성장의 힘',
                        detail: '가벼운 드릴로 하루를 시작해보세요.',
                        recommendedRoutine: {
                            id: availableRoutines[0].id,
                            title: availableRoutines[0].title,
                            difficulty: (availableRoutines[0].difficulty as any) || 'Beginner',
                            duration: `${availableRoutines[0].totalDurationMinutes || 10}분`,
                            thumbnail: 'bg-slate-800'
                        }
                    });
                }
            }

            setResults(newResults);
            setIsAnalyzing(false);
            setShowResult(true);

            // Save to LocalStorage for Rate Limiting & Home Screen Sync
            if (newResults.length > 0) {
                localStorage.setItem('ai_last_run_date', new Date().toISOString().split('T')[0]);
                localStorage.setItem('gemini_recommendations', JSON.stringify(newResults));

                // Award XP for Analysis
                try {
                    const { awardTrainingXP } = await import('../../lib/api');
                    if (logs.length > 0) {
                        const xpResult = await awardTrainingXP(logs[0].userId, 'sparring_review', 30) as any;
                        if (xpResult?.data?.xpEarned > 0) {
                            success(`AI 분석 완료! +${xpResult.data.xpEarned} XP 획득`);
                        }
                    }
                } catch (err) {
                    console.error("XP Award failed", err);
                }
            }

            typeWriterEffect(apiKey
                ? `AI 코치가 ${logs.length}개의 수련 일지를 정밀 분석했습니다.`
                : `최근 ${logs.length}개의 수련 일지를 분석했습니다. (API 키 미설정으로 기본 분석 제공)`);

        } catch (e) {
            console.error('Analysis failed', e);
            setIsAnalyzing(false);
        }
    }, [logs, typeWriterEffect, isAnalyzing, isLocked, autoRun, success, availableCourses, availableRoutines]);

    // Auto Run Effect
    useEffect(() => {
        if (autoRun && logs.length > 0 && !hasRunRef.current && !isLocked) {
            // Check rate limit silently before auto-running
            const lastRunDate = localStorage.getItem('ai_last_run_date');
            const today = new Date().toISOString().split('T')[0];
            if (lastRunDate !== today) {
                hasRunRef.current = true;
                analyzeLogs();
            }
        }
    }, [autoRun, logs, analyzeLogs, isLocked]);

    // Close Modal Handler
    const handleCloseModal = () => {
        setShowLimitModal(false);
        // Force show results if present
        if (results.length > 0) {
            setShowResult(true);
        }
    };

    return (
        <div className="relative group overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-900/40 via-purple-900/40 to-slate-900/80 p-6 shadow-lg shadow-violet-500/10 cursor-default transition-all hover:border-violet-400/50 hover:shadow-violet-500/20">
            {/* Background Effects from Home */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-violet-400/30 transition-colors"></div>

            {!showResult ? (
                <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                                <Bot className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base group-hover:text-violet-200 transition-colors">AI 코치 분석</h3>
                                <p className="text-xs text-violet-200/70">Gemini Pro가 플레이를 분석합니다</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-violet-500/20 border border-violet-400/30 text-[10px] font-bold text-violet-300 animate-pulse">
                            LIVE
                        </div>
                    </div>

                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            </div>
                            <span>서브미션 기회 포착</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            </div>
                            <span>포지션 점유율 분석</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-300">
                            <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            </div>
                            <span>개선점 및 드릴 추천</span>
                        </div>
                    </div>

                    <button
                        className="w-full py-3 rounded-lg bg-white text-violet-900 font-bold text-sm hover:bg-violet-50 transition-colors flex items-center justify-center gap-2 shadow-lg group-hover:translate-y-[-2px]"
                        onClick={analyzeLogs}
                        disabled={isAnalyzing}
                    >
                        {isAnalyzing ? (
                            <>
                                <Brain className="w-4 h-4 text-violet-600 animate-spin" />
                                <span className="text-violet-600">분석중...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-violet-600" />
                                <span className="text-violet-600">지금 분석 받아보기</span>
                            </>
                        )}
                    </button>
                </div>
            ) : (
                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-lg font-bold text-white">분석 결과</h3>
                        </div>
                        <button
                            onClick={() => setShowResult(false)}
                            className="text-violet-100 hover:text-white text-sm underline decoration-violet-300/50"
                        >
                            닫기
                        </button>
                    </div>
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-600/20 transition-all duration-500 pointer-events-none"></div>

                    <div className="relative z-10">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                        AI 코치 분석
                                        {isLocked && <Lock className="w-3 h-3 text-slate-500" />}
                                    </h3>
                                    <p className="text-xs text-slate-400">
                                        {isLocked ? 'PRO 멤버십 전용 기능' : 'Gemini Pro 기반 플레이 분석'}
                                    </p>
                                </div>
                            </div>

                            {!showResult && !isAnalyzing && (
                                <button
                                    onClick={analyzeLogs}
                                    disabled={isLocked}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                                ${isLocked
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-white text-slate-900 hover:bg-violet-50 hover:text-violet-600 shadow-md hover:shadow-lg'
                                        }`}
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {isLocked ? 'PRO 전용 기능' : '분석 시작'}
                                </button>
                            )}
                        </div>

                        {isAnalyzing && (
                            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                                <div className="relative w-16 h-16 mx-auto">
                                    <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin"></div>
                                    <Brain className="absolute inset-0 m-auto w-6 h-6 text-violet-400 animate-pulse" />
                                </div>
                                <p className="text-sm font-medium text-slate-300 animate-pulse">
                                    최근 수련 데이터를 분석하고 있습니다...
                                </p>
                            </div>
                        )}

                        {showResult && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Terminal Style Output */}
                                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs relative overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2 text-slate-500 border-b border-slate-800 pb-2">
                                        <Terminal className="w-3 h-3" />
                                        <span>ANALYSIS_LOG_OUTPUT</span>
                                    </div>
                                    <p className="text-violet-400 leading-relaxed min-h-[40px]">
                                        {displayedText}
                                        <span className="inline-block w-1.5 h-3 bg-violet-500 ml-1 animate-pulse" />
                                    </p>
                                </div>

                                {/* Analysis Cards */}
                                <div className="grid gap-3">
                                    {results.map((result, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-violet-500/30 transition-all animate-in slide-in-from-bottom-2 duration-500"
                                            style={{ animationDelay: `${idx * 150}ms` }}
                                        >
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`p-2 rounded-lg ${result.type === 'strength' ? 'bg-emerald-500/10 text-emerald-400' :
                                                    result.type === 'weakness' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-blue-500/10 text-blue-400'
                                                    }`}>
                                                    {result.type === 'strength' ? <TrendingUpIcon /> :
                                                        result.type === 'weakness' ? <AlertTriangle className="w-5 h-5" /> :
                                                            <Sparkles className="w-5 h-5" />}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <h4 className={`font-bold text-sm ${result.type === 'strength' ? 'text-emerald-400' :
                                                            result.type === 'weakness' ? 'text-red-400' :
                                                                'text-blue-400'
                                                            }`}>
                                                            {result.message}
                                                        </h4>
                                                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded">
                                                            {result.type}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 leading-relaxed">
                                                        {result.detail}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Item Recommendation */}
                                            {result.recommendedCourse && (
                                                <div className="mt-3 pl-10">
                                                    <div className="bg-slate-900 rounded-lg p-2 flex items-center gap-3 border border-slate-800 hover:border-violet-500/50 transition-colors group/card cursor-pointer">
                                                        <div
                                                            className="w-10 h-10 rounded bg-slate-800 bg-cover bg-center flex items-center justify-center flex-shrink-0 group-hover/card:scale-105 transition-transform"
                                                            style={{ backgroundImage: result.recommendedCourse.thumbnail && result.recommendedCourse.thumbnail.startsWith('http') ? `url(${result.recommendedCourse.thumbnail})` : undefined }}
                                                        >
                                                            {(!result.recommendedCourse.thumbnail || !result.recommendedCourse.thumbnail.startsWith('http')) && <PlayCircle className="w-5 h-5 text-white/80" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] text-violet-400 font-bold mb-0.5">추천 강의</div>
                                                            <div className="text-xs text-white font-bold truncate">{result.recommendedCourse.title}</div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-slate-400 text-xs">{result.recommendedCourse.instructor}</span>
                                                                <Link
                                                                    to={`/courses/${result.recommendedCourse.id}`}
                                                                    className="flex items-center gap-1 text-violet-400 text-xs font-bold hover:underline"
                                                                >
                                                                    보러가기 <ChevronRight className="w-3 h-3" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {result.recommendedRoutine && (
                                                <div className="mt-3 pl-10">
                                                    <div className="bg-slate-900 rounded-lg p-2 flex items-center gap-3 border border-slate-800 hover:border-emerald-500/50 transition-colors group/card cursor-pointer">
                                                        <div
                                                            className="w-10 h-10 rounded bg-slate-800 bg-cover bg-center flex items-center justify-center flex-shrink-0 group-hover/card:scale-105 transition-transform"
                                                            style={{ backgroundImage: result.recommendedRoutine.thumbnail && result.recommendedRoutine.thumbnail.startsWith('http') ? `url(${result.recommendedRoutine.thumbnail})` : undefined }}
                                                        >
                                                            {(!result.recommendedRoutine.thumbnail || !result.recommendedRoutine.thumbnail.startsWith('http')) && <Dumbbell className="w-5 h-5 text-white/80" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[10px] text-emerald-400 font-bold mb-0.5">추천 루틴</div>
                                                            <div className="text-xs text-white font-bold truncate">{result.recommendedRoutine.title}</div>
                                                            <div className="flex items-center justify-between mt-2">
                                                                <span className="text-slate-400 text-xs flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" /> {result.recommendedRoutine.duration}
                                                                </span>
                                                                <Link
                                                                    to={`/routines/${result.recommendedRoutine.id}`}
                                                                    className="flex items-center gap-1 text-emerald-400 text-xs font-bold hover:underline"
                                                                >
                                                                    루틴 시작하기 <ChevronRight className="w-3 h-3" />
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out forwards;
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-slide-up {
                    animation: slide-up 0.5s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
                </div>
            )}

            {/* Limit Reached Modal */}
            <Modal
                isOpen={showLimitModal}
                onClose={handleCloseModal}
                title="분석 완료"
                icon={Bot}
                iconColor="violet"
                footer={
                    <button
                        onClick={handleCloseModal}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20"
                    >
                        결과 확인하기
                    </button>
                }
            >
                <p>
                    이미 오늘 AI 분석을 완료했습니다.<br />
                    비용 절감을 위해 분석은 하루 1회만 제공됩니다.<br />
                    <span className="text-violet-400 font-bold mt-2 block">이전 분석 결과를 다시 보여드릴게요!</span>
                </p>
            </Modal>

            {/* Login Required Modal */}
            <Modal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                title="로그인 필요"
                icon={Lock}
                iconColor="violet"
                footer={
                    <>
                        <button
                            onClick={() => setShowLoginModal(false)}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => navigate('/login')}
                            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/20"
                        >
                            로그인하기
                        </button>
                    </>
                }
            >
                <div>
                    AI 코치 분석은 회원 전용 기능입니다.<br />
                    로그인하고 내 플레이를 분석받아보세요!
                </div>
            </Modal>
        </div>
    );
};

const TrendingUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
