import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, MoreVertical, Edit, Trash } from 'lucide-react';
import { getCreatorCourses } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Course } from '../../types';

export const CreatorCourses: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCourses() {
            if (!user) return;
            try {
                // In a real app, we'd filter by creator ID. 
                // For now, we might need to fetch all or mock it if RLS isn't set up for "my created courses" specifically
                // But we added getCreatorCourses in api.ts, so let's use it.
                // Assuming the user.id is the creator_id.
                const data = await getCreatorCourses(user.id);
                setCourses(data);
            } catch (error) {
                console.error('Error fetching courses:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchCourses();
    }, [user]);

    if (loading) {
        return <div className="p-8 text-center">로딩 중...</div>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">강좌 관리</h1>
                    <p className="text-slate-600">내가 만든 강좌를 관리하고 새로운 강좌를 만드세요.</p>
                </div>
                <Link to="/creator/courses/new">
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        <Plus className="w-5 h-5" />
                        새 강좌 만들기
                    </button>
                </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="강좌 검색..."
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select className="border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>모든 카테고리</option>
                        <option>Technique</option>
                        <option>Drill</option>
                        <option>Sparring</option>
                    </select>
                </div>

                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">강좌 정보</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">가격</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">상태</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">수강생</th>
                            <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {courses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                    아직 등록된 강좌가 없습니다.
                                </td>
                            </tr>
                        ) : (
                            courses.map((course) => (
                                <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <img src={course.thumbnailUrl} alt="" className="w-12 h-12 rounded-lg object-cover bg-slate-100" />
                                            <div>
                                                <h3 className="font-medium text-slate-900">{course.title}</h3>
                                                <p className="text-sm text-slate-500">{course.category} • {course.lessonCount || 0} 레슨</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            판매중
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {course.views.toLocaleString()}명
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Link to={`/creator/courses/${course.id}/edit`}>
                                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </Link>
                                            <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
