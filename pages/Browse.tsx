import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import { getCourses } from '../lib/api';
import { Search } from 'lucide-react';
import { CourseCard } from '../components/CourseCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn } from '../lib/utils';

export const Browse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [selectedUniform, setSelectedUniform] = useState<string>('All');

  const categories = ['All', 'Standing', 'Guard', 'Passing', 'Side Control', 'Mount', 'Back Control', 'Gi', 'No-Gi'];

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCourses();
        // Shuffle courses for a fresh experience on every refresh
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setCourses(shuffled);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase());

    // Category mapping
    let matchesCategory = selectedCategory === 'All';

    if (selectedCategory === 'Standing') matchesCategory = (course.category as string) === 'Takedown' || course.category === 'Standing';
    if (selectedCategory === 'Guard') matchesCategory = course.category === 'Guard';
    if (selectedCategory === 'Passing') matchesCategory = course.category === 'Passing';
    if (selectedCategory === 'Side Control') matchesCategory = (course.category as string) === 'Defense' || course.category === 'Side';
    if (selectedCategory === 'Mount') matchesCategory = (course.category as string) === 'Submission' || course.category === 'Mount';
    if (selectedCategory === 'Back Control') matchesCategory = course.category === 'Back';
    if (selectedCategory === 'Gi') matchesCategory = course.category === 'Gi';
    if (selectedCategory === 'No-Gi') matchesCategory = course.category === 'No-Gi';

    const matchesDifficulty = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;
    const matchesUniform = selectedUniform === 'All' || (course as any).uniform_type === selectedUniform;
    return matchesSearch && (matchesCategory || selectedCategory === 'All') && matchesDifficulty && matchesUniform;
  });
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const uniforms = ['All', 'Gi', 'No-Gi'];

  if (loading) {
    return <LoadingScreen message="클래스 목록을 불러오고 있습니다..." />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row pt-8 pb-20 px-6 md:px-10">

      {/* Sidebar Filters (Desktop: Fixed / Mobile: Horizontal Scroll or Stack) */}
      <aside className="w-full md:w-[260px] md:h-[calc(100vh-6rem)] md:sticky md:top-24 bg-zinc-950/50 backdrop-blur-sm p-6 border-b md:border-b-0 md:border-r border-zinc-900 overflow-y-auto shrink-0 z-30 custom-scrollbar">
        <div className="space-y-10">

          {/* Position Group */}
          <div>
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-5 px-2">Position</h3>
            <div className="flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 pb-2 md:pb-0 no-scrollbar">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-xs transition-all text-left whitespace-nowrap border mb-1",
                    selectedCategory === cat
                      ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] font-bold"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Uniform Group */}
          <div>
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-5 px-2">Uniform</h3>
            <div className="flex flex-row md:flex-col gap-2">
              {uniforms.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedUniform(type)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-xs transition-all text-left border mb-1",
                    selectedUniform === type
                      ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] font-bold"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Group */}
          <div>
            <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-5 px-2">Difficulty</h3>
            <div className="flex flex-row md:flex-col gap-2">
              {difficulties.map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-xs transition-all text-left border mb-1",
                    selectedDifficulty === diff
                      ? "bg-violet-600 border-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] font-bold"
                      : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                  )}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>

        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:pt-4 md:px-12 md:pb-8 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">

          {/* Header Section (Category then Search/Reels) */}
          <div className="flex flex-col gap-6 mb-12">
            <div className="flex justify-between items-center w-full">
              <div className="relative w-full max-w-md group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500">
                  <Search className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search classes..."
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="text-zinc-500 text-sm font-medium hidden md:block">
                Showing <span className="text-zinc-200 font-bold">{filteredCourses.length}</span> classes
              </div>
            </div>

          </div> {/* Closing div for "Header Section (Category then Search/Reels)" */}

          {/* Course Grid */}
          {filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
              {filteredCourses.map(course => (
                <CourseCard key={course.id} course={course} />
              ))}
            </div>
          ) : (
            <div className="text-center py-32 bg-zinc-900/20 border border-zinc-900 rounded-[2rem] backdrop-blur-sm">
              <div className="relative inline-block mb-6">
                <Search className="w-16 h-16 text-zinc-800 mx-auto" />
                <div className="absolute inset-0 bg-violet-500/5 blur-2xl rounded-full"></div>
              </div>
              <h3 className="text-2xl font-bold text-zinc-200 mb-3">검색 결과가 없습니다</h3>
              <p className="text-zinc-500 max-w-xs mx-auto mb-8">다른 검색어나 필터를 시도해보세요.</p>
              <button
                onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedDifficulty('All'); setSelectedUniform('All'); }}
                className="px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-bold rounded-2xl transition-all hover:scale-105"
              >
                필터 초기화
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
