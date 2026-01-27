import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import { getCourses, getDailyFreeLesson } from '../lib/api';
import { Search, ChevronDown } from 'lucide-react';
import { CourseCard } from '../components/CourseCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn } from '../lib/utils';
import { LibraryTabs } from '../components/library/LibraryTabs';
import { useAuth } from '../contexts/AuthContext';


export const Browse: React.FC<{
  isEmbedded?: boolean;
  activeTab?: 'classes' | 'routines' | 'sparring';
  onTabChange?: (tab: 'classes' | 'routines' | 'sparring') => void;
}> = ({ isEmbedded, activeTab, onTabChange }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalSearchTerm, setInternalSearchTerm] = useState('');
  const searchTerm = internalSearchTerm;
  const setSearchTerm = setInternalSearchTerm;
  const [selectedCategory, setCategory] = useState('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedUniform, setSelectedUniform] = useState('All');
  const [selectedOwnership, setSelectedOwnership] = useState('All');
  const [sortBy, setSortBy] = useState<'shuffled' | 'latest' | 'popular'>('shuffled');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const categories = ['All', 'Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'];
  const ownershipOptions = ['All', 'My Classes', 'Not Purchased'];

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, freeLessonRes] = await Promise.all([
        getCourses(),
        getDailyFreeLesson()
      ]);

      if (!data) {
        console.warn('No courses received, utilizing empty array');
      }

      const freeCourseId = freeLessonRes.data?.courseId;

      // Process data with ranks and free status
      const process = (items: Course[]) => {
        const now = Date.now();
        const getHotScore = (item: any) => {
          const views = item.views || 0;
          const createdDate = item.createdAt ? new Date(item.createdAt).getTime() : now;
          const hoursSinceCreation = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
          return views / Math.pow(hoursSinceCreation + 2, 1.5);
        };

        const hotCourses = [...items]
          .filter(c => (c.views || 0) >= 5)
          .sort((a, b) => getHotScore(b) - getHotScore(a));

        const coursesWithRank = items.map(course => {
          const hotIndex = hotCourses.findIndex(hc => hc.id === course.id);
          return {
            ...course,
            rank: (hotIndex >= 0 && hotIndex < 3) ? hotIndex + 1 : undefined,
            isDailyFree: course.id === freeCourseId
          };
        });
        return coursesWithRank;
      };

      const processed = process(data);
      // Shuffle by default for browse fresh feel
      const shuffled = [...processed].sort(() => Math.random() - 0.5);
      setCourses(shuffled);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
      setError('서버와 연결할 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (course.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase());

    // Category mapping
    let matchesCategory = selectedCategory === 'All';

    if (selectedCategory === 'Standing') matchesCategory = (course.category as string) === 'Takedown' || course.category === 'Standing';
    if (selectedCategory === 'Guard') matchesCategory = course.category === 'Guard' || (course.category as string || '').includes('Guard');
    if (selectedCategory === 'Passing') matchesCategory = course.category === 'Passing' || (course.category as string || '').includes('Pass');
    if (selectedCategory === 'Side') matchesCategory = (course.category as string || '').includes('Side') || (course.category as string || '').includes('Defense');
    if (selectedCategory === 'Mount') matchesCategory = (course.category as string || '').includes('Mount') || (course.category as string || '').includes('Submission');
    if (selectedCategory === 'Back') matchesCategory = (course.category as string || '').includes('Back');

    const matchesDifficulty = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;
    const matchesUniform = selectedUniform === 'All' || (course as any).uniform_type === selectedUniform;

    let matchesOwnership = true;
    if (selectedOwnership === 'My Classes') {
      matchesOwnership = user?.ownedVideoIds?.includes(course.id) || course.creatorId === user?.id || false;
    } else if (selectedOwnership === 'Not Purchased') {
      matchesOwnership = !(user?.ownedVideoIds?.includes(course.id) || course.creatorId === user?.id);
    }

    return matchesSearch && (matchesCategory || selectedCategory === 'All') && matchesDifficulty && matchesUniform && matchesOwnership;
  }).sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
    }
    if (sortBy === 'popular') {
      return (b.views || 0) - (a.views || 0);
    }
    return 0; // Keep shuffled order if sortBy is 'shuffled'
  });
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const uniforms = ['All', 'Gi', 'No-Gi'];

  if (loading) {
    return (
      <LoadingScreen message="클래스 목록을 불러오고 있습니다..." />
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold mb-2 text-red-200">데이터를 불러올 수 없습니다</h2>
          <p className="text-zinc-400 mb-6 text-sm">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchCourses();
            }}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-colors"
          >
            다시 시도하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-zinc-950 text-zinc-100 flex flex-col",
      !isEmbedded && "md:pl-28 pt-8 pb-20 px-6 md:px-10"
    )}>



      {/* Main Content Area */}
      <main className={cn(
        "flex-1 p-4 md:px-12 md:pb-8 overflow-y-auto",
        !isEmbedded && "md:pt-0"
      )}>
        <div className="max-w-[1600px] mx-auto">
          {isEmbedded && activeTab && onTabChange && (
            <LibraryTabs activeTab={activeTab} onTabChange={onTabChange} />
          )}

          {/* Header & Filter System */}
          <div className="flex flex-col gap-8 mb-12">
            {!isEmbedded && <h1 className="text-3xl font-bold text-white mb-2">클래스</h1>}

            {/* Search & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
              <div className="relative w-full max-w-md group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-violet-500">
                  <Search className="h-4 w-4 text-zinc-500" />
                </div>
                <input
                  type="text"
                  placeholder="클래스 검색..."
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="text-zinc-500 text-sm font-medium">
                총 <span className="text-zinc-200 font-bold">{filteredCourses.length}</span>개의 클래스
              </div>
            </div>

            {/* Filter Rows */}
            <div className="space-y-4">
              {/* Row 1: Primary Filter (Position) */}
              <div className="flex items-center gap-3">
                <div className="flex overflow-x-auto gap-2 no-scrollbar py-1">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "h-10 px-5 rounded-full text-xs transition-all duration-200 whitespace-nowrap border flex items-center justify-center",
                        selectedCategory === cat
                          ? "bg-violet-600 border-violet-500 text-white shadow-violet-500/20 font-bold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 2: Secondary Filters (Dropdowns) */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Uniform Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'uniform' ? null : 'uniform')}
                    className={cn(
                      "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                      selectedUniform !== 'All' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                    )}
                  >
                    <span className="whitespace-nowrap">Uniform: {selectedUniform}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'uniform' && "rotate-180")} />
                  </button>

                  {openDropdown === 'uniform' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-12 left-0 w-40 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {uniforms.map(type => (
                          <button
                            key={type}
                            onClick={() => {
                              setSelectedUniform(type);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-200",
                              selectedUniform === type ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Difficulty Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'difficulty' ? null : 'difficulty')}
                    className={cn(
                      "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                      selectedDifficulty !== 'All' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                    )}
                  >
                    <span className="whitespace-nowrap">Level: {selectedDifficulty}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'difficulty' && "rotate-180")} />
                  </button>

                  {openDropdown === 'difficulty' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-12 left-0 w-40 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {difficulties.map(diff => (
                          <button
                            key={diff}
                            onClick={() => {
                              setSelectedDifficulty(diff);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-200",
                              selectedDifficulty === diff ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Ownership Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'ownership' ? null : 'ownership')}
                    className={cn(
                      "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                      selectedOwnership !== 'All' && "border-violet-500/50",
                      selectedOwnership !== 'All' ? "bg-violet-500/5 text-violet-300" : ""
                    )}
                  >
                    <span className="whitespace-nowrap">Status: {selectedOwnership}</span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'ownership' && "rotate-180")} />
                  </button>

                  {openDropdown === 'ownership' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-12 left-0 w-40 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {ownershipOptions.map(option => (
                          <button
                            key={option}
                            onClick={() => {
                              setSelectedOwnership(option);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-200",
                              selectedOwnership === option ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')}
                    className={cn(
                      "h-10 px-4 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2 transition-all duration-200 hover:border-zinc-700",
                      sortBy !== 'shuffled' && "border-violet-500/50 bg-violet-500/5 text-violet-300"
                    )}
                  >
                    <span className="whitespace-nowrap">
                      Sort: {sortBy === 'shuffled' ? 'Recommended' : sortBy === 'latest' ? 'Latest' : 'Popular'}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", openDropdown === 'sort' && "rotate-180")} />
                  </button>

                  {openDropdown === 'sort' && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                      <div className="absolute top-12 left-0 w-40 bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-2 z-50 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        {[
                          { label: 'Recommended', value: 'shuffled' },
                          { label: 'Latest', value: 'latest' },
                          { label: 'Popular', value: 'popular' }
                        ].map(option => (
                          <button
                            key={option.value}
                            onClick={() => {
                              setSortBy(option.value as any);
                              setOpenDropdown(null);
                            }}
                            className={cn(
                              "w-full text-left px-3 py-2 rounded-xl text-xs transition-colors duration-200",
                              sortBy === option.value ? "bg-violet-600 text-white" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {(selectedCategory !== 'All' || selectedDifficulty !== 'All' || selectedUniform !== 'All' || selectedOwnership !== 'All' || searchTerm !== '') && (
                  <button
                    onClick={() => {
                      setCategory('All');
                      setSelectedDifficulty('All');
                      setSelectedUniform('All');
                      setSelectedOwnership('All');
                      setInternalSearchTerm('');
                      setSortBy('shuffled');
                    }}
                    className="h-10 px-4 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
                  >
                    필터 초기화
                  </button>
                )}
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
                onClick={() => { setSearchTerm(''); setCategory('All'); setSelectedDifficulty('All'); setSelectedUniform('All'); setSelectedOwnership('All'); }}
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
