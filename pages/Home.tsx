import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle,
  Sword, Dumbbell, BookOpen, Activity, Bot, Flame, Trophy,
  Calendar, Lock, Star, TrendingUp, X, Sparkles, Award, Video
} from 'lucide-react';
import { Button } from '../components/Button';
import { getUserProgress, getDailyQuests } from '../lib/api';
import { getBeltInfo, getXPProgress, getXPToNextBelt, getBeltIcon } from '../lib/belt-system';
import {
  getTrainingLogs, getDrillRoutines, getCourses,
  getDrills, getPublicTrainingLogs, getRecentActivity, getDailyRoutine, getPublicSparringVideos
} from '../lib/api';
import { Course, Drill, TrainingLog, UserProgress, DailyQuest, DrillRoutine, SparringVideo } from '../types';
import { checkPatchUnlocks } from '../components/PatchDisplay';
import { LoadingScreen } from '../components/LoadingScreen';
import { AICoachWidget } from '../components/journal/AICoachWidget';
import { DailyQuestsPanel } from '../components/DailyQuestsPanel';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [publicSparrings, setPublicSparrings] = useState<SparringVideo[]>([]);
  const [myLogs, setMyLogs] = useState<TrainingLog[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<DrillRoutine | null>(null);
  const [activeTab, setActiveTab] = useState<'lesson' | 'drill' | 'sparring' | 'recent'>('lesson');
  const [proRoutines, setProRoutines] = useState<DrillRoutine[]>([]);

  // Modal States
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [showBeltModal, setShowBeltModal] = useState(false);
  const [showPatchModal, setShowPatchModal] = useState(false);
  const [selectedPatch, setSelectedPatch] = useState<any | null>(null);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
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
        setIsSubscriber(userData?.is_subscriber || false);
        if (userData?.avatar_url) setUserAvatar(userData.avatar_url);
        if (userData?.name) setUserName(userData.name);

        // Fetch user progress
        const userProgress = await getUserProgress(user.id);
        setProgress(userProgress);

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

  // Mock values
  const streak = userStats.streak;
  const userLevel = progress?.beltLevel || 1;
  const currentXP = progress?.totalXp || 0;
  const levelProgress = xpProgress * 100;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 md:pb-10 transition-colors duration-300">

      {/* 1. Hero Section: Welcome & Today's Routine */}
      <section className="relative pt-8 pb-10 px-4 md:px-8 border-b border-border bg-card/30">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div className="animate-in fade-in slide-in-from-left-4 duration-500">
              <h1 className="text-2xl font-bold text-foreground mb-1">
                환영합니다, {userName || user?.user_metadata?.name || user?.email?.split('@')[0]}님!
              </h1>
              <p className="text-muted-foreground text-sm">오늘의 수련을 시작해보세요 🥋</p>
            </div>
            <div
              onClick={() => navigate('/settings')}
              className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
            >
              {userAvatar || user?.user_metadata?.avatar_url ? (
                <img src={userAvatar || user?.user_metadata?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-primary">
                  {userName?.[0] || user?.user_metadata?.name?.[0] || user?.email?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              오늘의 루틴
            </h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-full border border-border">
              {new Date().toLocaleDateString()}
            </span>
          </div>

          {dailyRoutine ? (
            <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden group hover:border-primary/50 transition-all duration-300 shadow-sm">
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-secondary text-secondary-foreground text-[10px] font-bold rounded">
                        {dailyRoutine.difficulty || 'BEGINNER'}
                      </span>
                      <span className="px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded">
                        {dailyRoutine.category || 'GENERAL'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">{dailyRoutine.title}</h3>
                    <p className="text-muted-foreground text-sm mb-5 max-w-lg leading-relaxed line-clamp-2">
                      {dailyRoutine.description}
                    </p>
                    <div className="flex items-center gap-5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-primary" />
                        <span className="font-medium">{dailyRoutine.totalDurationMinutes || 15}분 소요</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">{(dailyRoutine.drillCount || 5) * 20} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <Button
                      onClick={() => navigate(`/routines/${dailyRoutine.id}`)}
                      className="w-full md:w-auto h-12 px-8 text-base font-bold shadow-sm"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      루틴 시작하기
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/10 border border-border dashed rounded-xl p-8 text-center">
              <p className="text-muted-foreground mb-2">오늘의 추천 루틴을 준비 중입니다.</p>
              <Button onClick={() => navigate('/arena?tab=routines')} variant="outline">
                전체 루틴 보기
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* 2. Main Grid: Arena & AI */}
      <section className="px-4 md:px-8 py-8 max-w-7xl mx-auto space-y-8">

        {/* Row 1: Arena Growth & AI Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6" onClick={() => navigate('/arena')}>
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
                <h2 className="text-lg font-bold">아레나 성장</h2>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 relative">
                <div className="w-full h-full bg-muted rounded-full border-2 border-border flex items-center justify-center overflow-hidden">
                  {user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">{user?.email?.[0].toUpperCase() || 'U'}</span>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-background rounded-full flex items-center justify-center border border-border">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold">{user?.user_metadata?.full_name || '나의 아레나'}</h3>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded">Lv. {userLevel}</span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                  <div className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000" style={{ width: `${levelProgress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{currentXP} XP</span>
                  <span>Next: {xpToNext} XP</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center border border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowMissionModal(true)}>
                <div className="text-xl font-black mb-1">🔥 {streak}</div>
                <div className="text-xs text-muted-foreground">일 연속 수련</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center border border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowBeltModal(true)}>
                <div className="text-xl font-black mb-1">🥋 {currentBelt?.name || 'White'}</div>
                <div className="text-xs text-muted-foreground">현재 벨트</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center border border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setShowPatchModal(true)}>
                <div className="text-xl font-black mb-1">🏆 {unlockedPatches.length}</div>
                <div className="text-xs text-muted-foreground">획득 패치</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <AICoachWidget logs={myLogs} />
          </div>
        </div>

        {/* Row 2: AI Recommended Courses */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">AI 맞춤 추천</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recommendedCourses.slice(0, 4).map((course) => (
              <div key={course.id} onClick={() => navigate(`/courses/${course.id}`)} className="group cursor-pointer">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-border bg-muted mb-3">
                  <img src={course.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white font-medium">
                    {course.lessonCount}강
                  </div>
                </div>
                <h3 className="font-bold leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">{course.title}</h3>
                <p className="text-xs text-muted-foreground">{course.creatorName || 'Instructor'} · {course.difficulty}</p>
              </div>
            ))}
          </div>

          {/* Pro Routines Carousel */}
          {proRoutines.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <Dumbbell className="w-4 h-4 text-emerald-500" />
                <h3 className="text-base font-bold text-foreground">추천 루틴</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x -mx-4 px-4 md:mx-0 md:px-0">
                {proRoutines.slice(0, 5).map((routine) => (
                  <div
                    key={routine.id}
                    onClick={() => !isSubscriber ? navigate('/pricing') : navigate(`/routines/${routine.id}`)}
                    className="relative min-w-[160px] md:min-w-[200px] aspect-[9/16] bg-card rounded-2xl overflow-hidden group cursor-pointer border border-border hover:border-emerald-500/50 transition-all shadow-sm snap-start"
                  >
                    <img src={routine.thumbnailUrl || 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff'} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>

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
                        <span className="text-xs text-muted-foreground">{routine.drillCount}개 드릴 · {routine.totalDurationMinutes}분</span>
                        <Button onClick={(e) => { e.stopPropagation(); !isSubscriber ? navigate('/pricing') : navigate(`/routines/${routine.id}`); }} size="sm" className={`w-full font-bold border-0 h-8 text-xs ${!isSubscriber ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white' : 'bg-background text-foreground hover:bg-muted'}`}>
                          {!isSubscriber ? 'Pro 잠금해제' : (
                            <><Play className="w-3 h-3 mr-1.5 fill-current" /> 시작하기</>
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

        {/* 3. New Sections: Sparring & Community (Restored & Styled) */}

        {/* Public Sparring Feed */}
        {publicSparrings.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-bold">실시간 스파링</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/arena?tab=sparring')} className="text-xs">
                더보기 <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {publicSparrings.map((video) => (
                <div key={video.id} onClick={() => navigate(`/sparring/${video.id}`)} className="group cursor-pointer relative aspect-[9/16] bg-black/40 rounded-xl overflow-hidden border border-border/50 hover:border-indigo-500/50 transition-all">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Play className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="text-xs font-bold text-white line-clamp-1 mb-0.5">{video.title || '스파링 영상'}</div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-muted/20 overflow-hidden flex-shrink-0">
                        {/* Placeholder for Creator Avatar if missing from API */}
                        {video.creator?.profileImage ? (
                          <img src={video.creator.profileImage} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-indigo-500/30" />
                        )}
                      </div>
                      <span className="text-[10px] text-white/70 truncate">{video.creator?.name || 'User'}</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur rounded text-[9px] text-white font-medium flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community Activity Feed */}
        {trainingLogs.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold">커뮤니티 활동</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/arena?tab=logs')} className="text-xs">
                더보기 <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>

            <div className="space-y-4">
              {trainingLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex gap-4 p-4 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-muted border border-border overflow-hidden">
                      {log.user?.profileImage ? (
                        <img src={log.user.profileImage} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-secondary text-secondary-foreground">
                          {log.user?.name?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-bold text-foreground">{log.user?.name || '수련생'}</h4>
                      <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-foreground/80 line-clamp-2 mb-2">{log.notes || '오늘도 열심히 수련했습니다!'}</p>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border text-xs text-muted-foreground">
                        <Flame className="w-3 h-3 text-orange-500" />
                        <span>{log.durationMinutes || 60}분</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border border-border text-xs text-muted-foreground">
                        <Trophy className="w-3 h-3 text-yellow-500" />
                        <span>{log.xpEarned || 100} XP</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. Recent Activity Tabs */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-6">최근 내 활동</h2>
          <div className="flex items-center gap-6 border-b border-border mb-6">
            {[
              { id: 'lesson', label: '레슨' },
              { id: 'drill', label: '드릴' },
              { id: 'sparring', label: '스파링' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "pb-3 text-sm font-medium transition-all relative",
                  activeTab === tab.id ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          <div className="min-h-[200px]">
            {activeTab === 'lesson' && (
              <div className="space-y-2">
                {recentActivity.filter(i => i.type === 'lesson').length > 0 ? (
                  recentActivity.filter(i => i.type === 'lesson').map(item => (
                    <div key={item.id} onClick={() => navigate(`/courses/${item.id}`)} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg cursor-pointer group transition-colors">
                      <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                        {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-muted-foreground" /></div>}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.courseTitle || '강의'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">최근 시청한 레슨이 없습니다.</div>
                )}
              </div>
            )}
            {activeTab === 'drill' && (
              <div className="space-y-2">
                {recentActivity.filter(i => i.type === 'drill' || i.type === 'routine').length > 0 ? (
                  recentActivity.filter(i => i.type === 'drill' || i.type === 'routine').map(item => (
                    <div key={item.id} onClick={() => navigate(`/routines/${item.id}`)} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg cursor-pointer group transition-colors">
                      <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                        <div className="w-full h-full flex items-center justify-center bg-emerald-500/10"><Activity className="w-4 h-4 text-emerald-500" /></div>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.difficulty || '드릴'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">최근 연습한 드릴이 없습니다.</div>
                )}
              </div>
            )}
            {activeTab === 'sparring' && (
              <div className="space-y-2">
                {recentActivity.filter(i => i.type === 'sparring').length > 0 ? (
                  recentActivity.filter(i => i.type === 'sparring').map(item => (
                    <div key={item.id} onClick={() => navigate(`/sparring/${item.id}`)} className="flex items-center gap-4 p-2 hover:bg-muted/50 rounded-lg cursor-pointer group transition-colors">
                      <div className="w-16 h-10 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                        {item.thumbnail ? <img src={item.thumbnail} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Play className="w-4 h-4 text-muted-foreground" /></div>}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.creatorName || '스파링'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground text-sm">최근 시청한 스파링이 없습니다.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Modals */}
      {showMissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowMissionModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                <Flame className="w-6 h-6 text-orange-500" /> 오늘의 미션
              </h3>
              <button onClick={() => setShowMissionModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <DailyQuestsPanel userId={user?.id || ''} />
          </div>
        </div>
      )}

      {showBeltModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowBeltModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" /> 나의 성장
              </h3>
              <button onClick={() => setShowBeltModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full bg-muted border-4 border-border flex items-center justify-center text-5xl shadow-lg mb-4">
                {beltIcon}
              </div>
              <h2 className="text-2xl font-black text-foreground mb-1">{currentBelt?.name}</h2>
              <p className="text-sm text-muted-foreground">Total XP: <span className="text-foreground font-bold">{progress?.totalXp?.toLocaleString()}</span></p>
            </div>

            <div className="space-y-4 bg-muted/30 rounded-xl p-5 border border-border">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Next Belt</span>
                <span className="text-primary font-bold">{nextBelt?.name}</span>
              </div>
              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="absolute top-0 left-0 h-full bg-primary transition-all duration-1000"
                  style={{ width: `${xpProgress * 100}%` }}
                >
                </div>
              </div>
              <div className="text-center text-xs text-muted-foreground">
                다음 승급까지 <span className="text-foreground font-bold">{((nextBelt?.xpRequired || 0) - (progress?.totalXp || 0)).toLocaleString()} XP</span> 남았습니다.
              </div>
            </div>

            <Button onClick={() => navigate('/arena')} className="w-full mt-6">
              아레나 상세 보기
            </Button>
          </div>
        </div>
      )
      }

      {showPatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowPatchModal(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
              <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-500" /> 보유 패치
              </h3>
              <button onClick={() => setShowPatchModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-2 grid grid-cols-4 gap-4">
              {unlockedPatches.map((patch) => {
                const Icon = patch.icon;
                return (
                  <div key={patch.id} className="flex flex-col items-center gap-2" onClick={() => setSelectedPatch(patch)}>
                    <div className={`w-14 h-14 rounded-xl ${patch.color} flex items-center justify-center shadow-lg border-2 border-border/10 hover:scale-110 transition-transform cursor-pointer`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-[10px] text-center text-muted-foreground font-medium leading-tight">{patch.name}</span>
                  </div>
                );
              })}
              {unlockedPatches.length === 0 && (
                <div className="col-span-4 py-10 text-center text-muted-foreground">
                  아직 획득한 패치가 없습니다. <br /> 꾸준히 수련하여 패치를 모아보세요!
                </div>
              )}
            </div>
          </div>
        </div>
      )
      }

      {/* Selected Patch Details Modal */}
      {
        selectedPatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPatch(null)}>
            <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm text-center relative shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className={`w-20 h-20 mx-auto rounded-2xl ${selectedPatch.color} flex items-center justify-center mb-4 shadow-xl animate-bounce-custom`}>
                <selectedPatch.icon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-black text-foreground mb-2">{selectedPatch.name}</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">{selectedPatch.description}</p>
              <Button onClick={() => setSelectedPatch(null)} variant="secondary" className="w-full">
                멋져요!
              </Button>
            </div>
          </div>
        )
      }
    </div>
  );
};
