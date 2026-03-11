import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { X, BookOpen, Layers, Clapperboard, CheckCircle, Clock, DollarSign, PlayCircle, Grid, Upload, Search, ArrowUp, ArrowDown, Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../../lib/utils';
import {
    getCourseDrillBundles, getCourseSparringVideos, getCreators, getLessonsByCourse, uploadThumbnail
} from '../../lib/api';
import { fetchBrandsByCreator } from '../../lib/api-organizers';
import {
    Course, Lesson, Drill, SparringVideo, DrillRoutine,
    VideoCategory, Difficulty, UniformType, Creator, EventBrand
} from '../../types';
import { ImageUploader } from '../ImageUploader';
import { VideoEditor } from '../VideoEditor';
import { VimeoThumbnailSelector } from '../VimeoThumbnailSelector';
import { ThumbnailCropper } from '../ThumbnailCropper';
import { Scissors } from 'lucide-react'; // Import Scissors
import { useToast } from '../../contexts/ToastContext';
import { extractVimeoId, extractVimeoHash } from '../../lib/vimeo';
import Player from '@vimeo/player';

// Content Types
type ContentType = 'course' | 'routine' | 'sparring';

interface UnifiedContentModalProps {
    isOpen: boolean;
    onClose: () => void;
    contentType: ContentType;
    editingItem?: Course | DrillRoutine | SparringVideo | null;

    // Available items for selection
    lessons?: Lesson[];
    drills?: Drill[];
    sparringVideos?: SparringVideo[];

    // Callbacks
    onSave: (data: any) => Promise<void>;
}

const CONTENT_CONFIG = {
    course: {
        title: '클래스',
        icon: BookOpen,
        color: 'violet',
        primaryItems: 'lessons' as const,
        primaryLabel: '레슨',
        relatedLabel: '관련 드릴/스파링',
        hasPreview: false,
        hasDuration: false,
    },
    routine: {
        title: '루틴',
        icon: Layers,
        color: 'emerald',
        primaryItems: 'drills' as const,
        primaryLabel: '드릴',
        relatedLabel: '관련 레슨/스파링',
        hasPreview: false,
        hasDuration: true,
    },
    sparring: {
        title: '스파링',
        icon: Clapperboard,
        color: 'blue',
        primaryItems: null,
        primaryLabel: '',
        relatedLabel: '관련 레슨/드릴',
        hasPreview: false,
        hasDuration: false,
    },
};

export const UnifiedContentModal: React.FC<UnifiedContentModalProps> = ({
    isOpen,
    onClose,
    contentType,
    editingItem,
    lessons = [],
    drills = [],
    sparringVideos = [],
    onSave,
}) => {
    const { user } = useAuth();
    const config = CONTENT_CONFIG[contentType];
    const isEditMode = !!editingItem;
    const { warning, success, error: toastError } = useToast();

    // Refs for video capture
    const vimeoIframeRef = useRef<HTMLIFrameElement>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [vimeoEmbedUrl, setVimeoEmbedUrl] = useState<string>('');

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        uniformType: UniformType.Gi,
        price: 0,
        thumbnailUrl: '',
        isSubscriptionExcluded: false,
        isHidden: false,
        sparringType: 'Sparring' as 'Sparring' | 'Competition',
        creatorId: user?.id || '',
        brandId: '',
    });

    const [creators, setCreators] = useState<Creator[]>([]);
    const [brands, setBrands] = useState<EventBrand[]>([]);

    useEffect(() => {
        const loadCreators = async () => {
            const creatorsList = await getCreators();
            setCreators(creatorsList);
        };
        loadCreators();
    }, []);

    // Load brands when creatorId changes
    useEffect(() => {
        const loadBrands = async () => {
            if (formData.creatorId) {
                const fetchedBrands = await fetchBrandsByCreator(formData.creatorId);
                setBrands(fetchedBrands);

                // Reset brandId if the selected creator doesn't own the previously selected brand
                if (formData.brandId && !fetchedBrands.some(b => b.id === formData.brandId)) {
                    setFormData(prev => ({ ...prev, brandId: '' }));
                }
            } else {
                setBrands([]);
                setFormData(prev => ({ ...prev, brandId: '' }));
            }
        };
        loadBrands();
    }, [formData.creatorId]);

    // Selection State
    const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
    const [selectedDrillIds, setSelectedDrillIds] = useState<string[]>([]);
    const [selectedSparringIds, setSelectedSparringIds] = useState<string[]>([]);
    const [relatedItems, setRelatedItems] = useState<{ type: string; id: string; title: string }[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'related' | 'preview'>('basic');
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [showPreviewTrimmer, setShowPreviewTrimmer] = useState(false);
    const [previewVideoFile, setPreviewVideoFile] = useState<File | null>(null);
    const [previewCuts, setPreviewCuts] = useState<{ start: number; end: number }[] | null>(null);
    const [mainVideoFile, setMainVideoFile] = useState<File | null>(null);
    const [mainVideoCuts, setMainVideoCuts] = useState<{ start: number; end: number }[] | null>(null);
    const [showMainTrimmer, setShowMainTrimmer] = useState(false);
    const [relatedFilter, setRelatedFilter] = useState<'lesson' | 'drill' | 'sparring' | null>(null);
    const [showPublishingModal, setShowPublishingModal] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState<any>(null);
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

    // Initialize related filter when tab changes or content type changes
    useEffect(() => {
        if (activeTab === 'related') {
            if (contentType === 'course') setRelatedFilter('sparring');
            else if (contentType === 'routine') setRelatedFilter('lesson');
            else if (contentType === 'sparring') setRelatedFilter('lesson');
        }
    }, [activeTab, contentType]);

    // Computed Values
    const totalDurationMinutes = contentType === 'routine'
        ? (drills || []).filter(d => selectedDrillIds.includes(d.id)).reduce((acc, d) => acc + (d.durationMinutes || 0), 0)
        : contentType === 'course'
            ? (lessons || []).filter(l => selectedLessonIds.includes(l.id)).reduce((acc, l) => acc + (l.durationMinutes || 0), 0)
            : (editingItem as SparringVideo)?.durationMinutes || 0;

    const calculatedPrice = formData.isSubscriptionExcluded
        ? formData.price
        : totalDurationMinutes * 1000;

    // Initialize form data when editing
    useEffect(() => {
        if (editingItem) {
            setFormData({
                title: editingItem.title || '',
                description: editingItem.description || '',
                category: (editingItem as any).category || VideoCategory.Standing,
                difficulty: (editingItem as any).difficulty || Difficulty.Beginner,
                uniformType: (editingItem as any).uniformType || UniformType.Gi,
                price: (editingItem as any).price || 0,
                thumbnailUrl: editingItem.thumbnailUrl || '',
                isSubscriptionExcluded: (editingItem as any).isSubscriptionExcluded || false,
                isHidden: (editingItem as any).isHidden || false,
                sparringType: (editingItem as any).category === 'Competition' ? 'Competition' : 'Sparring',
                creatorId: (editingItem as any).creatorId || '',
                brandId: (editingItem as any).brandId || '',
            });

            // Initialize Vimeo embed URL for sparring
            if (contentType === 'sparring') {
                const videoUrl = (editingItem as SparringVideo).videoUrl || '';
                if (videoUrl) {
                    const vId = extractVimeoId(videoUrl);
                    const vHash = extractVimeoHash(videoUrl);
                    if (vId) {
                        let embedUrl = `https://player.vimeo.com/video/${vId}`;
                        if (vHash) embedUrl += `?h=${vHash}`;
                        setVimeoEmbedUrl(embedUrl);
                    }
                }
            }

            // Load selected items based on content type
            if (contentType === 'course') {
                // Initialize selected lessons from available lessons that belong to this course
                // Initialize selected lessons from DB to ensure accuracy
                const loadCourseLessons = async () => {
                    try {
                        const { data } = await getLessonsByCourse(editingItem.id);
                        if (data) {
                            setSelectedLessonIds(data.map(l => l.id));
                        }
                    } catch (err) {
                        console.error('Failed to load course lessons:', err);
                    }
                };
                loadCourseLessons();

                // Initialize related items (bundles) for courses
                const loadCourseBundles = async () => {
                    try {
                        const drillsRes = await getCourseDrillBundles(editingItem.id);
                        const sparringVideosRes = await getCourseSparringVideos(editingItem.id);

                        const bundledDrills = (drillsRes.data || []).map((d: any) => ({ type: 'drill', id: d.id, title: d.title }));
                        const bundledSparring = (sparringVideosRes.data || []).map((v: any) => ({ type: 'sparring', id: v.id, title: v.title }));

                        const items = [...bundledDrills, ...bundledSparring];
                        setRelatedItems(items);
                        setSelectedDrillIds(prev => [...new Set([...prev, ...bundledDrills.map((d: any) => d.id)])]);
                        setSelectedSparringIds(prev => [...new Set([...prev, ...bundledSparring.map((s: any) => s.id)])]);
                    } catch (err) {
                        console.error('Error loading course bundles in modal:', err);
                    }
                };
                loadCourseBundles();
            }
            if (contentType === 'routine' && (editingItem as DrillRoutine).drills) {
                setSelectedDrillIds((editingItem as DrillRoutine).drills?.map(d => d.id) || []);
            }
            if ((editingItem as any).relatedItems) {
                setRelatedItems((editingItem as any).relatedItems);

                // Also sync selected IDs for legacy support if needed
                const related = (editingItem as any).relatedItems as { type: string; id: string }[];
                setSelectedDrillIds(prev => [...new Set([...prev, ...related.filter(r => r.type === 'drill').map(r => r.id)])]);
                setSelectedSparringIds(prev => [...new Set([...prev, ...related.filter(r => r.type === 'sparring').map(r => r.id)])]);
            }
        }
    }, [editingItem, contentType]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setFormData({
                title: '',
                description: '',
                category: VideoCategory.Standing,
                difficulty: Difficulty.Beginner,
                uniformType: UniformType.Gi,
                price: 0,
                thumbnailUrl: '',
                isSubscriptionExcluded: false,
                isHidden: false,
                sparringType: 'Sparring',
                creatorId: user?.id || '',
                brandId: '',
            });
            setSelectedLessonIds([]);
            setSelectedDrillIds([]);
            setSelectedSparringIds([]);
            setRelatedItems([]);
            setActiveTab('basic');
            setSearchQuery('');
            setMainVideoFile(null);
            setMainVideoCuts(null);
            setShowMainTrimmer(false);
            setVimeoEmbedUrl('');
            setCroppingImage(null);
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? Number(value) : value
        }));
    };

    const toggleSelection = (id: string, type: 'lesson' | 'drill' | 'sparring') => {
        if (type === 'lesson') {
            setSelectedLessonIds(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        } else if (type === 'drill') {
            setSelectedDrillIds(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        } else {
            setSelectedSparringIds(prev =>
                prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
            );
        }
    };

    // Thumbnail capture functions for sparring
    const captureFromVimeo = async () => {
        if (!vimeoIframeRef.current || !editingItem) return;
        const videoUrl = (editingItem as SparringVideo).videoUrl || '';
        const vimeoId = extractVimeoId(videoUrl);
        if (!vimeoId) {
            toastError('Vimeo 영상 ID를 찾을 수 없습니다.');
            return;
        }
        try {
            const player = new Player(vimeoIframeRef.current);
            const currentTime = await player.getCurrentTime();
            const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg?time=${Math.floor(currentTime)}`;
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => setCroppingImage(reader.result as string);
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error('Capture failed:', e);
            toastError('화면 캡처에 실패했습니다.');
        }
    };

    const fetchVimeoThumbnailAtTime = async (timeOffset: number) => {
        if (!editingItem) return;
        const videoUrl = (editingItem as SparringVideo).videoUrl || '';
        const vimeoId = extractVimeoId(videoUrl);
        if (!vimeoId) {
            toastError('Vimeo 영상 ID를 찾을 수 없습니다.');
            return;
        }
        try {
            const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg?time=${timeOffset}`;
            const response = await fetch(thumbnailUrl);
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => setCroppingImage(reader.result as string);
            reader.readAsDataURL(blob);
        } catch (e) {
            console.error('Failed to fetch vimeo thumbnail:', e);
            toastError('Vimeo 썸네일을 가져오는데 실패했습니다.');
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        try {
            const { url, error } = await uploadThumbnail(blob);
            if (error) throw error;
            if (url) {
                setFormData(prev => ({ ...prev, thumbnailUrl: url }));
                success('썸네일이 저장되었습니다.');
            }
        } catch (err) {
            console.error('Thumbnail upload failed:', err);
            toastError('썸네일 저장에 실패했습니다.');
        } finally {
            setCroppingImage(null);
        }
    };

    const toggleRelatedItem = (item: { id: string; title: string }, type: 'lesson' | 'drill' | 'sparring') => {
        setRelatedItems(prev => {
            const exists = prev.some(i => i.id === item.id && i.type === type);
            if (exists) {
                return prev.filter(i => !(i.id === item.id && i.type === type));
            }
            return [...prev, { type, id: item.id, title: item.title }];
        });
    };

    const moveItem = (index: number, direction: 'up' | 'down', type: 'lesson' | 'drill') => {
        const setter = type === 'lesson' ? setSelectedLessonIds : setSelectedDrillIds;
        setter(prev => {
            const newArray = [...prev];
            if (direction === 'up') {
                if (index === 0) return prev;
                [newArray[index - 1], newArray[index]] = [newArray[index], newArray[index - 1]];
            } else {
                if (index === prev.length - 1) return prev;
                [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
            }
            return newArray;
        });
    };

    // Auto-select thumbnail when content changes or tab changes, if thumbnail is empty
    useEffect(() => {
        // Only run if we don't have a thumbnail yet, or if we want to be smarter
        if (formData.thumbnailUrl) return;

        if (contentType === 'course' && selectedLessonIds.length > 0) {
            // Find the first lesson with a thumbnail
            const validLesson = lessons
                .filter(l => selectedLessonIds.includes(l.id))
                .sort((a, b) => (a.lessonNumber || 0) - (b.lessonNumber || 0)) // Try to follow order
                .find(l => l.thumbnailUrl);

            if (validLesson?.thumbnailUrl) {
                setFormData(prev => ({ ...prev, thumbnailUrl: validLesson.thumbnailUrl! }));
            }
        } else if (contentType === 'routine' && selectedDrillIds.length > 0) {
            // Find the first drill with a thumbnail
            const validDrill = drills
                .filter(d => selectedDrillIds.includes(d.id))
                .find(d => d.thumbnailUrl);

            if (validDrill?.thumbnailUrl) {
                setFormData(prev => ({ ...prev, thumbnailUrl: validDrill.thumbnailUrl }));
            }
        }
    }, [selectedLessonIds, selectedDrillIds, contentType, lessons, drills, formData.thumbnailUrl]);

    const handleAutoThumbnail = () => {
        if (contentType === 'course' && selectedLessonIds.length > 0) {
            // Find the first lesson with a thumbnail
            const validLesson = lessons
                .filter(l => selectedLessonIds.includes(l.id))
                .sort((a, b) => (a.lessonNumber || 0) - (b.lessonNumber || 0))
                .find(l => l.thumbnailUrl);

            if (validLesson?.thumbnailUrl) {
                setFormData(prev => ({ ...prev, thumbnailUrl: validLesson.thumbnailUrl! }));
            } else {
                warning('선택된 레슨 중 썸네일이 있는 레슨이 없습니다.');
            }
        } else if (contentType === 'routine' && selectedDrillIds.length > 0) {
            const validDrill = drills
                .filter(d => selectedDrillIds.includes(d.id))
                .find(d => d.thumbnailUrl);

            if (validDrill?.thumbnailUrl) {
                setFormData(prev => ({ ...prev, thumbnailUrl: validDrill.thumbnailUrl }));
            } else {
                warning('선택된 드릴 중 썸네일이 있는 드릴이 없습니다.');
            }
        }
    };

    const handleSubmit = async () => {
        setSaving(true);
        try {
            const saveData = {
                ...formData,
                price: formData.isSubscriptionExcluded ? formData.price : calculatedPrice,
                category: contentType === 'sparring' ? formData.sparringType : formData.category,
                difficulty: contentType === 'sparring' ? undefined : formData.difficulty,
                totalDurationMinutes,
                selectedLessonIds,
                selectedDrillIds,
                selectedSparringIds,
                relatedItems,
                previewCuts,
                previewVideoFile,
                mainVideoCuts,
                mainVideoFile,
            };

            // Show publishing modal only for NEW content (not edits)
            const shouldShowPublishingModal =
                (contentType === 'course' || contentType === 'routine' || contentType === 'sparring') && !isEditMode;

            if (shouldShowPublishingModal) {
                setPendingSaveData(saveData);
                setShowPublishingModal(true);
                setSaving(false);
            } else {
                // Direct save without publishing modal (drills, lessons, sparring-edit)
                await onSave(saveData);
                onClose();
            }
        } catch (error) {
            console.error('Save error:', error);
            setSaving(false);
        }
    };

    const handlePublishingChoice = async (publishRequested: boolean) => {
        setSaving(true);
        try {
            const finalSaveData = {
                ...pendingSaveData,
                publishingRequested: publishRequested, // Flag to request publishing
            };
            await onSave(finalSaveData);
            setShowPublishingModal(false);
            setPendingSaveData(null);
            onClose();
        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
    };

    // Filter items by search
    const filteredLessons = lessons.filter(l => l.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredDrills = drills.filter(d => d.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const filteredSparring = sparringVideos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!isOpen) return null;

    const IconComponent = config.icon;

    return createPortal(
        <div className="fixed inset-0 z-[60000] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-300">
            {/* Thumbnail Cropper Modal */}
            {croppingImage && (
                <ThumbnailCropper
                    imageSrc={croppingImage}
                    onCropComplete={handleCropComplete}
                    onCancel={() => setCroppingImage(null)}
                    aspectRatio={16 / 9}
                />
            )}

            <div className="bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-zinc-800 animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            `bg-${config.color}-500/10`
                        )}>
                            <IconComponent className={cn("w-5 h-5", `text-${config.color}-400`)} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {isEditMode ? `${config.title} 수정` : `새 ${config.title} 만들기`}
                            </h2>
                            <p className="text-sm text-zinc-500 mt-0.5">
                                {contentType === 'course' && '레슨을 모아 체계적인 클래스를 만드세요'}
                                {contentType === 'routine' && '드릴을 조합해 훈련 루틴을 구성하세요'}
                                {contentType === 'sparring' && '스파링 영상의 상세 정보를 설정하세요'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-zinc-800 px-6">
                    {[
                        { id: 'basic', label: '기본 정보', icon: '📝' },
                        ...(config.primaryItems ? [{ id: 'content', label: config.primaryLabel + ' 선택', icon: '📚' }] : []),
                        { id: 'related', label: config.relatedLabel, icon: '🔗' },
                        ...(config.hasPreview ? [{ id: 'preview', label: '미리보기', icon: '🎬' }] : []),
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={cn(
                                "px-4 py-3 font-medium text-sm transition-all relative flex items-center gap-2",
                                activeTab === tab.id
                                    ? "text-white"
                                    : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className={cn("absolute bottom-0 left-0 right-0 h-0.5", `bg-${config.color}-500`)} />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-6 max-w-2xl">
                            {/* Instructor Selection - Moved to TOP for visibility */}
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">인스트럭터 (Instructor)</label>
                                <select
                                    name="creatorId"
                                    value={formData.creatorId}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                >
                                    <option value="">인스트럭터 선택...</option>
                                    {creators.map(creator => (
                                        <option key={creator.id} value={creator.id}>
                                            {creator.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Brand Selection - Shown if the selected instructor has event brands */}
                            {brands.length > 0 && (
                                <div className="animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">이벤트 팀 (Event Team)</label>
                                    <select
                                        name="brandId"
                                        value={formData.brandId}
                                        onChange={handleChange}
                                        className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-700"
                                    >
                                        <option value="">이벤트 팀 없이 업로드</option>
                                        {brands.map(brand => (
                                            <option key={brand.id} value={brand.id}>
                                                {brand.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-zinc-500 mt-2">이벤트 팀을 선택하면 팀 채널에 영상이 표시됩니다.</p>
                                </div>
                            )}

                            {/* Content Summary Card */}
                            {isEditMode && (
                                <div className="grid grid-cols-3 gap-4 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                                    <div className="text-center p-2">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">레슨</p>
                                        <p className="text-lg font-black text-white">{selectedLessonIds.length}개</p>
                                    </div>
                                    <div className="text-center p-2 border-x border-zinc-800/50">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">드릴</p>
                                        <p className="text-lg font-black text-white">
                                            {contentType === 'routine' ? selectedDrillIds.length : relatedItems.filter(i => i.type === 'drill').length}개
                                        </p>
                                    </div>
                                    <div className="text-center p-2">
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">스파링</p>
                                        <p className="text-lg font-black text-white">
                                            {contentType === 'sparring' ? 0 : relatedItems.filter(i => i.type === 'sparring').length}개
                                        </p>
                                    </div>
                                </div>
                            )}



                            {/* Title */}
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">제목</label>
                                <input
                                    type="text"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                    placeholder={`${config.title} 제목을 입력하세요`}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">설명</label>
                                <textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    rows={4}
                                    className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all resize-none placeholder:text-zinc-700"
                                    placeholder="상세 설명을 입력하세요"
                                />
                            </div>

                            {/* Category, Difficulty, Uniform */}
                            <div className="grid grid-cols-3 gap-4">
                                {contentType === 'sparring' ? (
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">스파링 종류</label>
                                        <select
                                            name="sparringType"
                                            value={formData.sparringType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none"
                                        >
                                            <option value="Sparring">스파링 (Sparring)</option>
                                            <option value="Competition">컴페티션 (Competition)</option>
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="block text-sm font-semibold text-zinc-400 mb-2">카테고리</label>
                                            <select
                                                name="category"
                                                value={formData.category}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none"
                                            >
                                                {Object.values(VideoCategory).map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-zinc-400 mb-2">난이도</label>
                                            <select
                                                name="difficulty"
                                                value={formData.difficulty}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none"
                                            >
                                                {Object.values(Difficulty).map(diff => (
                                                    <option key={diff} value={diff}>{diff}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-2">도복</label>
                                    <select
                                        name="uniformType"
                                        value={formData.uniformType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:border-violet-500 outline-none"
                                    >
                                        {Object.values(UniformType).map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Duration Display (Routine only) */}
                            {config.hasDuration && (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-emerald-400" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-zinc-400">총 소요 시간 (자동 계산)</label>
                                            <div className="text-white text-2xl font-black mt-1">
                                                {totalDurationMinutes}분
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Price */}
                            {/* Pricing & Visibility Options */}
                            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800/50">
                                <div>
                                    <label className="block text-sm font-semibold text-zinc-400 mb-3">가격 설정</label>
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
                                                    영상 길이에 비례해 자동으로 가격이 책정되며, 구독권 이용자는 자유롭게 재생할 수 있습니다.
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
                                                    구독권 이용자도 재생할 수 없으며, 모든 사용자가 설정한 가격으로 구매해야 합니다.
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
                                        value={pricingType === 'manual' ? formData.price : calculatedPrice}
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
                                        <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" />
                                            총 {totalDurationMinutes}분 × 1,000원 = {calculatedPrice.toLocaleString()}원 (자동 설정됨)
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Thumbnail */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-zinc-400">썸네일</label>
                                    {contentType !== 'sparring' && (
                                        <button
                                            type="button"
                                            onClick={handleAutoThumbnail}
                                            className="text-xs text-violet-400 hover:text-violet-300 font-semibold"
                                        >
                                            {config.primaryLabel}에서 자동 선택
                                        </button>
                                    )}
                                </div>
                                <ImageUploader
                                    currentImageUrl={formData.thumbnailUrl}
                                    onUploadComplete={(url) => setFormData(prev => ({ ...prev, thumbnailUrl: url }))}
                                />

                                {/* Video Preview & Thumbnail Capture for Sparring */}
                                {contentType === 'sparring' && isEditMode && (editingItem as SparringVideo)?.videoUrl && (
                                    <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
                                        {/* Video Preview */}
                                        {vimeoEmbedUrl && (
                                            <div className="space-y-3">
                                                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">영상 미리보기</h4>
                                                <div className="aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800">
                                                    <iframe
                                                        ref={vimeoIframeRef}
                                                        src={vimeoEmbedUrl}
                                                        className="w-full h-full"
                                                        frameBorder="0"
                                                        allow="autoplay; fullscreen"
                                                        allowFullScreen
                                                    />
                                                </div>

                                                {/* Capture Controls */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={captureFromVimeo}
                                                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <Camera className="w-3.5 h-3.5" /> 현재 화면 캡처
                                                    </button>
                                                    <span className="text-[10px] text-zinc-500 font-medium">Vimeo 추천:</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchVimeoThumbnailAtTime(0)}
                                                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                                                    >
                                                        시작 장면
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => fetchVimeoThumbnailAtTime(30)}
                                                        className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-[10px] font-bold text-zinc-400 hover:text-white transition-colors"
                                                    >
                                                        30초 장면
                                                    </button>
                                                    <label className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5">
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) {
                                                                    const reader = new FileReader();
                                                                    reader.onload = (event) => setCroppingImage(event.target?.result as string);
                                                                    reader.readAsDataURL(file);
                                                                }
                                                            }}
                                                            className="hidden"
                                                        />
                                                        <ImageIcon className="w-3.5 h-3.5" /> 이미지 업로드
                                                    </label>
                                                </div>
                                            </div>
                                        )}

                                        {/* Vimeo Auto Thumbnails */}
                                        <VimeoThumbnailSelector
                                            vimeoId={extractVimeoId((editingItem as SparringVideo).videoUrl) || (editingItem as SparringVideo).videoUrl}
                                            onSelect={(url) => setFormData(prev => ({ ...prev, thumbnailUrl: url }))}
                                            currentThumbnailUrl={formData.thumbnailUrl}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Course/Routine/Sparring specific options - Publishing */}
                            {(contentType === 'course' || contentType === 'routine' || contentType === 'sparring') && (
                                <div className="space-y-3 pt-4 border-t border-zinc-800">
                                    <label className="flex items-start gap-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-800/20 transition-all cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.isHidden}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isHidden: e.target.checked }))}
                                            className="mt-1 h-5 w-5 text-violet-600 border-zinc-700 rounded-md bg-zinc-900"
                                        />
                                        <div>
                                            <span className="block font-semibold text-zinc-200">공개 안함</span>
                                            <span className="block text-sm text-zinc-500 mt-1">체크하면 콘텐츠가 비공개 처리됩니다. 삭제하지 않고 숨길 수 있습니다.</span>
                                        </div>
                                    </label>
                                </div>
                            )}

                            {/* Main Video Upload for Sparring (Creation Mode) */}
                            {contentType === 'sparring' && !isEditMode && (
                                <div className="mt-8 pt-8 border-t border-zinc-800">
                                    <h3 className="text-lg font-bold text-violet-400 mb-4">스파링 영상</h3>
                                    {!mainVideoFile ? (
                                        <div className="w-full h-48 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-violet-500 hover:bg-violet-500/5 transition-all relative group">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    if (e.target.files?.[0]) {
                                                        setMainVideoFile(e.target.files[0]);
                                                    }
                                                }}
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                            />
                                            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <Upload className="w-6 h-6 text-zinc-400 group-hover:text-violet-400" />
                                            </div>
                                            <p className="font-bold text-zinc-300">스파링 영상 업로드</p>
                                            <p className="text-xs text-zinc-500 mt-1">탭하여 동영상 선택</p>
                                        </div>
                                    ) : (
                                        <div className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                                            <div className="aspect-video bg-black relative group">
                                                <video
                                                    src={URL.createObjectURL(mainVideoFile)}
                                                    className="w-full h-full object-contain"
                                                    controls
                                                />
                                                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setShowMainTrimmer(true)}
                                                        className="p-2 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-violet-600 transition-colors"
                                                    >
                                                        <Scissors className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setMainVideoFile(null);
                                                            setMainVideoCuts(null);
                                                        }}
                                                        className="p-2 bg-black/60 backdrop-blur rounded-lg text-white hover:bg-red-600 transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-4 flex items-center justify-between bg-zinc-900/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                                        <Clapperboard className="w-5 h-5 text-violet-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white text-sm">{mainVideoFile.name}</p>
                                                        <p className="text-xs text-zinc-500">{(mainVideoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                    </div>
                                                </div>
                                                {mainVideoCuts && (
                                                    <span className="text-xs text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded-full">
                                                        편집됨
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {showMainTrimmer && mainVideoFile && (
                                        <VideoEditor
                                            videoUrl={URL.createObjectURL(mainVideoFile)}
                                            onSave={(cuts) => {
                                                setMainVideoCuts(cuts);
                                                setShowMainTrimmer(false);
                                            }}
                                            onCancel={() => setShowMainTrimmer(false)}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'content' && (
                        <div className="space-y-4">
                            {/* Selected Items Reordering */}
                            {(contentType === 'course' || contentType === 'routine') && (
                                <div className="mb-6 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                                    <h4 className="text-sm font-bold text-zinc-400 mb-3">
                                        선택된 {config.primaryLabel} 순서 ({contentType === 'course' ? selectedLessonIds.length : selectedDrillIds.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {contentType === 'course' && selectedLessonIds.map((id, idx) => {
                                            const item = lessons.find(l => l.id === id);
                                            if (!item) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-zinc-700 rounded text-xs font-bold text-zinc-300">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 truncate">
                                                        <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => moveItem(idx, 'up', 'lesson')}
                                                            disabled={idx === 0}
                                                            className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                                        >
                                                            <ArrowUp className="w-4 h-4 text-zinc-400" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveItem(idx, 'down', 'lesson')}
                                                            disabled={idx === selectedLessonIds.length - 1}
                                                            className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                                        >
                                                            <ArrowDown className="w-4 h-4 text-zinc-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {contentType === 'routine' && selectedDrillIds.map((id, idx) => {
                                            const item = drills.find(d => d.id === id);
                                            if (!item) return null;
                                            return (
                                                <div key={id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-800">
                                                    <span className="w-6 h-6 flex items-center justify-center bg-zinc-700 rounded text-xs font-bold text-zinc-300">
                                                        {idx + 1}
                                                    </span>
                                                    <div className="flex-1 truncate">
                                                        <span className="text-sm font-medium text-zinc-200">{item.title}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => moveItem(idx, 'up', 'drill')}
                                                            disabled={idx === 0}
                                                            className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                                        >
                                                            <ArrowUp className="w-4 h-4 text-zinc-400" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveItem(idx, 'down', 'drill')}
                                                            disabled={idx === selectedDrillIds.length - 1}
                                                            className="p-1 hover:bg-zinc-700 rounded disabled:opacity-30 disabled:hover:bg-transparent"
                                                        >
                                                            <ArrowDown className="w-4 h-4 text-zinc-400" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(contentType === 'course' ? selectedLessonIds.length === 0 : selectedDrillIds.length === 0) && (
                                            <p className="text-sm text-zinc-500 text-center py-2">선택된 항목이 없습니다.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={`${config.primaryLabel} 검색...`}
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-violet-500 outline-none"
                                />
                            </div>

                            {/* Selection count */}
                            <div className="text-sm text-zinc-400">
                                {contentType === 'course' && `${selectedLessonIds.length}개 레슨 선택됨`}
                                {contentType === 'routine' && `${selectedDrillIds.length}개 드릴 선택됨 (총 ${totalDurationMinutes}분)`}
                            </div>

                            {/* Items Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                {contentType === 'course' && filteredLessons.map(lesson => {
                                    const isSelected = selectedLessonIds.includes(lesson.id);
                                    return (
                                        <div
                                            key={lesson.id}
                                            onClick={() => toggleSelection(lesson.id, 'lesson')}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                isSelected
                                                    ? "border-violet-500 bg-violet-600/10"
                                                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-violet-500 border-violet-500" : "border-zinc-700"
                                            )}>
                                                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="w-16 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                                {lesson.thumbnailUrl ? (
                                                    <img src={lesson.thumbnailUrl} alt={lesson.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <PlayCircle className="w-5 h-5 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={cn("font-bold truncate", isSelected ? "text-violet-400" : "text-white")}>
                                                    {lesson.title}
                                                </h4>
                                                <p className="text-xs text-zinc-500 mt-0.5">
                                                    {lesson.durationMinutes}분 • {lesson.difficulty}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {contentType === 'routine' && filteredDrills.map(drill => {
                                    const isSelected = selectedDrillIds.includes(drill.id);
                                    return (
                                        <div
                                            key={drill.id}
                                            onClick={() => toggleSelection(drill.id, 'drill')}
                                            className={cn(
                                                "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                                                isSelected
                                                    ? "border-emerald-500 bg-emerald-600/10"
                                                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                isSelected ? "bg-emerald-500 border-emerald-500" : "border-zinc-700"
                                            )}>
                                                {isSelected && <CheckCircle className="w-4 h-4 text-white" />}
                                            </div>
                                            <div className="w-12 h-12 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                                {drill.thumbnailUrl ? (
                                                    <img src={drill.thumbnailUrl} alt={drill.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Grid className="w-5 h-5 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={cn("font-bold truncate", isSelected ? "text-emerald-400" : "text-white")}>
                                                    {drill.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded text-zinc-400">
                                                        {drill.durationMinutes || 0}분
                                                    </span>
                                                    <span className="text-xs text-zinc-500">{drill.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {((contentType === 'course' && filteredLessons.length === 0) ||
                                (contentType === 'routine' && filteredDrills.length === 0)) && (
                                    <div className="text-center py-12 text-zinc-500">
                                        {searchQuery ? '검색 결과가 없습니다.' : `${config.primaryLabel}이 없습니다.`}
                                    </div>
                                )}
                        </div>
                    )}

                    {activeTab === 'related' && (
                        <div className="space-y-4">
                            <p className="text-sm text-zinc-400 mb-4">
                                {contentType === 'course' && '클래스에 포함할 스파링 영상을 선택하세요.'}
                                {contentType === 'routine' && '루틴과 관련된 레슨/스파링을 태그하세요.'}
                                {contentType === 'sparring' && '이 스파링에서 사용된 기술과 관련된 레슨/드릴을 태그하세요.'}
                            </p>

                            {/* Search Input for Related Items */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="관련 항목 검색..."
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition-colors"
                                />
                            </div>

                            {/* Related items tabs */}
                            <div className="flex gap-2 mb-4">
                                {(contentType === 'routine' || contentType === 'sparring') && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setRelatedFilter('lesson'); }}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                            relatedFilter === 'lesson'
                                                ? "bg-white text-black"
                                                : "bg-zinc-800 text-white hover:bg-zinc-700"
                                        )}
                                    >
                                        레슨
                                    </button>
                                )}
                                {(contentType === 'course' || contentType === 'sparring') && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setRelatedFilter('drill'); }}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                            relatedFilter === 'drill'
                                                ? "bg-white text-black"
                                                : "bg-zinc-800 text-white hover:bg-zinc-700"
                                        )}
                                    >
                                        드릴
                                    </button>
                                )}
                                {(contentType === 'course' || contentType === 'routine') && (
                                    <button
                                        onClick={() => { setSearchQuery(''); setRelatedFilter('sparring'); }}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                                            relatedFilter === 'sparring'
                                                ? "bg-white text-black"
                                                : "bg-zinc-800 text-white hover:bg-zinc-700"
                                        )}
                                    >
                                        스파링
                                    </button>
                                )}
                            </div>

                            {/* Selected related items */}
                            {relatedItems.length > 0 && (
                                <div className="mb-4 p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                                    <h4 className="text-sm font-bold text-zinc-400 mb-3">선택된 항목 ({relatedItems.length})</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {relatedItems.map((item, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-lg text-sm"
                                            >
                                                <span className="text-zinc-300">{item.title}</span>
                                                <button
                                                    onClick={() => setRelatedItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-zinc-500 hover:text-red-400"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Available items to add */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[350px] overflow-y-auto">
                                {relatedFilter === 'sparring' && filteredSparring.map(video => {
                                    const isSelected = relatedItems.some(i => i.id === video.id && i.type === 'sparring');
                                    return (
                                        <button
                                            key={video.id}
                                            onClick={() => toggleRelatedItem(video, 'sparring')}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                isSelected
                                                    ? "border-blue-500/50 bg-blue-600/10"
                                                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="w-16 h-10 rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                                {video.thumbnailUrl ? (
                                                    <img src={video.thumbnailUrl} alt={video.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Clapperboard className="w-4 h-4 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{video.title}</p>
                                            </div>
                                            {isSelected && <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                                        </button>
                                    );
                                })}
                                {relatedFilter === 'drill' && filteredDrills.map(drill => {
                                    const isSelected = relatedItems.some(i => i.id === drill.id && i.type === 'drill');
                                    return (
                                        <button
                                            key={drill.id}
                                            onClick={() => toggleRelatedItem(drill, 'drill')}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                isSelected
                                                    ? "border-emerald-500/50 bg-emerald-600/10"
                                                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                            )}
                                        >
                                            <Grid className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                                            <p className="text-sm font-medium text-white truncate flex-1">{drill.title}</p>
                                            {isSelected && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                                        </button>
                                    );
                                })}
                                {relatedFilter === 'lesson' && filteredLessons.map(lesson => {
                                    const isSelected = relatedItems.some(i => i.id === lesson.id && i.type === 'lesson');
                                    return (
                                        <button
                                            key={lesson.id}
                                            onClick={() => toggleRelatedItem(lesson, 'lesson')}
                                            className={cn(
                                                "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                                                isSelected
                                                    ? "border-blue-500/50 bg-blue-600/10"
                                                    : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                                            )}
                                        >
                                            <BookOpen className="w-5 h-5 text-zinc-500 flex-shrink-0" />
                                            <p className="text-sm font-medium text-white truncate flex-1">{lesson.title}</p>
                                            {isSelected && <CheckCircle className="w-4 h-4 text-blue-500" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {
                        activeTab === 'preview' && config.hasPreview && (
                            <div className="space-y-6 max-w-xl mx-auto">
                                <div className="text-center">
                                    <h3 className="text-lg font-bold text-white mb-2">1분 미리보기 영상</h3>
                                    <p className="text-sm text-zinc-500">
                                        {contentType === 'course' && '클래스를 구매하지 않은 사용자에게 보여줄 미리보기 영상입니다.'}
                                        {contentType === 'sparring' && '스파링 하이라이트 미리보기 영상입니다.'}
                                    </p>
                                </div>

                                {/* Preview Upload Area */}
                                <div className="border-2 border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-violet-500 hover:bg-zinc-800/30 transition-all cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setPreviewVideoFile(file);
                                                setShowPreviewTrimmer(true);
                                            }
                                        }}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Upload className="w-8 h-8 text-zinc-400" />
                                    </div>
                                    <p className="font-bold text-white mb-1">영상 파일 선택</p>
                                    <p className="text-sm text-zinc-500">1분 내외의 하이라이트 구간을 추출합니다</p>
                                </div>

                                <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
                                    {previewCuts ? (
                                        <div className="flex items-center gap-3 text-emerald-400">
                                            <CheckCircle className="w-5 h-5" />
                                            <p className="font-semibold">미리보기 편집이 설정되었습니다. 저장 시 업로드가 처리됩니다.</p>
                                            <Button size="sm" variant="ghost" onClick={() => { setPreviewCuts(null); setPreviewVideoFile(null); }}>다시 선택</Button>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-violet-400/80">
                                            💡 미리보기 영상은 구매 전환율을 높이는 데 효과적입니다. 가장 인상적인 부분을 선택하세요.
                                        </p>
                                    )}
                                </div>
                            </div>
                        )
                    }
                </div >

                {/* Footer */}
                < div className="flex items-center justify-between p-6 border-t border-zinc-800 bg-zinc-900/50" >
                    <div className="text-sm text-zinc-500">
                        {contentType === 'course' && selectedLessonIds.length > 0 && `${selectedLessonIds.length}개 레슨`}
                        {contentType === 'routine' && selectedDrillIds.length > 0 && `${selectedDrillIds.length}개 드릴 • ${totalDurationMinutes}분`}
                        {relatedItems.length > 0 && ` • ${relatedItems.length}개 연관 항목`}
                    </div>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>
                            취소
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={saving || !formData.title}
                            className={cn(
                                "px-8",
                                `bg-${config.color}-600 hover:bg-${config.color}-700`
                            )}
                        >
                            {saving ? '저장 중...' : (isEditMode ? '수정하기' : '만들기')}
                        </Button>
                    </div>
                </div >
            </div >

            {/* Video Editor Modal */}
            {
                showPreviewTrimmer && previewVideoFile && createPortal(
                    <div className="fixed inset-0 z-[70000] bg-black/95 overflow-y-auto">
                        <div className="min-h-full flex items-center justify-center p-4 py-8">
                            <div className="w-full max-w-3xl relative">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">미리보기 편집</h2>
                                        <p className="text-zinc-400 text-sm mt-1">1분 하이라이트 구간을 선택하세요</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => setShowPreviewTrimmer(false)}>닫기</Button>
                                </div>
                                <VideoEditor
                                    videoUrl={URL.createObjectURL(previewVideoFile)}
                                    onSave={(cuts) => {
                                        setPreviewCuts(cuts);
                                        setShowPreviewTrimmer(false);
                                    }}
                                    onCancel={() => setShowPreviewTrimmer(false)}
                                    aspectRatio="16:9"
                                    maxDuration={60}
                                />
                            </div>
                        </div>
                    </div>,
                    document.body
                )
            }

            {/* Publishing Request Modal */}
            {showPublishingModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPublishingModal(false)} />
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-bold text-white mb-3">콘텐츠 업로드</h3>
                        <p className="text-zinc-400 mb-6">
                            관리자 승인 후 업로드 됩니다.
                        </p>

                        <button
                            onClick={() => handlePublishingChoice(true)}
                            disabled={saving}
                            className="w-full py-3.5 rounded-xl bg-violet-600 text-white font-bold text-sm hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-900/20"
                        >
                            {saving ? '저장 중...' : '확인'}
                        </button>
                    </div>
                </div>
            )}
        </div >,
        document.body
    );
};
