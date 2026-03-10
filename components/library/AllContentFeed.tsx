import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getCourses, fetchRoutines, getSparringVideos, getDailyFreeLesson, getDailyFreeSparring, getDailyFreeDrill } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Course, DrillRoutine, SparringVideo } from '../../types';
import { LoadingScreen } from '../LoadingScreen';
import { UnifiedContentCard, UnifiedContentItem, ContentType } from './UnifiedContentCard';
import { LibraryTabs, LibraryTabType } from './LibraryTabs';
import { batchCheckInteractions, getCreatorsWithNewContent, recordView } from '../../lib/api-user-interactions';
import { useCreators, useEventBrands } from '../../hooks/use-queries';



interface AllContentFeedProps {
    activeTab: LibraryTabType;
    onTabChange: (tab: LibraryTabType) => void;
}

/** 
 * Smart interleaving based on SHAPE (Wide vs Tall vs Square) 
 * Goal: Fill 2-column chunks to avoid gaps.
 * 
 * Shapes:
 * - Wide: Class, Sparring(Wide) -> Takes 2 cols
 * - Tall: Routine, Sparring(Tall) -> Takes 1 col (needs pair)
 * - Square: Sparring(Square) -> Takes 1 col (needs pair)
 */
function smartSort(items: UnifiedContentItem[]): UnifiedContentItem[] {
    // Wide items (Class, Large Sparring) take 2 columns.
    // Tall (Routine) and Square (Small Sparring/Class) take 1 column.

    const wideItems = items.filter(i => i.variant === 'wide' || i.variant === 'large');
    const normalItems = items.filter(i => i.variant !== 'wide' && i.variant !== 'large');

    const result: UnifiedContentItem[] = [];
    let wideIdx = 0;
    let normalIdx = 0;

    // Deterministic interleaving: 1 wide + 3 normal for balanced grid packing
    while (wideIdx < wideItems.length || normalIdx < normalItems.length) {
        if (wideIdx < wideItems.length) {
            result.push(wideItems[wideIdx++]);
        }

        const normalCount = Math.min(3, normalItems.length - normalIdx);
        for (let i = 0; i < normalCount; i++) {
            result.push(normalItems[normalIdx++]);
        }
    }

    return result;
}


