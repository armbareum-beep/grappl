import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle, Share2,
  Trophy, Zap, Target, TrendingUp, Calendar,
  Sword, Dumbbell, BookOpen, Activity, Bot, Flame
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  getCourses, getDrills, getPublicTrainingLogs
} from '../lib/api';
import { Course, Drill, TrainingLog } from '../types';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [activeTab, setActiveTab] = useState<'courses' | 'drills' | 'feed'>('courses');

  // Mock User Stats (나중에 DB 연동 필요)
  const userStats = {
    level: 5,
    currentXP: 3750,
    maxXP: 5000,
    belt: 'Blue Belt',
    streak: 12,
    weeklyActivity: [true, true, false, true, true, false, true] // 월~일 수련 여부
  };

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
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

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-20">

      {/* 1. HUD Header (Player Status) */}
      <section className="relative bg-slate-900 border-b border-slate-800 pt-8 pb-12 px-4 md:px-8 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>

        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">

            {/* User Info & Level */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border-2 border-slate-800">
                  <span className="text-3xl font-black text-white">{user?.email?.[0].toUpperCase()}</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-slate-900 rounded-lg px-2 py-1 border border-slate-700 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs font-bold text-white">Lv.{userStats.level}</span>
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white mb-1">환영합니다, {user?.email?.split('@')[0]}님!</h1>
                <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                    {userStats.belt}
                  </span>
                  <span>•</span>
                  <span>오늘도 매트 위에서 성장하세요 🥋</span>
                </div>

                {/* XP Bar */}
                <div className="w-48 md:w-64">
                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                    <span>EXP</span>
                    <span>{userStats.currentXP} / {userStats.maxXP}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                      style={{ width: `${(userStats.currentXP / userStats.maxXP) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats (Streak & Activity) */}
            <div className="flex items-center gap-6 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 backdrop-blur-sm">
              <div className="text-center px-2">
                <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                  <Flame className="w-5 h-5 fill-orange-400 animate-pulse" />
                  <span className="text-xl font-black">{userStats.streak}</span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Day Streak</p>
              </div>

              <div className="w-px h-10 bg-slate-700"></div>

              <div className="flex flex-col items-center gap-2">
                <div className="flex gap-1">
                  {userStats.weeklyActivity.map((active, i) => (
                    <div
                      key={i}
                      className={`w-2 h-8 rounded-full ${active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-700'}`}
                    ></div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Weekly Activity</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-8 relative z-20">

        {/* 2. Quick Actions */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mb-8">
          <button
            onClick={() => navigate('/journal')}
            className="group bg-slate-800 hover:bg-indigo-600 border border-slate-700 hover:border-indigo-500 rounded-xl p-4 transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-700 group-hover:bg-white/20 flex items-center justify-center mb-3 transition-colors">
              <BookOpen className="w-5 h-5 text-indigo-400 group-hover:text-white" />
            </div>
            <h3 className="font-bold text-white text-sm md:text-base mb-1">수련 일지</h3>
            <p className="text-xs text-slate-400 group-hover:text-indigo-100">오늘의 스파링 기록하기</p>
          </button>

          <button
            onClick={() => navigate('/arena')}
            className="group bg-slate-800 hover:bg-red-600 border border-slate-700 hover:border-red-500 rounded-xl p-4 transition-all duration-300 shadow-lg hover:shadow-red-500/20 hover:-translate-y-1 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-700 group-hover:bg-white/20 flex items-center justify-center mb-3 transition-colors">
              <Sword className="w-5 h-5 text-red-400 group-hover:text-white" />
            </div>
            <h3 className="font-bold text-white text-sm md:text-base mb-1">아레나</h3>
            <p className="text-xs text-slate-400 group-hover:text-red-100">나의 전투력 측정하기</p>
          </button>

          <button
            onClick={() => navigate('/drills')}
            className="group bg-slate-800 hover:bg-emerald-600 border border-slate-700 hover:border-emerald-500 rounded-xl p-4 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-1 text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-700 group-hover:bg-white/20 flex items-center justify-center mb-3 transition-colors">
              <Dumbbell className="w-5 h-5 text-emerald-400 group-hover:text-white" />
            </div>
            <h3 className="font-bold text-white text-sm md:text-base mb-1">드릴 루틴</h3>
            <p className="text-xs text-slate-400 group-hover:text-emerald-100">매일 10분 기술 연습</p>
          </button>
        </div>

        {/* 3. AI Coach Insight Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-4 mb-10 flex items-center gap-4 shadow-lg relative overflow-hidden group cursor-pointer hover:border-indigo-500/50 transition-colors"
          onClick={() => navigate('/arena')}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 flex-shrink-0">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">AI Coach Insight</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            </div>
            <p className="text-sm text-slate-300 truncate">
              "최근 <span className="text-white font-bold">가드 패스</span> 성공률이 떨어지고 있습니다. 추천 드릴을 확인해보세요."
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
        </div>

        {/* 4. Content Deck (Tabs) */}
        <div>
          <div className="flex items-center gap-6 border-b border-slate-800 mb-6">
            <button
              onClick={() => setActiveTab('courses')}
              className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'courses' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              추천 강의
              {activeTab === 'courses' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('drills')}
              className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'drills' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              실전 드릴
              {activeTab === 'drills' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-emerald-500 rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setActiveTab('feed')}
              className={`pb-3 text-sm font-bold transition-colors relative ${activeTab === 'feed' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              커뮤니티
              {activeTab === 'feed' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full"></div>}
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">

            {/* Courses Tab */}
            {activeTab === 'courses' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
                {recommendedCourses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-500/50 transition-all cursor-pointer"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img src={course.thumbnailUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
                      <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[10px] font-bold text-white">
                        {course.lessonCount} Lessons
                      </div>
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-white text-sm mb-1 line-clamp-1 group-hover:text-indigo-400 transition-colors">{course.title}</h4>
                      <p className="text-xs text-slate-400 mb-3 line-clamp-1">{course.instructorName || 'Grappl Instructor'}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">{course.category}</span>
                        <Play className="w-3 h-3 text-indigo-500 fill-indigo-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Drills Tab */}
            {activeTab === 'drills' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-fade-in">
                {drills.map(drill => (
                  <div
                    key={drill.id}
                    onClick={() => navigate(`/drills/${drill.id}`)}
                    className="aspect-[9/16] bg-slate-900 rounded-xl relative overflow-hidden group cursor-pointer border border-slate-800 hover:border-emerald-500/50 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80"></div>
                    <div className="absolute bottom-0 left-0 p-3 w-full">
                      <h4 className="text-white text-xs font-bold line-clamp-2 mb-1 group-hover:text-emerald-400 transition-colors">{drill.title}</h4>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Activity className="w-3 h-3" />
                        <span>{drill.difficulty}</span>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Feed Tab */}
            {activeTab === 'feed' && (
              <div className="space-y-3 animate-fade-in">
                {trainingLogs.map(log => (
                  <div key={log.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex gap-4 hover:border-slate-700 transition-colors">
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
                <button
                  onClick={() => navigate('/journal')}
                  className="w-full py-3 text-sm text-slate-400 hover:text-white border border-dashed border-slate-800 rounded-xl hover:bg-slate-800 transition-all"
                >
                  커뮤니티 더보기
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};
