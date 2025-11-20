import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { MOCK_VIDEOS, MOCK_CREATORS } from '../constants';
import { Button } from '../components/Button';
import { Play, Lock, Heart, Share2 } from 'lucide-react';

export const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const video = MOCK_VIDEOS.find((v) => v.id === id);
  const creator = MOCK_CREATORS.find((c) => c.id === video?.creatorId);

  if (!video) {
    return <div className="p-10 text-center">영상을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Video Player Placeholder */}
      <div className="w-full bg-black aspect-video flex items-center justify-center relative group">
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
          <div className="bg-white/20 p-6 rounded-full backdrop-blur-sm mb-4 cursor-pointer hover:bg-white/30 transition">
             <Lock className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-bold mb-2">이 영상을 시청하려면 구매하세요</h2>
          <p className="text-slate-300">단품 구매 또는 월 구독으로 전체 영상을 시청할 수 있습니다.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Info */}
          <div className="lg:w-2/3">
             <div className="flex justify-between items-start mb-4">
               <div>
                 <span className="text-blue-600 font-bold text-sm tracking-wide uppercase">{video.category} &bull; {video.difficulty}</span>
                 <h1 className="text-3xl font-bold text-slate-900 mt-1">{video.title}</h1>
               </div>
               <div className="flex gap-2">
                  <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                     <Heart className="w-6 h-6" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                     <Share2 className="w-6 h-6" />
                  </button>
               </div>
             </div>
             
             <div className="prose max-w-none text-slate-600 mb-8">
               <p>{video.description}</p>
               <p className="mt-4">
                 이 강좌에서는 {video.category} 상황에서의 핵심 원리와 디테일한 메커니즘을 다룹니다. 
                 특히 {video.difficulty === 'Beginner' ? '입문자' : '숙련자'}가 범하기 쉬운 실수들을 교정하고, 
                 실전 스파링에서 바로 사용할 수 있는 팁들을 제공합니다.
               </p>
             </div>

             {/* Creator Profile Small */}
             {creator && (
               <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center">
                 <img src={creator.profileImage} alt={creator.name} className="w-16 h-16 rounded-full object-cover mr-4" />
                 <div className="flex-grow">
                    <h3 className="font-bold text-lg text-slate-900">{creator.name}</h3>
                    <p className="text-slate-500 text-sm">{creator.bio}</p>
                 </div>
                 <Button variant="outline" size="sm">채널 보기</Button>
               </div>
             )}
          </div>

          {/* Sidebar CTA */}
          <div className="lg:w-1/3">
            <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 mb-4">구매 옵션</h3>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">단품 구매</span>
                  <span className="text-2xl font-bold text-slate-900">{video.price.toLocaleString()}원</span>
                </div>
                <Button className="w-full mb-2">이 영상만 구매하기</Button>
                <p className="text-xs text-slate-400 text-center">평생 소장 및 무제한 시청</p>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">월간 구독</span>
                  <span className="text-xl font-bold text-blue-600">₩29,000<span className="text-sm text-slate-400 font-normal">/월</span></span>
                </div>
                <Button variant="secondary" className="w-full mb-2">구독하고 전체 영상 보기</Button>
                <p className="text-xs text-slate-400 text-center">모든 강좌 무제한 접근</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
