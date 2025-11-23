import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCreatorCourses, calculateCreatorEarnings } from '../../lib/api';
import { Course } from '../../types';
import { BookOpen, DollarSign, Eye, TrendingUp, Clock, Package, MessageSquare } from 'lucide-react';
import { Button } from '../../components/Button';
import { MarketingTab } from '../../components/creator/MarketingTab';
import { FeedbackSettingsTab } from '../../components/creator/FeedbackSettingsTab';
import { FeedbackRequestsTab } from '../../components/creator/FeedbackRequestsTab';
import { PayoutSettingsTab } from '../../components/creator/PayoutSettingsTab';
import { RevenueAnalyticsTab } from '../../components/creator/RevenueAnalyticsTab';
import { CoursePerformanceTab } from '../../components/creator/CoursePerformanceTab';

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

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white">안녕하세요, {user?.user_metadata?.name || '인스트럭터'}님! 👋</h1>
                    <p className="text-blue-100 mt-2">오늘도 멋진 콘텐츠를 기획해보세요.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid md:grid-cols-5 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm">총 강좌</span>
                            <BookOpen className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{courses.length}</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm">총 조회수</span>
                            <Eye className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">{totalViews.toLocaleString()}</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm">시청 시간 (점유율)</span>
                            <Clock className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-2xl font-bold text-slate-900">
                            {earnings?.creatorWatchTime || 0}분
                            <span className="text-sm text-slate-500 font-normal ml-2">
                                ({(earnings?.watchTimeShare * 100 || 0).toFixed(1)}%)
                            </span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">전체 {earnings?.totalWatchTime || 0}분 중</p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm">직접 판매 수익</span>
                            <DollarSign className="w-5 h-5 text-purple-600" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            ₩{earnings?.directRevenue?.toLocaleString() || 0}
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-500 text-sm">구독 수익</span>
                            <TrendingUp className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="text-3xl font-bold text-slate-900">
                            ₩{earnings?.subscriptionRevenue?.toLocaleString() || 0}
                        </p>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-4 border-b border-slate-200 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`pb-4 px-2 text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'overview'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        대시보드
                    </button>
                    <button
                        onClick={() => setActiveTab('marketing')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'marketing'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Package className="w-4 h-4" />
                        마케팅 (번들 & 쿠폰)
                    </button>
                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'feedback'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        1:1 피드백 설정
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'requests'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        피드백 요청
                    </button>
                    <button
                        onClick={() => setActiveTab('analytics')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'analytics'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <TrendingUp className="w-4 h-4" />
                        수익 분석
                    </button>
                    <button
                        onClick={() => setActiveTab('performance')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'performance'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <Eye className="w-4 h-4" />
                        강좌별 성과
                    </button>
                    <button
                        onClick={() => setActiveTab('payout')}
                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'payout'
                            ? 'text-blue-600 border-b-2 border-blue-600'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        <DollarSign className="w-4 h-4" />
                        정산 설정
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' ? (
                    <>
                        {/* Courses List */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-900">내 강좌</h2>
                                <Link to="/creator/courses/new">
                                    <Button>새 강좌 만들기</Button>
                                </Link>
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
