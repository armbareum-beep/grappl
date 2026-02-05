import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    getSparringVideoById,
    updateSparringVideo,
    getDrills,
    getAllCreatorLessons,
} from '../../lib/api';
import {
    ArrowLeft,
    CheckCircle,
    Loader,
    DollarSign,
    PlayCircle,
    Grid,
    Clapperboard,
    ChevronRight,
    Type,
    Settings2,
    Tags
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { UniformType, SparringVideo, Drill, Lesson } from '../../types';
import { Button } from '../../components/Button';
import { cn } from '../../lib/utils';

export const UploadSparring: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode'); // 'sales' or normal

    const { success, error: toastError } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<'Sparring' | 'Competition'>('Sparring');
    const [uniformType, setUniformType] = useState<UniformType>(UniformType.Gi);
    const [price, setPrice] = useState(0);
    const [relatedItems, setRelatedItems] = useState<SparringVideo['relatedItems']>([]);
    const [videoUrl, setVideoUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState('');

    // Selection State
    const [drills, setDrills] = useState<Drill[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [activeTab, setActiveTab] = useState<'drills' | 'lessons'>('drills');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    useEffect(() => {
        if (id && user) {
            loadSparringVideo();
            loadAllContent();
        }
    }, [id, user?.id]);

    const loadSparringVideo = async () => {
        if (!id) return;
        setIsLoadingData(true);
        try {
            const { data, error } = await getSparringVideoById(id);
            if (error || !data) {
                toastError('스파링 영상을 불러오는데 실패했습니다.');
                navigate('/creator');
                return;
            }

            if (data.creatorId !== user?.id) {
                toastError('수정 권한이 없습니다.');
                navigate('/creator');
                return;
            }

            setTitle(data.title);
            setDescription(data.description || '');
            setCategory(data.category as any || 'Sparring');
            setUniformType(data.uniformType as any || UniformType.Gi);
            setPrice(data.price || 0);
            setRelatedItems(data.relatedItems || []);
            setVideoUrl(data.videoUrl || '');
            setThumbnailUrl(data.thumbnailUrl || '');

        } catch (err: any) {
            console.error(err);
            toastError('정보를 불러오는데 실패했습니다.');
        } finally {
            setIsLoadingData(false);
        }
    };

    const loadAllContent = async () => {
        if (!user) return;
        try {
            const [drillsData, lessonsData] = await Promise.all([
                getDrills(user.id),
                getAllCreatorLessons(user.id)
            ]);

            setDrills(Array.isArray(drillsData) ? drillsData : (drillsData as any)?.data || []);
            setLessons(lessonsData || []);
        } catch (err) {
            console.error('Failed to load content for selection:', err);
        }
    };

    const toggleRelatedItem = (item: { id: string, title: string }, type: 'drill' | 'lesson') => {
        setRelatedItems(prev => {
            const exists = prev.some(i => i.id === item.id && i.type === type);
            if (exists) {
                return prev.filter(i => !(i.id === item.id && i.type === type));
            } else {
                return [...prev, { id: item.id, title: item.title, type }];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || isSubmitting || !id) return;

        if (mode === 'sales' && price <= 0) {
            toastError('판매 상품으로 등록하려면 가격을 설정해야 합니다.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await updateSparringVideo(id, {
                title,
                description,
                relatedItems,
                category: category as any,
                uniformType,
                difficulty: undefined as any,
                price
            });

            if (error) throw error;

            success(mode === 'sales' || price > 0 ? '판매 정보가 업데이트되었습니다.' : '스파링 영상 정보가 수정되었습니다.');

            // Redirect back to context
            if (price > 0) {
                navigate('/creator?tab=content&contentTab=sparring');
            } else {
                navigate('/creator?tab=materials&contentTab=sparring');
            }
        } catch (err: any) {
            console.error('Update failed:', err);
            toastError('오류가 발생했습니다: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoadingData) return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-500 gap-4">
            <Loader className="w-8 h-8 animate-spin text-violet-500" />
            <span className="font-medium">데이터 불러오는 중...</span>
        </div>
    );

    const filteredDrills = drills.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredLessons = lessons.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header Sticky Bar */}
            <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
                <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/creator')}
                            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">
                                {mode === 'sales' ? '판매 설정' : '스파링 관리'}
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                <span className="max-w-[150px] truncate">{title}</span>
                                <ChevronRight className="w-3 h-3" />
                                <span className="text-violet-400 font-medium">{mode === 'sales' ? '공개 및 판매' : '정보 수정'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => navigate('/creator')}
                            className="hidden sm:flex border-zinc-800"
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !title}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-8 h-11"
                        >
                            {isSubmitting ? <Loader className="w-4 h-4 animate-spin" /> : '저장하기'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Video Preview & Basic Info */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Video Card */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
                            <div className="aspect-video bg-black relative">
                                {videoUrl ? (
                                    <video
                                        src={videoUrl}
                                        poster={thumbnailUrl}
                                        className="w-full h-full object-contain"
                                        controls
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-3">
                                        <Clapperboard className="w-12 h-12 opacity-20" />
                                        <p className="text-sm">영상을 불러올 수 없습니다.</p>
                                    </div>
                                )}
                            </div>
                            <div className="p-6 bg-zinc-900/50">
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 text-zinc-400 mb-2">
                                            <Type className="w-4 h-4" />
                                            <span className="text-sm font-semibold uppercase tracking-wider">기본 정보</span>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 ml-1">제목</label>
                                            <input
                                                type="text"
                                                value={title}
                                                onChange={e => setTitle(e.target.value)}
                                                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none transition-all placeholder:text-zinc-800 text-lg font-bold"
                                                placeholder="스파링 제목을 입력하세요"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 ml-1">설명</label>
                                            <textarea
                                                value={description}
                                                onChange={e => setDescription(e.target.value)}
                                                className="w-full px-5 py-4 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none resize-none transition-all placeholder:text-zinc-800 min-h-[120px] leading-relaxed"
                                                placeholder="해당 스파링의 특징, 배울 점 등을 적어주세요."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800/50">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Uniform</label>
                                            <select
                                                value={uniformType}
                                                onChange={e => setUniformType(e.target.value as any)}
                                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold appearance-none focus:border-violet-500 outline-none"
                                            >
                                                <option value={UniformType.Gi}>Gi</option>
                                                <option value={UniformType.NoGi}>No-Gi</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5 col-span-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Category</label>
                                            <select
                                                value={category}
                                                onChange={e => setCategory(e.target.value as any)}
                                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-sm font-bold appearance-none focus:border-violet-500 outline-none"
                                            >
                                                <option value="Sparring">스파링 (Sparring)</option>
                                                <option value="Competition">컴페티션 (Competition)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Related Items Selector */}
                        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Tags className="w-5 h-5 text-violet-400" />
                                    <h3 className="font-bold">연관 기술 및 영상 태그</h3>
                                </div>
                                <div className="relative w-48">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="검색..."
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-1.5 px-3 text-xs outline-none focus:border-violet-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex border-b border-zinc-800">
                                {(['drills', 'lessons'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            "flex-1 py-3 text-xs font-bold transition-all uppercase tracking-widest",
                                            activeTab === tab
                                                ? "text-violet-400 border-b-2 border-violet-500 bg-violet-500/5"
                                                : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                        )}
                                    >
                                        {tab === 'drills' ? '드릴' : '레슨'}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {activeTab === 'drills' && filteredDrills.map(drill => (
                                        <button
                                            key={drill.id}
                                            onClick={() => toggleRelatedItem(drill, 'drill')}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                                                relatedItems.some(i => i.id === drill.id && i.type === 'drill')
                                                    ? "bg-violet-600/10 border-violet-500/50"
                                                    : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                                <Grid className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{drill.title}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">{drill.category}</p>
                                            </div>
                                            {relatedItems.some(i => i.id === drill.id && i.type === 'drill') && (
                                                <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                    {activeTab === 'lessons' && filteredLessons.map(lesson => (
                                        <button
                                            key={lesson.id}
                                            onClick={() => toggleRelatedItem(lesson, 'lesson')}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
                                                relatedItems.some(i => i.id === lesson.id && i.type === 'lesson')
                                                    ? "bg-emerald-600/10 border-emerald-500/50"
                                                    : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center">
                                                <PlayCircle className="w-5 h-5 text-zinc-600 group-hover:text-emerald-400 transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{lesson.title}</p>
                                                <p className="text-[10px] text-zinc-500 font-medium">Lesson</p>
                                            </div>
                                            {relatedItems.some(i => i.id === lesson.id && i.type === 'lesson') && (
                                                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {((activeTab === 'drills' && filteredDrills.length === 0) ||
                                    (activeTab === 'lessons' && filteredLessons.length === 0)) && (
                                        <div className="text-center py-20 bg-zinc-950/30 rounded-xl border border-dashed border-zinc-800/50">
                                            <p className="text-zinc-600 text-sm">항목이 없습니다.</p>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Pricing & Quick Actions */}
                    <div className="space-y-6">
                        {/* Pricing Card */}
                        <div className={cn(
                            "bg-zinc-900 border overflow-hidden rounded-2xl shadow-xl transition-all duration-500",
                            mode === 'sales' || price > 0 ? "border-violet-500/50 ring-1 ring-violet-500/20" : "border-zinc-800"
                        )}>
                            <div className={cn(
                                "p-4 border-b flex items-center gap-2",
                                mode === 'sales' || price > 0 ? "bg-violet-500/10 border-violet-500/20" : "bg-zinc-800/30 border-zinc-800"
                            )}>
                                <DollarSign className={cn("w-5 h-5", mode === 'sales' || price > 0 ? "text-violet-400" : "text-zinc-500")} />
                                <h3 className="font-black text-sm uppercase tracking-widest">판매 및 가격 구성</h3>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div className="relative">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black text-violet-500">₩</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="1000"
                                            value={price}
                                            onChange={e => setPrice(Number(e.target.value))}
                                            className="w-full pl-12 pr-6 py-5 bg-zinc-950 border border-zinc-800 rounded-2xl text-3xl font-black text-white outline-none focus:border-violet-500 transition-all placeholder:text-zinc-800 shadow-inner"
                                            placeholder="0"
                                        />
                                    </div>
                                    <p className="text-xs text-zinc-500 leading-relaxed text-center px-4">
                                        가격을 설정하면 해당 영상이 <span className="text-violet-400 font-bold">'내 콘텐츠'</span> 탭으로 자동 이동하며 사용자들에게 유료로 노출됩니다.
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">설정 요약</div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                                            <span className="text-xs text-zinc-400">판매 상태</span>
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded", price > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 bg-zinc-800")}>
                                                {price > 0 ? '판매 중' : '무료/비공개'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between p-3 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                                            <span className="text-xs text-zinc-400">연관 태그</span>
                                            <span className="text-xs font-bold text-white">{relatedItems.length}개</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Tips */}
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Settings2 className="w-5 h-5 text-zinc-500" />
                                <h3 className="font-bold text-sm">관리 팁</h3>
                            </div>
                            <ul className="space-y-4">
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-violet-400">1</div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">자신의 레슨이나 드릴 영상을 태그하면 학생들이 스파링 영상에서 관련 기술을 바로 학습할 수 있습니다.</p>
                                </li>
                                <li className="flex gap-3">
                                    <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-violet-400">2</div>
                                    <p className="text-xs text-zinc-400 leading-relaxed">제목에 날짜와 상대방의 급수를 적어주면 사용자들이 검색하기 더 좋습니다.</p>
                                </li>
                            </ul>
                        </div>

                        {/* Submit for Mobile (Visible on right on desktop) */}
                        <div className="pt-4 flex flex-col gap-3">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !title || (mode === 'sales' && price <= 0)}
                                className="w-full py-5 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-white rounded-2xl font-black text-lg transition-all shadow-xl shadow-violet-500/10 active:scale-[0.98] flex items-center justify-center gap-3"
                            >
                                {isSubmitting && <Loader className="w-5 h-5 animate-spin" />}
                                {mode === 'sales' ? '판매 상품 등록하기' : '변경사항 저장하기'}
                            </button>
                            <Link to="/creator" className="w-full">
                                <Button variant="ghost" className="w-full py-5 text-zinc-500 hover:text-white">크리에이터 대시보드로 돌아가기</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
