import React from 'react';
import { DrillRoutine } from '../../types';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, List, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RoutineReelItemProps {
    routine: DrillRoutine;
    isActive: boolean;
    offset: number;
}

export const RoutineReelItem: React.FC<RoutineReelItemProps> = ({ routine, isActive, offset }) => {
    const navigate = useNavigate();

    return (
        <div
            className="absolute inset-0 w-full h-full bg-black overflow-hidden select-none transition-transform duration-300 ease-out will-change-transform"
            style={{ transform: `translateY(${offset * 100}%)`, zIndex: isActive ? 10 : 0 }}
        >
            {/* Background Image */}
            {routine.thumbnailUrl ? (
                <img src={routine.thumbnailUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" alt={routine.title} />
            ) : (
                <div className="absolute inset-0 w-full h-full bg-zinc-900" />
            )}

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/90" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />

            {/* Content */}
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-12 pb-24 md:pb-32 flex flex-col items-start text-white">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full text-xs font-bold uppercase mb-4 shadow-lg shadow-violet-900/50 border border-white/10">
                    <List size={14} />
                    <span>Routine</span>
                    {routine.drillCount && (
                        <>
                            <span className="w-1 h-1 bg-white/50 rounded-full mx-0.5" />
                            <span>{routine.drillCount} Drills</span>
                        </>
                    )}
                </div>

                <h2 className="text-3xl md:text-5xl font-black mb-3 leading-tight drop-shadow-xl">{routine.title}</h2>
                <p className="text-zinc-300 line-clamp-3 mb-8 max-w-xl text-sm md:text-base drop-shadow-md leading-relaxed">
                    {routine.description}
                </p>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 w-full">
                    <button
                        onClick={() => navigate(`/routines/${routine.id}`)}
                        className="group flex items-center gap-3 px-8 py-4 bg-white text-black font-bold rounded-full hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                    >
                        <PlayCircle className="fill-black text-white w-6 h-6 group-hover:scale-110 transition-transform" />
                        <span className="text-base tracking-wide">Start Routine</span>
                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-1 transition-transform" />
                    </button>

                    {routine.creatorId && (
                        <Link to={`/creator/${routine.creatorId}`} className="flex items-center gap-3 group backdrop-blur-sm bg-white/5 pr-4 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                            <img
                                src={routine.creatorProfileImage || `https://ui-avatars.com/api/?name=${routine.creatorName}`}
                                className="w-12 h-12 rounded-full border-2 border-white/20 group-hover:border-violet-500 transition-colors object-cover"
                                alt={routine.creatorName}
                            />
                            <div className="flex flex-col">
                                <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Created By</span>
                                <span className="font-bold text-white group-hover:text-violet-300 transition-colors">{routine.creatorName || 'Instructor'}</span>
                            </div>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
