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
  getPurchasedSparringVideos
} from '../lib/api';
import { listUserSkillTrees } from '../lib/api-skill-tree';
import { Course, DrillRoutine, SparringVideo, UserSkillTree, Drill, Lesson } from '../types';
import { CourseCard } from '../components/CourseCard';
import { DrillRoutineCard } from '../components/DrillRoutineCard';
import { SparringCard } from '../components/SparringCard';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, PlayCircle, Dumbbell, Network, Bookmark } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons' | 'routines' | 'drills' | 'sparring' | 'chains'>('courses');

  // Courses State
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Chains State
  const [chains, setChains] = useState<UserSkillTree[]>([]);
  const [chainsLoading, setChainsLoading] = useState(true);

  // Routines State
  const [purchasedRoutines, setPurchasedRoutines] = useState<DrillRoutine[]>([]);
  const [savedRoutines, setSavedRoutines] = useState<DrillRoutine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);

  // Drills State
  const [savedDrills, setSavedDrills] = useState<Drill[]>([]);
  const [drillsLoading, setDrillsLoading] = useState(true);

  // Sparring State
  const [savedSparring, setSavedSparring] = useState<SparringVideo[]>([]);
  const [purchasedSparring, setPurchasedSparring] = useState<SparringVideo[]>([]);
  const [sparringLoading, setSparringLoading] = useState(true);


  const [error, setError] = useState<string | null>(null);
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [savedLessons, setSavedLessons] = useState<Lesson[]>([]);

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

        setAllCourses(allCoursesData || []);

        // Combine purchased courses and created courses, avoiding duplicates
        const combinedCourses = [...ownedCoursesData];
        if (creatorCoursesData && creatorCoursesData.length > 0) {
          creatorCoursesData.forEach((c: Course) => {
            if (!combinedCourses.some(owned => owned.id === c.id)) {
              combinedCourses.push(c);
            }
          });
        }

        const coursesWithProgress = await Promise.all(
          combinedCourses.map(async (course) => {
            const progressData = await getCourseProgress(user.id, course.id);
            return {
              ...course,
              progress: progressData.percentage,
              completedLessons: progressData.completed,
              totalLessons: progressData.total
            };
          })
        );
        setCourses(coursesWithProgress);
        setSavedCourses(savedCoursesData);
        setSavedLessons(savedLessonsData);
      } catch (error) {
        console.error('Error fetching user courses:', error);
        setError('클래스를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setCoursesLoading(false);
      }

      // Fetch Routines
      try {
        const [routinesData, savedRoutinesData] = await Promise.all([
          getUserRoutines(user.id),
          getUserSavedRoutines(user.id)
        ]);
        if (routinesData.data) {
          setPurchasedRoutines(routinesData.data);
        }
        setSavedRoutines(savedRoutinesData);
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
        setSavedSparring(savedSparringData);
        setPurchasedSparring(purchasedSparringData);
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
        // Assuming isEmbedded is a prop or context value, for now, it's undefined.
        // If it's not defined, this part will be ignored.
        // !isEmbedded && "md:pl-28 py-8 px-4"
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
              < BookOpen className="w-6 h-6 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">라이브러리</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            구매한 클래스와 훈련 루틴을 관리하세요
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
            Classes ({allCourses.length})
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
            Routines ({purchasedRoutines.length + savedRoutines.length})
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
            Sparring ({savedSparring.length})
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
                {/* My Classes (Purchased or Created) */}
                {courses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                      My Classes <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">{courses.length}</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {courses.map((course) => (
                        <div key={course.id} className="relative flex flex-col h-full">
                          <CourseCard course={course} rank={getRank(course, courses)} hasAccess={true} />
                          <div className="mt-3 bg-zinc-900/50 backdrop-blur-xl p-4 rounded-xl border border-zinc-800">
                            <div className="flex justify-between text-xs font-semibold text-zinc-300 mb-2">
                              <span>진도율</span>
                              <span>{Math.round(course.progress || 0)}%</span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-2 mb-3">
                              <div
                                className="bg-violet-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${course.progress || 0}%` }}
                              ></div>
                            </div>
                            <Link to={`/courses/${course.id}`}>
                              <button className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded-lg transition-colors">
                                <PlayCircle className="w-4 h-4" />
                                {course.progress === 100 ? '다시 보기' : course.progress && course.progress > 0 ? '이어보기' : '학습 시작하기'}
                              </button>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Explore More Classes */}
                {allCourses.filter(ac =>
                  !courses.some(c => c.id === ac.id) &&
                  !savedCourses.some(sc => sc.id === ac.id)
                ).length > 0 && (
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
                        {allCourses
                          .filter(ac =>
                            !courses.some(c => c.id === ac.id) &&
                            !savedCourses.some(sc => sc.id === ac.id)
                          )
                          .map((course) => (
                            <CourseCard
                              key={course.id}
                              course={course}
                              rank={getRank(course, allCourses)}
                              hasAccess={isSubscribed}
                            />
                          ))}
                      </div>
                    </div>
                  )}

                {savedCourses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6">Saved Classes ({savedCourses.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedCourses.map((course) => (
                        <CourseCard
                          key={course.id}
                          course={course}
                          rank={getRank(course, allCourses)}
                          hasAccess={isSubscribed || courses.some(c => c.id === course.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'routines' && (
          <div className="space-y-12">
            <div>
              {routinesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-zinc-400">루틴 불러오는 중...</p>
                </div>
              ) : (purchasedRoutines.length === 0 && savedRoutines.length === 0) ? (
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                  <p className="text-zinc-400 mb-4">보유하거나 저장한 루틴이 없습니다.</p>
                  <Link to="/training-routines">
                    <Button variant="primary">
                      루틴 찾아보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-12">
                  {purchasedRoutines.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-6">My Routines ({purchasedRoutines.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {purchasedRoutines.map((routine) => (
                          <DrillRoutineCard
                            key={routine.id}
                            routine={routine}
                            rank={getRank(routine, purchasedRoutines)}
                            hasAccess={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {savedRoutines.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-6">Saved Routines ({savedRoutines.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedRoutines.map((routine) => (
                          <DrillRoutineCard
                            key={routine.id}
                            routine={routine}
                            rank={getRank(routine, savedRoutines)}
                            hasAccess={isSubscribed || purchasedRoutines.some(pr => pr.id === routine.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'lessons' && (
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
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                {savedLessons.map((lesson) => (
                  <div key={lesson.id} className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
                    <Link to={`/watch?lessonId=${lesson.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800 group-hover:border-violet-500 transition-all">
                      <img src={lesson.thumbnailUrl} alt={lesson.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                        <PlayCircle className="w-10 h-10 text-white" />
                      </div>
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
        )}

        {activeTab === 'drills' && (
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
                    <Link to={`/watch?id=${drill.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800 group-hover:border-violet-500 transition-all">
                      <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                        <PlayCircle className="w-10 h-10 text-white" />
                      </div>
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
        )}

        {activeTab === 'sparring' && (
          <div className="space-y-12">
            {/* Purchased Sparring */}
            {purchasedSparring.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Dumbbell className="w-6 h-6 text-violet-500" />
                  My Sparring
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {purchasedSparring.map((video) => (
                    <SparringCard
                      key={video.id}
                      video={video}
                      rank={getRank(video, purchasedSparring)}
                      hasAccess={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Saved Sparring */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-violet-500" />
                Saved Sparring
              </h2>
              {sparringLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-zinc-400">저장된 스파링 불러오는 중...</p>
                </div>
              ) : savedSparring.length === 0 ? (
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 text-center">
                  <p className="text-zinc-400 mb-4">저장된 스파링 영상이 없습니다.</p>
                  <Link to="/sparring">
                    <Button variant="primary">
                      스파링 영상 보러가기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {savedSparring.map((video) => (
                    <SparringCard
                      key={video.id}
                      video={video}
                      rank={getRank(video, savedSparring)}
                      hasAccess={isSubscribed || purchasedSparring.some(pv => pv.id === video.id)} // Saved items might not be owned, but if subscribed or owned
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chains' && (
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
        )}
      </div>
    </div>
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

