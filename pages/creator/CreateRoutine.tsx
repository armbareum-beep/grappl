import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createRoutine, getDrills, getRoutineById, updateRoutine, getCreators } from '../../lib/api';
import { VideoCategory, Difficulty, Drill, UniformType, QuantentPosition, ContentLevel, Creator } from '../../types';
import { Image as ImageIcon, DollarSign, Type, AlignLeft, X, CheckCircle, ArrowLeft, Dumbbell, Clock, RefreshCw, Clapperboard, Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { cn } from '../../lib/utils';

export const CreateRoutine: React.FC = () => {
    const { user, isAdmin } = useAuth();
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
        difficulty: Difficulty.Beginner as Difficulty | ContentLevel,
        category: VideoCategory.Standing as VideoCategory | QuantentPosition,
        uniformType: UniformType.Gi,
        totalDurationMinutes: 0,
        creatorId: ''
    });

    const [creators, setCreators] = useState<Creator[]>([]);

    // New state for related items
    const [lessons, setLessons] = useState<any[]>([]);
    const [sparringVideos, setSparringVideos] = useState<any[]>([]);
    const [relatedItems, setRelatedItems] = useState<{
        type: 'drill' | 'lesson' | 'course' | 'sparring';
        id: string;
        title: string;
        description?: string;
        difficulty?: string;
        thumbnailUrl?: string;
    }[]>([]);
    const [activeSelectionTab, setActiveSelectionTab] = useState<'drills' | 'lessons' | 'sparring'>('drills');
    const [contentSearchTerm, setContentSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;

        // Load creators list (for admin to change instructor)
        const loadCreatorsList = async () => {
            const creatorsList = await getCreators();
            setCreators(creatorsList);
        };
        loadCreatorsList();

        if (isEditMode && id) {
            // 편집 모드: 루틴 먼저 로드 후 추가 컨텐츠 로드
            loadRoutine();
        } else {
            // 새로 만들기 모드: 바로 컨텐츠 로드
            loadDrills();
        }
    }, [user?.id, id, isEditMode]);

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
            if (data.creatorId !== user?.id && !isAdmin) {
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
                uniformType: (data.uniformType as UniformType) || UniformType.Gi,
                totalDurationMinutes: data.totalDurationMinutes || 0,
                creatorId: data.creatorId || ''
            });

            if (data.drills && data.drills.length > 0) {
                const routineDrills = data.drills;
                setSelectedDrillIds(routineDrills.map(d => d.id));

                // 편집 모드: 루틴에 포함된 드릴들을 drills state에 병합
                // 다른 크리에이터의 루틴을 수정할 때도 드릴 정보가 표시되도록 함
                setDrills(prevDrills => {
                    const existingIds = new Set(prevDrills.map(d => d.id));
                    const newDrills = routineDrills.filter(d => !existingIds.has(d.id));
                    return [...prevDrills, ...newDrills];
                });
            }

            if (data.relatedItems) {
                setRelatedItems(data.relatedItems);
            }

            // 루틴 로드 후 추가 컨텐츠 로드 (레슨, 스파링 등) - creatorId 직접 전달
            await loadContent(data.creatorId);

        } catch (error) {
            console.error('Error loading routine:', error);
            toastError('루틴 정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const loadContent = async (overrideCreatorId?: string) => {
        if (!user) return;

        const api = await import('../../lib/api');
        const lessonApi = await import('../../lib/api-lessons');

        // 해당 인스트럭터의 콘텐츠만 가져옴
        const targetCreatorId = overrideCreatorId || formData.creatorId || user.id;

        const [drillsRes, lessonsRes, sparringRes] = await Promise.all([
            getDrills(targetCreatorId),
            lessonApi.getCreatorLessons(targetCreatorId),
            api.getSparringVideos(100, targetCreatorId)
        ]);

        // 편집 모드에서 루틴의 드릴들이 이미 추가되어 있을 수 있으므로 병합
        if (drillsRes) {
            setDrills(prevDrills => {
                const existingIds = new Set(prevDrills.map(d => d.id));
                const newDrills = drillsRes.filter((d: Drill) => !existingIds.has(d.id));
                // 기존 드릴 유지 + 새 드릴 추가
                return [...prevDrills, ...newDrills];
            });
        }

        // 레슨 결과 처리 (getLessons는 배열 반환, getCreatorLessons는 {data, error} 반환)
        const lessonsData = Array.isArray(lessonsRes) ? lessonsRes : lessonsRes?.data;
        if (lessonsData) {
            setLessons(lessonsData);
        }

        if (sparringRes && sparringRes.data) {
            setSparringVideos(sparringRes.data);
        }
    };

    const [pricingType, setPricingType] = useState<'auto' | 'manual' | 'free'>('auto');

    // Handle set pricing type based on formData
    useEffect(() => {
        if (formData.price === 0 && formData.isSubscriptionExcluded) {
            setPricingType('free');
        } else if (formData.isSubscriptionExcluded) {
            setPricingType('manual');
        } else {
            setPricingType('auto');
        }
    }, [formData.price, formData.isSubscriptionExcluded]);

    const handlePricingTypeChange = (type: 'auto' | 'manual' | 'free') => {
        setPricingType(type);
        if (type === 'auto') {
            setFormData(prev => ({ ...prev, isSubscriptionExcluded: false, price: 0 }));
        } else if (type === 'manual') {
            setFormData(prev => ({ ...prev, isSubscriptionExcluded: true, price: prev.price === 0 ? 1000 : prev.price }));
        } else if (type === 'free') {
            setFormData(prev => ({ ...prev, isSubscriptionExcluded: true, price: 0 }));
        }
    };

    const loadDrills = () => {
        loadContent();
    };

    const toggleRelatedItem = (item: any, type: 'lesson' | 'sparring') => {
        setRelatedItems(prev => {
            const exists = prev.some(i => i.id === item.id && i.type === type);
            if (exists) {
                return prev.filter(i => !(i.id === item.id && i.type === type));
            } else {
                return [...prev, {
                    type,
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    difficulty: item.difficulty,
                    thumbnailUrl: item.thumbnailUrl
                }];
            }
        });
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
                    setFormData(prev => {
                        // Only auto-fill if the current thumbnailUrl is empty
                        if (!prev.thumbnailUrl) {
                            return { ...prev, thumbnailUrl: firstDrill.thumbnailUrl };
                        }
                        return prev;
                    });
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
                    relatedItems: relatedItems
                }, selectedDrillIds);
            } else {
                result = await createRoutine({
                    ...finalFormData,
                    creatorId: user.id,
                    creatorName: user.user_metadata?.name || 'Unknown Creator',
                    relatedItems: relatedItems
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

            success(`루틴이 성공적으로 ${isEditMode ? '수정' : '생성'}되었습니다!`);

            // Wait a bit for the toast to show before navigating
            setTimeout(() => {
                navigate('/creator?tab=content&contentTab=routines');
            }, 1000);
        } catch (error: any) {
            console.error('Error creating routine:', error);
            const errorMessage = error?.message || error?.error_description || '루틴 생성 중 오류가 발생했습니다.';
            toastError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-zinc-500">
            <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <p className="font-medium animate-pulse">루틴 정보를 불러오는 중...</p>
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/creator')}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            {isEditMode ? '루틴 수정하기' : '새로운 루틴 만들기'}
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">
                            여러 드릴을 묶어 체계적인 훈련 루틴을 {isEditMode ? '수정하세요' : '만드세요'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info Card */}
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/50">
                        <div className="w-10 h-10 bg-violet-600/10 rounded-xl flex items-center justify-center">
                            <Dumbbell className="w-5 h-5 text-violet-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">기본 정보</h2>
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">루틴 제목</label>
                        <div className="relative">
                            <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                            <input
                                type="text"
                                name="title"
                                required
                                value={formData.title}
                                onChange={handleChange}
                                className="pl-12 w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                placeholder="예: 가드 패스 마스터 클래스"
                            />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">설명</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-zinc-600" />
                            <textarea
                                name="description"
                                required
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="pl-12 w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all resize-none placeholder:text-zinc-700"
                                placeholder="이 루틴의 목표와 내용을 설명해주세요..."
                            />
                        </div>
                    </div>

                    {/* Instructor Selection - Only show for admin */}
                    {isAdmin && (
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">인스트럭터 (Instructor)</label>
                            <select
                                name="creatorId"
                                value={formData.creatorId}
                                onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                            >
                                <option value="">인스트럭터 선택...</option>
                                {creators.map(creator => (
                                    <option key={creator.id} value={creator.id}>
                                        {creator.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Category */}
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">대표 카테고리</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                            >
                                {Object.values(VideoCategory).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Difficulty */}
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">난이도</label>
                            <select
                                name="difficulty"
                                value={formData.difficulty}
                                onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                            >
                                {Object.values(Difficulty).map(diff => (
                                    <option key={diff} value={diff}>
                                        {diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Uniform Type */}
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">도복</label>
                            <select
                                name="uniformType"
                                value={formData.uniformType}
                                onChange={handleChange}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all"
                            >
                                {Object.values(UniformType).map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Duration Display */}
                    <div className="bg-violet-600/5 border border-violet-500/10 p-5 rounded-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                                <Clock className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-zinc-400">총 소요 시간 (자동 계산)</label>
                                <div className="text-white text-2xl font-black mt-1">
                                    {formData.totalDurationMinutes}분
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-zinc-500 mt-3 ml-13">선택한 드릴들의 시간 합계입니다.</p>
                    </div>

                    {/* Pricing & Visibility Options */}
                    <div>
                        <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">가격 설정</label>
                        <div className="flex flex-col gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-950/30">

                            {/* Auto Pricing */}
                            <label className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                pricingType === 'auto' ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 hover:bg-zinc-900"
                            )}>
                                <div className="flex items-center h-5 mt-0.5">
                                    <input
                                        type="radio"
                                        name="pricingType"
                                        checked={pricingType === 'auto'}
                                        onChange={() => handlePricingTypeChange('auto')}
                                        className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-700"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className={cn("block font-semibold text-sm", pricingType === 'auto' ? "text-emerald-400" : "text-zinc-300")}>
                                        시간비례 자동 가격 (구독 포함)
                                    </span>
                                    <span className="block text-xs text-zinc-500 mt-1">
                                        영상 길이에 비례해 자동으로 가격이 책정되며, 구독권 이용자는 자유롭게 시청할 수 있습니다.
                                    </span>
                                </div>
                            </label>

                            {/* Manual Pricing */}
                            <label className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                pricingType === 'manual' ? "border-violet-500 bg-violet-500/5" : "border-zinc-800 hover:bg-zinc-900"
                            )}>
                                <div className="flex items-center h-5 mt-0.5">
                                    <input
                                        type="radio"
                                        name="pricingType"
                                        checked={pricingType === 'manual'}
                                        onChange={() => handlePricingTypeChange('manual')}
                                        className="w-4 h-4 text-violet-500 bg-zinc-900 border-zinc-700"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className={cn("block font-semibold text-sm", pricingType === 'manual' ? "text-violet-400" : "text-zinc-300")}>
                                        개별 단품 판매 (구독 제외)
                                    </span>
                                    <span className="block text-xs text-zinc-500 mt-1">
                                        모든 사용자가 설정한 가격으로 구매해야 합니다. (구독권 사용자도 별도 결제 필요)
                                    </span>
                                </div>
                            </label>

                            {/* Free Pricing */}
                            <label className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                pricingType === 'free' ? "border-amber-500 bg-amber-500/5" : "border-zinc-800 hover:bg-zinc-900"
                            )}>
                                <div className="flex items-center h-5 mt-0.5">
                                    <input
                                        type="radio"
                                        name="pricingType"
                                        checked={pricingType === 'free'}
                                        onChange={() => handlePricingTypeChange('free')}
                                        className="w-4 h-4 text-amber-500 bg-zinc-900 border-zinc-700"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className={cn("block font-semibold text-sm", pricingType === 'free' ? "text-amber-400" : "text-zinc-300")}>
                                        무료 공개
                                    </span>
                                    <span className="block text-xs text-zinc-500 mt-1">
                                        모든 사용자가 결제 없이 무료로 시청할 수 있습니다. (구독 없이도 재생 가능)
                                    </span>
                                </div>
                            </label>

                        </div>

                        {/* Price Input - Only enabled when manual is selected */}
                        <div className="mt-4 relative">
                            <DollarSign className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                                pricingType === 'manual' ? "text-violet-500" : "text-zinc-600"
                            )} />
                            <input
                                type="number"
                                name="price"
                                min="0"
                                step="1000"
                                value={pricingType === 'manual' ? formData.price : (formData.totalDurationMinutes || 0) * 1000}
                                onChange={handleChange}
                                disabled={pricingType !== 'manual'}
                                className={cn(
                                    "pl-12 w-full px-5 py-3.5 bg-zinc-950 border rounded-xl text-white outline-none text-lg font-bold transition-all",
                                    pricingType === 'manual'
                                        ? "border-violet-500 focus:ring-2 ring-violet-500/20"
                                        : "border-zinc-800 text-zinc-500 cursor-not-allowed"
                                )}
                            />
                            {pricingType === 'auto' && (
                                <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5 ml-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    총 {formData.totalDurationMinutes || 0}분 × 1,000원 = {((formData.totalDurationMinutes || 0) * 1000).toLocaleString()}원 (자동 설정됨)
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Selection Card (Drills, Lessons, Sparring) */}
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col sm:flex-row items-center justify-between pb-5 border-b border-zinc-800/50 mb-6 gap-4">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="w-10 h-10 bg-violet-600/10 rounded-xl flex items-center justify-center shrink-0">
                                <Dumbbell className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">콘텐츠 선택</h2>
                                <p className="text-sm text-zinc-500 mt-0.5">
                                    {selectedDrillIds.length}개 드릴, {relatedItems.length}개 연관항목 선택됨
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-lg border border-zinc-800 w-full sm:w-auto overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setActiveSelectionTab('drills')}
                                className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all flex-1 sm:flex-none ${activeSelectionTab === 'drills'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                드릴
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSelectionTab('lessons')}
                                className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all flex-1 sm:flex-none ${activeSelectionTab === 'lessons'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                레슨
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSelectionTab('sparring')}
                                className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap transition-all flex-1 sm:flex-none ${activeSelectionTab === 'sparring'
                                    ? 'bg-zinc-800 text-white shadow-sm'
                                    : 'text-zinc-500 hover:text-zinc-300'}`}
                            >
                                스파링
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => loadContent()}
                            className="p-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-zinc-300 hover:text-white transition-all font-semibold shrink-0"
                            title="새로고침"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>

                    {/* 콘텐츠 검색 */}
                    <div className="mb-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                            <input
                                type="text"
                                placeholder="제목, 크리에이터 이름으로 검색..."
                                value={contentSearchTerm}
                                onChange={(e) => setContentSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 transition-all"
                            />
                        </div>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 min-h-[200px]">
                        {activeSelectionTab === 'drills' && (
                            drills.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-950/30 border-2 border-dashed border-zinc-800 rounded-2xl">
                                    <Dumbbell className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                                    <p className="text-zinc-500 font-medium">등록된 드릴이 없습니다</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {drills
                                        .filter(drill => {
                                            if (!contentSearchTerm.trim()) return true;
                                            const term = contentSearchTerm.toLowerCase();
                                            return (
                                                drill.title?.toLowerCase().includes(term) ||
                                                drill.creatorName?.toLowerCase().includes(term) ||
                                                drill.description?.toLowerCase().includes(term)
                                            );
                                        })
                                        .map(drill => (
                                            <div
                                                key={drill.id}
                                                onClick={() => toggleDrillSelection(drill.id)}
                                                className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group ${selectedDrillIds.includes(drill.id)
                                                    ? 'border-violet-500 bg-violet-600/10 shadow-lg shadow-violet-500/5'
                                                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                    }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-1 shrink-0 transition-all ${selectedDrillIds.includes(drill.id)
                                                    ? 'bg-violet-500 border-violet-500 scale-110 shadow-lg'
                                                    : 'border-zinc-700 group-hover:border-zinc-500 bg-zinc-900'
                                                    }`}>
                                                    {selectedDrillIds.includes(drill.id) && (
                                                        <CheckCircle className="w-4 h-4 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-16">
                                                    <h4 className={`font-bold text-lg leading-tight transition-colors ${selectedDrillIds.includes(drill.id) ? 'text-violet-400' : 'text-white'}`}>
                                                        {drill.title}
                                                    </h4>
                                                    {drill.creatorName && (
                                                        <p className="text-xs text-violet-400/80 font-medium mt-0.5">by {drill.creatorName}</p>
                                                    )}
                                                    <p className="text-xs text-zinc-500 mt-1 line-clamp-1 leading-relaxed">{drill.description}</p>
                                                    <div className="flex items-center gap-2 mt-3 overflow-hidden flex-wrap">
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50">
                                                            {drill.category}
                                                        </span>
                                                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-md border border-zinc-700/50">
                                                            {drill.difficulty}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="absolute right-4 top-4 w-16 h-16 rounded-xl bg-zinc-900/80 border border-zinc-800 flex-shrink-0 overflow-hidden shadow-inner ring-1 ring-white/5 group-hover:scale-105 transition-transform">
                                                    {drill.thumbnailUrl && (
                                                        <img src={drill.thumbnailUrl} alt={drill.title || "썸네일"} loading="lazy" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )
                        )}

                        {activeSelectionTab === 'lessons' && (
                            lessons.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-950/30 border-2 border-dashed border-zinc-800 rounded-2xl">
                                    <p className="text-zinc-500 font-medium">등록된 레슨이 없습니다</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {lessons
                                        .filter(lesson => {
                                            if (!contentSearchTerm.trim()) return true;
                                            const term = contentSearchTerm.toLowerCase();
                                            return (
                                                lesson.title?.toLowerCase().includes(term) ||
                                                lesson.courseTitle?.toLowerCase().includes(term) ||
                                                lesson.course?.creatorName?.toLowerCase().includes(term) ||
                                                lesson.description?.toLowerCase().includes(term)
                                            );
                                        })
                                        .map(lesson => {
                                            const isSelected = relatedItems.some(i => i.id === lesson.id && i.type === 'lesson');
                                            return (
                                                <div
                                                    key={lesson.id}
                                                    onClick={() => toggleRelatedItem(lesson, 'lesson')}
                                                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group ${isSelected
                                                        ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/5'
                                                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-1 shrink-0 transition-all ${isSelected
                                                        ? 'bg-blue-500 border-blue-500 scale-110 shadow-lg'
                                                        : 'border-zinc-700 group-hover:border-zinc-500 bg-zinc-900'
                                                        }`}>
                                                        {isSelected && (
                                                            <CheckCircle className="w-4 h-4 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-16">
                                                        <h4 className={`font-bold text-lg leading-tight transition-colors ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                                                            {lesson.title}
                                                        </h4>
                                                        {(lesson.course?.creatorName || lesson.courseTitle) && (
                                                            <p className="text-xs text-blue-400/80 font-medium mt-0.5">
                                                                {lesson.course?.creatorName && `by ${lesson.course.creatorName}`}
                                                                {lesson.course?.creatorName && lesson.courseTitle && ' · '}
                                                                {lesson.courseTitle && `${lesson.courseTitle}`}
                                                            </p>
                                                        )}
                                                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1 leading-relaxed">{lesson.description}</p>
                                                    </div>
                                                    <div className="absolute right-4 top-4 w-16 h-16 rounded-xl bg-zinc-900/80 border border-zinc-800 flex-shrink-0 overflow-hidden shadow-inner ring-1 ring-white/5">
                                                        {lesson.thumbnailUrl && (
                                                            <img src={lesson.thumbnailUrl} alt={lesson.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )
                        )}

                        {activeSelectionTab === 'sparring' && (
                            sparringVideos.length === 0 ? (
                                <div className="text-center py-20 bg-zinc-950/30 border-2 border-dashed border-zinc-800 rounded-2xl">
                                    <p className="text-zinc-500 font-medium">등록된 스파링 영상이 없습니다</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {sparringVideos
                                        .filter(video => {
                                            if (!contentSearchTerm.trim()) return true;
                                            const term = contentSearchTerm.toLowerCase();
                                            return (
                                                video.title?.toLowerCase().includes(term) ||
                                                video.creator?.name?.toLowerCase().includes(term) ||
                                                video.description?.toLowerCase().includes(term)
                                            );
                                        })
                                        .map(video => {
                                            const isSelected = relatedItems.some(i => i.id === video.id && i.type === 'sparring');
                                            return (
                                                <div
                                                    key={video.id}
                                                    onClick={() => toggleRelatedItem(video, 'sparring')}
                                                    className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all group ${isSelected
                                                        ? 'border-emerald-500 bg-emerald-600/10 shadow-lg shadow-emerald-500/5'
                                                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 hover:bg-zinc-900'
                                                        }`}
                                                >
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mt-1 shrink-0 transition-all ${isSelected
                                                        ? 'bg-emerald-500 border-emerald-500 scale-110 shadow-lg'
                                                        : 'border-zinc-700 group-hover:border-zinc-500 bg-zinc-900'
                                                        }`}>
                                                        {isSelected && (
                                                            <CheckCircle className="w-4 h-4 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 pr-16">
                                                        <h4 className={`font-bold text-lg leading-tight transition-colors ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                                                            {video.title}
                                                        </h4>
                                                        {video.creator?.name && (
                                                            <p className="text-xs text-emerald-400/80 font-medium mt-0.5">by {video.creator.name}</p>
                                                        )}
                                                        <p className="text-xs text-zinc-500 mt-1 line-clamp-1 leading-relaxed">{video.description}</p>
                                                    </div>
                                                    <div className="absolute right-4 top-4 w-24 h-16 rounded-xl bg-zinc-900/80 border border-zinc-800 flex-shrink-0 overflow-hidden shadow-inner ring-1 ring-white/5">
                                                        {video.thumbnailUrl ? (
                                                            <img src={video.thumbnailUrl} alt={video.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Clapperboard className="w-6 h-6 text-zinc-600" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Thumbnail URL */}
                <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                    <div className="flex items-center gap-3 pb-5 border-b border-zinc-800/50 mb-6">
                        <div className="w-10 h-10 bg-violet-600/10 rounded-xl flex items-center justify-center">
                            <ImageIcon className="w-5 h-5 text-violet-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">썸네일 설정</h2>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-zinc-400 ml-1">썸네일 이미지 URL</label>
                            <button
                                type="button"
                                onClick={() => setShowThumbnailModal(true)}
                                disabled={selectedDrillIds.length === 0}
                                className="text-xs text-violet-400 hover:text-violet-300 disabled:text-zinc-600 disabled:cursor-not-allowed font-semibold transition-colors"
                            >
                                드릴에서 선택하기
                            </button>
                        </div>
                        <div className="relative">
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                            <input
                                type="url"
                                name="thumbnailUrl"
                                value={formData.thumbnailUrl}
                                onChange={handleChange}
                                className="pl-12 w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                placeholder="드릴을 선택하면 자동으로 채워집니다"
                            />
                        </div>
                        <p className="text-xs text-zinc-500 mt-2 ml-1">비워두면 첫 번째 드릴의 썸네일이 자동으로 사용됩니다.</p>

                        {/* Preview */}
                        {formData.thumbnailUrl && (
                            <div className="mt-4 w-full aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-800/50 relative group">
                                <img src={formData.thumbnailUrl} alt="Thumbnail Preview" loading="lazy" className="w-full h-full object-cover" />
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-md">
                                    미리보기
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/creator')}
                        className="px-6 py-3.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-bold transition-all"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-3.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-500 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95"
                    >
                        {loading ? '저장 중...' : (isEditMode ? '루틴 수정하기' : '루틴 생성하기')}
                    </button>
                </div>
            </form>

            {/* Thumbnail Selection Modal */}
            {showThumbnailModal && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-zinc-900 rounded-3xl shadow-2xl max-w-2xl w-full p-8 max-h-[85vh] flex flex-col border border-zinc-800/50 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h3 className="text-3xl font-black text-white tracking-tight">드릴 썸네일 선택</h3>
                                <p className="text-zinc-500 font-medium mt-1">선택한 드릴 중 하나를 대표 이미지로 사용하세요</p>
                            </div>
                            <button
                                onClick={() => setShowThumbnailModal(false)}
                                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-zinc-400 hover:text-white transition-all shadow-lg active:scale-95"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 mb-8 scrollbar-none pr-1">
                            {selectedDrillIds.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                                    <Dumbbell className="w-16 h-16 text-zinc-700 mb-4" />
                                    <p className="text-zinc-600 font-bold">선택된 드릴이 없습니다</p>
                                </div>
                            ) : (() => {
                                const selectedDrillsWithThumbnails = drills.filter(d => selectedDrillIds.includes(d.id) && d.thumbnailUrl);
                                const selectedDrillsWithoutThumbnails = drills.filter(d => selectedDrillIds.includes(d.id) && !d.thumbnailUrl);

                                if (selectedDrillsWithThumbnails.length === 0) {
                                    return (
                                        <div className="flex flex-col items-center justify-center py-20 grayscale opacity-40">
                                            <ImageIcon className="w-16 h-16 text-zinc-700 mb-4" />
                                            <p className="text-zinc-600 font-bold">선택된 드릴에 썸네일이 없습니다</p>
                                            <p className="text-zinc-700 text-sm mt-2">드릴 수정에서 썸네일을 먼저 설정해주세요</p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                                            {selectedDrillsWithThumbnails.map((drill) => (
                                                <div
                                                    key={drill.id}
                                                    onClick={() => {
                                                        if (drill.thumbnailUrl) {
                                                            setFormData({ ...formData, thumbnailUrl: drill.thumbnailUrl });
                                                            setShowThumbnailModal(false);
                                                            success('루틴 썸네일이 설정되었습니다!');
                                                        }
                                                    }}
                                                    className="group relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-violet-500 transition-all shadow-2xl ring-1 ring-white/5"
                                                >
                                                    <div className="absolute inset-0 bg-zinc-800 animate-pulse group-hover:hidden" />
                                                    <img
                                                        src={drill.thumbnailUrl}
                                                        alt={drill.title}
                                                        loading="lazy"
                                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 blur-[2px] hover:blur-0"
                                                        onLoad={(e) => (e.currentTarget.style.filter = 'none')}
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                        <p className="text-xs font-black text-white truncate drop-shadow-lg">{drill.title}</p>
                                                        <p className="text-[10px] font-bold text-violet-400 mt-0.5">클릭하여 선택</p>
                                                    </div>
                                                    {formData.thumbnailUrl === drill.thumbnailUrl && (
                                                        <div className="absolute top-4 right-4 bg-violet-600 rounded-full p-2 shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-violet-400/50">
                                                            <CheckCircle className="w-5 h-5 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        {selectedDrillsWithoutThumbnails.length > 0 && (
                                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                                <p className="text-xs text-amber-400">
                                                    {selectedDrillsWithoutThumbnails.length}개의 드릴에 썸네일이 없습니다: {selectedDrillsWithoutThumbnails.map(d => d.title).join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="flex gap-3 pt-6 border-t border-zinc-800/50">
                            <button
                                onClick={() => setShowThumbnailModal(false)}
                                className="flex-1 py-4 bg-violet-600 text-white hover:bg-violet-500 rounded-2xl font-black transition-all active:scale-95 shadow-xl shadow-violet-500/20"
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
