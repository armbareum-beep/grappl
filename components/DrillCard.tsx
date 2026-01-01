import React from 'react';
import { Link } from 'react-router-dom';
import { Drill } from '../types';
import { PlayCircle, Clock } from 'lucide-react';

interface DrillCardProps {
    drill: Drill;
}

export const DrillCard: React.FC<DrillCardProps> = ({ drill }) => {
    return (
        <Link
            to={`/routines/${drill.id}`}
            className="group block relative overflow-hidden rounded-lg bg-slate-900 hover:ring-2 hover:ring-violet-500 transition-all duration-200"
            style={{ aspectRatio: '9/16' }}
        >
            {/* Thumbnail */}
            <div className="absolute inset-0">
                <img
                    src={drill.thumbnailUrl}
                    alt={drill.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            </div>

            {/* Play Icon Overlay */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <PlayCircle className="w-10 h-10 text-white" />
                </div>
            </div>

            {/* Content */}
            <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                {/* Duration Badge */}
                <div className="flex items-center gap-1 text-xs bg-black/50 backdrop-blur-sm rounded px-2 py-1 w-fit mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{drill.duration}</span>
                </div>

                {/* Title */}
                <h3 className="font-bold text-sm line-clamp-2 mb-1">{drill.title}</h3>

                {/* Creator & Price */}
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{drill.creatorName}</span>
                    <span className="font-semibold">₩{drill.price.toLocaleString()}</span>
                </div>

                {/* Category & Difficulty */}
                <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="bg-violet-600/80 px-2 py-0.5 rounded text-white font-bold">{drill.category}</span>
                    <span className="bg-slate-700/80 px-2 py-0.5 rounded">
                        {drill.difficulty === 'Beginner' ? '초급' : drill.difficulty === 'Intermediate' ? '중급' : '상급'}
                    </span>
                </div>
            </div>

            {/* Views */}
            <div className="absolute top-2 right-2 text-xs text-white bg-black/50 backdrop-blur-sm rounded px-2 py-1">
                {drill.views.toLocaleString()} views
            </div>
        </Link>
    );
};
