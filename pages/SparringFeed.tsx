import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSparringVideos } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, MessageCircle, Share2, MoreVertical, BookOpen, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

const VideoItem: React.FC<{
    video: SparringVideo;
    isActive: boolean;
}> = ({ video, isActive }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [muted, setMuted] = useState(true);

    useEffect(() => {
        if (isActive) {
            videoRef.current?.play().catch(() => {
                // Autoplay blocked handling (usually requires mute)
                setMuted(true);
                videoRef.current?.play();
            });
        } else {
            videoRef.current?.pause();
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
            }
        }
    }, [isActive]);

    return (
        <div className="w-full h-[calc(100vh-56px)] sm:h-screen relative snap-start shrink-0 bg-black flex items-center justify-center">
            {/* Video Player */}
            <video
                ref={videoRef}
                src={video.videoUrl} // Assuming full URL or proxied
                className="w-full h-full object-contain"
                loop
                muted={muted}
                playsInline
                onClick={() => setMuted(!muted)}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none" />

            {/* Right Sidebar Actions */}
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-20">
                <div className="flex flex-col items-center gap-1">
                    <button className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-colors">
                        <Heart className="w-7 h-7" />
                    </button>
                    <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{video.likes}</span>
                </div>

                <button className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-blue-500 transition-colors">
                    <MessageCircle className="w-7 h-7" />
                </button>

                <button className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-green-500 transition-colors">
                    <Share2 className="w-7 h-7" />
                </button>

                <button className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white transition-colors">
                    <MoreVertical className="w-6 h-6" />
                </button>
            </div>

            {/* Bottom Info Area */}
            <div className="absolute left-0 right-0 bottom-0 p-4 pb-20 sm:pb-8 z-20 text-white flex flex-col items-start gap-4">
                {/* Related Technique Link (The "Hook") */}
                {video.relatedItems && video.relatedItems.length > 0 && (
                    <div className="flex flex-col gap-2 w-full max-w-sm">
                        {video.relatedItems.map((item, idx) => (
                            <Link
                                key={idx}
                                to={item.type === 'drill' ? `/drills/${item.id}` : `/courses/${item.id}`} // Assuming course link for lesson context or lesson direct
                                className="flex items-center gap-3 bg-black/60 backdrop-blur-md border border-white/20 p-3 rounded-xl hover:bg-black/80 transition-all group"
                            >
                                <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-500 transition-colors">
                                    <BookOpen className="w-4 h-4 text-white" />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <p className="text-xs text-blue-300 font-bold uppercase mb-0.5">이 기술 배우기</p>
                                    <p className="text-sm font-semibold truncate text-white">{item.title}</p>
                                </div>
                                <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold group-hover:bg-white/20">
                                    이동
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* Metadata */}
                <div className="max-w-[85%]">
                    <div className="flex items-center gap-3 mb-3">
                        {video.creator && (
                            <Link to={`/creator/${video.creator.id}`} className="flex items-center gap-2 hover:opacity-80">
                                <img
                                    src={video.creator.profileImage || 'https://via.placeholder.com/40'}
                                    alt={video.creator.name}
                                    className="w-10 h-10 rounded-full border border-white/20"
                                />
                                <span className="font-bold text-shadow-sm">{video.creator.name}</span>
                            </Link>
                        )}
                        <button className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-bold backdrop-blur-sm border border-white/10">
                            Follow
                        </button>
                    </div>

                    <h3 className="font-bold text-lg mb-2 line-clamp-2 leading-tight text-shadow-sm">{video.title}</h3>
                    <p className="text-sm text-white/80 line-clamp-2 text-shadow-sm">{video.description}</p>
                </div>
            </div>
        </div>
    );
};

export const SparringFeed: React.FC = () => {
    const { user, isCreator } = useAuth();
    const [videos, setVideos] = useState<SparringVideo[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadVideos();
    }, []);

    const loadVideos = async () => {
        const { data } = await getSparringVideos();
        if (data) setVideos(data);
    };

    // Scroll Observer to detect active video
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const index = Math.round(container.scrollTop / container.clientHeight);
            if (index !== activeIndex && videos[index]) {
                setActiveIndex(index);
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [videos, activeIndex]);

    return (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-30 p-4 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
                <button
                    onClick={() => navigate(-1)}
                    className="pointer-events-auto p-2 rounded-full bg-black/20 backdrop-blur-sm text-white hover:bg-black/40"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="pointer-events-auto font-bold text-lg text-white drop-shadow-md">
                    Sparring
                </div>
                <div className="w-10" /> {/* Spacer */}
            </div>

            {/* Scroll Container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                {videos.length > 0 ? (
                    videos.map((video, idx) => (
                        <VideoItem
                            key={video.id}
                            video={video}
                            isActive={idx === activeIndex}
                        />
                    ))
                ) : (
                    <div className="h-screen flex flex-col items-center justify-center text-slate-500 gap-4">
                        <p>아직 등록된 스파링 영상이 없습니다.</p>
                        {user && isCreator && (
                            <Button onClick={() => navigate('/creator/sparring/new')}>
                                첫 영상 올리기
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
