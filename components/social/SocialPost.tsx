import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, MoreHorizontal, Play, Volume2, VolumeX, Sparkles, Save, ChevronLeft, ChevronRight, Repeat } from 'lucide-react';
import { TrainingLog } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface SocialPostProps {
    post: TrainingLog;
}

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return url;
    if (url.includes('youtube.com/embed/')) return url;

    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/v/')) {
        videoId = url.split('youtube.com/v/')[1]?.split('?')[0];
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
};

export const SocialPost: React.FC<SocialPostProps> = ({ post }) => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Close menu when clicking outside
    React.useEffect(() => {
        const handleClickOutside = () => setShowMenu(false);
        if (showMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showMenu]);

    // Load comments and like status when component mounts or user changes
    React.useEffect(() => {
        if (post.id) {
            loadInitialStats();
        }
    }, [user, post.id]);

    const loadInitialStats = async () => {
        try {
            const { getTrainingLogLikes, checkTrainingLogLiked } = await import('../../lib/api');
            const [likesRes, likedRes] = await Promise.all([
                getTrainingLogLikes(post.id),
                user ? checkTrainingLogLiked(user.id, post.id) : Promise.resolve(false)
            ]);

            if (likesRes.count !== undefined) {
                setLikeCount(likesRes.count);
            }
            setLiked(likedRes);
        } catch (error) {
            console.error('Error loading initial stats:', error);
        }
    };

    // Load comments when showing comment section
    React.useEffect(() => {
        if (showComments && comments.length === 0) {
            loadComments();
        }
    }, [showComments]);

    const handleLike = async () => {
        if (!user) {
            toastError('로그인이 필요합니다.');
            return;
        }

        const prevLiked = liked;
        const prevCount = likeCount;

        // Optimistic UI update
        setLiked(!liked);
        setLikeCount(liked ? likeCount - 1 : likeCount + 1);

        try {
            const { toggleTrainingLogLike } = await import('../../lib/api');
            const { liked: resultLiked, error } = await toggleTrainingLogLike(user.id, post.id);

            if (error) throw error;

            // Sync with server if needed
            if (resultLiked !== !prevLiked) {
                setLiked(resultLiked);
            }
        } catch (err) {
            console.error('Like error:', err);
            // Revert on error
            setLiked(prevLiked);
            setLikeCount(prevCount);
            toastError('좋아요 처리 중 오류가 발생했습니다.');
        }
    };

    const handleSaveRoutine = () => {
        // Implement save routine logic later
        alert('루틴 저장 기능은 준비 중입니다.');
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

    const handleReport = async () => {
        if (!user) {
            toastError('로그인이 필요합니다.');
            return;
        }

        if (window.confirm('이 게시물을 신고하시겠습니까?')) {
            try {
                const { createReport } = await import('../../lib/api');
                const { error } = await createReport({
                    reporterId: user.id,
                    targetId: post.id,
                    targetType: 'post',
                    reason: 'Inappropriate Content', // Default reason for now
                    description: 'User reported via feed interaction'
                });

                if (error) throw error;
                success('신고가 접수되었습니다. 관리자 검토 후 조치하겠습니다.');
                setShowMenu(false);
            } catch (err) {
                console.error('Report error:', err);
                toastError('신고 처리 중 오류가 발생했습니다.');
            }
        }
    };

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const loadComments = async () => {
        try {
            setLoadingComments(true);
            const { getPostComments } = await import('../../lib/api');
            const { data } = await getPostComments(post.id);
            if (data) {
                setComments(data);
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            toastError('댓글을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoadingComments(false);
        }
    };

    const handleAddComment = async () => {
        if (!user) {
            toastError('로그인이 필요합니다.');
            return;
        }

        if (!commentText.trim()) return;

        try {
            const { addTrainingLogComment, updateQuestProgress } = await import('../../lib/api');
            const { data, error } = await addTrainingLogComment(post.id, user.id, commentText.trim());

            if (error) {
                toastError(error.message || '댓글 작성 중 오류가 발생했습니다.');
                return;
            }

            if (data) {
                // Add comment to list with avatar
                setComments([...comments, {
                    ...data,
                    user: {
                        name: user.user_metadata?.name || 'User',
                        avatar_url: user.user_metadata?.avatar_url
                    }
                }]);
                setCommentText('');
                success('댓글이 작성되었습니다!');

                // Update quest progress
                await updateQuestProgress(user.id, 'give_feedback');
            }
        } catch (err) {
            console.error('Error adding comment:', err);
            toastError('댓글 작성 중 오류가 발생했습니다.');
        }
    };

    // Determine images to display
    const images: string[] = post.metadata?.images && Array.isArray(post.metadata.images) && post.metadata.images.length > 0
        ? post.metadata.images
        : (post.mediaUrl && !post.mediaUrl.includes('youtube') && !post.mediaUrl.includes('youtu.be') ? [post.mediaUrl] : []);

    // Video handling
    const youtubeUrl = post.youtubeUrl ||
        (post.mediaUrl && (post.mediaUrl.includes('youtube.com') || post.mediaUrl.includes('youtu.be'))) ?
        (post.youtubeUrl || post.mediaUrl) : null;

    const isVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov')));

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    };

    const postUrl = `${window.location.origin}/journal#${post.id}`;

    return (
        <div className="border-b border-zinc-900 py-8 px-4 hover:bg-zinc-900/20 transition-all group/post">
            <div className="flex gap-4">
                {/* Avatar Column */}
                <div className="flex-shrink-0 pt-1">
                    <div
                        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.userId}`); }}
                        className="w-[44px] h-[44px] rounded-full border border-zinc-800 overflow-hidden cursor-pointer hover:border-zinc-700 transition-colors"
                    >
                        {post.userAvatar ? (
                            <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 font-bold">
                                {post.userName?.[0]}
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Column */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                            <h3
                                onClick={(e) => { e.stopPropagation(); navigate(`/profile/${post.userId}`); }}
                                className="font-bold text-zinc-100 text-[15px] hover:underline cursor-pointer"
                            >
                                {post.userName}
                            </h3>
                            {post.user?.isInstructor && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center gap-0.5">
                                    <Sparkles className="w-2 h-2" />
                                    <span>Instructor</span>
                                </span>
                            )}
                            <span className="text-zinc-600 text-xs">
                                {formatDistanceToNow(new Date(post.date), { addSuffix: true, locale: ko })}
                            </span>
                        </div>

                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-full hover:bg-zinc-800/50 transition-colors"
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-zinc-900 rounded-lg shadow-xl border border-zinc-800 py-1 z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleReport();
                                        }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-zinc-800"
                                    >
                                        신고하기
                                    </button>
                                    {post.metadata?.sharedRoutine && (
                                        <button
                                            onClick={handleSaveRoutine}
                                            className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                                        >
                                            <Save className="w-3 h-3" />
                                            루틴 저장
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body Text */}
                    <div className="mb-3">
                        <p className={`text-zinc-200 text-base leading-relaxed whitespace-pre-wrap ${post.notes.length > 200 && !isExpanded ? 'line-clamp-4' : ''}`}>
                            {post.notes}
                        </p>
                        {post.notes.length > 200 && !isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-zinc-500 text-sm mt-1 hover:text-zinc-300 font-medium"
                            >
                                더 보기
                            </button>
                        )}
                    </div>

                    {/* Specialized Content Box (Training Summary) */}
                    {post.notes.includes('🥋') && (post.notes.includes('Sparring Session Summary') || post.notes.includes('Sparring Log')) && (
                        <div className="my-4 p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/50 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-violet-500 fill-violet-500" />
                                <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Training Complete</span>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-12 text-xs text-zinc-500 font-medium px-2 mb-1 uppercase tracking-wide">
                                    <div className="col-span-6">Opponent</div>
                                    <div className="col-span-3 text-center">Rounds</div>
                                    <div className="col-span-3 text-right">Result</div>
                                </div>
                                {post.notes.split('\n').filter(line => line.includes('vs')).slice(0, 3).map((session, idx) => {
                                    const match = session.match(/vs (.*?) \((.*?)\): (.*?) rounds - (.*)/);
                                    if (!match) return null;
                                    const [_, opponent, belt, rounds, result] = match;
                                    return (
                                        <div key={idx} className="grid grid-cols-12 items-center px-2 py-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                                            <div className="col-span-6 flex items-center gap-2">
                                                <span className="text-zinc-200 font-medium text-sm">{opponent}</span>
                                                <span className={`px-1.5 py-[2px] rounded text-[9px] font-bold uppercase border ${belt === 'black' ? 'border-zinc-700 bg-zinc-950 text-zinc-400' :
                                                    belt === 'brown' ? 'border-amber-900/30 bg-amber-950/30 text-amber-500' :
                                                        belt === 'purple' ? 'border-purple-900/30 bg-purple-950/30 text-purple-400' :
                                                            belt === 'blue' ? 'border-blue-900/30 bg-blue-950/30 text-blue-400' :
                                                                'border-zinc-800 bg-zinc-900 text-zinc-500'
                                                    }`}>
                                                    {belt}
                                                </span>
                                            </div>
                                            <div className="col-span-3 text-center">
                                                <span className="text-zinc-300 font-medium text-sm">{rounds}R</span>
                                            </div>
                                            <div className="col-span-3 text-right">
                                                <span className={`text-sm font-medium ${result.includes('승') ? 'text-violet-400' :
                                                    result.includes('패') ? 'text-zinc-500' :
                                                        'text-zinc-600'
                                                    }`}>
                                                    {result}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {post.notes.split('\n').filter(line => line.includes('vs')).length > 3 && (
                                    <div className="text-xs text-zinc-500 text-center pt-2 mt-2 border-t border-zinc-800/50">
                                        + {post.notes.split('\n').filter(line => line.includes('vs')).length - 3} more rounds
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Technique Tags */}
                    {post.techniques && post.techniques.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                            {post.techniques.map((tech, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/search?q=${encodeURIComponent(tech)}`);
                                    }}
                                    className="text-violet-400 text-sm font-medium hover:underline"
                                >
                                    #{tech}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Media Content - Simplified for Premium Feel */}
                    {(images.length > 0 || youtubeUrl || isVideo) && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-zinc-800/50 bg-black relative shadow-lg">
                            {/* Reusing existing media logic within new wrapper */}
                            {images.length > 0 && !isVideo && !youtubeUrl && (
                                <div className="relative w-full group/media">
                                    <img
                                        src={images[currentImageIndex]}
                                        alt={`Post content ${currentImageIndex + 1}`}
                                        className="w-full h-auto max-h-[600px] object-cover"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button onClick={prevImage} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity"><ChevronLeft className="w-5 h-5" /></button>
                                            <button onClick={nextImage} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity"><ChevronRight className="w-5 h-5" /></button>
                                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                                {images.map((_, idx) => (
                                                    <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${currentImageIndex === idx ? 'bg-white w-4' : 'bg-white/30'}`} />
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            {youtubeUrl && (
                                <div className="relative w-full aspect-video">
                                    <iframe src={getYouTubeEmbedUrl(youtubeUrl)} className="w-full h-full" title="YouTube" frameBorder="0" allowFullScreen />
                                </div>
                            )}
                            {isVideo && !youtubeUrl && (
                                <div className="relative w-full aspect-[4/5] sm:aspect-video group/video">
                                    <video src={post.mediaUrl} className="w-full h-full object-cover" loop muted={isMuted} onClick={togglePlay} playsInline />
                                    <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="absolute bottom-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
                                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                    {!isPlaying && (
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                                                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Interaction Bar */}
                    <div className="flex items-center gap-1 pt-2 -ml-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            className="group flex items-center gap-1.5 p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                        >
                            <Heart className={`w-[20px] h-[20px] transition-all ${liked ? 'fill-violet-500 text-violet-500' : 'text-zinc-500 group-hover:text-violet-400'}`} />
                            {likeCount > 0 && <span className={`text-sm ${liked ? 'text-violet-500' : 'text-zinc-500 group-hover:text-violet-400'}`}>{likeCount}</span>}
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
                            className="group flex items-center gap-1.5 p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                        >
                            <MessageCircle className="w-[20px] h-[20px] text-zinc-500 group-hover:text-violet-400 transition-colors" />
                            {(post.comments || 0) > 0 && <span className="text-sm text-zinc-500 group-hover:text-violet-400">{post.comments}</span>}
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); }}
                            className="group flex items-center p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                        >
                            <Repeat className="w-[20px] h-[20px] text-zinc-500 group-hover:text-violet-400 transition-colors" />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            className="group flex items-center p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                        >
                            <Send className="w-[20px] h-[20px] text-zinc-500 group-hover:text-violet-400 transition-colors" />
                        </button>
                    </div>

                    {/* Comments Section (Simplified style) */}
                    {showComments && (
                        <div className="mt-4 pt-4 border-t border-zinc-900/50">
                            {/* Existing comment logic - styling update */}
                            <div className="space-y-4 mb-4">
                                {loadingComments ? (
                                    <div className="flex justify-center py-4">
                                        <div className="w-5 h-5 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-center py-4 text-zinc-500 text-sm">
                                        No comments yet. Be the first to reply!
                                    </div>
                                ) : (
                                    comments.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex-shrink-0 overflow-hidden">
                                                {comment.user?.avatar_url && <img src={comment.user.avatar_url} className="w-full h-full object-cover" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-xs font-bold text-zinc-300">{comment.user?.name}</span>
                                                    <span className="text-[10px] text-zinc-600">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}</span>
                                                </div>
                                                <p className="text-sm text-zinc-400">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a reply..."
                                    className="flex-1 bg-transparent border-b border-zinc-800 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                                />
                                {commentText && (
                                    <button onClick={(e) => { e.stopPropagation(); handleAddComment(); }} className="text-violet-400 text-sm font-bold">Post</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Share Modal Portal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={`${post.userName}의 게시물`}
                        text={post.notes.substring(0, 100) + '...'}
                        url={postUrl}
                    />
                )}
            </React.Suspense>
        </div>
    );
};
// Lazy load
const ShareModal = React.lazy(() => import('./ShareModal'));
