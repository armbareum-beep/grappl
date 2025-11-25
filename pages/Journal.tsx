import React, { useEffect, useState } from 'react';

import { useAuth } from '../contexts/AuthContext';
import { getTrainingLogs, createTrainingLog, deleteTrainingLog, updateTrainingLog, addXP, updateQuestProgress } from '../lib/api';
import { TrainingLog } from '../types';
import { TrainingLogForm } from '../components/journal/TrainingLogForm';
import { PublicJournalFeed } from '../components/journal/PublicJournalFeed';
import { Button } from '../components/Button';
import { Plus, User, Globe, Lock } from 'lucide-react';
import { BeltProgressBar } from '../components/BeltProgressBar';
import { DailyQuestsPanel } from '../components/DailyQuestsPanel';
import { BeltUpModal } from '../components/BeltUpModal';

export const Journal: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [showBeltUp, setShowBeltUp] = useState(false);
    const [beltUpData, setBeltUpData] = useState<{ old: number; new: number } | null>(null);
    const [activeView, setActiveView] = useState<'my' | 'public'>('my');

    useEffect(() => {
        if (user) {
            loadLogs();
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

                    {activeView === 'my' && (
                        <Button onClick={() => setIsCreating(true)} size="sm" className="rounded-full px-4">
                            <Plus className="w-4 h-4 mr-1.5" />
                            기록하기
                        </Button>
                    )}
                </div>

                {/* Content */}
                {activeView === 'my' ? (
                    <div className="space-y-6">
                        {/* Daily Quests (Only visible in My Logs) */}
                        {user && <DailyQuestsPanel userId={user.id} />}

                        {loading ? (
                            <div className="text-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mx-auto mb-4"></div>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="text-center py-20 border border-dashed border-slate-200 rounded-2xl">
                                <p className="text-slate-500 mb-4">아직 작성된 수련 일지가 없습니다.</p>
                                <Button onClick={() => setIsCreating(true)} variant="outline">
                                    첫 일지 작성하기
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {logs.map((log) => (
                                    <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-semibold text-slate-900">{log.date}</span>
                                                    {!log.isPublic && <Lock className="w-3 h-3 text-slate-400" />}
                                                </div>
                                                <p className="text-sm text-slate-500">{log.location}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                                                    {log.durationMinutes}분
                                                </span>
                                                <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium text-slate-600">
                                                    스파링 {log.sparringRounds}R
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-slate-800 whitespace-pre-wrap mb-4 leading-relaxed">{log.notes}</p>

                                        {log.techniques && log.techniques.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {log.techniques.map((tech, i) => (
                                                    <span key={i} className="text-blue-600 text-sm">#{tech}</span>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex justify-end pt-3 border-t border-slate-50">
                                            <button
                                                onClick={() => handleDeleteLog(log.id)}
                                                className="text-xs text-red-500 hover:text-red-600 font-medium"
                                            >
                                                삭제
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <PublicJournalFeed onLogClick={(log) => console.log('Log clicked', log)} />
                )}

                {/* Modals */}
                {isCreating && (
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
