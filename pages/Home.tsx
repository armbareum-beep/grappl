import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Activity, Trophy,
  Clock, Sparkles, Video, Bot, Zap,
} from 'lucide-react';
import { getUserProgress } from '../lib/api';
import { getBeltInfo, getXPProgress } from '../lib/belt-system';
import {
  getDrillRoutines, getCourses,
  getRecentActivity, getDailyRoutine,
  getTrainingLogs, getPublicSparringVideos
} from '../lib/api';
import { Course, UserProgress, DrillRoutine, SparringVideo } from '../types';
import { analyzeUserDashboard } from '../lib/gemini';
import { LoadingScreen } from '../components/LoadingScreen';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess, info: toastInfo } = useToast();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<DrillRoutine | null>(null);
  const [proRoutines, setProRoutines] = useState<DrillRoutine[]>([]);
  const [aiCoachResults, setAiCoachResults] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Diverse Recommendation States
  const [recCourse, setRecCourse] = useState<Course | null>(null);
  const [recRoutines, setRecRoutines] = useState<DrillRoutine[]>([]);
  const [recSparring, setRecSparring] = useState<SparringVideo[]>([]);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Mock User Stats (would ideally come from API)
  const userStats = {
    streak: 3, // Mocked for now or fetch if available
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

      const logs = logsRes?.data || [];
      const analysis = await analyzeUserDashboard(logs, recentActivity, proRoutines, apiKey);

      // --- Robust Fallback for Cold Start ---
      let finalAnalysis = analysis;
      if (!finalAnalysis || !finalAnalysis.insights || !finalAnalysis.recommendedFocus) {
        console.warn('Applying cold-start fallback analysis.');
        finalAnalysis = {
          insights: [
            { type: 'strength', message: '새로운 여정의 시작', detail: '그래플리에 오신 것을 환영합니다! 아직 데이터가 적지만 꾸준한 기록이 실력 향상의 지름길입니다.' },
            { type: 'weakness', message: '데이터 분석 대기 중', detail: '분석을 위한 충분한 로그가 부족합니다. 스파링 일지를 작성하면 정밀 코칭이 활성화됩니다.' },
            { type: 'suggestion', message: '기본기부터 탄탄하게', detail: '초기 단계에서는 가드 유지와 탈출 기술 위주로 시청하시는 것을 추천드립니다.' }
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

      // 1. Pick 1 Course
      const currentCategory = courseCategory?.toLowerCase();
      const filteredCourse = (allCourses || []).find(c =>
        c.category?.toLowerCase() === currentCategory
      ) || allCourses[0];

      // 2. Pick 2 Routines
      let filteredRoutines = proRoutines.filter(r =>
        r.title.toLowerCase().includes(routineFocus?.toLowerCase() || '') ||
        r.category?.toLowerCase() === currentCategory
      ).slice(0, 2);

      if (filteredRoutines.length < 2) {
        filteredRoutines = proRoutines.slice(0, 2);
      }

      // 3. Pick 3 Sparring Videos
      const filteredSparring = (allSparring || []).slice(0, 3);

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
        // Fetch User Subscription & Profile
        const { data: userData } = await supabase
          .from('users')
          .select('is_subscriber, avatar_url, name')
          .eq('id', user.id)
          .single();
        if (userData?.avatar_url) setUserAvatar(userData.avatar_url);
        if (userData?.name) setUserName(userData.name);

        // Fetch user progress
        const userProgress = await getUserProgress(user.id);
        setProgress(userProgress);

        // Fetch content
        const recent = await getRecentActivity(user.id);
        setRecentActivity(recent);

        // Fetch daily routine
        const { data: routineData } = await getDailyRoutine();
        setDailyRoutine(routineData);

        const routinesRes = await getDrillRoutines();
        const routinesData = (routinesRes as any).data || routinesRes;
        // Filter for free routines (price is 0 or undefined/null)
        if (routinesData && Array.isArray(routinesData)) {
          setProRoutines(routinesData.filter((r: any) => !r.price || r.price === 0).slice(0, 5));
        }


      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loading) {
    return <LoadingScreen message="홈 데이터 불러오는 중..." />;
  }

  // Derived Values
  const currentBelt = progress ? getBeltInfo(progress.beltLevel) : null;
  const xpProgress = progress ? getXPProgress(progress.totalXp, progress.beltLevel) : 0;
  const levelProgress = xpProgress * 100;

  // Safe user name display
  const displayName = userName || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Grappler';

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-violet-500/30 pb-20">

      {/* 1. Top Section: Personalized Welcome & Today's Routine */}
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

        {dailyRoutine ? (
          <div className="relative overflow-hidden w-full bg-violet-600/10 backdrop-blur-xl border border-violet-500/30 p-6 md:p-8 rounded-[32px] group transition-all duration-500 hover:border-violet-500/50 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-violet-500/20 text-violet-200 text-xs font-bold rounded-full border border-violet-500/20">
                    DAILY ROUTINE
                  </span>
                  <span className="text-zinc-400 text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {dailyRoutine.totalDurationMinutes || 15} min
                  </span>
                </div>
                <h2 className="text-white text-2xl md:text-3xl font-black tracking-tight leading-tight">
                  {dailyRoutine.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-zinc-400">
                  <span>{dailyRoutine.drillCount || 5} Drills</span>
                  <span className="flex items-center gap-1 text-violet-300">
                    <Zap className="w-4 h-4 fill-current" /> +{(dailyRoutine.drillCount || 5) * 20} XP
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={() => navigate(`/routines/${dailyRoutine.id}`)}
                  className="w-full md:w-auto bg-white text-zinc-950 font-bold rounded-full px-8 py-3 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5 fill-current" />
                  루틴 시작하기
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[32px] text-center">
            <p className="text-zinc-500">오늘의 루틴이 준비중입니다.</p>
          </div>
        )}
      </section>

      {/* 2. Mid Section: 12-Column Grid Layout */}
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

          {/* Left: Arena Growth - 8 columns on desktop */}
          <div
            onClick={() => navigate('/arena')}
            className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800/50 p-6 md:p-8 rounded-[32px] hover:bg-zinc-900/60 transition-colors cursor-pointer group flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-6 flex-shrink-0">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Arena Growth
              </h3>
              <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
            </div>

            <div className="mb-6 flex-shrink-0">
              <div className="flex justify-between items-end mb-2">
                <span className="text-3xl font-black text-white leading-tight">
                  {currentBelt?.name || 'White Belt'}
                </span>
                <span className="text-zinc-500 font-mono text-sm leading-6">Level {progress?.beltLevel || 1}</span>
              </div>
              {/* Level Progress Bar */}
              <div className="h-4 bg-zinc-800 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)] transition-all duration-1000 ease-out"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
              <div className="mt-2 text-right text-xs text-zinc-500 font-mono">
                {Math.floor(xpProgress * 100)}% to next belt
              </div>
            </div>

            {/* Stats Grid - Fixed Height */}
            <div className="grid grid-cols-3 gap-4 mt-auto">
              <div className="bg-zinc-950/50 rounded-2xl p-4 text-center border border-zinc-800/50 h-32 flex flex-col items-center justify-center">
                <div className="text-2xl font-black text-white mb-1">{userStats.streak}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">연속 수련일</div>
              </div>
              <div className="bg-zinc-950/50 rounded-2xl p-4 text-center border border-zinc-800/50 h-32 flex flex-col items-center justify-center">
                <div className="text-lg font-black text-white mb-1 leading-tight">
                  {currentBelt?.name || 'White'}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">현재 벨트</div>
              </div>
              <div className="bg-zinc-950/50 rounded-2xl p-4 text-center border border-zinc-800/50 h-32 flex flex-col items-center justify-center">
                <div className="text-2xl font-black text-white mb-1">0</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">획득 배지</div>
              </div>
            </div>
          </div>

          {/* Right: AI Coach Insight - 4 columns on desktop */}
          <div className="lg:col-span-4 relative overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border border-white/5 p-6 md:p-8 rounded-[32px] group flex flex-col h-full">
            {/* Radial Glow Effect */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 h-full flex flex-col">
              <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">AI Coach Insight</h3>
                  <p className="text-white/60 text-xs">최근 스파링 분석 기반</p>
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center min-h-0">
                {aiCoachResults.length > 0 ? (
                  <div className="space-y-4">
                    {aiCoachResults.slice(0, 3).map((result, idx) => (
                      <div key={idx} className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group/item">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${result.type === 'strength' ? 'bg-emerald-500/20 text-emerald-400' :
                            result.type === 'weakness' ? 'bg-rose-500/20 text-rose-400' : 'bg-violet-500/20 text-violet-400'
                            } uppercase tracking-tight`}>
                            {result.type === 'strength' ? 'STRENGTH' : result.type === 'weakness' ? 'WEAKNESS' : 'SUGGESTION'}
                          </span>
                          <p className="text-sm text-zinc-100 font-bold">{result.message}</p>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed pl-1">{result.detail}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-white/50 text-sm mb-4 leading-relaxed">
                      아직 분석된 데이터가 없습니다.<br />
                      수련 일지를 바탕으로 AI 코칭을 시작해보세요.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleStartAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-6 py-4 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 rounded-2xl text-sm font-bold text-violet-100 transition-all backdrop-blur-md disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.15)] group/btn flex-shrink-0"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    <span className="animate-pulse">데이터 분석 중...</span>
                  </>
                ) : (
                  <>
                    <Zap className={`w-4 h-4 ${aiCoachResults.length > 0 ? 'text-violet-400 fill-violet-400' : 'text-zinc-400'} transition-colors`} />
                    {aiCoachResults.length > 0 ? '전술 재분석 실행' : '전술 분석 시작하기'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Grid Section: AI Tailored Recommendations */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-zinc-100" />
          <h2 className="text-xl font-bold text-zinc-100">AI 맞춤 추천</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Recommended Course (1) */}
          {recCourse && (
            <div
              onClick={() => navigate(`/courses/${recCourse.id}`)}
              className="group relative aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer bg-zinc-900 border border-zinc-800 md:col-span-2 lg:col-span-1"
            >
              <img src={recCourse.thumbnailUrl} alt={recCourse.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
              <div className="absolute top-4 left-4 bg-violet-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Recommended Course</div>
              <div className="absolute bottom-0 left-0 w-full p-6">
                <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 mb-1">{recCourse.title}</h3>
                <p className="text-xs text-zinc-400">{recCourse.creatorName}</p>
              </div>
            </div>
          )}

          {/* 2. Recommended Routines (2) */}
          <div className="flex flex-col gap-6 md:col-span-1 lg:col-span-1">
            {recRoutines.map((routine) => (
              <div
                key={`rec-routine-${routine.id}`}
                onClick={() => navigate(`/routines/${routine.id}`)}
                className="group flex flex-row bg-zinc-900/30 border border-zinc-800/50 rounded-[32px] overflow-hidden h-[180px] cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
              >
                {/* Left: Thumbnail (9:16 Aspect) */}
                <div className="w-[100px] h-full relative overflow-hidden shrink-0">
                  <img
                    src={routine.thumbnailUrl}
                    alt={routine.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-zinc-900/40" />
                </div>

                {/* Right: Content Section */}
                <div className="flex-1 p-4 flex flex-col justify-between relative pl-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-1 h-1 rounded-full bg-violet-500" />
                      <span className="text-violet-400/80 text-[9px] font-black uppercase tracking-[0.2em]">FOCUS</span>
                    </div>
                    <h3 className="text-zinc-50 text-lg font-black tracking-tight leading-tight mb-1.5 group-hover:text-violet-300 transition-colors line-clamp-1">
                      {routine.title}
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                          <Clock className="w-3 h-3 text-zinc-500" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400">{routine.totalDurationMinutes}m</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                          <Activity className="w-3 h-3 text-zinc-500" />
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400">{routine.difficulty || 'Beginner'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end">
                      <div className="flex items-center gap-1.5 text-zinc-100 text-[10px] font-black uppercase tracking-widest group/btn py-1.5 px-3 rounded-full bg-zinc-800/30 border border-zinc-700/30 hover:bg-violet-600 hover:border-violet-400 transition-all duration-300 whitespace-nowrap">
                        <span>Start</span>
                        <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 3. Recommended Sparring Videos (3) */}
          <div className="grid grid-cols-1 gap-4 md:col-span-1 lg:col-span-1">
            {recSparring.map((video) => (
              <div
                key={`rec-sparring-${video.id}`}
                onClick={() => navigate(`/sparring/${video.id}`)}
                className="flex items-center gap-4 p-4 rounded-3xl bg-zinc-950 border border-zinc-800/30 hover:border-violet-500/30 transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden relative flex-shrink-0">
                  <img src={video.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Play className="w-4 h-4 text-white fill-current" /></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-wider mb-0.5">Study Sparring</div>
                  <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors truncate">{video.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>

        {(!recCourse && recRoutines.length === 0 && recSparring.length === 0) && (
          <div className="bg-zinc-900/40 border border-zinc-800 border-dashed p-12 rounded-[32px] text-center">
            <Sparkles className="w-8 h-8 text-zinc-800 mx-auto mb-4" />
            <p className="text-zinc-500 text-sm">
              AI 분석을 시작하여 맞춤 추천 영상을 확인해보세요.
            </p>
          </div>
        )}
      </section>

      {/* 4. Bottom Section: Quick Access & Recent Activity */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Recommendation Routine */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-zinc-100 mb-4">오늘의 무료 루틴</h2>
            <div className="space-y-3">
              {proRoutines.map((routine) => (
                <div
                  key={routine.id}
                  onClick={() => navigate(`/routines/${routine.id}`)}
                  className="group flex flex-row bg-zinc-900/30 border border-zinc-800/50 rounded-[32px] overflow-hidden h-[180px] cursor-pointer transition-all duration-500 hover:border-violet-500/50 hover:bg-zinc-900/60 hover:shadow-[0_20px_50px_rgba(124,58,237,0.1)] relative"
                >
                  {/* Left: Thumbnail (9:16 Aspect) */}
                  <div className="w-[100px] h-full relative overflow-hidden shrink-0">
                    {routine.thumbnailUrl ? (
                      <img
                        src={routine.thumbnailUrl}
                        alt={routine.title}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 grayscale-[0.2] group-hover:grayscale-0"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                        <Activity className="w-8 h-8" />
                      </div>
                    )}
                    {/* Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/0 via-black/0 to-zinc-900/40" />
                  </div>

                  {/* Right: Content Section */}
                  <div className="flex-1 p-4 flex flex-col justify-between relative pl-5">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-1 h-1 rounded-full bg-violet-500" />
                        <span className="text-violet-400/80 text-[9px] font-black uppercase tracking-[0.2em]">DAILY</span>
                      </div>
                      <h3 className="text-zinc-50 text-lg font-black tracking-tight leading-tight mb-1.5 group-hover:text-violet-300 transition-colors line-clamp-1">
                        {routine.title}
                      </h3>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                            <Clock className="w-3 h-3 text-zinc-500" />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400">{routine.totalDurationMinutes}m</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <div className="p-1 rounded-lg bg-zinc-800/50 border border-zinc-700/30">
                            <Activity className="w-3 h-3 text-zinc-500" />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400">{routine.difficulty || 'Beginner'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <div className="flex items-center gap-1.5 text-zinc-100 text-[10px] font-black uppercase tracking-widest group/btn py-1.5 px-3 rounded-full bg-zinc-800/30 border border-zinc-700/30 hover:bg-violet-600 hover:border-violet-400 transition-all duration-300 whitespace-nowrap">
                          <span>Start</span>
                          <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {proRoutines.length === 0 && (
                <div className="p-4 text-center text-zinc-500 text-sm">
                  무료 루틴이 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Recent Views */}
          <div>
            <h2 className="text-lg font-bold text-zinc-100 mb-4">최근 본 레슨</h2>
            <div className="bg-zinc-900/20 border border-zinc-800/50 rounded-[32px] p-6 min-h-[300px]">
              <div className="space-y-4">
                {recentActivity.filter(i => i.type === 'lesson').slice(0, 5).map((item) => (
                  <div
                    key={`recent-${item.id}`}
                    onClick={() => navigate(`/courses/${item.id}`)}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex-shrink-0 overflow-hidden relative">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Video className="w-4 h-4 text-zinc-500" /></div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                    <div className="min-w-0 flex-1 border-b border-zinc-800/50 pb-3 group-last:border-0">
                      <p className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors truncate">{item.title}</p>
                      <p className="text-[10px] text-zinc-500 capitalize">{item.courseTitle || 'Lesson'}</p>
                    </div>
                  </div>
                ))}
                {recentActivity.filter(i => i.type === 'lesson').length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-20 text-zinc-600 gap-2">
                    <Activity className="w-8 h-8 opacity-20" />
                    <p className="text-xs">최근 활동이 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
