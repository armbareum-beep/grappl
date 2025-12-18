import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserCourses, getCourseProgress, getUserRoutines } from '../lib/api';
import { Course, DrillRoutine } from '../types';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, PlayCircle, Dumbbell, Clock, PlaySquare, Play } from 'lucide-react';
import { Button } from '../components/Button';
import { ErrorScreen } from '../components/ErrorScreen';

interface CourseWithProgress extends Course {
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
}

export const MyLibrary: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'courses' | 'routines'>('courses');

  // Courses State
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Routines State
  const [purchasedRoutines, setPurchasedRoutines] = useState<DrillRoutine[]>([]);
  const [customRoutines, setCustomRoutines] = useState<DrillRoutine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setCoursesLoading(false);
        setRoutinesLoading(false);
        return;
      }

      // Fetch Courses
      try {
        setError(null);
        setCoursesLoading(true);
        setRoutinesLoading(true);
        const coursesData = await getUserCourses(user.id);
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
      } catch (error) {
        console.error('Error fetching user courses:', error);
      } finally {
        setCoursesLoading(false);
      }

      // Fetch Routines
      try {
        const routinesData = await getUserRoutines(user.id);
        if (routinesData.data) {
          setPurchasedRoutines(routinesData.data);
        }

        const localCustomRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        setCustomRoutines(localCustomRoutines);
      } catch (err: any) {
        console.error('Error fetching user routines:', err);
        setError(err.message || '라이브러리를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setRoutinesLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (error) {
    return <ErrorScreen error={error} resetMessage="내 라이브러리를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">로그인이 필요합니다</h2>
          <p className="text-slate-400 mb-6">내 라이브러리를 보려면 로그인하세요.</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10" />
            <h1 className="text-4xl font-bold">내 라이브러리</h1>
          </div>
          <p className="text-blue-100 text-lg">
            구매한 강좌와 훈련 루틴을 관리하세요
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex border-b border-slate-800 mb-8">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-3 font-bold text-lg border-b-2 transition-colors ${activeTab === 'courses' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            강좌 ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-6 py-3 font-bold text-lg border-b-2 transition-colors ${activeTab === 'routines' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}
          >
            루틴 ({purchasedRoutines.length + customRoutines.length})
          </button>
        </div>

        {activeTab === 'courses' && (
          <>
            {coursesLoading ? (
              <div className="text-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-slate-400">강좌 불러오는 중...</p>
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-slate-900 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg border border-slate-800">
                  <BookOpen className="w-12 h-12 text-slate-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">아직 구매한 강좌가 없습니다</h2>
                <p className="text-slate-400 mb-8">관심 있는 강좌를 찾아보세요!</p>
                <Link
                  to="/browse"
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  강좌 둘러보기
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div key={course.id} className="relative flex flex-col h-full">
                    <CourseCard course={course} />
                    {/* Progress Overlay */}
                    {/* Progress Section - Moved below card */}
                    <div className="mt-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                      <div className="flex justify-between text-xs font-semibold text-slate-300 mb-2">
                        <span>진도율</span>
                        <span>{Math.round(course.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 mb-3">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                      <Link to={`/courses/${course.id}`}>
                        <button className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2 rounded-lg transition-colors">
                          <PlayCircle className="w-4 h-4" />
                          {course.progress === 100 ? '다시 보기' : course.progress && course.progress > 0 ? '이어보기' : '학습 시작하기'}
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'routines' && (
          <div className="space-y-12">
            {/* Custom Routines Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Dumbbell className="w-6 h-6 text-blue-500" />
                나만의 커스텀 루틴
              </h2>
              {customRoutines.length === 0 ? (
                <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
                  <p className="text-slate-400 mb-4">아직 생성한 커스텀 루틴이 없습니다.</p>
                  <Link to="/arena?tab=routines">
                    <Button variant="outline">
                      저장된 드릴로 루틴 만들기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {customRoutines.map((routine) => (
                    <RoutineCard key={routine.id} routine={routine} isCustom />
                  ))}
                </div>
              )}
            </div>

            {/* Purchased Routines Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <PlaySquare className="w-6 h-6 text-purple-500" />
                구매한 루틴
              </h2>
              {routinesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-400">루틴 불러오는 중...</p>
                </div>
              ) : purchasedRoutines.length === 0 ? (
                <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
                  <p className="text-slate-400 mb-4">구매한 루틴이 없습니다.</p>
                  <Link to="/drills">
                    <Button variant="primary">
                      새로운 루틴 찾아보기
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {purchasedRoutines.map((routine) => (
                    <RoutineCard key={routine.id} routine={routine} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function RoutineCard({ routine, isCustom }: { routine: DrillRoutine; isCustom?: boolean }) {
  return (
    <Link
      to={`/my-routines/${routine.id}`}
      className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 hover:border-slate-700 transition-colors group flex flex-col h-full"
    >
      <div className="aspect-video bg-slate-800 relative">
        <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full hover:bg-white/30 transition-colors">
            <Play className="w-8 h-8 text-white fill-current" />
          </div>
        </div>
        {isCustom && (
          <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
            CUSTOM
          </div>
        )}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-white font-bold text-lg mb-1 line-clamp-1">{routine.title}</h3>
        <p className="text-slate-400 text-sm mb-4 line-clamp-1">{routine.creatorName}</p>

        <div className="mt-auto flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {routine.totalDurationMinutes || 0}분
          </div>
          <div className="flex items-center gap-1">
            <Dumbbell className="w-3 h-3" />
            {routine.drillCount || 0}개 드릴
          </div>
        </div>
      </div>
    </Link>
  );
}
