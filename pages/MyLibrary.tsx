import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getUserCourses,
  getCourseProgress,
  getUserRoutines,
  getSavedSparringVideos,
  getUserSavedDrills,
  getUserSavedCourses,
  getUserSavedRoutines,
  getUserSavedLessons,
  getCreatorCourses,
  getCourses,
  getPurchasedSparringVideos,
  toggleLessonSave,
  toggleDrillSave
} from '../lib/api';
import { listUserSkillTrees } from '../lib/api-skill-tree';
import { Course, DrillRoutine, SparringVideo, UserSkillTree, Drill, Lesson } from '../types';
import { CourseCard } from '../components/CourseCard';
import { DrillRoutineCard } from '../components/DrillRoutineCard';
import { SparringCard } from '../components/SparringCard';
import { useAuth } from '../contexts/AuthContext';
import { PlayCircle, Dumbbell, Network, Bookmark } from 'lucide-react';
import { Button } from '../components/Button';


import { ErrorScreen } from '../components/ErrorScreen';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ContentBadge } from '../components/common/ContentBadge';
import { LoadingScreen } from '../components/LoadingScreen'; // Assuming LoadingScreen is in components
import { cn } from '../lib/utils'; // Assuming cn utility is in lib/utils

interface CourseWithProgress extends Course {
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
}

