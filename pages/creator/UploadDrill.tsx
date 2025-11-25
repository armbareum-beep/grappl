import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createDrill } from '../../lib/api';
import { VideoCategory, Difficulty } from '../../types';
import { Button } from '../../components/Button';
import { Upload, Video, Image as ImageIcon, DollarSign, Type, AlignLeft } from 'lucide-react';

export const UploadDrill: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        price: 0,
        vimeoUrl: '',
        thumbnailUrl: '',
        duration: '05:00' // Default duration
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            const { error } = await createDrill({
                ...formData,
                creatorId: user.id,
                creatorName: user.user_metadata?.name || 'Unknown Creator'
            });

            if (error) throw error;

            alert('드릴이 성공적으로 업로드되었습니다!');
            navigate('/creator/dashboard');
        } catch (error) {
            console.error('Error uploading drill:', error);
            alert('업로드 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">새로운 드릴 업로드</h1>
                <p className="text-slate-600">수강생들에게 보여줄 새로운 기술 영상을 업로드하세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                    <div className="relative">
                        <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            name="title"
                            required
                            value={formData.title}
                            onChange={handleChange}
                            className="pl-10 w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="예: 기본 암바 마스터하기"
                        />
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                    <div className="relative">
                        <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <textarea
                            name="description"
                            required
                            value={formData.description}
                            onChange={handleChange}
                            rows={4}
                            className="pl-10 w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="이 드릴에 대한 자세한 설명을 적어주세요..."
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        >
                            {Object.values(VideoCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">난이도</label>
                        <select
                            name="difficulty"
                            value={formData.difficulty}
                            onChange={handleChange}
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                        >
                            {Object.values(Difficulty).map(diff => (
                                <option key={diff} value={diff}>
                                    {diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Price */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">가격 (원)</label>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="number"
                            name="price"
                            min="0"
                            step="100"
                            required
                            value={formData.price}
                            onChange={handleChange}
                            className="pl-10 w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="0"
                        />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">0원으로 설정하면 무료로 공개됩니다.</p>
                </div>

                {/* Vimeo URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vimeo 영상 URL</label>
                    <div className="relative">
                        <Video className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="url"
                            name="vimeoUrl"
                            required
                            value={formData.vimeoUrl}
                            onChange={handleChange}
                            className="pl-10 w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="https://player.vimeo.com/video/..."
                        />
                    </div>
                </div>

                {/* Thumbnail URL */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">썸네일 이미지 URL</label>
                    <div className="relative">
                        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="url"
                            name="thumbnailUrl"
                            required
                            value={formData.thumbnailUrl}
                            onChange={handleChange}
                            className="pl-10 w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                            placeholder="https://example.com/image.jpg"
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/creator/dashboard')}>
                        취소
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? '업로드 중...' : '드릴 업로드'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
