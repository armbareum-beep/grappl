import React from 'react';
import { MOCK_VIDEOS } from '../constants';
import { VideoCard } from '../components/VideoCard';
import { Button } from '../components/Button';
import { Link } from 'react-router-dom';

export const MyLibrary: React.FC = () => {
  // Simulating user owning the first video
  const myVideos = [MOCK_VIDEOS[0]];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">내 라이브러리</h1>

      {myVideos.length > 0 ? (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {myVideos.map((video) => (
              <div key={video.id} className="relative">
                 <VideoCard video={video} />
                 <div className="mt-2">
                    <Button size="sm" className="w-full">바로 재생하기</Button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-slate-200">
          <h2 className="text-xl font-semibold text-slate-700 mb-2">구매한 영상이 없습니다</h2>
          <p className="text-slate-500 mb-6">세계적인 선수들의 기술을 배워보세요.</p>
          <Link to="/browse">
            <Button>영상 둘러보기</Button>
          </Link>
        </div>
      )}
      
      <div className="mt-12 border-t border-slate-200 pt-8">
         <h2 className="text-2xl font-bold text-slate-900 mb-4">구독 상태</h2>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
               <span className="text-slate-500 text-sm">현재 멤버십</span>
               <p className="text-xl font-bold text-slate-900">무료 회원</p>
            </div>
            <Link to="/pricing">
               <Button variant="secondary">멤버십 업그레이드</Button>
            </Link>
         </div>
      </div>
    </div>
  );
};
