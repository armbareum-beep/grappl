import React from 'react';
import { Link } from 'react-router-dom';
import { DrillRoutine } from '../types';
import { PlayCircle, List } from 'lucide-react';

interface DrillRoutineCardProps {
    routine: DrillRoutine;
}

export const DrillRoutineCard: React.FC<DrillRoutineCardProps> = ({ routine }) => {
    return (
        <Link
            to={`/drill-routines/${routine.id}`}
            className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-blue-500 transition-all duration-200"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden bg-slate-900">
                <img
                    src={routine.thumbnailUrl}
                    alt={routine.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <PlayCircle className="w-10 h-10 text-white" />
                    </div>
                </div>

                {/* Drill Count Badge */}
                <div className="absolute top-3 right-3 flex items-center gap-1 text-xs bg-black/70 backdrop-blur-sm text-white rounded-full px-3 py-1.5">
                    <List className="w-3.5 h-3.5" />
                    <span className="font-semibold">{routine.drillCount || 0}개 드릴</span>
                </div>

                {/* Views */}
                <div className="absolute bottom-3 left-3 text-xs text-white bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                    {routine.views.toLocaleString()} views
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Title */}
                <h3 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2">
                    {routine.title}
                </h3>

                {/* Description */}
                {routine.description && (
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                        {routine.description}
                    </p>
                )}

                {/* Creator & Price */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm text-slate-600">{routine.creatorName}</span>
                    <span className="font-bold text-lg text-blue-600">
                        ₩{routine.price.toLocaleString()}
                    </span>
                </div>
            </div>
        </Link>
    );
};
