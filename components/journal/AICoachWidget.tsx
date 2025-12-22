import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Sparkles, Brain, AlertTriangle, ChevronRight, Terminal, Lock, Dumbbell, Clock, PlayCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TrainingLog, Course, DrillRoutine } from '../../types';
import { analyzeSparringLogs } from '../../lib/gemini';
import { useToast } from '../../contexts/ToastContext';
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
    const [displayedText, setDisplayedText] = useState('');
    const [results, setResults] = useState<AnalysisResult[]>([]);

    // Data State
    const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
    const [availableRoutines, setAvailableRoutines] = useState<DrillRoutine[]>([]);

    const hasRunRef = useRef(false);
    const { success } = useToast();

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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-600/20 transition-all duration-500 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                AI 코치 분석
                                {isLocked && <Lock className="w-3 h-3 text-slate-500" />}
                            </h3>
                            <p className="text-xs text-slate-400">Gemini Pro 기반 플레이 분석</p>
                        </div>
                    </div>

                    {!showResult && !isAnalyzing && (
                        <button
                            onClick={analyzeLogs}
                            disabled={isLocked}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all
                                ${isLocked
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-white text-slate-900 hover:bg-indigo-50 hover:text-indigo-600 shadow-md hover:shadow-lg'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            {isLocked ? '잠금됨' : '분석 시작'}
                        </button>
                    )}
                </div>

                {isAnalyzing && (
                    <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                            <Brain className="absolute inset-0 m-auto w-6 h-6 text-indigo-400 animate-pulse" />
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
                            <p className="text-indigo-400 leading-relaxed min-h-[40px]">
                                {displayedText}
                                <span className="inline-block w-1.5 h-3 bg-indigo-500 ml-1 animate-pulse" />
                            </p>
                        </div>

                        {/* Analysis Cards */}
                        <div className="grid gap-3">
                            {results.map((result, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 hover:border-indigo-500/30 transition-all animate-in slide-in-from-bottom-2 duration-500"
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
                                            <div className="bg-slate-900 rounded-lg p-2 flex items-center gap-3 border border-slate-800 hover:border-indigo-500/50 transition-colors group/card cursor-pointer">
                                                <div
                                                    className="w-10 h-10 rounded bg-slate-800 bg-cover bg-center flex items-center justify-center flex-shrink-0 group-hover/card:scale-105 transition-transform"
                                                    style={{ backgroundImage: result.recommendedCourse.thumbnail && result.recommendedCourse.thumbnail.startsWith('http') ? `url(${result.recommendedCourse.thumbnail})` : undefined }}
                                                >
                                                    {(!result.recommendedCourse.thumbnail || !result.recommendedCourse.thumbnail.startsWith('http')) && <PlayCircle className="w-5 h-5 text-white/80" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] text-indigo-400 font-bold mb-0.5">추천 강의</div>
                                                    <div className="text-xs text-white font-bold truncate">{result.recommendedCourse.title}</div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-slate-400 text-xs">{result.recommendedCourse.instructor}</span>
                                                        <Link
                                                            to={`/courses/${result.recommendedCourse.id}`}
                                                            className="flex items-center gap-1 text-indigo-400 text-xs font-bold hover:underline"
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

            {/* Limit Reached Modal */}
            {showLimitModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}></div>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6 relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl shadow-indigo-500/10">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mb-4 mx-auto border border-indigo-500/20">
                            <Bot className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white text-center mb-2">분석 완료</h3>
                        <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
                            이미 오늘 AI 분석을 완료했습니다.<br />
                            비용 절감을 위해 분석은 하루 1회만 제공됩니다.<br />
                            <span className="text-indigo-400 font-bold mt-2 block">이전 분석 결과를 다시 보여드릴게요!</span>
                        </p>
                        <button
                            onClick={handleCloseModal}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
                        >
                            결과 확인하기
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const TrendingUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
