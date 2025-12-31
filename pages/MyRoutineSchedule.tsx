import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Calendar,
    ArrowLeft,
    Dumbbell,
    Clock,
    Play,
    Zap
} from 'lucide-react';
import { Button } from '../components/Button';
import { LoadingScreen } from '../components/LoadingScreen';
import { DrillRoutine } from '../types';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const MyRoutineSchedule: React.FC = () => {
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState<Record<string, DrillRoutine[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadSchedule = () => {
            setLoading(true);
            const saved = localStorage.getItem('weekly_routine_schedule');
            if (saved) {
                try {
                    setSchedule(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to load schedule', e);
                }
            }
            setLoading(false);
        };

        loadSchedule();
    }, []);

    if (loading) return <LoadingScreen />;

    const hasSchedule = Object.values(schedule).some(dayRoutines => dayRoutines.length > 0);

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-xl font-bold">내 훈련 스케줄</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {!hasSchedule ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6">
                            <Calendar className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h2 className="text-xl font-bold mb-2">등록된 스케줄이 없습니다.</h2>
                        <p className="text-zinc-500 mb-8">아레나 탭에서 훈련 루틴을 요일별로 배치해보세요!</p>
                        <Button
                            onClick={() => navigate('/arena?tab=routines')}
                            className="bg-violet-600 hover:bg-violet-500"
                        >
                            루틴 배치하러 가기
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {DAYS.map(day => {
                            const dayRoutines = schedule[day] || [];
                            if (dayRoutines.length === 0) return null;

                            return (
                                <section key={day} className="space-y-4">
                                    <div className="flex items-center justify-between px-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-sm font-bold">
                                                {day}
                                            </div>
                                            <h2 className="text-lg font-bold">{day}요일 훈련</h2>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-zinc-500">
                                                {dayRoutines.length}개의 루틴
                                            </span>
                                            {dayRoutines.length > 1 && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        const playlist = dayRoutines.map(r => r.id).join(',');
                                                        navigate(`/my-routines/${dayRoutines[0].id}?playlist=${playlist}`);
                                                    }}
                                                    className="bg-violet-600 hover:bg-violet-500 text-white font-bold h-9 px-4 rounded-full flex items-center gap-2 shadow-lg shadow-violet-900/20"
                                                >
                                                    <Play className="w-4 h-4 fill-current" />
                                                    통합 재생
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid gap-4">
                                        {dayRoutines.map((routine, idx) => (
                                            <div
                                                key={`${day}-${routine.id}-${idx}`}
                                                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-zinc-700 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
                                                        {routine.thumbnailUrl ? (
                                                            <img
                                                                src={routine.thumbnailUrl}
                                                                alt={routine.title}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Dumbbell className="w-8 h-8 text-zinc-700" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-bold text-zinc-100 truncate mb-1">
                                                            {routine.title}
                                                        </h3>
                                                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {routine.totalDurationMinutes}분
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Zap className="w-3 h-3 text-violet-500" />
                                                                {routine.drillCount}개 드릴
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <button
                                                        onClick={() => navigate(`/my-routines/${routine.id}`)}
                                                        className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center hover:bg-violet-500 hover:scale-105 transition-all shadow-lg shadow-violet-900/20"
                                                    >
                                                        <Play className="w-5 h-5 fill-current" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default MyRoutineSchedule;
