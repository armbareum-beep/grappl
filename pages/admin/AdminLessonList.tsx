import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getLessonsAdmin, deleteLessonAdmin, updateLessonAdmin } from '../../lib/api-admin';
import { Lesson } from '../../types';
import { Trash2, Eye, Search, Plus, ArrowLeft, PlayCircle, Edit } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';

const EditableCell = ({ value, onSave }: { value: string, onSave: (val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(value);

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleSave = () => {
        setIsEditing(false);
        if (localValue !== value) {
            onSave(localValue);
        }
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                        setLocalValue(value);
                        setIsEditing(false);
                    }
                }}
                className="bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-700 w-full"
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer hover:bg-zinc-800/50 px-2 py-1 -mx-2 rounded transition-colors group-hover/row:bg-zinc-800/50"
            title="클릭하여 수정"
        >
            {value}
        </div>
    );
};

export const AdminLessonList = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        lessonId: string | null;
    }>({ isOpen: false, lessonId: null });

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

    const handleUpdateTitle = async (id: string, newTitle: string) => {
        try {
            const { error } = await updateLessonAdmin(id, { title: newTitle });
            if (error) throw error;

            setLessons(prev => prev.map(l => l.id === id ? { ...l, title: newTitle } : l));
            success('제목이 수정되었습니다.');
        } catch (error) {
            console.error('Failed to update lesson title:', error);
            toastError('제목 수정에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await deleteLessonAdmin(id);
            if (error) throw error;
            setLessons(prev => prev.filter(l => l.id !== id));
            success('레슨이 삭제되었습니다.');
        } catch (error) {
            console.error('Failed to delete lesson:', error);
            toastError('삭제에 실패했습니다.');
        } finally {
            setConfirmModal({ isOpen: false, lessonId: null });
        }
    };

    const openDeleteConfirm = (lessonId: string) => {
        setConfirmModal({ isOpen: true, lessonId });
    };

    const handleConfirmAction = () => {
        if (!confirmModal.lessonId) return;
        handleDelete(confirmModal.lessonId);
    };

    const filteredLessons = lessons.filter(lesson => {
        const searchLower = searchTerm.toLowerCase();
        // @ts-ignore - joined data
        const instructorName = lesson.creator?.name || lesson.course?.creator?.name || '';
        // @ts-ignore - joined data
        const courseTitle = lesson.course?.title || lesson.courseTitle || '';

        return lesson.title.toLowerCase().includes(searchLower) ||
            lesson.description?.toLowerCase().includes(searchLower) ||
            courseTitle.toLowerCase().includes(searchLower) ||
            instructorName.toLowerCase().includes(searchLower);
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, lessonId: null })}
                onConfirm={handleConfirmAction}
                title="레슨 삭제"
                message="정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmText="삭제"
                cancelText="취소"
                variant="danger"
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
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
                        placeholder="레슨, 인스트럭터, 강좌 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-violet-500 focus:outline-none transition-all placeholder:text-zinc-600"
                    />
                </div>

                {/* List */}
                <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">썸네일</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider w-1/4">제목</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">인스트럭터</th>
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
                                                    <img src={lesson.thumbnailUrl} alt={`${lesson.title} 썸네일`} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                        <PlayCircle className="w-5 h-5" />
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-medium text-white transition-colors">
                                                <EditableCell
                                                    value={lesson.title}
                                                    onSave={(newTitle) => handleUpdateTitle(lesson.id, newTitle)}
                                                />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-zinc-400 text-sm">
                                                {/* @ts-ignore - joined data */}
                                                {lesson.creator?.name || lesson.course?.creator?.name || '-'}
                                            </span>
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
                                            {new Date(lesson.created_at || lesson.createdAt).toLocaleDateString()}
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
                                                    onClick={() => openDeleteConfirm(lesson.id)}
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

                {/* Mobile Card List */}
                <div className="md:hidden space-y-4">
                    {filteredLessons.length > 0 ? (
                        filteredLessons.map((lesson) => (
                            <div key={lesson.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-zinc-800 relative flex-shrink-0">
                                        {lesson.thumbnailUrl ? (
                                            <img src={lesson.thumbnailUrl} alt={`${lesson.title} 썸네일`} loading="lazy" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <PlayCircle className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="font-bold text-white mb-1 line-clamp-2">{lesson.title}</div>
                                            <div className="text-xs text-zinc-400 mb-1">
                                                {/* @ts-ignore - joined data */}
                                                인스트럭터: {lesson.creator?.name || lesson.course?.creator?.name || '-'}
                                            </div>
                                            <div className="text-xs text-zinc-500">
                                                {/* @ts-ignore - joined data */}
                                                강좌: {lesson.course?.title || '-'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="px-2 py-1 rounded text-[10px] font-medium bg-zinc-800 text-zinc-300">
                                                {lesson.difficulty}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {new Date(lesson.created_at || lesson.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Link to={`/lessons/${lesson.id}`} className="w-full">
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-medium transition-all">
                                            View
                                        </button>
                                    </Link>
                                    <Link to={`/creator/lessons/${lesson.id}/edit`} className="w-full">
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-violet-400 rounded-xl text-xs font-medium transition-all">
                                            Edit
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => openDeleteConfirm(lesson.id)}
                                        className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-medium transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                            <p className="text-zinc-500">No lessons found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
