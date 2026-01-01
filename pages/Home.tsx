import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Trophy,
  Clock, Video, Bot, Zap,
} from 'lucide-react';
import { getUserProgress } from '../lib/api';
import { getBeltInfo, getXPProgress } from '../lib/belt-system';
import {
  getCourses,
  getRecentActivity, getDailyRoutine, getDailyFreeCourse,
  getTrainingLogs, getPublicSparringVideos, getDailyQuests
} from '../lib/api';
import { Course, UserProgress, DrillRoutine, SparringVideo, DailyQuest } from '../types';
import { analyzeUserDashboard } from '../lib/gemini';
import { LoadingScreen } from '../components/LoadingScreen';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { AIInsightModal } from '../components/AIInsightModal';
import { MasteryRoadmapWidget } from '../components/home/MasteryRoadmapWidget';
import { WeeklyFeaturedSection } from '../components/home/WeeklyFeaturedSection';
import { QuickJournalWidget } from '../components/home/QuickJournalWidget';
import { RecentActivitySection } from '../components/home/RecentActivitySection';
import { ArenaStatsModal } from '../components/home/ArenaStatsModal';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<DrillRoutine | null>(null);
  const [freeCourse, setFreeCourse] = useState<Course | null>(null);
  const [aiCoachResults, setAiCoachResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Diverse Recommendation States
  const [recCourse, setRecCourse] = useState<Course | null>(null);
  const [recRoutines, setRecRoutines] = useState<DrillRoutine[]>([]);
  const [recSparring, setRecSparring] = useState<SparringVideo | null>(null);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Modal states
  const [selectedInsight, setSelectedInsight] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    const cachedInsights = localStorage.getItem('gemini_recommendations');
    const cachedRecs = localStorage.getItem('ai_dashboard_recommendations');

    if (cachedInsights) {
      try {
        setAiCoachResults(JSON.parse(cachedInsights));
      } catch (e) { console.error(e); }
    }

    if (cachedRecs) {
      try {
        const { course, routines, sparring } = JSON.parse(cachedRecs);
        setRecCourse(course);
        setRecRoutines(routines);
        setRecSparring(sparring);
      } catch (e) { console.error(e); }
    }
  }, []);

  const handleStartAnalysis = async () => {
    if (isAnalyzing || !user) return;

    setIsAnalyzing(true);
    toastInfo('전술 엔진 가동 중... 당신의 수련 데이터를 분석합니다.');

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        toastError('분석 엔진 키(API KEY)가 설정되지 않았습니다.');
        setIsAnalyzing(false);
        return;
      }

      const [logsRes, allCourses, allSparring] = await Promise.all([
        getTrainingLogs(user.id),
        getCourses(30),
        getPublicSparringVideos(10)
      ]);

      const { data: routinesData } = await getDailyRoutine();
      const routinesPool = [routinesData].filter(Boolean) as DrillRoutine[];

      const logs = logsRes?.data || [];
      const analysis = await analyzeUserDashboard(logs, recentActivity, routinesPool, apiKey);

      let finalAnalysis = analysis;
      if (!finalAnalysis || !finalAnalysis.insights || !finalAnalysis.recommendedFocus) {
        finalAnalysis = {
          insights: [
            { type: 'strength', message: '새로운 여정의 시작', detail: '그래플리에 오신 것을 환영합니다! 꾸준한 기록이 실력 향상의 지름길입니다.' },
            { type: 'weakness', message: '데이터 분석 대기 중', detail: '스파링 일지를 작성하면 정밀 코칭이 활성화됩니다.' },
            { type: 'suggestion', message: '기본기부터 탄탄하게', detail: '회원님께 꼭 맞는 기술 라이브러리를 준비 중입니다.' }
          ],
          recommendedFocus: {
            courseCategory: 'Guard',
            routineFocus: 'Fundamentals',
            sparringFocus: 'Escapes'
          }
        };
      }

      setAiCoachResults(finalAnalysis.insights);
      localStorage.setItem('gemini_recommendations', JSON.stringify(finalAnalysis.insights));

      const { courseCategory, routineFocus } = finalAnalysis.recommendedFocus;

      const currentCategory = courseCategory?.toLowerCase();
      const filteredCourse = (allCourses || []).find(c =>
        c.category?.toLowerCase() === currentCategory
      ) || allCourses[0];

      let filteredRoutines = routinesPool.filter(r =>
        r.title.toLowerCase().includes(routineFocus?.toLowerCase() || '') ||
        r.category?.toLowerCase() === currentCategory
      ).slice(0, 2);

      if (filteredRoutines.length < 1) {
        filteredRoutines = routinesPool.slice(0, 2);
      }

      const filteredSparring = (allSparring || [])[0] || null;

      setRecCourse(filteredCourse || null);
      setRecRoutines(filteredRoutines);
      setRecSparring(filteredSparring);

      localStorage.setItem('ai_dashboard_recommendations', JSON.stringify({
        course: filteredCourse || null,
        routines: filteredRoutines,
        sparring: filteredSparring
      }));

      toastSuccess('전술 분석 완료! 최적의 수련 경로가 업데이트되었습니다.');
    } catch (e) {
      console.error('Analysis Error:', e);
      toastError('시스템 과부하로 분석에 실패했습니다. 잠시 후 재시도하세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };


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

        const [routineRes, courseRes, sparringRes, questsRes] = await Promise.all([
          getDailyRoutine(),
          getDailyFreeCourse(),
          getPublicSparringVideos(1),
          getDailyQuests(user.id)
        ]);
        setDailyRoutine(routineRes.data);
        setFreeCourse(courseRes.data);
        setQuests(questsRes || []);

        // Fallback for Weekly Featured (if no AI analysis yet)
        if (!recCourse && courseRes.data) {
          setRecCourse(courseRes.data);
        }
        if (recRoutines.length === 0 && routineRes.data) {
          setRecRoutines([routineRes.data]);
        }
        if (!recSparring && sparringRes && sparringRes.length > 0) {
          setRecSparring(sparringRes[0]);
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
                                DAILY ROUTINE
                              </span>
                              <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {routine.totalDurationMinutes || 15} min
                              </span>
                            </div>
                            <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight leading-tight">
                              {routine.title}
                            </h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span>{routine.drillCount || 5} Drills</span>
                              <span className="flex items-center gap-1 text-violet-300">
                                <Zap className="w-4 h-4 fill-current" /> +{(routine.drillCount || 5) * 20} XP
                              </span>
                            </div>
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
                                DAILY CLASS
                              </span>
                              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1">
                                <Video className="w-3 h-3" /> 영상 강의
                              </span>
                            </div>
                            <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] group-hover:text-violet-300 transition-colors">
                              {course.title}
                            </h2>
                            <p className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
                              <span className="w-8 h-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-xs text-white font-bold uppercase">{course.creatorName?.[0]}</span>
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

          {/* Right: AI Coach Insight (Enhanced) */}
          <div className="lg:col-span-5 relative overflow-hidden bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 backdrop-blur-xl border border-violet-500/20 p-6 md:p-8 rounded-[32px] group flex flex-col h-full shadow-[0_0_50px_-20px_rgba(124,58,237,0.15)]">
            {/* Ambient Background Effects */}
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-violet-600/20 blur-[120px] rounded-full pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-violet-900/10 to-transparent pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center backdrop-blur-sm shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                    <Bot className="w-5 h-5 text-violet-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">AI Coach Insight</h3>
                    <p className="text-violet-300/60 text-xs font-medium tracking-wide">Strategic Analysis</p>
                  </div>
                </div>
                {aiCoachResults.length > 0 && (
                  <div className="px-2 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold text-violet-300 uppercase tracking-wider">
                    Analysis Ready
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col justify-center min-h-0">
                {aiCoachResults.length > 0 ? (
                  <div className="space-y-3">
                    {aiCoachResults.slice(0, 3).map((result, idx) => {
                      const getRecommendationsForType = () => {
                        const sparringList = recSparring ? [recSparring] : [];
                        // Logic remains the same...
                        if (result.type === 'strength') {
                          return {
                            course: recCourse,
                            routines: recRoutines.filter(r =>
                              r.difficulty?.toLowerCase().includes('advanced') ||
                              r.difficulty?.toLowerCase().includes('intermediate')
                            ).slice(0, 2),
                            sparring: sparringList
                          };
                        } else if (result.type === 'weakness') {
                          return {
                            course: recCourse,
                            routines: recRoutines.filter(r =>
                              r.difficulty?.toLowerCase().includes('beginner') ||
                              r.difficulty?.toLowerCase().includes('fundamental')
                            ).slice(0, 2),
                            sparring: sparringList
                          };
                        }
                        return {
                          course: recCourse,
                          routines: recRoutines.slice(0, 2),
                          sparring: sparringList
                        };
                      };

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedInsight({
                              ...result,
                              recommendations: getRecommendationsForType()
                            });
                            setIsModalOpen(true);
                          }}
                          className="flex flex-col gap-1.5 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-violet-500/30 hover:shadow-[0_4px_20px_-5px_rgba(0,0,0,0.3)] transition-all duration-300 hover:scale-[1.02] cursor-pointer group/item relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />

                          <div className="flex items-center gap-2 relative z-10">
                            <span className={`w-1.5 h-1.5 rounded-full ${result.type === 'strength' ? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]' :
                              result.type === 'weakness' ? 'bg-zinc-500 shadow-[0_0_8px_rgba(113,113,122,0.6)]' : 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]'
                              }`} />
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${result.type === 'strength' ? 'text-violet-300' :
                              result.type === 'weakness' ? 'text-zinc-400' : 'text-zinc-200'
                              } uppercase tracking-wider bg-black/20`}>
                              {result.type === 'strength' ? 'STRENGTH' : result.type === 'weakness' ? 'WEAKNESS' : 'SUGGESTION'}
                            </span>
                          </div>

                          <p className="text-sm text-zinc-100 font-bold leading-snug relative z-10 pr-4">
                            {result.message}
                            <ChevronRight className="w-4 h-4 text-zinc-600 absolute right-0 top-0.5 opacity-0 group-hover/item:opacity-100 group-hover/item:translate-x-1 transition-all" />
                          </p>
                          <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-1 group-hover/item:text-zinc-300 transition-colors relative z-10">
                            {result.detail}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center relative z-10">
                    <div className="grid grid-cols-2 gap-3 mb-6 w-full max-w-[240px] opacity-40">
                      {[
                        { icon: Trophy, label: 'Win Rate' },
                        { icon: Zap, label: 'Efficiency' },
                        { icon: Video, label: 'Technique' },
                        { icon: Bot, label: 'Strategy' },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
                          <item.icon className="w-4 h-4 text-white" />
                          <span className="text-[9px] text-zinc-400 uppercase tracking-wider">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-zinc-300 text-sm font-bold mb-1">데이터 분석 대기 중</p>
                    <p className="text-zinc-500 text-xs max-w-[200px] leading-relaxed">
                      스파링 및 수련 데이터를 분석하여<br />맞춤형 성장 전략을 제안합니다.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_8px_20px_-6px_rgba(124,58,237,0.4)] hover:shadow-[0_12px_24px_-8px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98] group/btn flex-shrink-0 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-200%] group-hover/btn:translate-x-[200%] transition-transform duration-700 ease-in-out" />

                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="animate-pulse">Analyzing...</span>
                  </>
                ) : (
                  <>
                    <div className="bg-white/20 p-1 rounded-full">
                      <Zap className={`w-3.5 h-3.5 ${aiCoachResults.length > 0 ? 'text-white fill-white' : 'text-white fill-white'}`} />
                    </div>
                    {aiCoachResults.length > 0 ? 'AI 전술 재분석' : 'AI 전략 분석 시작하기'}
                  </>
                )}
              </button>
            </div>
          </div>
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

      <AIInsightModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        insight={selectedInsight || { type: 'suggestion', message: '', detail: '' }}
        recommendations={selectedInsight?.recommendations || {
          course: recCourse,
          routines: recRoutines,
          sparring: recSparring ? [recSparring] : []
        }}
      />

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
