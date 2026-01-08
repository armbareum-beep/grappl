import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, Dumbbell, PlayCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getRecentCompletedRoutines } from '../lib/api';
import { CompletedRoutineRecord } from '../types';
import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';

export const AllCompletedRoutines: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<CompletedRoutineRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        const fetchAllRoutines = async () => {
            try {
                // Fetch with a large limit to get "all" (or we could adjust the API to allow no limit)
                const data = await getRecentCompletedRoutines(user.id, 100);
                setRoutines(data);
            } catch (error) {
                console.error('Error fetching all completed routines:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllRoutines();
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-md border-b border-zinc-800 px-4 md:px-6 h-16 flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">전체 완료한 루틴</h1>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-zinc-500 font-medium">기록을 불러오는 중...</p>
                    </div>
                ) : routines.length === 0 ? (
                    <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Dumbbell className="w-8 h-8 text-zinc-600" />
                        </div>
                        <p className="text-zinc-400 font-bold mb-2">완료된 루틴이 없습니다.</p>
                        <p className="text-zinc-500 text-sm">오늘 첫 수련을 시작해보세요!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {routines.map((record) => {
                            const date = parseISO(record.completedAt);
                            return (
                                <div
                                    key={record.id}
                                    className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 hover:border-violet-500/50 transition-all group"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                                                    {format(date, 'yyyy. MM. dd (EEEE)', { locale: ko })}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-3 group-hover:text-violet-400 transition-colors">
                                                {record.routineTitle}
                                            </h3>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{record.durationMinutes}분</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-zinc-400 text-sm">
                                                    <Dumbbell className="w-4 h-4" />
                                                    <span>{(record.techniques || []).length}개 드릴</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => record.routineId && navigate(`/drill-routines/${record.routineId}`)}
                                            className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-violet-600 hover:text-white transition-all shadow-lg"
                                        >
                                            <PlayCircle className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AllCompletedRoutines;
