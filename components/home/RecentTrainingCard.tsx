import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Calendar } from 'lucide-react';
import { CompletedRoutineRecord } from '../../types';

interface RecentTrainingCardProps {
    routine: CompletedRoutineRecord;
}

export const RecentTrainingCard: React.FC<RecentTrainingCardProps> = ({ routine }) => {
    const navigate = useNavigate();

    return (
        <div
            onClick={() => navigate(`/routines/${routine.routineId}`)}
            className="group flex flex-col gap-3 w-[160px] md:w-[180px] flex-shrink-0 cursor-pointer"
        >
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-[#121215] transition-all duration-300 group-hover:scale-[1.03]">
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-90"
                    style={{
                        backgroundImage: routine.routineThumbnail ? `url(${routine.routineThumbnail})` : undefined
                    }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                <div className="absolute top-2 left-2 z-10">
                    <span className="px-2 py-0.5 text-[8px] font-bold rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 flex items-center gap-1 uppercase tracking-widest backdrop-blur-md w-fit">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Done
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-1 px-0.5">
                <h3 className="text-sm font-bold text-white leading-tight group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {routine.routineTitle}
                </h3>

                <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-500">
                    <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-zinc-600" />
                        {routine.durationMinutes ? Math.floor(routine.durationMinutes) : 0}분
                    </span>
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        {new Date(routine.completedAt).toLocaleDateString()}
                    </span>
                </div>
            </div>
        </div>
    );
};
