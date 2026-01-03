import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import {
    getPublicTrainingLogs,
    repostTrainingLog,
    checkUserReposted,
    toggleTrainingLogLike,
    checkTrainingLogLiked,
    getTrainingLogLikes,
    getTrainingLogComments,
    addTrainingLogComment,
    updateQuestProgress
} from '../lib/api';
import { cn } from '../lib/utils';
import { TrainingLog } from '../types';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { ShareToFeedModal } from '../components/social/ShareToFeedModal';
import { ErrorScreen } from '../components/ErrorScreen';
import { supabase } from '../lib/supabase';
import {
    Activity,
    ChevronDown,
    Heart,
    MessageCircle,
    Send,
    Play,
    Volume2,
    VolumeX,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Library,
    Plus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChainLibraryTab } from '../components/arena/ChainLibraryTab';
import { ShareModal } from '../components/social/ShareModal';

export const CommunityFeed: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'feed' | 'library'>(
        (searchParams.get('tab') as 'feed' | 'library') || 'feed'
    );

    // Filter State
    const [filter, setFilter] = useState<string>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    useEffect(() => {
        loadPosts();
        loadUserAvatar();
    }, [user]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'library') setActiveTab('library');
        else setActiveTab('feed');
    }, [searchParams]);

    const handleTabChange = (tab: 'feed' | 'library') => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

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

            {/* 1. Tab Navigation (Fixed to Top Right) */}
            <div className="fixed top-24 right-4 md:right-8 z-[60] animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-full p-1 shadow-2xl">
                    <button
                        onClick={() => handleTabChange('feed')}
                        className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-full transition-all duration-300 ${activeTab === 'feed'
                            ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] scale-105'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">커뮤니티 피드</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('library')}
                        className={`flex items-center gap-2 px-3 py-2 md:px-5 md:py-2.5 rounded-full transition-all duration-300 ${activeTab === 'library'
                            ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] scale-105'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <Library className="w-4 h-4" />
                        <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">체인 라이브러리</span>
                    </button>
                </div>
            </div>

            {/* 2. Filter Menu (Fixed Top Center Capsule) */}
            {activeTab === 'feed' && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="relative group">
                        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-full p-1 shadow-2xl transition-all duration-300 hover:bg-zinc-900/80">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
                                className="flex items-center justify-center gap-1.5 px-6 py-2 text-[13px] font-black text-zinc-100 transition-colors uppercase tracking-[0.1em]"
                            >
                                <span className={filter !== 'all' ? 'text-violet-400' : ''}>{getFilterLabel(filter)}</span>
                                <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${showFilterMenu ? 'rotate-180' : ''}`} />
                            </button>
                        </div>

                        {showFilterMenu && (
                            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-[24px] shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                {[
                                    { id: 'all', label: '추천' },
                                    { id: 'following', label: '팔로잉' },
                                    { id: 'course', label: '클래스' },
                                    { id: 'sparring', label: '스파링' },
                                    { id: 'training', label: '수련일지' },
                                    { id: 'technique_roadmap', label: '테크닉로드맵' }
                                ].map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => { setFilter(item.id); setShowFilterMenu(false); }}
                                        className={`w-full text-center px-5 py-3 text-xs font-bold transition-all hover:bg-white/5 ${filter === item.id ? 'text-violet-400 bg-violet-500/5' : 'text-zinc-400'}`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Content Area - ADJUSTED PT TO 20 AS REQUESTED */}
            <main className={`mx-auto px-4 pt-20 pb-32 transition-all ${activeTab === 'library' ? 'max-w-7xl' : 'max-w-xl'}`}>
                {activeTab === 'feed' ? (
                    <>
                        {/* Post Input Trigger - Hidden on mobile, FAB is used instead */}
                        {user && (
                            <div
                                onClick={() => setShowCreateModal(true)}
                                className="hidden md:block mb-6 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-zinc-700 transition-all"
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

                        {/* Single Column Feed */}
                        {loading && posts.length === 0 ? (
                            <div className="columns-1 gap-4 space-y-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="break-inside-avoid animate-pulse bg-zinc-900/40 rounded-2xl border border-zinc-900" style={{ height: `${200 + Math.random() * 200}px` }} />
                                ))}
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="text-center py-20 px-4">
                                <Activity className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                                <h3 className="text-zinc-300 font-bold text-lg">아직 기록이 없습니다</h3>
                                <p className="text-zinc-500">첫 번째 수련 기록의 주인공이 되어보세요!</p>
                            </div>
                        ) : (
                            <div className="columns-1 gap-4 space-y-4">
                                {filteredPosts.map(post => (
                                    <FeedCard key={post.id} post={post} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="animate-in fade-in duration-500">
                        <ChainLibraryTab />
                    </div>
                )}
            </main>

            {/* 만들기 FAB (Floating Action Button) - Circular Icon Only */}
            {user && (
                <div className="fixed bottom-24 right-6 z-[70] md:bottom-12 md:right-12">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="group flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white p-4 md:p-5 rounded-full shadow-[0_12px_40px_rgba(124,58,237,0.5)] transition-all duration-500 hover:scale-110 active:scale-90"
                    >
                        <Plus className="w-7 h-7 md:w-8 md:h-8" />
                    </button>
                </div>
            )}

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
const FeedCard: React.FC<{ post: TrainingLog }> = ({ post }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [commentCount, setCommentCount] = useState(post.comments || 0);
    const [isReposted, setIsReposted] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showNativeShareModal, setShowNativeShareModal] = useState(false);

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

    // Load initial stats (likes, liked status)
    useEffect(() => {
        const loadStats = async () => {
            if (post.id) {
                try {
                    const [likesRes, likedRes] = await Promise.all([
                        getTrainingLogLikes(post.id),
                        user ? checkTrainingLogLiked(user.id, post.id) : Promise.resolve(false)
                    ]);
                    if (likesRes.count !== undefined) setLikeCount(likesRes.count);
                    setLiked(likedRes);
                } catch (err) {
                    console.error('Error loading stats:', err);
                }
            }
        };
        loadStats();

        const checkReposted = async () => {
            if (user && post.id) {
                const reposted = await checkUserReposted(user.id, post.id);
                setIsReposted(reposted);
            }
        };
        checkReposted();
    }, [user, post.id]);

    // Load comments when opening section
    useEffect(() => {
        if (showComments && comments.length === 0) {
            loadComments();
        }
    }, [showComments]);

    const loadComments = async () => {
        try {
            setLoadingComments(true);
            const { data } = await getTrainingLogComments(post.id);
            if (data) setComments(data);
        } catch (error) {
            console.error('Error loading comments:', error);
        } finally {
            setLoadingComments(false);
        }
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            const currentPath = location.pathname + location.search;
            navigate('/login', { state: { from: currentPath } });
            return;
        }

        const prevLiked = liked;
        const prevCount = likeCount;

        // Optimistic UI
        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);

        try {
            const { liked: resultLiked, error } = await toggleTrainingLogLike(user.id, post.id);
            if (error) throw error;
            if (resultLiked !== !prevLiked) setLiked(resultLiked);
        } catch (err) {
            console.error('Like error:', err);
            setLiked(prevLiked);
            setLikeCount(prevCount);
        }
    };

    const handleAddComment = async () => {
        if (!user) {
            const currentPath = location.pathname + location.search;
            navigate('/login', { state: { from: currentPath } });
            return;
        }
        if (!commentText.trim()) return;

        try {
            const { data, error } = await addTrainingLogComment(post.id, user.id, commentText.trim());
            if (error) throw error;

            if (data) {
                // Fetch user's avatar from users table
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, avatar_url')
                    .eq('id', user.id)
                    .single();

                setComments([...comments, {
                    ...data,
                    user: {
                        name: userData?.name || user.user_metadata?.name || 'User',
                        avatar_url: userData?.avatar_url
                    }
                }]);
                setCommentText('');
                setCommentCount(prev => prev + 1);

                // Update quest progress
                await updateQuestProgress(user.id, 'give_feedback');
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            alert('댓글 작성 중 오류가 발생했습니다.');
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowNativeShareModal(true);
    };

    const handleShareToFeed = async (comment: string) => {
        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        try {
            const { error } = await repostTrainingLog(user.id, post.id, comment);
            if (error) throw error;

            setIsReposted(true);
            alert('피드에 공유되었습니다!');
        } catch (error) {
            console.error('Error sharing to feed:', error);
            alert('공유 중 오류가 발생했습니다.');
            throw error;
        }
    };

    const handleRepost = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user) {
            alert('로그인이 필요합니다.');
            return;
        }

        if (isReposted) {
            alert('이미 리포스트한 게시물입니다.');
            return;
        }

        setShowShareModal(true);
    };

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
                        {post.user?.isInstructor ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-0.5">
                                <span>Instructor</span>
                            </span>
                        ) : post.userBelt && (
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
            <div className="mb-4">
                <p className={cn("text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap",
                    !isExpanded && post.notes.length > 200 ? "line-clamp-6" : ""
                )}>
                    {post.notes}
                </p>
                {post.notes.length > 200 && !isExpanded && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 mt-1 font-bold"
                    >
                        더 보기
                    </button>
                )}
            </div>

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
            <div className="flex items-center gap-1 pt-3 border-t border-zinc-800/50 -mx-2">
                <button
                    onClick={handleLike}
                    className="group flex items-center gap-1.5 p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                >
                    <Heart className={cn("w-[20px] h-[20px] transition-all", liked ? "fill-violet-500 text-violet-500" : "text-zinc-500 group-hover:text-violet-400")} />
                    {likeCount > 0 && <span className={cn("text-sm", liked ? "text-violet-500" : "text-zinc-500 group-hover:text-violet-400")}>{likeCount}</span>}
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
                    className="group flex items-center gap-1.5 p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                >
                    <MessageCircle className="w-[20px] h-[20px] text-zinc-500 group-hover:text-violet-400 transition-colors" />
                    {commentCount > 0 && <span className="text-sm text-zinc-500 group-hover:text-violet-400">{commentCount}</span>}
                </button>

                <button
                    onClick={handleRepost}
                    className={`group flex items-center p-2 rounded-full hover:bg-zinc-800/50 transition-colors ${isReposted ? 'bg-violet-500/10' : ''}`}
                >
                    <svg className={`w-[20px] h-[20px] transition-colors ${isReposted ? 'text-violet-400' : 'text-zinc-500 group-hover:text-violet-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="17 1 21 5 17 9"></polyline>
                        <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                        <polyline points="7 23 3 19 7 15"></polyline>
                        <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                    </svg>
                </button>

                <button
                    onClick={handleShare}
                    className="group flex items-center p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                >
                    <Send className="w-[20px] h-[20px] text-zinc-500 group-hover:text-violet-400 transition-colors" />
                </button>
            </div>

            {/* Comments Section */}
            {showComments && (
                <div className="mt-4 pt-4 border-t border-zinc-800/50 space-y-4">
                    {loadingComments ? (
                        <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center py-4 text-zinc-500 text-sm italic">
                            첫 댓글의 주인공이 되어보세요!
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                            {comments.map((comment: any) => (
                                <div key={comment.id} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden border border-zinc-700">
                                        {comment.user?.avatar_url ? (
                                            <img src={comment.user.avatar_url} className="w-full h-full object-cover" alt={comment.user.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[10px] font-bold">
                                                {comment.user?.name?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 bg-zinc-800/30 rounded-2xl p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs font-bold text-zinc-200">{comment.user?.name}</span>
                                            <span className="text-[10px] text-zinc-600">
                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-zinc-400 leading-relaxed">{comment.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative mt-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                            placeholder="댓글을 남겨보세요..."
                            className="w-full bg-zinc-800/50 border border-zinc-700 rounded-full py-2.5 pl-4 pr-12 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleAddComment(); }}
                            disabled={!commentText.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-violet-500 hover:text-violet-400 disabled:text-zinc-700 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            {showShareModal && (
                <ShareToFeedModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={handleShareToFeed}
                    activityType="general"
                    defaultContent=""
                    metadata={{
                        postId: post.id,
                        userName: post.userName,
                        userAvatar: post.userAvatar,
                        notes: post.notes,
                        mediaUrl: post.mediaUrl,
                        mediaType: post.mediaType,
                        images: post.metadata?.images
                    }}
                />
            )}

            {/* Native Share Modal */}
            {showNativeShareModal && (
                <ShareModal
                    isOpen={showNativeShareModal}
                    onClose={() => setShowNativeShareModal(false)}
                    title={post.userName ? `${post.userName}의 게시물` : '게시물'}
                    text={post.notes.substring(0, 100) + (post.notes.length > 100 ? '...' : '')}
                    url={`${window.location.origin}/journal#${post.id}`}
                    imageUrl={post.metadata?.images?.[0] || post.mediaUrl}
                />
            )}
        </div>
    );
}
