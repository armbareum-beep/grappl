import React from 'react';
import { Video } from '../types';
import { Play, Clock, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VideoCardProps {
  video: Video;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  const formattedPrice = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(video.price);

  return (
    <Link to={`/videos/${video.id}`} className="group block h-full">
      <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-slate-100">
        <div className="relative aspect-[16/9] overflow-hidden">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/90 p-3 rounded-full">
              <Play className="w-6 h-6 text-blue-600 fill-current" />
            </div>
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {video.length}
          </div>
          <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded text-white ${video.difficulty === 'Advanced' ? 'bg-red-500' :
              video.difficulty === 'Intermediate' ? 'bg-yellow-500' : 'bg-green-500'
            }`}>
            {video.difficulty === 'Beginner' ? '초급' : video.difficulty === 'Intermediate' ? '중급' : '상급'}
          </span>
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <div className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">
            {video.category}
          </div>
          <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {video.title}
          </h3>

          <div className="mt-auto space-y-3">
            <div className="flex items-center text-sm text-slate-500">
              <User className="w-4 h-4 mr-1" />
              <span>{video.creatorName}</span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className="font-bold text-slate-900">{formattedPrice}</span>
              <span className="text-xs text-slate-400 flex items-center">
                <Clock className="w-3 h-3 mr-1" /> {video.createdAt}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
