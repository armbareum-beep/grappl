import React, { useState } from 'react';
import { TrainingLog } from '../../types';
import { Heart, MessageCircle, Share2, MoreHorizontal, Play, Volume2, VolumeX, Sparkles, Trophy, Dumbbell, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';

interface SocialPostProps {
    post: TrainingLog;
}

// Helper function to convert YouTube URL to embed URL
const getYouTubeEmbedUrl = (url: string): string => {
    if (!url) return url;
    if (url.includes('youtube.com/embed/')) return url;
    let videoId = '';
    if (url.includes('youtube.com/watch?v=')) videoId = url.split('watch?v=')[1]?.split('&')[0];
    else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
    else if (url.includes('youtube.com/v/')) videoId = url.split('youtube.com/v/')[1]?.split('?')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    return url;
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

    // Load comments when showing comment section
    React.useEffect(() => {
        if (showComments && comments.length === 0) {
            loadComments();
        }
    }, [showComments]);

    const handleLike = () => {
        if (liked) {
            setLikeCount(prev => prev - 1);
        } else {
            setLikeCount(prev => prev + 1);
        }
        setLiked(!liked);
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

    const handleShare = async () => {
        const postUrl = `${window.location.origin}/journal#${post.id}`;
        const shareData = {
            title: `${post.userName}의 게시물`,
            text: post.notes.substring(0, 100) + '...',
            url: postUrl
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log('Share cancelled');
            }
        } else {
            navigator.clipboard.writeText(postUrl);
            alert('링크가 복사되었습니다!');
        }
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
            const { createComment, updateQuestProgress } = await import('../../lib/api');
            const { data, error } = await createComment(post.id, user.id, commentText.trim());

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
        : (post.mediaUrl ? [post.mediaUrl] : []);

    // Video handling (single video for now)
    const isVideo = post.mediaType === 'video' || (post.mediaUrl && (post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov'))) || post.youtubeUrl;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev + 1) % images.length);
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex(prev => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="bg-slate-950 border-b border-slate-900 last:border-0 hover:bg-slate-900/10 transition-colors">
            <div className="p-4 sm:p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3 items-center group cursor-pointer" onClick={() => navigate(`/profile/${post.userId}`)}>
                        <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden ring-2 ring-transparent group-hover:ring-blue-500 transition-all">
                            {post.userAvatar ? (
                                <img src={post.userAvatar} alt={post.userName} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                    {post.userName?.[0]}
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white text-[15px] group-hover:text-blue-400 transition-colors">{post.userName}</h3>
                                {post.user?.belt && !post.user?.isInstructor && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wide">
                                        {post.user.belt}
                                    </span>
                                )}
                                {post.user?.isInstructor && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white flex items-center gap-0.5">
                                        <Sparkles className="w-2 h-2" />
                                        인스트럭터
                                    </span>
                                )}
                            </div>
                            <span className="text-slate-500 text-xs">
                                {formatDistanceToNow(new Date(post.date), { addSuffix: true, locale: ko })}
                            </span>
                        </div>
                    </div>

                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                            className="text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
                        >
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                        {showMenu && (
                            <div className="absolute right-0 mt-2 w-32 bg-slate-900 rounded-lg shadow-xl border border-slate-800 py-1 z-10">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleReport();
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800"
                                >
                                    신고하기
                                </button>
                                {post.metadata?.sharedRoutine && (
                                    <button
                                        onClick={handleSaveRoutine}
                                        className="w-full text-left px-4 py-2 text-sm text-blue-400 hover:bg-slate-800 flex items-center gap-2"
                                    >
                                        <Save className="w-3 h-3" />
                                        루틴 저장
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="pl-[52px]">
                    {/* Text Body */}
                    <div className="mb-4">
                        <p className={`text-slate-200 text-[15px] leading-relaxed whitespace-pre-wrap ${post.notes.length > 200 && !isExpanded ? 'line-clamp-4' : ''}`}>
                            {post.notes}
                        </p>
                        {post.notes.length > 200 && !isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-slate-500 text-sm mt-1 hover:text-slate-300"
                            >
                                더 보기
                            </button>
                        )}
                    </div>

                    {/* Technique Tags with Search */}
                    {post.techniques && post.techniques.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                            {post.techniques.map((tech, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/search?q=${encodeURIComponent(tech)}`);
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-blue-400 text-sm font-medium hover:bg-blue-900/20 hover:border-blue-800 transition-colors"
                                >
                                    #{tech}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Media Content */}
                    {images.length > 0 && !isVideo && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-slate-800 bg-black relative shadow-lg">
                            <div className="relative w-full">
                                <img
                                    src={images[currentImageIndex]}
                                    alt={`Post content ${currentImageIndex + 1}`}
                                    className="w-full h-auto max-h-[600px] object-cover"
                                />
                                {/* Navigation Arrows */}
                                {images.length > 1 && (
                                    <>
                                        <button
                                            onClick={prevImage}
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={nextImage}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                                        >
                                            <ChevronRight className="w-5 h-5" />
                                        </button>
                                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {images.map((_, idx) => (
                                                <div
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${currentImageIndex === idx ? 'bg-white' : 'bg-white/30'}`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {isVideo && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-slate-800 bg-black relative shadow-lg">
                            <div className="relative w-full h-full aspect-[4/5] sm:aspect-video">
                                <video
                                    src={post.mediaUrl || post.youtubeUrl}
                                    className="w-full h-full object-cover"
                                    loop
                                    muted={isMuted}
                                    onClick={togglePlay}
                                    playsInline
                                />
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }}
                                    className="absolute bottom-4 right-4 p-2.5 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md transition-colors"
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                                {!isPlaying && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/20">
                                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
                                            <Play className="w-8 h-8 text-white ml-1 fill-white" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-6 pt-2">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${liked ? 'text-pink-500' : 'text-slate-400 hover:text-pink-500'}`}
                        >
                            <Heart className={`w-5 h-5 ${liked ? 'fill-pink-500' : ''}`} />
                            <span>{likeCount}</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowComments(!showComments); }}
                            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-blue-400 transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span>{post.comments || 0}</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleShare(); }}
                            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-green-400 transition-colors ml-auto"
                        >
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Comments Section */}
                    {showComments && (
                        <div className="mt-4 pt-4 border-t border-slate-900">
                            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                                {loadingComments ? (
                                    <div className="text-sm text-slate-500 text-center py-4">
                                        로딩 중...
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="text-sm text-slate-500 text-center py-4">
                                        아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
                                    </div>
                                ) : (
                                    comments.map((comment: any) => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {comment.user?.avatar_url ? (
                                                    <img src={comment.user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-slate-400 text-xs font-bold">
                                                        {comment.user?.name?.[0]?.toUpperCase() || '?'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-slate-300">
                                                        {comment.user?.name || 'User'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-500">
                                                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-slate-300 bg-slate-900/50 p-2 rounded-lg rounded-tl-none">
                                                    {comment.content}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="flex gap-2 relative">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddComment();
                                        }
                                    }}
                                    placeholder="댓글을 입력하세요..."
                                    className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-600 focus:bg-slate-800/80 transition-all"
                                    onClick={(e) => e.stopPropagation()}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddComment();
                                    }}
                                    disabled={!commentText.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                                >
                                    게시
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
