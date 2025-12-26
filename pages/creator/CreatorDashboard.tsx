import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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

    }, [user]); // Keeping dependency array minimal to avoid loops

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
        <div className="min-h-screen bg-slate-950 text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">총 조회수</h3>
                            <Eye className="w-5 h-5 text-blue-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{totalViews.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">총 수익</h3>
                            <DollarSign className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">
                            ₩{earnings?.totalRevenue?.toLocaleString() || '0'}
                        </p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-400 text-sm font-medium">개설 강좌</h3>
                            <BookOpen className="w-5 h-5 text-purple-400" />
                        </div>
                        <p className="text-3xl font-bold text-white">{courses.length}개</p>
                    </div>
                </div>

                {/* Tab Navigation - Desktop */}
                <div className="hidden md:flex space-x-4 border-b border-slate-800 mb-8 overflow-x-auto scrollbar-hide">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                    ? 'text-blue-400 border-b-2 border-blue-400'
                                    : 'text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Navigation - Mobile Dropdown */}
                <MobileTabSelector
                    tabs={TABS}
                    activeTab={activeTab}
                    onTabChange={(id) => setActiveTab(id as any)}
                />

                {/* Tab Content */}
                {activeTab === 'content' ? (
                    <div className="space-y-8">
                        {/* Courses Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 강좌</h2>
                                    <p className="text-slate-400 text-sm mt-1">학생들에게 판매할 강좌를 관리하세요</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
                                        <Button>새 강좌 만들기</Button>
                                    </Link>
                                </div>
                            </div>

                            {courseControls.filteredData.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <BookOpen className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">
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
                                            <div key={course.id} className="border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all bg-slate-800/50">
                                                <div className="p-4 flex items-center gap-4">
                                                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                                                        <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover" />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-lg text-white truncate">{course.title}</h3>
                                                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 whitespace-nowrap flex-wrap">
                                                            <span className="flex items-center gap-1">
                                                                <BookOpen className="w-4 h-4" />
                                                                {course.lessonCount || 0} 레슨
                                                            </span>
                                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                            <span className="flex items-center gap-1">
                                                                <Eye className="w-4 h-4" />
                                                                {course.views.toLocaleString()} 조회
                                                            </span>
                                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                            <span className="text-blue-400 font-medium">
                                                                {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <Link to={`/creator/courses/${course.id}/edit`}>
                                                        <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-700">관리</Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={courseControls.currentPage}
                                        totalPages={courseControls.totalPages}
                                        onPageChange={courseControls.setCurrentPage}
                                    />
                                </>
                            )}
                        </div>

                        {/* Routines Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 루틴</h2>
                                    <p className="text-slate-400 text-sm mt-1">드릴을 조합한 훈련 루틴을 관리하세요</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
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
                                        <Button>새 루틴 만들기</Button>
                                    </Link>
                                </div>
                            </div>

                            {routineControls.filteredData.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <Layers className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">
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
                                    <div className="grid grid-cols-1 gap-4">
                                        {routineControls.paginatedData.map((routine) => (
                                            <div key={routine.id} className="border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all bg-slate-800/50">
                                                <div className="p-4 flex items-center gap-4">
                                                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 relative group">
                                                        {routine.thumbnailUrl ? (
                                                            <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                                <Layers className="w-8 h-8 text-slate-600" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-lg text-white truncate">{routine.title}</h3>
                                                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 whitespace-nowrap flex-wrap">
                                                            <span className="flex items-center gap-1">
                                                                <Grid className="w-4 h-4" />
                                                                {routine.drillCount || 0} 드릴
                                                            </span>
                                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                            <span className="flex items-center gap-1">
                                                                <Eye className="w-4 h-4" />
                                                                {routine.views.toLocaleString()} 조회
                                                            </span>
                                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                            <span className="text-blue-400 font-medium">
                                                                {routine.price === 0 ? '무료' : `₩${routine.price.toLocaleString()}`}
                                                            </span>


                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <Link to={`/creator/routines/${routine.id}/edit`}>
                                                                <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-700">관리</Button>
                                                            </Link>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteRoutine(routine.id, routine.title)}
                                                                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={routineControls.currentPage}
                                        totalPages={routineControls.totalPages}
                                        onPageChange={routineControls.setCurrentPage}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'materials' ? (
                    <div className="space-y-8">
                        {/* Lessons Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 레슨</h2>
                                    <p className="text-slate-400 text-sm mt-1">강좌를 구성하는 개별 레슨 영상입니다</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <SearchInput
                                        value={lessonControls.searchQuery}
                                        onChange={lessonControls.setSearchQuery}
                                        placeholder="레슨 검색..."
                                    />
                                    <SortSelect
                                        options={commonSortOptions}
                                        value={lessonControls.currentSortValue}
                                        onChange={lessonControls.setCurrentSortValue}
                                    />
                                    <Link to="/creator/lessons/new">
                                        <Button>새 레슨 업로드</Button>
                                    </Link>
                                </div>
                            </div>

                            {lessonControls.filteredData.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <PlayCircle className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">
                                        {lessons.length === 0 ? '아직 업로드한 레슨이 없습니다.' : '검색 결과가 없습니다.'}
                                    </p>
                                    {lessons.length === 0 && (
                                        <Link to="/creator/lessons/new">
                                            <Button variant="outline">첫 레슨 업로드</Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-800 overflow-hidden">
                                        {lessonControls.paginatedData.map((lesson, index) => (
                                            <div
                                                key={lesson.id}
                                                className={`flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors group ${index !== lessonControls.paginatedData.length - 1 ? 'border-b border-slate-800' : ''
                                                    }`}
                                            >
                                                {lesson.vimeoUrl ? (
                                                    <Link to={`/lessons/${lesson.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                                                        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors text-slate-500">
                                                            <PlayCircle className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                                                {lesson.title}
                                                            </h3>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                                <span>{new Date(lesson.createdAt).toLocaleDateString()}</span>
                                                                <span>&bull;</span>
                                                                <span>{lesson.length || (lesson.durationMinutes ? `${lesson.durationMinutes}분` : '0:00')}</span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-not-allowed opacity-60">
                                                        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
                                                            <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-medium text-white truncate">
                                                                {lesson.title}
                                                            </h3>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                                <span>{new Date(lesson.createdAt).toLocaleDateString()}</span>
                                                                <span>&bull;</span>
                                                                <span className="text-yellow-500">처리 중...</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 ml-4">
                                                    <div className="text-sm text-slate-400 w-16 text-right hidden sm:block">
                                                        {lesson.views?.toLocaleString() || 0} 조회
                                                    </div>
                                                    <Link
                                                        to={`/creator/lessons/${lesson.id}/edit`}
                                                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="수정"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDeleteLesson(lesson.id, lesson.title);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={lessonControls.currentPage}
                                        totalPages={lessonControls.totalPages}
                                        onPageChange={lessonControls.setCurrentPage}
                                    />
                                </>
                            )}
                        </div>

                        {/* Drills Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 드릴</h2>
                                    <p className="text-slate-400 text-sm mt-1">루틴을 구성하는 짧은 훈련 영상입니다</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <SearchInput
                                        value={drillControls.searchQuery}
                                        onChange={drillControls.setSearchQuery}
                                        placeholder="드릴 검색..."
                                    />
                                    <SortSelect
                                        options={commonSortOptions}
                                        value={drillControls.currentSortValue}
                                        onChange={drillControls.setCurrentSortValue}
                                    />
                                    <Link to="/creator/drills/new">
                                        <Button>새 드릴 업로드</Button>
                                    </Link>
                                </div>
                            </div>

                            {drillControls.filteredData.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <Grid className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">
                                        {drills.length === 0 ? '아직 업로드한 드릴이 없습니다.' : '검색 결과가 없습니다.'}
                                    </p>
                                    {drills.length === 0 && (
                                        <Link to="/creator/drills/new">
                                            <Button variant="outline">첫 드릴 업로드</Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="bg-slate-800/30 rounded-lg border border-slate-800 overflow-hidden">
                                        {drillControls.paginatedData.map((drill, index) => (
                                            <div
                                                key={drill.id}
                                                className={`flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors group ${index !== drillControls.paginatedData.length - 1 ? 'border-b border-slate-800' : ''
                                                    }`}
                                            >
                                                {((drill.vimeoUrl && (/^\d+$/.test(drill.vimeoUrl) || /vimeo\.com\/(?:video\/)?(\d+)/.test(drill.vimeoUrl))) || (drill.videoUrl && !drill.videoUrl.includes('placeholder') && !drill.videoUrl.includes('placehold.co'))) ? (
                                                    <Link
                                                        to={`/drills/${drill.id}`}
                                                        className="flex items-center gap-4 flex-1 min-w-0 group"
                                                    >
                                                        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors text-slate-500">
                                                            <PlayCircle className="w-5 h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-medium text-white truncate group-hover:text-blue-400 transition-colors">
                                                                {drill.title}
                                                            </h3>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                                <span>{new Date(drill.createdAt).toLocaleDateString()}</span>
                                                                <span>&bull;</span>
                                                                <span>{drill.length || (drill.durationMinutes ? `${drill.durationMinutes}분` : '0:00')}</span>
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ) : (
                                                    <div className="flex items-center gap-4 flex-1 min-w-0 cursor-not-allowed opacity-60">
                                                        <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-500">
                                                            <div className="w-5 h-5 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-medium text-white truncate">
                                                                {drill.title}
                                                            </h3>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                                                <span>{new Date(drill.createdAt).toLocaleDateString()}</span>
                                                                <span>&bull;</span>
                                                                <span className="text-yellow-500">처리 중...</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-4 ml-4">
                                                    <div className="text-sm text-slate-400 w-20 text-right hidden sm:block">
                                                        {drill.views.toLocaleString()} 조회
                                                    </div>
                                                    <Link
                                                        to={`/creator/drills/${drill.id}/edit`}
                                                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="수정"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            handleDeleteDrill(drill.id, drill.title);
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                        title="삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={drillControls.currentPage}
                                        totalPages={drillControls.totalPages}
                                        onPageChange={drillControls.setCurrentPage}
                                    />
                                </>
                            )}
                        </div>

                        {/* Sparring Section */}
                        <div className="bg-slate-900 rounded-xl shadow-sm border border-slate-800 p-6">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">내 스파링</h2>
                                    <p className="text-slate-400 text-sm mt-1">짧은 스파링 하이라이트 영상 (재료)</p>
                                </div>
                                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                                    <SearchInput
                                        value={sparringControls.searchQuery}
                                        onChange={sparringControls.setSearchQuery}
                                        placeholder="스파링 검색..."
                                    />
                                    <SortSelect
                                        options={commonSortOptions}
                                        value={sparringControls.currentSortValue}
                                        onChange={sparringControls.setCurrentSortValue}
                                    />
                                    <Link to="/creator/sparring/new">
                                        <Button>새 스파링 업로드</Button>
                                    </Link>
                                </div>
                            </div>

                            {sparringControls.filteredData.length === 0 ? (
                                <div className="text-center py-12 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                                    <Clapperboard className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                    <p className="text-slate-500 mb-4">
                                        {sparringVideos.length === 0 ? '아직 업로드한 스파링 영상이 없습니다.' : '검색 결과가 없습니다.'}
                                    </p>
                                    {sparringVideos.length === 0 && (
                                        <Link to="/creator/sparring/new">
                                            <Button variant="outline">첫 스파링 업로드</Button>
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 gap-4">
                                        {sparringControls.paginatedData.map((video) => (
                                            <div key={video.id} className="border border-slate-800 rounded-lg overflow-hidden hover:border-blue-500/50 transition-all bg-slate-800/50">
                                                <div className="p-4 flex items-center gap-4">
                                                    {video.videoUrl ? (
                                                        <>
                                                            <div className="w-20 h-32 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0 relative group">
                                                                {video.thumbnailUrl ? (
                                                                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                                        <Clapperboard className="w-8 h-8 text-slate-600" />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 min-w-0">
                                                                <h3 className="font-bold text-lg text-white truncate">{video.title}</h3>
                                                                <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 whitespace-nowrap flex-wrap">
                                                                    <span className="flex items-center gap-1">
                                                                        <Eye className="w-4 h-4" />
                                                                        {video.views?.toLocaleString() || 0} 조회
                                                                    </span>
                                                                    <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                                                    <span className="text-slate-400">
                                                                        {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : '-'}
                                                                    </span>
                                                                </div>
                                                                {video.relatedItems && video.relatedItems.length > 0 && (
                                                                    <div className="mt-2 text-xs text-blue-400">
                                                                        연관 기술 {video.relatedItems.length}개 태그됨
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-20 h-32 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center text-slate-500">
                                                                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                                                            </div>

                                                            <div className="flex-1 min-w-0 opacity-60">
                                                                <h3 className="font-bold text-lg text-white truncate">{video.title}</h3>
                                                                <div className="flex items-center gap-2 mt-2 text-sm text-slate-400">
                                                                    <span className="text-yellow-500 font-medium">처리 중...</span>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDeleteSparringVideo(video.id, video.title)}
                                                            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Pagination
                                        currentPage={sparringControls.currentPage}
                                        totalPages={sparringControls.totalPages}
                                        onPageChange={sparringControls.setCurrentPage}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'marketing' ? (
                    <MarketingTab />
                ) : activeTab === 'feedback' ? (
                    <div className="space-y-8">
                        <FeedbackSettingsTab />
                        <div className="border-t border-slate-800 pt-8">
                            <h3 className="text-xl font-bold text-white mb-6">피드백 요청 목록</h3>
                            <FeedbackRequestsTab />
                        </div>
                    </div>
                ) : activeTab === 'analytics' ? (
                    <div className="space-y-8">
                        <RevenueAnalyticsTab />
                        <div className="border-t border-slate-800 pt-8">
                            <h3 className="text-xl font-bold text-white mb-6">강좌별 성과</h3>
                            <CoursePerformanceTab />
                        </div>
                    </div>
                ) : (
                    <PayoutSettingsTab />
                )}
            </div>
        </div >
    );
};
