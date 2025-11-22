import React, { useState, useEffect } from 'react';
import { getCourses } from '../lib/api';
import { CourseCard } from '../components/CourseCard';
import { Course, VideoCategory, Difficulty } from '../types';
import { Filter } from 'lucide-react';

export const Browse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [maxPrice, setMaxPrice] = useState<number>(100000);
  const [priceFilter, setPriceFilter] = useState<number>(100000);

  useEffect(() => {
    async function fetchCourses() {
      try {
        const data = await getCourses();
        setCourses(data);
        if (data.length > 0) {
          const max = Math.max(...data.map(c => c.price));
          setMaxPrice(max);
          setPriceFilter(max);
        }
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
    const priceMatch = course.price <= priceFilter;

    return categoryMatch && difficultyMatch && priceMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">강좌 둘러보기</h1>
          <p className="text-slate-500 mt-1">원하는 카테고리와 난이도를 선택하세요.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex items-center text-slate-500 mr-2">
          <Filter className="w-5 h-5 mr-2" />
          <span className="font-semibold">필터:</span>
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="block w-full md:w-auto rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        >
          <option value="All">모든 카테고리</option>
          {Object.values(VideoCategory).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="block w-full md:w-auto rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        >
          <option value="All">모든 난이도</option>
          {Object.values(Difficulty).map((diff) => (
            <option key={diff} value={diff}>
              {diff === 'Beginner' ? '초급' : diff === 'Intermediate' ? '중급' : '상급'}
            </option>
          ))}
        </select>

        <div className="flex flex-col w-full md:w-64">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span>최대 가격</span>
            <span className="font-medium">₩{priceFilter.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxPrice}
            step="1000"
            value={priceFilter}
            onChange={(e) => setPriceFilter(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0원</span>
            <span>₩{maxPrice.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
  );
};
