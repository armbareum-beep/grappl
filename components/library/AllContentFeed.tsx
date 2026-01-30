import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { getCourses, fetchRoutines, getSparringVideos, getDailyFreeLesson, getDailyFreeSparring } from '../../lib/api';
import { Course, DrillRoutine, SparringVideo } from '../../types';
import { cn } from '../../lib/utils';
import { LoadingScreen } from '../LoadingScreen';
import { UnifiedContentCard, UnifiedContentItem, ContentType, CardVariant } from './UnifiedContentCard';
import { LibraryTabs, LibraryTabType } from './LibraryTabs';

type ContentFilter = 'all' | 'class' | 'routine' | 'sparring';

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
    // Create shallow copies of arrays to use as queues
    const wideItems = items.filter(i => (i.type === 'class') || (i.type === 'sparring' && i.variant === 'wide'));
    const tallItems = items.filter(i => (i.type === 'routine') || (i.type === 'sparring' && i.variant === 'tall'));
    const squareItems = items.filter(i => (i.type === 'sparring' && (!i.variant || i.variant === 'square')));

    const result: UnifiedContentItem[] = [];

    // Safety break
    let loopCount = 0;
    const maxLoops = items.length * 2 + 100;

    // Continue as long as ANY queue has items
    while ((wideItems.length > 0 || tallItems.length > 0 || squareItems.length > 0) && loopCount < maxLoops) {
        loopCount++;

        // 1. One Wide Item (Occupies 2 cols)
        if (wideItems.length > 0) {
            result.push(wideItems.shift()!);
        }

        // 2. Two Tall Items (Occupies 1+1 cols)
        let tCount = 0;
        while (tCount < 2 && tallItems.length > 0) {
            result.push(tallItems.shift()!);
            tCount++;
        }

        // 3. Another Wide Item
        if (wideItems.length > 0) {
            result.push(wideItems.shift()!);
        }

        // 4. Two Square Items (Occupy 1+1 cols)
        let sCount = 0;
        while (sCount < 2 && squareItems.length > 0) {
            result.push(squareItems.shift()!);
            sCount++;
        }

        // Fallback: If wide queue is empty, flush others
        if (wideItems.length === 0) {
            if (tallItems.length > 0) result.push(tallItems.shift()!);
            if (squareItems.length > 0) result.push(squareItems.shift()!);
        }
    }

    // Final flush of any remains
    return [...result, ...wideItems, ...tallItems, ...squareItems];
}

const filterLabels: { key: ContentFilter; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'class', label: '클래스' },
    { key: 'routine', label: '루틴' },
    { key: 'sparring', label: '스파링' },
];

export const AllContentFeed: React.FC<AllContentFeedProps> = ({ activeTab, onTabChange }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [contentFilter, setContentFilter] = useState<ContentFilter>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [allItems, setAllItems] = useState<UnifiedContentItem[]>([]);

    // Daily free IDs
    const [, setFreeIds] = useState<{
        course?: string;
        sparring?: string;
    }>({});

    useEffect(() => {
        loadAllContent();
    }, []);

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
            ] = await Promise.all([
                getCourses(100),
                fetchRoutines(100),
                getSparringVideos(100, undefined, true),
                getDailyFreeLesson(),
                getDailyFreeSparring(),
            ]);

            // Extract daily free IDs
            const dailyFreeIds = {
                course: dailyFreeLessonRes.data?.courseId,
                sparring: dailyFreeSparringRes.data?.id,
            };
            setFreeIds(dailyFreeIds);

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
                    createdAt: course.createdAt,
                    views: course.views,
                    rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    isDailyFree: course.id === dailyFreeIds.course,
                    originalData: course,
                    variant: 'wide', // Classes are always wide
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
                    createdAt: routine.createdAt,
                    views: routine.views,
                    rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    drillCount: routine.drills?.length || 0,
                    originalData: routine,
                    variant: 'tall', // Routines are always tall
                };
            });

            // Transform sparring
            const sparring: SparringVideo[] = sparringRes.data || [];
            const hotSparring = [...sparring]
                .filter(s => (s.views || 0) >= 5)
                .sort((a, b) => getHotScore(b) - getHotScore(a));

            // Cycle variants for sparring: Wide -> Tall -> Square
            const sparringVariants: CardVariant[] = ['wide', 'tall', 'square'];

            const sparringItems: UnifiedContentItem[] = sparring.map((video, index) => {
                const hotIndex = hotSparring.findIndex(hs => hs.id === video.id);
                // Assign variant based on index
                const variant = sparringVariants[index % sparringVariants.length];

                return {
                    id: video.id,
                    type: 'sparring' as ContentType,
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl || '',
                    creatorName: video.creator?.name,
                    creatorProfileImage: (video.creator as any)?.avatar_url || (video.creator as any)?.profileImage,
                    creatorId: video.creatorId,
                    createdAt: video.createdAt,
                    views: video.views,
                    rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                    isDailyFree: video.id === dailyFreeIds.sparring,
                    originalData: video,
                    variant: variant,
                };
            });

            // Smart Sort
            // Shuffle first to ensure random distribution of types
            const allContentInOrder = [...courseItems, ...routineItems, ...sparringItems].sort(() => Math.random() - 0.5);
            const sorted = smartSort(allContentInOrder);
            setAllItems(sorted);
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

        return items;
    }, [allItems, searchTerm]);

    const handleSparringClick = (item: UnifiedContentItem) => {
        navigate(`/sparring?id=${item.id}`);
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

                {/* Masonry Grid */}
                {filteredItems.length > 0 ? (
                    <div
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3"
                        style={{ gridAutoRows: '60px', gridAutoFlow: 'dense' }}
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredItems.map(item => (
                                <UnifiedContentCard
                                    key={item.id}
                                    item={item}
                                    onSparringClick={handleSparringClick}
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
