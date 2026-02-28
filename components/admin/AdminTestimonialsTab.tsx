import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit, Plus, Star, User, Check, X, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { ConfirmModal } from '../common/ConfirmModal';

interface Testimonial {
    id: string;
    name: string;
    belt: string;
    rating: number;
    comment: string;
    profile_image?: string;
    status: 'pending' | 'approved' | 'rejected';
    user_id?: string;
    created_at?: string;
}

type TabType = 'pending' | 'approved' | 'rejected';

export const AdminTestimonialsTab: React.FC = () => {
    const { success, error: toastError } = useToast();
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Testimonial, 'id' | 'status' | 'user_id' | 'created_at'>>({
        name: '',
        belt: 'White Belt',
        rating: 5,
        comment: '',
        profile_image: ''
    });
    const [confirmModal, setConfirmModal] = useState<{isOpen: boolean; action: () => void; title: string; message: string}>({isOpen: false, action: () => {}, title: '', message: ''});

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const fetchTestimonials = async () => {
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error fetching testimonials:', error);
                throw error;
            }

            setTestimonials(data || []);
        } catch (error: any) {
            console.error('Error fetching testimonials:', error);
            toastError('데이터를 불러오는 데 실패했습니다: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: 'approved' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('testimonials')
                .update({ status: newStatus })
                .eq('id', id);

            if (error) throw error;

            success(newStatus === 'approved' ? '후기가 승인되었습니다.' : '후기가 거절되었습니다.');
            fetchTestimonials();
        } catch (error) {
            console.error('Error updating testimonial status:', error);
            toastError('상태 변경에 실패했습니다.');
        }
    };

    const handleEdit = (t: Testimonial) => {
        setFormData({
            name: t.name,
            belt: t.belt,
            rating: t.rating,
            comment: t.comment,
            profile_image: t.profile_image || ''
        });
        setEditingId(t.id);
        setIsEditing(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('testimonials')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
                success('후기가 수정되었습니다.');
            } else {
                // Admin-created testimonials are auto-approved
                const { error } = await supabase
                    .from('testimonials')
                    .insert([{ ...formData, status: 'approved' }]);
                if (error) throw error;
                success('새 후기가 등록되었습니다.');
            }
            setIsEditing(false);
            setEditingId(null);
            setFormData({ name: '', belt: 'White Belt', rating: 5, comment: '', profile_image: '' });
            fetchTestimonials();
        } catch (error) {
            console.error('Error saving testimonial:', error);
            toastError('저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        setConfirmModal({
            isOpen: true,
            title: '삭제 확인',
            message: '정말 삭제하시겠습니까?',
            action: async () => {
                try {
                    const { error } = await supabase.from('testimonials').delete().eq('id', id);
                    if (error) throw error;
                    success('삭제되었습니다.');
                    fetchTestimonials();
                } catch (error) {
                    console.error('Error deleting testimonial:', error);
                    toastError('삭제에 실패했습니다.');
                } finally {
                    setConfirmModal(prev => ({...prev, isOpen: false}));
                }
            }
        });
    };

    const filteredTestimonials = testimonials.filter(t => {
        // Handle legacy testimonials without status (treat as approved)
        const status = t.status || 'approved';
        return status === activeTab;
    });

    const pendingCount = testimonials.filter(t => t.status === 'pending').length;
    const approvedCount = testimonials.filter(t => !t.status || t.status === 'approved').length;
    const rejectedCount = testimonials.filter(t => t.status === 'rejected').length;

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold"><Clock className="w-3 h-3" /> 대기</span>;
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-bold"><CheckCircle className="w-3 h-3" /> 승인</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold"><XCircle className="w-3 h-3" /> 거절</span>;
            default:
                return null;
        }
    };

    if (loading) return <div className="p-12 text-center text-zinc-500 font-medium">데이터를 불러오는 중...</div>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black flex items-center gap-3">
                    <Star className="w-5 h-5 text-amber-500" />
                    랜딩페이지 고객 후기 관리
                </h3>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-bold transition-all"
                    >
                        <Plus className="w-4 h-4" /> 후기 추가
                    </button>
                )}
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 border-b border-zinc-800 pb-4">
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'pending'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                    <Clock className="w-4 h-4" />
                    승인 대기
                    {pendingCount > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-amber-500 text-black text-xs font-black rounded-full">
                            {pendingCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'approved'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                    <CheckCircle className="w-4 h-4" />
                    승인됨 ({approvedCount})
                </button>
                <button
                    onClick={() => setActiveTab('rejected')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        activeTab === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                >
                    <XCircle className="w-4 h-4" />
                    거절됨 ({rejectedCount})
                </button>
            </div>

            {isEditing && (
                <div className="bg-zinc-900/60 border border-violet-500/30 rounded-3xl p-8 animate-in zoom-in-95 duration-200">
                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-2">작성자 이름</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-2">벨트 / 직급</label>
                                <select
                                    value={formData.belt}
                                    onChange={e => setFormData({ ...formData, belt: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none"
                                >
                                    <option>White Belt</option>
                                    <option>Blue Belt</option>
                                    <option>Purple Belt</option>
                                    <option>Brown Belt</option>
                                    <option>Black Belt</option>
                                    <option>전공자</option>
                                    <option>입문자</option>
                                    <option>취미 수련생</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-2">평점 (1-5)</label>
                                <input
                                    type="number"
                                    min="1" max="5"
                                    value={formData.rating}
                                    onChange={e => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-zinc-400 mb-2">프로필 이미지 URL</label>
                                <input
                                    type="text"
                                    value={formData.profile_image}
                                    onChange={e => setFormData({ ...formData, profile_image: e.target.value })}
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-zinc-400 mb-2">후기 내용</label>
                            <textarea
                                value={formData.comment}
                                onChange={e => setFormData({ ...formData, comment: e.target.value })}
                                rows={4}
                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-2xl focus:border-violet-500 outline-none resize-none"
                                required
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => { setIsEditing(false); setEditingId(null); }}
                                className="px-6 py-3 bg-zinc-800 text-white rounded-xl text-sm font-bold"
                            >
                                취소
                            </button>
                            <button
                                type="submit"
                                className="px-8 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-900/20"
                            >
                                {editingId ? '수정 완료' : '등록 완료'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTestimonials.length > 0 ? (
                    filteredTestimonials.map(t => (
                        <div key={t.id} className={`bg-zinc-900/40 border rounded-3xl p-6 group relative overflow-hidden ${
                            t.status === 'pending' ? 'border-amber-500/30' :
                            t.status === 'rejected' ? 'border-red-500/30' : 'border-zinc-800'
                        }`}>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
                                    {t.profile_image ? (
                                        <img src={t.profile_image} alt={t.name} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                            <User className="w-6 h-6" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-bold text-white transition-colors group-hover:text-violet-400 truncate">{t.name}</h4>
                                        {t.user_id && <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded font-bold">고객</span>}
                                    </div>
                                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{t.belt}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-3 h-3 ${i < t.rating ? 'text-amber-500 fill-amber-500' : 'text-zinc-700'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="text-sm text-zinc-400 leading-relaxed line-clamp-3 mb-4">"{t.comment}"</p>

                            {/* Approval Actions for Pending */}
                            {t.status === 'pending' && (
                                <div className="flex gap-2 mb-4">
                                    <button
                                        onClick={() => handleStatusChange(t.id, 'approved')}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-bold transition-all"
                                    >
                                        <Check className="w-4 h-4" /> 승인
                                    </button>
                                    <button
                                        onClick={() => handleStatusChange(t.id, 'rejected')}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-bold transition-all"
                                    >
                                        <X className="w-4 h-4" /> 거절
                                    </button>
                                </div>
                            )}

                            {/* Re-approve for Rejected */}
                            {t.status === 'rejected' && (
                                <div className="mb-4">
                                    <button
                                        onClick={() => handleStatusChange(t.id, 'approved')}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-bold transition-all"
                                    >
                                        <Check className="w-4 h-4" /> 다시 승인
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 border-t border-zinc-800 pt-4">
                                <button onClick={() => handleEdit(t)} aria-label="수정" className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(t.id)} aria-label="삭제" className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-zinc-900/20 border-2 border-dashed border-zinc-800 rounded-3xl text-center">
                        <Star className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                        <p className="text-zinc-500 font-medium">
                            {activeTab === 'pending' && '승인 대기 중인 후기가 없습니다.'}
                            {activeTab === 'approved' && '승인된 후기가 없습니다.'}
                            {activeTab === 'rejected' && '거절된 후기가 없습니다.'}
                        </p>
                        {activeTab === 'approved' && (
                            <p className="text-zinc-600 text-sm mt-1">상단의 '후기 추가' 버튼을 눌러 직접 후기를 작성하거나, 고객 후기를 승인해주세요.</p>
                        )}
                    </div>
                )}
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
