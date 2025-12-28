import React, { useState, useEffect } from 'react';
import { getCourses } from '../lib/api';
import { CourseCard } from '../components/CourseCard';
import { Course, VideoCategory, Difficulty } from '../types';
import { Filter, Search, Activity } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const Browse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await getCourses(20);
        setCourses(data);
        setError(null);
      } catch (error: any) {
        console.error('Error fetching courses:', error);
        setError(error.message || '강좌를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  // Define categories and difficulties before any conditional returns
  // Filter out 'Submission' from categories
  const categories = ['All', ...Object.values(VideoCategory).filter(cat => cat !== 'Submission')];
  const difficulties = ['All', ...Object.values(Difficulty)];

  // Create combined filter chips for mobile (categories + difficulties)
  const mobileFilters = React.useMemo(() => {
    // "전체" chip - always first
    const allChip = {
      type: 'category' as const,
      value: 'All',
      label: '전체',
      isSelected: selectedCategory === 'All' && selectedDifficulty === 'All'
    };

    // Other category chips (excluding 'All')
    const categoryChips = categories
      .filter(cat => cat !== 'All')
      .map(cat => ({
        type: 'category' as const,
        value: cat,
        label: cat,
        isSelected: selectedCategory === cat
      }));

    // Difficulty chips (excluding 'All')
    const difficultyChips = difficulties
      .filter(diff => diff !== 'All')
      .map(diff => ({
        type: 'difficulty' as const,
        value: diff,
        label: diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급',
        isSelected: selectedDifficulty === diff
      }));

    // Combine categories and difficulties (excluding "전체")
    const otherChips = [...categoryChips, ...difficultyChips];

    // Shuffle only the other chips
    for (let i = otherChips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [otherChips[i], otherChips[j]] = [otherChips[j], otherChips[i]];
    }

    // Return with "전체" always first
    return [allChip, ...otherChips];
  }, [selectedCategory, selectedDifficulty]);

  const filteredCourses = React.useMemo(() => {
    const filtered = courses.filter((course) => {
      const categoryMatch = selectedCategory === 'All' || course.category === selectedCategory;
      const difficultyMatch = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;

      return categoryMatch && difficultyMatch;
    });

    // Shuffle the filtered courses for random display
    const shuffled = [...filtered];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, [courses, selectedCategory, selectedDifficulty]);

  if (loading) {
    return <LoadingScreen message="콘텐츠 불러오는 중..." />;
  }

  if (error) {
    return <ErrorScreen error={error} resetMessage="강좌 목록을 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
  }

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
          {/* Mobile Filter Chips - YouTube Style Horizontal Scroll */}
          <div className="md:hidden mb-6 -mx-4 px-4">
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {mobileFilters.map((filter, index) => (
                <button
                  key={`${filter.type}-${filter.value}-${index}`}
                  onClick={() => {
                    if (filter.value === 'All') {
                      // Reset both filters when clicking "전체"
                      setSelectedCategory('All');
                      setSelectedDifficulty('All');
                    } else if (filter.type === 'category') {
                      setSelectedCategory(filter.value);
                      setSelectedDifficulty('All'); // Reset difficulty when selecting category
                    } else {
                      setSelectedDifficulty(filter.value);
                      setSelectedCategory('All'); // Reset category when selecting difficulty
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap flex-shrink-0 transition-all ${filter.isSelected
                    ? 'bg-white text-slate-900 font-medium'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>


          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-white">추천 클래스</h1>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="강좌 검색..."
                  className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 text-white placeholder-slate-500"
                />
              </div>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Filter className="w-4 h-4" />
                {sidebarOpen ? '필터 숨기기' : '필터'}
              </button>
            </div>
          </div>

          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500">
              조건에 맞는 강좌가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
