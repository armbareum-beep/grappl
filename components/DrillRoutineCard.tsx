import React from 'react';
import { Link } from 'react-router-dom';
import { DrillRoutine } from '../types';
import { PlayCircle } from 'lucide-react';
import { ContentBadge } from './common/ContentBadge';

interface DrillRoutineCardProps {
    routine: DrillRoutine;
    rank?: number;
}

export const DrillRoutineCard: React.FC<DrillRoutineCardProps> = ({ routine, rank }) => {
    return (
        <div className="group flex flex-col gap-3 transition-transform duration-300 hover:-translate-y-1">
            {/* Thumbnail */}
            <Link
                to={`/drill-routines/${routine.id}`}
                className="relative aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 group-hover:border-zinc-700 transition-all"
            >
                <img
                    src={routine.thumbnailUrl}
                    alt={routine.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                        <PlayCircle className="w-8 h-8 text-white fill-white/20" />
                    </div>
                </div>
                {(rank) ? (
                    <ContentBadge type="popular" rank={rank} className="absolute top-2 right-2" />
                ) : (routine.createdAt && new Date(routine.createdAt).getTime() > Date.now() - (30 * 24 * 60 * 60 * 1000)) ? (
                    <ContentBadge type="recent" className="absolute top-2 right-2" />
                ) : null}
            </Link>

            {/* Information Area */}
            <div className="px-1">
                <Link to={`/drill-routines/${routine.id}`}>
                    <h3 className="font-bold text-zinc-100 text-sm md:text-base leading-tight mb-1 line-clamp-1 group-hover:text-violet-400 transition-colors">
                        {routine.title}
                    </h3>
                </Link>
                <p className="text-zinc-500 text-[11px] md:text-xs font-medium">
                    {routine.creatorName}
                </p>
            </div>
        </div>
    );
};
