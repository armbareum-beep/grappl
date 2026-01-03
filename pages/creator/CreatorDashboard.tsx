import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { getCreatorCourses, calculateCreatorEarnings, getDrills, deleteDrill, getAllCreatorLessons, deleteLesson, getUserCreatedRoutines, deleteRoutine, getSparringVideos, deleteSparringVideo } from '../../lib/api';
import { Course, Drill, Lesson, DrillRoutine, SparringVideo } from '../../types';
import { MobileTabSelector } from '../../components/MobileTabSelector';
import { Button } from '../../components/Button';
import { BookOpen, DollarSign, Eye, TrendingUp, Package, MessageSquare, LayoutDashboard, PlayCircle, Grid, Trash2, Layers, Pencil, Clapperboard } from 'lucide-react';
import { MarketingTab } from '../../components/creator/MarketingTab';
import { FeedbackSettingsTab } from '../../components/creator/FeedbackSettingsTab';
import { FeedbackRequestsTab } from '../../components/creator/FeedbackRequestsTab';
import { RevenueAnalyticsTab } from '../../components/creator/RevenueAnalyticsTab';
import { CoursePerformanceTab } from '../../components/creator/CoursePerformanceTab';
import { PayoutSettingsTab } from '../../components/creator/PayoutSettingsTab';
import { LoadingScreen } from '../../components/LoadingScreen';
import { useDataControls, SearchInput, SortSelect, Pagination, SortOption } from '../../components/common/DataControls';

