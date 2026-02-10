import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, MessageCircle, Send, MoreHorizontal, Play, Volume2, VolumeX, Sparkles, Save, ChevronLeft, ChevronRight, Repeat, Trash2, AlertTriangle, Signpost, BookOpen, Zap, Activity, Clock } from 'lucide-react';
import { TrainingLog } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ConfirmModal } from '../common/ConfirmModal';
import { cn } from '../../lib/utils';

// Lazy load ShareModal - Moved to top to avoid scoping issues
const ShareModal = React.lazy(() => import('./ShareModal'));

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
    const location = useLocation();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [isPlaying, setIsPlaying] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [showComments, setShowComments] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [commentText, setCommentText] = useState(() => {
        const saved = localStorage.getItem(`pending_comment_${post.id}`);
        return saved || '';
    });
    const [comments, setComments] = useState<any[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isDeleted, setIsDeleted] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showReportConfirm, setShowReportConfirm] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Define data loading functions first to avoid hoisting issues
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

    const loadComments = async () => {
        try {
            setLoadingComments(true);
            const { getTrainingLogComments } = await import('../../lib/api');
            const { data } = await getTrainingLogComments(post.id);
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

    // Effects
    React.useEffect(() => {
        const saved = localStorage.getItem(`pending_comment_${post.id}`);
        if (saved) {
            setShowComments(true);
        }
    }, [post.id]);

    React.useEffect(() => {
        const handleClickOutside = () => setShowMenu(false);
        if (showMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showMenu]);

    React.useEffect(() => {
        if (post.id) {
            loadInitialStats();
        }
    }, [user?.id, post.id]);

    React.useEffect(() => {
        if (showComments && comments.length === 0) {
            loadComments();
        }
    }, [showComments]);

    // Handlers
    const handleLike = async () => {
        if (!user) {
            const currentPath = location.pathname + location.search + location.hash;
            navigate('/login', { state: { from: currentPath } });
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
        toastError('루틴 저장 기능은 준비 중입니다.');
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
        setShowReportConfirm(true);
    };

    const confirmReport = async () => {
        try {
            setIsActionLoading(true);
            const { createReport } = await import('../../lib/api');
            const { error } = await createReport({
                reporterId: user!.id,
                targetId: post.id,
                targetType: 'post',
                reason: 'Inappropriate Content',
                description: 'User reported via feed interaction'
            });

            if (error) throw error;
            success('신고가 접수되었습니다. 관리자 검토 후 조치하겠습니다.');
            setShowMenu(false);
            setShowReportConfirm(false);
        } catch (err) {
            console.error('Report error:', err);
            toastError('신고 처리 중 오류가 발생했습니다.');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!user || user.id !== post.userId) return;
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            setIsActionLoading(true);
            // Optimistic update
            setIsDeleted(true);

            const { deleteTrainingLog } = await import('../../lib/api');
            const { error } = await deleteTrainingLog(post.id);

            if (error) throw error;
            success('게시물이 삭제되었습니다.');
            setShowDeleteConfirm(false);
            setShowMenu(false);
        } catch (err) {
            console.error('Delete error:', err);
            setIsDeleted(false); // Revert on error
            toastError('삭제 실패');
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const handleAddComment = async () => {
        if (!user) {
            if (commentText.trim()) {
                localStorage.setItem(`pending_comment_${post.id}`, commentText);
            }
            const currentPath = location.pathname + location.search + location.hash;
            navigate('/login', { state: { from: currentPath } });
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
                localStorage.removeItem(`pending_comment_${post.id}`);
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
    let images: string[] = post.metadata?.images && Array.isArray(post.metadata.images) && post.metadata.images.length > 0
        ? post.metadata.images
        : (post.mediaUrl && !post.mediaUrl.includes('youtube') && !post.mediaUrl.includes('youtu.be') ? [post.mediaUrl] : []);

    // Fallback: extract from markdown if no images found in metadata/mediaUrl
    if (images.length === 0 && post.notes?.includes('![Image](')) {
        const matches = Array.from(post.notes.matchAll(/!\[Image\]\((.*?)\)/g), m => m[1]);
        if (matches.length > 0) {
            images = matches;
        }
    }

    // Clean display text by stripping image markdown (multiline supported) and any raw Supabase URLs
    let displayText = (post.notes || '')
        .replace(/!\[Image\]\([\s\S]*?\)/g, '') // Remove standard markdown images
        .replace(/!\[Image\]/g, '') // Remove leftover labels
        .replace(/[\(]?https?:\/\/[a-zA-Z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/[^\s)]+[\)]?/g, '') // Remove Supabase URLs
        .replace(/[\(]?https?:\/\/(localhost|grapplay\.com|grapplay-.*\.vercel\.app)[^\s)]+[\)]?/g, '') // Remove app URLs (localhost and production)
        .trim();

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

    if (isDeleted) return null;

    // Shared content card logic
    const routineData = post.metadata?.sharedRoutine;
    const routineId = post.metadata?.routineId;
    const courseId = post.metadata?.courseId;
    const lessonId = post.metadata?.lessonId;
    const drillId = post.metadata?.drillId;
    const treeId = post.metadata?.treeId;
    const sparringId = post.metadata?.sparringId || post.metadata?.videoId;

    let cardType: 'roadmap' | 'routine' | 'course' | 'lesson' | 'drill' | 'sparring' | null = null;
    if (treeId || post.type === 'skill_roadmap' || post.location === '__FEED__skill_roadmap') cardType = 'roadmap';
    else if (routineData || routineId || post.type === 'routine' || post.metadata?.type === 'routine') cardType = 'routine';
    else if (courseId || post.metadata?.type === 'course' || post.type === 'course') cardType = 'course';
    else if (lessonId || post.metadata?.type === 'lesson' || post.type === 'lesson') cardType = 'lesson';
    else if (drillId || post.metadata?.type === 'drill' || post.type === 'drill') cardType = 'drill';
    else if (sparringId || post.metadata?.type === 'sparring' || post.type === 'sparring') cardType = 'sparring';

    let cardTitle = '';
    let cardImage = '';
    let cardLabel = '';
    let cardIcon: React.ReactNode = null;
    let cardSubtitle = '';
    let cardNavigatePath = '';
    let cardAccentColor = 'bg-violet-600/90';

    if (cardType === 'roadmap') {
        cardTitle = post.metadata?.treeTitle || '스킬 로드맵';
        cardImage = images[0] || post.metadata?.sharedImage || post.mediaUrl || '';
        cardLabel = 'SKILL ROADMAP';
        cardIcon = <Signpost className="w-3 h-3" />;
        cardSubtitle = `${post.userName || 'Anonymous'}님의 기술 추천 경로`;
        cardNavigatePath = `/technique-roadmap?id=${treeId || post.metadata?.treeId}`;
    } else if (cardType === 'routine') {
        cardTitle = routineData?.title || post.metadata?.sharedTitle || '드릴 루틴';
        cardImage = routineData?.thumbnailUrl || post.metadata?.routineThumbnailUrl || post.metadata?.sharedImage || (images && images.length > 0 ? images[0] : '') || post.mediaUrl || '';
        cardLabel = 'DRILL ROUTINE';
        cardIcon = <Zap className="w-3 h-3" />;
        cardSubtitle = routineData?.creatorName ? `${routineData.creatorName} 인스트럭터의 루틴` : `${post.userName || 'Anonymous'}님이 완료한 훈련 루틴`;
        cardNavigatePath = `/routines/${routineId || routineData?.id}`;
        cardAccentColor = 'bg-zinc-800/90';
    } else if (cardType === 'course') {
        cardTitle = post.metadata?.courseTitle || post.metadata?.sharedTitle || '레슨 클래스';
        cardImage = post.metadata?.courseThumbnailUrl || post.metadata?.sharedImage || (images && images.length > 0 ? images[0] : '') || post.mediaUrl || '';
        cardLabel = 'LESSON CLASS';
        cardIcon = <BookOpen className="w-3 h-3" />;
        cardSubtitle = `전문가와 함께하는 체계적인 가르침`;
        cardNavigatePath = `/courses/${courseId}`;
        cardAccentColor = 'bg-zinc-800/90';
    } else if (cardType === 'lesson') {
        cardTitle = post.metadata?.lessonTitle || post.metadata?.sharedTitle || '레슨 상세';
        cardImage = post.metadata?.lessonThumbnailUrl || post.metadata?.sharedImage || (images && images.length > 0 ? images[0] : '') || post.mediaUrl || '';
        cardLabel = 'LESSON';
        cardIcon = <Play className="w-3 h-3" />;
        cardSubtitle = `기술의 핵심 원리를 배워보세요`;
        cardNavigatePath = `/lessons/${lessonId}`;
        cardAccentColor = 'bg-zinc-800/90';
    } else if (cardType === 'drill') {
        cardTitle = post.metadata?.drillTitle || post.metadata?.sharedTitle || '드릴 트레이닝';
        cardImage = post.metadata?.drillThumbnailUrl || post.metadata?.sharedImage || (images && images.length > 0 ? images[0] : '') || post.mediaUrl || '';
        cardLabel = 'DRILL';
        cardIcon = <Zap className="w-3 h-3" />;
        cardSubtitle = `반복 숙달을 위한 필수 트레이닝`;
        cardNavigatePath = `/drills/${drillId}`;
        cardAccentColor = 'bg-zinc-800/90';
    } else if (cardType === 'sparring') {
        cardTitle = post.metadata?.sparringTitle || post.metadata?.sharedTitle || '스파링 분석';
        cardImage = post.metadata?.sharedImage || (images && images.length > 0 ? images[0] : '') || post.mediaUrl || (sparringId ? `https://vumbnail.com/${sparringId}.jpg` : '');
        cardLabel = 'SPARRING';
        cardIcon = <Activity className="w-3 h-3" />;
        cardSubtitle = `실전 감각을 위한 스파링 리플레이`;
        cardNavigatePath = `/sparring?id=${sparringId}`;
        cardAccentColor = 'bg-zinc-800/90';
    }

    let cardAspectRatio = 'aspect-video'; // Default 16:9 for all
    // User requested 16:9 for all

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
                            <img src={post.userAvatar} alt={post.userName} loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center text-zinc-500 font-bold uppercase">
                                {(post.userName?.includes('@') ? 'G' : post.userName?.[0]) || 'G'}
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
                                {post.userName?.includes('@') ? post.userName.split('@')[0] : (post.userName || 'User')}
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
                                <div className="absolute right-0 mt-2 w-32 bg-zinc-900 rounded-lg shadow-xl border border-zinc-800 py-1 z-10 overflow-hidden">
                                    {user && user.id === post.userId ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete();
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-white/5 flex items-center gap-2 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            삭제하기
                                        </button>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReport();
                                            }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-zinc-400 hover:text-rose-400 hover:bg-white/5 flex items-center gap-2 transition-colors"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            신고하기
                                        </button>
                                    )}

                                    {post.metadata?.sharedRoutine && (
                                        <button
                                            onClick={handleSaveRoutine}
                                            className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-white/5 flex items-center gap-2 border-t border-zinc-800 transition-colors"
                                        >
                                            <Save className="w-4 h-4" />
                                            루틴 저장
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Body Text */}
                    <div className="mb-3">
                        <p className={`text-zinc-200 text-base leading-relaxed whitespace-pre-wrap ${displayText.length > 200 && !isExpanded ? 'line-clamp-4' : ''}`}>
                            {displayText}
                        </p>
                        {displayText.length > 200 && !isExpanded && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
                                className="text-zinc-500 text-sm mt-1 hover:text-zinc-300 font-medium"
                            >
                                더 보기
                            </button>
                        )}
                    </div>

                    {/* Specialized Content Box (Training Summary) */}
                    {displayText.includes('🥋') && (displayText.includes('Sparring Session Summary') || displayText.includes('Sparring Log')) && (
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
                                {displayText.split('\n').filter(line => line.includes('vs')).slice(0, 3).map((session, idx) => {
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
                                {displayText.split('\n').filter(line => line.includes('vs')).length > 3 && (
                                    <div className="text-xs text-zinc-500 text-center pt-2 mt-2 border-t border-zinc-800/50">
                                        + {displayText.split('\n').filter(line => line.includes('vs')).length - 3} more rounds
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Media Content - Simplified for Premium Feel */}
                    {(images.length > 0 || youtubeUrl || isVideo) && !cardType && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-zinc-800/50 bg-black relative shadow-lg">
                            {/* Reusing existing media logic within new wrapper */}
                            {images.length > 0 && !isVideo && !youtubeUrl && (
                                <div className="relative w-full group/media">
                                    <img
                                        src={images[currentImageIndex]}
                                        alt={`Post content ${currentImageIndex + 1}`}
                                        loading="lazy"
                                        className="w-full h-auto max-h-[600px] object-cover"
                                    />
                                    {images.length > 1 && (
                                        <>
                                            <button onClick={prevImage} aria-label="이전 이미지" className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity"><ChevronLeft className="w-5 h-5" /></button>
                                            <button onClick={nextImage} aria-label="다음 이미지" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover/media:opacity-100 transition-opacity"><ChevronRight className="w-5 h-5" /></button>
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
                                    <video
                                        src={post.mediaUrl}
                                        className="w-full h-full object-cover"
                                        loop
                                        muted={isMuted}
                                        onClick={togglePlay}
                                        playsInline
                                        preload="metadata"
                                        poster={post.metadata?.thumbnailUrl || (post.metadata?.images && Array.isArray(post.metadata.images) && post.metadata.images.length > 0 ? post.metadata.images[0] : undefined)}
                                    />
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

                    {/* Shared Content Preview Card (Free Pass Style) */}
                    {cardType && (
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(cardNavigatePath);
                            }}
                            className="group/card flex flex-col bg-zinc-900/30 border border-zinc-800/50 rounded-[24px] overflow-hidden cursor-pointer transition-all duration-300 hover:border-violet-500/30 hover:bg-zinc-900/60 hover:shadow-lg my-6"
                        >
                            {/* Image Section */}
                            <div className={cn("w-full relative overflow-hidden shrink-0", cardAspectRatio)}>
                                {cardImage ? (
                                    <>
                                        <img
                                            src={cardImage}
                                            alt={cardTitle}
                                            loading="lazy"
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
                                    </>
                                ) : (
                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                        <div className={cn("p-4 rounded-full bg-opacity-10", cardAccentColor)}>
                                            {React.cloneElement(cardIcon as React.ReactElement, { className: "w-8 h-8 text-white opacity-80" })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Content Section */}
                            <div className="flex-1 p-5 flex flex-col justify-between relative bg-zinc-950/20 backdrop-blur-sm">
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 mb-2 text-violet-400">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", cardType === 'sparring' ? 'bg-rose-500' : 'bg-violet-500')} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.15em] opacity-80">
                                            {cardLabel}
                                        </span>
                                    </div>
                                    <h3 className="text-zinc-100 text-lg font-bold tracking-tight leading-tight mb-2 group-hover/card:text-violet-300 transition-colors line-clamp-1">
                                        {cardTitle}
                                    </h3>
                                    <p className="text-zinc-500 text-xs line-clamp-2 leading-relaxed font-medium">
                                        {cardSubtitle}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50">
                                    <div className="flex items-center gap-3">
                                        {/* Metadata Badges */}
                                        {cardType === 'routine' && (
                                            <>
                                                <div className="flex items-center gap-1.5 text-zinc-500">
                                                    <Clock className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{post.metadata?.sharedRoutine?.totalDurationMinutes || 10}m</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-500">
                                                    <Zap className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold">{post.metadata?.sharedRoutine?.difficulty || 'General'}</span>
                                                </div>
                                            </>
                                        )}
                                        {cardType !== 'routine' && (
                                            <div className="flex items-center gap-1.5 text-zinc-500">
                                                <Sparkles className="w-3 h-3" />
                                                <span className="text-[10px] font-bold">Premium Content</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 text-zinc-400 group-hover/card:text-violet-400 transition-colors">
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Start</span>
                                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover/card:translate-x-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Technique Tags */}
                    {
                        post.techniques && post.techniques.length > 0 && (
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
                        )
                    }

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
                    {
                        showComments && (
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
                                                    {comment.user?.avatar_url && <img src={comment.user.avatar_url} loading="lazy" className="w-full h-full object-cover" />}
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
                        )
                    }
                </div >
            </div >

            {/* Share Modal Portal */}
            < React.Suspense fallback={null} >
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={`${post.userName}의 게시물`}
                        text={displayText.substring(0, 100) + '...'}
                        url={postUrl}
                        imageUrl={images[0]}
                    />
                )}
            </React.Suspense >

            <ConfirmModal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={confirmDelete}
                title="게시물을 삭제하시겠습니까?"
                message="삭제된 게시물은 복구할 수 없으며,\n피드에서도 즉시 제거됩니다."
                confirmText="삭제하기"
                variant="danger"
                isLoading={isActionLoading}
            />

            <ConfirmModal
                isOpen={showReportConfirm}
                onClose={() => setShowReportConfirm(false)}
                onConfirm={confirmReport}
                title="게시물을 신고하시겠습니까?"
                message="부적절한 콘텐츠나 스팸 등이 포함되어 있나요?\n관리자가 검토 후 신속히 조치하겠습니다."
                confirmText="신고하기"
                variant="warning"
                isLoading={isActionLoading}
            />
        </div >
    );
};
