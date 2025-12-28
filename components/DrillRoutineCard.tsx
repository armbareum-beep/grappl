import React from 'react';
import { Link } from 'react-router-dom';
import { DrillRoutine } from '../types';
import { PlayCircle } from 'lucide-react';

interface DrillRoutineCardProps {
    routine: DrillRoutine;
}

export const DrillRoutineCard: React.FC<DrillRoutineCardProps> = ({ routine }) => {
    return (
        <Link
            to={`/drill-routines/${routine.id}`}
            className="group block relative aspect-[9/16] bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800 hover:shadow-lg hover:shadow-black/50 hover:border-zinc-700 transition-all"
        >
            {/* Thumbnail */}
            <div className="absolute inset-0 bg-black">
                <img
                    src={routine.thumbnailUrl}
                    alt={routine.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 backdrop-blur-[2px]">
                    <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                        <PlayCircle className="w-8 h-8 text-white fill-white/20" />
                    </div>
                </div>

                {/* Content Overlay */}
                <div className="absolute bottom-4 left-4 right-4">
                    <h3 className="font-bold text-lg text-white leading-tight mb-1 line-clamp-2 text-shadow-sm">
                        {routine.title}
                    </h3>
                    <p className="text-sm text-zinc-400 font-medium text-shadow-sm">
                        {routine.creatorName}
                    </p>
                </div>
            </div>
        </Link>
    );
};
