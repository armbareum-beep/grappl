import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Trophy,
  Clock, Video, Zap,
} from 'lucide-react';
import { getUserProgress } from '../lib/api';
import { getBeltInfo, getXPProgress } from '../lib/belt-system';
import {
  getRecentActivity, getDailyRoutine, getDailyFreeCourse,
  getTrainingLogs, getPublicSparringVideos,
  searchContent, getDailyQuests
} from '../lib/api';
import { Course, UserProgress, DrillRoutine, SparringVideo, DailyQuest, TrainingLog } from '../types';
import { getWeeklyFeaturedChain } from '../lib/api-skill-tree';
import { LoadingScreen } from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';
import { MasteryRoadmapWidget } from '../components/home/MasteryRoadmapWidget';
import { WeeklyFeaturedSection } from '../components/home/WeeklyFeaturedSection';
import { QuickJournalWidget } from '../components/home/QuickJournalWidget';
import { RecentActivitySection } from '../components/home/RecentActivitySection';
import { ArenaStatsModal } from '../components/home/ArenaStatsModal';
import { AICoachWidget } from '../components/AICoachWidget';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<DrillRoutine | null>(null);
  const [freeCourse, setFreeCourse] = useState<Course | null>(null);
  const [logs, setLogs] = useState<TrainingLog[]>([]); // Added logs state

  // Diverse Recommendation States
  const [recCourse, setRecCourse] = useState<Course | null>(null);
  const [recRoutines, setRecRoutines] = useState<DrillRoutine[]>([]);
  const [recSparring, setRecSparring] = useState<SparringVideo | null>(null);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Modal states
  // const [selectedInsight, setSelectedInsight] = useState<any | null>(null); // Unused

  // Stats Modal State
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<'streak' | 'belt' | 'badges' | null>(null);
  const [quests, setQuests] = useState<DailyQuest[]>([]);

  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Mock User Stats
  const userStats = {
    streak: 3,
  };

  useEffect(() => {
    const cachedRecs = localStorage.getItem('ai_dashboard_recommendations');

    if (cachedRecs) {
      try {
        const { course, routines, sparring } = JSON.parse(cachedRecs);
        setRecCourse(course);
        setRecRoutines(routines);
        setRecSparring(sparring);
      } catch (e) { console.error(e); }
    }
  }, []);


  useEffect(() => {
    if (!user) {
      setLoading(false);
      navigate('/', { replace: true });
      return;
    }

    const fetchData = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('is_subscriber, avatar_url, name')
          .eq('id', user.id)
          .single();
        if (userData?.avatar_url) setUserAvatar(userData.avatar_url);
        if (userData?.name) setUserName(userData.name);

        const userProgress = await getUserProgress(user.id);
        setProgress(userProgress);

        const recent = await getRecentActivity(user.id);
        setRecentActivity(recent);

        // Fetch Weekly Chain + Standard Daily Items + LOGS
        const [routineRes, courseRes, sparringRes, questsRes, weeklyChainRes, logsRes] = await Promise.all([
          getDailyRoutine(),
          getDailyFreeCourse(),
          getPublicSparringVideos(1),
          getDailyQuests(user.id),
          getWeeklyFeaturedChain(),
          getTrainingLogs(user.id)
        ]);

        setDailyRoutine(routineRes.data);
        setFreeCourse(courseRes.data);
        setQuests(questsRes || []);

        const combinedLogs = logsRes.data || [];
        setLogs(combinedLogs as any);

        // --- Weekly Chain Logic ---
        const weeklyChain = weeklyChainRes.data;
        let chainCourse = null;
        let chainRoutines: DrillRoutine[] = [];
        let chainSparring = null;

        if (weeklyChain?.title) {
          // Search for content matching the chain's theme
          const searchResults = await searchContent(weeklyChain.title);
          if (searchResults.courses.length > 0) chainCourse = searchResults.courses[0];
          if (searchResults.routines.length > 0) chainRoutines = searchResults.routines;
          if (searchResults.sparring.length > 0) chainSparring = searchResults.sparring[0];
        }

        // Set Recommendations (Chain matches > Daily Fallbacks)
        setRecCourse(chainCourse || courseRes.data);
        setRecRoutines(chainRoutines.length > 0 ? chainRoutines : (routineRes.data ? [routineRes.data] : []));

        if (chainSparring) {
          setRecSparring(chainSparring as SparringVideo);
        } else if (sparringRes && sparringRes.length > 0) {
          setRecSparring(sparringRes[0] as SparringVideo);
        } else {
          setRecSparring(null);
        }

      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  // Auto-slide carousel effect
  useEffect(() => {
    const items = [dailyRoutine, freeCourse].filter(Boolean);
    if (items.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [dailyRoutine, freeCourse]);

  if (loading) {
    return <LoadingScreen message="홈 데이터 불러오는 중..." />;
  }

  // Derived Values
  const currentBelt = progress ? getBeltInfo(progress.beltLevel) : null;
  const xpProgress = progress ? getXPProgress(progress.totalXp, progress.beltLevel) : 0;
  const levelProgress = xpProgress * 100;
  const displayName = userName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Grappler';

  const slides = [
    ...(dailyRoutine ? [{ type: 'routine' as const, data: dailyRoutine }] : []),
    ...(freeCourse ? [{ type: 'course' as const, data: freeCourse }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-violet-500/30 pb-20">
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .slide-enter {
          animation: slideIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* 1. Top Section: Personalized Welcome & Auto-Slide Carousel */}
      <section className="relative px-4 md:px-6 lg:px-12 pt-8 pb-8 md:pt-12 max-w-[1440px] mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              환영합니다, {displayName}님!
            </h1>
            <p className="text-zinc-400 text-sm">오늘의 수련을 시작해보세요 🥋</p>
          </div>

          <div
            onClick={() => navigate('/settings')}
            className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden cursor-pointer hover:border-violet-500 transition-colors"
          >
            {userAvatar ? (
              <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                {displayName[0].toUpperCase()}
              </div>
            )}
          </div>
        </div>

        {slides.length > 0 ? (
          <div className="relative group overflow-hidden rounded-[32px]">
            <div className="relative min-h-[340px] md:min-h-[380px]">
              {slides.map((slide, idx) => {
                if (slide.type === 'routine') {
                  const routine = slide.data as DrillRoutine;
                  return (
                    <div
                      key={`slide-routine-${idx}`}
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'
                        }`}
                    >
                      <div className="relative overflow-hidden w-full h-full bg-violet-600/10 backdrop-blur-xl border border-violet-500/30 px-6 pt-6 pb-20 md:p-8 rounded-[32px] group transition-all duration-500 hover:border-violet-500/50 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)]">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 h-full p-4 md:p-0">
                          <div className="space-y-4 flex-1 max-w-2xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-3 py-1 bg-violet-500/20 text-violet-200 text-xs font-bold rounded-full border border-violet-500/20">
                                데일리 루틴
                              </span>
                              <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {routine.totalDurationMinutes || 15} min
                              </span>
                            </div>
                            <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight leading-tight">
                              {routine.title}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span>{routine.drillCount || 5}개의 드릴</span>
                              <span className="flex items-center gap-1 text-violet-300 font-bold">
                                <Zap className="w-4 h-4 fill-current text-yellow-500" /> +50 XP
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
                              <span className="text-zinc-300 text-base">{routine.creatorName}</span>
                            </p>
                          </div>

                          <div className="flex-shrink-0 mt-6 md:mt-0 w-full md:w-auto">
                            <button
                              onClick={() => navigate(`/routines/${routine.id}`)}
                              className="w-full md:w-auto bg-white text-zinc-950 font-bold rounded-full px-8 py-4 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 text-base md:text-lg"
                            >
                              <Play className="w-5 h-5 fill-current" />
                              루틴 시작하기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const course = slide.data as Course;
                  return (
                    <div
                      key={`slide-course-${idx}`}
                      className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'
                        }`}
                    >
                      <div
                        onClick={() => navigate(`/courses/${course.id}`)}
                        className="relative overflow-hidden w-full h-full bg-zinc-900 border border-white/5 px-6 pt-6 pb-20 md:p-8 rounded-[32px] cursor-pointer group transition-all duration-500 hover:border-violet-500/50 flex flex-col justify-center"
                      >
                        {/* Abstract Background Pattern */}
                        <div className="absolute inset-0 z-0 opacity-20">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full" />
                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/5 blur-[60px] rounded-full" />
                        </div>

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 h-full p-4 md:p-0">
                          <div className="space-y-4 flex-1 max-w-2xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-3 py-1 bg-violet-600 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-900/20">
                                데일리 클래스
                              </span>
                              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1">
                                <Video className="w-3 h-3" /> 영상 강의
                              </span>
                            </div>
                            <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] group-hover:text-violet-300 transition-colors">
                              {course.title}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Video className="w-4 h-4" /> {course.lessonCount || 0}개의 레슨
                              </span>
                              <span className="flex items-center gap-1 text-violet-300 font-bold">
                                <Zap className="w-4 h-4 fill-current text-yellow-500" /> +30 XP
                              </span>
                            </div>
                            <p className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
                              <span className="text-zinc-300 text-base">{course.creatorName}</span>
                            </p>
                          </div>

                          <div className="flex-shrink-0 mt-6 md:mt-0 w-full md:w-auto">
                            <div className="w-full md:w-auto bg-violet-600 text-white font-bold rounded-full px-8 py-4 hover:bg-violet-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-violet-600/20 flex items-center justify-center gap-2 text-base md:text-lg">
                              <Play className="w-6 h-6 fill-current" />
                              무료 시청하기
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {slides.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-violet-500' : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[32px] text-center">
            <p className="text-zinc-500">오늘의 콘텐츠가 준비중입니다.</p>
          </div>
        )}
      </section>

      {/* 1.5. Mastery Roadmap Section */}
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-6">
        <MasteryRoadmapWidget />
      </section>

      {/* 2. Mid Section: 12-Column Grid Layout */}
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Arena Growth (Existing) */}
          <div
            onClick={() => navigate('/arena')}
            className="lg:col-span-7 bg-zinc-900/30 border border-white/5 p-6 md:p-8 rounded-[32px] hover:bg-zinc-900/50 transition-colors cursor-pointer group flex flex-col h-full relative overflow-hidden"
          >
            {/* Subtle glow for Arena Growth */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-center justify-between mb-8 flex-shrink-0 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Arena Growth
              </h3>
              <div className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
              </div>
            </div>

            <div className="mb-8 flex-shrink-0 relative z-10">
              <div className="flex justify-between items-end mb-3">
                <span className="text-4xl font-black text-white leading-tight tracking-tight">
                  {currentBelt?.name || 'White Belt'}
                </span>
                <span className="text-zinc-500 font-mono text-sm leading-6 mb-1">Level {progress?.beltLevel || 1}</span>
              </div>
              <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden relative backdrop-blur-sm ring-1 ring-white/5">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 to-indigo-500 shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all duration-1000 ease-out"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="mt-2 text-right text-xs text-zinc-500 font-mono">
                {Math.floor(xpProgress * 100)}% to next belt
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-auto relative z-10">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStatType('streak');
                  setStatsModalOpen(true);
                }}
                className="bg-zinc-950/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/5 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-300 h-28 flex flex-col items-center justify-center cursor-pointer group/stat"
              >
                <div className="text-3xl font-black text-white mb-1 group-hover/stat:text-orange-500 group-hover/stat:scale-110 transition-all">{userStats.streak}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Day Streak</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStatType('belt');
                  setStatsModalOpen(true);
                }}
                className="bg-zinc-950/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all duration-300 h-28 flex flex-col items-center justify-center cursor-pointer group/stat"
              >
                <div className="text-xl font-black text-white mb-1 leading-tight group-hover/stat:text-violet-500 group-hover/stat:scale-105 transition-all">{currentBelt?.name || 'White'}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Current Belt</div>
              </div>
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStatType('badges');
                  setStatsModalOpen(true);
                }}
                className="bg-zinc-950/40 backdrop-blur-md rounded-2xl p-4 text-center border border-white/5 hover:border-yellow-500/30 hover:bg-yellow-500/5 transition-all duration-300 h-28 flex flex-col items-center justify-center cursor-pointer group/stat"
              >
                <div className="text-3xl font-black text-white mb-1 group-hover/stat:text-yellow-500 group-hover/stat:scale-110 transition-all">0</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Badges</div>
              </div>
            </div>
          </div>

          {/* Right: AI Coach Insight (New Widget) */}
          <AICoachWidget logs={logs} />
        </div>
      </section>

      {/* 4. Quick Journal Section - Mid Page Engagement */}
      <QuickJournalWidget />

      {/* 5. Weekly Featured Section - Discovery (Bento Grid) */}
      <WeeklyFeaturedSection
        course={recCourse}
        routine={recRoutines[0] || null}
        sparring={recSparring}
      />

      {/* 4. Bottom Section: Recent Activity List */}
      <RecentActivitySection activities={recentActivity} />

      <ArenaStatsModal
        isOpen={statsModalOpen}
        onClose={() => setStatsModalOpen(false)}
        type={selectedStatType}
        data={{
          streak: userStats.streak,
          beltLevel: progress?.beltLevel || 0,
          xp: progress?.totalXp || 0,
          dailyQuests: quests
          // badges: progress?.badges || []
        }}
      />
    </div>
  );
};
