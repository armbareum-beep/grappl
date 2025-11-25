import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCreatorCourses, calculateCreatorEarnings } from '../../lib/api';
import { Course } from '../../types';
import { MobileTabSelector } from '../../components/MobileTabSelector';
import { Button } from '../../components/Button';
import { BookOpen, DollarSign, Eye, TrendingUp, Clock, Package, MessageSquare, LayoutDashboard } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState<'overview' | 'marketing' | 'feedback' | 'requests' | 'payout' | 'analytics' | 'performance'>('overview');

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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    const totalViews = courses.reduce((sum, course) => sum + course.views, 0);

    const TABS = [
        { id: 'overview', label: '대시보드', icon: LayoutDashboard },
        { id: 'marketing', label: '마케팅 (번들 & 쿠폰)', icon: Package },
        { id: 'feedback', label: '1:1 피드백 설정', icon: MessageSquare },
        { id: 'requests', label: '피드백 요청', icon: MessageSquare },
        { id: 'analytics', label: '수익 분석', icon: TrendingUp },
        { id: 'performance', label: '강좌별 성과', icon: Eye },
        { id: 'payout', label: '정산 설정', icon: DollarSign },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* ... header ... */}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* ... stats cards ... */}

                {/* Tab Navigation - Desktop */}
                {/* Tab Navigation - Desktop */}
                <div className="hidden md:flex space-x-4 border-b border-slate-200 mb-8 overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-slate-500 hover:text-slate-700'
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

                {/* Tab Content */}
                {activeTab === 'overview' ? (
                    <>
                        {/* Courses List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">내 강좌</h2>
                                <div className="flex gap-3">
                                    <Link to="/creator/drills/new">
                                        <Button variant="outline">드릴 만들기</Button>
                                    </Link>
                                    <Link to="/creator/create-routine">
                                        <Button>루틴 만들기</Button>
                                    </Link>
                                    <Link to="/creator/courses/new">
                                        <Button>새 강좌 만들기</Button>
                                    </Link>
                                </div>
                            </div>

                            {courses.length === 0 ? (
                                <div className="text-center py-12">
                                    <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">아직 개설한 강좌가 없습니다.</p>
                                    <Link to="/creator/courses/new">
                                        <Button>첫 강좌 만들기</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {courses.map((course) => (
                                        <div key={course.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg text-slate-900">{course.title}</h3>
                                                    <p className="text-sm text-slate-600 mt-1">{course.description}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                        <span>조회수: {course.views.toLocaleString()}</span>
                                                        <span>가격: {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}</span>
                                                    </div>
                                                </div>
                                                <Link to={`/creator/courses/${course.id}/edit`}>
                                                    <Button variant="outline" size="sm">수정</Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                ) : activeTab === 'marketing' ? (
                    <MarketingTab />
                ) : activeTab === 'feedback' ? (
                    <FeedbackSettingsTab />
                ) : activeTab === 'requests' ? (
                    <FeedbackRequestsTab />
                ) : activeTab === 'analytics' ? (
                    <RevenueAnalyticsTab />
                ) : activeTab === 'performance' ? (
                    <CoursePerformanceTab />
                ) : (
                    <PayoutSettingsTab />
                )}
            </div>
        </div>
    );
};
