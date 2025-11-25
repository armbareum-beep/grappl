import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getTrainingLogs, createTrainingLog, deleteTrainingLog, updateTrainingLog, addXP, updateQuestProgress } from '../lib/api';
import { TrainingLog } from '../types';
import { TrainingLogForm } from '../components/journal/TrainingLogForm';
import { PublicJournalFeed } from '../components/journal/PublicJournalFeed';
import { TrainingCalendar } from '../components/journal/TrainingCalendar';
import { Button } from '../components/Button';
import { Plus, User, Globe, Lock } from 'lucide-react';
import { BeltUpModal } from '../components/BeltUpModal';

export const Journal: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showBeltUp, setShowBeltUp] = useState(false);
    const [beltUpData, setBeltUpData] = useState<{ old: number; new: number } | null>(null);
    const [activeView, setActiveView] = useState<'my' | 'public'>('my');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            loadLogs();
        } else {
            setLoading(false);
            setActiveView('public'); // Default to public if not logged in
        }
    }, [user]);

    const loadLogs = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await getTrainingLogs(user.id);
        if (data) {
            setLogs(data);
        }
        setLoading(false);
    };

    const handleCreateLog = async (logData: Omit<TrainingLog, 'id' | 'userId' | 'createdAt'>) => {
        if (!user) return;

        const { data, error } = await createTrainingLog({
            ...logData,
            userId: user.id,
            userName: user.user_metadata?.name || 'Unknown User'
        });

        if (error) {
            console.error('Error creating log:', error);
            alert('일지 작성 중 오류가 발생했습니다.');
            return;
        }

        if (data) {
            setLogs([data, ...logs]);
            setIsCreating(false);

            // Add XP for writing a log
            const { leveledUp, newLevel, xpEarned } = await addXP(user.id, 20, 'training_log', data.id);

            // Update quest progress
            await updateQuestProgress(user.id, 'write_log');

            if (leveledUp && newLevel) {
                setBeltUpData({ old: newLevel - 1, new: newLevel });
                setShowBeltUp(true);
            } else {
                alert(`일지가 작성되었습니다! (+${xpEarned} XP)`);
            }
        }
    };

    const handleDeleteLog = async (logId: string) => {
        if (!confirm('정말 삭제하시겠습니까?')) return;

        const { error } = await deleteTrainingLog(logId);
        if (error) {
            console.error('Error deleting log:', error);
            alert('삭제 중 오류가 발생했습니다.');
            return;
        }

        setLogs(logs.filter(log => log.id !== logId));
    };

    // Filter logs if a date is selected
    const displayedLogs = selectedDate
        ? logs.filter(log => log.date === selectedDate)
        : logs;

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header / View Toggle */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveView('my')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === 'my'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            내 일지
                        </button>
                        <button
                            onClick={() => setActiveView('public')}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeView === 'public'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            커뮤니티
                        </button>
                    </div>

                    {activeView === 'my' && user && (
                        <Button onClick={() => setIsCreating(true)} size="sm" className="rounded-full px-4">
                            <Plus className="w-4 h-4 mr-1.5" />
                            기록하기
                        </Button>
                    )}
                </div>

                {/* Content */}
                {activeView === 'my' ? (
                    <div className="space-y-6">
                        {!user ? (
                            <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                    <Lock className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-2">로그인이 필요합니다</h3>
                                <p className="text-slate-500 mb-6">수련 일지를 작성하고 성장 과정을 기록하세요.</p>
                                <Link to="/login">
                                    <Button>로그인하기</Button>
                                </Link>
                            </div>
                        ) : (
                            <>
                                {/* Calendar View */}
                                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-6">
                                    <TrainingCalendar
                                        logs={logs}
                                        selectedDate={selectedDate}
                                        onDateSelect={setSelectedDate}
                                    />
                                </div>

                                {loading ? (
                                    <div className="text-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
                                    </div>
                                ) : displayedLogs.length === 0 ? (
                                    <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
                                        <p className="text-slate-500 mb-4">
                                            {selectedDate ? '선택한 날짜에 작성된 일지가 없습니다.' : '아직 작성된 수련 일지가 없습니다.'}
                                        </p>
                                        {!selectedDate && (
                                            <Button onClick={() => setIsCreating(true)} variant="outline">
                                                첫 일지 작성하기
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        {displayedLogs.map((log) => (
                                            <div key={log.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
                                                <div className="p-5">
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-200">
                                                                <User className="w-5 h-5 text-slate-400" />
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="font-bold text-slate-900 text-sm">{user?.user_metadata?.name || '나'}</div>
                                                                    {!log.isPublic && <Lock className="w-3 h-3 text-slate-400" />}
                                                                </div>
                                                                <div className="text-xs text-slate-500">{log.date} • {log.location}</div>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteLog(log.id)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                                        >
                                                            <span className="sr-only">삭제</span>
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="mb-4">
                                                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                                                    </div>

                                                    {/* Stats Row */}
                                                    <div className="flex items-center gap-4 mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                                                        <div className="flex items-center gap-1.5">
                                                            <Globe className="w-4 h-4 text-blue-500" />
                                                            <span className="font-medium">{log.durationMinutes}분</span>
                                                        </div>
                                                        <div className="w-px h-3 bg-slate-300"></div>
                                                        <div className="flex items-center gap-1.5">
                                                            <User className="w-4 h-4 text-red-500" />
                                                            <span className="font-medium">{log.sparringRounds}라운드</span>
                                                        </div>
                                                    </div>

                                                    {/* Techniques */}
                                                    {log.techniques && log.techniques.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mb-4">
                                                            {log.techniques.map((tech, idx) => (
                                                                <span key={idx} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                                                                    #{tech}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ) : (
                    <PublicJournalFeed onLogClick={(log) => console.log('Log clicked', log)} />
                )}

                {/* Modals */}
                {isCreating && user && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-900">수련 일지 작성</h2>
                                    <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-slate-600">
                                        <span className="sr-only">Close</span>
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <TrainingLogForm
                                    userId={user.id}
                                    onSubmit={handleCreateLog}
                                    onCancel={() => setIsCreating(false)}
                                    initialData={{ date: new Date().toISOString().split('T')[0] }}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {showBeltUp && beltUpData && (
                    <BeltUpModal
                        oldLevel={beltUpData.old}
                        newLevel={beltUpData.new}
                        onClose={() => setShowBeltUp(false)}
                    />
                )}
            </div>
        </div>
    );
};
