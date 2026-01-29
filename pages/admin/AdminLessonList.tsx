import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getLessonsAdmin, deleteLessonAdmin } from '../../lib/api-admin';
import { Lesson } from '../../types';
import { Trash2, Eye, Search, Plus, ArrowLeft, PlayCircle, Edit } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const AdminLessonList = () => {
    const { success, error: toastError } = useToast();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLessons();
    }, []);

    const fetchLessons = async () => {
        try {
            const data = await getLessonsAdmin();
            setLessons(data);
        } catch (error) {
            console.error('Failed to fetch lessons:', error);
            toastError('레슨 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await deleteLessonAdmin(id);
            if (error) throw error;
            setLessons(prev => prev.filter(l => l.id !== id));
            success('레슨이 삭제되었습니다.');
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            toastError('삭제에 실패했습니다.');
        }
    };

    const filteredLessons = lessons.filter(lesson =>
        lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lesson.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/admin/dashboard" className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">레슨 관리</h1>
                            <p className="text-zinc-400">총 {lessons.length}개의 레슨</p>
                        </div>
                    </div>
                    <Link to="/creator/lessons/new">
                        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all">
                            <Plus className="w-4 h-4" />
                            새 레슨
                        </button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="레슨 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-violet-500 focus:outline-none transition-all placeholder:text-zinc-600"
                    />
                </div>

                {/* List */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">썸네일</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider w-1/3">제목</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">포함된 강좌</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">난이도</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">조회수</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">등록일</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {filteredLessons.map((lesson) => (
                                    <tr key={lesson.id} className="group hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="w-16 h-10 rounded-lg overflow-hidden bg-zinc-800 relative">
                                                {lesson.thumbnailUrl ? (
                                                    <img src={lesson.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                        <PlayCircle className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-white group-hover:text-violet-400 transition-colors">
                                                {lesson.title}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-zinc-400 text-sm">
                                                {/* @ts-ignore - joined data */}
                                                {lesson.course?.title || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-medium bg-zinc-800 text-zinc-300`}>
                                                {lesson.difficulty}
                                            </span>
                                        </td>
                                        <td className="p-4 text-zinc-400 text-sm font-mono">
                                            {(lesson.views || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-zinc-500 text-sm">
                                            {new Date(lesson.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/lessons/${lesson.id}`}>
                                                    <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <Link to={`/creator/lessons/${lesson.id}/edit`}>
                                                    <button className="p-2.5 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(lesson.id)}
                                                    className="p-2.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
