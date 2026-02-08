import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SparringVideo } from '../../types';
import { Bookmark, Share2, MoreHorizontal, PlayCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ContentBadge } from '../common/ContentBadge';
import { cn } from '../../lib/utils';
import { ActionMenuModal } from './ActionMenuModal';

const ShareModal = React.lazy(() => import('../social/ShareModal'));

export const SparringGridItem: React.FC<{
    video: SparringVideo;
    idx: number;
    setActiveIndex: (idx: number) => void;
    setViewMode: (mode: 'reels' | 'grid') => void;
}> = ({ video, idx, setActiveIndex, setViewMode }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const itemRef = useRef<HTMLDivElement>(null);
    const [searchParams] = useSearchParams();
    const isTarget = searchParams.get('id') === video.id;

    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    useEffect(() => {
        if (user) {
            import('../../lib/api').then(({ checkSparringSaved }) => {
                checkSparringSaved(user.id, video.id).then(setIsSaved).catch(() => { });
            });
        }
    }, [user?.id, video.id]);

    useEffect(() => {
        if (isTarget && itemRef.current) {
            setTimeout(() => {
                itemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 600);
        }
    }, [isTarget]);

    const handleSave = async () => {
        if (!user) { navigate('/login'); return; }
        const newStatus = !isSaved;
        setIsSaved(newStatus);
        try {
            const { toggleSparringSave } = await import('../../lib/api');
            await toggleSparringSave(user.id, video.id);
        } catch {
            setIsSaved(!newStatus);
        }
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    return (
        <div
            ref={itemRef}
            className={cn(
                "group cursor-pointer rounded-2xl transition-all duration-500",
                isTarget ? "ring-2 ring-violet-500 ring-offset-4 ring-offset-zinc-950 p-1 bg-violet-500/10 shadow-[0_0_30px_rgba(124,58,237,0.4)] scale-[1.02]" : ""
            )}
            onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                setActiveIndex(idx);
                setViewMode('reels');
            }}
        >
            <div className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:ring-1 hover:ring-violet-500/30">
                <Link to={`?view=reels&id=${video.id}`} className="absolute inset-0 block" onClick={(e) => {
                    e.preventDefault();
                    setActiveIndex(idx);
                    setViewMode('reels');
                }}>
                    <img
                        src={video.thumbnailUrl || (video.videoUrl && !video.videoUrl.startsWith('http') ? `https://vumbnail.com/${video.videoUrl}.jpg` : '')}
                        alt={video.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                    />

                    <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                        {video.isDailyFree ? (
                            <ContentBadge type="daily_free" />
                        ) : video.rank ? (
                            <ContentBadge type="popular" rank={video.rank} />
                        ) : (video.createdAt && new Date(video.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                            <ContentBadge type="recent" />
                        ) : null}
                    </div>

                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                    <button
                        className={cn(
                            "absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white",
                            isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                        )}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSave(); }}
                        aria-label="저장"
                    >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-violet-500")} />
                    </button>

                    <button
                        className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
                        aria-label="공유"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>

                    {video.category && (
                        <div className="absolute bottom-2.5 left-2.5 z-10 pointer-events-none">
                            <div className={cn(
                                "inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm",
                                video.category === 'Competition'
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                            )}>
                                {video.category === 'Competition' ? 'COMPETITION' : 'SPARRING'}
                            </div>
                        </div>
                    )}
                </Link>
            </div>

            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={video.title}
                        text={`${video.creator?.name}님의 스파링 영상을 확인해보세요`}
                        imageUrl={video.thumbnailUrl}
                        url={`${window.location.origin}/sparring?id=${video.id}`}
                    />
                )}
            </React.Suspense>

            <div className="flex gap-3 px-1">
                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex justify-between items-start gap-2">
                        <div
                            onClick={(e) => {
                                e.preventDefault();
                                setActiveIndex(idx);
                                setViewMode('reels');
                            }}
                            className="flex-1 min-w-0 cursor-pointer"
                        >
                            <h3 className="text-zinc-100 font-bold text-sm md:text-base leading-none mb-0 line-clamp-2 group-hover:text-violet-400 transition-colors">
                                {video.title}
                            </h3>
                        </div>
                        <button
                            className="shrink-0 p-1 -mr-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors opacity-100"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsActionMenuOpen(true);
                            }}
                            aria-label="더보기"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between gap-4 mt-0">
                        <Link to={`/creator/${video.creatorId}`} className="text-xs md:text-sm text-zinc-400 font-medium truncate hover:text-zinc-200 transition-colors" onClick={e => e.stopPropagation()}>
                            {video.creator?.name || 'Unknown'}
                        </Link>

                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                            <PlayCircle className="w-3 h-3" />
                            <span>{video.views || 0} Views</span>
                        </div>
                    </div>
                </div>
            </div>

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                item={{
                    id: video.id,
                    type: 'sparring',
                    title: video.title,
                    thumbnailUrl: video.thumbnailUrl,
                    creatorName: video.creator?.name,
                    creatorProfileImage: video.creator?.profileImage,
                    creatorId: video.creatorId,
                    originalData: video,
                    views: video.views
                } as any}
                isSaved={isSaved}
                onSave={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    handleSave();
                }}
                onShare={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    handleShare();
                }}
            />
        </div>
    );
};
