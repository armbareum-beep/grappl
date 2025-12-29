import React, { useState, useEffect } from 'react';
import { DrillRoutine } from '../../types';
import { Calendar, Trash2, Clock } from 'lucide-react';

interface WeeklySchedule {
    [key: string]: DrillRoutine[];
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

interface WeeklyRoutinePlannerProps {
    selectedRoutine?: DrillRoutine | null;
    onAddToDay?: (day: string) => void;
    selectedDay?: string | null;
    onSelectDay?: (day: string) => void;
}

export const WeeklyRoutinePlanner: React.FC<WeeklyRoutinePlannerProps> = ({
    selectedRoutine,
    onAddToDay,
    selectedDay,
    onSelectDay
}) => {
    const [schedule, setSchedule] = useState<WeeklySchedule>({
        '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': []
    });

    useEffect(() => {
        const saved = localStorage.getItem('weekly_routine_schedule');
        if (saved) {
            try {
                setSchedule(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load schedule', e);
            }
        }
    }, []);

    // Listen for external updates to the schedule (e.g. from TrainingRoutinesTab)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('weekly_routine_schedule');
            if (saved) {
                try {
                    setSchedule(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to load schedule', e);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        // Custom event for same-window updates
        window.addEventListener('weekly_schedule_update', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('weekly_schedule_update', handleStorageChange);
        };
    }, []);

    const saveSchedule = (newSchedule: WeeklySchedule) => {
        setSchedule(newSchedule);
        localStorage.setItem('weekly_routine_schedule', JSON.stringify(newSchedule));
        window.dispatchEvent(new Event('weekly_schedule_update'));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-slate-800/80', 'ring-2', 'ring-blue-500');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-slate-800/80', 'ring-2', 'ring-blue-500');
    };

    const handleDrop = (e: React.DragEvent, day: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-slate-800/80', 'ring-2', 'ring-blue-500');

        try {
            const routineData = e.dataTransfer.getData('application/json');
            if (!routineData) return;

            const routine: DrillRoutine = JSON.parse(routineData);

            // Check for duplicates in the same day (optional, but good UX)
            if (schedule[day].some(r => r.id === routine.id)) {
                alert('이미 해당 요일에 추가된 루틴입니다.');
                return;
            }

            const newSchedule = {
                ...schedule,
                [day]: [...schedule[day], routine]
            };
            saveSchedule(newSchedule);
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleDayClick = (day: string) => {
        // Always trigger selection first
        if (onSelectDay) onSelectDay(day);

        if (selectedRoutine) {
            const newSchedule = {
                ...schedule,
                [day]: [...schedule[day], selectedRoutine]
            };
            saveSchedule(newSchedule);

            if (onAddToDay) {
                onAddToDay(day);
            }
        }
    };

    const removeRoutine = (day: string, routineId: string) => {
        const newSchedule = {
            ...schedule,
            [day]: schedule[day].filter(r => r.id !== routineId)
        };
        saveSchedule(newSchedule);
    };

    return (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 mb-8">
            <div className="flex items-center gap-2 mb-6">
                <Calendar className="w-5 h-5 text-purple-500" />
                <h2 className="text-xl font-bold text-white">주간 루틴 계획표</h2>
                <span className="text-xs text-slate-500 ml-2">
                    {selectedRoutine
                        ? <span className="text-blue-400 font-bold animate-pulse">'{selectedRoutine.title}' 루틴을 추가할 요일을 선택하세요.</span>
                        : "아래 루틴 목록에서 카드를 드래그하거나 선택하여 요일별 계획을 세워보세요."
                    }
                </span>
            </div>

            <div className="flex flex-wrap gap-3">
                {DAYS.map((day) => {
                    const isTargetDay = selectedDay === day;
                    return (
                        <div
                            key={day}
                            className="flex flex-col gap-2 min-w-[140px] sm:min-w-[160px] flex-1"
                        >
                            <div
                                onClick={() => {
                                    if (onSelectDay) onSelectDay(day);
                                }}
                                className={`text-center py-2 rounded-lg font-bold text-sm transition-colors cursor-pointer ${isTargetDay ? 'bg-purple-600 text-white ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-900' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                    }`}>
                                {day}
                            </div>
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, day)}
                                onClick={() => {
                                    handleDayClick(day);
                                    if (onSelectDay) onSelectDay(day);
                                }}
                                className={`
                                    flex-1 min-h-[160px] rounded-xl border-2 border-dashed p-3 transition-all cursor-pointer
                                    ${selectedRoutine || isTargetDay
                                        ? 'bg-blue-900/20 border-blue-500/50 hover:bg-blue-900/40 hover:border-blue-400 animate-pulse'
                                        : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                                    }
                                    ${isTargetDay
                                        ? '!bg-purple-900/80 !border-purple-400 ring-4 ring-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.5)] z-10'
                                        : ''}
                                `}
                            >
                                {schedule[day].length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 text-xs gap-2 pointer-events-none">
                                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center">
                                            <span className="text-lg">+</span>
                                        </div>
                                        <span>{selectedRoutine ? "클릭하여 추가" : "드래그 또는 클릭"}</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {schedule[day].map((routine, idx) => (
                                            <div
                                                key={`${routine.id}-${idx}`}
                                                className="bg-slate-800 rounded-lg p-2.5 group relative border border-slate-700 hover:border-purple-500/50 transition-colors"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <span className="text-xs font-bold text-white line-clamp-2 leading-tight flex-1">
                                                        {routine.title}
                                                    </span>
                                                    <button
                                                        onClick={() => removeRoutine(day, routine.id)}
                                                        className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    <span>{routine.totalDurationMinutes}분</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
