import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, PlayCircle, ArrowRight, Trophy } from 'lucide-react';
import { SparringVideo } from '../../types';

interface TrendingSporringSectionProps {
    videos: SparringVideo[];
}

export const TrendingSparringSection: React.FC<TrendingSporringSectionProps> = ({ videos }) => {
    const navigate = useNavigate();

    if (!videos || videos.length === 0) return null;

    return (
        <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <Target className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white leading-none mb-1">인기 스파링</h2>
                        <p className="text-sm text-zinc-500 font-medium">인기 스파링 영상을 분석해보세요.</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/sparring')}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                    모두 보기 <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-6">
                {videos.map((video, index) => (
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

                            {/* Play Mini Icon */}
                            <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                <PlayCircle className="w-5 h-5" />
                            </div>

                            {/* Rank Badge (Top 3) */}
                            {index < 3 && (
                                <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                                    <Trophy className="w-4 h-4 text-white fill-white" />
                                </div>
                            )}

                            {/* Stats */}
                            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-[10px] font-bold text-white">
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                                    👁️ {video.views || 0}
                                </span>
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-md border border-white/10">
                                    ❤️ {video.likes || 0}
                                </span>
                            </div>
                        </div>

                        {/* Text Info */}
                        <div className="px-1">
                            <h3 className="text-zinc-100 text-sm md:text-base font-bold line-clamp-2 leading-snug mb-1 group-hover:text-violet-400 transition-colors">
                                {video.title}
                            </h3>
                            <p className="text-zinc-500 text-xs font-medium truncate">{video.creator?.name || 'Unknown'}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
