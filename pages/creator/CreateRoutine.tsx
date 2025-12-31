import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createRoutine, getDrills, getRoutineById, updateRoutine } from '../../lib/api';
import { VideoCategory, Difficulty, Drill } from '../../types';
import { Button } from '../../components/Button';
import { Image as ImageIcon, DollarSign, Type, AlignLeft, X, CheckCircle } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';

export const CreateRoutine: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);
    const [showThumbnailModal, setShowThumbnailModal] = useState(false);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [selectedDrillIds, setSelectedDrillIds] = useState<string[]>([]);
    const { success, error: toastError } = useToast();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: 0,
        thumbnailUrl: '',
        difficulty: Difficulty.Beginner,
        category: VideoCategory.Standing,
        totalDurationMinutes: 0
    });

    useEffect(() => {
        if (user) {
            loadDrills();
        }
    }, [user]);

    useEffect(() => {
        if (id && user) {
            loadRoutine();
        }
    }, [id, user]);

    const loadRoutine = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const { data, error } = await getRoutineById(id);
            if (error || !data) {
                toastError('루틴을 불러오는데 실패했습니다.');
                navigate('/creator');
                return;
            }

            // Verify ownership
            if (data.creatorId !== user?.id) {
                toastError('수정 권한이 없습니다.');
                navigate('/creator');
                return;
            }

            setFormData({
                title: data.title || '',
                description: data.description || '',
                price: data.price || 0,
                thumbnailUrl: data.thumbnailUrl || '',
                difficulty: data.difficulty || Difficulty.Beginner,
                category: data.category || VideoCategory.Standing,
                totalDurationMinutes: data.totalDurationMinutes || 0
            });

            if (data.drills) {
                setSelectedDrillIds(data.drills.map(d => d.id));
            }

        } catch (error) {
            console.error('Error loading routine:', error);
            toastError('루틴 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

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
        let newSelection: string[] = [];

        setSelectedDrillIds(prev => {
            newSelection = prev.includes(drillId)
                ? prev.filter(id => id !== drillId)
                : [...prev, drillId];

            // Auto-set thumbnail from first selected drill
            if (newSelection.length > 0 && !formData.thumbnailUrl) {
                const firstDrill = drills.find(d => d.id === newSelection[0]);
                if (firstDrill?.thumbnailUrl) {
                    setFormData(prev => ({
                        ...prev,
                        thumbnailUrl: firstDrill.thumbnailUrl
                    }));
                }
            }

            // Calculate total duration
            const selectedDrills = drills.filter(d => newSelection.includes(d.id));
            const totalDuration = selectedDrills.reduce((acc, curr) => acc + (curr.durationMinutes || 0), 0);

            setFormData(prev => ({
                ...prev,
                totalDurationMinutes: totalDuration
            }));

            return newSelection;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (selectedDrillIds.length === 0) {
            toastError('최소 1개 이상의 드릴을 선택해야 합니다.');
            return;
        }

        setLoading(true);
        try {
            let result;
            const finalFormData = { ...formData };

            // Auto-set thumbnail if missing
            if (!finalFormData.thumbnailUrl && selectedDrillIds.length > 0) {
                const firstDrill = drills.find(d => d.id === selectedDrillIds[0]);
                if (firstDrill?.thumbnailUrl) {
                    finalFormData.thumbnailUrl = firstDrill.thumbnailUrl;
                    setFormData(prev => ({ ...prev, thumbnailUrl: firstDrill.thumbnailUrl }));
                }
            }

            if (isEditMode && id) {
                result = await updateRoutine(id, {
                    ...finalFormData,
                    // Remove fields that shouldn't be updated or are handled separately
                }, selectedDrillIds);
            } else {
                result = await createRoutine({
                    ...finalFormData,
                    creatorId: user.id,
                    creatorName: user.user_metadata?.name || 'Unknown Creator'
                }, selectedDrillIds);
            }

            const { data, error } = result;

            if (error) {
                console.error('Routine save error:', error);
                toastError(error.message || `루틴 ${isEditMode ? '수정' : '생성'} 중 오류가 발생했습니다.`);
                return;
            }

            if (!data) {
                console.error('No data returned');
                toastError(`루틴이 ${isEditMode ? '수정' : '생성'}되지 않았습니다. 다시 시도해주세요.`);
                return;
            }

            console.log(`Routine ${isEditMode ? 'updated' : 'created'} successfully:`, data);
            success(`루틴이 성공적으로 ${isEditMode ? '수정' : '생성'}되었습니다!`);

            // Wait a bit for the toast to show before navigating
            setTimeout(() => {
                navigate('/arena');
            }, 1000);
        } catch (error: any) {
            console.error('Error creating routine:', error);
            const errorMessage = error?.message || error?.error_description || '루틴 생성 중 오류가 발생했습니다.';
            toastError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">{isEditMode ? '루틴 수정하기' : '새로운 루틴 만들기'}</h1>
                <p className="text-slate-400">여러 드릴을 묶어 체계적인 훈련 루틴을 {isEditMode ? '수정하세요' : '만드세요'}.</p>
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

                    {/* Duration Display */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">총 소요 시간 (자동 계산)</label>
                        <div className="text-white text-lg font-bold">
                            {formData.totalDurationMinutes}분
                        </div>
                        <p className="text-xs text-slate-500 mt-1">선택한 드릴들의 시간 합계입니다.</p>
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
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-slate-300">썸네일 이미지 URL</label>
                            <button
                                type="button"
                                onClick={() => setShowThumbnailModal(true)}
                                disabled={selectedDrillIds.length === 0}
                                className="text-xs text-blue-400 hover:text-blue-300 disabled:text-slate-600 disabled:cursor-not-allowed font-medium"
                            >
                                드릴에서 선택하기
                            </button>
                        </div>
                        <div className="relative">
                            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="url"
                                name="thumbnailUrl"
                                value={formData.thumbnailUrl}
                                onChange={handleChange}
                                className="pl-10 w-full rounded-lg bg-slate-950 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500"
                                placeholder="드릴을 선택하면 자동으로 채워집니다"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">비워두면 첫 번째 드릴의 썸네일이 자동으로 사용됩니다.</p>
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
                    <Button type="button" variant="outline" onClick={() => navigate('/creator')} className="border-slate-700 text-slate-300 hover:bg-slate-800">
                        취소
                    </Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? '저장 중...' : (isEditMode ? '루틴 수정하기' : '루틴 생성하기')}
                    </Button>
                </div>
            </form>

            {/* Thumbnail Selection Modal */}
            {showThumbnailModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[80vh] flex flex-col border border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">드릴 썸네일 선택</h3>
                            <button onClick={() => setShowThumbnailModal(false)} className="text-slate-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 mb-4 pr-2">
                            {selectedDrillIds.length === 0 ? (
                                <p className="text-slate-500 text-center py-8">선택된 드릴이 없습니다.</p>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    {drills.filter(d => selectedDrillIds.includes(d.id)).map((drill) => (
                                        <div
                                            key={drill.id}
                                            onClick={() => {
                                                setFormData({ ...formData, thumbnailUrl: drill.thumbnailUrl });
                                                setShowThumbnailModal(false);
                                                success('루틴 썸네일이 설정되었습니다.');
                                            }}
                                            className="group relative aspect-video bg-slate-800 rounded-lg overflow-hidden cursor-pointer border-2 border-transparent hover:border-blue-500 transition-all shadow-lg"
                                        >
                                            <img
                                                src={drill.thumbnailUrl}
                                                alt={drill.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                                <p className="text-[10px] text-white font-medium truncate">{drill.title}</p>
                                            </div>
                                            {formData.thumbnailUrl === drill.thumbnailUrl && (
                                                <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1 shadow-lg">
                                                    <CheckCircle className="w-4 h-4 text-white" />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end pt-4 border-t border-slate-800">
                            <button
                                onClick={() => setShowThumbnailModal(false)}
                                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
