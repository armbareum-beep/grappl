import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import {
  Play, Clock, Network, TrendingUp, Sparkles
} from 'lucide-react';
import {
  getRecentActivity, getDailyFreeDrill, getDailyFreeLesson,
  getPublicSparringVideos, getFeaturedRoutines, getNewCourses,
  getRecentCompletedRoutines, fetchRoutines, getTrendingCourses,
  getDailyFreeSparring
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
  const [trendingCourses, setTrendingCourses] = useState<Course[]>([]);
  const [recentCompletedRoutines, setRecentCompletedRoutines] = useState<CompletedRoutineRecord[]>([]);

  // Tab Section Data
  const [newCourses, setNewCourses] = useState<Course[]>([]);
  const [newRoutines, setNewRoutines] = useState<DrillRoutine[]>([]);
  const [newSparring, setNewSparring] = useState<SparringVideo[]>([]);

  // Tab State
  const [activeNewTab, setActiveNewTab] = useState<'sparring' | 'routine' | 'course'>('sparring');
  const [activeTrendingTab, setActiveTrendingTab] = useState<'course' | 'routine' | 'sparring'>('course');

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

        // Initialize local variables to hold fetched data for processing
        let trendingCoursesData: Course[] = [];
        let newCoursesData: Course[] = [];
        let featuredRoutinesData: DrillRoutine[] = [];
        let newRoutinesData: DrillRoutine[] = [];
        let trendingSparringData: SparringVideo[] = [];
        let newSparringData: SparringVideo[] = [];

        // B. Trending Sparring
        try {
          const sparringVideos = await getPublicSparringVideos(6);
          if (sparringVideos && sparringVideos.length > 0) {
            trendingSparringData = sparringVideos;
          }
        } catch (e) {
          console.error("Error fetching sparring", e);
        }

        // C. Featured Routines
        try {
          const routines = await getFeaturedRoutines(6);
          if (routines && routines.length > 0) {
            featuredRoutinesData = routines;
          }
        } catch (e) {
          console.error("Error fetching routines", e);
        }

        // D. Trending Courses
        try {
          const courses = await getTrendingCourses(6);
          if (courses && courses.length > 0) {
            trendingCoursesData = courses;
          }
        } catch (e) {
          console.error("Error fetching trending courses", e);
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

        // --- Tab Content Data ---

        // F. New Courses (For Tab)
        try {
          const courses = await getNewCourses(10);
          if (courses && courses.length > 0) {
            newCoursesData = courses;
          }
        } catch (e) {
          console.error("Error fetching new courses for tab", e);
        }

        // G. New Routines (For Tab)
        try {
          const routinesRes = await fetchRoutines(6);
          if (routinesRes.data && routinesRes.data.length > 0) {
            newRoutinesData = routinesRes.data;
          }
        } catch (e) {
          console.error("Error fetching new routines", e);
        }

        // H. New Sparring (For Tab)
        try {
          const sparringRes = await getPublicSparringVideos(10);
          if (sparringRes && sparringRes.length > 0) {
            newSparringData = sparringRes;
          }
        } catch (e) {
          console.error("Error fetching new sparring", e);
        }

        // --- I. Inject Ranks and Free Status ---
        try {
          const [freeDrill, freeLesson, freeSparring] = await Promise.all([
            getDailyFreeDrill(),
            getDailyFreeLesson(),
            getDailyFreeSparring()
          ]);
          const freeIds = [
            freeDrill.data?.id,
            freeLesson.data?.id,
            freeSparring.data?.id,
            freeLesson.data?.courseId
          ].filter(Boolean) as string[];

          const processContent = (items: any[], categoryAll: any[]) => {
            const now = Date.now();

            // 1. Calculate 'Hot Score' for all items in the category
            // Score = Views / (HoursSinceCreation + 2)^1.5
            const getHotScore = (item: any) => {
              const views = item.views || 0;
              const createdDate = item.createdAt ? new Date(item.createdAt).getTime() : now;
              const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
              return views / Math.pow(hoursSinceCreation + 2, 1.5);
            };

            const sortedByHot = [...categoryAll]
              .filter(item => (item.views || 0) >= 5) // Slightly lower threshold for 'Hot' to catch rising stars
              .sort((a, b) => getHotScore(b) - getHotScore(a));

            return items.map(item => {
              const hotIndex = sortedByHot.findIndex(s => s.id === item.id);
              return {
                ...item,
                rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
                isDailyFree: freeIds.includes(item.id) || (item.courseId && freeIds.includes(item.courseId))
              };
            });
          };

          setTrendingCourses(processContent(trendingCoursesData, trendingCoursesData));
          setNewCourses(processContent(newCoursesData, [...newCoursesData, ...trendingCoursesData]));
          setFeaturedRoutines(processContent(featuredRoutinesData, featuredRoutinesData));
          setNewRoutines(processContent(newRoutinesData, [...newRoutinesData, ...featuredRoutinesData]));
          setTrendingSparring(processContent(trendingSparringData, trendingSparringData));
          setNewSparring(processContent(newSparringData, [...newSparringData, ...trendingSparringData]));

        } catch (e) {
          console.error("Error injecting ranks", e);
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

  if (loading) {
    return (
      <LoadingScreen message="홈 화면을 불러오고 있습니다..." />
    );
  }

  // Display Name Logic for Header
  const getDisplayName = () => {
    // 1. Try DB name first if it's not an email
    if (userName && !userName.includes('@')) return userName;

    // 2. Try metadata names if they are not emails
    const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (metaName && !metaName.includes('@')) return metaName;

    // 3. Fallback to email ID part (before @)
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
            <p className="text-zinc-400 text-sm font-medium">오늘도 그래플레이와 함께 성장하세요 🥋</p>
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
                              <span className="px-2 py-0.5 rounded bg-white text-violet-600 text-xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(255,255,255,0.3)]">✨ 오늘만 무료</span>
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
                              <span className="px-2 py-0.5 rounded bg-white text-violet-600 text-xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(255,255,255,0.3)]">✨ 오늘만 무료</span>
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
                              <Play className="w-5 h-5 fill-current" /> 클래스 보기

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
                              <span className="px-2 py-0.5 rounded bg-white text-violet-600 text-xs font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(255,255,255,0.3)]">✨ 오늘만 무료</span>
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
                {slides.map((_, idx) => (
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

      {/* 2. Continue Learning List */}
      <ContinueLearningSection items={continueItems} />

      {/* 3. Mastery Roadmap Widget */}
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Network className="w-7 h-7 text-violet-400" />
              마스터리 로드맵
            </h2>
            <p className="text-zinc-400 text-sm mt-1 font-medium">
              블랙벨트를 향한 여정, 다음 단계에 도전하세요
            </p>
          </div>
        </div>
        <MasteryRoadmapWidget />
      </section>

      {/* 4. Recent Completed Routines */}
      <RecentCompletedRoutinesSection routines={recentCompletedRoutines} />

      {/* 5-7. Popular Content Tabs */}
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mt-20 mb-20">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-violet-400" />
              실시간 인기 콘텐츠
            </h2>
            <p className="text-zinc-400 text-sm mt-1 font-medium">
              지금 가장 주목받는 콘텐츠를 확인하세요
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4 md:mb-8 border-b border-white/10">
          <div className="flex items-center gap-0 md:gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setActiveTrendingTab('course')}
              className={`px-4 md:px-6 py-4 text-base md:text-lg font-bold transition-all relative whitespace-nowrap ${activeTrendingTab === 'course' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              인기 클래스
              {activeTrendingTab === 'course' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTrendingTab('routine')}
              className={`px-4 md:px-6 py-4 text-base md:text-lg font-bold transition-all relative whitespace-nowrap ${activeTrendingTab === 'routine' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              인기루틴
              {activeTrendingTab === 'routine' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTrendingTab('sparring')}
              className={`px-4 md:px-6 py-4 text-base md:text-lg font-bold transition-all relative whitespace-nowrap ${activeTrendingTab === 'sparring' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              인기스파링
              {activeTrendingTab === 'sparring' && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
              )}
            </button>
          </div>

        </div>

        <div className="min-h-[400px]">
          {activeTrendingTab === 'course' && (
            <div className="animate-fadeIn">
              <NewCoursesSection
                courses={trendingCourses}
                title=""
                subtitle=""
                hideHeader={true}
                hideBadges={true}
              />
            </div>
          )}
          {activeTrendingTab === 'routine' && (
            <div className="animate-fadeIn">
              <FeaturedRoutinesSection
                routines={featuredRoutines}
                title=""
                subtitle=""
                hideHeader={true}
                hideBadges={true}
              />
            </div>
          )}
          {activeTrendingTab === 'sparring' && (
            <div className="animate-fadeIn">
              <TrendingSparringSection
                videos={trendingSparring}
                title=""
                subtitle=""
                hideHeader={true}
                hideBadges={true}
              />
            </div>
          )}
        </div>
      </section >

      {/* 8. New Content Tabs */}
      < section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mt-20 mb-20" >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-violet-400" />
              최신 업로드
            </h2>
            <p className="text-zinc-400 text-sm mt-1 font-medium">
              따끈따끈한 새 콘텐츠를 만나보세요
            </p>
          </div>
        </div>
        <div className="flex items-center gap-0 md:gap-2 mb-8 border-b border-white/10 overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setActiveNewTab('course')}
            className={`px-4 md:px-6 py-4 text-base md:text-lg font-bold transition-all relative whitespace-nowrap ${activeNewTab === 'course' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            신규 클래스
            {activeNewTab === 'course' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            )}
          </button>
          <button
            onClick={() => setActiveNewTab('routine')}
            className={`px-4 md:px-6 py-4 text-base md:text-lg font-bold transition-all relative whitespace-nowrap ${activeNewTab === 'routine' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            신규 루틴
            {activeNewTab === 'routine' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            )}
          </button>
          <button
            onClick={() => setActiveNewTab('sparring')}
            className={`px-4 md:px-6 py-4 text-base md:text-lg font-bold transition-all relative whitespace-nowrap ${activeNewTab === 'sparring' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            신규 스파링
            {activeNewTab === 'sparring' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
            )}
          </button>
        </div>

        <div className="min-h-[400px]">
          {activeNewTab === 'course' && (
            <div className="animate-fadeIn">
              <NewCoursesSection courses={newCourses} title="" subtitle="" hideHeader={true} hideBadges={true} />
            </div>
          )}
          {activeNewTab === 'routine' && (
            <div className="animate-fadeIn">
              <FeaturedRoutinesSection
                routines={newRoutines}
                title=""
                subtitle=""
                hideHeader={true}
                hideBadges={true}
              />
            </div>
          )}
          {activeNewTab === 'sparring' && (
            <div className="animate-fadeIn">
              <TrendingSparringSection
                videos={newSparring}
                title=""
                subtitle=""
                showRank={false}
                hideHeader={true}
                hideBadges={true}
              />
            </div>
          )}
        </div>
      </section >

    </div >
  );
};
