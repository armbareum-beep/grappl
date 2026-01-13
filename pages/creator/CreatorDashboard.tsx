import React, { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { getCreatorCourses, calculateCreatorEarnings, getDrills, deleteDrill, getAllCreatorLessons, deleteLesson, getUserCreatedRoutines, deleteRoutine, getSparringVideos, deleteSparringVideo, deleteCourse } from '../../lib/api';
import { Course, Drill, Lesson, DrillRoutine, SparringVideo } from '../../types';
import { MobileTabSelector } from '../../components/MobileTabSelector';
import { Button } from '../../components/Button';
import { BookOpen, DollarSign, Eye, TrendingUp, Package, MessageSquare, LayoutDashboard, PlayCircle, Grid, Layers, Clapperboard, X } from 'lucide-react';
import { MarketingTab } from '../../components/creator/MarketingTab';
import { FeedbackSettingsTab } from '../../components/creator/FeedbackSettingsTab';
import { FeedbackRequestsTab } from '../../components/creator/FeedbackRequestsTab';
import { RevenueAnalyticsTab } from '../../components/creator/RevenueAnalyticsTab';
import { CoursePerformanceTab } from '../../components/creator/CoursePerformanceTab';
import { RoutinePerformanceTab } from '../../components/creator/RoutinePerformanceTab';
import { SparringPerformanceTab } from '../../components/creator/SparringPerformanceTab';
import { PayoutSettingsTab } from '../../components/creator/PayoutSettingsTab';
import { LoadingScreen } from '../../components/LoadingScreen';
import { ContentCard } from '../../components/creator/ContentCard';
import { useDataControls, SearchInput, SortSelect, Pagination, SortOption } from '../../components/common/DataControls';
import { UnifiedContentModal } from '../../components/creator/UnifiedContentModal';
import { useToast } from '../../contexts/ToastContext';
import { createCourse, updateCourse, createRoutine, updateRoutine, updateSparringVideo, updateCourseLessons, updateCourseBundles } from '../../lib/api';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';

export const CreatorDashboard: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const navigate = useNavigate();
    const { queueUpload } = useBackgroundUpload();
    const [searchParams, setSearchParams] = useSearchParams();
    const [courses, setCourses] = useState<Course[]>([]);
    const [drills, setDrills] = useState<Drill[]>([]);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [sparringVideos, setSparringVideos] = useState<SparringVideo[]>([]);
    const [earnings, setEarnings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const initialTab = (searchParams.get('tab') as any) || 'content';
    const [activeTab, setActiveTab] = useState<'content' | 'materials' | 'marketing' | 'feedback' | 'analytics' | 'payout'>(initialTab);
    const initialContentTab = (searchParams.get('contentTab') as any) || 'courses';
    const [activeContentTab, setActiveContentTab] = useState<'courses' | 'routines' | 'sparring'>(initialContentTab);
    const initialMaterialsTab = (searchParams.get('materialsTab') as any) || 'lessons';
    const [activeMaterialsTab, setActiveMaterialsTab] = useState<'lessons' | 'drills' | 'sparring'>(initialMaterialsTab);
    const [activePerformanceTab, setActivePerformanceTab] = useState<'courses' | 'routines' | 'sparring'>('courses');
    const [showSparringSelectModal, setShowSparringSelectModal] = useState(false);
    const [modalSearchQuery, setModalSearchQuery] = useState('');

    // Unified Content Modal State
    const [showContentModal, setShowContentModal] = useState(false);
    const [contentModalType, setContentModalType] = useState<'course' | 'routine' | 'sparring'>('course');
    const [editingContent, setEditingContent] = useState<Course | DrillRoutine | SparringVideo | null>(null);

    // Open Modal Handlers
    const openCourseModal = (course?: Course) => {
        setContentModalType('course');
        setEditingContent(course || null);
        setShowContentModal(true);
    };

    const openRoutineModal = (routine?: DrillRoutine) => {
        setContentModalType('routine');
        setEditingContent(routine || null);
        setShowContentModal(true);
    };

    const openSparringModal = (sparring?: SparringVideo) => {
        setContentModalType('sparring');
        setEditingContent(sparring || null);
        setShowContentModal(true);
    };

    // Save Handler for Unified Modal
    const handleContentSave = async (data: any) => {
        if (!user) return;

        try {
            if (contentModalType === 'course') {
                let courseId = editingContent?.id;

                if (editingContent) {
                    await updateCourse(editingContent.id, {
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        difficulty: data.difficulty,
                        uniformType: data.uniformType,
                        price: data.price,
                        thumbnailUrl: data.thumbnailUrl,
                        published: data.published,
                        isSubscriptionExcluded: data.isSubscriptionExcluded,
                    });
                    success('클래스가 수정되었습니다.');
                } else {
                    const result = await createCourse({
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        difficulty: data.difficulty,
                        uniformType: data.uniformType,
                        price: data.price,
                        thumbnailUrl: data.thumbnailUrl,
                        published: data.published,
                        isSubscriptionExcluded: data.isSubscriptionExcluded,
                        creatorId: user.id,
                    });
                    if (result.data) courseId = result.data.id;
                    success('클래스가 생성되었습니다.');
                }

                // Handle Curriculum (Lessons)
                if (courseId && data.selectedLessonIds) {
                    const { error: lessonError } = await updateCourseLessons(courseId, data.selectedLessonIds);
                    if (lessonError) {
                        toastError('커리큘럼 저장 중 오류가 발생했습니다.');
                        console.error('Lessons update error:', lessonError);
                    }
                }

                // Handle Bundled Content (Drills & Sparring)
                if (courseId && data.relatedItems) {
                    const { error: bundleError } = await updateCourseBundles(courseId, data.relatedItems, data.title);
                    if (bundleError) {
                        toastError('연결된 컨텐츠(드릴/스파링) 저장 중 오류가 발생했습니다.');
                        console.error('Bundles update error:', bundleError);
                    }
                }

                // Handle Preview Upload
                if (data.previewVideoFile && data.previewCuts && courseId) {
                    const previewId = `${crypto.randomUUID()}-${Date.now()}`;
                    await queueUpload(data.previewVideoFile, 'preview', {
                        videoId: previewId,
                        filename: `preview-${courseId}.mp4`,
                        title: `[Preview] ${data.title}`,
                        description: `Preview video for course ${data.title}`,
                        videoType: 'preview',
                        courseId: courseId,
                        cuts: data.previewCuts
                    });
                    success('미리보기 영상 업로드가 시작되었습니다.');
                }

                // Refresh courses
                const coursesData = await getCreatorCourses(user.id);
                setCourses(coursesData || []);
            } else if (contentModalType === 'routine') {
                if (editingContent) {
                    await updateRoutine(editingContent.id, {
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        difficulty: data.difficulty,
                        uniformType: data.uniformType,
                        price: data.price,
                        thumbnailUrl: data.thumbnailUrl,
                        totalDurationMinutes: data.totalDurationMinutes,
                        relatedItems: data.relatedItems,
                    }, data.selectedDrillIds);
                    success('루틴이 수정되었습니다.');
                } else {
                    await createRoutine({
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        difficulty: data.difficulty,
                        uniformType: data.uniformType,
                        price: data.price,
                        thumbnailUrl: data.thumbnailUrl,
                        totalDurationMinutes: data.totalDurationMinutes,
                        relatedItems: data.relatedItems,
                        creatorId: user.id,
                        creatorName: user.user_metadata?.name || 'Creator',
                    }, data.selectedDrillIds);
                    success('루틴이 생성되었습니다.');
                }
                // Refresh routines
                const routinesData = await getUserCreatedRoutines(user.id);
                setRoutines(routinesData?.data || []);
            } else if (contentModalType === 'sparring') {
                if (editingContent) {
                    await updateSparringVideo(editingContent.id, {
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        difficulty: data.difficulty,
                        uniformType: data.uniformType,
                        price: data.price,
                        relatedItems: data.relatedItems,
                        isPublished: data.published,
                    });

                    // Handle Preview Upload for Sparring
                    if (data.previewVideoFile && data.previewCuts) {
                        const previewId = `${crypto.randomUUID()}-${Date.now()}`;
                        await queueUpload(data.previewVideoFile, 'preview', {
                            videoId: previewId,
                            filename: `preview-${editingContent.id}.mp4`,
                            title: `[Preview] ${data.title}`,
                            description: `Preview video for sparring ${data.title}`,
                            videoType: 'preview',
                            sparringId: editingContent.id,
                            cuts: data.previewCuts
                        });
                        success('미리보기 영상 업로드가 시작되었습니다.');
                    }

                    success('스파링 정보가 수정되었습니다.');
                    // Refresh sparring
                    const sparringData = await getSparringVideos(100, user.id);
                    setSparringVideos(sparringData?.data || []);
                }
            }
        } catch (err: any) {
            console.error('Save error:', err);
            toastError(err.message || '저장 중 오류가 발생했습니다.');
            throw err;
        }
    };

    // Sync tab state to URL
    useEffect(() => {
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            newParams.set('tab', activeTab);
            return newParams;
        });
    }, [activeTab, setSearchParams]);

    // Sync content tab state to URL
    useEffect(() => {
        if (activeTab === 'content') {
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.set('contentTab', activeContentTab);
                return newParams;
            });
        }
    }, [activeContentTab, activeTab, setSearchParams]);

    // Sync materials tab state to URL
    useEffect(() => {
        if (activeTab === 'materials') {
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.set('materialsTab', activeMaterialsTab);
                return newParams;
            });
        }
    }, [activeMaterialsTab, activeTab, setSearchParams]);

    // --- Data Controls Support ---

    // Sort Options
    const dateSortDesc = (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    const dateSortAsc = (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const titleSort = (a: any, b: any) => a.title.localeCompare(b.title);
    const viewsSort = (a: any, b: any) => (b.views || 0) - (a.views || 0);

    const commonSortOptions: SortOption<any>[] = [
        { label: '최신순', value: 'newest', comparator: dateSortDesc },
        { label: '오래된순', value: 'oldest', comparator: dateSortAsc },
        { label: '이름순', value: 'title', comparator: titleSort },
        { label: '조회수순', value: 'views', comparator: viewsSort },
    ];

    // Hooks for each section
    const courseControls = useDataControls<Course>({
        data: courses,
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 5
    });

    const routineControls = useDataControls<DrillRoutine>({
        data: routines,
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 5
    });

    const salesSparringControls = useDataControls<SparringVideo>({
        data: sparringVideos.filter(v => (v.price || 0) > 0),
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 6
    });

    const materialsSparringControls = useDataControls<SparringVideo>({
        data: sparringVideos.filter(v => (v.price || 0) === 0),
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 10
    });

    const lessonControls = useDataControls<Lesson>({
        data: lessons,
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 10
    });

    const drillControls = useDataControls<Drill>({
        data: drills,
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 10
    });

    useEffect(() => {
        async function fetchData() {
            if (!user) return;
            setLoading(true);

            // Helper: Add timeout to any promise
            const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
                return Promise.race([
                    promise,
                    new Promise<T>((resolve) => setTimeout(() => {
                        console.warn('API call timed out, using fallback');
                        resolve(fallback);
                    }, timeoutMs))
                ]);
            };

            // Fetch data in parallel with timeout protection
            const fetchCourses = withTimeout(
                getCreatorCourses(user.id).catch(err => {
                    console.error('Failed to fetch courses:', err);
                    return [];
                }),
                10000,
                []
            );

            const fetchDrills = withTimeout(
                getDrills(user.id).catch(err => {
                    console.error('Failed to fetch drills:', err);
                    return { data: [], error: err };
                }),
                10000,
                { data: [], error: null }
            );

            const fetchLessons = withTimeout(
                getAllCreatorLessons(user.id).catch(err => {
                    console.error('Failed to fetch lessons:', err);
                    return [];
                }),
                10000,
                []
            );

            const fetchRoutines = withTimeout(
                getUserCreatedRoutines(user.id).catch(err => {
                    console.error('Failed to fetch routines:', err);
                    return { data: [], error: err };
                }),
                10000,
                { data: [], error: null }
            );

            const fetchSparring = withTimeout(
                getSparringVideos(100, user.id).catch(err => {
                    console.error('Failed to fetch sparring:', err);
                    return { data: [], error: err };
                }),
                10000,
                { data: [], error: null }
            );

            const fetchEarnings = withTimeout(
                calculateCreatorEarnings(user.id).catch(err => {
                    console.error('Failed to fetch earnings:', err);
                    return { error: err };
                }),
                10000,
                { error: null }
            );

            try {
                const [coursesData, drillsData, lessonsData, routinesData, sparringData, earningsData] = await Promise.all([
                    fetchCourses,
                    fetchDrills,
                    fetchLessons,
                    fetchRoutines,
                    fetchSparring,
                    fetchEarnings
                ]);

                console.log('Dashboard Data Loaded:', {
                    courses: coursesData?.length,
                    drills: Array.isArray(drillsData) ? drillsData.length : (drillsData as any)?.data?.length,
                    sparring: sparringData?.data?.length,
                    earnings: earningsData
                });

                setCourses(coursesData || []);
                setDrills(Array.isArray(drillsData) ? drillsData : (drillsData as any)?.data || []);
                setLessons(lessonsData || []);
                setRoutines(routinesData?.data || []);
                setSparringVideos(sparringData?.data || []);

                if (earningsData && 'data' in earningsData) {
                    setEarnings(earningsData.data);
                } else if (earningsData && !('error' in earningsData)) {
                    // Handle case where earnings might return data directly or in generic format
                    setEarnings(earningsData);
                }
            } catch (error) {
                console.error('Critical Error in Dashboard Promise.all:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        // 폴링 비활성화 - 페이지 새로고침으로 데이터 자동 로드됨
        // 처리중 상태는 페이지 새로고침 시점에 최신 데이터로 업데이트됨

    }, [user?.id]); // FIX: Only re-run if user ID changes, preventing infinite loops on object reference updates

    const handleDeleteDrill = async (drillId: string, drillTitle: string) => {
        if (!confirm(`"${drillTitle}" 드릴을 삭제하시겠습니까?`)) return;

        const { error } = await deleteDrill(drillId);
        if (error) {
            alert('드릴 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh drills list
        setDrills(drills.filter(d => d.id !== drillId));
    };

    const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
        if (!confirm(`"${courseTitle}" 클래스를 삭제하시겠습니까?`)) return;

        const { error } = await deleteCourse(courseId);
        if (error) {
            alert('클래스 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh courses list
        setCourses(courses.filter(c => c.id !== courseId));
    };


    const handleDeleteLesson = async (lessonId: string, lessonTitle: string) => {
        if (!confirm(`"${lessonTitle}" 레슨을 삭제하시겠습니까?`)) return;

        const { error } = await deleteLesson(lessonId);
        if (error) {
            alert('레슨 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh lessons list
        setLessons(lessons.filter(l => l.id !== lessonId));
    };

    const handleDeleteRoutine = async (routineId: string, routineTitle: string) => {
        if (!confirm(`"${routineTitle}" 루틴을 삭제하시겠습니까?`)) return;

        const { error } = await deleteRoutine(routineId);
        if (error) {
            alert('루틴 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh routines list
        setRoutines(routines.filter(r => r.id !== routineId));
    };

    const handleDeleteSparringVideo = async (videoId: string, title: string) => {
        if (!confirm(`"${title}" 스파링 영상을 삭제하시겠습니까?`)) return;

        const { error, archived } = await deleteSparringVideo(videoId) as any;
        if (error) {
            alert('스파링 영상 삭제 중 오류가 발생했습니다.');
            return;
        }

        if (archived) {
            alert('이 영상은 구매 내역이 있어 완전히 삭제되지 않고 보관 처리되었습니다.\n(내 목록에서는 사라지지만 구매자는 계속 볼 수 있습니다)');
        }

        // Refresh list
        setSparringVideos(sparringVideos.filter(v => v.id !== videoId));
    };

    if (loading) {
        return <LoadingScreen message="크리에이터 대시보드를 불러오는 중..." />;
    }

    // Calculate total stats
    const totalViews =
        courses.reduce((sum, c) => sum + (c.views || 0), 0) +
        drills.reduce((sum, d) => sum + (d.views || 0), 0) +
        routines.reduce((sum, r) => sum + (r.views || 0), 0) +
        sparringVideos.reduce((sum, s) => sum + (s.views || 0), 0);

    // Calculate total watch time in minutes from the OFFICIAL settlement data (which includes Lessons, Drills, Sparring)
    const totalWatchTimeSeconds = earnings?.creatorWatchTime || 0;
    const totalWatchTimeMinutes = Math.floor(totalWatchTimeSeconds / 60);
    const watchTimeDisplay = totalWatchTimeMinutes >= 60
        ? `${Math.floor(totalWatchTimeMinutes / 60)}시간 ${totalWatchTimeMinutes % 60}분`
        : `${totalWatchTimeMinutes}분`;

    const TABS = [
        { id: 'content', label: '내 콘텐츠 (판매 상품)', icon: LayoutDashboard },
        { id: 'materials', label: '내 자료 (레슨/드릴)', icon: Package },
        { id: 'marketing', label: '마케팅', icon: TrendingUp },
        { id: 'feedback', label: '피드백', icon: MessageSquare },
        { id: 'analytics', label: '분석', icon: Eye },
        { id: 'payout', label: '정산', icon: DollarSign },
    ];

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-50 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Header & Stats */}
                <div className="space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">크리에이터 대시보드</h1>
                        <p className="text-zinc-400 mt-2">콘텐츠를 관리하고 수익을 창출하세요.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-sm backdrop-blur-sm hover:border-violet-500/20 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-zinc-400">총 조회수</h3>
                                <Eye className="w-4 h-4 text-violet-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">{totalViews.toLocaleString()}</div>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-sm backdrop-blur-sm hover:border-emerald-500/20 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-zinc-400">총 수익</h3>
                                <DollarSign className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">
                                ₩{earnings?.totalRevenue?.toLocaleString() || '0'}
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 shadow-sm backdrop-blur-sm hover:border-blue-500/20 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-zinc-400">총 시청시간</h3>
                                <PlayCircle className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">{watchTimeDisplay}</div>
                        </div>
                    </div>
                </div>

                {/* Tab Navigation - Desktop */}
                <div className="hidden md:flex items-center p-1 bg-zinc-900/50 rounded-lg w-full md:w-fit border border-zinc-800 overflow-x-auto">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-zinc-800 text-white shadow-sm ring-1 ring-white/10"
                                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Navigation - Mobile */}
                <MobileTabSelector
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as any)}
                />

                {/* Tab Content */}
                <div className="min-h-[400px]">
                    {activeTab === 'content' ? (
                        <div className="space-y-8">
                            {/* Content Sub-Navigation */}
                            <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 w-fit">
                                <button
                                    onClick={() => setActiveContentTab('courses')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeContentTab === 'courses'
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    내 클래스 (Courses)
                                </button>

                                <button
                                    onClick={() => setActiveContentTab('routines')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeContentTab === 'routines'
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    내 루틴 (Routines)
                                </button>
                                <button
                                    onClick={() => setActiveContentTab('sparring')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeContentTab === 'sparring'
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    내 스파링 (Sparring)
                                </button>
                            </div>

                            {activeContentTab === 'courses' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <BookOpen className="w-5 h-5 text-zinc-400" />
                                                내 클래스
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">학생들에게 판매할 클래스를 관리하세요</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                            <SearchInput
                                                value={courseControls.searchQuery}
                                                onChange={courseControls.setSearchQuery}
                                                placeholder="클래스 검색..."
                                            />
                                            <SortSelect
                                                options={commonSortOptions}
                                                value={courseControls.currentSortValue}
                                                onChange={courseControls.setCurrentSortValue}
                                            />
                                            <Button
                                                onClick={() => openCourseModal()}
                                                className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white"
                                            >
                                                새 클래스 만들기
                                            </Button>
                                        </div>
                                    </div>


                                    {courseControls.filteredData.length === 0 ? (
                                        <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                            <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                            <p className="text-zinc-500 mb-4">
                                                {courses.length === 0 ? '아직 개설한 클래스가 없습니다.' : '검색 결과가 없습니다.'}
                                            </p>
                                            {courses.length === 0 && (
                                                <Button variant="outline" onClick={() => openCourseModal()}>첫 클래스 만들기</Button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {courseControls.paginatedData.map((course) => (
                                                    <ContentCard
                                                        key={course.id}
                                                        type="course"
                                                        title={course.title}
                                                        description={course.description}
                                                        thumbnailUrl={course.thumbnailUrl}
                                                        price={course.price}
                                                        views={course.views}
                                                        count={course.lessonCount}
                                                        onEdit={() => openCourseModal(course)}
                                                        onDelete={() => handleDeleteCourse(course.id, course.title)}
                                                    />
                                                ))}
                                            </div>
                                            <div className="pt-6">
                                                <Pagination
                                                    currentPage={courseControls.currentPage}
                                                    totalPages={courseControls.totalPages}
                                                    onPageChange={courseControls.setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeContentTab === 'routines' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Layers className="w-5 h-5 text-zinc-400" />
                                                내 루틴
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">드릴을 조합한 훈련 루틴을 관리하세요</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                            <SearchInput
                                                value={routineControls.searchQuery}
                                                onChange={routineControls.setSearchQuery}
                                                placeholder="루틴 검색..."
                                            />
                                            <SortSelect
                                                options={commonSortOptions}
                                                value={routineControls.currentSortValue}
                                                onChange={routineControls.setCurrentSortValue}
                                            />
                                            <Button
                                                onClick={() => openRoutineModal()}
                                                className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white"
                                            >
                                                새 루틴 만들기
                                            </Button>
                                        </div>
                                    </div>

                                    {routineControls.filteredData.length === 0 ? (
                                        <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                            <Layers className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                            <p className="text-zinc-500 mb-4">
                                                {routines.length === 0 ? '아직 개설한 루틴이 없습니다.' : '검색 결과가 없습니다.'}
                                            </p>
                                            {routines.length === 0 && (
                                                <Button variant="outline" onClick={() => openRoutineModal()}>첫 루틴 만들기</Button>
                                            )}
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {routineControls.paginatedData.map((routine) => (
                                                    <ContentCard
                                                        key={routine.id}
                                                        type="routine"
                                                        title={routine.title}
                                                        description={routine.description}
                                                        thumbnailUrl={routine.thumbnailUrl}
                                                        price={routine.price}
                                                        views={routine.views}
                                                        count={routine.drillCount}
                                                        onEdit={() => openRoutineModal(routine)}
                                                        onDelete={() => handleDeleteRoutine(routine.id, routine.title)}
                                                    />
                                                ))}
                                            </div>
                                            <div className="pt-6">
                                                <Pagination
                                                    currentPage={routineControls.currentPage}
                                                    totalPages={routineControls.totalPages}
                                                    onPageChange={routineControls.setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeContentTab === 'sparring' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Clapperboard className="w-5 h-5 text-zinc-400" />
                                                스파링 (판매 상품)
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">유료로 판매 중인 스파링 영상 목록입니다.</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <SearchInput
                                                value={salesSparringControls.searchQuery}
                                                onChange={salesSparringControls.setSearchQuery}
                                                placeholder="상품 검색..."
                                            />
                                            {/* In a fuller implementation, this would open a modal to select from Materials */}
                                            <Button
                                                size="sm"
                                                className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200"
                                                onClick={() => setShowSparringSelectModal(true)}
                                            >
                                                재료에서 선택하여 공개하기
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Filter sparring videos where price > 0 */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {salesSparringControls.paginatedData.map((video) => (
                                            <ContentCard
                                                key={video.id}
                                                type="sparring"
                                                title={video.title}
                                                description={video.description}
                                                thumbnailUrl={video.thumbnailUrl}
                                                price={video.price}
                                                views={video.views}
                                                onEdit={() => openSparringModal(video)}
                                                onDelete={() => handleDeleteSparringVideo(video.id, video.title)}
                                            />
                                        ))}
                                    </div>
                                    {salesSparringControls.filteredData.length === 0 && (
                                        <div className="text-center py-8 text-zinc-500 text-sm bg-zinc-900/30 rounded-lg border border-dashed border-zinc-800">
                                            판매 중인 스파링 상품이 없습니다.<br />
                                            유료 스파링을 업로드하여 수익을 창출해보세요.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'materials' ? (
                        <div className="space-y-8">
                            {/* Materials Sub-Navigation */}
                            <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 w-fit">
                                <button
                                    onClick={() => setActiveMaterialsTab('lessons')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeMaterialsTab === 'lessons'
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    내 레슨 (Lessons)
                                </button>
                                <button
                                    onClick={() => setActiveMaterialsTab('drills')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeMaterialsTab === 'drills'
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    내 드릴 (Drills)
                                </button>
                                <button
                                    onClick={() => setActiveMaterialsTab('sparring')}
                                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${activeMaterialsTab === 'sparring'
                                        ? 'bg-zinc-800 text-white shadow-md'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                        }`}
                                >
                                    내 스파링 (Sparring)
                                </button>
                            </div>

                            {activeMaterialsTab === 'lessons' && (
                                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <PlayCircle className="w-5 h-5 text-zinc-400" />
                                                내 레슨
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">클래스를 구성하는 개별 레슨 영상</p>

                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <SearchInput
                                                value={lessonControls.searchQuery}
                                                onChange={lessonControls.setSearchQuery}
                                                placeholder="레슨 검색..."
                                            />
                                            <Link to="/creator/lessons/new">
                                                <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">새 레슨 업로드</Button>
                                            </Link>
                                        </div>
                                    </div>

                                    {lessonControls.filteredData.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                                            <p className="text-zinc-500">
                                                {lessons.length === 0 ? '업로드한 레슨이 없습니다.' : '검색 결과가 없습니다.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {lessonControls.paginatedData.map((lesson) => (
                                                    <ContentCard
                                                        key={lesson.id}
                                                        type="lesson"
                                                        title={lesson.title}
                                                        description={lesson.description}
                                                        thumbnailUrl={lesson.thumbnailUrl || (lesson as any).course?.thumbnailUrl}
                                                        views={0} // Logic for lesson views can be added later
                                                        duration={lesson.durationMinutes}
                                                        createdAt={lesson.createdAt}
                                                        isProcessing={!lesson.vimeoUrl}
                                                        onClick={() => {
                                                            if (!lesson.vimeoUrl) {
                                                                alert('동영상이 처리 중입니다. 잠시만 기다려주세요.');
                                                                return;
                                                            }
                                                            navigate(`/lessons/${lesson.id}`);
                                                        }}
                                                        onEdit={() => navigate(`/creator/lessons/${lesson.id}/edit`)}
                                                        onDelete={() => handleDeleteLesson(lesson.id, lesson.title)}
                                                    />
                                                ))}
                                            </div>
                                            <div className="pt-6">
                                                <Pagination
                                                    currentPage={lessonControls.currentPage}
                                                    totalPages={lessonControls.totalPages}
                                                    onPageChange={lessonControls.setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeMaterialsTab === 'drills' && (
                                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Grid className="w-5 h-5 text-zinc-400" />
                                                내 드릴
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">루틴 구성용 짧은 영상</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <SearchInput
                                                value={drillControls.searchQuery}
                                                onChange={drillControls.setSearchQuery}
                                                placeholder="드릴 검색..."
                                            />
                                            <Link to="/creator/drills/new">
                                                <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">새 드릴 업로드</Button>
                                            </Link>
                                        </div>
                                    </div>

                                    {drillControls.filteredData.length === 0 ? (
                                        <div className="text-center py-12 border border-dashed border-zinc-800 rounded-lg">
                                            <p className="text-zinc-500">
                                                {drills.length === 0 ? '업로드한 드릴이 없습니다.' : '검색 결과가 없습니다.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {drillControls.paginatedData.map((drill) => (
                                                    <ContentCard
                                                        key={drill.id}
                                                        type="drill"
                                                        title={drill.title}
                                                        description={drill.description}
                                                        thumbnailUrl={drill.thumbnailUrl}
                                                        views={drill.views}
                                                        createdAt={drill.createdAt}
                                                        isProcessing={!!(!drill.vimeoUrl || drill.vimeoUrl?.trim() === '')}
                                                        isError={!!(drill.vimeoUrl?.startsWith('ERROR:'))}
                                                        onClick={() => {
                                                            if (!drill.vimeoUrl) {
                                                                alert('동영상이 처리 중입니다. 잠시만 기다려주세요.');
                                                                return;
                                                            }
                                                            navigate(`/drills/${drill.id}`);
                                                        }}
                                                        onEdit={() => navigate(`/creator/drills/${drill.id}/edit`)}
                                                        onDelete={() => handleDeleteDrill(drill.id, drill.title)}
                                                    />
                                                ))}
                                            </div>
                                            <div className="pt-6">
                                                <Pagination
                                                    currentPage={drillControls.currentPage}
                                                    totalPages={drillControls.totalPages}
                                                    onPageChange={drillControls.setCurrentPage}
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            {activeMaterialsTab === 'sparring' && (
                                <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                <Clapperboard className="w-5 h-5 text-zinc-400" />
                                                내 스파링 (전체 자료)
                                            </h2>
                                            <p className="text-zinc-400 text-sm mt-1">업로드한 원본 스파링 영상입니다. '내 콘텐츠' 탭에서 이 자료를 가져와 판매용 상품으로 구성할 수 있습니다.</p>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <SearchInput
                                                value={materialsSparringControls.searchQuery}
                                                onChange={materialsSparringControls.setSearchQuery}
                                                placeholder="스파링 검색..."
                                            />
                                            <Link to="/creator/sparring/new">
                                                <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">새 스파링 업로드</Button>
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {materialsSparringControls.paginatedData.map((video) => {
                                            const isError = video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error');
                                            const isProcessing = !video.videoUrl || (!isError && !video.thumbnailUrl);

                                            return (
                                                <ContentCard
                                                    key={video.id}
                                                    type="sparring"
                                                    title={video.title}
                                                    description={video.description}
                                                    thumbnailUrl={video.thumbnailUrl}
                                                    views={video.views}
                                                    createdAt={video.createdAt}
                                                    category={video.category === 'Competition' ? '대회' : '스파링'}
                                                    uniformType={video.uniformType}
                                                    isProcessing={isProcessing}
                                                    isError={isError}
                                                    onClick={() => {
                                                        if (isProcessing) {
                                                            alert('동영상이 처리 중입니다. 잠시만 기다려주세요.');
                                                            return;
                                                        }
                                                        navigate(`/sparring/${video.id}`);
                                                    }}
                                                    onEdit={() => openSparringModal(video)}
                                                    onDelete={() => handleDeleteSparringVideo(video.id, video.title)}
                                                />
                                            );
                                        })}
                                    </div>
                                    {materialsSparringControls.filteredData.length === 0 && (
                                        <div className="text-center py-8 text-zinc-500 text-sm">업로드된 스파링 영상이 없습니다.</div>
                                    )}
                                    <div className="pt-6">
                                        <Pagination
                                            currentPage={materialsSparringControls.currentPage}
                                            totalPages={materialsSparringControls.totalPages}
                                            onPageChange={materialsSparringControls.setCurrentPage}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'marketing' ? (
                        <MarketingTab />
                    ) : activeTab === 'feedback' ? (
                        <div className="space-y-8">
                            <FeedbackSettingsTab />
                            <div className="border-t border-zinc-800 pt-8">
                                <h3 className="text-xl font-bold text-white mb-6">피드백 요청 목록</h3>
                                <FeedbackRequestsTab />
                            </div>
                        </div>
                    ) : activeTab === 'analytics' ? (
                        <div className="space-y-8">
                            <RevenueAnalyticsTab />
                            <div className="border-t border-zinc-800 pt-8">
                                <div className="flex items-center gap-1 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 w-fit mb-6">
                                    <button
                                        onClick={() => setActivePerformanceTab('courses')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activePerformanceTab === 'courses'
                                            ? 'bg-zinc-800 text-white shadow-md'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        클래스 성과
                                    </button>
                                    <button
                                        onClick={() => setActivePerformanceTab('routines')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activePerformanceTab === 'routines'
                                            ? 'bg-zinc-800 text-white shadow-md'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        루틴 성과
                                    </button>
                                    <button
                                        onClick={() => setActivePerformanceTab('sparring')}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activePerformanceTab === 'sparring'
                                            ? 'bg-zinc-800 text-white shadow-md'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        스파링 성과
                                    </button>
                                </div>
                                {activePerformanceTab === 'courses' && <CoursePerformanceTab />}
                                {activePerformanceTab === 'routines' && <RoutinePerformanceTab />}
                                {activePerformanceTab === 'sparring' && <SparringPerformanceTab />}
                            </div>
                        </div>
                    ) : (
                        <PayoutSettingsTab />
                    )}
                </div>
            </div>

            {/* Sparring Selection Modal */}
            {showSparringSelectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">공개할 스파링 영상 선택</h3>
                            <button onClick={() => {
                                setShowSparringSelectModal(false);
                                setModalSearchQuery('');
                            }} className="text-zinc-400 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-zinc-800">
                            <SearchInput
                                value={modalSearchQuery}
                                onChange={setModalSearchQuery}
                                placeholder="영상 제목으로 검색..."
                            />
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 space-y-2">
                            {sparringVideos
                                .filter(v => (v.price || 0) === 0)
                                .filter(v => v.title.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                                .length === 0 ? (
                                <div className="text-center py-10 text-zinc-500">
                                    <p>{modalSearchQuery ? '검색 결과가 없습니다.' : '공개 가능한(비공개) 스파링 영상이 없습니다.'}</p>
                                    <p className="text-sm mt-2">'내 자료' 탭에서 먼저 스파링 영상을 업로드해주세요.</p>
                                    <Button
                                        className="mt-4"
                                        variant="outline"
                                        onClick={() => {
                                            setShowSparringSelectModal(false);
                                            setActiveTab('materials');
                                        }}
                                    >
                                        내 자료 탭으로 이동
                                    </Button>
                                </div>
                            ) : (
                                sparringVideos
                                    .filter(v => (v.price || 0) === 0)
                                    .filter(v => v.title.toLowerCase().includes(modalSearchQuery.toLowerCase()))
                                    .map(video => (
                                        <div
                                            key={video.id}
                                            onClick={() => {
                                                setShowSparringSelectModal(false);
                                                setModalSearchQuery('');
                                                openSparringModal(video);
                                            }}
                                            className="flex items-center gap-4 p-3 rounded-lg border border-zinc-800 hover:bg-zinc-800 hover:border-violet-500 cursor-pointer transition-all"
                                        >
                                            <div className="w-24 h-16 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                                                {video.thumbnailUrl ? (
                                                    <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Clapperboard className="w-6 h-6 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-white">{video.title}</h4>
                                                <p className="text-sm text-zinc-400 line-clamp-1">{video.description || '설명 없음'}</p>
                                                <div className="text-xs text-zinc-500 mt-1">
                                                    {new Date(video.createdAt || '').toLocaleDateString()}
                                                </div>
                                            </div>
                                            <Button size="sm" variant="ghost">선택</Button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Content Modal */}
            <UnifiedContentModal
                isOpen={showContentModal}
                onClose={() => {
                    setShowContentModal(false);
                    setEditingContent(null);
                }}
                contentType={contentModalType}
                editingItem={editingContent}
                lessons={lessons}
                drills={drills}
                sparringVideos={sparringVideos}
                onSave={handleContentSave}
            />
        </div>
    );
};
