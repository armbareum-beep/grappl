import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSparringVideosAdmin, deleteSparringVideoAdmin } from '../../lib/api-admin';
import { updateSparringVideo } from '../../lib/api';
import { SparringVideo } from '../../types';
import { Trash2, Eye, Search, Plus, ArrowLeft, PlayCircle, Edit } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

const EditableCell = ({ value, onSave, type = 'text' }: { value: string | number, onSave: (val: string) => void, type?: 'text' | 'number' }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(String(value));

    useEffect(() => {
        setLocalValue(String(value));
    }, [value]);

    const handleSave = () => {
        setIsEditing(false);
        if (localValue !== String(value)) {
            onSave(localValue);
        }
    };

    if (isEditing) {
        return (
            <input
                autoFocus
                type={type}
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') {
                        setLocalValue(String(value));
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
            {type === 'number' ? (Number(value) > 0 ? `₩${Number(value).toLocaleString()}` : '무료') : value}
        </div>
    );
};

export const AdminSparringList: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const data = await getSparringVideosAdmin();
            setVideos(data);
        } catch (error) {
            console.error('Failed to fetch sparring videos:', error);
            toastError('스파링 영상 목록을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateField = async (id: string, field: string, value: string | number) => {
        try {
            const { error } = await updateSparringVideo(id, { [field]: value });
            if (error) throw error;

            setVideos(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
            success(`${field === 'title' ? '제목' : '가격'}이 수정되었습니다.`);
        } catch (error) {
            console.error('Failed to update sparring video:', error);
            toastError('수정에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        try {
            const { error } = await deleteSparringVideoAdmin(id);
            if (error) throw error;
            setVideos(prev => prev.filter(v => v.id !== id));
            success('스파링 영상이 삭제되었습니다.');
        } catch (error) {
            console.error('Failed to delete sparring video:', error);
            toastError('삭제에 실패했습니다.');
        }
    };

    const filteredVideos = videos.filter(video =>
        video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        video.creator?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
                        <button onClick={() => navigate(-1)} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">스파링 관리</h1>
                            <p className="text-zinc-400">총 {videos.length}개의 영상</p>
                        </div>
                    </div>
                    <Link to="/creator/sparring/new">
                        <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-all">
                            <Plus className="w-4 h-4" />
                            새 스파링
                        </button>
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="스파링 검색 (제목, 인스트럭터)..."
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
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider w-1/3">제목</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">인스트럭터</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">가격</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">조회수</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider">등록일</th>
                                    <th className="p-4 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800">
                                {filteredVideos.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-zinc-500">
                                            스파링 영상이 없습니다.
                                        </td>
                                    </tr>
                                ) : filteredVideos.map((video) => (
                                    <tr key={video.id} className="group hover:bg-zinc-800/50 transition-colors">
                                        <td className="p-4">
                                            <div className="w-16 h-24 rounded-lg overflow-hidden bg-zinc-800 relative">
                                                {video.thumbnailUrl ? (
                                                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
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
                                                    value={video.title}
                                                    onSave={(val) => handleUpdateField(video.id, 'title', val)}
                                                />
                                            </div>
                                            {video.description && (
                                                <div className="text-sm text-zinc-500 truncate max-w-[200px] mt-1">
                                                    {video.description}
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="text-zinc-400 text-sm">
                                                {video.creator?.name || '-'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <EditableCell
                                                value={video.price}
                                                type="number"
                                                onSave={(val) => handleUpdateField(video.id, 'price', parseInt(val) || 0)}
                                            />
                                        </td>
                                        <td className="p-4 text-zinc-400 text-sm font-mono">
                                            {(video.views || 0).toLocaleString()}
                                        </td>
                                        <td className="p-4 text-zinc-500 text-sm">
                                            {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/sparring/${video.id}`}>
                                                    <button className="p-2.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <Link to={`/creator/sparring/${video.id}/edit`}>
                                                    <button className="p-2.5 text-zinc-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all">
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(video.id)}
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
                    {filteredVideos.length > 0 ? (
                        filteredVideos.map((video) => (
                            <div key={video.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                                <div className="flex gap-4 mb-4">
                                    <div className="w-20 h-28 rounded-xl overflow-hidden bg-zinc-800 relative flex-shrink-0">
                                        {video.thumbnailUrl ? (
                                            <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                <PlayCircle className="w-6 h-6" />
                                            </div>
                                        )}
                                        <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-black/60 rounded text-[10px] text-white font-medium backdrop-blur-sm">
                                            {(video.views || 0).toLocaleString()} views
                                        </div>
                                    </div>
                                    <div className="min-w-0 flex-1 flex flex-col justify-between py-1">
                                        <div>
                                            <div className="font-bold text-white mb-1 line-clamp-2">{video.title}</div>
                                            <div className="text-xs text-zinc-400">
                                                {video.creator?.name || '-'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className={`px-2 py-1 rounded text-[10px] font-medium ${video.price > 0 ? 'bg-amber-500/10 text-amber-500' : 'bg-zinc-800 text-zinc-400'}`}>
                                                {video.price > 0 ? `₩${video.price.toLocaleString()}` : '무료'}
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                    <Link to={`/sparring/${video.id}`} className="w-full">
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-medium transition-all">
                                            View
                                        </button>
                                    </Link>
                                    <Link to={`/creator/sparring/${video.id}/edit`} className="w-full">
                                        <button className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-violet-400 rounded-xl text-xs font-medium transition-all">
                                            Edit
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(video.id)}
                                        className="w-full py-2 bg-zinc-800 text-zinc-400 hover:text-red-400 rounded-xl text-xs font-medium transition-all"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                            <p className="text-zinc-500">No sparring videos found.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
