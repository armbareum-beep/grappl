import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCourses, deleteCourse } from '../../lib/api';
import { Course } from '../../types';
import { Button } from '../../components/Button';
import { Trash2, Eye, Search, Plus, ArrowLeft } from 'lucide-react';

export const AdminCourseList: React.FC = () => {
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchCourses();
    }, []);

    async function fetchCourses() {
        try {
            const data = await getCourses();
            setCourses(data);
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (courseId: string) => {
        if (!window.confirm('정말로 이 강좌를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await deleteCourse(courseId);
            if (error) throw error;

            setCourses(courses.filter(c => c.id !== courseId));
            alert('강좌가 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting course:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.creatorName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="space-y-1">
                        <button
                            onClick={() => navigate('/admin')}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">대시보드로 돌아가기</span>
                        </button>
                        <h1 className="text-3xl font-extrabold tracking-tight">강좌 관리</h1>
                        <p className="text-zinc-400">등록된 모든 강좌의 데이터를 관리하고 모니터링합니다.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link to="/creator/courses/new" className="w-full md:w-auto">
                            <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full shadow-[0_0_20px_rgba(139,92,246,0.3)] border-violet-500/50">
                                <Plus className="w-4 h-4 mr-2" />
                                새 강좌 등록
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="강좌명, 인스트럭터 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all backdrop-blur-sm"
                    />
                </div>

                {/* Table */}
                <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">강좌 정보</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">인스트럭터</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">가격</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">상태</th>
                                    <th className="px-6 py-5 text-right text-xs font-bold text-zinc-500 uppercase tracking-widest">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredCourses.length > 0 ? (
                                    filteredCourses.map((course) => (
                                        <tr key={course.id} className="hover:bg-zinc-800/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-20 h-12 flex-shrink-0 relative overflow-hidden rounded-lg bg-zinc-800 border border-zinc-700/50">
                                                        <img
                                                            src={course.thumbnailUrl}
                                                            alt={course.title}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-zinc-100 group-hover:text-violet-400 transition-colors truncate">{course.title}</div>
                                                        <div className="text-xs text-zinc-500 mt-0.5">{course.category}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-700">
                                                        {course.creatorName?.charAt(0)}
                                                    </div>
                                                    {course.creatorName}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-semibold text-zinc-200">
                                                {course.price === 0 ? (
                                                    <span className="text-emerald-400">무료</span>
                                                ) : (
                                                    `₩${course.price.toLocaleString()}`
                                                )}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                    ACTIVE
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link to={`/courses/${course.id}`}>
                                                        <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(course.id)}
                                                        className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center text-zinc-600 font-medium">
                                            검색 결과가 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
