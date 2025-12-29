import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle,
  Sword, Dumbbell, BookOpen, Activity, Bot, Flame, Trophy,
  Calendar, Lock, Star, TrendingUp, X, Package, Clock, CheckCircle2, Sparkles, Award, Settings, Video
} from 'lucide-react';
import { Button } from '../components/Button';
import { getUserProgress, getDailyQuests } from '../lib/api';
import { getBeltInfo, getXPProgress, getXPToNextBelt, getBeltIcon } from '../lib/belt-system';
import {
  getTrainingLogs, getDrillRoutines, getPublicSparringVideos, getBundles, getCourses,
  getDrills, getPublicTrainingLogs, getRecentActivity, getDailyRoutine
} from '../lib/api';
import { Course, Drill, TrainingLog, UserProgress, DailyQuest, DrillRoutine, Bundle, SparringVideo } from '../types';
import { checkPatchUnlocks, Patch } from '../components/PatchDisplay';
import { LoadingScreen } from '../components/LoadingScreen';
import { CourseCard } from '../components/CourseCard';
import { AICoachWidget } from '../components/journal/AICoachWidget';
import { DailyQuestsPanel } from '../components/DailyQuestsPanel';
import { supabase } from '../lib/supabase';
import { LeaderboardPanel } from '../components/LeaderboardPanel';

