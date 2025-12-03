import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle,
  Sword, Dumbbell, BookOpen, Activity, Bot, Flame, Trophy,
  Calendar, Lock, Star, TrendingUp, X
} from 'lucide-react';
import { Button } from '../components/Button';
import { getUserProgress, getDailyQuests } from '../lib/api';
import { getBeltInfo, getXPProgress, getXPToNextBelt, getBeltIcon } from '../lib/belt-system';
import {
  getCourses, getDrills, getPublicTrainingLogs
} from '../lib/api';
import { Course, Drill, TrainingLog, UserProgress, DailyQuest } from '../types';
import { checkPatchUnlocks, Patch } from '../components/PatchDisplay';

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
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [activeTab, setActiveTab] = useState<'recent' | 'courses' | 'drills' | 'feed'>('recent');

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [quests, setQuests] = useState<DailyQuest[]>([]);
  const [selectedPatch, setSelectedPatch] = useState<Patch | null>(null);

  // Mock User Stats
  const userStats = {
    streak: 12,
    weeklyActivity: [true, true, false, true, true, false, true],
    totalSkills: 8,
    masteredSkills: 3,
    tournamentWins: 2,
    trainingLogs: 15
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

  // Mock Recent Activity
  const recentActivity = [
    { id: '101', type: 'lesson', title: 'Lesson 3: 암바 디테일', courseTitle: '화이트벨트 탈출기', progress: 75, thumbnail: 'bg-blue-900', lastWatched: '2시간 전' },
    { id: '205', type: 'drill', title: '힙 이스케이프 100회', difficulty: '초급', progress: 100, thumbnail: 'bg-emerald-900', lastWatched: '어제' },
    { id: '102', type: 'lesson', title: 'Lesson 4: 트라이앵글 초크', courseTitle: '화이트벨트 탈출기', progress: 10, thumbnail: 'bg-indigo-900', lastWatched: '3일 전' },
  ];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user progress
        const userProgress = await getUserProgress(user.id);
        setProgress(userProgress);

        // Fetch daily quests
        const dailyQuests = await getDailyQuests(user.id);
        setQuests(dailyQuests);

        // Fetch content
        const courses = await getCourses();
        setRecommendedCourses(courses.slice(0, 4));

        const { data: drillsData } = await getDrills();
        if (drillsData) setDrills(drillsData.slice(0, 6));

        const { data: logsData } = await getPublicTrainingLogs(1, 5);
        if (logsData) setTrainingLogs(logsData);

      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Belt info
  const currentBelt = progress ? getBeltInfo(progress.beltLevel) : null;
  const nextBelt = progress ? getBeltInfo(progress.beltLevel + 1) : null;
  const xpProgress = progress ? getXPProgress(progress.totalXp, progress.beltLevel) : 0;
  const xpToNext = progress ? getXPToNextBelt(progress.beltLevel) : 0;
  const beltIcon = currentBelt ? getBeltIcon(currentBelt.belt) : '🥋';

  const totalQuestXP = quests.reduce((sum, q) => sum + q.xpReward, 0);
  const earnedQuestXP = quests.filter(q => q.completed).reduce((sum, q) => sum + q.xpReward, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      {/* 1. Top Section: Today's Routine */}
      <section className="relative pt-8 pb-10 px-4 md:px-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800/50">
        <div className="absolute top-0 right-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-10%] left-[-5%] w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-black text-white mb-1">환영합니다, {user?.email?.split('@')[0]}님!</h1>
              <p className="text-slate-400 text-sm">오늘의 수련을 시작해보세요 🥋</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <span className="text-lg font-bold text-indigo-400">{user?.email?.[0].toUpperCase()}</span>
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

          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-300 shadow-lg shadow-indigo-900/10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-600/20 transition-all duration-500"></div>

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded border border-emerald-500/20">
                      BEGINNER
                    </span>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded border border-blue-500/20">
                      GUARD PASS
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-2">가드 패스 기본기 완성</h3>
                  <p className="text-slate-300 text-sm mb-5 max-w-lg leading-relaxed">
                    기본적인 토레안도 패스와 니컷 패스를 연결하는 드릴 루틴입니다.
                    하루 15분 투자로 가드 패스 성공률을 높이세요.
                  </p>
                  <div className="flex items-center gap-5 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-indigo-400" />
                      <span className="font-medium">15분 소요</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="font-medium">120 XP</span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <button
                    onClick={() => navigate('/arena?tab=routines')}
                    className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 px-8 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 group/btn"
                  >
                    <Play className="w-5 h-5 fill-white group-hover/btn:scale-110 transition-transform" />
                    루틴 시작하기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Recommended Routine (Pro) */}
      <section className="px-4 md:px-8 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            추천 루틴 (Pro)
          </h2>
          <button className="text-xs text-indigo-400 font-bold hover:text-indigo-300 transition-colors">
            더 보기
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="relative bg-slate-900/50 border border-slate-800 rounded-xl p-5 overflow-hidden group hover:border-slate-700 transition-all">
              {/* Lock Overlay */}
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[3px] z-20 flex flex-col items-center justify-center text-center p-4 transition-opacity duration-300">
                <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform">
                  <Lock className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Pro 전용 추천</h3>
                <p className="text-xs text-slate-400 mb-4">나의 약점을 보완하는 맞춤 루틴</p>
                <button
                  onClick={() => navigate('/subscription')}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold py-2 px-5 rounded-lg hover:brightness-110 transition-all shadow-lg shadow-orange-900/20"
                >
                  업그레이드하고 잠금해제
                </button>
              </div>

              {/* Blurred Content Preview */}
              <div className="opacity-30 blur-[1px]">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-lg bg-slate-800"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-700 rounded"></div>
                    <div className="h-3 w-1/2 bg-slate-800 rounded"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-slate-800 rounded"></div>
                  <div className="h-6 w-16 bg-slate-800 rounded"></div>
                </div>
              </div>
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
          {/* Stats & Graph & Patches (Left Column) */}
          <div className="lg:col-span-2 flex flex-col">
            {/* Stats & Belt */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-8">
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
                    <div className="text-white font-black text-2xl mb-1">{progress?.totalXp || 0}</div>
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
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/50 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl filter drop-shadow-md">{beltIcon}</span>
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
                    className="h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: `${xpProgress * 100}%`,
                      backgroundColor: currentBelt?.color === '#FFFFFF' ? '#94A3B8' : currentBelt?.color
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20"></div>
                  </div>
                </div>
              </div>

              {/* Patches (Moved Here) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <span>🎖️</span> 획득 패치
                  </h3>
                  <span className="text-xs text-slate-500">{unlockedPatches.length}개</span>
                </div>
                {unlockedPatches.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {unlockedPatches.map((patch) => {
                      const Icon = patch.icon;
                      return (
                        <button
                          key={patch.id}
                          onClick={() => setSelectedPatch(patch)}
                          className={`w-10 h-10 rounded-full ${patch.color} flex items-center justify-center shadow-md border border-white/20 hover:scale-110 transition-transform cursor-pointer group relative`}
                          title={patch.name}
                        >
                          <Icon className="w-5 h-5 text-white" />
                          {/* Hover Glow */}
                          <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-slate-950/30 rounded-lg p-4 text-center border border-slate-800/50 border-dashed">
                    <p className="text-xs text-slate-500">아직 획득한 패치가 없습니다</p>
                    <p className="text-[10px] text-slate-600 mt-1">미션을 완료하고 패치를 모아보세요!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Today's Mission (Right Column) */}
          <div className="flex flex-col">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 shadow-lg h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 flex-shrink-0">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>📋</span> 오늘의 미션
                </h3>
                <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                  {quests.filter(q => q.completed).length}/{quests.length}
                </span>
              </div>
              <div className="space-y-2 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent flex-1">
                {quests.map((quest) => (
                  <div key={quest.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/50 hover:border-slate-700 transition-colors">
                    <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${quest.completed ? 'bg-green-500/20 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
                      {quest.completed ? '✓' : '○'}
                    </div>
                    <span className={`text-xs flex-1 ${quest.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                      {QUEST_INFO[quest.questType]?.name || quest.questType}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500 whitespace-nowrap">+{quest.xpReward} XP</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Sparring Review + AI Analysis */}
      <section className="px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5">
          <BookOpen className="w-5 h-5 text-blue-400" />
          스파링 복기 & AI 분석
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Review (Free) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-blue-500/30 transition-colors group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-sm">최근 복기</h3>
              <span className="text-xs text-slate-500">어제</span>
            </div>
            <div className="bg-slate-950/50 rounded-xl p-4 mb-5 border border-slate-800/50 group-hover:border-slate-700/50 transition-colors">
              <p className="text-sm text-slate-300 line-clamp-2 italic">
                "오늘 스파링에서는 가드 패스를 시도할 때 중심이 너무 앞으로 쏠리는 문제가 있었다..."
              </p>
            </div>
            <button
              onClick={() => navigate('/arena?tab=sparring')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-sm font-bold text-white transition-all flex items-center justify-center gap-2 group-hover:bg-blue-600 group-hover:shadow-lg group-hover:shadow-blue-900/20"
            >
              <BookOpen className="w-4 h-4" />
              복기 작성하기
            </button>
          </div>

          {/* AI Analysis (Pro Locked) */}
          <div className="relative bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border border-indigo-500/20 rounded-xl p-6 overflow-hidden group">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center text-center p-4 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">AI 코치 분석</h3>
              <p className="text-xs text-slate-400 mb-4">내 스파링 패턴을 분석하고 개선점을 제안합니다.</p>
              <button
                onClick={() => navigate('/subscription')}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-5 rounded-lg transition-all shadow-lg shadow-indigo-600/20 hover:scale-105"
              >
                Pro로 업그레이드
              </button>
            </div>

            <div className="opacity-30 blur-[1px]">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-bold text-indigo-300">AI Insight</span>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-slate-700 rounded"></div>
                <div className="h-2 w-5/6 bg-slate-700 rounded"></div>
                <div className="h-2 w-4/6 bg-slate-700 rounded"></div>
                <div className="h-2 w-full bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Content Section */}
      <section className="px-4 md:px-8 py-8 max-w-7xl mx-auto border-t border-slate-800/50 mt-4">
        <div className="flex items-center gap-8 border-b border-slate-800 mb-6 overflow-x-auto scrollbar-hide">
          {[
            { id: 'recent', label: '최근 시청', color: 'orange' },
            { id: 'courses', label: '추천 강의', color: 'indigo' },
            { id: 'drills', label: '실전 드릴', color: 'emerald' },
            { id: 'feed', label: '커뮤니티', color: 'blue' }
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
          {/* Recent Activity */}
          {activeTab === 'recent' && (
            <div className="space-y-3">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate(item.type === 'lesson' ? `/courses/${item.id}` : `/routines/${item.id}`)}
                  className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-4 hover:border-orange-500/50 transition-all cursor-pointer hover:bg-slate-900"
                >
                  <div className={`w-28 h-20 rounded-lg ${item.thumbnail} flex-shrink-0 flex items-center justify-center relative overflow-hidden shadow-md`}>
                    {item.type === 'lesson' ? <Play className="w-8 h-8 text-white/80 drop-shadow-md" /> : <Dumbbell className="w-8 h-8 text-white/80 drop-shadow-md" />}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
                      <div className="h-full bg-orange-500" style={{ width: `${item.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${item.type === 'lesson'
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                        {item.type === 'lesson' ? 'LESSON' : 'DRILL'}
                      </span>
                      <span className="text-xs text-slate-500">{item.lastWatched}</span>
                    </div>
                    <h4 className="text-base font-bold text-white truncate group-hover:text-orange-400 transition-colors mb-0.5">{item.title}</h4>
                    <p className="text-xs text-slate-400 truncate">{item.type === 'lesson' ? item.courseTitle : item.difficulty}</p>
                  </div>
                  <div className="flex items-center justify-center w-8">
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Courses */}
          {activeTab === 'courses' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {recommendedCourses.map(course => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-indigo-900/10"
                >
                  <div className="aspect-video relative overflow-hidden">
                    <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                    <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white flex items-center gap-1">
                      <Play className="w-3 h-3 fill-white" />
                      {course.lessonCount} Lessons
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-white text-sm mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-1">{course.creatorName || 'Grappl Instructor'}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{course.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Drills */}
          {activeTab === 'drills' && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {drills.map(drill => (
                <div
                  key={drill.id}
                  onClick={() => navigate(`/routines/${drill.id}`)}
                  className="aspect-[9/16] bg-slate-900/50 rounded-xl relative overflow-hidden group cursor-pointer border border-slate-800 hover:border-emerald-500/50 transition-all shadow-sm"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90"></div>
                  <div className="absolute bottom-0 left-0 p-3 w-full">
                    <h4 className="text-white text-xs font-bold line-clamp-2 mb-1.5 group-hover:text-emerald-400 transition-colors">{drill.title}</h4>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400">
                      <Activity className="w-3 h-3" />
                      <span>{drill.difficulty}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Feed */}
          {activeTab === 'feed' && (
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
      </section>

      {/* Patch Detail Modal */}
      {selectedPatch && (
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
      )}
    </div>
  );
};
