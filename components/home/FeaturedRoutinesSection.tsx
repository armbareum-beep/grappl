import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, PlayCircle, ArrowRight } from 'lucide-react';
import { DrillRoutine } from '../../types';
import { cn } from '../../lib/utils';

interface FeaturedRoutinesSectionProps {
    routines: DrillRoutine[];
}

export const FeaturedRoutinesSection: React.FC<FeaturedRoutinesSectionProps> = ({ routines }) => {
    const navigate = useNavigate();

    if (!routines || routines.length === 0) return null;

    return (
        <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <LayoutGrid className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white leading-none mb-1">Featured Routines</h2>
                        <p className="text-sm text-zinc-500 font-medium">체계적인 드릴 루틴으로 실력을 향상시키세요.</p>
                    </div>
                </div>
                <button
                    onClick={() => navigate('/library?tab=routines')}
                    className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-white transition-colors"
                >
                    View All <ArrowRight className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {routines.map((routine) => (
                    <div
                        key={routine.id}
                        onClick={() => navigate(`/drill-routines/${routine.id}`)}
                        className="group cursor-pointer"
                    >
                        {/* Thumbnail Card */}
                        <div className={cn(
                            "relative bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] group-hover:ring-1 group-hover:ring-violet-500/30",
                            "aspect-[4/5]"
                        )}>
                            {routine.thumbnailUrl ? (
                                <img
                                    src={routine.thumbnailUrl}
                                    alt={routine.title}
                                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold text-xs uppercase">No Image</div>
                            )}

                            {/* Gradient Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                            {/* Play Mini Icon */}
                            <div className="absolute top-3 right-3 text-white/30 group-hover:text-violet-400 transition-colors">
                                <PlayCircle className="w-5 h-5" />
                            </div>

                            {/* Duration Badge */}
                            <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-bold text-white border border-white/10 group-hover:border-violet-500/50 transition-colors">
                                {routine.durationMinutes || 10} min
                            </div>
                        </div>

                        {/* Text Info */}
                        <div className="px-1">
                            <h3 className="text-zinc-100 text-sm md:text-base font-bold line-clamp-2 leading-snug mb-1 group-hover:text-violet-400 transition-colors">
                                {routine.title}
                            </h3>
                            <div className="flex items-center justify-between mt-2">
                                <p className="text-zinc-500 text-xs font-medium truncate max-w-[60%]">{routine.creatorName || 'Unknown'}</p>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                    {routine.difficulty || 'Beginner'}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};
