import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, Video, Clock, Target, Flame
} from 'lucide-react';
import {
  getRecentActivity, getDailyFreeDrill, getDailyFreeLesson,
  getPublicSparringVideos, getFeaturedRoutines, getNewCourses,
  getRecentCompletedRoutines
} from '../lib/api';
import { Lesson, DrillRoutine, SparringVideo, Course, CompletedRoutineRecord } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';
import { MasteryRoadmapWidget } from '../components/home/MasteryRoadmapWidget';
import { ContinueLearningSection } from '../components/home/ContinueLearningSection';
import { TrendingSparringSection } from '../components/home/TrendingSparringSection';
import { FeaturedRoutinesSection } from '../components/home/FeaturedRoutinesSection';
import { NewCoursesSection } from '../components/home/NewCoursesSection';
import { RecentCompletedRoutinesSection } from '../components/home/RecentCompletedRoutinesSection';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [dailyDrill, setDailyDrill] = useState<any | null>(null);
  const [dailyLesson, setDailyLesson] = useState<Lesson | null>(null);
  const [dailySparring, setDailySparring] = useState<SparringVideo | null>(null);

  // New Layout States
  const [continueItems, setContinueItems] = useState<any[]>([]);
  const [trendingSparring, setTrendingSparring] = useState<SparringVideo[]>([]);
  const [featuredRoutines, setFeaturedRoutines] = useState<DrillRoutine[]>([]);
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [recentCompletedRoutines, setRecentCompletedRoutines] = useState<CompletedRoutineRecord[]>([]);

  // User info
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      navigate('/', { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        // 1. User Info
        const { data: userData } = await supabase
          .from('users')
          .select('avatar_url, name')
          .eq('id', user.id)
          .maybeSingle();
        if (userData?.avatar_url) setUserAvatar(userData.avatar_url);
        if (userData?.name) setUserName(userData.name);

        // 2. Daily Content (Drill & Lesson & Sparring)
        try {
          const [drillRes, lessonRes, sparringRes] = await Promise.all([
            getDailyFreeDrill().catch(() => ({ data: null })),
            getDailyFreeLesson().catch(() => ({ data: null })),
            getPublicSparringVideos(1).catch(() => [])
          ]);

          if (drillRes.data) {
            setDailyDrill(drillRes.data);
          }

          if (lessonRes.data) {
            setDailyLesson(lessonRes.data);
          }

          if (sparringRes && sparringRes.length > 0) setDailySparring(sparringRes[0]);

        } catch (e) {
          console.error("Error fetching daily content", e);
        }

        // 3. New Content Sections (REAL DATA ONLY)

        // A. Recent Activity
        try {
          const recentActivities = await getRecentActivity(user.id);
          if (recentActivities && recentActivities.length > 0) {
            setContinueItems(recentActivities);
          }
        } catch (e) {
          console.error("Error fetching recent activity", e);
        }

        // B. Trending Sparring
        try {
          const sparringVideos = await getPublicSparringVideos(6);
          if (sparringVideos && sparringVideos.length > 0) {
            setTrendingSparring(sparringVideos);
          }
        } catch (e) {
          console.error("Error fetching sparring", e);
        }

        // C. Featured Routines
        try {
          const routines = await getFeaturedRoutines(6);
          if (routines && routines.length > 0) {
            setFeaturedRoutines(routines);
          }
        } catch (e) {
          console.error("Error fetching routines", e);
        }

        // D. New Courses
        try {
          const courses = await getNewCourses(10);
          if (courses && courses.length > 0) {
            setNewCourses(courses);
          }
        } catch (e) {
          console.error("Error fetching new courses", e);
        }

        // E. Recent Completed Routines
        try {
          const completedRoutines = await getRecentCompletedRoutines(user.id, 3);
          if (completedRoutines && completedRoutines.length > 0) {
            setRecentCompletedRoutines(completedRoutines);
          }
        } catch (e) {
          console.error("Error fetching completed routines", e);
        }

      } catch (error) {
        console.error('Fatal fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    const items = [dailyDrill, dailyLesson, dailySparring].filter(Boolean);
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dailyDrill, dailyLesson, dailySparring]);

  if (loading) return <LoadingScreen message="홈 데이터 불러오는 중..." />;

  // Display Name Logic for Header
  const getDisplayName = () => {
    if (userName) return userName;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.user_metadata?.name) return user.user_metadata.name;
    if (user?.email) return user.email.split('@')[0];
    return 'Grappler';
  };
  const displayName = getDisplayName();

  const slides = [
    ...(dailyDrill ? [{ type: 'drill' as const, data: dailyDrill }] : []),
    ...(dailyLesson ? [{ type: 'lesson' as const, data: dailyLesson }] : []),
    ...(dailySparring ? [{ type: 'sparring' as const, data: dailySparring }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-32">
      {/* 1. Header & Daily Carousel */}
      <section className="relative px-4 md:px-6 lg:px-12 pt-8 pb-12 md:pt-12 max-w-[1440px] mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight mb-4 tracking-tighter">
              안녕하세요, <span className="text-violet-500">{displayName}</span>님.
            </h1>
            <p className="text-zinc-400 text-sm font-medium">오늘도 그랩플레이와 함께 성장하세요 🥋</p>
          </div>
          <div onClick={() => navigate('/settings')} className="w-11 h-11 rounded-full border-2 border-zinc-800 bg-zinc-900 overflow-hidden cursor-pointer hover:border-violet-500 transition-all shadow-lg group">
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold bg-zinc-800 group-hover:bg-zinc-700 group-hover:text-violet-400 transition-colors">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {slides.length > 0 ? (
          <>
            <div className="relative group overflow-hidden rounded-[32px] min-h-[360px] md:min-h-[420px] shadow-2xl shadow-black/50 border border-white/5">
              {slides.map((slide, idx) => {
                if (!slide || !slide.data) return null;

                if (slide.type === 'drill') {
                  const drill = slide.data;
                  return (
                    <div key={`slide-drill-${idx}`} className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'}`}>
                      <div className="relative overflow-hidden w-full h-full bg-violet-600/10 backdrop-blur-3xl px-6 pt-6 pb-20 md:p-10 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10 h-full max-w-6xl mx-auto">
                          <div className="space-y-5 flex-1 max-w-2xl pt-4 md:pt-0">
                            <div className="flex items-center gap-3 mb-2 animate-fadeIn">
                              <span className="px-3 py-1 bg-violet-500/20 text-violet-200 text-xs font-bold rounded-full border border-violet-500/20 backdrop-blur-md">데일리 드릴</span>
                              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {drill.durationMinutes || 5} min</span>
                            </div>
                            <h2 className="text-white text-3xl md:text-6xl font-black tracking-tight leading-[1.1] drop-shadow-lg">
                              {typeof drill.title === 'string' ? drill.title : 'Drill'}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-300 font-medium">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{drill.category || 'Fundamentals'}</span>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                                {drill.creatorProfileImage ? (
                                  <img src={drill.creatorProfileImage} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">T</div>
                                )}
                              </div>
                              <p className="text-zinc-400 text-sm font-medium">
                                <span className="text-zinc-200 font-bold">{drill.creatorName || 'Grapplay Team'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-full md:w-auto mt-auto md:mt-0">
                            <button onClick={() => navigate(`/drills/${drill.id}`)} className="w-full md:w-auto bg-white text-black font-bold rounded-full px-8 py-4 h-14 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2.5 text-base md:text-lg tracking-tight">
                              <Play className="w-5 h-5 fill-current" /> 훈련 시작
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (slide.type === 'lesson') {
                  const lesson = slide.data as Lesson;
                  if (!lesson) return null;
                  return (
                    <div key={`slide-lesson-${idx}`} className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'}`}>
                      <div onClick={() => navigate(`/lessons/${lesson.id}`)} className="relative overflow-hidden w-full h-full bg-violet-600/10 backdrop-blur-3xl px-6 pt-6 pb-20 md:p-10 cursor-pointer group transition-all duration-500">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10 h-full max-w-6xl mx-auto">
                          <div className="space-y-5 flex-1 max-w-2xl pt-4 md:pt-0">
                            <div className="flex items-center gap-3 mb-2 animate-fadeIn">
                              <span className="px-3 py-1 bg-violet-500/20 text-violet-200 text-xs font-bold rounded-full border border-violet-500/20 backdrop-blur-md">데일리 레슨</span>
                              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1"><Video className="w-3.5 h-3.5" /> FREE</span>
                            </div>
                            <h2 className="text-white text-3xl md:text-6xl font-black tracking-tighter leading-[1.05] group-hover:text-violet-200 transition-colors uppercase italic">
                              {typeof lesson.title === 'string' ? lesson.title : 'Lesson'}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-300 font-medium">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">{lesson.courseTitle || 'Exclusive Course'}</span>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden">
                                {lesson.creatorProfileImage ? (
                                  <img src={lesson.creatorProfileImage} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-400">I</div>
                                )}
                              </div>
                              <p className="text-zinc-400 text-sm font-medium">
                                <span className="text-zinc-200 font-bold">{lesson.creatorName || 'Grapplay Team'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-full md:w-auto mt-auto md:mt-0">
                            <button className="w-full md:w-auto bg-white text-black font-bold rounded-full px-8 py-4 h-14 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2.5 text-base md:text-lg tracking-tight">
                              <Play className="w-5 h-5 fill-current" /> 강좌 보기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else if (slide.type === 'sparring') {
                  const sparring = slide.data as SparringVideo;
                  if (!sparring) return null;
                  return (
                    <div key={`slide-sparring-${idx}`} className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'}`}>
                      <div onClick={() => navigate('/sparring', { state: { highlightVideoId: sparring.id } })} className="relative overflow-hidden w-full h-full bg-violet-600/10 backdrop-blur-3xl px-6 pt-6 pb-20 md:p-10 cursor-pointer group transition-all duration-500">
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/20 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none" />

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10 h-full max-w-6xl mx-auto">
                          <div className="space-y-5 flex-1 max-w-2xl pt-4 md:pt-0">
                            <div className="flex items-center gap-3 mb-2 animate-fadeIn">
                              <span className="px-3 py-1 bg-violet-500/20 text-violet-200 text-xs font-bold rounded-full border border-violet-500/20 backdrop-blur-md">데일리 스파링</span>
                              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-violet-400 fill-violet-400" /> TRENDING</span>
                            </div>
                            <h2 className="text-white text-3xl md:text-6xl font-black tracking-tighter leading-[1.05] group-hover:text-violet-200 transition-colors uppercase italic">
                              {typeof sparring.title === 'string' ? sparring.title : 'Sparring Session'}
                            </h2>
                            <div className="flex items-center gap-3 pt-2">
                              <div className="w-8 h-8 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden">
                                {sparring.creator?.profileImage ? (
                                  <img src={sparring.creator.profileImage} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-700" />
                                )}
                              </div>
                              <p className="text-zinc-400 text-sm font-medium">
                                <span className="text-zinc-200 font-bold">{typeof sparring.creator?.name === 'string' ? sparring.creator.name : 'Unknown Grappler'}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex-shrink-0 w-full md:w-auto mt-auto md:mt-0">
                            <button className="w-full md:w-auto bg-white text-black font-bold rounded-full px-8 py-4 h-14 hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.15)] flex items-center justify-center gap-2.5 text-base md:text-lg tracking-tight">
                              <Play className="w-5 h-5 fill-current" /> 스파링 보기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Carousel Navigation Indicators */}
            {slides.length > 1 && (
              <div className="absolute bottom-6 md:bottom-10 left-6 md:left-10 flex items-center gap-3 z-30">
                {slides.map((slide, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`group relative flex items-center gap-2 transition-all duration-300 outline-none ${idx === currentSlide ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    <div className={`h-1.5 rounded-full shadow-sm transition-all duration-500 ease-out ${idx === currentSlide ? 'w-8 bg-white' : 'w-2 bg-white/70'}`} />
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 p-12 rounded-[32px] text-center">
            <p className="text-zinc-500 font-medium">오늘의 추천 콘텐츠를 불러오는 중입니다...</p>
          </div>
        )}
      </section>

      {/* 2. Mastery Roadmap Widget */}
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20"><MasteryRoadmapWidget /></section>

      {/* 3. Continue Learning List */}
      <ContinueLearningSection items={continueItems} />

      {/* 4. Recent Completed Routines */}
      <RecentCompletedRoutinesSection routines={recentCompletedRoutines} />

      {/* 5. Trending Sparring Section */}
      <TrendingSparringSection videos={trendingSparring} />

      {/* 6. Featured Routines */}
      <FeaturedRoutinesSection routines={featuredRoutines} />

      {/* 7. New Courses */}
      <NewCoursesSection courses={newCourses} />

    </div>
  );
};
