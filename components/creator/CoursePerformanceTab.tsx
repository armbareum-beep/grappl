import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getCreatorCourses } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Course } from '../../types';
import { TrendingUp, Eye, DollarSign, Clock } from 'lucide-react';

interface CoursePerformance extends Course {
    directRevenue: number;
    subscriptionRevenue: number;
    totalRevenue: number;
    watchTimeMinutes: number;
    enrollmentCount: number;
}

export const CoursePerformanceTab: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CoursePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'revenue' | 'views' | 'watchTime'>('revenue');

    useEffect(() => {
        if (user) {
            loadCourses();
        }
    }, [user]);

    const loadCourses = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const coursesData = await getCreatorCourses(user.id);

            // Get real performance data for each course
            const performanceData: CoursePerformance[] = await Promise.all(
                coursesData.map(async (course) => {
                    // Get enrollment count
                    const { count: enrollmentCount } = await supabase
                        .from('course_enrollments')
                        .select('*', { count: 'exact', head: true })
                        .eq('course_id', course.id);

                    // Get direct revenue (course purchases)
                    const { data: purchases } = await supabase
                        .from('payments')
                        .select('amount')
                        .eq('mode', 'course')
                        .eq('target_id', course.id)
                        .eq('status', 'completed');

                    const directRevenue = purchases?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

                    // Get watch time for this course's lessons
                    const { data: lessons } = await supabase
                        .from('lessons')
                        .select('id')
                        .eq('course_id', course.id);

                    const lessonIds = lessons?.map(l => l.id) || [];

                    let watchTimeMinutes = 0;
                    if (lessonIds.length > 0) {
                        const { data: watchLogs } = await supabase
                            .from('video_watch_logs')
                            .select('watch_seconds')
                            .in('lesson_id', lessonIds);

                        const totalSeconds = watchLogs?.reduce((sum, log) => sum + (log.watch_seconds || 0), 0) || 0;
                        watchTimeMinutes = Math.floor(totalSeconds / 60);
                    }

                    // Calculate subscription revenue based on watch time share
                    // This is a simplified calculation - actual calculation is done in calculateCreatorEarnings
                    const subscriptionRevenue = 0; // Will be calculated server-side

                    return {
                        ...course,
                        directRevenue,
                        subscriptionRevenue,
                        totalRevenue: directRevenue + subscriptionRevenue,
                        watchTimeMinutes,
                        enrollmentCount: enrollmentCount || 0
                    };
                })
            );

            setCourses(performanceData);
        } catch (error) {
            console.error('Error loading course performance:', error);
        } finally {
            setLoading(false);
        }
    };

    const sortedCourses = [...courses].sort((a, b) => {
        switch (sortBy) {
            case 'revenue':
                return b.totalRevenue - a.totalRevenue;
            case 'views':
                return b.views - a.views;
            case 'watchTime':
                return b.watchTimeMinutes - a.watchTimeMinutes;
            default:
                return 0;
        }
    });

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
    };

    const formatTime = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}시간 ${mins}분`;
    };

    const totalRevenue = courses.reduce((sum, c) => sum + c.totalRevenue, 0);
    const totalViews = courses.reduce((sum, c) => sum + c.views, 0);
    const totalWatchTime = courses.reduce((sum, c) => sum + c.watchTimeMinutes, 0);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">강좌별 성과 분석</h2>
                    <p className="text-slate-400 mt-1">각 강좌의 수익, 조회수, 시청 시간을 확인하세요.</p>
                </div>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="revenue">수익순</option>
                    <option value="views">조회수순</option>
                    <option value="watchTime">시청시간순</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 수익</p>
                        <DollarSign className="w-5 h-5 text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 조회수</p>
                        <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</p>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-slate-400">총 시청 시간</p>
                        <Clock className="w-5 h-5 text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-white">{formatTime(totalWatchTime)}</p>
                </div>
            </div>

            {/* Courses Table */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-800/50 border-b border-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    강좌명
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    조회수
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    등록 학생
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    시청 시간
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    직접 판매
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    구독 수익
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    총 수익
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        로딩 중...
                                    </td>
                                </tr>
                            ) : sortedCourses.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <TrendingUp className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                                        <p>아직 강좌가 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                sortedCourses.map((course) => (
                                    <tr key={course.id} className="hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-white">{course.title}</div>
                                            <div className="text-sm text-slate-500">{course.category} · {course.difficulty}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {course.views.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {course.enrollmentCount.toLocaleString()}명
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                                            {formatTime(course.watchTimeMinutes)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-400">
                                            {formatCurrency(course.directRevenue)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-blue-400">
                                            {formatCurrency(course.subscriptionRevenue)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-white">
                                            {formatCurrency(course.totalRevenue)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
