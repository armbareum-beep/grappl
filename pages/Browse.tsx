import React, { useState, useEffect } from 'react';
import { getCourses } from '../lib/api';
import { CourseCard } from '../components/CourseCard';
import { Course, VideoCategory, Difficulty } from '../types';
import { Filter, Search, Menu } from 'lucide-react';

export const Browse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
    const categoryMatch = selectedCategory === 'All' || course.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  const categories = ['All', ...Object.values(VideoCategory)];
  const difficulties = ['All', ...Object.values(Difficulty)];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-slate-200 transition-all duration-300 overflow-hidden flex-shrink-0 fixed h-[calc(100vh-64px)] top-16 z-20 hidden md:block`}>
        <div className="p-4 space-y-6 overflow-y-auto h-full">
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 px-2">카테고리</h3>
            <div className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {cat === 'All' ? '전체' : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <h3 className="font-semibold text-slate-900 mb-3 px-2">난이도</h3>
            <div className="space-y-1">
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedDifficulty === diff
                      ? 'bg-slate-100 font-medium text-slate-900'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {diff === 'All' ? '전체' : diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : ''}`}>
        <div className="p-6">
          {/* Mobile Filter Toggle (Visible only on mobile) */}
          <div className="md:hidden mb-6 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm border ${selectedCategory === cat
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200'
                  }`}
              >
                {cat === 'All' ? '전체' : cat}
              </button>
            ))}
          </div>

          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">추천 강좌</h1>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
            >
              <Filter className="w-4 h-4" />
              {sidebarOpen ? '필터 숨기기' : '필터 보이기'}
            </button>
          </div>

          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
