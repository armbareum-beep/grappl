import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserCourses, getCourseProgress, getUserRoutines, getSavedSparringVideos, getUserReposts } from '../lib/api';
import { Course, DrillRoutine, SparringVideo } from '../types';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, PlayCircle, Dumbbell, Clock, PlaySquare, Play, Repeat, MessageCircle, Heart, Share2 } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'courses' | 'routines' | 'sparring' | 'feed'>('courses');

  // Courses State
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);

  // Routines State
  const [purchasedRoutines, setPurchasedRoutines] = useState<DrillRoutine[]>([]);
  const [routinesLoading, setRoutinesLoading] = useState(true);

  // Sparring State
  const [savedSparring, setSavedSparring] = useState<SparringVideo[]>([]);
  const [sparringLoading, setSparringLoading] = useState(true);

  // Reposts State
  const [reposts, setReposts] = useState<any[]>([]);
  const [repostsLoading, setRepostsLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setCoursesLoading(false);
        setRoutinesLoading(false);
        setSparringLoading(false);
        return;
      }

      // Fetch Courses
      try {
        setError(null);
        setCoursesLoading(true);
        setRoutinesLoading(true);
        setSparringLoading(true);

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
      } catch (err: any) {
        console.error('Error fetching user routines:', err);
        setError(err.message || '라이브러리를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setRoutinesLoading(false);
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

      // Fetch Reposts
      try {
        const { data: repostsData, error: repostsError } = await getUserReposts(user.id);
        if (repostsError) {
          console.error('Error fetching reposts:', repostsError);
        } else {
          setReposts(repostsData || []);
        }
      } catch (err) {
        console.error('Error fetching reposts:', err);
      } finally {
        setRepostsLoading(false);
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
        <div className="flex border-b border-zinc-800 mb-8 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'courses' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            클래스 ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('routines')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'routines' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            루틴 ({purchasedRoutines.length})
          </button>
          <button
            onClick={() => setActiveTab('sparring')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'sparring' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            스파링 ({savedSparring.length})
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-6 py-4 font-bold text-sm whitespace-nowrap border-b-2 transition-all duration-200 ${activeTab === 'feed' ? 'border-violet-500 text-violet-500' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}
          >
            피드 ({reposts.length})
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
                <h2 className="text-2xl font-bold text-white mb-3">아직 구매한 클래스가 없습니다</h2>
                <p className="text-slate-400 mb-8">관심 있는 클래스를 찾아보세요!</p>
                <Link
                  to="/browse"
                  className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  클래스 둘러보기
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
            {/* My Routines Section */}
            <div>
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <PlaySquare className="w-6 h-6 text-purple-500" />
                내 루틴
              </h2>
              {routinesLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-slate-400">루틴 불러오는 중...</p>
                </div>
              ) : purchasedRoutines.length === 0 ? (
                <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
                  <p className="text-slate-400 mb-4">보유한 루틴이 없습니다.</p>
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

        {activeTab === 'sparring' && (
          <div className="space-y-12">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Dumbbell className="w-6 h-6 text-green-500" />
              저장된 스파링
            </h2>
            {sparringLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-slate-400">저장된 스파링 불러오는 중...</p>
              </div>
            ) : savedSparring.length === 0 ? (
              <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
                <p className="text-slate-400 mb-4">저장된 스파링 영상이 없습니다.</p>
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
                    <Link to={`/sparring?id=${video.id}`} className="relative aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-800 group-hover:border-violet-500 transition-all">
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

        {activeTab === 'feed' && <CommunityFeedTab reposts={reposts} loading={repostsLoading} />}
      </div>
    </div>
  );
};

function RoutineCard({ routine, isCustom }: { routine: DrillRoutine; isCustom?: boolean }) {
  return (
    <div className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
      <Link
        to={`/my-routines/${routine.id}`}
        className="relative aspect-[10/14] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 transition-all"
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
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
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

function CommunityFeedTab({ reposts, loading }: { reposts: any[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">리포스트 불러오는 중...</p>
      </div>
    );
  }

  if (reposts.length === 0) {
    return (
      <div className="bg-slate-900 rounded-xl p-8 border border-slate-800 text-center">
        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
          <Repeat className="w-10 h-10 text-zinc-700" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">리포스트한 게시물이 없습니다</h3>
        <p className="text-slate-400 mb-6">커뮤니티 피드에서 마음에 드는 게시물을 리포스트해보세요!</p>
        <Link to="/community">
          <Button variant="primary">
            커뮤니티 피드 보기
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
      {reposts.map((post) => (
        <RepostCard key={post.repostId || post.id} post={post} />
      ))}
    </div>
  );
}

function RepostCard({ post }: { post: any }) {
  const getBeltColor = (belt?: string) => {
    if (!belt) return 'border-zinc-800 bg-zinc-900 text-zinc-500';
    const lowerBelt = belt.toLowerCase();
    if (lowerBelt.includes('black')) return 'border-zinc-700 bg-zinc-950 text-zinc-400';
    if (lowerBelt.includes('brown')) return 'border-amber-900/30 bg-amber-950/30 text-amber-500';
    if (lowerBelt.includes('purple')) return 'border-purple-900/30 bg-purple-950/30 text-purple-400';
    if (lowerBelt.includes('blue')) return 'border-blue-900/30 bg-blue-950/30 text-blue-400';
    return 'border-zinc-800 bg-zinc-900 text-zinc-500';
  };

  // Get images from metadata
  const images = post.metadata?.images && Array.isArray(post.metadata.images) && post.metadata.images.length > 0
    ? post.metadata.images
    : (post.media_url && !post.media_url.includes('youtube') && !post.media_url.includes('youtu.be') ? [post.media_url] : []);

  return (
    <div className="break-inside-avoid bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 transition-all duration-300 hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] group cursor-pointer">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 text-[11px] font-bold text-zinc-500">
        <Repeat className="w-3.5 h-3.5 text-violet-500" />
        <span>You Reposted</span>
      </div>

      {/* Author Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 text-xs font-bold overflow-hidden">
          {post.userAvatar ? (
            <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
          ) : (
            post.userName?.[0] || 'U'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-zinc-100 truncate">{post.userName || 'Anonymous'}</span>
            {post.user?.isInstructor ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20">
                Instructor
              </span>
            ) : post.userBelt && (
              <span className={`px-1.5 py-[2px] rounded-[4px] text-[9px] font-black uppercase border leading-none ${getBeltColor(post.userBelt)}`}>
                {post.userBelt}
              </span>
            )}
          </div>
          {post.techniques && post.techniques.length > 0 && (
            <p className="text-[11px] text-violet-400 font-bold">#{post.techniques[0]}</p>
          )}
        </div>
        <span className="ml-auto text-[10px] text-zinc-600 font-medium">
          {post.repostedAt ? formatDistanceToNow(new Date(post.repostedAt), { addSuffix: true, locale: ko }) : ''}
        </span>
      </div>

      {/* Content */}
      <p className="text-sm text-zinc-300 leading-relaxed mb-4 line-clamp-3">
        {post.notes}
      </p>

      {/* Image if exists */}
      {images.length > 0 && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-4 border border-zinc-800">
          <img src={images[0]} alt="content" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Interactions */}
      <div className="flex items-center gap-4 pt-3 border-t border-zinc-800/50">
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Heart className="w-4 h-4" />
          <span className="text-xs">{post.likes || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{post.comments || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <Share2 className="w-4 h-4" />
          <span className="text-xs">공유됨</span>
        </div>
      </div>
    </div>
  );
}
