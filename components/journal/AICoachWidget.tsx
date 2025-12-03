import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bot, Sparkles, Brain, AlertTriangle, ChevronRight, Terminal, PlayCircle, Lock, Dumbbell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TrainingLog } from '../../types';

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

// 💡 Grappl 내부 강의 DB (Mock)
const COURSE_DATABASE = {
    escape: [
        { id: 'esc-101', title: '화이트벨트 생존 가이드: 이스케이프 마스터', instructor: '김관장', price: '₩45,000', thumb: 'bg-blue-900' },
        { id: 'esc-adv', title: '불리한 포지션 뒤집기: 리버설의 정석', instructor: '이주짓수', price: '₩55,000', thumb: 'bg-indigo-900' }
    ],
    submission: [
        { id: 'sub-arm', title: '암바의 모든 것: 50가지 셋업', instructor: '정서브', price: '₩49,000', thumb: 'bg-red-900' },
        { id: 'sub-choke', title: '기절하거나 탭치거나: 초크 마스터리', instructor: '강초크', price: '₩50,000', thumb: 'bg-orange-900' }
    ]
};

// 💡 Grappl 훈련 루틴 DB (Mock)
const ROUTINE_DATABASE = {
    conditioning: [
        { id: 'cond-1', title: '주짓떼로를 위한 30일 코어 강화', difficulty: '초급', duration: '4주', thumb: 'bg-emerald-900' },
        { id: 'cond-2', title: '폭발적인 브릿지 파워 만들기', difficulty: '중급', duration: '2주', thumb: 'bg-teal-900' }
    ],
    drills: [
        { id: 'drill-pass', title: '가드 패스 무한 반복 드릴', difficulty: '중급', duration: '10분/일', thumb: 'bg-cyan-900' },
        { id: 'drill-guard', title: '절대 뚫리지 않는 가드 리텐션', difficulty: '상급', duration: '20분/일', thumb: 'bg-sky-900' }
    ]
};

