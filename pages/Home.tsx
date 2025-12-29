import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle,
  Sword, Dumbbell, BookOpen, Activity, Bot, Flame, Trophy,
  Calendar, Lock, Star, TrendingUp, X, Package, Clock
} from 'lucide-react';
import { Button } from '../components/Button';
import { getUserProgress, getDailyQuests } from '../lib/api';
import { getBeltInfo, getXPProgress, getXPToNextBelt, getBeltIcon } from '../lib/belt-system';
import {
  getCourses, getDrills, getPublicTrainingLogs, getRecentActivity, getDailyRoutine, getBundles,
  getTrainingLogs, getDrillRoutines
} from '../lib/api';
import { Course, Drill, TrainingLog, UserProgress, DailyQuest, DrillRoutine, Bundle } from '../types';
import { checkPatchUnlocks, Patch } from '../components/PatchDisplay';
import { LoadingScreen } from '../components/LoadingScreen';
import { AICoachWidget } from '../components/journal/AICoachWidget';
import { DailyQuestsPanel } from '../components/DailyQuestsPanel';
import { supabase } from '../lib/supabase';
import { Settings } from 'lucide-react';
import { LeaderboardPanel } from '../components/LeaderboardPanel';

const QUEST_INFO: Record<string, { icon: string; name: string }> = {
  watch_lesson: { icon: '📺', name: '레슨 시청' },
  write_log: { icon: '📝', name: '수련일지 작성' },
  tournament: { icon: '⚔️', name: '시합 참여' },
  add_skill: { icon: '🎯', name: '기술 추가' },
  give_feedback: { icon: '💬', name: '피드백 주기' },
  sparring_review: { icon: '🥋', name: '스파링 복기' },
  master_skill: { icon: '🏆', name: '기술 마스터' },
  complete_routine: { icon: '🔥', name: '루틴 완료' }
};

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
  const [activeTab, setActiveTab] = useState<'lesson' | 'drill' | 'sparring' | 'community'>('lesson');
  const [recommendedBundles, setRecommendedBundles] = useState<Bundle[]>([]);
  const [proRoutines, setProRoutines] = useState<DrillRoutine[]>([]);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);
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
        setRecommendedCourses(courses.slice(0, 4));

        const drillsData = await getDrills();
        if (drillsData) setDrills(drillsData.slice(0, 6));

        const { data: logsData } = await getPublicTrainingLogs(1, 5);
        if (logsData) setTrainingLogs(logsData);

        // Fetch personal logs for AI Coach
        const { data: myLogsData } = await getTrainingLogs(user.id);
        if (myLogsData) setMyLogs(myLogsData);

        // Fetch recent activity
        const recent = await getRecentActivity(user.id);
        setRecentActivity(recent);

        // Fetch daily routine
        const { data: routineData } = await getDailyRoutine();
        setDailyRoutine(routineData);

        const { data: bundlesData } = await getBundles();
        if (bundlesData) setRecommendedBundles(bundlesData.slice(0, 3));

        // Fetch Pro Routines (Mocking "Pro" by selecting Intermediate/Advanced or specific Logic)
        const allRoutines = await getDrillRoutines();
        if (allRoutines && allRoutines.length > 0) {
          // Shuffle all routines first for random Pro/Daily fallback
          const shuffledRoutines = [...allRoutines];
          for (let i = shuffledRoutines.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledRoutines[i], shuffledRoutines[j]] = [shuffledRoutines[j], shuffledRoutines[i]];
          }

          // 🧠 AI Recommendation Check
          const savedRecommendations = localStorage.getItem('gemini_recommendations');
          const aiRecs = savedRecommendations ? JSON.parse(savedRecommendations) : null;

          if (aiRecs && aiRecs.length > 0) {
            // Transform AI result to match Pro Routine display
            const transformedRecs = aiRecs
              .filter((r: any) => r.recommendedRoutine)
              .map((r: any) => ({
                ...r.recommendedRoutine,
                // Inject AI context into description
                description: `💡 AI 분석: ${r.message} - ${r.detail}`,
                difficulty: r.type === 'weakness' ? 'WEAKNESS' : 'STRENGTH',
                aiReason: r.message
              }));

            if (transformedRecs.length > 0) {
              setProRoutines(transformedRecs.slice(0, 2));
            } else {
              // Fallback if AI suggested courses but no routines - Use shuffled list
              const pros = shuffledRoutines.filter(r => r.id !== routineData?.id).slice(0, 2);
              setProRoutines(pros);
            }
          } else {
            // Standard Pro Logic (Intermediate/Advanced) - Use shuffled list
            const pros = shuffledRoutines.filter(r => r.id !== routineData?.id).slice(0, 2);
            setProRoutines(pros);
          }
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

  // Belt info
  const currentBelt = progress ? getBeltInfo(progress.beltLevel) : null;
  const nextBelt = progress ? getBeltInfo(progress.beltLevel + 1) : null;
  const xpProgress = progress ? getXPProgress(progress.totalXp, progress.beltLevel) : 0;
  const xpToNext = progress ? getXPToNextBelt(progress.beltLevel) : 0;
  const beltIcon = currentBelt ? getBeltIcon(currentBelt.belt) : '🥋';

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

      {/* 2. Recommended Routine (Pro) */}
      <section className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            추천 루틴 (Pro)
          </h2>
          <button onClick={() => navigate('/arena?tab=routines')} className="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
            더 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(proRoutines.length > 0 ? proRoutines : [{ id: 'mock-1' }, { id: 'mock-2' }]).map((routine: any, i) => (
            <div key={routine.id || i} className={`relative bg-slate-900 border rounded-xl overflow-hidden group transition-all h-[240px] flex flex-col justify-end ${routine.difficulty === 'WEAKNESS' ? 'border-red-500/30 hover:border-red-500/50' :
              routine.difficulty === 'STRENGTH' ? 'border-emerald-500/30 hover:border-emerald-500/50' :
                'border-slate-800 hover:border-slate-700'
              }`}>

              {/* Background Image with Gradient Overlay */}
              <img src={routine.thumbnailUrl || 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?auto=format&fit=crop&q=80'} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"></div>

              {!isSubscriber ? (
                <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center h-full backdrop-blur-[2px]">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">Pro 전용 추천</h3>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold py-2 px-6 rounded-full hover:brightness-110 transition-all shadow-lg"
                  >
                    잠금해제
                  </button>
                </div>
              ) : (
                <div className="relative z-10 p-5">
                  <div className="mb-2 flex gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${routine.difficulty === 'WEAKNESS' ? 'bg-red-500/20 text-red-200 border-red-500/30' :
                      routine.difficulty === 'STRENGTH' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30' :
                        'bg-amber-500/20 text-amber-200 border-amber-500/30'
                      }`}>
                      {routine.difficulty === 'WEAKNESS' ? '약점 보완' : '강점 강화'}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 leading-tight">{routine.title || 'Pro 맞춤형 루틴'}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-300">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {routine.totalDurationMinutes || 20}분</span>
                    <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" /> {routine.drillCount || 5}개 드릴</span>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/routines/${routine.id}`);
                    }}
                    size="sm"
                    className="absolute top-4 right-4 w-10 h-10 rounded-full p-0 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20"
                  >
                    <Play className="w-4 h-4 fill-white" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 3. Arena Growth */}
      <section className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
          <TrendingUp className="w-5 h-5 text-green-400" />
          아레나 성장
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          {/* Left Column (2/3): Stats, Belt & Missions */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Stats & Belt Block */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center gap-1.5 text-orange-400 font-black text-3xl mb-1">
                      <Flame className="w-6 h-6 fill-orange-400" />
                      {userStats.streak}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">연속 출석</div>
                  </div>
                  <div className="h-10 w-px bg-slate-800"></div>
                  <div>
                    <div className="text-white font-black text-2xl mb-1">{progress?.totalXp?.toLocaleString() || 0}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">총 경험치</div>
                  </div>
                </div>

                {/* Weekly Graph */}
                <div className="flex flex-col items-end gap-2">
                  <div className="flex gap-1.5">
                    {userStats.weeklyActivity.map((active, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className={`w-2.5 h-10 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-800'}`}></div>
                      </div>
                    ))}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">주간 활동</div>
                </div>
              </div>

              {/* Belt Progress */}
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-3xl shadow-lg">
                        {beltIcon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{currentBelt?.name}</div>
                        <div className="text-xs text-slate-400">다음: {nextBelt?.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium mb-1">{Math.round(xpProgress * 100)}%</div>
                    </div>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out relative bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${xpProgress * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Missions Block (Moved here) */}
            <div className="flex-1 min-h-[360px]">
              <DailyQuestsPanel userId={user?.id || ''} />
            </div>
          </div>

          {/* Right Column (1/3): Leaderboard & Patches */}
          <div className="flex flex-col gap-4">
            {/* 1. Leaderboard */}
            <div className="h-[400px]">
              <LeaderboardPanel currentUserId={user?.id || ''} />
            </div>

            {/* 2. Mini Patch Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col hover:border-slate-700 transition-colors flex-1">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>🎖️</span> 보유 패치
                </h3>
                <span className="text-xs text-slate-500 cursor-pointer hover:text-white" onClick={() => setSelectedPatch(unlockedPatches[0])}>전체보기</span>
              </div>

              {unlockedPatches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {unlockedPatches.slice(0, 4).map((patch) => {
                    const Icon = patch.icon;
                    return (
                      <div
                        key={patch.id}
                        onClick={() => setSelectedPatch(patch)}
                        className={`w-8 h-8 rounded-lg ${patch.color} flex items-center justify-center shadow-sm border border-white/10 cursor-pointer hover:scale-110 transition-transform`}
                        title={patch.name}
                      >
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                    );
                  })}
                  {unlockedPatches.length > 4 && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                      +{unlockedPatches.length - 4}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-2">획득한 패치가 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </section >

      {/* 4. Sparring Review + AI Analysis */}
      < section className="px-4 md:px-8 py-6 max-w-7xl mx-auto" >
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
          <BookOpen className="w-5 h-5 text-blue-400" />
          스파링 복기 & AI 분석
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Review (Journal Style) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">최근 스파링 기록</h3>
                  <p className="text-xs text-slate-500">{myLogs.length > 0 ? '지난 수련 내용 복습' : '기록이 없습니다'}</p>
                </div>
              </div>
              {myLogs.length > 0 && <span className="text-xs text-slate-500">{new Date(myLogs[0].date).toLocaleDateString()}</span>}
            </div>

            {myLogs.length > 0 ? (
              <div className="bg-slate-950/80 rounded-lg p-4 border border-slate-800">
                <div className="flex gap-2 mb-2">
                  {((myLogs[0] as any).tags || ['스파링', '오픈매트']).slice(0, 2).map((tag: string) => (
                    <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">#{tag}</span>
                  ))}
                </div>
                <p className="text-sm text-slate-300 line-clamp-2 mb-3">"{myLogs[0].notes || '내용이 없습니다.'}"</p>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  {/* Fake stats for visual consistency */}
                  <span className="flex items-center gap-1">⏱️ {myLogs[0].durationMinutes || 5}분</span>
                  <span className="flex items-center gap-1">🥋 스파링</span>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed flex items-center justify-center p-4">
                <p className="text-sm text-slate-500">아직 작성된 스파링 복기가 없습니다.</p>
              </div>
            )}

            <Button onClick={() => navigate('/arena?tab=sparring')} variant="outline" className="w-full">
              작성하러 가기
            </Button>
          </div>

          {/* AI Analysis (Pro Locked -> AI Coach Widget) */}
          <div className="h-full">
            <AICoachWidget
              logs={myLogs}
              isLocked={!isSubscriber}
              autoRun={false}
            />
          </div>
        </div>
      </section >

      {/* 5. Content Section */}
      {/* 5. Content Section */}
      <section className="px-4 md:px-8 py-8 max-w-7xl mx-auto border-t border-slate-800/50 mt-4">
        <div className="flex items-center gap-8 border-b border-slate-800 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'lesson', label: '레슨', color: 'indigo' },
            { id: 'drill', label: '드릴', color: 'emerald' },
            { id: 'sparring', label: '스파링', color: 'blue' },
            { id: 'community', label: '커뮤니티', color: 'pink' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-sm font-bold transition-colors relative whitespace-nowrap px-1 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              {tab.label}
              {activeTab === tab.id && (
                <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${tab.color}-500 rounded-t-full shadow-[0_-2px_8px_rgba(var(--${tab.color}-500),0.5)]`}></div>
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {/* 1. LESSON TAB */}
          {activeTab === 'lesson' && (
            <div className="space-y-6">
              {/* 1-1. Recent Lessons */}
              {recentActivity.filter(i => i.type === 'lesson').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400">최근 시청한 레슨</h3>
                  {recentActivity.filter(i => i.type === 'lesson').slice(0, 2).map(item => (
                    <div key={item.id} onClick={() => navigate(`/courses/${item.id}`)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-4 cursor-pointer hover:bg-slate-800 transition-colors">
                      <div className="w-24 h-14 bg-slate-800 rounded-lg overflow-hidden relative">
                        {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-indigo-900/20"><Play className="w-6 h-6 text-indigo-400" /></div>}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.courseTitle || '강의'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 1-2. Recommended Courses */}
              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">추천 강의</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {recommendedCourses.map(course => (
                    <div key={course.id} onClick={() => navigate(`/courses/${course.id}`)} className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer">
                      <div className="aspect-video relative">
                        <img src={course.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div className="absolute inset-0 bg-black/40"></div>
                        <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white font-bold">{course.lessonCount}강</div>
                      </div>
                      <div className="p-3">
                        <h4 className="font-bold text-white text-sm line-clamp-1 group-hover:text-indigo-400">{course.title}</h4>
                        <p className="text-xs text-slate-500">{course.creatorName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. DRILL TAB */}
          {activeTab === 'drill' && (
            <div className="space-y-6">
              {/* 2-1. Recent Drills */}
              {recentActivity.filter(i => i.type === 'drill' || i.type === 'routine').length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-bold text-slate-400">최근 연습한 드릴</h3>
                  {recentActivity.filter(i => i.type === 'drill' || i.type === 'routine').slice(0, 2).map(item => (
                    <div key={item.id} onClick={() => navigate(`/routines/${item.id}`)} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-4 cursor-pointer hover:bg-slate-800 transition-colors">
                      <div className="w-24 h-14 bg-slate-800 rounded-lg overflow-hidden relative">
                        <div className="w-full h-full flex items-center justify-center bg-emerald-900/20"><Activity className="w-6 h-6 text-emerald-400" /></div>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-slate-500">{item.difficulty || 'Easy'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">전체 드릴 목록</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {drills.map(drill => (
                    <div key={drill.id} onClick={() => navigate(`/drills/${drill.id}`)} className="aspect-[9/16] bg-slate-900 rounded-xl relative overflow-hidden group cursor-pointer border border-slate-800 hover:border-emerald-500/50 transition-all">
                      <img src={drill.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent"></div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h4 className="text-white text-xs font-bold line-clamp-2 leading-tight group-hover:text-emerald-400">{drill.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. SPARRING TAB */}
          {activeTab === 'sparring' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-900/20 to-slate-900 border border-blue-500/30 rounded-2xl p-6 text-center">
                <h3 className="text-lg font-bold text-white mb-2">스파링 분석 신청</h3>
                <p className="text-sm text-slate-400 mb-4">스파링 영상을 업로드하고 AI 코치의 분석을 받아보세요.</p>
                <Button onClick={() => navigate('/arena?tab=sparring')} className="bg-blue-600 hover:bg-blue-500">분석 시작하기</Button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-400 mb-3">나의 스파링 기록</h3>
                {myLogs.length > 0 ? (
                  <div className="space-y-3">
                    {myLogs.map(log => (
                      <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-slate-500">{new Date(log.date).toLocaleDateString()}</span>
                          <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] rounded border border-blue-500/20">분석 완료</span>
                        </div>
                        <p className="text-sm text-white line-clamp-2">{log.notes}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-500">기록이 없습니다.</div>
                )}
              </div>
            </div>
          )}

          {/* 4. COMMUNITY TAB (Used to be Feed) */}
          {activeTab === 'community' && (
            <div className="space-y-4">
              {trainingLogs.map(log => (
                <div key={log.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 flex gap-4 hover:border-slate-700 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-sm font-bold text-slate-400 border border-slate-700">
                    {log.userName?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-white">{log.userName || '익명'}</h4>
                      <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-slate-300 mb-3 line-clamp-2 leading-relaxed">{log.notes}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5 hover:text-pink-400 transition-colors cursor-pointer"><Heart className="w-3.5 h-3.5" /> {log.likes || 0}</span>
                      <span className="flex items-center gap-1.5 hover:text-blue-400 transition-colors cursor-pointer"><MessageCircle className="w-3.5 h-3.5" /> {log.comments || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section >

      {/* Patch Detail Modal */}
      {
        selectedPatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedPatch(null)}>
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl shadow-indigo-500/20 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setSelectedPatch(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className={`w-20 h-20 rounded-full ${selectedPatch.color} flex items-center justify-center shadow-xl mb-4 border-4 border-slate-800`}>
                  {React.createElement(selectedPatch.icon, { className: "w-10 h-10 text-white" })}
                </div>
                <h3 className="text-xl font-black text-white mb-1">{selectedPatch.name}</h3>
                <p className="text-slate-400 text-sm mb-4">{selectedPatch.description}</p>

                <div className="w-full bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">획득일</p>
                  <p className="text-sm font-bold text-white">
                    {selectedPatch.unlockedAt ? new Date(selectedPatch.unlockedAt).toLocaleDateString() : '알 수 없음'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};
