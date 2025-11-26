import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createRoutine, getDrills, Drill } from '../../lib/api';
import { VideoCategory, Difficulty } from '../../types';
import { Button } from '../../components/Button';
import { Upload, Image as ImageIcon, DollarSign, Type, AlignLeft, Plus, X, GripVertical } from 'lucide-react';

export const CreateRoutine: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [selectedDrillIds, setSelectedDrillIds] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        thumbnailUrl: '',
        difficulty: Difficulty.Beginner,
        category: VideoCategory.Standing
    });

    useEffect(() => {
        if (user) {
            loadDrills();
        }
    }, [user]);

    const loadDrills = async () => {
        if (!user) return;
        const { data } = await getDrills(user.id);
        if (data) {
            setDrills(data);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? Number(value) : value
        }));
    };

    const toggleDrillSelection = (drillId: string) => {
        setSelectedDrillIds(prev => {
            if (prev.includes(drillId)) {
                return prev.filter(id => id !== drillId);
            } else {
                return [...prev, drillId];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (selectedDrillIds.length === 0) {
            alert('최소 1개 이상의 드릴을 선택해야 합니다.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await createRoutine({
                ...formData,
                creatorId: user.id,
                creatorName: user.user_metadata?.name || 'Unknown Creator'
            }, selectedDrillIds);

            if (error) throw error;

            alert('루틴이 성공적으로 생성되었습니다!');
            navigate('/creator/dashboard');
        } catch (error) {
            console.error('Error creating routine:', error);
            alert('루틴 생성 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">새로운 루틴 만들기</h1>
                <p className="text-slate-400">여러 드릴을 묶어 체계적인 훈련 루틴을 만드세요.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-8 space-y-6">
                    <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-4">기본 정보</h2>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">루틴 제목</label>
                        <div className="relative">
                            <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                                className="pl-10 w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="예: 가드 패스 마스터 클래스"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">설명</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <textarea
                                name="description"
                                required
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="pl-10 w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="이 루틴의 목표와 내용을 설명해주세요..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">대표 카테고리</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
                            >
                                {Object.values(VideoCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">난이도</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleChange}
                                className="w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
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
                        <label className="block text-sm font-medium text-slate-300 mb-1">가격 (원)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="number"
                                name="price"
                                min="0"
                                step="100"
                                required
                                value={formData.price}
                                onChange={handleChange}
                                className="pl-10 w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="0"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">0원으로 설정하면 무료로 공개됩니다.</p>
                    </div>

                    {/* Thumbnail URL */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">썸네일 이미지 URL</label>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="url"
                                name="thumbnailUrl"
                                required
                                value={formData.thumbnailUrl}
                                onChange={handleChange}
                                className="pl-10 w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>
                    </div>
                </div>

                {/* Drill Selection */}
                <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-8">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
                        <h2 className="text-lg font-semibold text-white">드릴 선택 ({selectedDrillIds.length}개 선택됨)</h2>
                        <Button type="button" variant="outline" size="sm" onClick={() => loadDrills()} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                            목록 새로고침
                        </Button>
                    </div>

                    {drills.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            등록된 드릴이 없습니다. 먼저 드릴을 업로드해주세요.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2">
                            {drills.map(drill => (
                                <div
                                    key={drill.id}
                                    onClick={() => toggleDrillSelection(drill.id)}
                                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedDrillIds.includes(drill.id)
                                        ? 'border-blue-500 bg-blue-900/20 ring-1 ring-blue-500'
                                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                                        }`}
                                >
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mt-0.5 flex-shrink-0 ${selectedDrillIds.includes(drill.id)
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'border-slate-600 bg-slate-800'
                                        }`}>
                                        {selectedDrillIds.includes(drill.id) && (
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-white truncate">{drill.title}</h4>
                                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{drill.description}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                                                {drill.category}
                                            </span>
                                            <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-full">
                                                {drill.difficulty}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-16 h-16 rounded bg-slate-800 flex-shrink-0 overflow-hidden">
                                        <img src={drill.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => navigate('/creator/dashboard')} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                        취소
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? '생성 중...' : '루틴 생성하기'}
                    </Button>
                </div>
            </form>
        </div>
    );
};
