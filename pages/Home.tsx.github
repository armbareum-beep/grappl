import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle,
  Sword, Dumbbell, BookOpen, Activity, Bot, Flame, Trophy
} from 'lucide-react';
import { Button } from '../components/Button';
import { getUserProgress, getDailyQuests } from '../lib/api';
import { getBeltInfo, getXPProgress, getXPToNextBelt, getBeltIcon } from '../lib/belt-system';
import {
  getCourses, getDrills, getPublicTrainingLogs
} from '../lib/api';
import { Course, Drill, TrainingLog, UserProgress, DailyQuest } from '../types';
import { checkPatchUnlocks } from '../components/PatchDisplay';

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
    <div className="min-h-screen bg-slate-950 text-white pb-20">

      {/* HUD Header */}
      <section className="relative bg-slate-900 border-b border-slate-800 pt-6 pb-8 px-4 md:px-8">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Top Row: User Info & Stats */}
          <div className="flex items-center justify-between mb-6">
            {/* User Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-2xl font-black text-white">{user?.email?.[0].toUpperCase()}</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">환영합니다, {user?.email?.split('@')[0]}님!</h1>
                <p className="text-slate-400 text-sm">오늘도 매트 위에서 성장하세요 🥋</p>
              </div>
            </div>

            {/* Streak & Activity */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                  <Flame className="w-4 h-4 fill-orange-400" />
                  <span className="text-lg font-black">{userStats.streak}</span>
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">DAY STREAK</p>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <div className="flex gap-1">
                  {userStats.weeklyActivity.map((active, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-6 rounded-full ${active ? 'bg-green-500' : 'bg-slate-700'}`}
                    ></div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 uppercase font-bold">WEEKLY ACTIVITY</p>
              </div>
            </div>
          </div>

          {/* Bottom Row: Belt & Quests */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Side: Belt + Quests (2/3) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Belt Progress */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-4xl">{beltIcon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">{currentBelt?.name || '화이트 4 스트라이프'}</h3>
                        <p className="text-xs text-slate-400">
                          {progress && progress.beltLevel < 30 ? `다음: ${nextBelt?.name}` : '최고 단계!'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">XP</p>
                        <p className="text-sm font-bold text-white">{progress?.currentXp || 0} / {xpToNext}</p>
                      </div>
                    </div>
                    {progress && progress.beltLevel < 30 && (
                      <div className="relative w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${xpProgress * 100}%`,
                            backgroundColor: currentBelt?.color === '#FFFFFF' ? '#94A3B8' : currentBelt?.color
                          }}
                        ></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Daily Quests - Below Belt */}
              <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <span className="text-sm">📋</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">오늘의 미션</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">진행도</div>
                    <div className="text-sm font-bold text-white">{quests.filter(q => q.completed).length}/{quests.length}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Total XP</span>
                    <span className="text-xs font-bold text-amber-400">{earnedQuestXP}/{totalQuestXP}</span>
                  </div>
                  <div className="relative w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 transition-all duration-500"
                      style={{ width: `${totalQuestXP > 0 ? (earnedQuestXP / totalQuestXP) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Quest Grid - 2 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {quests.slice(0, 6).map((quest) => {
                    const info = QUEST_INFO[quest.questType] || { icon: '❓', name: quest.questType };
                    return (
                      <div
                        key={quest.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-all ${quest.completed
                          ? 'bg-green-900/20 border border-green-800/30'
                          : 'bg-slate-800/50 border border-slate-700/50 hover:border-amber-600/50'
                          }`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${quest.completed ? 'bg-green-600' : 'bg-slate-700'
                            }`}>
                            <span className="text-sm">{quest.completed ? '✓' : info.icon}</span>
                          </div>
                          <span className={`text-xs font-medium truncate ${quest.completed ? 'text-slate-400 line-through' : 'text-white'
                            }`}>
                            {info.name}
                          </span>
                        </div>
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${quest.completed
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-gradient-to-r from-amber-900/30 to-orange-900/30 text-amber-400'
                          }`}>
                          +{quest.xpReward}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Side: Patches (1/3) */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">🎖️ 획득 패치</span>
                <span className="text-xs text-slate-500">{unlockedPatches.length}</span>
              </div>
              {unlockedPatches.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {unlockedPatches.map((patch) => {
                    const Icon = patch.icon;
                    return (
                      <div
                        key={patch.id}
                        className={`w-10 h-10 rounded-full ${patch.color} flex items-center justify-center shadow-md border border-white/20 hover:scale-110 transition-transform cursor-pointer`}
                        title={patch.name}
                      >
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-8">아직 획득한 패치가 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => navigate('/arena?tab=journal')}
            className="group bg-slate-800/80 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-0.5"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                <BookOpen className="w-6 h-6 text-indigo-400 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">수련 일지</h3>
                <p className="text-xs text-slate-400 group-hover:text-indigo-100">나의 성장 기록</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/arena?tab=tournament')}
            className="group bg-slate-800/80 hover:bg-red-600 border border-slate-700 hover:border-red-500 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20 hover:-translate-y-0.5"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                <Sword className="w-6 h-6 text-red-400 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">아레나</h3>
                <p className="text-xs text-slate-400 group-hover:text-red-100">전투력 측정</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/arena?tab=routines')}
            className="group bg-slate-800/80 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5"
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-700 group-hover:bg-white/20 flex items-center justify-center transition-colors">
                <Dumbbell className="w-6 h-6 text-emerald-400 group-hover:text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm mb-1">드릴 루틴</h3>
                <p className="text-xs text-slate-400 group-hover:text-emerald-100">매일 10분 연습</p>
              </div>
            </div>
          </button>
        </div>

        {/* AI Coach Banner */}
        <div
          className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-slate-700 rounded-xl p-4 mb-6 flex items-center gap-4 cursor-pointer hover:border-indigo-500/50 transition-all group"
          onClick={() => navigate('/arena?tab=sparring&action=analyze')}
        >
          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI COACH INSIGHT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <p className="text-sm text-slate-300 truncate">
              "최근 <span className="text-white font-bold">가드 패스</span> 성공률이 떨어지고 있습니다. 추천 드릴을 확인해보세요."
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
        </div>

        {/* Content Tabs */}
        <div>
          <div className="flex items-center gap-6 border-b border-slate-800 mb-6">
            {[
              { id: 'recent', label: '최근 시청', color: 'orange' },
              { id: 'courses', label: '추천 강의', color: 'indigo' },
              { id: 'drills', label: '실전 드릴', color: 'emerald' },
              { id: 'feed', label: '커뮤니티', color: 'blue' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className={`absolute bottom-0 left-0 w-full h-0.5 bg-${tab.color}-500 rounded-t-full`}></div>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {/* Recent Activity */}
            {activeTab === 'recent' && (
              <div className="space-y-3">
                {recentActivity.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(item.type === 'lesson' ? `/courses/${item.id}` : `/routines/${item.id}`)}
                    className="group bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-4 hover:border-orange-500/50 transition-all cursor-pointer"
                  >
                    <div className={`w-24 h-16 rounded-lg ${item.thumbnail} flex-shrink-0 flex items-center justify-center relative overflow-hidden`}>
                      {item.type === 'lesson' ? <Play className="w-6 h-6 text-white/80" /> : <Dumbbell className="w-6 h-6 text-white/80" />}
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
                        <div className="h-full bg-orange-500" style={{ width: `${item.progress}%` }}></div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${item.type === 'lesson'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                          {item.type === 'lesson' ? 'LESSON' : 'DRILL'}
                        </span>
                        <span className="text-xs text-slate-500">{item.lastWatched}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate group-hover:text-orange-400 transition-colors">{item.title}</h4>
                      <p className="text-xs text-slate-400 truncate">{item.type === 'lesson' ? item.courseTitle : item.difficulty}</p>
                    </div>
                    <div className="flex items-center justify-center w-8">
                      <Play className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Courses */}
            {activeTab === 'courses' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {recommendedCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="group bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white">
                        {course.lessonCount} Lessons
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-white text-sm mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                      <p className="text-xs text-slate-400 mb-3 line-clamp-1">{course.creatorName || 'Grappl Instructor'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">{course.category}</span>
                        <Play className="w-3 h-3 text-indigo-500 fill-indigo-500" />
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
                    className="aspect-[9/16] bg-slate-900/50 rounded-xl relative overflow-hidden group cursor-pointer border border-slate-800 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80"></div>
                    <div className="absolute bottom-0 left-0 p-3 w-full">
                      <h4 className="text-white text-xs font-bold line-clamp-2 mb-1 group-hover:text-emerald-400 transition-colors">{drill.title}</h4>
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
              <div className="space-y-3">
                {trainingLogs.map(log => (
                  <div key={log.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 flex gap-4 hover:border-slate-700 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-sm font-bold text-slate-400">
                      {log.userName?.[0] || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-bold text-white">{log.userName || '익명'}</h4>
                        <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-300 mb-3 line-clamp-2">{log.notes}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {log.likes || 0}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {log.comments || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
