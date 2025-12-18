import React, { useState, useEffect } from 'react';
import { getCourses, getBundles } from '../lib/api';
import { CourseCard } from '../components/CourseCard';
import { BundleCard } from '../components/BundleCard';
import { Course, Bundle, VideoCategory, Difficulty } from '../types';
import { Filter, Search, Activity, Package } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const Browse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'bundles'>('courses');

  useEffect(() => {
    async function fetchData() {
      try {
        const [coursesData, bundlesData] = await Promise.all([
          getCourses(20),
          getBundles()
        ]);
        setCourses(coursesData);
        if (bundlesData.data) {
          setBundles(bundlesData.data);
        }
        setError(null);
      } catch (error: any) {
        console.error('Error fetching data:', error);
        setError(error.message || '콘텐츠를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const categoryMatch = selectedCategory === 'All' || course.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;

    return categoryMatch && difficultyMatch;
  });

  if (loading) {
    return <LoadingScreen message="콘텐츠 불러오는 중..." />;
  }

  if (error) {
    return <ErrorScreen error={error} resetMessage="강좌 목록을 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
  }


  const categories = ['All', ...Object.values(VideoCategory)];
  const difficulties = ['All', ...Object.values(Difficulty)];

  return (
    <div className="flex w-full min-h-screen bg-slate-950">
      {/* Sidebar - Dark Theme */}
      <aside
        className={`${sidebarOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
          } bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0 fixed md:sticky top-16 h-[calc(100vh-64px)] z-20 hidden md:block`}
      >
        <div className="w-64 p-4 space-y-6 overflow-y-auto h-full">
          <div>
            <h3 className="font-semibold text-white mb-3 px-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-500" />
              카테고리
            </h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${selectedCategory === cat
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    }`}
                >
                  {cat === 'All' ? '전체' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6">
            <h3 className="font-semibold text-white mb-3 px-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              난이도
            </h3>
            <div className="space-y-1">
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200 ${selectedDifficulty === diff
                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 font-medium'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white border border-transparent'
                    }`}
                >
                  {diff === 'All' ? '전체' : diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Dark Theme */}
      <div className="flex-1 w-full min-w-0 transition-all duration-300">
        <div className="p-4 md:p-6">
          {/* Mobile Filter Toggle */}
          <div className="md:hidden mb-6">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm border transition-all ${selectedCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                >
                  {cat === 'All' ? '전체' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setActiveTab('courses')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${activeTab === 'courses'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                강좌
              </button>
              <button
                onClick={() => setActiveTab('bundles')}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${activeTab === 'bundles'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
              >
                <Package className="w-4 h-4" />
                번들
              </button>
            </div>

            {/* Header with Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-2xl font-bold text-white">
                {activeTab === 'courses' ? '추천 강좌' : '프리미엄 번들'}
              </h1>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder={activeTab === 'courses' ? '강좌 검색...' : '번들 검색...'}
                    className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 text-white placeholder-slate-500"
                  />
                </div>
                {activeTab === 'courses' && (
                  <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
                  >
                    <Filter className="w-4 h-4" />
                    {sidebarOpen ? '필터 숨기기' : '필터'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Content Grid */}
          {activeTab === 'courses' ? (
            filteredCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                조건에 맞는 강좌가 없습니다.
              </div>
            )
          ) : (
            bundles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {bundles.map((bundle) => (
                  <BundleCard key={bundle.id} bundle={bundle} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-slate-500">
                아직 번들이 없습니다.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
