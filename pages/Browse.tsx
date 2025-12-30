import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import { getCourses } from '../lib/api';
import { Search, Filter, BookOpen } from 'lucide-react';
import { CourseCard } from '../components/CourseCard';
import { LoadingScreen } from '../components/LoadingScreen';
import { cn } from '../lib/utils';

export const Browse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await getCourses();
        setCourses(data);
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
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'All' || course.difficulty === selectedDifficulty;
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = ['All', 'Guard', 'Passing', 'Submission', 'Defense', 'Takedown'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

  if (loading) {
    return <LoadingScreen message="클래스 목록을 불러오고 있습니다..." />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-8 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black mb-2 flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-primary" />
              모든 클래스
            </h1>
            <p className="text-muted-foreground">
              세계 최고의 선수들이 제공하는 프리미엄 주짓수 강의를 만나보세요.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="클래스 검색..."
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-full text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 border-b border-border pb-6">
          {/* Category Filter */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    selectedCategory === cat
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Filter */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3 h-3" /> Difficulty
            </div>
            <div className="flex flex-wrap gap-2">
              {difficulties.map(diff => (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                    selectedDifficulty === diff
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80 hover:text-foreground"
                  )}
                >
                  {diff}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Course Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-muted/10 border border-dashed border-border rounded-2xl">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-bold text-foreground mb-2">검색 결과가 없습니다</h3>
            <p className="text-muted-foreground">다른 검색어나 필터를 시도해보세요.</p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedDifficulty('All'); }}
              className="mt-4 px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-sm font-bold rounded-lg transition-colors"
            >
              필터 초기화
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Activity Icon Component for filter label
const Activity = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);