export const MyLibrary: React.FC = () => {
  const { user, isCreator, isSubscribed } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons' | 'routines' | 'drills' | 'sparring' | 'chains' | 'training_routines'>('courses');

  // Courses State
  const [myCourses, setMyCourses] = useState<CourseWithProgress[]>([]);
  const [exploreCourses, setExploreCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Chains State
  const [chains, setChains] = useState<UserSkillTree[]>([]);
  const [chainsLoading, setChainsLoading] = useState(true);

  // Routines State
  const [allRoutines, setAllRoutines] = useState<DrillRoutine[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, DrillRoutine[]>>({});
  const [routinesLoading, setRoutinesLoading] = useState(true);

  // Drills State
  const [savedDrills, setSavedDrills] = useState<Drill[]>([]);
  const [drillsLoading, setDrillsLoading] = useState(true);

  // Sparring State
  const [mySparring, setMySparring] = useState<SparringVideo[]>([]);
  const [sparringLoading, setSparringLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [savedLessons, setSavedLessons] = useState<Lesson[]>([]);

  // IDs for Access Checking
  const [ownedCourseIds, setOwnedCourseIds] = useState<Set<string>>(new Set());
  const [ownedSparringIds, setOwnedSparringIds] = useState<Set<string>>(new Set());

  // Combined loading state for initial fetch
  const loading = coursesLoading || routinesLoading || drillsLoading || sparringLoading || chainsLoading;

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setCoursesLoading(false);
        setRoutinesLoading(false);
        setSparringLoading(false);
        setChainsLoading(false);
        setDrillsLoading(false);
        return;
      }

      // Fetch Courses & Saved Items
      try {
        setError(null);
        setCoursesLoading(true);
        setRoutinesLoading(true);
        setSparringLoading(true);
        setChainsLoading(true);
        setDrillsLoading(true);

        const [allCoursesData, ownedCoursesData, savedCoursesData, savedLessonsData, creatorCoursesData] = await Promise.all([
          getCourses(),
          getUserCourses(user.id),
          getUserSavedCourses(user.id),
          getUserSavedLessons(user.id),
          getCreatorCourses(user.id)
        ]);

        setExploreCourses(allCoursesData || []);
        setSavedLessons(savedLessonsData);

        // Store Owned IDs for Access Check
        const ownedIds = new Set(ownedCoursesData.map((c: any) => c.id));
        if (creatorCoursesData) {
          creatorCoursesData.forEach((c: any) => ownedIds.add(c.id));
        }
        setOwnedCourseIds(ownedIds);

        // Combine for My Courses Display
        // Priority: Owned/Created -> Saved
        const courseMap = new Map<string, CourseWithProgress>();

        // 1. Add Owned/Created
        const combinedOwned = [...ownedCoursesData];
        if (creatorCoursesData && creatorCoursesData.length > 0) {
          creatorCoursesData.forEach((c: Course) => {
            if (!combinedOwned.some(owned => owned.id === c.id)) {
              combinedOwned.push(c);
            }
          });
        }

        // Fetch progress for owned
        const ownedWithProgress = await Promise.all(
          combinedOwned.map(async (course) => {
            const progressData = await getCourseProgress(user.id, course.id);
            return {
              ...course,
              progress: progressData.percentage,
              completedLessons: progressData.completed,
              totalLessons: progressData.total
            };
          })
        );

        ownedWithProgress.forEach(c => courseMap.set(c.id, c));

        // 2. Add Saved (if not already present)
        // For saved, we might not fetch detailed progress immediately, or we can. 
        // Let's assume saved also needs progress if we want to show it, or default 0.
        // For simplicity, we fetch progress for unique saved courses too.
        const newSaved = savedCoursesData.filter((c: Course) => !courseMap.has(c.id));

        const savedWithProgress = await Promise.all(
          newSaved.map(async (course: Course) => {
            const progressData = await getCourseProgress(user.id, course.id);
            return {
              ...course,
              progress: progressData.percentage,
              completedLessons: progressData.completed,
              totalLessons: progressData.total
            };
          })
        );

        savedWithProgress.forEach((c: any) => courseMap.set(c.id, c));

        setMyCourses(Array.from(courseMap.values()));

      } catch (error) {
        console.error('Error fetching user courses:', error);
        setError('클래스를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setCoursesLoading(false);
      }

      // Fetch Routines & Weekly Schedule
      try {
        const [routinesData, savedRoutinesData] = await Promise.all([
          getUserRoutines(user.id),
          getUserSavedRoutines(user.id)
        ]);

        let pRoutines: DrillRoutine[] = [];
        if (routinesData.data) {
          pRoutines = routinesData.data;
        }

        // Load Custom Routines from LocalStorage
        let customRoutines: DrillRoutine[] = [];
        try {
          const stored = localStorage.getItem('my_custom_routines');
          if (stored) {
            customRoutines = JSON.parse(stored);
          }
        } catch (e) {
          console.error("Failed to load custom routines", e);
        }

        // Merge All Routines (Purchased + Saved + Custom)
        // Deduplicate by ID
        const routineMap = new Map<string, DrillRoutine>();

        [...pRoutines, ...savedRoutinesData, ...customRoutines].forEach(r => {
          if (!routineMap.has(r.id)) {
            routineMap.set(r.id, r);
          }
        });

        setAllRoutines(Array.from(routineMap.values()));

        // Load Weekly Schedule
        try {
          const schedule = localStorage.getItem('weekly_routine_schedule');
          if (schedule) {
            setWeeklySchedule(JSON.parse(schedule));
          } else {
            setWeeklySchedule({});
          }
        } catch (e) {
          console.error("Failed to load weekly schedule", e);
          setWeeklySchedule({});
        }

      } catch (err: any) {
        console.error('Error fetching user routines:', err);
        setError('루틴을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setRoutinesLoading(false);
      }

      // Fetch Drills
      try {
        const drillsData = await getUserSavedDrills(user.id);
        setSavedDrills(drillsData);
      } catch (err) {
        console.error('Error fetching saved drills:', err);
        setError('드릴을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setDrillsLoading(false);
      }

      // Fetch Sparring
      try {
        const [savedSparringData, purchasedSparringData] = await Promise.all([
          getSavedSparringVideos(user.id),
          getPurchasedSparringVideos(user.id)
        ]);

        // Owned IDs
        const ownedSparring = new Set(purchasedSparringData.map((v: any) => v.id));
        setOwnedSparringIds(ownedSparring);

        // Merge Sparring
        const sparringMap = new Map<string, SparringVideo>();

        // Purchased first
        purchasedSparringData.forEach((v: any) => sparringMap.set(v.id, v));
        // Saved next
        savedSparringData.forEach((v: any) => {
          if (!sparringMap.has(v.id)) {
            sparringMap.set(v.id, v);
          }
        });

        setMySparring(Array.from(sparringMap.values()));
      } catch (err) {
        console.error('Error fetching saved sparring:', err);
        setError('스파링 영상을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setSparringLoading(false);
      }


      // Fetch Chains
      try {
        const { data: chainsData, error: chainsError } = await listUserSkillTrees(user.id);
        if (chainsError) {
          console.error('Error fetching chains:', chainsError);
          setError('로드맵을 불러오는 중 오류가 발생했습니다.');
        } else {
          setChains(chainsData || []);
        }
      } catch (err) {
        console.error('Error fetching chains:', err);
        setError('로드맵을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setChainsLoading(false);
      }
    }

    fetchData();
  }, [user, isCreator]);

  // TOP 3 Logic Helper (Consistent with Global Ranks - Hot Score)
  const getRank = (item: any, list: any[]) => {
    if (!list || list.length === 0) return undefined;
    const now = Date.now();
    const getHotScore = (i: any) => {
      const views = i.views || 0;
      const createdDate = i.createdAt ? new Date(i.createdAt).getTime() : now;
      const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
      return views / Math.pow(hoursSinceCreation + 2, 1.5);
    };

    const sortedByHot = [...list]
      .filter(i => (i.views || 0) >= 5)
      .sort((a, b) => getHotScore(b) - getHotScore(a));

    const index = sortedByHot.findIndex(i => i.id === item.id);
    return (index >= 0 && index < 3) ? index + 1 : undefined;
  };

  const isRecent = (dateStr?: string) => {
    if (!dateStr) return false;
    return new Date(dateStr).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000);
  };

  if (error) {
    return <ErrorScreen error={error} resetMessage="라이브러리를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
  }

  if (loading) {
    return (
      <div className={cn(
        "min-h-screen bg-zinc-950 text-white",
      )}>
        <LoadingScreen message="보관함을 불러오고 있습니다..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">로그인이 필요합니다</h2>
          <p className="text-zinc-400 mb-6">내 라이브러리를 보려면 로그인하세요.</p>
          <Link
            to="/login"
            className="inline-block bg-violet-600 text-white px-6 py-3 rounded-lg hover:bg-violet-700 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 min-h-screen">
      <div className="relative bg-gradient-to-b from-zinc-900 to-zinc-950 text-white py-12 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Bookmark className="w-6 h-6 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">저장됨</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            저장한 콘텐츠와 구매 목록을 확인하세요
          </p>

        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'courses' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Classes ({myCourses.length})
          </button>
          <button
            onClick={() => setActiveTab('lessons')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'lessons' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Lessons ({savedLessons.length})
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'routines' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Routines ({allRoutines.length})
          </button>
          <button
            onClick={() => setActiveTab('drills')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'drills' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Drills ({savedDrills.length})
          </button>
          <button
            onClick={() => setActiveTab('sparring')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'sparring' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Sparring ({mySparring.length})
          </button>
          <button
            onClick={() => setActiveTab('training_routines')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'training_routines' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Training Routines
          </button>
          <button
            onClick={() => setActiveTab('chains')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'chains' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            Roadmap ({chains.length})
          </button>
        </div>

        {activeTab === 'courses' && (
          <div className="space-y-12">
            {coursesLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
                <p className="text-zinc-400">클래스 불러오는 중...</p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* My Classes (Purchased + Saved) */}
                {myCourses.length > 0 ? (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      My Classes <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{myCourses.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myCourses.map((course) => (
                        <div key={course.id} className="relative flex flex-col h-full">
                          <CourseCard
                            course={course}
                            rank={getRank(course, myCourses)}
                            hasAccess={isSubscribed || ownedCourseIds.has(course.id)}
                          />
                          {/* Progress Removed */}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                    <p className="text-zinc-400 mb-4">저장하거나 수강 중인 클래스가 없습니다.</p>
                  </div>
                )}

                {/* Explore More Classes (Excluding My Courses) */}
                {exploreCourses.filter(ac => !myCourses.some(mc => mc.id === ac.id)).length > 0 && (
                  <div>
                    <div className="flex justify-between items-end mb-6">
                      <h3 className="text-lg font-bold text-white">Explore All Classes</h3>
                      {isSubscribed && (
                        <span className="text-xs text-violet-400 font-bold bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
                          ✨ 구독 중: 모든 클래스 시청 가능
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {exploreCourses
                        .filter(ac => !myCourses.some(mc => mc.id === ac.id))
                        .map((course) => (
                          <CourseCard
                            key={course.id}
                            course={course}
                            rank={getRank(course, exploreCourses)}
                            hasAccess={isSubscribed || ownedCourseIds.has(course.id)}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Routines View - Merged Purchased & Saved */}
        {
          activeTab === 'routines' && (
            <div className="space-y-12">
              <div>
                {routinesLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-zinc-400">루틴 불러오는 중...</p>
                  </div>
                ) : allRoutines.length === 0 ? (
                  <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                    <p className="text-zinc-400 mb-4">저장하거나 구매한 루틴이 없습니다.</p>
                    <Link to="/routines">
                      <Button variant="primary">
                        루틴 찾아보기
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-6">My Routines ({allRoutines.length})</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {allRoutines.map((routine) => (
                          <DrillRoutineCard
                            key={routine.id}
                            routine={routine}
                            rank={getRank(routine, allRoutines)}
                            hasAccess={true}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }

        {/* Training Routines View - Weekly Schedule */}
        {activeTab === 'training_routines' && (
          <div className="space-y-12">
            {Object.keys(weeklySchedule).length === 0 || !Object.values(weeklySchedule).some(day => day.length > 0) ? (
              <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                <p className="text-zinc-400 mb-4">등록된 주간 훈련 스케줄이 없습니다.</p>
                <div className="flex justify-center gap-4">
                  <Link to="/training-routines">
                    <Button variant="primary">
                      스케줄 생성하기
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">My Weekly Routine</h3>
                  <Link to="/my-schedule">
                    <Button variant="outline" size="sm">
                      스케줄 전체보기
                    </Button>
                  </Link>
                </div>
                {['월', '화', '수', '목', '금', '토', '일'].map(day => {
                  const dayRoutines = weeklySchedule[day] || [];
                  if (dayRoutines.length === 0) return null;

                  return (
                    <div key={day} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-500/20">
                          {day}
                        </span>
                        <h4 className="font-bold text-zinc-200">{day}요일 훈련</h4>
                        <span className="text-xs text-zinc-500 ml-auto">{dayRoutines.length} routines</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dayRoutines.map((routine, idx) => {
                          const linkPath = String(routine.id).startsWith('custom-')
                            ? `/my-routines/${routine.id}`
                            : `/routines/${routine.id}`;

                          return (
                            <Link
                              key={`${day}-${routine.id}-${idx}`}
                              to={linkPath}
                              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 transition-colors"
                            >
                              <div className="w-12 h-12 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                                <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="min-w-0">
                                <h5 className="font-medium text-sm text-zinc-200 truncate">{routine.title}</h5>
                                <p className="text-xs text-zinc-500">{routine.totalDurationMinutes}분 • {(routine.views || 0).toLocaleString()} 조회수</p>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {
          activeTab === 'lessons' && (
            <div className="space-y-12">
              {coursesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-zinc-400">레슨 불러오는 중...</p>
                </div>
              ) : savedLessons.length === 0 ? (
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                  <p className="text-zinc-400 mb-4">저장된 레슨이 없습니다.</p>
                  <Link to="/watch">
                    <Button variant="primary">
                      레슨 둘러보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedLessons.map((lesson) => (
                    <div key={lesson.id} className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
                      <Link to={`/watch?lessonId=${lesson.id}`} className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800 group-hover:border-violet-500 transition-all">
                        <img src={lesson.thumbnailUrl} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                          <PlayCircle className="w-10 h-10 text-white" />
                        </div>
                        {/* Delete Button */}
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('이 레슨을 저장 목록에서 삭제하시겠습니까?')) {
                              try {
                                await toggleLessonSave(user?.id || '', lesson.id);
                                setSavedLessons(prev => prev.filter(l => l.id !== lesson.id));
                              } catch (err) {
                                console.error('Failed to remove lesson', err);
                                alert('삭제에 실패했습니다.');
                              }
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-400 hover:text-red-400 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 z-20"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                        {getRank(lesson, savedLessons) ? (
                          <ContentBadge type="popular" rank={getRank(lesson, savedLessons)} className="absolute top-2 right-2" />
                        ) : isRecent(lesson.createdAt) ? (
                          <ContentBadge type="recent" className="absolute top-2 right-2" />
                        ) : null}
                      </Link>
                      <div className="px-1">
                        <h4 className="text-white font-bold text-sm line-clamp-1 mb-1 group-hover:text-violet-400 transition-colors uppercase">{lesson.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        {
          activeTab === 'drills' && (
            <div className="space-y-12">
              {drillsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-zinc-400">드릴 불러오는 중...</p>
                </div>
              ) : savedDrills.length === 0 ? (
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                  <p className="text-zinc-400 mb-4">저장된 드릴이 없습니다.</p>
                  <Link to="/watch">
                    <Button variant="primary">
                      드릴 둘러보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {savedDrills.map((drill) => (
                    <div key={drill.id} className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
                      <Link to={`/watch?id=${drill.id}`} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800 group-hover:border-violet-500 transition-all">
                        <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                          <PlayCircle className="w-10 h-10 text-white" />
                        </div>
                        {/* Delete Button */}
                        <button
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (confirm('이 드릴을 저장 목록에서 삭제하시겠습니까?')) {
                              try {
                                await toggleDrillSave(user?.id || '', drill.id);
                                setSavedDrills(prev => prev.filter(d => d.id !== drill.id));
                              } catch (err) {
                                console.error('Failed to remove drill', err);
                                alert('삭제에 실패했습니다.');
                              }
                            }
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-zinc-400 hover:text-red-400 hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 z-20"
                        >
                          <Bookmark className="w-4 h-4 fill-current" />
                        </button>
                        {getRank(drill, savedDrills) ? (
                          <ContentBadge type="popular" rank={getRank(drill, savedDrills)} className="absolute top-2 right-2" />
                        ) : isRecent(drill.createdAt) ? (
                          <ContentBadge type="recent" className="absolute top-2 right-2" />
                        ) : null}
                      </Link>
                      <div className="px-1">
                        <h4 className="text-white font-bold text-sm line-clamp-1 mb-1 group-hover:text-violet-400 transition-colors uppercase">{drill.title}</h4>
                        <p className="text-[10px] text-zinc-500 font-medium">{drill.creatorName || 'Unknown'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }

        {activeTab === 'sparring' && (
          <div className="space-y-12">
            {/* Merged Sparring (Purchased + Saved) */}
            {mySparring.length > 0 ? (
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Dumbbell className="w-6 h-6 text-violet-500" />
                  My Sparring
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {mySparring.map((video) => (
                    <SparringCard
                      key={video.id}
                      video={video}
                      rank={getRank(video, mySparring)}
                      hasAccess={isSubscribed || ownedSparringIds.has(video.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                <p className="text-zinc-400 mb-4">저장하거나 구매한 스파링 영상이 없습니다.</p>
                <Link to="/sparring">
                  <Button variant="primary">
                    스파링 영상 보러가기
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {
          activeTab === 'chains' && (
            <div className="space-y-12">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Network className="w-6 h-6 text-violet-500" />
                  My Roadmap
                </h2>
                <Link to="/technique/new">
                  <Button size="sm">
                    새 로드맵 만들기
                  </Button>
                </Link>
              </div>
              {chainsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-zinc-400">로드맵 불러오는 중...</p>
                </div>
              ) : chains.length === 0 ? (
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                  <p className="text-zinc-400 mb-4">저장된 로드맵이 없습니다.</p>
                  <Link to="/browse?tab=chains">
                    <Button variant="primary">
                      로드맵 둘러보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {chains.map((chain) => (
                    <ChainCard key={chain.id} chain={chain} />
                  ))}
                </div>
              )}
            </div>
          )
        }
      </div >
    </div >
  );
};



function ChainCard({ chain }: { chain: UserSkillTree }) {
  return (
    <div className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
      <Link
        to={`/arena?tab=skills&id=${chain.id}`}
        className="relative aspect-video bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 transition-all group-hover:border-violet-500/50 group-hover:shadow-[0_0_15px_rgba(124,58,237,0.2)]"
      >
        {chain.thumbnailUrl ? (
          <img src={chain.thumbnailUrl} alt={chain.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <Network className="w-12 h-12 text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />

        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 mb-1">
            {chain.tags && chain.tags.map(tag => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10 text-[10px] text-white/90">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="px-1">
        <div className="flex justify-between items-start mb-1">
          <Link to={`/arena?tab=skills&id=${chain.id}`}>
            <h3 className="text-white font-bold text-sm md:text-base line-clamp-1 group-hover:text-violet-400 transition-colors">{chain.title}</h3>
          </Link>
          {chain.isPublic ? (
            <span className="text-[10px] text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded border border-violet-400/20">Public</span>
          ) : (
            <span className="text-[10px] text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">Private</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
          <span className="flex items-center gap-1">
            <Network className="w-3 h-3" />
            {chain.nodes?.length || 0} nodes
          </span>
          <span>•</span>
          <span>{chain.updatedAt ? formatDistanceToNow(new Date(chain.updatedAt), { addSuffix: true, locale: ko }) : ''}</span>
        </div>
      </div>
    </div>
  );
}


// Removed local RoutineCard definition as we use DrillRoutineCard now