// const QUEST_INFO: Record<string, { icon: string; name: string }> = {
//   watch_lesson: { icon: '📺', name: '레슨 시청' },
//   write_log: { icon: '📝', name: '수련일지 작성' },
//   tournament: { icon: '⚔️', name: '시합 참여' },
//   add_skill: { icon: '🎯', name: '기술 추가' },
//   give_feedback: { icon: '💬', name: '피드백 주기' },
//   sparring_review: { icon: '🥋', name: '스파링 복기' },
//   master_skill: { icon: '🏆', name: '기술 마스터' },
//   complete_routine: { icon: '🔥', name: '루틴 완료' }
// };

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]); // Public Feed
  const [myLogs, setMyLogs] = useState<TrainingLog[]>([]); // Personal for AI
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<DrillRoutine | null>(null);
  const [activeTab, setActiveTab] = useState<'lesson' | 'drill' | 'sparring' | 'recent'>('lesson');
  const [recommendedBundles, setRecommendedBundles] = useState<Bundle[]>([]);
  const [proRoutines, setProRoutines] = useState<DrillRoutine[]>([]);
  const [publicSparrings, setPublicSparrings] = useState<SparringVideo[]>([]);

  // Modal States
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showBeltModal, setShowBeltModal] = useState(false);
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [selectedPatch, setSelectedPatch] = useState<any | null>(null);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [isSubscriber, setIsSubscriber] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Mock User Stats
  const userStats = {
    streak: 0,
    weeklyActivity: [false, false, false, false, false, false, false],
    totalSkills: 0,
    masteredSkills: 0,
    tournamentWins: 0,
    trainingLogs: 0
  };

  // Calculate patches
  const patches = checkPatchUnlocks({
    streak: userStats.streak,
    totalSkills: userStats.totalSkills,
    masteredSkills: userStats.masteredSkills,
    tournamentWins: userStats.tournamentWins,
    trainingLogs: userStats.trainingLogs,
    level: progress?.beltLevel || 0
  });
  const unlockedPatches = patches.filter(p => p.unlocked);

  useEffect(() => {
    if (!user) {
      setLoading(false); // Fix infinite loading trap
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
        setIsSubscriber(userData?.is_subscriber || false);
        if (userData?.avatar_url) setUserAvatar(userData.avatar_url);
        if (userData?.name) setUserName(userData.name);

        // Fetch user progress
        const userProgress = await getUserProgress(user.id);
        setProgress(userProgress);

        // Fetch daily quests
        const dailyQuests = await getDailyQuests(user.id);
        setQuests(dailyQuests);

        // Fetch content
        const courses = await getCourses();
        setRecommendedCourses(courses.slice(0, 8));

        const drillsData = await getDrills();
        if (drillsData) setDrills(drillsData.slice(0, 6));

        const { data: logsData } = await getPublicTrainingLogs(1, 5);
        if (logsData) setTrainingLogs(logsData);

        const sparringsData = await getPublicSparringVideos(6);
        setPublicSparrings(sparringsData);

        // Fetch personal logs for AI Coach
        const { data: myLogsData } = await getTrainingLogs(user.id);
        if (myLogsData) setMyLogs(myLogsData);

        // Fetch recent activity
        const recent = await getRecentActivity(user.id);
        setRecentActivity(recent);

        // Fetch daily routine
        const { data: routineData } = await getDailyRoutine();
        setDailyRoutine(routineData);

        const bundlesRes = await getBundles();
        const bundlesData = (bundlesRes as any).data || bundlesRes;
        if (bundlesData && Array.isArray(bundlesData)) setRecommendedBundles(bundlesData.slice(0, 3));

        const routinesRes = await getDrillRoutines();
        const routinesData = (routinesRes as any).data || routinesRes;
        if (routinesData && Array.isArray(routinesData)) setProRoutines(routinesData.slice(0, 5));

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

  // Belt info
  const currentBelt = progress ? getBeltInfo(progress.beltLevel) : null;
  const nextBelt = progress ? getBeltInfo(progress.beltLevel + 1) : null;
  const xpProgress = progress ? getXPProgress(progress.totalXp, progress.beltLevel) : 0;
  const xpToNext = progress ? getXPToNextBelt(progress.beltLevel) : 0;
  const beltIcon = currentBelt ? getBeltIcon(currentBelt.belt) : '🥋';

  // Mock values for Arena Growth section
  const streak = userStats.streak;
  const userLevel = progress?.beltLevel || 1;
  const currentXP = progress?.totalXp || 0;
  // xpToNext is already calculated above for belt, assuming level XP is similar or derived.
  // For simplicity, reusing xpToNext from belt calculation, or could be a separate level system.
  const levelProgress = xpProgress * 100;


  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24 md:pb-10">
      {/* 1. Top Section: Today's Routine */}
      <section className="relative pt-8 pb-10 px-4 md:px-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800/50">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">
                환영합니다, {userName || user?.user_metadata?.name || user?.email?.split('@')[0]}님!
              </h1>
              <p className="text-slate-400 text-sm">오늘의 수련을 시작해보세요 🥋</p>
            </div>
            <div
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 transition-colors"
            >
              {userAvatar || user?.user_metadata?.avatar_url ? (
                <img
                  src={userAvatar || user?.user_metadata?.avatar_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-indigo-400">
                  {userName?.[0] || user?.user_metadata?.name?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              오늘의 루틴
            </h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
              {new Date().toLocaleDateString()}
            </span>
          </div>

          {dailyRoutine ? (
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300 shadow-lg shadow-indigo-900/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-600/20 transition-all duration-500"></div>

              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">
                        {dailyRoutine.difficulty || 'BEGINNER'}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">
                        {dailyRoutine.category || 'GENERAL'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">{dailyRoutine.title}</h3>
                    <p className="text-slate-300 text-sm mb-5 max-w-lg leading-relaxed line-clamp-2">
                      {dailyRoutine.description}
                    </p>
                    <div className="flex items-center gap-5 text-sm text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span className="font-medium">{dailyRoutine.totalDurationMinutes || 15}분 소요</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span className="font-medium">{(dailyRoutine.drillCount || 5) * 20} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() => navigate(`/routines/${dailyRoutine.id}`)}
                      className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group/btn"
                    >
                      <Play className="w-5 h-5 fill-white group-hover/btn:scale-110 transition-transform" />
                      루틴 시작하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
              <p className="text-slate-400 mb-2">오늘의 추천 루틴을 준비 중입니다.</p>
              <Button onClick={() => navigate('/arena?tab=routines')} variant="outline">
                전체 루틴 보기
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 2. Arena Growth (Moved Up) */}
      <section className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => navigate('/arena')}>
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <h2 className="text-lg font-bold text-white">아레나 성장</h2>
          <ChevronRight className="w-4 h-4 text-slate-500" />
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur-lg opacity-20 animate-pulse"></div>
              <div className="relative w-full h-full bg-slate-800 rounded-full border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                {user?.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-slate-500">{user?.email?.[0].toUpperCase() || 'U'}</span>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-slate-900 rounded-full flex items-center justify-center border border-slate-700">
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-ping absolute opacity-75"></div>
                <div className="w-3 h-3 bg-emerald-500 rounded-full relative"></div>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white">{user?.user_metadata?.full_name || '나의 아레나'}</h3>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 text-[10px] font-bold rounded border border-indigo-500/30">Lv. {userLevel}</span>
              </div>

              {/* Level Progress */}
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-1.5">
                <div
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
                  style={{ width: `${levelProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{currentXP} XP</span>
                <span>Next: {xpToNext} XP</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setShowMissionModal(true)}>
              <div className="text-xl font-black text-white mb-1 group-hover:scale-110 transition-transform">🔥 {streak}</div>
              <div className="text-[10px] text-slate-400">일 연속 수련</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setShowBeltModal(true)}>
              <div className="text-xl font-black text-white mb-1 group-hover:scale-110 transition-transform">🥋 {currentBelt?.name || 'White'}</div>
              <div className="text-[10px] text-slate-400">현재 벨트</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-3 text-center border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group" onClick={() => setShowPatchModal(true)}>
              <div className="text-xl font-black text-white mb-1 group-hover:scale-110 transition-transform">🏆 {unlockedPatches.length}</div>
              <div className="text-[10px] text-slate-400">획득 패치</div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Sparring Review & AI Analysis (Moved Up) */}
      <section className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" />
          스파링 복기 & AI 분석
        </h2>

        <div className="flex flex-col gap-4">
          {/* AI Coach Analysis Widget */}
          <AICoachWidget logs={myLogs} />
        </div>
      </section>

      {/* 4. AI Recommended (Class & Routine) */}
      <section className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">AI 맞춤 추천</h2>
          </div>
        </div>

        <div className="flex flex-col gap-8">
          {/* AI Recommended Class (Grid) */}
          {recommendedCourses.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-200">추천 클래스</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recommendedCourses.slice(0, 2).map((course) => (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="relative w-full aspect-[16/9] bg-slate-900 rounded-2xl overflow-hidden group cursor-pointer border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xl"
                  >
                    <img src={course.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent"></div>

                    <div className="absolute inset-0 p-6 flex flex-col justify-end">
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-md mb-2 w-fit">
                        <Bot className="w-3 h-3 text-indigo-300" />
                        <span className="text-[10px] font-bold text-indigo-200">AI Pick</span>
                      </div>

                      <h3 className="text-xl font-black text-white mb-1 leading-tight drop-shadow-lg line-clamp-1">{course.title}</h3>
                      <div className="flex items-center gap-3">
                        <Button onClick={(e) => { e.stopPropagation(); navigate(`/courses/${course.id}`); }} size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-bold border-0 h-8 px-4 text-xs">
                          <Play className="w-3 h-3 mr-1.5 fill-slate-900" />
                          수강하기
                        </Button>
                        <span className="text-xs text-slate-300">{course.lessonCount}강 · {course.difficulty || 'All Levels'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Recommended Routine (Horizontal Carousel) */}
          {proRoutines.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-200">추천 루틴</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
                {proRoutines.slice(0, 5).map((routine) => (
                  <div
                    key={routine.id}
                    onClick={() => !isSubscriber ? navigate('/pricing') : navigate(`/routines/${routine.id}`)}
                    className="relative min-w-[160px] md:min-w-[200px] aspect-[9/16] bg-slate-900 rounded-2xl overflow-hidden group cursor-pointer border border-slate-800 hover:border-emerald-500/50 transition-all shadow-xl snap-start"
                  >
                    <img src={routine.thumbnailUrl || 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff'} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>

                    {!isSubscriber && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] z-10">
                        <Lock className="w-8 h-8 text-amber-400 mb-2 drop-shadow-lg" />
                      </div>
                    )}

                    <div className="absolute inset-0 p-4 flex flex-col justify-end">
                      <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md mb-2 w-fit">
                        <Bot className="w-3 h-3 text-emerald-300" />
                        <span className="text-[10px] font-bold text-emerald-200">AI</span>
                      </div>

                      <h3 className="text-lg font-black text-white mb-1 leading-tight drop-shadow-lg line-clamp-2">{routine.title}</h3>
                      <div className="flex flex-col gap-2 mt-2">
                        <span className="text-xs text-slate-300">{routine.drillCount}개 드릴 · {routine.totalDurationMinutes}분</span>
                        <Button onClick={(e) => { e.stopPropagation(); !isSubscriber ? navigate('/pricing') : navigate(`/routines/${routine.id}`); }} size="sm" className={`w-full font-bold border-0 h-8 text-xs ${!isSubscriber ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-white text-slate-900 hover:bg-slate-100'}`}>
                          {!isSubscriber ? 'Pro 잠금해제' : (
                            <><Play className="w-3 h-3 mr-1.5 fill-slate-900" /> 시작하기</>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Content Section */}
      <section className="px-4 md:px-8 py-4 max-w-7xl mx-auto mt-4">
        {/* Explicit Title for Recent Views */}
        <h2 className="text-lg font-bold text-white mb-4 px-1">최근 시청 내역</h2>

        <div className="flex items-center gap-8 border-b border-slate-800 mb-6">
          {[
            { id: 'lesson', label: '레슨' },
            { id: 'drill', label: '드릴' },
            { id: 'sparring', label: '스파링' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 px-1 text-sm font-bold transition-all border-b-2 ${activeTab === tab.id
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* 1. LESSON TAB - HISTORY ONLY */}
          {activeTab === 'lesson' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentActivity.filter(i => i.type === 'lesson').length > 0 ? (
                recentActivity.filter(i => i.type === 'lesson').map(item => (
                  <div key={item.id} onClick={() => navigate(`/courses/${item.id}`)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-4 cursor-pointer hover:bg-slate-800 transition-colors">
                    <div className="w-24 h-14 bg-slate-800 rounded-lg overflow-hidden relative flex-shrink-0">
                      {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-900/20"><Play className="w-6 h-6 text-indigo-400" /></div>}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-slate-500">{item.courseTitle || '강의'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <p>최근 시청한 레슨이 없습니다.</p>
                  <Button variant="link" onClick={() => navigate('/courses')} className="mt-2 text-indigo-400">
                    전체 강의 보러가기
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 2. DRILL TAB - HISTORY ONLY */}
          {activeTab === 'drill' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentActivity.filter(i => i.type === 'drill' || i.type === 'routine').length > 0 ? (
                recentActivity.filter(i => i.type === 'drill' || i.type === 'routine').map(item => (
                  <div key={item.id} onClick={() => navigate(`/routines/${item.id}`)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-4 cursor-pointer hover:bg-slate-800 transition-colors">
                    <div className="w-24 h-14 bg-slate-800 rounded-lg overflow-hidden relative flex-shrink-0">
                      <div className="w-full h-full flex items-center justify-center bg-emerald-900/20"><Activity className="w-6 h-6 text-emerald-400" /></div>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-slate-500">{item.difficulty || 'Easy'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <p>최근 연습한 드릴이 없습니다.</p>
                  <Button variant="link" onClick={() => navigate('/drills')} className="mt-2 text-emerald-400">
                    드릴 찾아보기
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* 3. SPARRING TAB - HISTORY ONLY */}
          {activeTab === 'sparring' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentActivity.filter(i => i.type === 'sparring').length > 0 ? (
                recentActivity.filter(i => i.type === 'sparring').map(item => (
                  <div key={item.id} onClick={() => navigate(`/sparring/${item.id}`)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-4 cursor-pointer hover:bg-slate-800 transition-colors">
                    <div className="w-24 h-14 bg-slate-800 rounded-lg overflow-hidden relative flex-shrink-0">
                      {item.thumbnail ? (
                        <img src={item.thumbnail} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-900/20"><Video className="w-6 h-6 text-indigo-400" /></div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-slate-500">{item.creatorName || 'Sparring'}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  <p>최근 시청한 스파링이 없습니다.</p>
                  <Button variant="link" onClick={() => navigate('/sparring')} className="mt-2 text-blue-400">
                    스파링 보러가기
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      {/* 1. Daily Missions Modal */}
      {
        showMissionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowMissionModal(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Flame className="w-6 h-6 text-orange-500" /> 오늘의 미션
                </h3>
                <button onClick={() => setShowMissionModal(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <DailyQuestsPanel userId={user?.id || ''} />
            </div>
          </div>
        )
      }

      {/* 2. Belt Progress Modal */}
      {
        showBeltModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowBeltModal(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" /> 나의 성장
                </h3>
                <button onClick={() => setShowBeltModal(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col items-center mb-8">
                <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-slate-800 flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(79,70,229,0.3)] mb-4">
                  {beltIcon}
                </div>
                <h2 className="text-2xl font-black text-white mb-1">{currentBelt?.name}</h2>
                <p className="text-sm text-slate-400">Total XP: <span className="text-white font-bold">{progress?.totalXp?.toLocaleString()}</span></p>
              </div>

              <div className="space-y-4 bg-slate-950/50 rounded-xl p-5 border border-slate-800">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-400">Next Belt</span>
                  <span className="text-indigo-400 font-bold">{nextBelt?.name}</span>
                </div>
                <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-1000"
                    style={{ width: `${xpProgress * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <div className="text-center text-xs text-slate-500">
                  다음 승급까지 <span className="text-white font-bold">{((nextBelt?.xpRequired || 0) - (progress?.totalXp || 0)).toLocaleString()} XP</span> 남았습니다.
                </div>
              </div>

              <Button onClick={() => navigate('/arena')} className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-500">
                아레나 상세 보기
              </Button>
            </div>
          </div>
        )
      }

      {/* 3. Patch Modal */}
      {
        showPatchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPatchModal(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Award className="w-6 h-6 text-yellow-500" /> 보유 패치
                </h3>
                <button onClick={() => setShowPatchModal(false)} className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto pr-2 grid grid-cols-4 gap-4">
                {unlockedPatches.map((patch) => {
                  const Icon = patch.icon;
                  return (
                    <div key={patch.id} className="flex flex-col items-center gap-2" onClick={() => setSelectedPatch(patch)}>
                      <div className={`w-14 h-14 rounded-xl ${patch.color} flex items-center justify-center shadow-lg border-2 border-slate-700 hover:scale-110 transition-transform cursor-pointer`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <span className="text-[10px] text-center text-slate-400 font-medium leading-tight">{patch.name}</span>
                    </div>
                  );
                })}
                {unlockedPatches.length === 0 && (
                  <div className="col-span-4 py-10 text-center text-slate-500">
                    아직 획득한 패치가 없습니다. <br /> 꾸준히 수련하여 패치를 모아보세요!
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Selected Patch Details Modal (Existing Reuse) */}
      {
        selectedPatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPatch(null)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm text-center relative shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className={`w-20 h-20 mx-auto rounded-2xl ${selectedPatch.color} flex items-center justify-center mb-4 shadow-xl animate-bounce-custom`}>
                <selectedPatch.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">{selectedPatch.name}</h3>
              <p className="text-slate-400 mb-6 leading-relaxed">{selectedPatch.description}</p>
              <Button onClick={() => setSelectedPatch(null)} className="w-full bg-white text-slate-900 hover:bg-slate-200">
                멋져요!
              </Button>
            </div>
          </div>
        )
      }
    </div >
  );
};
