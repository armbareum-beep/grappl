import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getUserCourses,
  getCourseProgress,
  getUserRoutines,
  getSavedSparringVideos,
  getUserSavedRoutines,
  getUserSavedLessons,
  getUserSavedCourses,
  getPurchasedSparringVideos
} from '../lib/api';
import { ErrorScreen } from '../components/ErrorScreen';
import { LoadingScreen } from '../components/LoadingScreen';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { listUserSkillTrees } from '../lib/api-skill-tree';
import { Course, DrillRoutine, SparringVideo, UserSkillTree, Lesson } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark, Network } from 'lucide-react';
import { Button } from '../components/Button';
import { ContentRow } from '../components/home/ContentRow';

export interface CourseWithProgress extends Course {
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
}

export const MyLibrary: React.FC = () => {
  const { user, isCreator } = useAuth();

  // State
  const [myCourses, setMyCourses] = useState<CourseWithProgress[]>([]);
  const [savedLessons, setSavedLessons] = useState<Lesson[]>([]);
  const [allRoutines, setAllRoutines] = useState<DrillRoutine[]>([]);
  const [chains, setChains] = useState<UserSkillTree[]>([]);
  const [mySparring, setMySparring] = useState<SparringVideo[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, DrillRoutine[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const [ownedCoursesData, savedCoursesData, savedLessonsData, savedRoutinesData, personalRoutinesData, savedSparringData, purchasedSparringData, chainsData] = await Promise.all([
          getUserCourses(user.id),
          getUserSavedCourses(user.id),
          getUserSavedLessons(user.id),
          getUserSavedRoutines(user.id),
          getUserRoutines(user.id),
          getSavedSparringVideos(user.id),
          getPurchasedSparringVideos(user.id),
          listUserSkillTrees(user.id)
        ]);

        // Process Courses with progress
        const combinedOwned = ownedCoursesData || [];
        const coursesWithProg = await Promise.all(
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

        // Deduplicate courses (in case some are both owned and saved)
        const savedCourses = savedCoursesData || [];
        const uniqueCoursesMap = new Map();
        [...coursesWithProg, ...savedCourses].forEach(c => {
          if (!uniqueCoursesMap.has(c.id)) {
            uniqueCoursesMap.set(c.id, c);
          }
        });

        setMyCourses(Array.from(uniqueCoursesMap.values()));
        setSavedLessons(savedLessonsData || []);

        // Process Routines
        const routinesRaw = personalRoutinesData as any;
        const pRoutines = Array.isArray(routinesRaw) ? routinesRaw : (routinesRaw.data || []);
        const routines = [...pRoutines, ...(savedRoutinesData || [])];
        // Deduplicate routines by ID
        const uniqueRoutinesMap = new Map();
        routines.forEach(r => uniqueRoutinesMap.set(r.id, r));
        const uniqueRoutines = Array.from(uniqueRoutinesMap.values());
        setAllRoutines(uniqueRoutines);

        // Sparring deduplication
        const sparring = Array.from(new Set([...(savedSparringData || []), ...(purchasedSparringData || [])].map(v => v.id)))
          .map(id => [...(savedSparringData || []), ...(purchasedSparringData || [])].find(v => v.id === id))
          .filter(Boolean) as SparringVideo[];
        setMySparring(sparring);

        setChains((chainsData as any).data || []);

        // Weekly Schedule
        const schedule: Record<string, DrillRoutine[]> = {};
        uniqueRoutines.forEach(r => {
          if (r.scheduleDays && r.scheduleDays.length > 0) {
            r.scheduleDays.forEach((day: string) => {
              if (!schedule[day]) schedule[day] = [];
              schedule[day].push(r);
            });
          }
        });
        setWeeklySchedule(schedule);

      } catch (err) {
        console.error('Error fetching library:', err);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user?.id, isCreator]);

  if (error) {
    return <ErrorScreen error={error} resetMessage="라이브러리를 불러오는 중 오류가 발생했습니다." />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white">
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

  const hasContent = myCourses.length > 0 || savedLessons.length > 0 || allRoutines.length > 0 || mySparring.length > 0 || chains.length > 0;

  return (
    <div className="bg-zinc-950 min-h-screen pb-20">
      <div className="max-w-full py-8 space-y-12 px-4 md:px-12">
        <h1 className="text-3xl font-bold text-white mb-2">저장됨</h1>

        {/* Row 1: Classes & Lessons */}
        {(myCourses.length > 0 || savedLessons.length > 0) && (
          <ContentRow
            title="Classes & Lessons"
            subtitle="수강 중이거나 저장한 클래스와 레슨"
            items={[...myCourses, ...savedLessons]}
            type="course"
            basePath="/saved/classes"
          />
        )}

        {/* Row 2: Routines */}
        {allRoutines.length > 0 && (
          <ContentRow
            title="Training Routines"
            subtitle="내 훈련 루틴 및 드릴"
            items={allRoutines}
            type="routine"
            basePath="/saved/routines"
          />
        )}

        {/* Row 3: Sparring */}
        {mySparring.length > 0 && (
          <ContentRow
            title="My Sparring"
            subtitle="저장한 스파링 영상"
            items={mySparring}
            type="sparring"
            basePath="/saved/sparring"
          />
        )}

        {/* Row 4: Roadmap */}
        {chains.length > 0 && (
          <ContentRow
            title="My Roadmap"
            subtitle="직접 만든 기술 로드맵"
            items={chains}
            type="chain"
            basePath="/saved/roadmaps"
          />
        )}

        {/* Daily Schedule */}
        {Object.keys(weeklySchedule).length > 0 && Object.values(weeklySchedule).some(day => day.length > 0) && (
          <div className="px-4 md:px-12 mt-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-bold text-white">Daily Schedule</h3>
              <Link to="/my-schedule">
                <Button variant="outline" size="sm">
                  스케줄 전체보기
                </Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {['월', '화', '수', '목', '금', '토', '일'].map(day => {
                const dayRoutines = weeklySchedule[day] || [];
                if (dayRoutines.length === 0) return null;

                return (
                  <div key={day} className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 rounded-lg bg-violet-500/10 text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-500/20">
                        {day}
                      </span>
                      <h4 className="font-bold text-zinc-200 text-sm">{day}요일</h4>
                      <span className="text-xs text-zinc-600 ml-auto">{dayRoutines.length}</span>
                    </div>
                    <div className="space-y-2">
                      {dayRoutines.slice(0, 2).map((routine: any, idx: number) => (
                        <div key={`${day}-${routine.id}-${idx}`} className="flex items-center gap-2 min-w-0">
                          <img src={routine.thumbnailUrl} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                          <span className="text-xs text-zinc-400 truncate">{routine.title}</span>
                        </div>
                      ))}
                      {dayRoutines.length > 2 && <p className="text-[10px] text-zinc-600 italic">+{dayRoutines.length - 2} more...</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasContent && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
              <Bookmark className="w-10 h-10 text-zinc-700" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">저장된 콘텐츠가 없습니다</h3>
            <p className="text-zinc-500 mb-8">라이브러리에서 마음에 드는 콘텐츠를 저장해 보세요.</p>
            <Link to="/library">
              <Button variant="primary" size="lg">
                콘텐츠 둘러보기
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export function ChainCard({ chain }: { chain: UserSkillTree }) {
  return (
    <div className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
      <Link
        to={`/skill-tree?id=${chain.id}`}
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
            {chain.tags && chain.tags.map((tag: string) => (
              <span key={tag} className="px-1.5 py-0.5 rounded bg-white/10 backdrop-blur-md border border-white/10 text-[10px] text-white/90">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>

      <div className="px-1">
        <div className="flex justify-between items-start mb-1">
          <Link to={`/skill-tree?id=${chain.id}`}>
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
