import React, { useEffect, useState } from 'react';
import {
    Video, Trash2, RefreshCw, ExternalLink,
    AlertTriangle, Shield, Clock, FileVideo,
    Search, Info, CheckCircle2, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getVimeoOrphans, deleteVimeoVideo, VimeoOrphan } from '../../lib/api-admin';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/Button';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { format } from 'date-fns';

export const AdminVimeoManagement: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [data, setData] = useState<{ count: number; total: number; orphans: VimeoOrphan[] } | null>(null);
    const { success, error: toastError } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; action: () => void; title: string; message: string}>({isOpen: false, action: () => {}, title: '', message: ''});

    const loadOrphans = async () => {
        try {
            setLoading(true);
            const res = await getVimeoOrphans();
            setData(res);
        } catch (err: any) {
            toastError('Vimeo 데이터를 불러오는데 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrphans();
    }, []);

    const handleDelete = async (videoId: string, name: string) => {
        setConfirmModal({
            isOpen: true,
            title: '영상 삭제 확인',
            message: `"${name}" 영상을 Vimeo에서 영구 삭제하시겠습니까?`,
            action: async () => {
                try {
                    setDeletingId(videoId);
                    await deleteVimeoVideo(videoId);
                    success('영상이 삭제되었습니다.');
                    setData(prev => prev ? {
                        ...prev,
                        count: prev.count - 1,
                        orphans: prev.orphans.filter(o => o.id !== videoId)
                    } : null);
                } catch (err: any) {
                    toastError('삭제에 실패했습니다.');
                } finally {
                    setDeletingId(null);
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                }
            }
        });
    };

    const filteredOrphans = data?.orphans.filter(o =>
        o.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.includes(searchTerm)
    ) || [];

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white mb-6 transition-all group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">뒤로가기</span>
                </button>

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-4xl font-extrabold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                                Vimeo 저장소 관리
                            </h1>
                            <div className="px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.2">
                                <AlertTriangle className="w-3 h-3" /> CLEANUP MODE
                            </div>
                        </div>
                        <p className="text-zinc-400 text-lg">데이터베이스와 연동되지 않은 고립된(Orphan) 영상들을 찾아 효율적으로 관리합니다.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={loadOrphans}
                            disabled={loading}
                            className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            다시 검사하기
                        </Button>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">전체 영상 수</span>
                            <FileVideo className="w-4 h-4 text-zinc-600" />
                        </div>
                        <div className="text-3xl font-bold tracking-tight">{loading ? '-' : data?.total.toLocaleString()}</div>
                    </div>

                    <div className={`bg-zinc-900/40 border rounded-2xl p-6 backdrop-blur-xl transition-colors ${data?.count ? 'border-amber-500/30 bg-amber-500/5' : 'border-zinc-800/50'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">미연동 영상</span>
                            <AlertTriangle className={`w-4 h-4 ${data?.count ? 'text-amber-500' : 'text-zinc-600'}`} />
                        </div>
                        <div className={`text-3xl font-bold tracking-tight ${data?.count ? 'text-amber-500' : 'text-white'}`}>
                            {loading ? '-' : data?.count.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 backdrop-blur-xl">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider">시스템 상태</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-lg font-bold text-zinc-300">정상 작동 중</div>
                        <p className="text-[10px] text-zinc-600 mt-1">Vimeo API v3.4 연동 완료</p>
                    </div>
                </div>

                {/* Help Box */}
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-5 mb-8 flex gap-4 items-start">
                    <Info className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-zinc-400 leading-relaxed">
                        <strong className="text-zinc-200 block mb-1">고립된(Orphan) 영상이란?</strong>
                        Vimeo 계정에는 존재하지만 Grappl 데이터베이스(Lessons, Drills, Sparring 등) 내 어떤 레코드에서도 참조하고 있지 않은 영상입니다.
                        보통 업로드 중 오류가 발생했거나, 레코드는 삭제되었으나 영상은 남겨진 경우에 발생합니다. <br />
                        <span className="text-amber-400/80 font-medium">※ 삭제 전 제목과 생성일을 반드시 확인하세요. 삭제된 영상은 복구할 수 없습니다.</span>
                    </div>
                </div>

                {/* Filter & Table Area */}
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden backdrop-blur-xl">
                    <div className="p-6 border-b border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="영상 제목 또는 ID 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
                            />
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                            검색 결과: <span className="text-zinc-300">{filteredOrphans.length}</span> / {data?.count || 0}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-zinc-900/50 text-[10px] uppercase tracking-widest text-zinc-500 border-b border-zinc-800/50">
                                    <th className="px-6 py-4 font-black">미리보기 / 제목</th>
                                    <th className="px-6 py-4 font-black">영상 ID</th>
                                    <th className="px-6 py-4 font-black">길이</th>
                                    <th className="px-6 py-4 font-black">생성일</th>
                                    <th className="px-6 py-4 font-black text-right">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/30">
                                {loading ? (
                                    [1, 2, 3].map(i => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan={5} className="px-6 py-8">
                                                <div className="h-6 bg-zinc-800/50 rounded-lg w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredOrphans.length > 0 ? (
                                    filteredOrphans.map((video) => (
                                        <tr key={video.id} className="hover:bg-zinc-800/20 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-20 aspect-video bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-white/5">
                                                        {video.thumbnail ? (
                                                            <img src={video.thumbnail} alt={video.name || "썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Video className="w-4 h-4 text-zinc-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-zinc-200 line-clamp-1 group-hover:text-violet-400 transition-colors">{video.name}</div>
                                                        <a href={video.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-500 flex items-center gap-1 hover:text-zinc-300 mt-1">
                                                            Vimeo에서 보기 <ExternalLink className="w-2.5 h-2.5" />
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-[11px] font-mono text-zinc-500 bg-zinc-950 px-2 py-1 rounded border border-zinc-800/50">
                                                    {video.id}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {formatDuration(video.duration)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs text-zinc-400">
                                                    {format(new Date(video.createdAt), 'yyyy-MM-dd HH:mm')}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDelete(video.id, video.name)}
                                                    disabled={deletingId === video.id}
                                                    className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/20"
                                                    title="Permanently delete"
                                                >
                                                    {deletingId === video.id ? (
                                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <Shield className="w-10 h-10 text-emerald-500/20" />
                                                <div className="text-zinc-500 font-medium">관리 대상 영상이 없습니다. 모든 데이터가 동기화되어 있습니다.</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
                onConfirm={confirmModal.action}
                title={confirmModal.title}
                message={confirmModal.message}
                variant="danger"
            />
        </div>
    );
};
