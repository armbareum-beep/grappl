import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getVideoById, getVideos, getCreatorById, recordWatchTime, checkVideoOwnership } from '../lib/api';
import { Video, Creator } from '../types';
import { Button } from '../components/Button';
import { VideoCard } from '../components/VideoCard';
import { VideoPlayer } from '../components/VideoPlayer';
import { Lock, Share2, Clock, Eye, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const VideoDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isSubscribed } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<Creator | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [owns, setOwns] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const lastTickRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      try {
        const videoData = await getVideoById(id);
        setVideo(videoData);

        if (videoData) {
          const creatorData = await getCreatorById(videoData.creatorId);
          setCreator(creatorData);

          if (user) {
            const isCreator = user.id === videoData.creatorId;
            const isOwner = await checkVideoOwnership(user.id, id);
            const canAccess = isAdmin || (isSubscribed && !videoData.isSubscriptionExcluded) || isOwner || isCreator;
            setOwns(canAccess);
          } else {
            setOwns(videoData.price === 0);
          }

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
  }, [id, user, isSubscribed, isAdmin]);

  const handleProgress = async (_seconds: number) => {
    if (!user || !video) return;

    const now = Date.now();
    if (lastTickRef.current === 0) {
      lastTickRef.current = now;
      return;
    }

    const elapsed = (now - lastTickRef.current) / 1000;
    lastTickRef.current = now;

    if (elapsed > 0 && elapsed < 5) {
      accumulatedTimeRef.current += elapsed;
    }

    if (accumulatedTimeRef.current >= 10) {
      const timeToSend = Math.floor(accumulatedTimeRef.current);
      accumulatedTimeRef.current -= timeToSend;

      // Record watch time if user is a subscriber
      if (user.isSubscriber) {
        recordWatchTime(user.id, timeToSend, video.id, undefined);
      }
    }
  };

  const handleVideoComplete = async () => {
    // Video completion tracking (no XP reward)
  };

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


  return (
    <div className="bg-white min-h-screen pb-20 relative">
      {/* Floating Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-24 left-4 lg:left-8 z-[100] w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white hover:border-blue-100 transition-all shadow-xl"
        title="뒤로 가기"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Video Player */}
      {owns && video.vimeoUrl ? (
        <div className="w-full bg-black">
          <VideoPlayer
            vimeoId={video.vimeoUrl}
            title={video.title}
            playing={true}
            onProgress={handleProgress}
            onEnded={handleVideoComplete}
          />
        </div>
      ) : (
        <div className="w-full bg-black aspect-video flex items-center justify-center relative group">
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 px-4 text-center">
            <div className="bg-white/20 p-6 rounded-full backdrop-blur-sm mb-4 cursor-pointer hover:bg-white/30 transition">
              <Lock className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold mb-2">이 영상을 시청하려면 구매하세요</h2>
            <p className="text-slate-300 max-w-md">해당 클래스 구매 또는 월 구독으로 전체 영상을 시청할 수 있습니다.</p>
            {!user && (
              <Link to="/login" className="mt-6">
                <Button>로그인하여 시청하기</Button>
              </Link>
            )}
            {user && (
              <Link to="/pricing" className="mt-6">
                <Button>구독/구매 옵션 보기</Button>
              </Link>
            )}
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
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsShareModalOpen(true)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors"
              >
                <Share2 className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="prose max-w-none text-slate-600 mb-8">
            <p>{video.description}</p>
            <p className="mt-4">
              이 클래스에서는 {video.category} 상황에서의 핵심 원리와 디테일한 메커니즘을 다룹니다.
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
              <p className="text-slate-600 text-sm mb-4">이 영상은 클래스 또는 구독을 통해 시청하실 수 있습니다.</p>
              <Link to="/pricing">
                <Button className="w-full">구매 옵션 보기</Button>
              </Link>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-600">월간 구독</span>
                <span className="text-xl font-bold text-blue-600">₩29,000<span className="text-sm text-slate-400 font-normal">/월</span></span>
              </div>
              <Link to="/pricing">
                <Button variant="secondary" className="w-full mb-2">구독하고 전체 영상 보기</Button>
              </Link>
              <p className="text-xs text-slate-400 text-center">모든 클래스 무제한 접근</p>
            </div>
          </div>
        </div>
      </div>


      {/* Quest complete / Belt up logic removed due to missing data */}

      <React.Suspense fallback={null}>
        {isShareModalOpen && video && (
          <ShareModal
            isOpen={isShareModalOpen}
            onClose={() => setIsShareModalOpen(false)}
            title={video.title}
            text={video.description}
            url={window.location.href}
            imageUrl={video.thumbnailUrl}
          />
        )}
      </React.Suspense>
    </div >
  );
};
// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));
