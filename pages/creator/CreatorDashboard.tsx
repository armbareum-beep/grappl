import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCreatorCourses, calculateCreatorEarnings, getDrills, deleteDrill, getAllCreatorLessons, deleteLesson, getUserCreatedRoutines, deleteRoutine } from '../../lib/api';
import { Course, Drill, Lesson, DrillRoutine } from '../../types';
import { MobileTabSelector } from '../../components/MobileTabSelector';
import { Button } from '../../components/Button';
import { BookOpen, DollarSign, Eye, TrendingUp, Package, MessageSquare, LayoutDashboard, PlayCircle, Grid, Trash2, Layers } from 'lucide-react';
import { MarketingTab } from '../../components/creator/MarketingTab';
import { FeedbackSettingsTab } from '../../components/creator/FeedbackSettingsTab';
import { FeedbackRequestsTab } from '../../components/creator/FeedbackRequestsTab';
import { RevenueAnalyticsTab } from '../../components/creator/RevenueAnalyticsTab';
import { CoursePerformanceTab } from '../../components/creator/CoursePerformanceTab';
import { PayoutSettingsTab } from '../../components/creator/PayoutSettingsTab';
import { LoadingScreen } from '../../components/LoadingScreen';

export const CreatorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [earnings, setEarnings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'content' | 'materials' | 'marketing' | 'feedback' | 'analytics' | 'payout'>('content');

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                const [coursesData, drillsData, lessonsData, routinesData, earningsData] = await Promise.all([
                    getCreatorCourses(user.id),
                    getDrills(user.id),
                    getAllCreatorLessons(user.id),
                    getUserCreatedRoutines(user.id),
                    calculateCreatorEarnings(user.id)
                ]);

                console.log('Dashboard Data:', { coursesData, drillsData, lessonsData, routinesData, earningsData });

                setCourses(coursesData);
                setDrills(drillsData.data || []);
                setLessons(lessonsData || []);
                setRoutines(routinesData.data || []);
                if ('data' in earningsData) {
                    setEarnings(earningsData.data);
                }
            } catch (error) {
                console.error('Error fetching creator data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user]);

    const handleDeleteDrill = async (drillId: string, drillTitle: string) => {
        if (!confirm(`"${drillTitle}" 드릴을 삭제하시겠습니까?`)) return;

        const { error } = await deleteDrill(drillId);
        if (error) {
            alert('드릴 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh drills list
        setDrills(drills.filter(d => d.id !== drillId));
    };

    const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
        if (!confirm(`"${lessonTitle}" 레슨을 삭제하시겠습니까?`)) return;

        const { error } = await deleteLesson(lessonId);
        if (error) {
            alert('레슨 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh lessons list
        setLessons(lessons.filter(l => l.id !== lessonId));
    };

    const handleDeleteRoutine = async (routineId: string, routineTitle: string) => {
        if (!confirm(`"${routineTitle}" 루틴을 삭제하시겠습니까?`)) return;

        const { error } = await deleteRoutine(routineId);
        if (error) {
            alert('루틴 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh routines list
        setRoutines(routines.filter(r => r.id !== routineId));
    };

    if (loading) {
        return <LoadingScreen message="크리에이터 대시보드를 불러오는 중..." />;
    }

    const totalViews = courses.reduce((sum, course) => sum + course.views, 0);

    const TABS = [
        { id: 'content', label: '내 콘텐츠', icon: LayoutDashboard },
        { id: 'materials', label: '재료 (레슨 & 드릴)', icon: Package },
        { id: 'marketing', label: '마케팅', icon: TrendingUp },
        { id: 'feedback', label: '피드백', icon: MessageSquare },
        { id: 'analytics', label: '분석', icon: Eye },
        { id: 'payout', label: '정산', icon: DollarSign },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">총 조회수</h3>
                            <Eye className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{totalViews.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">총 수익</h3>
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">
                            ₩{earnings?.totalRevenue?.toLocaleString() || '0'}
                        </p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">개설 강좌</h3>
                            <BookOpen className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{courses.length}개</p>
                    </div>
                </div>

                {/* Tab Navigation - Desktop */}
                <div className="hidden md:flex space-x-4 border-b border-slate-800 mb-8 overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Navigation - Mobile Dropdown */}
                <MobileTabSelector
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as any)}
                />

                {/* Tab Content */}
                {activeTab === 'content' ? (
                    <div className="space-y-8">
                        {/* Courses Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 강좌</h2>
                                    <p className="text-slate-400 text-sm mt-1">학생들에게 판매할 강좌를 관리하세요</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={async () => {
                                            try {
                                                const res = await fetch('https://grappl-video-backend.onrender.com/version');
                                                if (res.ok) {
                                                    const data = await res.json();
                                                    alert(`서버 연결 성공!\n버전: ${data.version}\n시간: ${data.timestamp}\n(정상 작동 중입니다)`);
                                                } else {
                                                    alert('서버 연결 실패 (HTTP Error)');
                                                }
                                            } catch (e) {
                                                alert('서버 연결 실패 (Network Error)\n' + e);
                                            }
                                        }}
                                    >
                                        📡 서버 상태 확인
                                    </Button>
                                    <Link to="/creator/courses/new">
                                        <Button>새 강좌 만들기</Button>
                                    </Link>
                                </div>
                            </div>

                            {courses.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">아직 개설한 강좌가 없습니다.</p>
                                    <Link to="/creator/courses/new">
                                        <Button variant="outline">첫 강좌 만들기</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {courses.map((course) => (
                                        <div key={course.id} className="border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all bg-slate-800/50">
                                            <div className="p-4 flex items-center gap-4">
                                                <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-lg text-white truncate">{course.title}</h3>
                                                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 whitespace-nowrap flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <BookOpen className="w-4 h-4" />
                                                            {course.lessonCount || 0} 레슨
                                                        </span>
                                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-4 h-4" />
                                                            {course.views.toLocaleString()} 조회
                                                        </span>
                                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                        <span className="text-blue-400 font-medium">
                                                            {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <Link to={`/creator/courses/${course.id}/edit`}>
                                                    <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-700">관리</Button>
                                                </Link>
                                            </div>

                                            {(course.lessonCount || 0) > 0 && (
                                                <div className="border-t border-slate-800 bg-slate-950/30 px-4 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
                                                    <span className="text-xs font-medium text-slate-500 flex-shrink-0">포함된 레슨:</span>
                                                    {Array.from({ length: Math.min(course.lessonCount || 0, 5) }).map((_, idx) => (
                                                        <div key={idx} className="flex-shrink-0 px-3 py-1 bg-slate-800 rounded text-xs text-slate-400 border border-slate-700">
                                                            레슨 {idx + 1}
                                                        </div>
                                                    ))}
                                                    {(course.lessonCount || 0) > 5 && (
                                                        <span className="text-xs text-slate-500 flex-shrink-0">
                                                            +{(course.lessonCount || 0) - 5} 더보기
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Routines Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 루틴</h2>
                                    <p className="text-slate-400 text-sm mt-1">드릴을 조합한 훈련 루틴을 관리하세요</p>
                                </div>
                                <Link to="/creator/create-routine">
                                    <Button>새 루틴 만들기</Button>
                                </Link>
                            </div>

                            {routines.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <Layers className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">아직 개설한 루틴이 없습니다.</p>
                                    <Link to="/creator/create-routine">
                                        <Button variant="outline">첫 루틴 만들기</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {routines.map((routine) => (
                                        <div key={routine.id} className="border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all bg-slate-800/50">
                                            <div className="p-4 flex items-center gap-4">
                                                <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 relative group">
                                                    {routine.thumbnailUrl ? (
                                                        <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                            <Layers className="w-8 h-8 text-slate-600" />
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-lg text-white truncate">{routine.title}</h3>
                                                    <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 whitespace-nowrap flex-wrap">
                                                        <span className="flex items-center gap-1">
                                                            <Grid className="w-4 h-4" />
                                                            {routine.drillCount || 0} 드릴
                                                        </span>
                                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                        <span className="flex items-center gap-1">
                                                            <Eye className="w-4 h-4" />
                                                            {routine.views.toLocaleString()} 조회
                                                        </span>
                                                        <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                        <span className="text-blue-400 font-medium">
                                                            {routine.price === 0 ? '무료' : `₩${routine.price.toLocaleString()}`}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                                                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'materials' ? (
                    <div className="space-y-8">
                        {/* Lessons Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 레슨</h2>
                                    <p className="text-slate-400 text-sm mt-1">강좌를 구성하는 개별 레슨 영상입니다</p>
                                </div>
                                <Link to="/creator/lessons/new">
                                    <Button>새 레슨 업로드</Button>
                                </Link>
                            </div>

                            {lessons.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <PlayCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">아직 업로드한 레슨이 없습니다.</p>
                                    <Link to="/creator/lessons/new">
                                        <Button variant="outline">첫 레슨 업로드</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-lg border border-slate-800 overflow-hidden">
                                    {lessons.map((lesson, index) => (
                                        <div
                                            key={lesson.id}
                                            className={`flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors ${index !== lessons.length - 1 ? 'border-b border-slate-800' : ''
                                                }`}
                                        >
                                            <Link to={`/lessons/${lesson.id}`} className="flex items-center gap-4 flex-1 min-w-0 group">
                                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors text-slate-500">
                                                    <PlayCircle className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                                        {lesson.title}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                        <span>{new Date(lesson.createdAt).toLocaleDateString()}</span>
                                                        <span>&bull;</span>
                                                        <span>{lesson.durationMinutes}분</span>
                                                    </div>
                                                </div>
                                            </Link>

                                            <div className="flex items-center gap-4 ml-4">
                                                <div className="text-sm text-slate-400 w-20 text-right">
                                                    {lesson.views?.toLocaleString() || 0} 조회
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteLesson(lesson.id, lesson.title);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Drills Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 드릴</h2>
                                    <p className="text-slate-400 text-sm mt-1">루틴을 구성하는 짧은 훈련 영상입니다</p>
                                </div>
                                <Link to="/creator/drills/new">
                                    <Button>새 드릴 업로드</Button>
                                </Link>
                            </div>

                            {drills.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <Grid className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">아직 업로드한 드릴이 없습니다.</p>
                                    <Link to="/creator/drills/new">
                                        <Button variant="outline">첫 드릴 업로드</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="bg-slate-800/30 rounded-lg border border-slate-800 overflow-hidden">
                                    {drills.map((drill, index) => (
                                        <div
                                            key={drill.id}
                                            className={`flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors group ${index !== drills.length - 1 ? 'border-b border-slate-800' : ''
                                                }`}
                                        >
                                            <Link to={`/drills/${drill.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors text-slate-500">
                                                    <PlayCircle className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                                        {drill.title}
                                                    </h3>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                        <span>{new Date(drill.createdAt).toLocaleDateString()}</span>
                                                        <span>&bull;</span>
                                                        <span>{drill.durationMinutes}분</span>
                                                    </div>
                                                </div>
                                            </Link>

                                            <div className="flex items-center gap-4 ml-4">
                                                <div className="text-sm text-slate-400 w-20 text-right">
                                                    {drill.views.toLocaleString()} 조회
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        handleDeleteDrill(drill.id, drill.title);
                                                    }}
                                                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'marketing' ? (
                    <MarketingTab />
                ) : activeTab === 'feedback' ? (
                    <div className="space-y-8">
                        <FeedbackSettingsTab />
                        <div className="border-t border-slate-800 pt-8">
                            <h3 className="text-xl font-bold text-white mb-6">피드백 요청 목록</h3>
                            <FeedbackRequestsTab />
                        </div>
                    </div>
                ) : activeTab === 'analytics' ? (
                    <div className="space-y-8">
                        <RevenueAnalyticsTab />
                        <div className="border-t border-slate-800 pt-8">
                            <h3 className="text-xl font-bold text-white mb-6">강좌별 성과</h3>
                            <CoursePerformanceTab />
                        </div>
                    </div>
                ) : (
                    <PayoutSettingsTab />
                )}
            </div>
        </div >
    );
};
