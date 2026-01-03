import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Clock, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecentActivityItem {
    id: string;
    courseId?: string;
    type: 'lesson' | 'course' | 'routine' | 'sparring';
    title: string;
    courseTitle?: string;
    thumbnail?: string;
    progress: number;
    watchedSeconds?: number;
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
                    <p className="font-medium text-center">최근 시청한 기록이 없습니다. <br />새로운 기술을 배워보세요!</p>
                </div>
            </section>
        )
    }

    const handleItemClick = (item: RecentActivityItem) => {
        if (item.type === 'lesson') {
            // Navigate to course detail and pass lesson ID + watched seconds
            navigate(`/courses/${item.courseId}?lessonId=${item.id}&t=${item.watchedSeconds || 0}`);
        } else if (item.type === 'course') {
            navigate(`/courses/${item.id}`);
        } else if (item.type === 'routine') {
            navigate(`/routines/${item.id}`);
        } else if (item.type === 'sparring') {
            navigate('/sparring', { state: { highlightVideoId: item.id } });
        }
    };

    return (
        <section className="px-6 md:px-12 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-gradient-to-b from-violet-500 to-fuchsia-500 rounded-full" />
                    <div className="flex flex-col">
                        <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                            다시 뛰어들기
                        </h2>
                        <span className="text-sm font-medium text-zinc-500 mt-1 font-sans">멈췄던 곳에서 수련을 이어가세요.</span>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/my-library')}
                    className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-800 transition-all"
                >
                    <span className="text-xs font-bold text-zinc-400 group-hover:text-white uppercase tracking-wider">View All</span>
                    <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-violet-400 transition-colors" />
                </button>
            </div>

            {/* Horizontal Scroll Area */}
            <div className="relative group/scroll">
                <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-none snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {activities.map((item, index) => (
                        <motion.div
                            key={`${item.id}-${index}`}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex-none w-[280px] md:w-[320px] snap-start"
                        >
                            <div
                                className="group relative flex flex-col cursor-pointer"
                                onClick={() => handleItemClick(item)}
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

                                    {/* Type Badge */}
                                    <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest">
                                        {item.type}
                                    </div>

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
                                </div>

                                {/* Meta Info */}
                                <div className="mt-4 px-1">
                                    <div>
                                        <h3 className="text-base font-bold text-white leading-snug line-clamp-1 group-hover:text-violet-400 transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className="text-xs font-medium text-zinc-500 line-clamp-1">
                                                {item.courseTitle || 'Season 1: Fundamentals'}
                                            </p>
                                            {item.lessonNumber && (
                                                <span className="text-[10px] font-bold text-violet-400">
                                                    Lesson {item.lessonNumber}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}

                    {/* Spacer for horizontal scroll ending */}
                    <div className="flex-none w-4" />
                </div>
            </div>
        </section>
    );
};
