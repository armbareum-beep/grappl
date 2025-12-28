import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { getSparringVideos } from '../lib/api';
import { SparringVideo } from '../types';
import { Heart, Share2, BookOpen, ArrowLeft, MessageCircle, X, Send } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

/* eslint-disable react-hooks/exhaustive-deps */
import Player from '@vimeo/player';

const VideoItem: React.FC<{
    video: SparringVideo;
    isActive: boolean;
}> = ({ video, isActive }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<Player | null>(null);
    const [muted, setMuted] = useState(true);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Interaction State
    const { user } = useAuth();
    const [isFollowed, setIsFollowed] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const navigate = useNavigate();

    // Check interaction status on load
    useEffect(() => {
        if (user && video.creatorId) {
            import('../lib/api').then(({ getSparringInteractionStatus }) => {
                getSparringInteractionStatus(user.id, video.id, video.creatorId)
                    .then(status => {
                        setIsFollowed(status.followed);
                        setIsLiked(status.liked);
                        setIsSaved(status.saved);
                    })
                    .catch(console.error);
            });
        }
    }, [user, video.id, video.creatorId]);

    // Handlers
    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!video.creatorId) return;

        // Optimistic UI
        const newStatus = !isFollowed;
        setIsFollowed(newStatus);

        try {
            const { toggleCreatorFollow } = await import('../lib/api');
            const result = await toggleCreatorFollow(user.id, video.creatorId);
            setIsFollowed(result.followed);
        } catch (error) {
            console.error('Follow failed', error);
            setIsFollowed(!newStatus); // Revert
        }
    };

    const handleLike = async () => {
        if (!user) { navigate('/login'); return; }

        // Optimistic UI
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLocalLikes(prev => newStatus ? prev + 1 : prev - 1);

        try {
            const { toggleSparringLike } = await import('../lib/api');
            const result = await toggleSparringLike(user.id, video.id);
            setIsLiked(result.liked);
        } catch (error) {
            console.error('Like failed', error);
            setIsLiked(!newStatus); // Revert
            setLocalLikes(prev => !newStatus ? prev + 1 : prev - 1);
        }
    };

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }

        // Optimistic UI
        const newStatus = !isSaved;
        setIsSaved(newStatus);

        try {
            const { toggleSparringSave } = await import('../lib/api');
            const result = await toggleSparringSave(user.id, video.id);
            setIsSaved(result.saved);
        } catch (error) {
            console.error('Save failed', error);
            setIsSaved(!newStatus); // Revert
        }
    };

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    // Comment Overlay State
    const [isCommentOpen, setIsCommentOpen] = useState(false);

    const handleShare = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsShareModalOpen(true);
    };

    // Helper to get Vimeo ID
    const getVimeoId = (url: string) => {
        if (!url) return null;
        // If it's just numbers, it's an ID
        if (/^\d+$/.test(url)) return url;
        // Try to extract from URL
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : null;
    };

    const vimeoId = getVimeoId(video.videoUrl);

    // Initialize Player
    useEffect(() => {
        if (!containerRef.current || !vimeoId) return;

        // Cleanup previous player if exists
        if (playerRef.current) {
            playerRef.current.destroy();
        }

        const player = new Player(containerRef.current, {
            id: Number(vimeoId),
            width: window.innerWidth, // Responsive width
            background: true, // Use background mode for simpler UI
            loop: true,
            autoplay: false,
            muted: true,
            controls: false,
            dnt: true // Do Not Track
        });

        player.ready().then(() => {
            setIsPlayerReady(true);
            playerRef.current = player;

            // If active when ready, play
            if (isActive) {
                player.play().catch(console.error);
            }
        }).catch(err => {
            console.error('Vimeo player init error:', err);
        });

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, [vimeoId]);

    // Handle Active State Changes
    useEffect(() => {
        if (!playerRef.current || !isPlayerReady) return;

        if (isActive) {
            playerRef.current.play().catch(() => {
                // If play fails (e.g. requires mute), ensure muted and try again
                playerRef.current?.setVolume(0);
                setMuted(true);
                playerRef.current?.play().catch(console.error);
            });
        } else {
            playerRef.current.pause().catch(console.error);
            playerRef.current.setCurrentTime(0).catch(console.error);
        }
    }, [isActive, isPlayerReady]);

    // Handle Mute Toggle (Shared)
    const toggleMute = async () => {
        const newMuteState = !muted;
        setMuted(newMuteState);

        if (playerRef.current) {
            await playerRef.current.setVolume(newMuteState ? 0 : 1);
            await playerRef.current.setMuted(newMuteState);
        } else if (containerRef.current) {
            const videoEl = containerRef.current.querySelector('video');
            if (videoEl) videoEl.muted = newMuteState;
        }
    };

    // Render Content
    const renderVideoContent = () => {
        // 0. Error Check
        if (video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error')) {
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">영상 처리 실패</h3>
                    <p className="text-sm text-center text-zinc-400 mb-4 max-w-xs break-all">
                        {video.videoUrl.replace('ERROR:', '').trim()}
                    </p>
                    <div className="text-xs text-zinc-500 text-center">
                        영상을 처리할 수 없습니다. 대시보드에서 삭제 후 다시 시도해주세요.
                    </div>
                </div>
            );
        }

        // 1. Vimeo Player
        if (vimeoId) {
            return (
                <div
                    ref={containerRef}
                    className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:object-cover"
                    onClick={toggleMute}
                />
            );
        }

        // 2. Standard Video (Fallback / Generic MP4)
        return (
            <video
                ref={(el) => {
                    // Type casting/assertion workaround if needed, or simple ref callback
                    // We can reuse container logic or just manage it simply
                    if (el && isActive) {
                        el.play().catch(() => {
                            setMuted(true);
                            if (el) el.muted = true;
                            if (el) el.play();
                        });
                        el.muted = muted;
                    } else if (el) {
                        el.pause();
                        el.currentTime = 0;
                    }
                }}
                src={video.videoUrl}
                className="w-full h-full object-contain"
                loop
                playsInline
                onClick={toggleMute}
            />
        );
    };

    return (
        <>
            <div className="w-full h-[calc(100vh-56px)] sm:h-screen relative snap-start shrink-0 bg-black flex items-center justify-center overflow-hidden">
                {/* Aspect Ratio Video Container */}
                <div className="relative w-full h-full">
                    {renderVideoContent()}

                    {/* CLICK OVERLAY FIX: Explicit layer for click-to-pause (actually mute toggle here as per req?)
                    The user complained about "pause" but the current code calls toggleMute on click.
                    I'll keep it as toggleMute unless requested otherwise, but ensure it covers everything.
                */}
                    <div
                        className="absolute inset-0 z-10"
                        onClick={toggleMute}
                    />
                </div>

                {/* Gradient Overlay - pointer-events-none */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80 pointer-events-none z-20" />

                {/* Mute Indicator */}
                <div className="absolute top-4 right-4 z-40 pointer-events-none">
                    {muted && (
                        <div className="bg-black/50 p-2 rounded-full backdrop-blur-sm animate-pulse">
                            <span className="text-white text-xs font-bold px-2">소리 켜기</span>
                        </div>
                    )}
                </div>

                {/* Right Sidebar Actions - pointer-events-auto */}
                <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-30 pointer-events-auto">
                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleLike(); }}
                            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-colors group"
                        >
                            <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : ''} group-hover:scale-110 transition-transform`} />
                        </button>
                        <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{localLikes}</span>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSave(); }}
                            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-yellow-400 transition-colors group"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill={isSaved ? "currentColor" : "none"}
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={`w-7 h-7 ${isSaved ? 'text-yellow-400' : ''} group-hover:scale-110 transition-transform`}
                            >
                                <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                            </svg>
                        </button>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsCommentOpen(true); }}
                            className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-blue-500 transition-colors group"
                        >
                            <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>

                    <button
                        onClick={handleShare}
                        className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-green-500 transition-colors"
                    >
                        <Share2 className="w-7 h-7" />
                    </button>
                </div>

                {/* Content & Actions - 스파링은 16:9 비율 */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 pointer-events-none md:pointer-events-auto">
                    <div className="flex items-end justify-between pointer-events-auto">
                        {/* Info - Always inside video */}
                        <div className="flex-1 pr-4">
                            <div className="flex items-center gap-3 mb-3">
                                {video.creator && (
                                    <>
                                        <Link
                                            to={`/creator/${video.creator.id}`}
                                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                                        >
                                            <img
                                                src={video.creator.profileImage || 'https://via.placeholder.com/40'}
                                                alt={video.creator.name}
                                                className="w-8 h-8 rounded-full border border-white/20 object-cover"
                                            />
                                            <span className="text-white font-bold text-sm drop-shadow-sm">
                                                {video.creator.name}
                                            </span>
                                        </Link>
                                        <span className="text-white/60 text-xs leading-none mt-0.5">•</span>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${isFollowed
                                                ? 'bg-zinc-800/50 text-zinc-400 border-zinc-700'
                                                : 'bg-transparent text-white border-white/40 hover:bg-white/10'
                                                }`}
                                        >
                                            {isFollowed ? '팔로잉' : '팔로우'}
                                        </button>
                                    </>
                                )}
                            </div>

                            <h2 className="text-white font-bold text-base mb-2 line-clamp-2 drop-shadow-sm">
                                {video.title}
                            </h2>

                            {/* 설명 */}
                            {video.description && (
                                <p className="text-sm text-white/80 mb-3 line-clamp-2 drop-shadow-sm">
                                    {video.description}
                                </p>
                            )}

                            {/* 이 기술 배우기 - 제목과 설명 아래, 유튜브 스타일 반응형 그리드 */}
                            {video.relatedItems && video.relatedItems.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {video.relatedItems.map((item, idx) => (
                                        <Link
                                            key={idx}
                                            to={item.type === 'drill' ? `/drills/${item.id}` : `/courses/${item.id}`}
                                            className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-white/20 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/20 transition-all group"
                                        >
                                            <div className="bg-blue-600 p-1 rounded-full group-hover:bg-blue-500 transition-colors flex-shrink-0">
                                                <BookOpen className="w-3 h-3 text-white" />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[10px] text-blue-300 font-bold leading-none">이 기술 배우기</span>
                                                <span className="text-xs font-semibold text-white leading-none mt-0.5 truncate">{item.title}</span>
                                            </div>
                                            <div className="w-4 h-4 flex items-center justify-center opacity-50 group-hover:opacity-100 flex-shrink-0">
                                                <ArrowLeft className="w-3 h-3 rotate-180" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Side Actions - Mobile style (stacked bottom right) */}
                        <div className="flex flex-col gap-5 items-center pb-8 md:hidden">
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleLike(); }}
                                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-red-500 transition-colors group"
                                >
                                    <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : ''} group-hover:scale-110 transition-transform`} />
                                </button>
                                <span className="text-xs font-bold text-white shadow-black drop-shadow-md">{localLikes}</span>
                            </div>

                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleSave(); }}
                                    className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-yellow-400 transition-colors group"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill={isSaved ? "currentColor" : "none"}
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className={`w-7 h-7 ${isSaved ? 'text-yellow-400' : ''} group-hover:scale-110 transition-transform`}
                                    >
                                        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                                    </svg>
                                </button>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); setIsCommentOpen(true); }}
                                className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-blue-500 transition-colors group"
                            >
                                <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
                            </button>

                            <button
                                onClick={handleShare}
                                className="p-3 bg-black/40 backdrop-blur-md rounded-full text-white hover:text-green-500 transition-colors"
                            >
                                <Share2 className="w-7 h-7" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Modal Portal */}
            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={video.title}
                        text={`${video.creator?.name}님의 스파링 영상을 확인해보세요`}
                        url={`${window.location.origin}/sparring?id=${video.id}`}
                        imageUrl={video.thumbnailUrl}
                    />
                )}
            </React.Suspense>

            {/* Comments Overlay */}
            {isCommentOpen && (
                <CommentsOverlay
                    videoId={video.id}
                    onClose={() => setIsCommentOpen(false)}
                />
            )}
        </>
    );
};

// Comments Overlay Component
const CommentsOverlay: React.FC<{ videoId: string; onClose: () => void }> = ({ videoId, onClose }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadComments();
    }, [videoId]);

    const loadComments = async () => {
        try {
            const { getSparringComments } = await import('../lib/api');
            const data = await getSparringComments(videoId);
            setComments(data || []);
        } catch (error) {
            console.error('Failed to load comments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newComment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const { createSparringComment } = await import('../lib/api');
            const comment = await createSparringComment(videoId, user.id, newComment.trim());
            if (comment) {
                setComments(prev => [...prev, comment]);
                setNewComment('');
            }
        } catch (error) {
            console.error('Failed to post comment:', error);
            alert('댓글 작성에 실패했습니다.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            const { deleteSparringComment } = await import('../lib/api');
            await deleteSparringComment(commentId);
            setComments(prev => prev.filter(c => c.id !== commentId));
        } catch (error) {
            console.error('Failed to delete comment:', error);
        }
    };

    return (
        <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="bg-zinc-900 rounded-t-2xl h-[70vh] w-full pointer-events-auto flex flex-col shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h3 className="text-white font-bold">댓글 {comments.length}</h3>
                    <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="text-center text-zinc-500 py-8">
                            첫 번째 댓글을 남겨보세요!
                        </div>
                    ) : (
                        comments.map(comment => (
                            <div key={comment.id} className="flex gap-3">
                                <img
                                    src={comment.user?.avatar_url || 'https://via.placeholder.com/32'}
                                    alt={comment.user?.name}
                                    className="w-8 h-8 rounded-full object-cover bg-zinc-800 shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-zinc-300 text-sm font-bold">
                                            {comment.user?.name || '알 수 없음'}
                                        </span>
                                        <span className="text-zinc-500 text-xs">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-zinc-200 text-sm break-words mt-0.5">
                                        {comment.content}
                                    </p>
                                    {user?.id === comment.user_id && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            className="text-zinc-500 text-xs mt-1 hover:text-red-400"
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-zinc-900 pb-safe">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder={user ? "댓글을 입력하세요..." : "로그인이 필요합니다"}
                            disabled={!user || submitting}
                            className="flex-1 bg-zinc-800 text-white rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500"
                        />
                        <button
                            type="submit"
                            disabled={!user || !newComment.trim() || submitting}
                            className="p-2.5 bg-blue-600 rounded-full text-white disabled:opacity-50 disabled:bg-zinc-700 transition-colors"
                        >
                            {submitting ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
// Lazy load Modal to avoid circular dependency or bundle issues if needed
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

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
        if (data) {
            // Shuffle videos randomly using Fisher-Yates algorithm
            const shuffled = [...data];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            setVideos(shuffled);
        }
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

    // Deep Linking Effect
    const [searchParams] = useSearchParams();
    const initialId = searchParams.get('id');

    useEffect(() => {
        if (videos.length > 0 && initialId && containerRef.current) {
            const index = videos.findIndex(v => v.id === initialId);
            if (index !== -1) {
                // Set active index immediately
                setActiveIndex(index);

                // Scroll to position after a brief delay to ensure layout is ready
                setTimeout(() => {
                    if (containerRef.current) {
                        containerRef.current.scrollTo({
                            top: index * containerRef.current.clientHeight,
                            behavior: 'instant'
                        });
                    }
                }, 100);
            }
        }
    }, [videos, initialId]);

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
