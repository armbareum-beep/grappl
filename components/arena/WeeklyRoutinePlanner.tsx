import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrillRoutine } from '../../types';
import { Calendar, Trash2, Clock, Play } from 'lucide-react';

interface WeeklySchedule {
    [key: string]: DrillRoutine[];
}

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

interface WeeklyRoutinePlannerProps {
    selectedRoutine?: DrillRoutine | null;
    onAddToDay?: (day: string) => void;
    selectedDay?: string | null;
    onSelectDay?: (day: string) => void;
    isGuest?: boolean;
    guestRoutines?: DrillRoutine[];
}

export const WeeklyRoutinePlanner: React.FC<WeeklyRoutinePlannerProps> = ({
    selectedRoutine,
    onAddToDay,
    selectedDay,
    onSelectDay,
    isGuest = false,
    guestRoutines = []
}) => {
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState<WeeklySchedule>({
        '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': []
    });

    // Mouse drag scroll state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragDistance, setDragDistance] = useState(0);

    useEffect(() => {
        if (isGuest) {
            // Distribute guest routines across few days for realistic preview
            const newSchedule: WeeklySchedule = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': [] };
            if (guestRoutines.length > 0) {
                newSchedule['월'] = [guestRoutines[0]];
                if (guestRoutines.length > 1) newSchedule['수'] = [guestRoutines[1]];
                if (guestRoutines.length > 2) newSchedule['금'] = [guestRoutines[2]];
            }
            setSchedule(newSchedule);
            return;
        }
        const saved = localStorage.getItem('weekly_routine_schedule');
        if (saved) {
            try {
                setSchedule(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load schedule', e);
            }
        }
    }, [isGuest]);

    // Listen for external updates to the schedule (e.g. from TrainingRoutinesTab)
    useEffect(() => {
        if (isGuest) return;
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
        window.addEventListener('weekly_schedule_update', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('weekly_schedule_update', handleStorageChange);
        };
    }, [isGuest]);

    // Scroll to today or selected day on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollContainerRef.current) {
                const targetDay = selectedDay || todayKorean;
                const targetElement = scrollContainerRef.current.querySelector(`[data-day="${targetDay}"]`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []); // Only run on mount to satisfy "Initial screen" requirement

    const saveSchedule = (newSchedule: WeeklySchedule) => {
        setSchedule(newSchedule);
        if (isGuest) return;
        localStorage.setItem('weekly_routine_schedule', JSON.stringify(newSchedule));
        window.dispatchEvent(new Event('weekly_schedule_update'));
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-zinc-800/80', 'ring-2', 'ring-blue-500');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-zinc-800/80', 'ring-2', 'ring-blue-500');
    };

    const handleDrop = (e: React.DragEvent, day: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-zinc-800/80', 'ring-2', 'ring-blue-500');

        try {
            const routineData = e.dataTransfer.getData('application/json');
            if (!routineData) return;

            const routine: DrillRoutine = JSON.parse(routineData);

            // Check for duplicates in the same day (optional, but good UX)
            if (schedule[day].some((r: DrillRoutine) => r.id === routine.id)) {
                alert('이미 해당 요일에 추가된 루틴입니다.');
                return;
            }

            const newSchedule = {
                ...schedule,
                [day]: [...schedule[day], routine]
            };
            saveSchedule(newSchedule);

            // Trigger callback if provided, even for guests (they can show modal)
            if (onAddToDay) {
                onAddToDay(day);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleDayClick = (day: string) => {
        // Prevent click if we just finished dragging
        if (dragDistance > 5) return;

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

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        setDragDistance(0);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
        setDragDistance(Math.abs(x - startX));
    };

    const removeRoutine = (day: string, routineId: string) => {
        const newSchedule = {
            ...schedule,
            [day]: schedule[day].filter((r: DrillRoutine) => r.id !== routineId)
        };
        saveSchedule(newSchedule);
    };

    // Get today's day in Korean
    const getTodayKorean = () => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const today = new Date().getDay();
        return days[today];
    };

    const todayKorean = getTodayKorean();

    return (
        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800 p-6 md:p-8 mb-8 relative overflow-hidden">
            {/* Soft Radial Gradient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                    <Calendar className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-zinc-50 flex items-center gap-2">주간 루틴 계획표</h2>
                    <p className="text-xs text-zinc-500 mt-1">
                        {selectedRoutine
                            ? <span className="text-violet-400 font-bold animate-pulse">'{selectedRoutine.title}' 루틴을 추가할 요일을 선택하세요.</span>
                            : "좌우로 스와이프하여 요일별 계획을 확인하세요."
                        }
                    </p>
                </div>
            </div>

            {/* Mobile-First Horizontal Scroll Carousel */}
            <div
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scrollbar-hide -mx-2 px-2 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'snap-none' : ''}`}
            >
                {DAYS.map((day) => {
                    const isTargetDay = selectedDay === day;
                    const isToday = day === todayKorean;
                    const routinesForDay = schedule[day] || [];

                    return (
                        <div
                            key={day}
                            data-day={day}
                            data-today={isToday}
                            className={`
                                flex-shrink-0 w-[80%] md:w-[45%] lg:w-[30%] snap-center
                                bg-zinc-900/40 border rounded-2xl flex flex-col overflow-hidden
                                transition-all duration-300
                                ${isToday
                                    ? 'border-violet-500 bg-violet-600/5 scale-105 shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                                    : 'border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-900/60'
                                }
                            `}
                        >
                            {/* Header */}
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectDay) onSelectDay(day);
                                }}
                                className={`
                                    bg-zinc-800/50 text-zinc-400 text-sm font-bold py-3 px-4 flex items-center justify-between cursor-pointer transition-colors
                                    ${isTargetDay ? '!bg-violet-600 !text-zinc-50' : 'hover:text-zinc-200'}
                                    ${isToday && !isTargetDay ? 'bg-violet-600/20 text-violet-300' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    {day}
                                    {isToday && <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">오늘</span>}
                                </div>
                                {isToday && routinesForDay.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const playlist = routinesForDay.map(r => r.id).join(',');
                                            navigate(`/my-routines/${routinesForDay[0].id}?playlist=${playlist}`);
                                        }}
                                        className="p-1.5 rounded-full transition-all bg-violet-600 hover:bg-violet-500 text-white shadow-lg"
                                        title="오늘의 루틴 통합 재생"
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                    </button>
                                )}
                            </div>

                            {/* Content Area */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, day)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDayClick(day);
                                    if (onSelectDay) onSelectDay(day);
                                }}
                                className={`
                                    flex-1 p-4 transition-all cursor-pointer relative overflow-y-auto min-h-[320px]
                                    ${selectedRoutine || isTargetDay
                                        ? 'bg-violet-900/10'
                                        : ''
                                    }
                                    ${isTargetDay
                                        ? '!bg-violet-600/10 ring-1 ring-violet-500/50 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                                        : ''}
                                `}
                            >
                                {routinesForDay.length === 0 ? (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDayClick(day);
                                            if (onSelectDay) onSelectDay(day);
                                        }}
                                        className="h-full flex flex-col items-center justify-center gap-3 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700 group-hover:text-violet-400 group-hover:border-violet-500/50 transition-colors">
                                            <span className="text-2xl font-light">+</span>
                                        </div>
                                        <span className="text-sm text-zinc-600 group-hover:text-zinc-500 transition-colors">
                                            루틴 추가
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {routinesForDay.map((routine: DrillRoutine, idx: number) => (
                                            <div
                                                key={`${routine.id}-${idx}`}
                                                className={`
                                                    bg-zinc-800/80 backdrop-blur-sm rounded-xl p-3 group relative border transition-all cursor-pointer shadow-sm
                                                    ${selectedRoutine?.id === routine.id
                                                        ? 'border-violet-500 ring-1 ring-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                                        : 'border-zinc-700/50 hover:border-violet-500/30 hover:bg-zinc-800'
                                                    }
                                                `}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug flex-1">
                                                        {routine.title}
                                                    </span>
                                                    <button
                                                        onClick={() => removeRoutine(day, routine.id)}
                                                        className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <div className="flex items-center gap-1 text-zinc-500">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{routine.totalDurationMinutes}분</span>
                                                    </div>
                                                    <div className="text-zinc-500">
                                                        드릴 {routine.drills?.length || 0}개
                                                    </div>
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
