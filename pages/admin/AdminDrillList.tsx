import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getDrills, updateDrill } from '../../lib/api';
import { deleteDrill } from '../../lib/api-admin';
import { Drill, Difficulty } from '../../types';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { Trash2, Eye, Search, Plus, ArrowLeft, PlayCircle, Edit } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

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
                className="bg-zinc-800 text-white px-2 py-1 rounded border border-zinc-700 w-full max-w-[200px]"
            />
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer hover:bg-zinc-800/50 px-2 py-1 -mx-2 rounded transition-colors"
            title="클릭하여 수정"
        >
            {value}
        </div>
    );
};

export const AdminDrillList: React.FC = () => {
    const navigate = useNavigate();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { success, error: toastError } = useToast();
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; drillId: string | null }>({ isOpen: false, drillId: null });
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchDrills();
    }, []);

    async function fetchDrills() {
        try {
            const data = await getDrills();
            setDrills(Array.isArray(data) ? data : (data as any)?.data || []);
        } catch (error) {
            console.error('Error fetching drills:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleUpdateTitle = async (drillId: string, newTitle: string) => {
        try {
            const { error } = await updateDrill(drillId, { title: newTitle });
            if (error) throw error;

            setDrills(drills.map(d => d.id === drillId ? { ...d, title: newTitle } : d));
            success('제목이 수정되었습니다.');
        } catch (error) {
            console.error('Error updating drill:', error);
            toastError('수정 중 오류가 발생했습니다.');
        }
    };

    const handleDeleteClick = (drillId: string) => {
        setDeleteModal({ isOpen: true, drillId });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteModal.drillId) return;

        setIsDeleting(true);
        try {
            const { error } = await deleteDrill(deleteModal.drillId);
            if (error) throw error;

            setDrills(drills.filter(d => d.id !== deleteModal.drillId));
            success('드릴이 삭제되었습니다.');
            setDeleteModal({ isOpen: false, drillId: null });
        } catch (error) {
            console.error('Error deleting drill:', error);
            toastError('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    const filteredDrills = drills.filter(drill =>
        drill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (drill.creatorName && drill.creatorName.toLowerCase().includes(searchTerm.toLowerCase()))
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
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">뒤로가기</span>
                        </button>
                        <h1 className="text-3xl font-extrabold tracking-tight">드릴 관리</h1>
                        <p className="text-zinc-400">전체 드릴 데이터베이스와 루틴 활용도를 관리합니다.</p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <Link to="/drills/upload" className="w-full md:w-auto">
                            <Button className="bg-violet-600 hover:bg-violet-700 text-white w-full shadow-[0_0_20px_rgba(139,92,246,0.3)] border-violet-500/50">
                                <Plus className="w-4 h-4 mr-2" />
                                새 드릴 등록
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                <div className="relative mb-8">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-zinc-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="드릴 제목, 인스트럭터 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all backdrop-blur-sm"
                    />
                </div>

                {/* Table */}
                <div className="hidden md:block bg-zinc-900/30 rounded-2xl border border-zinc-800/50 overflow-hidden backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-zinc-900/50 border-b border-zinc-800">
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">드릴 정보</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">인스트럭터</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">조회수</th>
                                    <th className="px-6 py-5 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">난이도</th>
                                    <th className="px-6 py-5 text-right text-xs font-bold text-zinc-500 uppercase tracking-widest">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/50">
                                {filteredDrills.length > 0 ? (
                                    filteredDrills.map((drill) => (
                                        <tr key={drill.id} className="hover:bg-zinc-800/30 transition-colors group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-10 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center text-zinc-600 group-hover:border-violet-500/30 transition-all">
                                                        {drill.thumbnailUrl ? (
                                                            <img src={drill.thumbnailUrl} alt={`${drill.title} 썸네일`} loading="lazy" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <PlayCircle className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="font-bold text-zinc-100 transition-colors">
                                                            <EditableCell
                                                                value={drill.title}
                                                                onSave={(val) => handleUpdateTitle(drill.id, val)}
                                                            />
                                                        </div>
                                                        <div className="flex gap-2 mt-1">
                                                            {drill.tags?.slice(0, 2).map((tag, i) => (
                                                                <span key={i} className="text-[10px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50">
                                                                    #{tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-500 border border-zinc-700 overflow-hidden">
                                                        {drill.creatorProfileImage ? (
                                                            <img src={drill.creatorProfileImage} loading="lazy" className="w-full h-full object-cover" alt="프로필" />
                                                        ) : (
                                                            drill.creatorName?.charAt(0) || 'U'
                                                        )}
                                                    </div>
                                                    {drill.creatorName || '시스템'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm text-zinc-400 font-medium">
                                                {drill.views?.toLocaleString() || 0}
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                                                    ${drill.difficulty === Difficulty.Beginner ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                        drill.difficulty === Difficulty.Intermediate ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                            'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                                    {drill.difficulty}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Link to={`/drills/${drill.id}`}>
                                                        <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <Link to={`/creator/drills/${drill.id}/edit`}>
                                                        <button className="p-2.5 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all">
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDeleteClick(drill.id)}
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

                {/* Mobile Card List */}
                <div className="md:hidden space-y-4">
                    {filteredDrills.length > 0 ? (
                        filteredDrills.map((drill) => (
                            <div key={drill.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-4 backdrop-blur-xl">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex items-center justify-center text-zinc-600 flex-shrink-0">
                                        {drill.thumbnailUrl ? (
                                            <img src={drill.thumbnailUrl} alt={`${drill.title} 썸네일`} loading="lazy" className="w-full h-full object-cover" />
                                        ) : (
                                            <PlayCircle className="w-8 h-8" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-bold text-zinc-100 text-lg mb-1 truncate">{drill.title}</div>
                                        <div className="flex flex-wrap gap-1.5 mb-2">
                                            {drill.tags?.slice(0, 3).map((tag, i) => (
                                                <span key={i} className="text-[10px] font-medium text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-700/50">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-4 px-1">
                                    <div className="flex items-center gap-2 text-xs text-zinc-400">
                                        <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[8px] border border-zinc-700 overflow-hidden">
                                            {drill.creatorProfileImage ? (
                                                <img src={drill.creatorProfileImage} loading="lazy" className="w-full h-full object-cover" alt="프로필" />
                                            ) : (
                                                drill.creatorName?.charAt(0) || 'U'
                                            )}
                                        </div>
                                        {drill.creatorName || 'System'}
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border
                                        ${drill.difficulty === Difficulty.Beginner ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            drill.difficulty === Difficulty.Intermediate ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                                                'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                        {drill.difficulty}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Link to={`/drills/${drill.id}`} className="w-full">
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all">
                                            View
                                        </button>
                                    </Link>
                                    <Link to={`/creator/drills/${drill.id}/edit`} className="w-full">
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-violet-400 rounded-xl text-xs font-bold transition-all">
                                            Edit
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteClick(drill.id)}
                                        className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-bold transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                            <p className="text-zinc-500">No drills found.</p>
                        </div>
                    )}
                </div>
            </div>

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, drillId: null })}
                onConfirm={handleDeleteConfirm}
                title="드릴 삭제"
                message="정말로 이 드릴을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
                confirmText="삭제"
                cancelText="취소"
                variant="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};
