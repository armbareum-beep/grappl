import React from 'react';
import { Lock, Clock, PlayCircle } from 'lucide-react';
import { DrillRoutine } from '../types';

interface DrillRoutineGridProps {
    routines: DrillRoutine[];
    onRoutineClick: (routine: DrillRoutine) => void;
    purchasedRoutineIds: string[];
}

export const DrillRoutineGrid: React.FC<DrillRoutineGridProps> = ({
    routines,
    onRoutineClick,
    purchasedRoutineIds
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {routines.map(routine => {
                const isOwned = purchasedRoutineIds.includes(routine.id);

                return (
                    <div
                        key={routine.id}
                        onClick={() => onRoutineClick(routine)}
                        className="group cursor-pointer relative aspect-square rounded-2xl overflow-hidden bg-slate-100 shadow-sm hover:shadow-xl transition-all duration-300"
                    >
                        {/* Thumbnail Image */}
                        <img
                            src={routine.thumbnailUrl || 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
                            alt={routine.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-90" />

                        {/* Lock Icon for unowned content */}
                        {!isOwned && (
                            <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md p-2 rounded-full">
                                <Lock className="w-5 h-5 text-white/90" />
                            </div>
                        )}

                        {/* Content Info */}
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${routine.difficulty === 'Beginner' ? 'bg-green-500/80' :
                                    routine.difficulty === 'Intermediate' ? 'bg-blue-500/80' :
                                        'bg-purple-500/80'
                                    }`}>
                                    {routine.difficulty === 'Beginner' ? '초급' :
                                        routine.difficulty === 'Intermediate' ? '중급' : '상급'}
                                </span>
                                <span className="text-xs font-medium text-white/80 bg-white/20 px-2 py-1 rounded backdrop-blur-sm">
                                    {routine.category || 'General'}
                                </span>
                            </div>

                            <h3 className="text-xl font-bold mb-2 leading-tight group-hover:text-blue-300 transition-colors">
                                {routine.title}
                            </h3>

                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20">
                                <div className="flex items-center gap-4 text-sm text-white/80">
                                    <div className="flex items-center gap-1">
                                        <PlayCircle className="w-4 h-4" />
                                        <span>{(routine.views || 0).toLocaleString()} 조회수</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        <span>{routine.totalDurationMinutes || 0}분</span>
                                    </div>
                                </div>

                                {!isOwned && (
                                    <div className="font-bold text-lg text-blue-300">
                                        ₩{(routine.price / 1000).toFixed(0)}K
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
