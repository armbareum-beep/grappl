import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCourses, deleteCourse } from '../../lib/api';
import { Course } from '../../types';
import { Button } from '../../components/Button';
import { Edit, Trash2, Eye, Search } from 'lucide-react';

export const AdminCourseList: React.FC = () => {
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
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">강좌 관리</h1>
                    <p className="text-slate-600">모든 인스트럭터의 강좌를 관리할 수 있습니다.</p>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="강좌명 또는 인스트럭터 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">강좌 정보</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">인스트럭터</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">가격</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-600">상태</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-600">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredCourses.map((course) => (
                                <tr key={course.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <img
                                                src={course.thumbnailUrl}
                                                alt={course.title}
                                                className="w-16 h-10 object-cover rounded"
                                            />
                                            <div>
                                                <div className="font-medium text-slate-900">{course.title}</div>
                                                <div className="text-xs text-slate-500">{course.category}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {course.creatorName}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            공개됨
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/courses/${course.id}`}>
                                                <Button variant="outline" size="sm" className="p-2">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="p-2 text-red-600 border-red-200 hover:bg-red-50"
                                                onClick={() => handleDelete(course.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
