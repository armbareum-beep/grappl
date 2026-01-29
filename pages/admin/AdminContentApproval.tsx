import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingContent, PendingContent } from '../../lib/api-admin';
import { ArrowLeft, Check, X, Film, BookOpen, Swords, Clock, User, Eye } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const AdminContentApproval: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [pendingItems, setPendingItems] = useState<PendingContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean; itemId: string | null; itemType: any; }>({ isOpen: false, itemId: null, itemType: null });
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            const data = await getPendingContent();
            setPendingItems(data);
        } catch (error) {
            console.error('Error fetching pending content:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (item: PendingContent) => {
        if (!window.confirm('해당 콘텐츠를 승인하고 게시하시겠습니까?')) return;

        setProcessingId(item.id);
        try {
            const { approveContent } = await import('../../lib/api-admin');
            const { error } = await approveContent(item.id, item.type);

            if (error) throw error;
            success('콘텐츠가 승인되었습니다.');
            setPendingItems(prev => prev.filter(p => p.id !== item.id));
        } catch (error) {
            console.error('Error approving content:', error);
            toastError('승인 처리에 실패했습니다.');
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (item: PendingContent) => {
        setRejectionModal({ isOpen: true, itemId: item.id, itemType: item.type });
        setRejectionReason('');
    };

    const handleRejectConfirm = async () => {
        if (!rejectionModal.itemId || !rejectionReason.trim()) return;

        setProcessingId(rejectionModal.itemId);
        try {
            const { rejectContent } = await import('../../lib/api-admin');
            const { error } = await rejectContent(rejectionModal.itemId, rejectionModal.itemType, rejectionReason);

            if (error) throw error;
            success('콘텐츠가 반려되었습니다.');
            setPendingItems(prev => prev.filter(p => p.id !== rejectionModal.itemId));
            setRejectionModal({ isOpen: false, itemId: null, itemType: null });
        } catch (error) {
            console.error('Error rejecting content:', error);
            toastError('반려 처리에 실패했습니다.');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div></div>;

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20 relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                    <div className="space-y-1">
                        <button onClick={() => navigate('/admin')} className="flex items-center gap-2 text-zinc-500 hover:text-white mb-4 transition-colors group">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">대시보드로 돌아가기</span>
                        </button>
                        <h1 className="text-3xl font-extrabold tracking-tight">콘텐츠 승인 대기열</h1>
                        <p className="text-zinc-400">인스트럭터가 등록한 새 콘텐츠를 검토하고 승인 여부를 결정합니다.</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800 px-6 py-3 rounded-2xl">
                        <span className="text-xs font-black uppercase tracking-widest text-zinc-500 block">Pending Reviews</span>
                        <span className="text-2xl font-black text-violet-400">{pendingItems.length}</span>
                    </div>
                </div>

                {/* Content Grid */}
                {pendingItems.length === 0 ? (
                    <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-[2.5rem] p-32 text-center">
                        <Clock className="w-12 h-12 text-zinc-800 mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-zinc-600">대기 중인 콘텐츠가 없습니다.</h2>
                        <p className="text-zinc-700 mt-2">모든 최신 콘텐츠가 검토 완료되었습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {pendingItems.map((item) => (
                            <div key={item.id} className="group bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all flex flex-col">
                                <div className="relative aspect-video bg-zinc-900">
                                    <img
                                        src={item.thumbnailUrl || 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?auto=format&fit=crop&q=80'}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                                    />
                                    <div className="absolute top-4 left-4">
                                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border ${item.type === 'course' ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' :
                                            item.type === 'drill' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                                'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                            }`}>
                                            {item.type === 'course' ? <BookOpen className="w-3 h-3" /> : item.type === 'drill' ? <Film className="w-3 h-3" /> : <Swords className="w-3 h-3" />}
                                            {item.type}
                                        </span>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-zinc-950 to-transparent">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-300">
                                            <Clock className="w-3 h-3" />
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* Preview Overlay Button */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
                                        <button className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-xs backdrop-blur-md transition-all flex items-center gap-2">
                                            <Eye className="w-4 h-4" /> Preview
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{item.title}</h3>
                                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-6 font-medium">
                                        <User className="w-3.5 h-3.5" />
                                        {item.creatorName}
                                    </div>

                                    <div className="mb-6 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500 font-bold">Duration</span>
                                            <span className="text-zinc-300">45 mins</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                            <span className="text-zinc-500 font-bold">Level</span>
                                            <span className="text-zinc-300">Intermediate</span>
                                        </div>
                                    </div>

                                    <div className="mt-auto grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => openRejectModal(item)}
                                            disabled={processingId === item.id}
                                            className="py-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-red-400 hover:border-red-500/30 font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                                        >
                                            <X className="w-3.5 h-3.5" /> REJECT
                                        </button>
                                        <button
                                            onClick={() => handleApprove(item)}
                                            disabled={processingId === item.id}
                                            className="py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2"
                                        >
                                            <Check className="w-3.5 h-3.5" /> APPROVE
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Rejection Modal */}
            {rejectionModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })} />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-white mb-2">콘텐츠 반려 사유 입력</h3>
                        <p className="text-zinc-400 text-sm mb-6">인스트럭터에게 전달될 구체적인 수정 요청사항을 입력해주세요.</p>

                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="예: 화질이 너무 낮습니다. / 오디오 잡음이 심합니다. / 커리큘럼 설명이 부족합니다."
                            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none mb-6"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={() => setRejectionModal({ ...rejectionModal, isOpen: false })}
                                className="flex-1 py-3.5 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-xs hover:bg-zinc-700 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleRejectConfirm}
                                disabled={!rejectionReason.trim()}
                                className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                반려 확정
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
