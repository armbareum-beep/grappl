import React, { useState } from 'react';
import { MOCK_VIDEOS } from '../constants';
import { VideoCard } from '../components/VideoCard';
import { VideoCategory, Difficulty } from '../types';
import { Filter } from 'lucide-react';

export const Browse: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');

  const filteredVideos = MOCK_VIDEOS.filter((video) => {
    const categoryMatch = selectedCategory === 'All' || video.category === selectedCategory;
    const difficultyMatch = selectedDifficulty === 'All' || video.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">기술 탐색</h1>
          <p className="text-slate-500 mt-1">원하는 기술과 난이도를 선택하세요.</p>
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
      </div>

      {/* Grid */}
      {filteredVideos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500">
          조건에 맞는 영상이 없습니다.
        </div>
      )}
    </div>
  );
};
