import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Play, ChevronRight, Heart, MessageCircle, Share2,
  Trophy, Zap, Target, Filter, TrendingUp
} from 'lucide-react';
import { Button } from '../components/Button';
import {
  getCourses, getDrills, getPublicTrainingLogs,
  getUserCourses, getLessonProgress
} from '../lib/api';
import { Course, Drill, TrainingLog } from '../types';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Data states
  const [continueWatching, setContinueWatching] = useState<any>(null);
  const [recommendedCourses, setRecommendedCourses] = useState<Course[]>([]);
  const [drills, setDrills] = useState<Drill[]>([]);
  const [trainingLogs, setTrainingLogs] = useState<TrainingLog[]>([]);
  const [userStats, setUserStats] = useState({
    level: 5,
    currentXP: 3750,
    maxXP: 5000,
    belt: 'Blue Belt'
  });

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', label: '전체' },
    { id: 'standing', label: '스탠딩' },
    { id: 'guard', label: '가드' },
    { id: 'pass', label: '패스' },
    { id: 'side', label: '사이드' },
    { id: 'mount', label: '마운트' },
    { id: 'back', label: '백' }
  ];

  useEffect(() => {
    if (!user) {
      navigate('/');
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch courses
        const courses = await getCourses();
        setRecommendedCourses(courses.slice(0, 6));

        // Fetch drills
        const { data: drillsData } = await getDrills();
        if (drillsData) {
          setDrills(drillsData.slice(0, 8));
        }

        // Fetch training logs
        const { data: logsData } = await getPublicTrainingLogs(1, 10);
        if (logsData) {
          setTrainingLogs(logsData);
        }

        // TODO: Fetch continue watching from user progress
        // For now, use mock data
        if (courses.length > 0) {
          setContinueWatching({
            course: courses[0],
            progress: 45,
            lastLesson: 'Lesson 3: Advanced Techniques'
          });
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  const filteredCourses = selectedCategory === 'all'
    ? recommendedCourses
    : recommendedCourses.filter(c => c.category === selectedCategory);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* 1. Continue Watching Section */}
      {continueWatching && (
        <section className="relative h-[60vh] min-h-[500px] overflow-hidden">
          <div className="absolute inset-0">
            <img
              src={continueWatching.course.thumbnailUrl}
              alt={continueWatching.course.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent"></div>
          </div>

          <div className="relative h-full flex items-end pb-16 px-4 md:px-8 max-w-7xl mx-auto">
            <div className="max-w-2xl">
              <div className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full mb-4">
                <span className="text-blue-300 text-sm font-semibold">계속 시청하기</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
                {continueWatching.course.title}
              </h1>

              <p className="text-lg text-slate-300 mb-6 line-clamp-2">
                {continueWatching.course.description}
              </p>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-slate-400 mb-2">
                  <span>{continueWatching.lastLesson}</span>
                  <span>{continueWatching.progress}% 완료</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                    style={{ width: `${continueWatching.progress}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="bg-white text-slate-900 hover:bg-slate-200 px-8 py-6 text-lg rounded-full"
                  onClick={() => navigate(`/courses/${continueWatching.course.id}`)}
                >
                  <Play className="w-6 h-6 mr-2 fill-slate-900" />
                  이어서 보기
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-600 text-white hover:bg-white/10 px-8 py-6 text-lg rounded-full"
                  onClick={() => navigate(`/courses/${continueWatching.course.id}`)}
                >
                  강좌 정보
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Recommended Courses Section */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">추천 강좌</h2>
          <button
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
            onClick={() => navigate('/browse')}
          >
            전체 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedCategory === cat.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Horizontal Scroll */}
        <div className="overflow-x-auto scrollbar-hide -mx-4 px-4">
          <div className="flex gap-4 pb-4">
            {filteredCourses.map(course => (
              <div
                key={course.id}
                className="flex-shrink-0 w-72 group cursor-pointer"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                  <img
                    src={course.thumbnailUrl}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-8 h-8 text-slate-900 fill-slate-900 ml-1" />
                    </div>
                  </div>
                  {course.price === 0 && (
                    <div className="absolute top-3 right-3 px-3 py-1 bg-green-500 rounded-full">
                      <span className="text-white text-xs font-bold">1강 무료</span>
                    </div>
                  )}
                </div>
                <h3 className="font-bold text-lg mb-1 line-clamp-1 group-hover:text-blue-400 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                  {course.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{course.creatorName}</span>
                  <span>•</span>
                  <span>{course.lessonCount} 강의</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Drill & Routine Section (Reels Style) */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">실전 드릴</h2>
          <button
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
            onClick={() => navigate('/drills')}
          >
            전체 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {drills.map(drill => (
            <div
              key={drill.id}
              className="aspect-[9/16] rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-800 hover:border-blue-500/50 transition-all"
              onClick={() => navigate(`/drills/${drill.id}`)}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40"></div>

              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-7 h-7 text-slate-900 fill-slate-900 ml-1" />
                </div>
              </div>

              {/* Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-3">
                <h4 className="font-bold text-sm text-white mb-1 line-clamp-2">
                  {drill.title}
                </h4>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Play className="w-3 h-3" />
                  <span>{drill.views || 0}</span>
                </div>
              </div>

              {/* Duration Badge */}
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-full">
                <span className="text-xs text-white font-medium">{drill.length}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Training Log Feed (Threads Style) */}
      <section className="py-12 px-4 md:px-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">수련 피드</h2>
          <button
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
            onClick={() => navigate('/journal')}
          >
            전체 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {trainingLogs.map(log => (
            <div
              key={log.id}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {log.userName?.[0] || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-white">{log.userName || '익명'}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="text-slate-300 mb-4 leading-relaxed">
                {log.notes}
              </p>

              {/* Stats */}
              <div className="flex gap-4 text-sm text-slate-400 mb-4">
                <span>⏱️ {log.duration}분</span>
                <span>🔥 {log.intensity}/5</span>
                {log.sparringRounds && <span>🥋 {log.sparringRounds} 라운드</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-6 pt-4 border-t border-slate-800">
                <button className="flex items-center gap-2 text-slate-400 hover:text-red-400 transition-colors">
                  <Heart className="w-5 h-5" />
                  <span className="text-sm">{log.likes || 0}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-blue-400 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                  <span className="text-sm">{log.comments || 0}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-400 hover:text-green-400 transition-colors">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. ARENA Section */}
      <section className="py-12 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold">ARENA</h2>
          <button
            className="text-slate-400 hover:text-white flex items-center gap-2 text-sm"
            onClick={() => navigate('/arena')}
          >
            자세히 보기
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Level Progress Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-slate-400 text-sm mb-1">현재 레벨</p>
                <h3 className="text-3xl font-black text-white">
                  Level {userStats.level}
                </h3>
                <p className="text-blue-400 font-semibold">{userStats.belt}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Trophy className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* XP Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-slate-400 mb-2">
                <span>경험치</span>
                <span>{userStats.currentXP} / {userStats.maxXP} XP</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ width: `${(userStats.currentXP / userStats.maxXP) * 100}%` }}
                ></div>
              </div>
            </div>

            <p className="text-sm text-slate-400">
              다음 레벨까지 {userStats.maxXP - userStats.currentXP} XP 남음
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">12</p>
              <p className="text-sm text-slate-400">완강한 강좌</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">45</p>
              <p className="text-sm text-slate-400">수련 일지</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">8</p>
              <p className="text-sm text-slate-400">가상 시합</p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-white mb-1">24</p>
              <p className="text-sm text-slate-400">연속 수련일</p>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing at bottom */}
      <div className="h-20"></div>

      <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
    </div>
  );
};
