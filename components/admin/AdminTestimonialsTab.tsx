import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Star } from 'lucide-react';
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '../../lib/api';
import { Testimonial } from '../../types';

export const AdminTestimonialsTab: React.FC = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Testimonial>>({});
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        loadTestimonials();
    }, []);

    const loadTestimonials = async () => {
        setLoading(true);
        const { data } = await getTestimonials();
        if (data) setTestimonials(data);
        setLoading(false);
    };

    const handleEdit = (testimonial: Testimonial) => {
        setEditingId(testimonial.id);
        setFormData(testimonial);
        setIsCreating(false);
    };

    const handleCreate = () => {
        setEditingId(null);
        setFormData({ rating: 5 });
        setIsCreating(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.belt || !formData.comment) return;

        if (isCreating) {
            await createTestimonial(formData as any);
        } else if (editingId) {
            await updateTestimonial(editingId, formData);
        }

        setEditingId(null);
        setIsCreating(false);
        setFormData({});
        loadTestimonials();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('정말 삭제하시겠습니까?')) {
            await deleteTestimonial(id);
            loadTestimonials();
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreating(false);
        setFormData({});
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(139,92,246,0.3)]" />
            <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Loading Testimonials...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500">Member Reviews</h2>
                </div>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl font-bold text-sm tracking-tight hover:bg-violet-700 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                >
                    <Plus className="w-4 h-4" />
                    후기 수동 추가
                </button>
            </div>

            {(isCreating || editingId) && (
                <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 p-8 backdrop-blur-xl animate-in slide-in-from-top-4 duration-500 mb-12">
                    <h3 className="text-lg font-extrabold text-white mb-8 flex items-center gap-2">
                        <span className="w-1 h-6 bg-violet-500 rounded-full" />
                        {isCreating ? '신규 후기 데이터 입력' : '후기 데이터 정정'}
                    </h3>
                    <TestimonialForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {testimonials.map((testimonial) => (
                    <div
                        key={testimonial.id}
                        className={`bg-zinc-900/30 p-8 rounded-3xl border transition-all group relative overflow-hidden ${editingId === testimonial.id ? 'border-violet-500/50 bg-violet-500/5' : 'border-zinc-800/50 hover:border-zinc-700'}`}
                    >
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-600/5 blur-[40px] rounded-full group-hover:bg-violet-600/10 transition-all" />

                        <div className="flex justify-between items-start relative z-10">
                            <div className="space-y-4 flex-1">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 font-black text-sm uppercase">
                                        {testimonial.name.substring(0, 1)}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-extrabold text-white">{testimonial.name}</span>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 bg-zinc-800/50 px-2 py-0.5 rounded border border-zinc-800">{testimonial.belt}</span>
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    className={`w-3 h-3 ${i < (testimonial.rating || 0) ? 'text-amber-500 fill-amber-500' : 'text-zinc-700'}`}
                                                />
                                            ))}
                                            <span className="text-[10px] font-black text-amber-500/80 ml-1">{testimonial.rating}.0</span>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-zinc-400 text-sm leading-relaxed font-medium pl-1">{testimonial.comment}</p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                <button
                                    onClick={() => handleEdit(testimonial)}
                                    className="p-2.5 bg-zinc-800 hover:bg-violet-600 text-zinc-500 hover:text-white rounded-xl transition-all shadow-xl"
                                    title="수정"
                                >
                                    <Plus className="w-4 h-4 rotate-45" />
                                </button>
                                <button
                                    onClick={() => handleDelete(testimonial.id)}
                                    className="p-2.5 bg-zinc-800 hover:bg-rose-600 text-zinc-500 hover:text-white rounded-xl transition-all shadow-xl"
                                    title="삭제"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {testimonials.length === 0 && (
                <div className="py-20 bg-zinc-900/10 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center gap-4 text-zinc-600">
                    <Star className="w-12 h-12 opacity-10" />
                    <p className="font-bold">등록된 고객 후기가 없습니다.</p>
                </div>
            )}
        </div>
    );
};

const TestimonialForm = ({ formData, setFormData, onSave, onCancel }: any) => {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Writer Name</label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-bold transition-all"
                        placeholder="작성자 성함"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Belt / Status</label>
                    <input
                        type="text"
                        value={formData.belt || ''}
                        onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-bold transition-all"
                        placeholder="예: 블랙벨트 / 주짓수 코치"
                    />
                </div>
                <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Rating (1-5)</label>
                    <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.rating || 5}
                        onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-mono font-bold transition-all"
                    />
                </div>
            </div>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">Testimonial Content</label>
                <textarea
                    value={formData.comment || ''}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-medium leading-relaxed transition-all resize-none"
                    placeholder="후기 내용을 입력하세요"
                />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 text-zinc-500 hover:text-white font-bold uppercase tracking-widest text-[10px] transition-all"
                >
                    Discard Changes
                </button>
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-8 py-3 bg-violet-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-violet-700 transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                >
                    <Save className="w-4 h-4" />
                    Commit Post
                </button>
            </div>
        </div>
    );
};
