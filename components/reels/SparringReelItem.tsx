import React, { useEffect, useState, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SparringVideo } from '../../types';
import { Play } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { extractVimeoId } from '../../lib/api';
import { BaseReelItem } from './BaseReelItem';

interface SparringReelItemProps {
    video: SparringVideo;
    isActive: boolean;
    offset: number;
    isSubscriber?: boolean;
    purchasedItemIds?: string[];
    isLoggedIn?: boolean;
    isDailyFreeSparring?: boolean;
    dailyFreeId?: string;
    isMuted?: boolean;
    onToggleMute?: () => void;
    onVideoReady?: () => void;
}

export const SparringReelItem: React.FC<SparringReelItemProps> = memo(({
    video,
    isActive,
    offset,
    isSubscriber,
    purchasedItemIds = [],
    isLoggedIn = false,
    isDailyFreeSparring: isDailyFreeSparringProp = false,
    dailyFreeId,
    isMuted = false,
    onToggleMute = () => { },
    onVideoReady
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowed, setIsFollowed] = useState(false);
    const [localLikes, setLocalLikes] = useState(video.likes || 0);
    const isPausedRef = useRef(false);

    // Compute processing/error states
    const vimeoFullId = extractVimeoId(video.videoUrl);
    const isVideoError = !!(video.videoUrl && (video.videoUrl.startsWith('ERROR:') || video.videoUrl === 'error'));
    const isVideoProcessing = !!(vimeoFullId && !isVideoError && !video.thumbnailUrl);

    // Access Control
    const isDailyFreeSparring = isDailyFreeSparringProp || (dailyFreeId && dailyFreeId === video.id);
    const videoPrice = Number(video.price || 0);
    const hasAccess = isDailyFreeSparring || videoPrice === 0 || (isLoggedIn && (isSubscriber || purchasedItemIds.includes(video.id)));

    // Interaction status
    useEffect(() => {
        if (isActive && user && video.creatorId) {
            import('../../lib/api').then(({ getSparringInteractionStatus }) => {
                getSparringInteractionStatus(user.id, video.id, video.creatorId)
                    .then(status => {
                        setIsFollowed(status.followed);
                        setIsLiked(status.liked);
                        setIsSaved(status.saved);
                    })
                    .catch(console.error);
            });
        }
    }, [user?.id, video.id, video.creatorId, isActive]);

    // Record View History
    useEffect(() => {
        if (isActive && user && video.id) {
            import('../../lib/api').then(({ recordSparringView }) => {
                recordSparringView(video.id).catch(console.error);
            });
        }
    }, [isActive, user?.id, video.id]);

    // Watch time tracking for settlement (Keep existing logic)
    useEffect(() => {
        if (!isActive || !user || !isSubscriber || !video.id || purchasedItemIds.includes(video.id)) {
            return;
        }

        let lastTick = Date.now();
        let accumulated = 0;

        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = (now - lastTick) / 1000;
            lastTick = now;

            if (elapsed > 0 && elapsed < 5 && !isPausedRef.current) {
                accumulated += elapsed;
            }

            if (accumulated >= 10) {
                const send = Math.floor(accumulated);
                accumulated -= send;
                import('../../lib/api').then(({ recordWatchTime }) => {
                    recordWatchTime(user.id, send, video.id).catch(console.error);
                });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isActive, user?.id, isSubscriber, video.id, purchasedItemIds]);

    const handleLike = async () => {
        if (!user) { navigate('/login'); return; }
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLocalLikes(prev => newStatus ? prev + 1 : Math.max(0, prev - 1));
        try {
            const { toggleSparringLike } = await import('../../lib/api');
            const result = await toggleSparringLike(user.id, video.id);
            setIsLiked(result.liked);
        } catch (error) {
            console.error('Like failed', error);
            setIsLiked(!newStatus);
            setLocalLikes(prev => !newStatus ? prev + 1 : Math.max(0, prev - 1));
        }
    };

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }
        const newStatus = !isSaved;
        setIsSaved(newStatus);
        try {
            const { toggleSparringSave } = await import('../../lib/api');
            const result = await toggleSparringSave(user.id, video.id);
            setIsSaved(result.saved);
        } catch (error) {
            console.error('Save failed', error);
            setIsSaved(!newStatus);
        }
    };

    const handleFollow = async () => {
        if (!user) { navigate('/login'); return; }
        if (!video.creatorId) return;
        setIsFollowed(!isFollowed);
        try {
            const { toggleCreatorFollow } = await import('../../lib/api');
            const result = await toggleCreatorFollow(user.id, video.creatorId);
            setIsFollowed(result.followed);
        } catch (error) {
            console.error('Follow failed', error);
            setIsFollowed(!isFollowed);
        }
    };

    if (isVideoError) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 text-white p-4" style={{ transform: `translateY(${offset * 100}%)` }}>
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-xl font-bold mb-2">영상 처리 실패</h3>
                <p className="text-sm text-center text-zinc-400 max-w-xs break-all">
                    {video.videoUrl.replace('ERROR:', '').trim()}
                </p>
            </div>
        );
    }

    if (isVideoProcessing) {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900/80 backdrop-blur-md text-white p-6 z-50" style={{ transform: `translateY(${offset * 100}%)` }}>
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 rounded-full border-4 border-violet-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-8 h-8 text-violet-500" />
                    </div>
                </div>
                <h3 className="text-2xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">영상을 처리 중입니다</h3>
                <p className="text-base text-center text-zinc-400 max-w-xs leading-relaxed">Vimeo에서 고화질 인코딩을 진행하고 있습니다.</p>
            </div>
        );
    }

    return (
        <BaseReelItem
            id={video.id}
            type="sparring"
            title={video.title}
            videoUrl={vimeoFullId || video.videoUrl || ''}
            thumbnailUrl={video.thumbnailUrl}
            creatorId={video.creator?.id}
            creatorName={video.creator?.name}
            creatorProfileImage={(video.creator as any)?.avatar_url || (video.creator as any)?.image || (video.creator as any)?.profileImage}
            isActive={isActive}
            offset={offset}
            isLiked={isLiked}
            likeCount={localLikes}
            onLike={handleLike}
            isSaved={isSaved}
            onSave={handleSave}
            isFollowed={isFollowed}
            onFollow={handleFollow}
            isMuted={isMuted}
            onToggleMute={onToggleMute}
            hasAccess={hasAccess}
            isLoggedIn={isLoggedIn}
            redirectUrl={`/watch?tab=sparring&id=${video.id}`}
            shareText={`${video.creator?.name}님의 스파링 영상을 확인해보세요`}
            aspectRatio="square"
            onVideoReady={onVideoReady}
            onPauseChange={(p) => { isPausedRef.current = p; }}
            maxPreviewDuration={60}
            renderFooterInfo={() => (
                <>
                    {video.category && (
                        <div className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border mb-2 ${video.category === 'Competition'
                            ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                            {video.category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                        </div>
                    )}
                    {video.description && (
                        <p className="text-xs md:text-base text-white/70 line-clamp-2 max-w-xl font-medium drop-shadow-md mt-1">{video.description}</p>
                    )}
                </>
            )}
        />
    );
}, (prevProps, nextProps) => {
    // Only re-render if these critical props change
    return (
        prevProps.video.id === nextProps.video.id &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.offset === nextProps.offset &&
        prevProps.isMuted === nextProps.isMuted &&
        prevProps.isDailyFreeSparring === nextProps.isDailyFreeSparring &&
        prevProps.isSubscriber === nextProps.isSubscriber
    );
});
