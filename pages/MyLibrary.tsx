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
  getUserSavedLessons
} from '../lib/api';
import { listUserSkillTrees } from '../lib/api-skill-tree';
import { Course, DrillRoutine, SparringVideo, UserSkillTree, Drill, Lesson } from '../types';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, PlayCircle, Dumbbell, Clock, Play, Network } from 'lucide-react';
import { Button } from '../components/Button';
import { ErrorScreen } from '../components/ErrorScreen';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CourseWithProgress extends Course {
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
}

export const MyLibrary: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons' | 'routines' | 'drills' | 'sparring' | 'chains'>('courses');

  // Courses State
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
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
  const [sparringLoading, setSparringLoading] = useState(true);


  const [error, setError] = useState<string | null>(null);
  const [savedCourses, setSavedCourses] = useState<Course[]>([]);
  const [savedLessons, setSavedLessons] = useState<Lesson[]>([]);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setCoursesLoading(false);
        setRoutinesLoading(false);
        setSparringLoading(false);
        setChainsLoading(false);
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

        const [coursesData, savedCoursesData, savedLessonsData] = await Promise.all([
          getUserCourses(user.id),
          getUserSavedCourses(user.id),
          getUserSavedLessons(user.id)
        ]);

        const coursesWithProgress = await Promise.all(
          coursesData.map(async (course) => {
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
      } finally {
        setRoutinesLoading(false);
      }

      // Fetch Drills
      try {
        const drillsData = await getUserSavedDrills(user.id);
        setSavedDrills(drillsData);
      } catch (err) {
        console.error('Error fetching saved drills:', err);
      } finally {
        setDrillsLoading(false);
      }

      // Fetch Sparring
      try {
        const sparringData = await getSavedSparringVideos(user.id);
        setSavedSparring(sparringData);
      } catch (err) {
        console.error('Error fetching saved sparring:', err);
      } finally {
        setSparringLoading(false);
      }


      // Fetch Chains
      try {
        const { data: chainsData, error: chainsError } = await listUserSkillTrees(user.id);
        if (chainsError) {
          console.error('Error fetching chains:', chainsError);
        } else {
          setChains(chainsData || []);
        }
      } catch (err) {
        console.error('Error fetching chains:', err);
      } finally {
        setChainsLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (error) {
    return <ErrorScreen error={error} resetMessage="라이브러리를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
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
              <BookOpen className="w-6 h-6 text-violet-400" />
            </div>
            <h1 className="text-3xl font-bold text-white">라이브러리</h1>
          </div>
          <p className="text-zinc-400 text-sm">
            구매한 강좌와 훈련 루틴을 관리하세요
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
            클래스 ({courses.length + savedCourses.length})
          </button>
          <button
            onClick={() => setActiveTab('lessons')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'lessons' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            레슨 ({savedLessons.length})
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'routines' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            루틴 ({purchasedRoutines.length + savedRoutines.length})
          </button>
          <button
            onClick={() => setActiveTab('drills')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'drills' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            드릴 ({savedDrills.length})
          </button>
          <button
            onClick={() => setActiveTab('sparring')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'sparring' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            스파링 ({savedSparring.length})
          </button>
          <button
            onClick={() => setActiveTab('chains')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'chains' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            로드맵 ({chains.length})
          </button>
        </div>

        {activeTab === 'courses' && (
          <div className="space-y-12">
            {coursesLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500 mx-auto mb-4"></div>
                <p className="text-zinc-400">강좌 불러오는 중...</p>
              </div>
            ) : (courses.length === 0 && savedCourses.length === 0) ? (
              <div className="text-center py-20">
                <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg border border-zinc-800">
                  <BookOpen className="w-12 h-12 text-zinc-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">아직 클래스가 없습니다</h2>
                <p className="text-zinc-400 mb-8">관심 있는 클래스를 찾아보세요!</p>
                <Link
                  to="/browse"
                  className="inline-block bg-violet-600 text-white px-8 py-3 rounded-lg hover:bg-violet-700 transition-colors font-semibold"
                >
                  클래스 둘러보기
                </Link>
              </div>
            ) : (
              <div className="space-y-8">
                {courses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6">구매한 클래스 ({courses.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {courses.map((course) => (
                        <div key={course.id} className="relative flex flex-col h-full">
                          <CourseCard course={course} />
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

                {savedCourses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-white mb-6">저장한 클래스 ({savedCourses.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {savedCourses.map((course) => (
                        <CourseCard key={course.id} course={course} />
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
                      <h3 className="text-lg font-bold text-white mb-6">구매/제작한 루틴 ({purchasedRoutines.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {purchasedRoutines.map((routine) => (
                          <RoutineCard key={routine.id} routine={routine} />
                        ))}
                      </div>
                    </div>
                  )}

                  {savedRoutines.length > 0 && (
                    <div>
                      <h3 className="text-lg font-bold text-white mb-6">저장한 루틴 ({savedRoutines.length})</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {savedRoutines.map((routine) => (
                          <RoutineCard key={routine.id} routine={routine} />
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
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-violet-500" />
              저장된 스파링
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
                  <div key={video.id} className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
                    <Link to={`/sparring?id=${video.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-zinc-800 border border-zinc-800 group-hover:border-violet-500 transition-all">
                      <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                          <Play className="w-6 h-6 text-white fill-white/20" />
                        </div>
                      </div>
                    </Link>
                    <div className="px-1">
                      <Link to={`/sparring?id=${video.id}`}>
                        <h3 className="text-white font-bold text-sm line-clamp-1 mb-1 group-hover:text-violet-400 transition-colors">{video.title}</h3>
                      </Link>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                        <span>{video.creator?.name || 'Unknown User'}</span>
                        <span>•</span>
                        <span>{video.views?.toLocaleString()} 조회</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {activeTab === 'chains' && (
          <div className="space-y-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Network className="w-6 h-6 text-violet-500" />
                내 로드맵
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

function RoutineCard({ routine, isCustom }: { routine: DrillRoutine; isCustom?: boolean }) {
  return (
    <div className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
      <Link
        to={`/my-routines/${routine.id}`}
        className="relative aspect-[10/14] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 transition-all"
      >
        <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
            <Play className="w-6 h-6 md:w-7 md:h-7 text-white fill-white/20 ml-1" />
          </div>
        </div>

        {isCustom && (
          <div className="absolute top-3 left-3 bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg">
            CUSTOM
          </div>
        )}
      </Link>

      <div className="px-1">
        <Link to={`/my-routines/${routine.id}`}>
          <h3 className="text-white font-bold text-sm md:text-base mb-1 line-clamp-1 group-hover:text-violet-400 transition-colors">{routine.title}</h3>
        </Link>
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <span>{routine.creatorName}</span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {routine.totalDurationMinutes || 0}분
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Dumbbell className="w-3 h-3" />
              {routine.drillCount || 0}개
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

