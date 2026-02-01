import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Target, PlayCircle, ArrowRight } from 'lucide-react';
import { SparringVideo } from '../../types';
import { ContentBadge } from '../common/ContentBadge';

interface TrendingSporringSectionProps {
    videos: SparringVideo[];
    title?: string;
    subtitle?: string;
    showRank?: boolean;
    hideHeader?: boolean;
    hideBadges?: boolean;
}

export const TrendingSparringSection: React.FC<TrendingSporringSectionProps> = ({
    videos,
    title = "인기 스파링",
    subtitle = "인기 스파링 영상을 분석해보세요.",
    hideHeader = false,
    hideBadges = false
}) => {
    const navigate = useNavigate();

    if (!videos || videos.length === 0) return null;

    return (
        <section className={`px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto ${hideHeader ? '' : 'mb-20'}`}>
            {!hideHeader && (
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                            <Target className="w-5 h-5 text-violet-500" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white leading-none mb-1">{title}</h2>
                            <p className="text-sm text-zinc-500 font-medium">{subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/sparring')}
                        className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                    >
                        모두 보기 <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                {videos.map((video) => (
                    <div
                        key={video.id}
                        onClick={() => navigate('/sparring', { state: { highlightVideoId: video.id } })}
                        className="group cursor-pointer"
                    >
                        {/* Thumbnail Card */}
                        <div className="relative bg-zinc-900 rounded-2xl overflow-hidden mb-3 aspect-square transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] group-hover:ring-1 group-hover:ring-violet-500/30">
                            {video.thumbnailUrl ? (
                                <img
                                    src={video.thumbnailUrl}
                                    alt={video.title}
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold text-xs uppercase">No Image</div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                            {/* Badges */}
                            {!hideBadges && (
                                <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
                                    {video.isDailyFree && (
                                        <ContentBadge type="daily_free" />
                                    )}
                                    <div className="ml-auto">
                                        {video.rank ? (
                                            <ContentBadge type="popular" rank={video.rank} />
                                        ) : (video.createdAt && new Date(video.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                                            <ContentBadge type="recent" />
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* Play Mini Icon */}
                            <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                <PlayCircle className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Text Info */}
                        <div className="flex gap-2.5 px-1">
                            <Link
                                to={`/creator/${video.creatorId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="shrink-0 pt-0.5"
                            >
                                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden hover:border-violet-500/50 transition-colors">
                                    {(video.creatorProfileImage || video.creator?.profileImage) ? (
                                        <img src={video.creatorProfileImage || video.creator?.profileImage} alt={video.creator?.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                            {video.creator?.name?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-zinc-100 text-sm md:text-base font-bold line-clamp-2 leading-snug mb-1 group-hover:text-violet-400 transition-colors">
                                    {video.title}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <Link
                                        to={`/creator/${video.creatorId}`}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-zinc-500 text-xs font-medium truncate max-w-[60%] hover:text-zinc-300 transition-colors"
                                    >
                                        {video.creator?.name || 'Unknown'}
                                    </Link>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        {video.category || 'Sparring'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
