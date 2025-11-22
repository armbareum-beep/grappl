import React, { useState } from 'react';
import { TrainingLog } from '../../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface TrainingCalendarProps {
    logs: TrainingLog[];
    onDateSelect: (date: string | null) => void;
    selectedDate: string | null;
}

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({ logs, onDateSelect, selectedDate }) => {
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

    const getLogsForDate = (day: number) => {
        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return logs.filter(log => log.date === dateStr);
    };

    const renderCalendarDays = () => {
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 bg-slate-50 border border-slate-100"></div>);
        }

        // Days of current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayLogs = getLogsForDate(day);
            const isSelected = selectedDate === dateStr;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            days.push(
                <div
                    key={day}
                    onClick={() => onDateSelect(isSelected ? null : dateStr)}
                    className={`h-24 border border-slate-100 p-2 cursor-pointer transition-colors relative
                        ${isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50'}
                        ${isToday ? 'bg-slate-50' : ''}
                    `}
                >
                    <div className="flex justify-between items-start">
                        <span className={`text-sm font-medium ${isToday ? 'bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-slate-700'}`}>
                            {day}
                        </span>
                        {dayLogs.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded-full font-medium">
                                {dayLogs.length}
                            </span>
                        )}
                    </div>

                    <div className="mt-2 space-y-1 overflow-y-auto max-h-[calc(100%-24px)]">
                        {dayLogs.map(log => (
                            <div key={log.id} className="text-xs p-1 bg-white rounded border border-slate-200 shadow-sm truncate">
                                <div className="font-medium text-slate-900 truncate">
                                    {log.techniques.length > 0 ? log.techniques[0] : '수련'}
                                </div>
                                {log.location && (
                                    <div className="text-slate-500 text-[10px] truncate">
                                        {log.location}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return days;
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="text-lg font-bold text-slate-900">
                        {currentDate.getFullYear()}년 {monthNames[currentDate.getMonth()]}
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-600">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
                    <div key={day} className={`py-2 text-center text-sm font-medium ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-slate-600'}`}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 bg-white">
                {renderCalendarDays()}
            </div>
        </div>
    );
};