export const AllContentFeed: React.FC<AllContentFeedProps> = ({ activeTab, onTabChange }) => {
    const { user } = useAuth();
    const [, setSearchParams] = useSearchParams();
    const { data: creatorsData = [] } = useCreators();
    const { data: eventBrandsData = [] } = useEventBrands();
    const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
    const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
    const instructorScrollRef = useRef<HTMLDivElement>(null);
    const brandScrollRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [loading, setLoading] = useState(true);
    const [creatorsWithNew, setCreatorsWithNew] = useState<Set<string>>(new Set());
    const mainSwiperRef = useRef<HTMLDivElement>(null);
    const [isVerticalDragging, setIsVerticalDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // Randomize creators and brands on mount
    const creators = useMemo(() => {
        // Safety Filter: Exclude pure organizers and specifically named "Organizer" accounts from instructor list
        return [...creatorsData]
            .filter(c => c.creatorType !== 'organizer' && c.name !== 'Organizer')
            .sort(() => Math.random() - 0.5);
    }, [creatorsData]);

    const eventBrands = useMemo(() => {
        return [...eventBrandsData].sort(() => Math.random() - 0.5);
    }, [eventBrandsData]);

    // Drag scroll handlers
    const createDragHandlers = (ref: React.RefObject<HTMLDivElement>) => {
        return {
            onMouseDown: (e: React.MouseEvent) => {
                if (!ref.current) return;
                setIsDragging(true);
                setStartX(e.pageX - ref.current.offsetLeft);
                setScrollLeft(ref.current.scrollLeft);
            },
            onMouseMove: (e: React.MouseEvent) => {
                if (!isDragging || !ref.current) return;
                e.preventDefault();
                const x = e.pageX - ref.current.offsetLeft;
                const walk = (x - startX) * 1.5;
                ref.current.scrollLeft = scrollLeft - walk;
            },
            onMouseUp: () => setIsDragging(false),
            onMouseLeave: () => setIsDragging(false),
        };
    };

    const instructorDragHandlers = createDragHandlers(instructorScrollRef);
    const brandDragHandlers = createDragHandlers(brandScrollRef);

    // Vertical drag handlers for the main swiper container
    const verticalDragHandlers = {
        onMouseDown: (e: React.MouseEvent) => {
            if (!mainSwiperRef.current) return;
            setIsVerticalDragging(true);
            setStartY(e.pageY - mainSwiperRef.current.offsetTop);
            setScrollTop(mainSwiperRef.current.scrollTop);
        },
        onMouseMove: (e: React.MouseEvent) => {
            if (!isVerticalDragging || !mainSwiperRef.current) return;
            e.preventDefault();
            const y = e.pageY - mainSwiperRef.current.offsetTop;
            const walk = (y - startY) * 1.5;
            mainSwiperRef.current.scrollTop = scrollTop - walk;
        },
        onMouseUp: () => setIsVerticalDragging(false),
        onMouseLeave: () => setIsVerticalDragging(false),
    };
    const [searchTerm, setSearchTerm] = useState('');
    const [allItems, setAllItems] = useState<UnifiedContentItem[]>([]);
    const [savedMap, setSavedMap] = useState<Map<string, boolean>>(new Map());

    // Daily free IDs
    const [, setFreeIds] = useState<{
        course?: string;
        sparring?: string;
    }>({});

    useEffect(() => {
        loadAllContent();
    }, [user?.id]);

    const loadAllContent = async () => {
        try {
            setLoading(true);

            // Fetch all content types and daily free items in parallel
            const [
                coursesData,
                routinesRes,
                sparringRes,
                dailyFreeLessonRes,
                dailyFreeSparringRes,
                dailyFreeDrillRes,
            ] = await Promise.all([
                getCourses(100, 0),
                fetchRoutines(100),
                getSparringVideos(100, undefined, true),
                getDailyFreeLesson(),
                getDailyFreeSparring(),
                getDailyFreeDrill(),
            ]);

            // Extract daily free IDs
            const dailyFreeIds: { course?: string; sparring?: string; routineIds: string[] } = {
                course: dailyFreeLessonRes.data?.courseId,
                sparring: dailyFreeSparringRes.data?.id,
                routineIds: []
            };

            if (dailyFreeDrillRes.data) {
                const { data: relations } = await supabase
                    .from('routine_drills')
                    .select('routine_id')
                    .eq('drill_id', dailyFreeDrillRes.data.id);
                if (relations) {
                    dailyFreeIds.routineIds = relations.map((r: any) => r.routine_id);
                }
            }

            setFreeIds({
                course: dailyFreeIds.course,
                sparring: dailyFreeIds.sparring
            });

            const now = Date.now();
            const getHotScore = (item: { views?: number; createdAt?: string }) => {
                const views = item.views || 0;
                const createdDate = item.createdAt ? new Date(item.createdAt).getTime() : now;
                const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
                return views / Math.pow(hoursSinceCreation + 2, 1.5);
            };

            // Transform courses
            const courses: Course[] = coursesData || [];
            const hotCourses = [...courses]
                .filter(c => (c.views || 0) >= 5)
                .sort((a, b) => getHotScore(b) - getHotScore(a));

            const courseItems: UnifiedContentItem[] = courses.map(course => {
                const hotIndex = hotCourses.findIndex(hc => hc.id === course.id);
                return {
                    id: course.id,
                    type: 'class' as ContentType,
                    title: course.title,
                    thumbnailUrl: course.thumbnailUrl,
                    creatorName: course.creatorName,
                    creatorProfileImage: (course as any).creatorProfileImage,
                    creatorId: course.creatorId,
                    brandId: course.brandId,
                    createdAt: course.createdAt,
                    views: course.views,
                    rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    isDailyFree: course.id === dailyFreeIds.course,
                    originalData: course,
                    // Classes can be 2-col (wide) or 1-col (square-ish)
                    // Deterministic variant based on ID
                    variant: (course.id.charCodeAt(0) + course.id.charCodeAt(course.id.length - 1)) % 2 === 0 ? 'wide' : 'square',
                };
            });

            // Transform routines
            const routines: DrillRoutine[] = routinesRes.data || [];
            const hotRoutines = [...routines]
                .filter(r => (r.views || 0) >= 5)
                .sort((a, b) => getHotScore(b) - getHotScore(a));

            const routineItems: UnifiedContentItem[] = routines.map(routine => {
                const hotIndex = hotRoutines.findIndex(hr => hr.id === routine.id);
                return {
                    id: routine.id,
                    type: 'routine' as ContentType,
                    title: routine.title,
                    thumbnailUrl: routine.thumbnailUrl,
                    creatorName: routine.creatorName,
                    creatorProfileImage: routine.creatorProfileImage,
                    creatorId: routine.creatorId,
                    brandId: routine.brandId,
                    createdAt: routine.createdAt,
                    views: routine.views,
                    rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    isDailyFree: dailyFreeIds.routineIds.includes(routine.id),
                    drillCount: routine.drills?.length || 0,
                    originalData: routine,
                    variant: 'tall', // Routines are always tall (9:16)
                };
            });

            // Transform sparring
            const sparring: SparringVideo[] = sparringRes.data || [];
            const hotSparring = [...sparring]
                .filter(s => (s.views || 0) >= 5)
                .sort((a, b) => getHotScore(b) - getHotScore(a));

            const sparringItems: UnifiedContentItem[] = sparring.map((video) => {
                const hotIndex = hotSparring.findIndex(hs => hs.id === video.id);

                return {
                    id: video.id,
                    type: 'sparring' as ContentType,
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl || '',
                    creatorName: video.creator?.name,
                    creatorProfileImage: (video.creator as any)?.avatar_url || (video.creator as any)?.profileImage,
                    creatorId: video.creatorId,
                    brandId: video.brandId,
                    createdAt: video.createdAt,
                    views: video.views,
                    rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    isDailyFree: video.id === dailyFreeIds.sparring,
                    originalData: video,
                    // Always use square variant for sparring (1:1 aspect ratio)
                    variant: 'square',
                };
            });

            // Sort by views descending, then shuffle for random placement on each refresh
            const allContentInOrder = [...courseItems, ...routineItems, ...sparringItems]
                .sort((a, b) => (b.views || 0) - (a.views || 0))
                .sort(() => Math.random() - 0.5); // Random shuffle
            const sorted = smartSort(allContentInOrder);
            setAllItems(sorted);

            // Batch fetch saved status and new content indicators (if user is logged in)
            if (user) {
                try {
                    // Group items by type and fetch in parallel
                    const courseIds = courseItems.map(i => i.id);
                    const routineIds = routineItems.map(i => i.id);
                    const sparringIds = sparringItems.map(i => i.id);

                    const [courseSaved, routineSaved, sparringSaved, newContentCreators] = await Promise.all([
                        courseIds.length > 0 ? batchCheckInteractions('course', courseIds, 'save') : new Map(),
                        routineIds.length > 0 ? batchCheckInteractions('routine', routineIds, 'save') : new Map(),
                        sparringIds.length > 0 ? batchCheckInteractions('sparring', sparringIds, 'save') : new Map(),
                        getCreatorsWithNewContent(user.id)
                    ]);

                    // Merge all saved maps
                    const mergedMap = new Map<string, boolean>();
                    courseSaved.forEach((v, k) => mergedMap.set(k, v));
                    routineSaved.forEach((v, k) => mergedMap.set(k, v));
                    sparringSaved.forEach((v, k) => mergedMap.set(k, v));
                    setSavedMap(mergedMap);
                    setCreatorsWithNew(newContentCreators);
                } catch (err) {
                    console.error('[AllContentFeed] Failed to batch check saved status:', err);
                }
            }
        } catch (error) {
            console.error('Failed to load content:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = useMemo(() => {
        let items = allItems;

        // Apply search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            items = items.filter(item =>
                item.title.toLowerCase().includes(term) ||
                item.creatorName?.toLowerCase().includes(term)
            );
        }

        // Apply creator/brand isolation policy
        if (selectedCreatorId) {
            // Coach selected: Show only personal videos of this coach (no brandId)
            items = items.filter(item => item.creatorId === selectedCreatorId && !item.brandId);
        } else if (selectedBrandId) {
            // Team selected: Show only videos tied to this specific team
            items = items.filter(item => item.brandId === selectedBrandId);
        } else {
            // Global Feed: Show only general videos (no brandId)
            // Isolation: Team videos only appear in their respective team filters
            items = items.filter(item => !item.brandId);
        }

        return items;
    }, [allItems, searchTerm, selectedCreatorId, selectedBrandId, eventBrands]);

    const selectedCreator = creators.find(c => c.id === selectedCreatorId);
    const selectedBrand = eventBrands.find(b => b.id === selectedBrandId);

    const handleSparringClick = (item: UnifiedContentItem) => {
        setSearchParams({ tab: 'sparring', id: item.id, view: 'reels' });
    };

    if (loading) {
        return <LoadingScreen message="콘텐츠를 불러오는 중..." />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col flex-1 p-4 md:px-12 md:pb-8 overflow-y-auto">
            <div className="max-w-[1600px] mx-auto w-full">
                {/* Library Tabs */}
                <LibraryTabs activeTab={activeTab} onTabChange={onTabChange} />

                {/* Header & Search */}
                <div className="flex flex-col gap-8 mb-8 mt-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                        <div className="relative w-full max-w-md group">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500">
                                <Search className="h-4 w-4 text-zinc-500" />
                            </div>
                            <input
                                type="text"
                                placeholder="콘텐츠 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                            />
                        </div>

                        <div className="text-zinc-500 text-sm font-medium">
                            총 <span className="text-zinc-200 font-bold">{filteredItems.length}</span>개의 콘텐츠
                        </div>
                    </div>
                </div>

                {/* Creators/Brands Filter Section */}
                <div className="mb-8 select-none">
                    {/* Vertical Swiper Container */}
                    <div
                        ref={mainSwiperRef}
                        className={`flex flex-col overflow-y-auto h-[146px] md:h-[162px] no-scrollbar snap-y snap-mandatory bg-zinc-950/20 rounded-xl relative ${isVerticalDragging ? 'cursor-grabbing' : ''}`}
                        {...verticalDragHandlers}
                    >
                        {/* Instructors Row */}
                        {creators.length > 0 && (
                            <div className="h-full shrink-0 snap-always snap-start flex flex-col justify-center pt-2 pb-2">
                                <div
                                    ref={instructorScrollRef}
                                    className={`flex gap-5 overflow-x-auto no-scrollbar py-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    {...instructorDragHandlers}
                                >
                                    {creators.map(creator => (
                                        <button
                                            key={creator.id}
                                            onClick={(e) => {
                                                if (isDragging) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                if (creatorsWithNew.has(creator.id)) {
                                                    recordView('creator', creator.id);
                                                    setCreatorsWithNew(prev => {
                                                        const next = new Set(prev);
                                                        next.delete(creator.id);
                                                        return next;
                                                    });
                                                }
                                                setSelectedCreatorId(
                                                    selectedCreatorId === creator.id ? null : creator.id
                                                );
                                                setSelectedBrandId(null);
                                            }}
                                            className="flex flex-col items-center gap-2 shrink-0 group select-none"
                                        >
                                            <div className="relative">
                                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-zinc-800 transition-all ${
                                                    selectedCreatorId === creator.id
                                                        ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-950'
                                                        : 'group-hover:ring-2 group-hover:ring-zinc-600 group-hover:ring-offset-2 group-hover:ring-offset-zinc-950'
                                                }`}>
                                                    {creator.profileImage ? (
                                                        <img
                                                            src={creator.profileImage}
                                                            alt={creator.name}
                                                            className="w-full h-full object-cover pointer-events-none"
                                                            draggable={false}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                                                            {creator.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                                {creatorsWithNew.has(creator.id) && (
                                                    <div className="absolute top-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-red-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                                                )}
                                            </div>
                                            <span className={`text-xs font-medium max-w-[80px] truncate transition-colors ${
                                                selectedCreatorId === creator.id
                                                    ? 'text-violet-400'
                                                    : 'text-zinc-400 group-hover:text-zinc-200'
                                            }`}>
                                                {creator.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Event Teams Row */}
                        {eventBrands.length > 0 && (
                            <div className="h-full shrink-0 snap-always snap-start flex flex-col justify-center pt-2 pb-2">
                                <div
                                    ref={brandScrollRef}
                                    className={`flex gap-5 overflow-x-auto no-scrollbar py-2 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                                    {...brandDragHandlers}
                                >
                                    {eventBrands.map(brand => (
                                        <button
                                            key={brand.id}
                                            onClick={(e) => {
                                                if (isDragging) {
                                                    e.preventDefault();
                                                    return;
                                                }
                                                setSelectedBrandId(
                                                    selectedBrandId === brand.id ? null : brand.id
                                                );
                                                setSelectedCreatorId(null);
                                            }}
                                            className="flex flex-col items-center gap-2 shrink-0 group select-none"
                                        >
                                            <div className="relative">
                                                <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-zinc-800 transition-all ${
                                                    selectedBrandId === brand.id
                                                        ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-950'
                                                        : 'group-hover:ring-2 group-hover:ring-zinc-600 group-hover:ring-offset-2 group-hover:ring-offset-zinc-950'
                                                }`}>
                                                    {brand.logo ? (
                                                        <img
                                                            src={brand.logo}
                                                            alt={brand.name}
                                                            className="w-full h-full object-cover pointer-events-none"
                                                            draggable={false}
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xl font-bold">
                                                            {brand.name.charAt(0)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-xs font-medium max-w-[80px] truncate transition-colors ${
                                                selectedBrandId === brand.id
                                                    ? 'text-violet-400'
                                                    : 'text-zinc-400 group-hover:text-zinc-200'
                                            }`}>
                                                {brand.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {(selectedCreator || selectedBrand) && (
                        <div className="mt-4 flex items-center gap-2">
                            <span className="text-sm text-zinc-400">
                                <span className="text-violet-400 font-semibold">
                                    {selectedCreator ? selectedCreator.name : selectedBrand?.name}
                                </span>의 콘텐츠
                            </span>
                            <button
                                onClick={() => {
                                    setSelectedCreatorId(null);
                                    setSelectedBrandId(null);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded-full hover:bg-zinc-700 transition-colors"
                            >
                                <X className="w-3 h-3" />
                                <span>해제</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Masonry Grid */}
                {filteredItems.length > 0 ? (
                    <div
                        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-x-3 grid-flow-dense"
                        style={{ gridAutoRows: '1px' }}
                    >
                        <AnimatePresence>
                            {filteredItems.map(item => (
                                <UnifiedContentCard
                                    key={item.id}
                                    item={item}
                                    onSparringClick={handleSparringClick}
                                    isMasonry={true}
                                    initialSaved={savedMap.get(item.id)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="text-center py-32 bg-zinc-900/20 border border-zinc-900 rounded-[2rem] backdrop-blur-sm">
                        <div className="relative inline-block mb-6">
                            <Search className="w-16 h-16 text-zinc-800 mx-auto" />
                            <div className="absolute inset-0 bg-violet-500/5 blur-2xl rounded-full"></div>
                        </div>
                        <h3 className="text-2xl font-bold text-zinc-200 mb-3">검색 결과가 없습니다</h3>
                        <p className="text-zinc-500 max-w-xs mx-auto mb-8">다른 검색어나 필터를 시도해보세요.</p>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                            }}
                            className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold rounded-2xl transition-all hover:scale-105"
                        >
                            필터 초기화
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
