import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicTrainingLogs } from '../lib/api';
import { TrainingLog } from '../types';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { ErrorScreen } from '../components/ErrorScreen';
import { supabase } from '../lib/supabase';
import {
    Activity,
    ChevronDown,
    Heart,
    MessageCircle,
    Share2,
    Play,
    Volume2,
    VolumeX,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export const CommunityFeed: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

    // Filter State
    const [filter, setFilter] = useState<string>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    useEffect(() => {
        loadPosts();
        loadUserAvatar();
    }, [user]);

    const loadUserAvatar = async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('users')
                .select('avatar_url')
                .eq('id', user.id)
                .single();
            if (data?.avatar_url) setUserAvatar(data.avatar_url);
        } catch (err) {
            console.error('Error loading avatar:', err);
        }
    };

    const loadPosts = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getPublicTrainingLogs(1, 40);
            if (result.error) throw result.error;

            if (result.data) {
                setPosts(result.data);
            }
        } catch (err: any) {
            console.error('Feed loading error:', err);
            setError('피드를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePostCreated = (newPost: TrainingLog) => {
        setPosts([newPost, ...posts]);
        setShowCreateModal(false);
    };

    const getFilterLabel = (f: string) => {
        const labels: Record<string, string> = {
            'all': '추천',
            'following': '팔로잉',
            'course': '클래스',
            'lesson': '레슨',
            'routine': '루틴',
            'drill': '드릴',
            'sparring': '스파링',
            'training': '수련일지',
            'training_routine': '훈련루틴',
            'technique_roadmap': '테크닉로드맵'
        };
        return labels[f] || '추천';
    };

    const filteredPosts = posts.filter(post => {
        if (filter === 'all') return true;

        const feedType = post.location?.replace('__FEED__', '') || post.type;

        if (filter === 'sparring') {
            return feedType === 'sparring' || post.type === 'sparring' || (post.sparringRounds && post.sparringRounds > 0);
        }
        if (filter === 'training') {
            return feedType === 'training' || feedType === 'general' || (!feedType && !post.sparringRounds);
        }
        if (filter === 'following') {
            return true;
        }
        return feedType === filter;
    });

    if (error) return <ErrorScreen error={error} />;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200" onClick={() => setShowFilterMenu(false)}>
            {/* Header */}
            <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 transition-all duration-200">
                <div className="max-w-7xl mx-auto h-14 flex items-center justify-center px-4 relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
                        className="flex items-center gap-2 text-lg font-bold text-zinc-100 hover:text-zinc-300 transition-colors"
                    >
                        {getFilterLabel(filter)}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showFilterMenu && (
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                            {[
                                { id: 'all', label: '추천' },
                                { id: 'following', label: '팔로잉' },
                                { id: 'course', label: '클래스' },
                                { id: 'lesson', label: '레슨' },
                                { id: 'routine', label: '루틴' },
                                { id: 'drill', label: '드릴' },
                                { id: 'sparring', label: '스파링' },
                                { id: 'training', label: '수련일지' },
                                { id: 'training_routine', label: '훈련루틴' },
                                { id: 'technique_roadmap', label: '테크닉로드맵' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { setFilter(item.id); setShowFilterMenu(false); }}
                                    className={`w-full text-left px-6 py-3 font-medium transition-colors hover:bg-zinc-800 ${filter === item.id ? 'text-violet-500' : 'text-zinc-300'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Post Input Trigger */}
                {user && (
                    <div
                        onClick={() => setShowCreateModal(true)}
                        className="mb-6 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-zinc-700 transition-all"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                                {userAvatar ? (
                                    <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-zinc-500 text-sm">새로운 소식을 공유해보세요...</div>
                            <button className="px-6 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                                게시
                            </button>
                        </div>
                    </div>
                )}

                {/* Masonry Grid Feed */}
                {loading && posts.length === 0 ? (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className="break-inside-avoid animate-pulse bg-zinc-900/40 rounded-2xl border border-zinc-900" style={{ height: `${200 + Math.random() * 200}px` }} />
                        ))}
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="text-center py-20 px-4">
                        <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                            <Activity className="w-10 h-10 text-zinc-700" />
                        </div>
                        <h3 className="text-zinc-300 font-bold text-lg">아직 기록이 없습니다</h3>
                        <p className="text-zinc-500">첫 번째 수련 기록의 주인공이 되어보세요!</p>
                    </div>
                ) : (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4 space-y-4">
                        {filteredPosts.map(post => (
                            <FeedCard key={post.id} post={post} />
                        ))}
                    </div>
                )}
            </main>

            {/* 만들기 모달 */}
            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onPostCreated={handlePostCreated}
                />
            )}
        </div>
    );
};

// Feed Card Component
function FeedCard({ post }: { post: TrainingLog }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);

    // Determine images to display
    const images: string[] = post.metadata?.images && Array.isArray(post.metadata.images) && post.metadata.images.length > 0
        ? post.metadata.images
        : (post.mediaUrl && !post.mediaUrl.includes('youtube') && !post.mediaUrl.includes('youtu.be') ? [post.mediaUrl] : []);

    const isVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov')));

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    };

    const togglePlay = (e: React.MouseEvent<HTMLVideoElement>) => {
        const video = e.currentTarget;
        if (video.paused) {
            video.play();
            setIsPlaying(true);
        } else {
            video.pause();
            setIsPlaying(false);
        }
    };

    // Get belt color for badge
    const getBeltColor = (belt?: string) => {
        if (!belt) return 'border-zinc-800 bg-zinc-900 text-zinc-500';
        const lowerBelt = belt.toLowerCase();
        if (lowerBelt.includes('black')) return 'border-zinc-700 bg-zinc-950 text-zinc-400';
        if (lowerBelt.includes('brown')) return 'border-amber-900/30 bg-amber-950/30 text-amber-500';
        if (lowerBelt.includes('purple')) return 'border-purple-900/30 bg-purple-950/30 text-purple-400';
        if (lowerBelt.includes('blue')) return 'border-blue-900/30 bg-blue-950/30 text-blue-400';
        return 'border-zinc-800 bg-zinc-900 text-zinc-500';
    };

    return (
        <div className="break-inside-avoid bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 transition-all duration-300 hover:border-violet-500/50 hover:shadow-[0_0_15px_rgba(124,58,237,0.3)] group cursor-pointer">
            {/* Author Info */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 text-xs font-bold overflow-hidden">
                    {post.userAvatar ? (
                        <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                    ) : (
                        post.userName?.[0] || 'U'
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold text-zinc-100 truncate">{post.userName || 'Anonymous'}</span>
                        {post.userBelt && (
                            <span className={`px-1.5 py-[2px] rounded-[4px] text-[9px] font-black uppercase border leading-none ${getBeltColor(post.userBelt)}`}>
                                {post.userBelt}
                            </span>
                        )}
                    </div>
                    <p className="text-[10px] text-zinc-600 font-medium">
                        {formatDistanceToNow(new Date(post.date), { addSuffix: true, locale: ko })}
                    </p>
                </div>
            </div>

            {/* Content */}
            <p className="text-sm text-zinc-300 leading-relaxed mb-4 line-clamp-6 whitespace-pre-wrap">
                {post.notes}
            </p>

            {/* Technique Tags */}
            {post.techniques && post.techniques.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.techniques.slice(0, 3).map((tech, idx) => (
                        <span key={idx} className="text-[11px] text-violet-400 font-bold">
                            #{tech}
                        </span>
                    ))}
                </div>
            )}

            {/* Media Content */}
            {images.length > 0 && !isVideo && (
                <div className="relative rounded-xl overflow-hidden mb-4 border border-zinc-800 group/media">
                    <img
                        src={images[currentImageIndex]}
                        alt={`Post content ${currentImageIndex + 1}`}
                        className="w-full h-auto object-cover"
                    />
                    {images.length > 1 && (
                        <>
                            <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4" />
                            </button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                                {images.map((_, idx) => (
                                    <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${currentImageIndex === idx ? 'bg-white w-3' : 'bg-white/30'}`} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {isVideo && post.mediaUrl && (
                <div className="relative rounded-xl overflow-hidden mb-4 border border-zinc-800 group/video">
                    <video src={post.mediaUrl} className="w-full h-auto object-cover" loop muted={isMuted} onClick={togglePlay} playsInline />
                    <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="absolute bottom-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    </button>
                    {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Interactions */}
            <div className="flex items-center gap-4 pt-3 border-t border-zinc-800/50">
                <div className="flex items-center gap-1.5 text-zinc-500 hover:text-violet-400 transition-colors">
                    <Heart className="w-4 h-4" />
                    <span className="text-xs">{post.likes || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 hover:text-violet-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-xs">{post.comments || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 text-zinc-500 hover:text-violet-400 transition-colors ml-auto">
                    <Share2 className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
