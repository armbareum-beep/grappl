import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, ChevronRight, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentActivityItem {
    id: string;
    type: 'lesson' | 'course' | 'routine';
    title: string;
    courseTitle?: string;
    thumbnail?: string;
    progress: number;
    lastWatched: string;
    lessonNumber?: number;
}

interface RecentActivitySectionProps {
    activities: RecentActivityItem[];
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({ activities }) => {
    const navigate = useNavigate();

    if (!activities || activities.length === 0) {
        return (
            <section className="px-6 md:px-12 max-w-7xl mx-auto pb-12">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-8 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
                    <h2 className="text-2xl font-black text-white tracking-tight">최근 시청한 콘텐츠</h2>
                </div>
                <div className="w-full py-16 rounded-[32px] border border-dashed border-zinc-800 bg-zinc-900/20 flex flex-col items-center justify-center text-zinc-500">
                    <Clock className="w-12 h-12 mb-4 opacity-50" />
                    <p className="font-medium">최근 시청한 기록이 없습니다. <br />새로운 기술을 배워보세요!</p>
                </div>
            </section>
        )
    }

    return (
        <section className="px-6 md:px-12 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                        다시 뛰어들기
                        <span className="block text-sm font-medium text-zinc-500 mt-1 font-sans">멈췄던 곳에서 수련을 이어가세요.</span>
                    </h2>
                </div>
                <button
                    onClick={() => navigate('/my-library')}
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800 transition-all"
                >
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">View All</span>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {activities.slice(0, 4).map((item, index) => (
                    <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="group relative flex flex-col cursor-pointer"
                        onClick={() => navigate(item.type === 'course' ? `/courses/${item.id}` : `/courses/${item.id}`)}
                    >
                        {/* Thumbnail Container */}
                        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-zinc-900 shadow-2xl transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.3)] group-hover:ring-2 ring-violet-500/50">
                            {item.thumbnail ? (
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                                    <Play className="h-10 w-10 text-zinc-600" />
                                </div>
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />

                            {/* Centered Play Button (Hover) */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 scale-90 group-hover:scale-100">
                                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                                    <Play className="w-6 h-6 text-white fill-current ml-1" />
                                </div>
                            </div>

                            {/* Progress Bar (Bottom) */}
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800/50 backdrop-blur-sm">
                                <div
                                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(167,139,250,0.5)]"
                                    style={{ width: `${item.progress}%` }}
                                />
                            </div>

                            {/* Duration Badge */}
                            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                                12:40
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="mt-4 px-1">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h3 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-violet-400 transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs font-medium text-zinc-500 mt-1 line-clamp-1">
                                        {item.courseTitle || 'Season 1: Fundamentals'}
                                    </p>
                                </div>
                                <button className="p-1 -mr-2 text-zinc-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};
