import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getVideoById, getVideos, getCreatorById, recordWatchTime } from '../lib/api';
import { Video, Creator } from '../types';
import { Button } from '../components/Button';
import { VideoCard } from '../components/VideoCard';
import { VideoPlayer } from '../components/VideoPlayer';
import { Play, Lock, Heart, Share2, Clock, Eye } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        // Fetch video details
        const videoData = await getVideoById(id);
        setVideo(videoData);

        if (videoData) {
          // Fetch creator info
          const creatorData = await getCreatorById(videoData.creatorId);
          setCreator(creatorData);

          // Fetch related videos (same category or same creator)
          const allVideos = await getVideos();
          const related = allVideos
            .filter(v =>
              v.id !== id &&
              (v.category === videoData.category || v.creatorId === videoData.creatorId)
            )
            .slice(0, 3);
          setRelatedVideos(related);
        }
      } catch (error) {
        console.error('Error fetching video details:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id]);

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

  if (!video) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">영상을 찾을 수 없습니다</h2>
          <Link to="/browse">
            <Button>영상 둘러보기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const formattedPrice = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(video.price);

  const lastTickRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  const handleProgress = async (seconds: number) => {
    if (!user || !video) return;

    const now = Date.now();
    if (lastTickRef.current === 0) {
      lastTickRef.current = now;
      return;
    }

    const elapsed = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    // Only count if elapsed time is reasonable (e.g., playing at 1x speed)
    // Ignore jumps/seeks (elapsed would be very small if just timeupdate fired, but we use wall clock)
    // Actually, timeupdate fires periodically. We just need to ensure we are playing.
    // If elapsed is > 2 seconds, it might be a resume after pause, so we cap it or ignore.
    if (elapsed > 0 && elapsed < 5) {
      accumulatedTimeRef.current += elapsed;
    }

    // Send update every 10 seconds
    if (accumulatedTimeRef.current >= 10) {
      const timeToSend = Math.floor(accumulatedTimeRef.current);
      accumulatedTimeRef.current -= timeToSend;

      // Fire and forget, ONLY if video is not free
      if (video.price > 0) {
        recordWatchTime(user.id, timeToSend, video.id, undefined);
      }
    }
  };

  return (
    <div className="bg-white min-h-screen pb-20">
      {/* Video Player */}
      {video.vimeoUrl ? (
        <div className="w-full bg-black">
          <VideoPlayer
            vimeoId={video.vimeoUrl}
            title={video.title}
            onProgress={handleProgress}
          />
        </div>
      ) : (
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
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Main Info */}
          <div className="lg:w-2/3">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-blue-600 font-bold text-sm tracking-wide uppercase">
                  {video.category} &bull; {video.difficulty === 'Beginner' ? '초급' : video.difficulty === 'Intermediate' ? '중급' : '상급'}
                </span>
                <h1 className="text-3xl font-bold text-slate-900 mt-1">{video.title}</h1>

                {/* Video Stats */}
                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                  <div className="flex items-center">
                    <Eye className="w-4 h-4 mr-1" />
                    <span>{video.views.toLocaleString()} 조회</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>{video.length}</span>
                  </div>
                </div>
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
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center mb-8">
                <img src={creator.profileImage} alt={creator.name} className="w-16 h-16 rounded-full object-cover mr-4" />
                <div className="flex-grow">
                  <h3 className="font-bold text-lg text-slate-900">{creator.name}</h3>
                  <p className="text-slate-500 text-sm">{creator.bio}</p>
                </div>
                <Link to={`/creator/${creator.id}`}>
                  <Button variant="outline" size="sm">채널 보기</Button>
                </Link>
              </div>
            )}

            {/* Related Videos */}
            {relatedVideos.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">관련 영상</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {relatedVideos.map((relatedVideo) => (
                    <VideoCard key={relatedVideo.id} video={relatedVideo} />
                  ))}
                </div>
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
                  <span className="text-2xl font-bold text-slate-900">{formattedPrice}</span>
                </div>
                <Button className="w-full mb-2">이 영상만 구매하기</Button>
                <p className="text-xs text-slate-400 text-center">평생 소장 및 무제한 시청</p>
              </div>

              <div className="border-t border-slate-100 pt-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-600">월간 구독</span>
                  <span className="text-xl font-bold text-blue-600">₩29,000<span className="text-sm text-slate-400 font-normal">/월</span></span>
                </div>
                <Link to="/pricing">
                  <Button variant="secondary" className="w-full mb-2">구독하고 전체 영상 보기</Button>
                </Link>
                <p className="text-xs text-slate-400 text-center">모든 강좌 무제한 접근</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
