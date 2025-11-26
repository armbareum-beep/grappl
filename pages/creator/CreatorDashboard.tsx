import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCreatorCourses, calculateCreatorEarnings } from '../../lib/api';
import { Course } from '../../types';
import { MobileTabSelector } from '../../components/MobileTabSelector';
import { Button } from '../../components/Button';
import { BookOpen, DollarSign, Eye, TrendingUp, Package, MessageSquare, LayoutDashboard, PlayCircle, Grid } from 'lucide-react';
import { MarketingTab } from '../../components/creator/MarketingTab';
import { FeedbackSettingsTab } from '../../components/creator/FeedbackSettingsTab';
import { FeedbackRequestsTab } from '../../components/creator/FeedbackRequestsTab';
import { RevenueAnalyticsTab } from '../../components/creator/RevenueAnalyticsTab';
import { CoursePerformanceTab } from '../../components/creator/CoursePerformanceTab';
import { PayoutSettingsTab } from '../../components/creator/PayoutSettingsTab';

export const CreatorDashboard: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [earnings, setEarnings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'content' | 'materials' | 'marketing' | 'feedback' | 'analytics' | 'payout'>('content');

    useEffect(() => {
        async function fetchData() {
            if (!user) return;

            try {
                const [coursesData, earningsData] = await Promise.all([
                    getCreatorCourses(user.id),
                    calculateCreatorEarnings(user.id)
                ]);

                setCourses(coursesData);
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">로딩 중...</p>
                </div>
            </div>
        );
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
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 강좌</h2>
                                    <p className="text-slate-400 text-sm mt-1">학생들에게 판매할 강좌를 관리하세요</p>
                                </div>
                                <Link to="/creator/courses/new">
                                    <Button>새 강좌 만들기</Button>
                                </Link>
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
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
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

                                            {course.lessonCount > 0 && (
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
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 루틴</h2>
                                    <p className="text-slate-400 text-sm mt-1">드릴을 조합한 훈련 루틴을 관리하세요</p>
                                </div>
                                <Link to="/creator/create-routine">
                                    <Button>새 루틴 만들기</Button>
                                </Link>
                            </div>

                            <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 mb-4">아직 개설한 루틴이 없습니다.</p>
                                <Link to="/creator/create-routine">
                                    <Button variant="outline">첫 루틴 만들기</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'materials' ? (
                    <div className="space-y-8">
                        {/* Lessons Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 레슨</h2>
                                    <p className="text-slate-400 text-sm mt-1">강좌를 구성하는 개별 레슨 영상입니다</p>
                                </div>
                                <Link to="/creator/lessons/new">
                                    <Button>새 레슨 업로드</Button>
                                </Link>
                            </div>

                            <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                <PlayCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 mb-4">아직 업로드한 레슨이 없습니다.</p>
                                <Link to="/creator/lessons/new">
                                    <Button variant="outline">첫 레슨 업로드</Button>
                                </Link>
                            </div>
                        </div>

                        {/* Drills Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 드릴</h2>
                                    <p className="text-slate-400 text-sm mt-1">루틴을 구성하는 짧은 훈련 영상입니다</p>
                                </div>
                                <Link to="/creator/drills/new">
                                    <Button>새 드릴 업로드</Button>
                                </Link>
                            </div>

                            <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                <Grid className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-slate-500 mb-4">아직 업로드한 드릴이 없습니다.</p>
                                <Link to="/creator/drills/new">
                                    <Button variant="outline">첫 드릴 업로드</Button>
                                </Link>
                            </div>
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
        </div>
    );
};
