import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Event, EventType } from '../../types';

interface EventCalendarViewProps {
    events: Event[];
    selectedDate: string | null;
    onDateSelect: (date: string | null) => void;
}

const EVENT_TYPE_COLORS: Record<EventType, string> = {
    competition: 'bg-red-500',
    seminar: 'bg-blue-500',
    openmat: 'bg-green-500',
};

export const EventCalendarView: React.FC<EventCalendarViewProps> = ({
    events,
    selectedDate,
    onDateSelect,
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = [
        "1월", "2월", "3월", "4월", "5월", "6월",
        "7월", "8월", "9월", "10월", "11월", "12월"
    ];

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const getEventsForDate = (day: number): Event[] => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter(event => event.eventDate === dateStr);
    };

    const renderCalendarDays = () => {
        const days = [];
        const today = new Date().toISOString().split('T')[0];

        // Empty cells for days before first day of month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(
                <div key={`empty-${i}`} className="h-16 sm:h-20 bg-zinc-900/30"></div>
            );
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = getEventsForDate(day);
            const isSelected = selectedDate === dateStr;
            const isToday = today === dateStr;
            const isPast = dateStr < today;
            const dayOfWeek = new Date(dateStr).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            days.push(
                <button
                    key={day}
                    onClick={() => onDateSelect(isSelected ? null : dateStr)}
                    className={`h-16 sm:h-20 p-1 sm:p-2 transition-all text-left flex flex-col relative
                        ${isSelected ? 'bg-amber-600/20 ring-2 ring-amber-500' : 'hover:bg-zinc-800'}
                        ${isPast ? 'opacity-50' : ''}
                        ${isToday ? 'bg-zinc-800' : ''}
                    `}
                >
                    {/* Day Number */}
                    <span className={`text-sm font-medium
                        ${isToday ? 'bg-amber-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}
                        ${dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-zinc-300'}
                    `}>
                        {day}
                    </span>

                    {/* Event Dots */}
                    {dayEvents.length > 0 && (
                        <div className="flex gap-0.5 mt-auto justify-center flex-wrap">
                            {Array.from(new Set(dayEvents.map(e => e.type))).map((type, idx) => (
                                <span
                                    key={idx}
                                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${EVENT_TYPE_COLORS[type as EventType] || 'bg-zinc-500'}`}
                                />
                            ))}
                        </div>
                    )}
                </button>
            );
        }

        return days;
    };

    return (
        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-zinc-800">
                <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-bold text-white">
                        {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
                    </h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-600/20 rounded-lg transition-colors"
                    >
                        오늘
                    </button>
                    <button
                        onClick={prevMonth}
                        className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                        aria-label="이전 달"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        onClick={nextMonth}
                        className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
                        aria-label="다음 달"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900/50">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div
                        key={day}
                        className={`py-2 text-center text-xs sm:text-sm font-medium
                            ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-zinc-500'}
                        `}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-zinc-800">
                {renderCalendarDays()}
            </div>

            {/* Legend */}
            <div className="p-3 border-t border-zinc-800 flex items-center justify-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    <span>시합</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span>세미나</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span>오픈매트</span>
                </div>
            </div>
        </div>
    );
};

export default EventCalendarView;
