import React, { useEffect, useState } from 'react';
import { getAdminCreators, getPendingCreators, approveCreator, rejectCreator } from '../../lib/api';
import { deleteCreator, updateCreatorProfileAdmin, CreatorProfileUpdate, toggleCreatorHidden } from '../../lib/api-admin';
import { Creator } from '../../types';
import { User, ArrowLeft, Trash2, Shield, Users, Edit, X, Save, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../contexts/ToastContext';
import { ImageUploader } from '../../components/ImageUploader';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const AdminCreatorList: React.FC = () => {
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();
    const [creators, setCreators] = useState<Creator[]>([]);
    const [pendingCreators, setPendingCreators] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'pending'>('active');

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingCreator, setEditingCreator] = useState<Creator | null>(null);
    const [editForm, setEditForm] = useState<CreatorProfileUpdate>({});
    const [saving, setSaving] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'reject';
        creatorId: string | null;
    }>({ isOpen: false, type: 'delete', creatorId: null });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [activeData, pendingRes] = await Promise.all([
                getAdminCreators(),
                getPendingCreators()
            ]);
            setCreators(activeData);
            setPendingCreators(pendingRes.data || []);
        } catch (error) {
            console.error('Error fetching creators:', error);
            toastError('인스트럭터 목록 조회 실패');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (creatorId: string) => {
        try {
            const { error } = await deleteCreator(creatorId);
            if (error) throw error;

            setCreators(creators.filter(c => c.id !== creatorId));
            success('인스트럭터가 삭제되었습니다.');
        } catch (error) {
            console.error('Error deleting creator:', error);
            toastError('삭제 중 오류가 발생했습니다.');
        } finally {
            setConfirmModal({ isOpen: false, type: 'delete', creatorId: null });
        }
    };

    const openDeleteConfirm = (creatorId: string) => {
        setConfirmModal({ isOpen: true, type: 'delete', creatorId });
    };

    const handleApprove = async (creatorId: string) => {
        try {
            const { error } = await approveCreator(creatorId);
            if (error) throw error;
            success('인스트럭터 승인이 완료되었습니다.');
            fetchData();
        } catch (error) {
            console.error('Approval failed:', error);
            toastError('승인 처리에 실패했습니다.');
        }
    };

    const handleReject = async (creatorId: string) => {
        try {
            const { error } = await rejectCreator(creatorId);
            if (error) throw error;
            success('신청이 거절되었습니다.');
            fetchData();
        } catch (error) {
            console.error('Rejection failed:', error);
            toastError('거절 처리에 실패했습니다.');
        } finally {
            setConfirmModal({ isOpen: false, type: 'reject', creatorId: null });
        }
    };

    const openRejectConfirm = (creatorId: string) => {
        setConfirmModal({ isOpen: true, type: 'reject', creatorId });
    };

    const handleConfirmAction = () => {
        if (!confirmModal.creatorId) return;
        if (confirmModal.type === 'delete') {
            handleDelete(confirmModal.creatorId);
        } else if (confirmModal.type === 'reject') {
            handleReject(confirmModal.creatorId);
        }
    };

    const handleToggleHidden = async (creatorId: string, currentHidden: boolean) => {
        try {
            const { error } = await toggleCreatorHidden(creatorId, !currentHidden);
            if (error) throw error;

            // Update local state
            setCreators(creators.map(c =>
                c.id === creatorId ? { ...c, hidden: !currentHidden } : c
            ));
            success(currentHidden ? '인스트럭터가 공개되었습니다.' : '인스트럭터가 숨김 처리되었습니다.');
        } catch (error) {
            console.error('Toggle hidden failed:', error);
            toastError('숨김 처리에 실패했습니다.');
        }
    };

    const openEditModal = (creator: Creator) => {
        setEditingCreator(creator);
        setEditForm({
            name: creator.name,
            bio: creator.bio,
            profileImage: creator.profileImage,
        });
        setIsEditModalOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingCreator) return;

        try {
            setSaving(true);
            const { error } = await updateCreatorProfileAdmin(editingCreator.id, editForm);

            if (error) throw error;

            success('인스트럭터 정보가 수정되었습니다.');
            setIsEditModalOpen(false);
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Update failed:', error);
            toastError('수정에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-zinc-950">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-violet-600/10 blur-[100px] -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-lg transition-all"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">
                                인스트럭터 관리
                            </h1>
                            <p className="text-zinc-400 mt-1">인스트럭터 목록 및 승인 대기 내역을 관리합니다.</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-zinc-800">
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'active' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        활동 중인 인스트럭터 ({creators.length})
                        {activeTab === 'active' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`pb-4 px-2 font-bold text-sm transition-all relative ${activeTab === 'pending' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                        승인 대기 신청 ({pendingCreators.length})
                        {pendingCreators.length > 0 && (
                            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 bg-violet-500 text-white text-[10px] rounded-full">
                                {pendingCreators.length}
                            </span>
                        )}
                        {activeTab === 'pending' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500" />}
                    </button>
                </div>

                {activeTab === 'active' ? (
                    /* Active Creators List */
                    creators.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-zinc-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">등록된 인스트럭터가 없습니다.</h3>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {creators.map((creator) => (
                                <div key={creator.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm group hover:border-violet-500/20 transition-all">
                                    <div className="relative w-24 h-24 flex-shrink-0">
                                        <div className="w-24 h-24 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-xl">
                                            {creator.profileImage ? (
                                                <img
                                                    src={creator.profileImage}
                                                    alt={creator.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                    <User className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-full flex items-center justify-center border border-zinc-800">
                                            <Shield className="w-4 h-4 text-violet-400 fill-violet-400/20" />
                                        </div>
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-2 w-full">
                                        <div className="flex items-center justify-center md:justify-start gap-2">
                                            <h3 className="text-xl font-bold text-white group-hover:text-violet-300 transition-colors">
                                                {creator.name}
                                            </h3>
                                            {creator.hidden && (
                                                <span className="px-2 py-0.5 bg-zinc-700 text-zinc-400 text-[10px] font-bold uppercase rounded border border-zinc-600">
                                                    숨김
                                                </span>
                                            )}
                                        </div>
                                        {creator.email && (
                                            <p className="text-xs text-zinc-500 font-mono">
                                                {creator.email}
                                            </p>
                                        )}
                                        <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl">
                                            {creator.bio || '소개글이 없습니다.'}
                                        </p>
                                        <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-mono text-zinc-500 pt-2">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3 h-3" />
                                                <span>구독자: {creator.subscriberCount.toLocaleString()}명</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        <button
                                            onClick={() => handleToggleHidden(creator.id, creator.hidden || false)}
                                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
                                                creator.hidden
                                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20'
                                                    : 'bg-zinc-700/50 hover:bg-zinc-700 text-zinc-300 border border-zinc-600'
                                            }`}
                                            title={creator.hidden ? '공개하기' : '숨기기'}
                                        >
                                            {creator.hidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            {creator.hidden ? '공개' : '숨김'}
                                        </button>
                                        <button
                                            onClick={() => openEditModal(creator)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-all"
                                        >
                                            <Edit className="w-4 h-4" />
                                            수정
                                        </button>
                                        <button
                                            onClick={() => openDeleteConfirm(creator.id)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 rounded-xl text-sm font-medium transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            삭제
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    /* Pending Creators List */
                    pendingCreators.length === 0 ? (
                        <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-emerald-500/50" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">대기 중인 신청이 없습니다.</h3>
                            <p className="text-zinc-500">모든 신청이 처리되었습니다.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {pendingCreators.map((creator) => (
                                <div key={creator.id} className="bg-zinc-900/40 border border-l-4 border-l-violet-500 border-y-zinc-800/50 border-r-zinc-800/50 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 backdrop-blur-sm">
                                    <div className="relative w-20 h-20 flex-shrink-0">
                                        <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-950 border border-zinc-800">
                                            {creator.profile_image ? (
                                                <img
                                                    src={creator.profile_image}
                                                    alt={creator.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                                                    <User className="w-8 h-8 text-zinc-600" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 text-center md:text-left space-y-2 w-full">
                                        <div className="flex items-center justify-center md:justify-start gap-2">
                                            <h3 className="text-xl font-bold text-white">
                                                {creator.name}
                                            </h3>
                                            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold uppercase rounded border border-violet-500/20">
                                                신규 신청
                                            </span>
                                        </div>

                                        <p className="text-zinc-400 text-sm line-clamp-2 max-w-2xl bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                                            "{creator.bio || '소개글 없음'}"
                                        </p>

                                        <div className="text-xs text-zinc-500 pt-1">
                                            신청일: {new Date(creator.created_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                                        <button
                                            onClick={() => handleApprove(creator.id)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                            승인
                                        </button>
                                        <button
                                            onClick={() => openRejectConfirm(creator.id)}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/50 border border-zinc-700 text-zinc-400 rounded-xl text-sm font-medium transition-all"
                                        >
                                            <XCircle className="w-4 h-4" />
                                            거절
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, type: 'delete', creatorId: null })}
                onConfirm={handleConfirmAction}
                title={confirmModal.type === 'delete' ? '인스트럭터 삭제' : '신청 거절'}
                message={confirmModal.type === 'delete'
                    ? '정말 이 인스트럭터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
                    : '정말 이 신청을 거절하시겠습니까? 거절 시 신청 내역이 삭제됩니다.'}
                confirmText={confirmModal.type === 'delete' ? '삭제' : '거절'}
                cancelText="취소"
                variant={confirmModal.type === 'delete' ? 'danger' : 'warning'}
            />

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-white">인스트럭터 정보 수정</h2>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">이름</label>
                                    <input
                                        type="text"
                                        value={editForm.name || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">소개 (Bio)</label>
                                    <textarea
                                        value={editForm.bio || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none transition-colors resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">프로필 이미지</label>
                                    <ImageUploader
                                        currentImageUrl={editForm.profileImage}
                                        onUploadComplete={(url) => setEditForm(prev => ({ ...prev, profileImage: url }))}
                                        bucketName="profile-images"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="px-5 py-2.5 text-zinc-400 hover:text-white font-medium transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleEditSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? '저장 중...' : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        변경사항 저장
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
