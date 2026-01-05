import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, Trophy,
  Clock, Video, Zap,
} from 'lucide-react';
import { getUserProgress } from '../lib/api';
import { getBeltInfo, getXPProgress } from '../lib/belt-system';
import {
  getRecentActivity, getDailyRoutine, getDailyFreeCourse,
  getTrainingLogs, getSparringReviews,
  searchContent
} from '../lib/api';
import { Course, UserProgress, DrillRoutine, SparringVideo, TrainingLog, SparringReview, VideoCategory, Difficulty, DailyQuest } from '../types';
import { getWeeklyFeaturedChain } from '../lib/api-skill-tree';
import { LoadingScreen } from '../components/LoadingScreen';
import { supabase } from '../lib/supabase';
import { MasteryRoadmapWidget } from '../components/home/MasteryRoadmapWidget';
import { WeeklyFeaturedSection } from '../components/home/WeeklyFeaturedSection';
import { QuickJournalWidget } from '../components/home/QuickJournalWidget';
import { RecentActivitySection } from '../components/home/RecentActivitySection';
import { ArenaStatsModal } from '../components/home/ArenaStatsModal';
import { TrainingStatsWidget } from '../components/home/TrainingStatsWidget';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [dailyRoutine, setDailyRoutine] = useState<DrillRoutine | null>(null);
  const [freeCourse, setFreeCourse] = useState<Course | null>(null);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [sparringReviews, setSparringReviews] = useState<SparringReview[]>([]);

  // Diverse Recommendation States
  const [recCourse, setRecCourse] = useState<Course | null>(null);
  const [recRoutines, setRecRoutines] = useState<DrillRoutine[]>([]);
  const [recSparring, setRecSparring] = useState<SparringVideo | null>(null);

  // User progress states
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Modal states
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [selectedStatType, setSelectedStatType] = useState<'streak' | 'belt' | 'badges' | null>(null);


  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // Calculate Streak from logs
  const streak = useMemo(() => {
    if (!logs || logs.length === 0) return 0;

    const uniqueDates = Array.from(new Set(logs.map(log => log.date.split('T')[0]))).sort().reverse();
    if (uniqueDates.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if the user practiced today or yesterday to keep the streak alive
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let currentStreak = 0;
    let checkDate = new Date(uniqueDates[0]); // Start checking from the most recent practice date

    // Iterate efficiently
    for (const dateStr of uniqueDates) {
      const currentDate = new Date(dateStr);
      // Direct comparison of date strings is safer for equality
      if (dateStr === checkDate.toISOString().split('T')[0]) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1); // Move to previous day
      } else {
        break; // Gap found
      }
    }
    return currentStreak;
  }, [logs]);

  // Mock User Stats (Badges still mocked)
  const userStats = {
    streak,
    badges: ['First Step', 'Early Bird'] // Placeholder until badges table exists
  };

  useEffect(() => {
    if (!user || !user.id) {
      setLoading(false);
      navigate('/', { replace: true });
      return;
    }

    // DEBUG: Check user ID
    console.log('[Home] Current User:', user);
    if (!user.id) console.error('[Home] User ID is missing!');

    const fetchData = async () => {
      try {
        // 1. Basic User Info (Non-blocking)
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('avatar_url, name')
            .eq('id', user.id)
            .single();
          if (userData?.avatar_url) setUserAvatar(userData.avatar_url);
          if (userData?.name) setUserName(userData.name);


          try {
            const userProgress = await getUserProgress(user.id);
            setProgress(userProgress);
          } catch (e) {
            console.error('Error fetching user progress:', e);
            // Fallback progress
            setProgress({
              userId: user.id,
              beltLevel: 1,
              currentXp: 0,
              totalXp: 0,
              lastQuestReset: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error('User info error:', e);
          // Ensure safe fallback if outer try fails
          if (!progress) {
            setProgress({
              userId: user.id,
              beltLevel: 1,
              currentXp: 0,
              totalXp: 0,
              lastQuestReset: new Date().toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        // 2. FETCH DAILY CONTENT (Most Critical)
        const [routineRes, courseRes] = await Promise.all([
          getDailyRoutine().catch(() => ({ data: null })),
          getDailyFreeCourse().catch(() => ({ data: null }))
        ]);

        // Fallbacks
        if (routineRes.data) {
          setDailyRoutine(routineRes.data);
        } else {
          const { data: anyRoutines } = await supabase.from('routines').select('*').limit(1);
          if (anyRoutines && anyRoutines.length > 0) {
            const r = anyRoutines[0];
            setDailyRoutine({
              id: r.id,
              title: r.title,
              description: r.description || '',
              creatorId: r.creator_id || 'system',
              creatorName: 'Grapplay Team',
              thumbnailUrl: r.thumbnail_url,
              price: r.price || 0,
              views: r.views || 0,
              createdAt: r.created_at || new Date().toISOString(),
              drillCount: 5,
              totalDurationMinutes: 15,
              difficulty: Difficulty.Beginner,
              category: VideoCategory.Guard
            });
          } else {
            setDailyRoutine({
              id: 'fallback-routine',
              title: '기초 힙 이스케이프 드릴 루틴',
              description: '주짓수의 기본인 힙 이스케이프를 마스터하세요.',
              creatorId: 'system',
              creatorName: 'Grapplay Team',
              thumbnailUrl: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop',
              price: 0,
              views: 0,
              createdAt: new Date().toISOString(),
              drillCount: 5,
              totalDurationMinutes: 15,
              difficulty: Difficulty.Beginner,
              category: VideoCategory.Guard
            });
          }
        }

        if (courseRes.data) {
          setFreeCourse(courseRes.data);
        } else {
          const { data: anyCourses } = await supabase
            .from('courses')
            .select('*, creator:creators(name, profile_image), lessons:lessons(count)')
            .eq('published', true)
            .limit(1);
          if (anyCourses && anyCourses.length > 0) {
            const c = anyCourses[0];
            setFreeCourse({
              id: c.id,
              title: c.title,
              description: c.description,
              creatorId: c.creator_id,
              creatorName: c.creator?.name || 'Grapplay',
              creatorProfileImage: c.creator?.profile_image,
              category: c.category || VideoCategory.Guard,
              difficulty: c.difficulty || Difficulty.Beginner,
              thumbnailUrl: c.thumbnail_url,
              price: c.price || 0,
              views: c.views || 0,
              createdAt: c.created_at,
              lessonCount: c.lessons?.[0]?.count || 0
            });
          } else {
            setFreeCourse({
              id: 'fallback-course',
              title: '화이트벨트 탈출하기: 기초 완성',
              description: '주짓수를 처음 시작하는 분들을 위한 필수 가이드.',
              creatorId: 'system',
              creatorName: 'Master Marcus',
              category: VideoCategory.Guard,
              difficulty: Difficulty.Beginner,
              thumbnailUrl: 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop',
              price: 0,
              views: 0,
              createdAt: new Date().toISOString(),
              lessonCount: 12
            });
          }
        }

        // 3. SECONDARY DATA
        getRecentActivity(user.id).then(res => {
          if (Array.isArray(res)) setRecentActivity(res);
          else if (res && (res as any).data && Array.isArray((res as any).data)) setRecentActivity((res as any).data);
          else setRecentActivity([]);
        }).catch(() => setRecentActivity([]));

        getTrainingLogs(user.id).then(res => {
          if (res.data && Array.isArray(res.data)) setLogs(res.data as any);
          else setLogs([]);
        }).catch(() => setLogs([]));

        // Fetch Sparring Reviews for 'Give Feedback' quest
        getSparringReviews(user.id).then(res => {
          if (res.data && Array.isArray(res.data)) setSparringReviews(res.data);
          else setSparringReviews([]);
        }).catch(() => setSparringReviews([]));

        getWeeklyFeaturedChain().then(async res => {
          if (res.data?.title) {
            const results = await searchContent(res.data.title);
            // Ensure searchContent returns expected structure
            if (results && Array.isArray(results.courses) && results.courses.length > 0) setRecCourse(results.courses[0]);
            if (results && Array.isArray(results.routines) && results.routines.length > 0) setRecRoutines([results.routines[0]]);
            if (results && Array.isArray(results.sparring) && results.sparring.length > 0) setRecSparring(results.sparring[0]);
          }
        }).catch(() => { });

      } catch (error) {
        console.error('Fatal fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  useEffect(() => {
    const items = [dailyRoutine, freeCourse].filter(Boolean);
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dailyRoutine, freeCourse]);

  // Move hooks to top level - prevent conditional hook errors
  const dailyQuests = useMemo(() => {
    if (!user) return [];

    // Use local date string for consistency, though ISO string is used in DB
    const today = new Date().toISOString().split('T')[0];

    const hasLog = logs.some(l => l.date && l.date.split('T')[0] === today && !['routine', 'mastery', 'lesson'].includes(l.type || ''));
    const hasRoutine = logs.some(l => l.date && l.date.split('T')[0] === today && l.type === 'routine');
    const hasSparring = logs.some(l => l.date && l.date.split('T')[0] === today && (l.sparringRounds > 0 || l.type === 'sparring'));

    // New Missions Logic
    const hasWatchedLesson = recentActivity.some(a => a.type === 'lesson' && a.lastWatched && a.lastWatched.split('T')[0] === today);
    const hasFeedback = sparringReviews.some(r => r.createdAt && r.createdAt.split('T')[0] === today);

    const quests: DailyQuest[] = [
      {
        id: 'q1',
        userId: user.id,
        questType: 'write_log',
        targetCount: 1,
        currentCount: hasLog ? 1 : 0,
        xpReward: 15, // Reduced from 50 (Consistency reward)
        completed: hasLog,
        questDate: today,
        createdAt: today
      },
      {
        id: 'q2',
        userId: user.id,
        questType: 'complete_routine',
        targetCount: 1,
        currentCount: hasRoutine ? 1 : 0,
        xpReward: 30, // Main physical training
        completed: hasRoutine,
        questDate: today,
        createdAt: today
      },
      {
        id: 'q3',
        userId: user.id,
        questType: 'play_match',
        targetCount: 1,
        currentCount: hasSparring ? 1 : 0,
        xpReward: 50, // Hardest effort
        completed: hasSparring,
        questDate: today,
        createdAt: today
      },
      {
        id: 'q4',
        userId: user.id,
        questType: 'watch_lesson',
        targetCount: 1,
        currentCount: hasWatchedLesson ? 1 : 0,
        xpReward: 20, // Passive learning
        completed: hasWatchedLesson,
        questDate: today,
        createdAt: today
      },
      {
        id: 'q5',
        userId: user.id,
        questType: 'give_feedback',
        targetCount: 1,
        currentCount: hasFeedback ? 1 : 0,
        xpReward: 15, // Community engagement
        completed: hasFeedback,
        questDate: today,
        createdAt: today
      }
    ];
    return quests;
  }, [logs, recentActivity, sparringReviews, user]);

  if (loading) return <LoadingScreen message="홈 데이터 불러오는 중..." />;

  const currentBelt = progress ? getBeltInfo(progress.beltLevel) : null;
  const xpProgress = progress ? getXPProgress(progress.totalXp, progress.beltLevel) : 0;
  const levelProgress = xpProgress * 100;

  // Safe display name generation
  const rawName = userName || user?.user_metadata?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0];
  const displayName = typeof rawName === 'string' ? rawName : 'Grappler';

  const slides = [
    ...(dailyRoutine ? [{ type: 'routine' as const, data: dailyRoutine }] : []),
    ...(freeCourse ? [{ type: 'course' as const, data: freeCourse }] : [])
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans pb-20">
      <section className="relative px-4 md:px-6 lg:px-12 pt-8 pb-8 md:pt-12 max-w-[1440px] mx-auto">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-bold text-white">환영합니다, {displayName}님!</h1>
            <p className="text-zinc-400 text-sm">오늘의 수련을 시작해보세요 🥋</p>
          </div>
          <div onClick={() => navigate('/settings')} className="w-10 h-10 rounded-full border border-zinc-700 bg-zinc-800 overflow-hidden cursor-pointer hover:border-violet-500 transition-colors">
            {userAvatar ? <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">{displayName[0].toUpperCase()}</div>}
          </div>
        </div>

        {slides.length > 0 ? (
          <>
            <div className="relative group overflow-hidden rounded-[32px] min-h-[340px] md:min-h-[380px]">
              {slides.map((slide, idx) => {
                if (!slide || !slide.data) return null; // Safety check
                if (slide.type === 'routine') {
                  const routine = slide.data as DrillRoutine;
                  return (
                    <div key={`slide-routine-${idx}`} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'}`}>
                      <div className="relative overflow-hidden w-full h-full bg-violet-600/10 backdrop-blur-xl border border-violet-500/30 px-6 pt-6 pb-20 md:p-8 rounded-[32px] group transition-all duration-500 hover:border-violet-500/50 hover:shadow-[0_0_40px_-10px_rgba(124,58,237,0.3)]">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 h-full p-4 md:p-0">
                          <div className="space-y-4 flex-1 max-w-2xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-3 py-1 bg-violet-500/20 text-violet-200 text-xs font-bold rounded-full border border-violet-500/20">데일리 루틴</span>
                              <span className="text-zinc-400 text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {routine.totalDurationMinutes || 15} min</span>
                            </div>
                            <h2 className="text-white text-3xl md:text-5xl font-black tracking-tight leading-tight">{typeof routine.title === 'string' ? routine.title : 'Routine'}</h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span>{routine.drillCount || 5}개의 드릴</span>
                              <span className="flex items-center gap-1 text-violet-300 font-bold"><Zap className="w-4 h-4 fill-current text-yellow-500" /> +50 XP</span>
                            </div>
                            <p className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
                              <span className="text-zinc-300 text-base">{typeof routine.creatorName === 'string' ? routine.creatorName : 'Grapplay Team'}</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 mt-6 md:mt-0 w-full md:w-auto">
                            <button onClick={() => navigate(`/routines/${routine.id}`)} className="w-full md:w-auto bg-white text-zinc-950 font-bold rounded-full px-8 py-4 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-2 text-base md:text-lg">
                              <Play className="w-5 h-5 fill-current" /> 루틴 시작하기
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const course = slide.data as Course;
                  if (!course) return null;
                  return (
                    <div key={`slide-course-${idx}`} className={`absolute inset-0 transition-all duration-1000 ease-in-out ${idx === currentSlide ? 'opacity-100 translate-x-0 z-10' : 'opacity-0 translate-x-12 z-0 pointer-events-none'}`}>
                      <div onClick={() => navigate(`/courses/${course.id}`)} className="relative overflow-hidden w-full h-full bg-zinc-900 border border-violet-500/20 px-6 pt-6 pb-20 md:p-8 rounded-[32px] cursor-pointer group transition-all duration-500 hover:border-violet-500/50 flex flex-col justify-center">
                        <div className="absolute inset-0 z-0 opacity-20">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 blur-[80px] rounded-full" />
                          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/5 blur-[60px] rounded-full" />
                        </div>
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 h-full p-4 md:p-0">
                          <div className="space-y-4 flex-1 max-w-2xl">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-3 py-1 bg-violet-600/90 text-white text-xs font-black rounded-full uppercase tracking-widest shadow-lg shadow-violet-900/20">데일리 클래스</span>
                              <span className="text-zinc-400 text-xs font-bold flex items-center gap-1"><Video className="w-3 h-3 text-violet-400" /> 무료 시청</span>
                            </div>
                            <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter leading-[1.1] group-hover:text-violet-300 transition-colors uppercase italic">{typeof course.title === 'string' ? course.title : 'Class'}</h2>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                              <span className="flex items-center gap-1"><Play className="w-4 h-4" /> {course.lessonCount || 0} Lessons</span>
                              <span className="flex items-center gap-1 text-violet-300 font-bold"><Zap className="w-4 h-4 fill-current text-yellow-500" /> +30 XP</span>
                            </div>
                            <p className="text-sm text-zinc-400 flex items-center gap-2 font-medium">
                              <span className="text-zinc-300 text-base">{typeof course.creatorName === 'string' ? course.creatorName : 'Grapplay Team'}</span>
                            </p>
                          </div>
                          <div className="flex-shrink-0 mt-6 md:mt-0 w-full md:w-auto">
                            <div className="w-full md:w-auto bg-violet-600 text-white font-bold rounded-full px-8 py-4 hover:bg-violet-500 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-violet-600/20 flex items-center justify-center gap-2 text-base md:text-lg">
                              <Play className="w-6 h-6 fill-current" /> 무료 시청하기
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </div>

            {/* Carousel Navigation Indicators */}
            {slides.length > 1 && (
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-30 bg-black/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/5">
                {slides.map((slide, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide(idx);
                    }}
                    className={`group relative flex items-center gap-2 transition-all duration-300 ${idx === currentSlide ? 'opacity-100' : 'opacity-40 hover:opacity-70'}`}
                  >
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-6 bg-violet-400' : 'w-1.5 bg-white'}`} />
                    <span className={`text-[10px] font-black uppercase tracking-tighter whitespace-nowrap transition-all duration-300 ${idx === currentSlide ? 'text-violet-300 w-auto opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                      {slide.type === 'routine' ? 'Routine' : 'Class'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 p-8 rounded-[32px] text-center">
            <p className="text-zinc-500">오늘의 콘텐츠가 준비중입니다.</p>
          </div>
        )}
      </section>

      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-6"><MasteryRoadmapWidget /></section>

      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-zinc-900/30 border border-white/5 p-6 md:p-8 rounded-[32px] flex flex-col h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 blur-[100px] rounded-full pointer-events-none" />
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Arena Growth</h3>
            </div>
            <div className="mb-8 relative z-10">
              <div className="flex justify-between items-end mb-3">
                <span className="text-4xl font-black text-white">{currentBelt?.name || 'White Belt'}</span>
                <span className="text-zinc-500 font-mono text-sm">Level {progress?.beltLevel || 1}</span>
              </div>
              <div className="h-3 bg-zinc-800/50 rounded-full overflow-hidden relative backdrop-blur-sm ring-1 ring-white/5">
                <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-violet-600 to-indigo-500" style={{ width: `${levelProgress}%` }} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 md:gap-4 mt-auto relative z-10">
              <div onClick={(e) => { e.stopPropagation(); setSelectedStatType('streak'); setStatsModalOpen(true); }} className="bg-zinc-950/40 rounded-2xl p-4 text-center border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer">
                <div className="text-3xl font-black text-white mb-1">{userStats.streak}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Streak</div>
              </div>
              <div onClick={(e) => { e.stopPropagation(); setSelectedStatType('belt'); setStatsModalOpen(true); }} className="bg-zinc-950/40 rounded-2xl p-4 text-center border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer">
                <div className="text-xl font-black text-white mb-1">{currentBelt?.name || 'White'}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Belt</div>
              </div>
              <div onClick={(e) => { e.stopPropagation(); setSelectedStatType('badges'); setStatsModalOpen(true); }} className="bg-zinc-950/40 rounded-2xl p-4 text-center border border-white/5 hover:border-yellow-500/30 transition-all cursor-pointer">
                <div className="text-3xl font-black text-white mb-1">0</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Badges</div>
              </div>
            </div>
          </div>
          <TrainingStatsWidget logs={logs} />
        </div>
      </section>

      <QuickJournalWidget />
      {/* Safeguard WeeklyFeaturedSection */}
      {(recCourse || recRoutines.length > 0 || recSparring) && (
        <WeeklyFeaturedSection course={recCourse} routine={recRoutines[0] || null} sparring={recSparring} />
      )}
      <RecentActivitySection activities={recentActivity || []} />
      <ArenaStatsModal isOpen={statsModalOpen} onClose={() => setStatsModalOpen(false)} type={selectedStatType} data={{ streak: userStats.streak, beltLevel: progress?.beltLevel || 0, xp: progress?.totalXp || 0, dailyQuests }} />
    </div>
  );
};
