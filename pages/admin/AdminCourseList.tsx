import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Edit, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllCoursesForAdmin, deleteCourse } from '../../lib/api';
import { Course } from '../../types';
import { Button } from '../../components/Button';

export const AdminCourseList: React.FC = () => {
    const { isAdmin } = useAuth();
    const navigate = useNavigate();
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/');
            return;
        }
        loadCourses();
    }, [isAdmin, navigate]);

    const loadCourses = async () => {
        setLoading(true);
        const { data, error } = await getAllCoursesForAdmin();
        if (!error && data) {
            setCourses(data);
        }
        setLoading(false);
    };

    const handleDelete = async (courseId: string, title: string) => {
        if (!confirm(`?•ë§ë¡?"${title}" ê°•ì¢Œë¥??? œ?˜ì‹œê² ìŠµ?ˆê¹Œ?\n\n???‘ì—…?€ ?˜ëŒë¦????†ìœ¼ë©? ëª¨ë“  ?ˆìŠ¨???¨ê»˜ ?? œ?©ë‹ˆ??`)) {
            return;
        }

        setDeleting(courseId);
        const { error } = await deleteCourse(courseId);

        if (error) {
            alert('ê°•ì¢Œ ?? œ ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.');
            console.error(error);
        } else {
            alert('ê°•ì¢Œê°€ ?? œ?˜ì—ˆ?µë‹ˆ??');
            loadCourses();
        }
        setDeleting(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-slate-600">ë¡œë”© ì¤?..</div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-2">?„ì²´ ê°•ì¢Œ ê´€ë¦?/h1>
                <p className="text-slate-600">ëª¨ë“  ?¬ë¦¬?ì´?°ì˜ ê°•ì¢Œë¥?ê´€ë¦¬í•  ???ˆìŠµ?ˆë‹¤.</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                    <strong>ê´€ë¦¬ì ê¶Œí•œ:</strong> ëª¨ë“  ê°•ì¢Œë¥??¸ì§‘?˜ê±°???? œ?????ˆìŠµ?ˆë‹¤. ? ì¤‘?˜ê²Œ ?¬ìš©?˜ì„¸??
                </div>
            </div>

            {courses.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <p className="text-slate-600">?±ë¡??ê°•ì¢Œê°€ ?†ìŠµ?ˆë‹¤.</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    ê°•ì¢Œëª?
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    ?¬ë¦¬?ì´??
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    ì¹´í…Œê³ ë¦¬
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    ê°€ê²?
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                                    ?‘ì—…
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {courses.map((course) => (
                                <tr key={course.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <img
                                                src={course.thumbnailUrl}
                                                alt={course.title}
                                                className="w-16 h-16 rounded object-cover mr-4"
                                            />
                                            <div>
                                                <div className="font-medium text-slate-900">{course.title}</div>
                                                <div className="text-sm text-slate-500 line-clamp-1">{course.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-900">
                                        {course.creatorName}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {course.category}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-900">
                                        {course.price === 0 ? (
                                            <span className="text-green-600 font-semibold">ë¬´ë£Œ</span>
                                        ) : (
                                            `??{course.price.toLocaleString()}`
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm space-x-2">
                                        <Link to={`/creator/courses/${course.id}/edit`}>
                                            <Button size="sm" variant="outline" className="inline-flex items-center">
                                                <Edit className="w-4 h-4 mr-1" />
                                                ?¸ì§‘
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleDelete(course.id, course.title)}
                                            disabled={deleting === course.id}
                                            className="inline-flex items-center border-red-300 text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            {deleting === course.id ? '?? œ ì¤?..' : '?? œ'}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