export const AICoachWidget: React.FC<AICoachWidgetProps> = ({ logs = [], autoRun = false, isLocked = false }) => {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const hasRunRef = useRef(false);

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

    // 🧠 분석 엔진 (Rule-based AI)
    const analyzeLogs = useCallback(() => {
        if (isAnalyzing || isLocked) return; // 이미 분석 중이거나 잠겨있으면 중단

        setIsAnalyzing(true);
        setShowResult(false);
        setDisplayedText('');

        // 데이터 부족 시 처리
        if (logs.length === 0) {
            setTimeout(() => {
                setIsAnalyzing(false);
                setShowResult(true);
                setResults([]);
                typeWriterEffect('분석할 데이터가 없습니다. 스파링 복기를 먼저 작성해주세요.');
            }, 1000);
            return;
        }

        // 1. 키워드 카운팅
        const keywords = {
            escape: 0,
            guard: 0,
            submission: 0,
            pass: 0,
            tap: 0
        };

        logs.forEach(log => {
            const text = (log.notes + ' ' + (log.techniques?.join(' ') || '')).toLowerCase();
            if (text.includes('이스케이프') || text.includes('탈출') || text.includes('escape')) keywords.escape++;
            if (text.includes('가드') || text.includes('guard')) keywords.guard++;
            if (text.includes('암바') || text.includes('초크') || text.includes('submission') || text.includes('탭승')) keywords.submission++;
            if (text.includes('패스') || text.includes('pass')) keywords.pass++;
            if (text.includes('탭패') || text.includes('패배') || text.includes('tap')) keywords.tap++;
        });

        // 2. 결과 생성 로직
        const newResults: AnalysisResult[] = [];

        // [약점 분석] 탭이 많으면 -> 기초 체력/코어 루틴 추천 (루틴)
        if (keywords.tap > 2) {
            const routine = ROUTINE_DATABASE.conditioning[0];
            newResults.push({
                type: 'weakness',
                message: '기초 체력과 방어가 필요합니다',
                detail: '최근 방어적인 상황에서 체력 소모가 큽니다. 코어 강화 루틴을 시작해보세요.',
                recommendedRoutine: {
                    id: routine.id,
                    title: routine.title,
                    difficulty: routine.difficulty,
                    duration: routine.duration,
                    thumbnail: routine.thumb
                }
            });
        }
        // 이스케이프 기술 부족 -> 이스케이프 강의 추천 (강의)
        else if (keywords.escape < 2) {
            const course = COURSE_DATABASE.escape[0];
            newResults.push({
                type: 'weakness',
                message: '위기 탈출 능력을 키워보세요',
                detail: '안전한 포지션 회복이 중요합니다. 이스케이프 전문 강의를 추천합니다.',
                recommendedCourse: {
                    id: course.id,
                    title: course.title,
                    instructor: course.instructor,
                    thumbnail: course.thumb,
                    price: course.price
                }
            });
        }

        // [강점 분석] 서브미션 많음 -> 심화 강의 추천 (강의)
        if (keywords.submission > 3) {
            const course = COURSE_DATABASE.submission[0];
            newResults.push({
                type: 'strength',
                message: '피니셔(Finisher) 본능이 살아있습니다',
                detail: '결정력이 아주 좋습니다! 더 다양한 셋업을 배워 무기를 늘려보세요.',
                recommendedCourse: {
                    id: course.id,
                    title: course.title,
                    instructor: course.instructor,
                    thumbnail: course.thumb,
                    price: course.price
                }
            });
        }

        // [제안] 패스 부족 -> 패스 드릴 루틴 추천 (루틴)
        if (keywords.pass < 2) {
            const routine = ROUTINE_DATABASE.drills[0];
            newResults.push({
                type: 'suggestion',
                message: '탑 플레이를 강화할 시간',
                detail: '가드 패스 움직임을 몸에 익히기 위해 매일 10분씩 드릴을 수행해보세요.',
                recommendedRoutine: {
                    id: routine.id,
                    title: routine.title,
                    difficulty: routine.difficulty,
                    duration: routine.duration,
                    thumbnail: routine.thumb
                }
            });
        }

        // 결과 부족 시 기본 루틴 추천
        if (newResults.length === 0) {
            const routine = ROUTINE_DATABASE.conditioning[0];
            newResults.push({
                type: 'suggestion',
                message: '꾸준한 수련을 위한 기초 다지기',
                detail: '부상 방지와 롱런을 위해 기초 컨디셔닝 루틴을 추천합니다.',
                recommendedRoutine: {
                    id: routine.id,
                    title: routine.title,
                    difficulty: routine.difficulty,
                    duration: routine.duration,
                    thumbnail: routine.thumb
                }
            });
        }

        setResults(newResults.slice(0, 3));

        setTimeout(() => {
            setIsAnalyzing(false);
            setShowResult(true);
            typeWriterEffect(`최근 ${logs.length}개의 수련 일지를 분석했습니다. 현재 회원님에게 필요한 맞춤형 솔루션입니다.`);
        }, 1500);
    }, [logs, typeWriterEffect, isAnalyzing, isLocked]);

    // Auto Run Effect
    useEffect(() => {
        if (autoRun && logs.length > 0 && !hasRunRef.current && !isLocked) {
            hasRunRef.current = true;
            analyzeLogs();
        }
    }, [autoRun, logs, analyzeLogs, isLocked]);

    return (
        <div className="w-full bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-xl mb-8 relative">
            {/* Header */}
            <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-700 flex justify-between items-center relative z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
                        <Bot className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            AI 코치
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-indigo-300 text-[10px] border border-indigo-500/30">BETA</span>
                        </h3>
                        <p className="text-slate-400 text-xs">수련 데이터를 분석하여 맞춤형 강의와 루틴을 추천합니다.</p>
                    </div>
                </div>

                {!showResult && !isAnalyzing && !isLocked && (
                    <button
                        onClick={analyzeLogs}
                        className="group flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shadow-lg shadow-indigo-600/20"
                    >
                        <Sparkles className="w-4 h-4 group-hover:animate-spin" />
                        <span className="font-semibold text-sm">분석 시작</span>
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 min-h-[200px] relative">
                {isLocked && (
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center text-center p-6">
                        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-4 shadow-lg">
                            <Lock className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Pro 멤버십 전용 기능</h3>
                        <p className="text-slate-400 mb-6 max-w-sm">
                            AI 코치가 수련 일지를 분석하여 개인 맞춤형 피드백과 성장 솔루션을 제공합니다.
                        </p>
                        <button className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105">
                            Pro로 업그레이드하고 분석 받기
                        </button>
                    </div>
                )}

                {/* Initial State */}
                {!isAnalyzing && !showResult && (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-center opacity-60">
                        <Brain className="w-16 h-16 text-slate-600 mb-4" />
                        <p className="text-slate-400 max-w-md">
                            "요즘 어떤 기술이 부족한가요?"<br />
                            쌓여있는 수련 일지를 분석해 당신에게 딱 맞는<br />
                            <span className="text-indigo-400 font-bold">강의와 훈련 루틴</span>을 추천해드립니다.
                        </p>
                    </div>
                )}

                {/* Analyzing State */}
                {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                        <div className="relative w-20 h-20 mb-6">
                            <div className="absolute inset-0 border-4 border-slate-700 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                            <Bot className="absolute inset-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
                        </div>
                        <div className="space-y-2 text-center">
                            <p className="text-indigo-400 font-mono text-sm animate-pulse">ANALYZING_PATTERNS...</p>
                            <p className="text-slate-500 text-xs">기술 키워드 추출 및 약점 분석 중</p>
                        </div>
                    </div>
                )}

                {/* Result State */}
                {showResult && (
                    <div className="animate-fade-in">
                        {/* AI Message */}
                        <div className="flex gap-4 mb-8 bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <Terminal className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
                            <p className="text-slate-300 text-sm leading-relaxed font-mono">
                                {displayedText}
                                <span className="inline-block w-2 h-4 bg-indigo-500 ml-1 animate-pulse align-middle"></span>
                            </p>
                        </div>

                        {/* Insight Cards */}
                        <div className="grid gap-4">
                            {results.map((result, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-800 rounded-xl p-5 border border-slate-700 hover:border-indigo-500/50 transition-colors group animate-slide-up"
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`p-2 rounded-lg ${result.type === 'weakness' ? 'bg-red-500/10 text-red-400' :
                                            result.type === 'strength' ? 'bg-green-500/10 text-green-400' :
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            {result.type === 'weakness' ? <AlertTriangle className="w-5 h-5" /> :
                                                result.type === 'strength' ? <TrendingUpIcon /> :
                                                    <Sparkles className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className={`font-bold mb-1 ${result.type === 'weakness' ? 'text-red-400' :
                                                result.type === 'strength' ? 'text-green-400' :
                                                    'text-blue-400'
                                                }`}>
                                                {result.message}
                                            </h4>
                                            <p className="text-slate-400 text-sm">{result.detail}</p>
                                        </div>
                                    </div>

                                    {/* Recommended Course Section */}
                                    {result.recommendedCourse && (
                                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 ml-14 flex gap-4 hover:bg-slate-900 transition-colors cursor-pointer group/course">
                                            {/* Thumbnail Placeholder */}
                                            <div className={`w-24 h-16 rounded-md ${result.recommendedCourse.thumbnail} flex-shrink-0`}></div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded border border-indigo-500/30">AI 추천 강의</span>
                                                    <span className="text-slate-500 text-xs">• {result.recommendedCourse.instructor}</span>
                                                </div>
                                                <h5 className="text-white font-bold text-sm truncate group-hover/course:text-indigo-400 transition-colors">
                                                    {result.recommendedCourse.title}
                                                </h5>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-slate-400 text-xs">{result.recommendedCourse.price}</span>
                                                    <Link
                                                        to={`/courses/${result.recommendedCourse.id}`}
                                                        className="flex items-center gap-1 text-indigo-400 text-xs font-bold hover:underline"
                                                    >
                                                        강의 보러가기 <ChevronRight className="w-3 h-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recommended Routine Section */}
                                    {result.recommendedRoutine && (
                                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 ml-14 flex gap-4 hover:bg-slate-900 transition-colors cursor-pointer group/routine">
                                            <div className={`w-24 h-16 rounded-md ${result.recommendedRoutine.thumbnail} flex items-center justify-center flex-shrink-0`}>
                                                <Dumbbell className="w-6 h-6 text-white/50" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded border border-emerald-500/30">AI 추천 루틴</span>
                                                    <span className="text-slate-500 text-xs">• {result.recommendedRoutine.difficulty}</span>
                                                </div>
                                                <h5 className="text-white font-bold text-sm truncate group-hover/routine:text-emerald-400 transition-colors">
                                                    {result.recommendedRoutine.title}
                                                </h5>
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
    );
};

const TrendingUpIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
    </svg>
);
