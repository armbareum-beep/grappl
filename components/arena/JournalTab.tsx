import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getTrainingLogs, createTrainingLog, updateTrainingLog, deleteTrainingLog, addXP, updateQuestProgress } from '../../lib/api';
import { TrainingLog } from '../../types';
import { TrainingLogForm } from '../journal/TrainingLogForm';
import { Button } from '../Button';
import { Plus, User, Lock, Globe, Calendar, Flame, Clock, Swords, MoreHorizontal, Trash2, Edit2 } from 'lucide-react';
import { BeltUpModal } from '../BeltUpModal';
import { format, subDays, eachDayOfInterval, isSameDay, startOfYear, endOfYear, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';

export const JournalTab: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const navigate = useNavigate();
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingLog, setEditingLog] = useState<TrainingLog | null>(null);
    const [showBeltUp, setShowBeltUp] = useState(false);
    const [beltUpData, setBeltUpData] = useState<{ old: number; new: number } | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    // Heatmap Scroll Ref
    const scrollRef = useRef<HTMLDivElement>(null);

    const handleStartCreating = () => {
        if (!user) {
            if (confirm('로그인이 필요한 서비스입니다. 로그인하시겠습니까?')) {
                navigate('/login');
            }
            return;
        }
        setEditingLog(null);
        setIsCreating(true);
    };

    const handleEditLog = (log: TrainingLog) => {
        setEditingLog(log);
        setIsCreating(true);
    };

    useEffect(() => {
        if (user) {
            loadLogs();
        } else {
            setLoading(false);
        }
    }, [user]);

    // Auto-scroll to end of heatmap when logs are loaded
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [logs, loading]);

    const loadLogs = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await getTrainingLogs(user.id);
        if (data) {
            setLogs(data);
        }
        setLoading(false);
    };

    const handleSaveLog = async (logData: Omit<TrainingLog, 'id' | 'userId' | 'createdAt'>) => {
        if (!user) return;

        if (editingLog) {
            // Update existing log
            const { error } = await updateTrainingLog(editingLog.id, logData);

            if (error) {
                console.error('Error updating log:', error);
                toastError('일지 수정 중 오류가 발생했습니다.');
                return;
            }

            setLogs(logs.map(log => log.id === editingLog.id ? { ...log, ...logData } : log));
            setIsCreating(false);
            setEditingLog(null);
            success('일지가 수정되었습니다.');
        } else {
            // Create new log
            const { data, error } = await createTrainingLog({
                ...logData,
                userId: user.id,
                userName: user.user_metadata?.name || 'Unknown User'
            });

            if (error) {
                console.error('Error creating log:', error);
                toastError('일지 작성 중 오류가 발생했습니다.');
                return;
            }

            if (data) {
                setLogs([data, ...logs]);
                setIsCreating(false);

                const { leveledUp, newLevel, xpEarned } = await addXP(user.id, 20, 'training_log', data.id);
                await updateQuestProgress(user.id, 'write_log');

                if (leveledUp && newLevel) {
                    setBeltUpData({ old: newLevel - 1, new: newLevel });
                    setShowBeltUp(true);
                } else {
                    success(`일지가 작성되었습니다! (+${xpEarned} XP)`);
                }
            }
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const { error } = await deleteTrainingLog(logId);
        if (error) {
            console.error('Error deleting log:', error);
            toastError('삭제 중 오류가 발생했습니다.');
            return;
        }

        setLogs(logs.filter(log => log.id !== logId));
    };

    // Stats Calculation
    const thisMonthLogs = logs.filter(log => new Date(log.date).getMonth() === new Date().getMonth());
    const totalDuration = thisMonthLogs.reduce((acc, log) => acc + (log.durationMinutes || 0), 0);
    const totalRounds = thisMonthLogs.reduce((acc, log) => acc + (log.sparringRounds || 0), 0);

    // Heatmap Data Generation (Last 365 days)
    const today = new Date();
    const startDate = subDays(today, 364); // Show last year
    const dates = eachDayOfInterval({ start: startDate, end: today });

    const getIntensity = (date: Date) => {
        const dayLogs = logs.filter(log => isSameDay(new Date(log.date), date));
        const count = dayLogs.length;
        if (count === 0) return 0;
        if (count === 1) return 1;
        if (count === 2) return 2;
        if (count === 3) return 3;
        return 4; // 4 or more
    };

    const displayedLogs = selectedDate
        ? logs.filter(log => isSameDay(new Date(log.date), selectedDate))
        : logs;

    // if (!user) {
    //     return (
    //         <div className="text-center py-20 bg-slate-900 rounded-3xl border border-dashed border-slate-800">
    //             <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
    //                 <Lock className="w-8 h-8 text-slate-500" />
    //             </div>
    //             <h3 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h3>
    //             <p className="text-slate-400 mb-6">수련 일지를 작성하고 성장 과정을 기록하세요.</p>
    //             <Link to="/login">
    //                 <Button>로그인하기</Button>
    //             </Link>
    //         </div>
    //     );
    // }

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            {/* Header & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Flame className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{thisMonthLogs.length}회</div>
                        <div className="text-xs text-slate-400">이번 달 수련</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                        <Clock className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{Math.round(totalDuration / 60)}시간</div>
                        <div className="text-xs text-slate-400">총 수련 시간</div>
                    </div>
                </div>
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                        <Swords className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-white">{totalRounds}R</div>
                        <div className="text-xs text-slate-400">스파링 라운드</div>
                    </div>
                </div>
            </div>

            {/* Contribution Graph (Heatmap) */}
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        수련 잔디
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>Less</span>
                        <div className="w-3 h-3 bg-slate-800 rounded-sm border border-slate-700"></div>
                        <div className="w-3 h-3 bg-blue-900 rounded-sm border border-blue-800"></div>
                        <div className="w-3 h-3 bg-blue-700 rounded-sm border border-blue-600"></div>
                        <div className="w-3 h-3 bg-blue-500 rounded-sm border border-blue-400"></div>
                        <div className="w-3 h-3 bg-blue-300 rounded-sm border border-blue-200"></div>
                        <span>More</span>
                    </div>
                </div>

                <div
                    ref={scrollRef}
                    className="overflow-x-auto pb-2"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <style>{`
                        .overflow-x-auto::-webkit-scrollbar {
                            display: none;
                        }
                    `}</style>
                    <div className="min-w-max flex gap-1">
                        {/* Render weeks */}
                        {Array.from({ length: 53 }).map((_, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const dateIndex = weekIndex * 7 + dayIndex;
                                    if (dateIndex >= dates.length) return null;
                                    const date = dates[dateIndex];
                                    const intensity = getIntensity(date);
                                    const isSelected = selectedDate && isSameDay(selectedDate, date);

                                    let bgClass = 'bg-slate-800 border-slate-700';
                                    if (intensity === 1) bgClass = 'bg-blue-900 border-blue-800';
                                    if (intensity === 2) bgClass = 'bg-blue-700 border-blue-600';
                                    if (intensity === 3) bgClass = 'bg-blue-500 border-blue-400';
                                    if (intensity >= 4) bgClass = 'bg-blue-300 border-blue-200';

                                    return (
                                        <div
                                            key={dayIndex}
                                            onClick={() => setSelectedDate(isSelected ? null : date)}
                                            className={`w-3 h-3 rounded-sm border cursor-pointer transition-all hover:ring-1 hover:ring-white ${bgClass} ${isSelected ? 'ring-2 ring-white z-10' : ''}`}
                                            title={`${format(date, 'yyyy-MM-dd')}: ${intensity > 0 ? '수련함' : '기록 없음'}`}
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Logs List Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                    {selectedDate
                        ? `${format(selectedDate, 'M월 d일', { locale: ko })}의 기록`
                        : '최근 기록'}
                </h3>
                <Button onClick={handleStartCreating} size="sm" className="rounded-full px-4">
                    <Plus className="w-4 h-4 mr-1.5" />
                    기록하기
                </Button>
            </div>

            {/* Logs Timeline */}
            <div className="space-y-4">
                {displayedLogs.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
                        <p className="text-slate-400 mb-4">기록이 없습니다.</p>
                        <Button onClick={handleStartCreating} variant="outline" size="sm">
                            첫 기록 남기기
                        </Button>
                    </div>
                ) : (
                    displayedLogs.map((log) => (
                        <div key={log.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-6 hover:border-slate-700 transition-colors">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-slate-500">
                                        {format(new Date(log.date), 'd')}
                                    </div>
                                    <div>
                                        <div className="font-bold text-white">
                                            {format(new Date(log.date), 'M월 d일 EEEE', { locale: ko })}
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2">
                                            {log.location}
                                            {!log.isPublic && <Lock className="w-3 h-3" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEditLog(log)}
                                        className="text-slate-500 hover:text-blue-500 transition-colors p-2"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="text-slate-500 hover:text-red-500 transition-colors p-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <p className="text-slate-300 whitespace-pre-wrap mb-4 leading-relaxed">
                                {log.notes}
                            </p>

                            {/* Stats Chips */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                                    {log.durationMinutes}분
                                </div>
                                <div className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-2">
                                    <Swords className="w-3.5 h-3.5 text-red-400" />
                                    {log.sparringRounds}라운드
                                </div>
                            </div>

                            {/* Tags */}
                            {log.techniques && log.techniques.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {log.techniques.map((tech, idx) => (
                                        <span key={idx} className="px-2.5 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-medium border border-blue-800/30">
                                            #{tech}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {
                isCreating && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-white">{editingLog ? '수련 일지 수정' : '수련 일지 작성'}</h2>
                                    <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white">
                                        <span className="sr-only">Close</span>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <TrainingLogForm
                                    userId={user.id}
                                    onSubmit={handleSaveLog}
                                    onCancel={() => setIsCreating(false)}
                                    initialData={editingLog || { date: new Date().toISOString().split('T')[0] }}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showBeltUp && beltUpData && (
                    <BeltUpModal
                        oldLevel={beltUpData.old}
                        newLevel={beltUpData.new}
                        onClose={() => setShowBeltUp(false)}
                    />
                )
            }
        </div>
    );
};
