import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, Star } from 'lucide-react';
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

    if (loading) return <div className="text-white">로딩 중...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">고객 후기 관리</h2>
                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <Plus className="w-4 h-4" />
                    새 후기 추가
                </button>
            </div>

            {isCreating && (
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-6">
                    <h3 className="text-lg font-bold text-white mb-4">새 후기 작성</h3>
                    <TestimonialForm
                        formData={formData}
                        setFormData={setFormData}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                </div>
            )}

            <div className="grid gap-4">
                {testimonials.map((testimonial) => (
                    <div key={testimonial.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                        {editingId === testimonial.id ? (
                            <TestimonialForm
                                formData={formData}
                                setFormData={setFormData}
                                onSave={handleSave}
                                onCancel={handleCancel}
                            />
                        ) : (
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-white text-lg">{testimonial.name}</span>
                                        <span className="text-slate-400 text-sm">{testimonial.belt}</span>
                                        <div className="flex items-center gap-1 ml-2">
                                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            <span className="text-yellow-400 font-bold">{testimonial.rating}</span>
                                        </div>
                                    </div>
                                    <p className="text-slate-300">{testimonial.comment}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(testimonial)}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(testimonial.id)}
                                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const TestimonialForm = ({ formData, setFormData, onSave, onCancel }: any) => {
    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">이름</label>
                    <input
                        type="text"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">벨트</label>
                    <input
                        type="text"
                        value={formData.belt || ''}
                        onChange={(e) => setFormData({ ...formData, belt: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">별점 (1-5)</label>
                <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.rating || 5}
                    onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">내용</label>
                <textarea
                    value={formData.comment || ''}
                    onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                    rows={3}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
            </div>
            <div className="flex justify-end gap-2">
                <button
                    onClick={onCancel}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                >
                    취소
                </button>
                <button
                    onClick={onSave}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                    <Save className="w-4 h-4" />
                    저장
                </button>
            </div>
        </div>
    );
};
