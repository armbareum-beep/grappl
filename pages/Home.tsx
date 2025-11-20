import React from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, CheckCircle, Users } from 'lucide-react';
import { Button } from '../components/Button';
import { VideoCard } from '../components/VideoCard';
import { MOCK_VIDEOS, MOCK_CREATORS } from '../constants';

export const Home: React.FC = () => {
  const featuredVideos = MOCK_VIDEOS.slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-slate-900 text-white pt-20 pb-32 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80"
            alt="BJJ Training"
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center z-10">
          <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            매트를 지배하는 <span className="text-blue-500">기술의 정점</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mb-10">
            세계적인 챔피언들의 노하우가 담긴 체계적인 커리큘럼.<br />
            Grappl과 함께 당신의 주짓수를 한 단계 업그레이드하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/browse">
              <Button size="lg" className="w-full sm:w-auto text-lg font-bold shadow-lg shadow-blue-900/50">
                지금 시작하기
              </Button>
            </Link>
            <Link to="/pricing">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-white border-slate-500 hover:bg-white/10 hover:border-white">
                요금제 보기
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Value Props */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">고화질 테크닉 영상</h3>
              <p className="text-slate-600">모든 디테일을 놓치지 않는 4K 고화질 영상과 멀티 앵글 제공.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">체계적인 커리큘럼</h3>
              <p className="text-slate-600">초급부터 고급까지, 단계별로 구성된 마스터 클래스.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">검증된 크리에이터</h3>
              <p className="text-slate-600">월드 챔피언, 블랙벨트 지도자들이 직접 알려주는 실전 기술.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Videos */}
      <div className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">인기 테크닉</h2>
              <p className="text-slate-600 mt-2">가장 많은 회원이 시청한 강좌입니다.</p>
            </div>
            <Link to="/browse" className="text-blue-600 font-semibold hover:text-blue-700">
              전체 보기 &rarr;
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {featuredVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </div>

      {/* Popular Creators */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
           <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">대표 인스트럭터</h2>
           <div className="grid md:grid-cols-2 gap-8">
              {MOCK_CREATORS.map((creator) => (
                <div key={creator.id} className="flex items-center p-6 bg-slate-50 rounded-xl border border-slate-100 hover:shadow-lg transition-shadow">
                   <img src={creator.profileImage} alt={creator.name} className="w-24 h-24 rounded-full object-cover mr-6" />
                   <div>
                     <h3 className="text-xl font-bold text-slate-900">{creator.name}</h3>
                     <p className="text-slate-600 text-sm mt-1 mb-3">{creator.bio}</p>
                     <Button size="sm" variant="outline">프로필 보기</Button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-blue-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">지금 바로 수련을 시작하세요</h2>
          <p className="text-blue-100 mb-8 text-lg">월 구독으로 모든 프리미엄 강좌를 무제한 시청할 수 있습니다.</p>
          <Link to="/pricing">
             <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50">
                무료로 시작하기
             </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