export const CreatorDashboard: React.FC = () => {
    const { user } = useAuth();
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

    // Sync tab state to URL
    useEffect(() => {
        setSearchParams({ tab: activeTab });
    }, [activeTab, setSearchParams]);

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

    const sparringControls = useDataControls<SparringVideo>({
        data: sparringVideos,
        searchKeys: ['title', 'description'],
        sortOptions: commonSortOptions,
        itemsPerPage: 5
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

            // Fetch data in parallel but handle errors individually to prevent waterfall failure
            const fetchCourses = getCreatorCourses(user.id).catch(err => {
                console.error('Failed to fetch courses:', err);
                return [];
            });
            const fetchDrills = getDrills(user.id).catch(err => {
                console.error('Failed to fetch drills:', err);
                return { data: [], error: err };
            });
            const fetchLessons = getAllCreatorLessons(user.id).catch(err => {
                console.error('Failed to fetch lessons:', err);
                return [];
            });
            const fetchRoutines = getUserCreatedRoutines(user.id).catch(err => {
                console.error('Failed to fetch routines:', err);
                return { data: [], error: err };
            });
            const fetchSparring = getSparringVideos(100, user.id).catch(err => {
                console.error('Failed to fetch sparring:', err);
                return { data: [], error: err };
            });
            const fetchEarnings = calculateCreatorEarnings(user.id).catch(err => {
                console.error('Failed to fetch earnings:', err);
                return { error: err };
            });

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
                    drills: drillsData?.data?.length,
                    sparring: sparringData?.data?.length,
                    earnings: earningsData
                });

                setCourses(coursesData || []);
                setDrills(drillsData?.data || []);
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

        // Polling for processing items
        const intervalId = setInterval(() => {
            // Check if we need to poll (if any active uploads or processing items exist)
            // For now, simpler to just poll sparring and drills if they have missing URLs
            // But to avoid slamming the server, we'll just re-fetch sparring and drills every 10s
            // properly we should check state but state is inside closure of previous render, 
            // so we rely on the fact that this effect runs once.
            // Actually, we need to inspect the *current* state to decide to poll, 
            // or just always poll every 10s while on this page. 
            // Let's do a lightweight focused fetch every 5s if we detect "processing" items in the last fetch.

            // To be safe and simple: just re-fetch sparring and drills every 10s while dashboard is active.
            // A more optimized approach would be to only fetch if `sparringVideos.some(v => !v.videoUrl)`

            if (user) {
                getSparringVideos(100, user.id).then(res => {
                    if (res.data) setSparringVideos(res.data);
                });
                getDrills(user.id).then(res => {
                    if (res.data) setDrills(res.data);
                });
            }
        }, 5000); // 5 seconds interval

        return () => clearInterval(intervalId);

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

        const { error } = await deleteSparringVideo(videoId);
        if (error) {
            alert('스파링 영상 삭제 중 오류가 발생했습니다.');
            return;
        }

        // Refresh list
        setSparringVideos(sparringVideos.filter(v => v.id !== videoId));
    };

    if (loading) {
        return <LoadingScreen message="크리에이터 대시보드를 불러오는 중..." />;
    }

    const totalViews = courses.reduce((sum, course) => sum + course.views, 0);

    const TABS = [
        { id: 'content', label: '내 콘텐츠', icon: LayoutDashboard },
        { id: 'materials', label: '재료 (레슨 & 드릴)', icon: Package },
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
                                <h3 className="text-sm font-medium text-zinc-400">개설 강좌</h3>
                                <BookOpen className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="text-2xl font-bold text-white">{courses.length}개</div>
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
                            {/* Courses Section */}
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-zinc-400" />
                                            내 강좌
                                        </h2>
                                        <p className="text-zinc-400 text-sm mt-1">학생들에게 판매할 강좌를 관리하세요</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                                        <SearchInput
                                            value={courseControls.searchQuery}
                                            onChange={courseControls.setSearchQuery}
                                            placeholder="강좌 검색..."
                                        />
                                        <SortSelect
                                            options={commonSortOptions}
                                            value={courseControls.currentSortValue}
                                            onChange={courseControls.setCurrentSortValue}
                                        />
                                        <Link to="/creator/courses/new">
                                            <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white">새 강좌 만들기</Button>
                                        </Link>
                                    </div>
                                </div>

                                {courseControls.filteredData.length === 0 ? (
                                    <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                        <BookOpen className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                        <p className="text-zinc-500 mb-4">
                                            {courses.length === 0 ? '아직 개설한 강좌가 없습니다.' : '검색 결과가 없습니다.'}
                                        </p>
                                        {courses.length === 0 && (
                                            <Link to="/creator/courses/new">
                                                <Button variant="outline">첫 강좌 만들기</Button>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 gap-4">
                                            {courseControls.paginatedData.map((course) => (
                                                <div key={course.id} className="group overflow-hidden bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-violet-500/30 hover:bg-zinc-900/60 transition-all">
                                                    <div className="p-4 flex flex-col sm:flex-row gap-4">
                                                        <div className="w-full sm:w-48 h-32 sm:h-28 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                                                            <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                        </div>

                                                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                                            <div>
                                                                <h3 className="font-bold text-lg text-white truncate group-hover:text-violet-400 transition-colors">{course.title}</h3>
                                                                <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{course.description}</p>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-4 text-sm text-zinc-400">
                                                                <span className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded">
                                                                    <BookOpen className="w-3.5 h-3.5" />
                                                                    {course.lessonCount || 0} 레슨
                                                                </span>
                                                                <span className="flex items-center gap-1.5 bg-zinc-800/50 px-2 py-1 rounded">
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                    {course.views.toLocaleString()}
                                                                </span>
                                                                <span className={cn("font-medium px-2 py-1 rounded", course.price === 0 ? "text-emerald-400 bg-emerald-500/10" : "text-violet-400 bg-violet-500/10")}>
                                                                    {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex sm:flex-col justify-end gap-2 mt-2 sm:mt-0">
                                                            <Link to={`/creator/courses/${course.id}/edit`}>
                                                                <Button variant="outline" size="sm" className="w-full border-zinc-700 hover:bg-zinc-800 text-zinc-300">
                                                                    관리
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-4">
                                            <Pagination
                                                currentPage={courseControls.currentPage}
                                                totalPages={courseControls.totalPages}
                                                onPageChange={courseControls.setCurrentPage}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="border-t border-zinc-800 my-8"></div>

                            {/* Routines Section */}
                            <div className="space-y-6">
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
                                        <Link to="/creator/create-routine">
                                            <Button className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white">새 루틴 만들기</Button>
                                        </Link>
                                    </div>
                                </div>

                                {routineControls.filteredData.length === 0 ? (
                                    <div className="text-center py-16 bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800">
                                        <Layers className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                                        <p className="text-zinc-500 mb-4">
                                            {routines.length === 0 ? '아직 개설한 루틴이 없습니다.' : '검색 결과가 없습니다.'}
                                        </p>
                                        {routines.length === 0 && (
                                            <Link to="/creator/create-routine">
                                                <Button variant="outline">첫 루틴 만들기</Button>
                                            </Link>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {routineControls.paginatedData.map((routine) => (
                                                <div key={routine.id} className="group bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden hover:border-violet-500/30 hover:bg-zinc-900/60 transition-all flex flex-col">
                                                    <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
                                                        {routine.thumbnailUrl ? (
                                                            <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                                <Layers className="w-8 h-8 text-zinc-600" />
                                                            </div>
                                                        )}
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
                                                        <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                                                            <span className="text-xs font-medium bg-black/50 text-white px-2 py-1 rounded backdrop-blur-sm border border-white/10">
                                                                {routine.drillCount || 0} 드릴
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="p-4 flex-1 flex flex-col">
                                                        <h3 className="font-bold text-white text-lg truncate mb-2 group-hover:text-violet-400 transition-colors">{routine.title}</h3>
                                                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                                                            <div className="text-sm text-zinc-400">
                                                                {routine.views.toLocaleString()} 조회
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <Link to={`/creator/routines/${routine.id}/edit`}>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                                                        <Pencil className="w-4 h-4" />
                                                                    </Button>
                                                                </Link>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                                                                    className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-4">
                                            <Pagination
                                                currentPage={routineControls.currentPage}
                                                totalPages={routineControls.totalPages}
                                                onPageChange={routineControls.setCurrentPage}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'materials' ? (
                        <div className="space-y-8">
                            {/* Lessons Section */}
                            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <PlayCircle className="w-5 h-5 text-zinc-400" />
                                            내 레슨
                                        </h2>
                                        <p className="text-zinc-400 text-sm mt-1">강좌를 구성하는 개별 레슨 영상</p>
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
                                    <div className="space-y-2">
                                        {lessonControls.paginatedData.map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group">
                                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                                    <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 group-hover:text-violet-400 transition-colors">
                                                        <PlayCircle className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-medium text-white truncate group-hover:text-violet-400 transition-colors">{lesson.title}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                            <span>{new Date(lesson.createdAt).toLocaleDateString()}</span>
                                                            {lesson.durationMinutes && <span>• {lesson.durationMinutes}분</span>}
                                                            {!lesson.vimeoUrl && <span className="text-amber-500">• 처리 중</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Link to={`/creator/lessons/${lesson.id}/edit`}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteLesson(lesson.id, lesson.title)} className="h-8 w-8 hover:text-red-400">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <Pagination
                                            currentPage={lessonControls.currentPage}
                                            totalPages={lessonControls.totalPages}
                                            onPageChange={lessonControls.setCurrentPage}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Drills Section */}
                            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 p-6">
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

                                <div className="space-y-2">
                                    {drillControls.paginatedData.map((drill) => (
                                        <div key={drill.id} className="flex items-center justify-between p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors group">
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 text-zinc-500 group-hover:text-violet-400 transition-colors">
                                                    <Grid className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-medium text-white truncate group-hover:text-violet-400 transition-colors">{drill.title}</h3>
                                                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                        <span>{new Date(drill.createdAt).toLocaleDateString()}</span>
                                                        <span>• {drill.views.toLocaleString()} 조회</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link to={`/creator/drills/${drill.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button variant="ghost" size="icon" onClick={() => handleDeleteDrill(drill.id, drill.title)} className="h-8 w-8 hover:text-red-400">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {drillControls.filteredData.length === 0 && (
                                        <div className="text-center py-8 text-zinc-500 text-sm">드릴이 없습니다.</div>
                                    )}
                                    <Pagination
                                        currentPage={drillControls.currentPage}
                                        totalPages={drillControls.totalPages}
                                        onPageChange={drillControls.setCurrentPage}
                                    />
                                </div>
                            </div>

                            {/* Sparring Section */}
                            <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 p-6">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Clapperboard className="w-5 h-5 text-zinc-400" />
                                            내 스파링
                                        </h2>
                                        <p className="text-zinc-400 text-sm mt-1">스파링 하이라이트 영상</p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <SearchInput
                                            value={sparringControls.searchQuery}
                                            onChange={sparringControls.setSearchQuery}
                                            placeholder="스파링 검색..."
                                        />
                                        <Link to="/creator/sparring/new">
                                            <Button size="sm" className="bg-zinc-100 text-zinc-900 hover:bg-zinc-200">새 스파링 업로드</Button>
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {sparringControls.paginatedData.map((video) => {
                                        const isError = video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error');
                                        const isProcessing = !video.videoUrl || (!isError && !video.thumbnailUrl);

                                        return (
                                            <div key={video.id} className="group overflow-hidden bg-zinc-900/50 border border-zinc-800 rounded-lg hover:border-zinc-700 hover:bg-zinc-900 transition-all">
                                                <div className="aspect-video w-full bg-zinc-800 relative">
                                                    {video.thumbnailUrl && !isProcessing && !isError ? (
                                                        <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                            {isProcessing ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-500"></div> : <Clapperboard className="w-8 h-8" />}
                                                        </div>
                                                    )}
                                                    <div className="absolute top-2 right-2">
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleDeleteSparringVideo(video.id, video.title)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="p-3">
                                                    <h3 className="text-sm font-medium text-white truncate" title={video.title}>{video.title}</h3>
                                                    <div className="flex justify-between items-center mt-2 text-xs text-zinc-500">
                                                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                                                        <span>{video.views?.toLocaleString()} 조회</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                {sparringControls.filteredData.length === 0 && (
                                    <div className="text-center py-8 text-zinc-500 text-sm">스파링 영상이 없습니다.</div>
                                )}
                                <div className="mt-4">
                                    <Pagination
                                        currentPage={sparringControls.currentPage}
                                        totalPages={sparringControls.totalPages}
                                        onPageChange={sparringControls.setCurrentPage}
                                    />
                                </div>
                            </div>
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
                                <h3 className="text-xl font-bold text-white mb-6">강좌별 성과</h3>
                                <CoursePerformanceTab />
                            </div>
                        </div>
                    ) : (
                        <PayoutSettingsTab />
                    )}
                </div>
            </div>
        </div>
    );
};
