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
        { id: 'overview', label: '대시보드', icon: LayoutDashboard },
        { id: 'marketing', label: '마케팅 (번들 & 쿠폰)', icon: Package },
        { id: 'feedback', label: '1:1 피드백 설정', icon: MessageSquare },
        { id: 'requests', label: '피드백 요청', icon: MessageSquare },
        { id: 'analytics', label: '수익 분석', icon: TrendingUp },
        { id: 'performance', label: '강좌별 성과', icon: Eye },
        { id: 'payout', label: '정산 설정', icon: DollarSign },
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
                {activeTab === 'overview' ? (
                    <>
                        {/* Courses List */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white">내 강좌</h2>
                                <div className="flex gap-3">
                                    <Link to="/creator/drills/new">
                                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">드릴 만들기</Button>
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
                                    <BookOpen className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">아직 개설한 강좌가 없습니다.</p>
                                    <Link to="/creator/courses/new">
                                        <Button>첫 강좌 만들기</Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {courses.map((course) => (
                                        <div key={course.id} className="border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors bg-slate-800/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg text-white">{course.title}</h3>
                                                    <p className="text-sm text-slate-400 mt-1">{course.description}</p>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                                                        <span>조회수: {course.views.toLocaleString()}</span>
                                                        <span>가격: {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}</span>
                                                    </div>
                                                </div>
                                                <Link to={`/creator/courses/${course.id}/edit`}>
                                                    <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-700">수정</Button>
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
