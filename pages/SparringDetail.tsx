import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    getSparringVideoById,
    toggleSparringLike,
    toggleSparringSave,
    toggleCreatorFollow,
    getSparringInteractionStatus,
    getSparringVideos,
    recordSparringView,
    extractVimeoId
} from '../lib/api';
import { SparringVideo, Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Heart, Bookmark, Share2, Play, Lock, Volume2, VolumeX, ChevronRight, X, LayoutGrid } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { VideoPlayer } from '../components/VideoPlayer';

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

export const SparringDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: contextUser, loading: authLoading, isSubscribed } = useAuth();
    const { success, error: toastError } = useToast();

    const [video, setVideo] = useState<SparringVideo | null>(null);
    const [relatedDrills, setRelatedDrills] = useState<Drill[]>([]);
    const [moreSparring, setMoreSparring] = useState<SparringVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [owns, setOwns] = useState(false);

    // Interactions
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isFollowing, setIsFollowing] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [showMoreSparring, setShowMoreSparring] = useState(false);

    // Player State
    const [isPlaying, setIsPlaying] = useState(true);
    const [progress, setProgress] = useState(0);
    const [muted, setMuted] = useState(true);
    const [showLikeAnimation, setShowLikeAnimation] = useState(false);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (authLoading) return;
        if (id) {
            fetchVideo();
        }
    }, [id, authLoading]);

    // Increment sparring view count after 10 seconds of watching (only for authorized users)
    useEffect(() => {
        if (!video || !owns || !id) return;

        const timer = setTimeout(async () => {
            const { incrementSparringView } = await import('../lib/api');
            incrementSparringView(id).catch(console.error);
        }, 10000); // 10 seconds

        return () => clearTimeout(timer);
    }, [video?.id, owns, id]);

    const fetchVideo = async () => {
        if (!id) return;
        try {
            const response = await getSparringVideoById(id);
            const data = (response as any).data || response;
            const err = (response as any).error;

            if (err || !data || !data.id) {
                setError('스파링 영상을 찾을 수 없습니다.');
                return;
            }

            setVideo(data);
            checkOwnership(data);
            checkInteractions(data);

            // Fetch related drills and lessons if any
            if (data.relatedItems && data.relatedItems.length > 0) {
                import('../lib/api').then(({ getDrillsByIds, getLessonsByIds }) => {
                    const allIds = data.relatedItems.map((item: any) => typeof item === 'string' ? item : item.id);

                    Promise.all([
                        getDrillsByIds(allIds),
                        getLessonsByIds(allIds)
                    ]).then(([drillsRes, lessonsRes]) => {
                        const combined = [
                            ...(drillsRes.data || []).map((d: any) => ({ ...d, _type: 'drill' })),
                            ...(lessonsRes.data || []).map((l: any) => ({ ...l, _type: 'lesson' }))
                        ];
                        setRelatedDrills(combined);
                    });
                });
            }

            // Fetch more sparring from same creator
            if (data.creatorId) {
                getSparringVideos(10, data.creatorId, true).then(({ data: videos }) => {
                    if (videos) {
                        setMoreSparring(videos.filter((v: SparringVideo) => v.id !== data.id));
                    }
                });
            }

            // Record history for logged-in users
            if (contextUser) {
                recordSparringView(contextUser.id, id).catch(console.error);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || '영상 로딩 중 오류 발생');
        } finally {
            setLoading(false);
        }
    };

    const checkOwnership = async (videoData: SparringVideo) => {
        if (!contextUser) {
            if (!videoData.price || videoData.price === 0) setOwns(true);
            return;
        }

        if (videoData.creatorId === contextUser.id) {
            setOwns(true);
            return;
        }

        if (!videoData.price || videoData.price === 0) {
            setOwns(true);
            return;
        }

        if (isSubscribed) {
            setOwns(true);
            return;
        }

        const { data } = await supabase
            .from('user_videos')
            .select('video_id')
            .eq('user_id', contextUser.id)
            .eq('video_id', videoData.id)
            .maybeSingle();

        if (data) setOwns(true);
        else setOwns(false);
    };

    const checkInteractions = async (videoData: SparringVideo) => {
        if (!contextUser) return;

        try {
            const status = await getSparringInteractionStatus(contextUser.id, videoData.id, videoData.creatorId);
            setLiked(status.liked);
            setSaved(status.saved);
            setIsFollowing(status.followed);
        } catch (e) {
            console.warn('Interaction check failed', e);
        }
    };

    const handleFollow = async () => {
        if (!contextUser) return navigate('/login');
        if (!video?.creatorId) return;

        try {
            const { followed } = await toggleCreatorFollow(contextUser.id, video.creatorId);
            setIsFollowing(followed);
            success(followed ? '팔로우했습니다.' : '팔로우를 취소했습니다.');
        } catch (error) {
            toastError('팔로우 처리 중 오류가 발생했습니다.');
        }
    };

    const handleLike = async () => {
        if (!contextUser || !video) return navigate('/login');
        const oldLiked = liked;
        setLiked(!liked);

        try {
            const { liked: newLiked } = await toggleSparringLike(contextUser.id, video.id);
            setLiked(newLiked);
        } catch (e) {
            setLiked(oldLiked);
            console.error(e);
        }
    };

    const handleSave = async () => {
        if (!contextUser || !video) return navigate('/login');
        const oldSaved = saved;
        setSaved(!saved);

        try {
            const { saved: newSaved } = await toggleSparringSave(contextUser.id, video.id);
            setSaved(newSaved);
            if (newSaved) success('보관함에 저장되었습니다.');
            else success('보관함에서 삭제되었습니다.');
        } catch (e) {
            setSaved(oldSaved);
            console.error(e);
        }
    };

    const handlePurchase = () => {
        if (!contextUser) return navigate('/login');
        if (!video) return;
        navigate(`/payment/sparring/${video.id}?price=${video.price}`);
    };

    const toggleMute = () => {
        setMuted(!muted);
    };

    // Click handler: single tap = play/pause, double tap = like
    const handleVideoClick = () => {
        if (!owns) return;
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
            handleLike();
            setShowLikeAnimation(true);
            setTimeout(() => setShowLikeAnimation(false), 800);
        } else {
            clickTimeoutRef.current = setTimeout(() => {
                clickTimeoutRef.current = null;
                setIsPlaying(!isPlaying);
            }, 250);
        }
    };

    // Derived State
    const vimeoId = extractVimeoId(video?.videoUrl);
    const previewVimeoId = extractVimeoId(video?.previewVimeoId);
    const hasPreview = !!previewVimeoId;

    if (loading) return <LoadingScreen message="스파링 영상 불러오는 중..." />;
    if (error || !video) return <ErrorScreen error={error || 'Video not found'} />;

    const creatorName = (video as any).creatorName || (video as any).creator?.name || 'Creator';
    const creatorAvatar = (video as any).creator?.profileImage || (video as any).creator?.avatar_url || (video as any).creator?.image;

    // Render video content based on ownership
    const renderVideoContent = () => {
        if (owns) {
            return (
                <VideoPlayer
                    vimeoId={vimeoId || video.videoUrl || ''}
                    title={video.title}
                    playing={isPlaying}
                    showControls={false}
                    fillContainer={true}
                    forceSquareRatio={true}
                    onProgress={(_s, _d, percent) => {
                        if (percent !== undefined) setProgress(percent * 100);
                    }}
                    onDoubleTap={handleLike}
                    muted={muted}
                />
            );
        }

        if (hasPreview) {
            return (
                <VideoPlayer
                    vimeoId={previewVimeoId || video.previewVimeoId || ''}
                    title={video.title}
                    playing={isPlaying}
                    showControls={false}
                    fillContainer={true}
                    forceSquareRatio={true}
                    onProgress={(_s, _d, percent) => {
                        if (percent !== undefined) setProgress(percent * 100);
                    }}
                    muted={muted}
                />
            );
        }

        // No access and no preview - show thumbnail with lock
        return (
            <div className="w-full h-full relative">
                {video.thumbnailUrl && (
                    <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-full h-full object-cover opacity-50 blur-sm"
                    />
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center bg-black/40 backdrop-blur-sm z-40">
                    <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                        <Lock className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">
                        유료 스파링 영상입니다
                    </h3>
                    <p className="text-zinc-300 mb-8 max-w-xs text-sm">
                        이 스파링 영상을 시청하려면 구매가 필요합니다.
                    </p>
                    <Button
                        onClick={handlePurchase}
                        size="lg"
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-8 py-4 text-lg"
                    >
                        ₩{video.price.toLocaleString()}에 구매하기
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden select-none">
            <div className="w-full h-full relative flex items-start justify-center pt-16">
                {/* Video Container - Aspect Square like SparringReelItem */}
                <div className="relative w-full max-w-[min(100vw,calc(100vh-140px))] aspect-square z-10 flex items-center justify-center overflow-hidden rounded-lg">
                    {renderVideoContent()}

                    {/* Click Overlay */}
                    <div className="absolute inset-0 z-20 cursor-pointer" onClick={handleVideoClick} />

                    {/* Like Animation */}
                    {showLikeAnimation && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                            <Heart
                                className="w-24 h-24 text-violet-500 fill-violet-500 animate-ping"
                                style={{ animationDuration: '0.8s', animationIterationCount: '1' }}
                            />
                        </div>
                    )}

                    {/* Preview Badge */}
                    {!owns && hasPreview && (
                        <div className="absolute top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
                            <span className="bg-violet-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
                                <Play className="w-3 h-3 fill-current" /> 미리보기 시청 중
                            </span>
                        </div>
                    )}

                    {/* Purchase Overlay (shown over preview video) */}
                    {!owns && hasPreview && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-white/10 shadow-2xl">
                                <Lock className="w-8 h-8 text-zinc-400" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">스파링 전체 시청하기</h3>
                            <p className="text-zinc-400 text-sm mb-8 max-w-[280px] font-medium">
                                이 스파링 영상의 뒷부분을 시청하시려면 단품으로 구매하거나 그래플레이 멤버십을 구독하세요.
                            </p>

                            <div className="w-full max-w-[280px] space-y-3">
                                <button
                                    onClick={handlePurchase}
                                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg hover:bg-zinc-200 transition-all active:scale-95 shadow-xl"
                                >
                                    ₩{video?.price.toLocaleString()} 단품 구매
                                </button>

                                <div className="relative py-2">
                                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                                        <span className="bg-zinc-900 px-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">or</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate('/pricing')}
                                    className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black text-lg hover:bg-violet-500 transition-all active:scale-95 shadow-xl shadow-violet-500/20"
                                >
                                    멤버십 구독하기
                                </button>
                            </div>

                            <p className="text-[10px] text-zinc-500 mt-6 max-w-[220px]">
                                멤버십 구독 시 모든 클래스, 드릴, 스파링 영상을 무제한으로 시청할 수 있습니다.
                            </p>
                        </div>
                    )}

                    {/* Play Button Overlay when paused */}
                    {owns && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-40">
                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-10 h-10 text-black ml-1" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Background Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60 pointer-events-none z-30" />

                {/* Overlay Contents */}
                <div className="absolute inset-0 pointer-events-none z-40 flex items-start justify-center">
                    {/* Top Controls */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-[min(100vw,calc(100vh-140px))] flex justify-between px-4 pointer-events-none">
                        <div className="pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); navigate(-1); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 transition-all shadow-xl active:scale-95"
                            >
                                <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-2xl"
                            >
                                {muted ? <VolumeX className="w-5 h-5 md:w-6 md:h-6" /> : <Volume2 className="w-5 h-5 md:w-6 md:h-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Right Side Actions */}
                    <div className="absolute bottom-10 right-4 flex flex-col gap-5 z-[70] pointer-events-auto items-center">
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); handleLike(); }}
                                className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                            >
                                <Heart className={`w-5 h-5 md:w-7 md:h-7 ${liked ? 'fill-violet-500 text-violet-500' : ''} transition-all`} />
                            </button>
                            <span className="text-[11px] md:text-sm font-bold text-white drop-shadow-md">{((video.likes || 0) + (liked ? 1 : 0)).toLocaleString()}</span>
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handleSave(); }}
                            className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                        >
                            <Bookmark className={`w-5 h-5 md:w-6 md:h-6 ${saved ? 'fill-white' : ''}`} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsShareModalOpen(true); }}
                            className="p-2 md:p-2.5 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all active:scale-90 shadow-2xl"
                        >
                            <Share2 className="w-5 h-5 md:w-6 md:h-6" />
                        </button>

                        {/* More Sparring Button */}
                        {moreSparring.length > 0 && (
                            <button
                                onClick={() => setShowMoreSparring(true)}
                                className="p-2 md:p-2.5 rounded-full bg-zinc-800/80 backdrop-blur-sm text-zinc-100 hover:bg-zinc-700 transition-all active:scale-90 mt-2 shadow-2xl"
                            >
                                <LayoutGrid className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        )}
                    </div>

                    {/* Bottom Info */}
                    <div className="absolute bottom-10 left-0 right-0 w-full px-6 z-[60] text-white pointer-events-none">
                        <div className="w-full max-w-[min(100vw,calc(100vh-140px))] mx-auto flex flex-col items-start gap-2 md:gap-4">
                            {/* Related Drills Cards (Horizontal Scroll) */}
                            {relatedDrills.length > 0 && (
                                <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pointer-events-auto pb-2 -mx-2 px-2">
                                    {relatedDrills.map((item: any) => {
                                        const isDrill = item._type === 'drill';
                                        const targetUrl = isDrill ? `/drills/${item.id}` : `/lessons/${item.id}`;

                                        return (
                                            <div
                                                key={item.id}
                                                onClick={(e) => { e.stopPropagation(); navigate(targetUrl); }}
                                                className="group flex-shrink-0 w-64 md:w-72 flex gap-3 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 hover:bg-black/80 hover:border-white/20 transition-all cursor-pointer items-center active:scale-95"
                                            >
                                                <div className="w-20 aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-white/10 group-hover:border-white/20 shrink-0 relative">
                                                    {item.thumbnailUrl ? (
                                                        <img src={item.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                                                    ) : (
                                                        <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700"><Play className="w-6 h-6" /></div>
                                                    )}
                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                                                        <Play className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all fill-current" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-bold text-white line-clamp-2 drop-shadow-sm">{item.title}</h4>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${isDrill ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                                                            {isDrill ? 'DRILL' : 'LESSON'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/70 transition-colors shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Creator Info & Title */}
                            <div className="w-full pointer-events-auto pr-20 bg-gradient-to-t from-black/20 to-transparent p-3 md:p-0 rounded-2xl backdrop-blur-sm md:backdrop-blur-none">
                                {/* Category Tag */}
                                {(video as any).category && (
                                    <div className="flex items-center gap-3">
                                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border mb-2 ${(video as any).category === 'Competition'
                                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                            }`}>
                                            {(video as any).category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                                        </div>
                                    </div>
                                )}

                                {/* Creator */}
                                <div className="flex items-center gap-3 mb-2 md:mb-3">
                                    <Link to={`/creator/${video.creatorId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                        <div className="relative">
                                            <img
                                                src={creatorAvatar || `https://ui-avatars.com/api/?name=${creatorName}`}
                                                className="w-7 md:w-8 h-7 md:h-8 rounded-full border border-white/20 object-cover"
                                                alt={creatorName}
                                            />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-bold text-xs md:text-sm drop-shadow-sm">{creatorName}</span>
                                        </div>
                                    </Link>
                                    <span className="text-white/60 text-xs">•</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleFollow(); }}
                                        className={`px-3 md:px-4 py-1 md:py-1.5 rounded-full text-[10px] md:text-[11px] font-bold border transition-all active:scale-95 ${isFollowing ? 'bg-violet-600 text-white border-violet-600' : 'bg-transparent text-violet-400 border-violet-500 hover:bg-violet-600 hover:text-white'}`}
                                    >
                                        {isFollowing ? '팔로잉' : '팔로우'}
                                    </button>
                                </div>

                                {/* Title */}
                                <div className="mb-1 md:mb-2">
                                    <h3 className="font-black text-lg md:text-xl lg:text-3xl leading-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] line-clamp-2">{video.title}</h3>
                                </div>

                                {/* Description */}
                                {video.description && (
                                    <p className="text-xs md:text-base text-white/70 line-clamp-2 max-w-xl font-medium drop-shadow-md">{video.description}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Share Modal */}
                    <React.Suspense fallback={null}>
                        {isShareModalOpen && (
                            <ShareModal
                                isOpen={isShareModalOpen}
                                onClose={() => setIsShareModalOpen(false)}
                                title={video.title}
                                url={window.location.href}
                                text={`Check out this sparring video: ${video.title}`}
                            />
                        )}
                    </React.Suspense>
                </div>

                {/* Progress Bar */}
                <div className="absolute bottom-0 left-0 right-0 z-50 h-[2px] bg-zinc-800/50">
                    <div
                        className="h-full bg-violet-400 transition-all ease-linear duration-100"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* More Sparring Sheet */}
                {showMoreSparring && (
                    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex justify-end" onClick={() => setShowMoreSparring(false)}>
                        <div
                            className="w-full max-w-sm h-full bg-zinc-900 border-l border-zinc-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 backdrop-blur-xl">
                                <div>
                                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                                        More Sparring
                                    </h3>
                                    <p className="text-xs text-zinc-500 mt-0.5">{creatorName}님의 다른 스파링 영상</p>
                                </div>
                                <button onClick={() => setShowMoreSparring(false)} className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                                    <X className="w-5 h-5 text-zinc-400" />
                                </button>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700">
                                {moreSparring.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => { navigate(`/sparring/${v.id}`); setShowMoreSparring(false); }}
                                        className="group flex gap-3 p-3 rounded-xl bg-black/40 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700 transition-all cursor-pointer items-center"
                                    >
                                        <div className="w-24 aspect-[9/16] rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-zinc-600 shrink-0 relative">
                                            {v.thumbnailUrl ? (
                                                <img src={v.thumbnailUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-700"><Play className="w-6 h-6" /></div>
                                            )}
                                            {v.isPublished === false && <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-zinc-900/80 rounded text-[9px] text-zinc-400 font-bold border border-zinc-800">Private</div>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-zinc-200 group-hover:text-white truncate transition-colors leading-tight line-clamp-2 white-space-normal">{v.title}</h4>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-[10px] text-zinc-500 font-medium px-1.5 py-0.5 bg-zinc-800 rounded border border-zinc-700">{v.views || 0} views</span>
                                                {v.price > 0 && <span className="text-[10px] text-violet-400 font-bold">Paid</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
