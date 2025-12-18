import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTechniqueDetailData } from '../lib/api-technique-mastery';
import { TechniqueDetailData, MASTERY_LEVEL_NAMES_KO } from '../types';
import { MasteryRing } from '../components/technique/MasteryRing';
import {
    ArrowLeft,
    TrendingUp,
    Calendar,
    Target,
    BookOpen,
    Dumbbell,
    PlaySquare,
    Clock,
    CheckCircle,
    XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export const TechniqueDetailPage: React.FC = () => {
    const { techniqueId } = useParams<{ techniqueId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<TechniqueDetailData | null>(null);

    useEffect(() => {
        if (user && techniqueId) {
            loadData();
        }
    }, [user, techniqueId]);

    const loadData = async () => {
        if (!user || !techniqueId) return;
        setLoading(true);

        const { data: detailData } = await getTechniqueDetailData(user.id, techniqueId);
        if (detailData) {
            setData(detailData);
        }

        setLoading(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">기술을 찾을 수 없습니다</h2>
                    <button
                        onClick={() => navigate('/technique-roadmap')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        로드맵으로 돌아가기
                    </button>
                </div>
            </div>
        );
    }

    const { mastery, technique, relatedCourses, relatedDrills, relatedRoutines, xpHistory, weeklyXpTrend, successRate } = data;

    // Chart data
    const chartData = {
        labels: weeklyXpTrend.map(w => format(new Date(w.week), 'M/d', { locale: ko })),
        datasets: [
            {
                label: 'Weekly XP',
                data: weeklyXpTrend.map(w => w.xp),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(148, 163, 184, 0.1)'
                },
                ticks: {
                    color: 'rgba(148, 163, 184, 0.5)'
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    color: 'rgba(148, 163, 184, 0.5)'
                }
            }
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 py-8 px-4">
            <div className="max-w-5xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/technique-roadmap')}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
                >
                    <ArrowLeft className="w-5 h-5" />
                    로드맵으로 돌아가기
                </button>

                {/* Header */}
                <div className="bg-slate-900 rounded-3xl border border-slate-800 p-8 mb-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                        <MasteryRing
                            level={mastery.masteryLevel}
                            currentXp={mastery.masteryXp}
                            size="xl"
                            animated={true}
                            breathingAnimation={true}
                        />

                        <div className="flex-1">
                            <div className="inline-block px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-bold mb-3">
                                {technique.category}
                            </div>
                            <h1 className="text-4xl font-black text-white mb-2">{technique.name}</h1>
                            {technique.nameEn && (
                                <p className="text-slate-400 mb-4">{technique.nameEn}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                                <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300">
                                    {MASTERY_LEVEL_NAMES_KO[mastery.masteryLevel]}
                                </span>
                                <span className="text-slate-400">
                                    {mastery.masteryXp} XP
                                </span>
                                <span className="text-slate-400">
                                    난이도: {technique.difficulty}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 나의 기술 분석 */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-blue-400" />
                        나의 기술 분석
                    </h2>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-slate-800/50 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">성공률</div>
                            <div className="text-2xl font-bold text-green-400">{successRate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">총 시도</div>
                            <div className="text-2xl font-bold text-white">{mastery.totalAttemptCount}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">성공 횟수</div>
                            <div className="text-2xl font-bold text-blue-400">{mastery.totalSuccessCount}</div>
                        </div>
                        <div className="bg-slate-800/50 rounded-xl p-4">
                            <div className="text-xs text-slate-400 mb-1">마지막 성공</div>
                            <div className="text-sm font-bold text-white">
                                {mastery.lastSuccessDate
                                    ? format(new Date(mastery.lastSuccessDate), 'M/d', { locale: ko })
                                    : '-'}
                            </div>
                        </div>
                    </div>

                    {/* Weekly XP Trend Chart */}
                    <div className="h-64">
                        <Line data={chartData} options={chartOptions} />
                    </div>
                </div>

                {/* 리스타트 할 기술 (Recommended Practice) */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Target className="w-6 h-6 text-purple-400" />
                        추천 훈련
                    </h2>

                    <div className="space-y-6">
                        {/* Recommended Courses */}
                        {relatedCourses.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" />
                                    추천 클래스
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {relatedCourses.map(course => (
                                        <Link
                                            key={course.id}
                                            to={`/courses/${course.id}`}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                                                <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-medium truncate">{course.title}</div>
                                                <div className="text-xs text-slate-400">{course.creatorName}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommended Routines */}
                        {relatedRoutines.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <PlaySquare className="w-4 h-4" />
                                    추천 루틴
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {relatedRoutines.map(routine => (
                                        <Link
                                            key={routine.id}
                                            to={`/routines/${routine.id}`}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                                                <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-medium truncate">{routine.title}</div>
                                                <div className="text-xs text-slate-400">{routine.drillCount}개 드릴</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommended Drills */}
                        {relatedDrills.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                                    <Dumbbell className="w-4 h-4" />
                                    추천 드릴
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {relatedDrills.map(drill => (
                                        <Link
                                            key={drill.id}
                                            to={`/drills/${drill.id}`}
                                            className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                        >
                                            <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden flex-shrink-0">
                                                <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-white font-medium truncate">{drill.title}</div>
                                                <div className="text-xs text-slate-400">{drill.duration}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {relatedCourses.length === 0 && relatedRoutines.length === 0 && relatedDrills.length === 0 && (
                            <p className="text-slate-500 text-center py-8">아직 연결된 콘텐츠가 없습니다.</p>
                        )}
                    </div>
                </div>

                {/* 내 기록 히스토리 */}
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <Clock className="w-6 h-6 text-orange-400" />
                        기록 히스토리
                    </h2>

                    <div className="space-y-2">
                        {xpHistory.length === 0 ? (
                            <p className="text-slate-500 text-center py-8">아직 기록이 없습니다.</p>
                        ) : (
                            xpHistory.slice(0, 20).map(tx => (
                                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.sourceType === 'sparring_success' ? 'bg-green-500/10' :
                                            tx.sourceType === 'course_lesson' ? 'bg-blue-500/10' :
                                                tx.sourceType === 'routine_completion' ? 'bg-purple-500/10' :
                                                    'bg-slate-700'
                                            }`}>
                                            {tx.sourceType === 'sparring_success' && <CheckCircle className="w-4 h-4 text-green-400" />}
                                            {tx.sourceType === 'sparring_attempt' && <XCircle className="w-4 h-4 text-orange-400" />}
                                            {tx.sourceType === 'course_lesson' && <BookOpen className="w-4 h-4 text-blue-400" />}
                                            {tx.sourceType === 'routine_completion' && <PlaySquare className="w-4 h-4 text-purple-400" />}
                                        </div>
                                        <div>
                                            <div className="text-white text-sm font-medium">
                                                {getSourceTypeLabel(tx.sourceType)}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                {format(new Date(tx.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-yellow-400 font-bold">+{tx.xpAmount} XP</div>
                                        {tx.newLevel > tx.oldLevel && (
                                            <div className="text-xs text-green-400">Lv.{tx.oldLevel} → Lv.{tx.newLevel}</div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

function getSourceTypeLabel(sourceType: string): string {
    const labels: Record<string, string> = {
        course_lesson: '강좌 수강',
        routine_completion: '루틴 완료',
        drill_practice: '드릴 연습',
        sparring_success: '스파링 성공',
        sparring_attempt: '스파링 시도',
        training_log: '수련일지 작성',
        feed_post: '피드 포스트',
        instructor_endorsement: '강사 인증',
        manual: '수동 지급'
    };
    return labels[sourceType] || sourceType;
}
