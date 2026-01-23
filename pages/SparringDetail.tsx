import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getSparringVideoById,
    toggleSparringLike,
    checkSparringLiked,
    toggleSparringSave,
    checkSparringSaved,
    toggleCreatorFollow,
    getSparringInteractionStatus,
    getDrillsByIds,
    getSparringVideos,
    incrementSparringView
} from '../lib/api';
import { SparringVideo, Drill } from '../types';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Heart, Bookmark, Share2, Play, Lock, Volume2, VolumeX, List, CheckCircle, ChevronRight, X, LayoutGrid } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const ShareModal = React.lazy(() => import('../components/social/ShareModal'));

export const SparringDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user: contextUser, loading: authLoading } = useAuth();
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
    const [isVideoReady, setIsVideoReady] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Helper to extract Vimeo ID
    const extractVimeoId = (url?: string | null) => {
        if (!url || typeof url !== 'string') return undefined;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
        return match ? match[1] : undefined;
    };

    useEffect(() => {
        if (authLoading) return;
        if (id) {
            fetchVideo();
        }
    }, [id, authLoading]);

    const fetchVideo = async () => {
        if (!id) return;
        try {
            // Check getSparringVideoById return type. It likely returns just data or {data, error}?
            // In api.ts around line 4828, it seems to return Promise<SparringVideo | null> or similar?
            // Wait, looking at SparringDetail line 60 in previous file: `const response = await getSparringVideoById(id);`
            // And `if (response.error ...)`
            // I should double check getSparringVideoById signature. 
            // In api.ts, I saw getSparringVideoById implementation. Let's assume it returns { data, error } pattern or just data?
            // "getSparringVideoById" declared at line 4828.
            // I'll check its signature quickly to be safe.

            // Assuming current usage pattern in api.ts is consistent with newer functions returning { data, error }, BUT
            // getCreatorById returns Creator | null.
            // getDrillById returns Drill | { error } (mixed return type? messy).
            // Let's check getSparringVideoById implementation.

            const response = await getSparringVideoById(id);
            // Based on previous code in SparringDetail, I treated it as { data, error }. 
            // If it returns just data (SparringVideo), then response.data would be undefined.

            // Let's defensively handle both.
            const data = (response as any).data || response;
            const err = (response as any).error;

            if (err || !data || !data.id) { // Check for valid data
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

                    // Try fetching as both drills and lessons since type info might be missing
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
                        setMoreSparring(videos.filter(v => v.id !== data.id));
                    }
                });
            }

            // Increment view count
            incrementSparringView(id);
        } catch (err: any) {
            console.error(err);
            setError(err.message || '영상 로딩 중 오류 발생');
        } finally {
            setLoading(false);
        }
    };

    const checkOwnership = async (videoData: SparringVideo) => {
        if (!contextUser) {
            // If free, everyone owns it
            if (!videoData.price || videoData.price === 0) setOwns(true);
            return;
        }

        // Creator always owns
        if (videoData.creatorId === contextUser.id) {
            setOwns(true);
            return;
        }

        // Free video
        if (!videoData.price || videoData.price === 0) {
            setOwns(true);
            return;
        }

        // Check purchase
        const { data } = await supabase
            .from('purchases')
            .select('id')
            .eq('user_id', contextUser.id)
            .eq('product_id', videoData.id)
            .eq('status', 'completed')
            .maybeSingle();

        if (data) setOwns(true);
        else setOwns(false);
    };

    const checkInteractions = async (videoData: SparringVideo) => {
        if (!contextUser) return;

        try {
            // Use API helper
            const status = await getSparringInteractionStatus(contextUser.id, videoData.id, videoData.creatorId);
            setLiked(status.liked);
            setSaved(status.saved);
            setIsFollowing(status.followed);
        } catch (e) {
            console.warn('Interaction check failed', e);
        }
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.stopPropagation();
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
        setLiked(!liked); // Optimistic

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
        setSaved(!saved); // Optimistic

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

    const togglePlayPause = () => {
        if (!owns) return;
        setIsPlaying(!isPlaying);
    };

    const toggleMute = () => {
        setMuted(!muted);
    };

    // Derived State
    const vimeoId = extractVimeoId(video?.videoUrl);
    const previewVimeoId = extractVimeoId(video?.previewVimeoId);

    const useVimeo = owns ? !!vimeoId : !!previewVimeoId;
    const currentVimeoId = owns ? vimeoId : previewVimeoId;

    useEffect(() => {
        if (!owns) {
            console.log('[DEBUG] SparringDetail Preview Check:', {
                videoId: video?.id,
                previewVimeoId,
                hasPreview: !!previewVimeoId,
                videoPreviewIdRaw: video?.previewVimeoId
            });
        }
    }, [owns, previewVimeoId, video]);

    const videoSrc = useVimeo
        ? `https://player.vimeo.com/video/${currentVimeoId}?autoplay=1&loop=1&autopause=0&muted=${muted ? 1 : 0}&controls=0&title=0&byline=0&portrait=0&badge=0&dnt=1`
        : (video?.videoUrl || '');

    // Effects
    useEffect(() => {
        if (useVimeo) {
            const iframe = iframeRef.current;
            if (iframe && iframe.contentWindow) {
                const message = isPlaying ? '{"method":"play"}' : '{"method":"pause"}';
                iframe.contentWindow.postMessage(message, '*');
            }
        } else {
            const vid = videoRef.current;
            if (vid && owns) {
                isPlaying ? vid.play().catch(() => { }) : vid.pause();
            }
        }
    }, [isPlaying, useVimeo, owns]);

    useEffect(() => {
        const vid = videoRef.current;
        if (!vid) return;

        const updateProgress = () => {
            const p = (vid.currentTime / vid.duration) * 100;
            setProgress(p);
        };
        vid.addEventListener('timeupdate', updateProgress);
        return () => vid.removeEventListener('timeupdate', updateProgress);
    }, []);

    if (loading) return <LoadingScreen message="스파링 영상 불러오는 중..." />;
    if (error || !video) return <ErrorScreen error={error || 'Video not found'} />;

    // Safe access to creatorName if missing from type definition (though it should be there in runtime)
    const creatorName = (video as any).creatorName || (video as any).creator?.name || 'Creator';

    return (
        <div className="fixed inset-0 z-50 w-screen h-screen bg-black overflow-hidden select-none">
            {/* Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 z-50">
                <div className="h-full bg-white transition-all duration-100" style={{ width: `${progress}%` }} />
            </div>

            {/* Back Button */}
            <div className="absolute top-0 left-0 z-[100] p-6">
                <button
                    onClick={() => navigate(-1)}
                    className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 hover:bg-black/60 transition-all shadow-xl"
                >
                    <ArrowLeft className="w-6 h-6" />
                </button>
            </div>

            {/* Click Overlay */}
            <div className="absolute inset-0 z-30" onClick={togglePlayPause} />

            {/* Video Container */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <div className="relative w-full h-full max-w-[56.25vh]">
                    {owns || useVimeo ? (
                        useVimeo ? (
                            <iframe
                                ref={iframeRef}
                                src={videoSrc}
                                className="absolute inset-0 w-full h-full"
                                frameBorder="0"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                                loop
                                playsInline
                                muted={muted}
                                autoPlay={isPlaying}
                                src={videoSrc}
                                onPlaying={() => setIsVideoReady(true)}
                                onLoadStart={() => setIsVideoReady(false)}
                            />
                        )
                    ) : (
                        <div className="w-full h-full relative group">
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
                    )}

                    {!owns && useVimeo && (
                        <div className="absolute top-20 left-0 right-0 z-50 flex justify-center pointer-events-none">
                            <span className="bg-violet-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-xl flex items-center gap-2">
                                <Play className="w-3 h-3 fill-current" /> 미리보기 시청 중
                            </span>
                        </div>
                    )}

                    {!owns && useVimeo && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 border border-white/10 shadow-2xl">
                                <Lock className="w-8 h-8 text-zinc-400" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">스파링 전체 시청하기</h3>
                            <p className="text-zinc-400 text-sm mb-8 max-w-[280px] font-medium">
                                이 스파링 영상의 뒷부분을 시청하시려면 단품으로 구매하거나 그랩플레이 멤버십을 구독하세요.
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

                    {/* Play Button Overlay */}
                    {owns && !isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-40">
                            <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="w-10 h-10 text-black ml-1" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side Actions */}
            <div className="absolute inset-0 pointer-events-none flex justify-center z-40">
                <div className="relative h-full w-full max-w-[56.25vh] flex">
                    <div className="flex-1"></div>
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-6 pointer-events-auto pr-4 md:pr-0 md:translate-x-full md:ml-4">
                        {/* Mute Toggle */}
                        <div className="flex flex-col gap-3 items-center">
                            <button
                                onClick={toggleMute}
                                className="p-3 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all"
                            >
                                {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                            </button>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-4 items-center pb-24 md:pb-0">
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={handleLike}
                                    className="p-3 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                                >
                                    <Heart className={`w-6 h-6 ${liked ? 'fill-violet-500 text-violet-500' : ''}`} />
                                </button>
                                <span className="text-xs font-medium text-zinc-200">{((video.likes || 0) + (liked ? 1 : 0)).toLocaleString()}</span>
                            </div>

                            <button
                                onClick={handleSave}
                                className="p-3 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                            >
                                <Bookmark className={`w-6 h-6 ${saved ? 'fill-zinc-100' : ''}`} />
                            </button>

                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="p-3 md:p-4 rounded-full bg-zinc-950/20 backdrop-blur-sm text-zinc-100 hover:bg-zinc-950/40 transition-all active:scale-90"
                            >
                                <Share2 className="w-6 h-6" />
                            </button>


                            {/* More Sparring Button */}
                            {moreSparring.length > 0 && (
                                <button
                                    onClick={() => setShowMoreSparring(true)}
                                    className="p-3 md:p-4 rounded-full bg-zinc-800/80 backdrop-blur-sm text-zinc-100 hover:bg-zinc-700 transition-all active:scale-90 mt-2 animate-in slide-in-from-right duration-500 delay-100"
                                >
                                    <LayoutGrid className="w-6 h-6" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
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


            {/* Bottom Info */}
            <div className="fixed left-0 right-0 w-full bottom-8 px-6 z-40 pointer-events-none">
                <div className="max-w-[56.25vh] mx-auto flex flex-col gap-4">
                    {/* LEARN THIS Cards (Horizontal Scroll) */}
                    {relatedDrills.length > 0 && (
                        <div className="w-full flex gap-3 overflow-x-auto no-scrollbar pointer-events-auto pb-2 -mx-2 px-2">
                            {relatedDrills.map((item: any) => {
                                const isDrill = item._type === 'drill';
                                const targetUrl = isDrill ? `/drills/${item.id}` : `/watch?tab=lesson&id=${item.id}`;

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

                    <div className="flex items-end justify-between pointer-events-auto">
                        <div className="flex-1 pr-16 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-xl">
                            <div className="flex flex-row items-center gap-2 mb-2">
                                <span className="font-bold text-sm text-white cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/creator/${video.creatorId}`); }}>
                                    {creatorName}
                                </span>
                                <span className="text-white/60 text-xs">•</span>
                                <button
                                    onClick={handleFollow}
                                    className={`px-2 py-0.5 rounded text-xs font-semibold border ${isFollowing ? 'border-white/20 bg-white/10 text-white/60' : 'border-white/40 bg-transparent text-white'}`}
                                >
                                    {isFollowing ? '팔로잉' : '팔로우'}
                                </button>
                            </div>
                            <h3 className="font-bold text-xl text-white mb-1 line-clamp-2">{video.title}</h3>
                            <p className="text-white/80 text-sm line-clamp-2">{video.description}</p>
                        </div>
                    </div>
                </div>

                {/* Share Modal */}
                {isShareModalOpen && (
                    <React.Suspense fallback={null}>
                        <ShareModal
                            isOpen={isShareModalOpen}
                            onClose={() => setIsShareModalOpen(false)}
                            title={video.title}
                            url={window.location.href}
                            text={`Check out this sparring video: ${video.title}`}
                        />
                    </React.Suspense>
                )}
            </div>
        </div>
    );
};
