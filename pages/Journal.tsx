import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTrainingLogs, createTrainingLog, deleteTrainingLog, updateTrainingLog, addXP, updateQuestProgress } from '../lib/api';
import { TrainingLog } from '../types';
import { TrainingLogForm } from '../components/journal/TrainingLogForm';
import { PublicJournalFeed } from '../components/journal/PublicJournalFeed';
import { Button } from '../components/Button';
import { Plus, User } from 'lucide-react';
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
        const fetchMyLogs = async () => {
            if (!user || activeView !== 'my') {
                setLoading(false);
                setLogs([]);
                return;
            }
            setLoading(true);
            try {
                const { data, error } = await getTrainingLogs(user.id);
                if (error) throw error;
                if (data) setLogs(data);
            } catch (e) {
                console.error('Error fetching logs:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchMyLogs();
    }, [user, activeView]);

    const handleCreate = async (logData: Omit<TrainingLog, 'id' | 'createdAt'>) => {
        if (!user) {
            alert('로그인 후 수련 일지를 작성할 수 있습니다.');
            return;
        }
        try {
            const { error } = await createTrainingLog(logData);
            if (error) throw error;

            // Gamification: Award XP (15 XP for log)
            const { xpEarned, leveledUp, newLevel } = await addXP(user.id, 15, 'write_log');
            if (leveledUp && newLevel) {
                setBeltUpData({ old: newLevel - 1, new: newLevel });
                setShowBeltUp(true);
            }

            // Gamification: Update Quest
            await updateQuestProgress(user.id, 'write_log');
            setIsCreating(false);

            // Refresh feed
            window.location.reload();

        } catch (e) {
            console.error('Error creating log:', e);
            alert('수련일지는 하루에 1개밖에 못올린다고');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header / Profile Summary */}
                {user && (
                    <div className="mb-8 bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center">
                                    <User className="w-8 h-8 text-slate-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">{user.user_metadata?.name || '수련생'}</h2>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </div>
                            </div>
                            <Button onClick={() => setIsCreating(true)}>
                                <Plus className="w-4 h-4 mr-2" />
                                기록 작성
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <BeltProgressBar userId={user.id} />
                            <DailyQuestsPanel userId={user.id} />
                        </div>
                    </div>
                )}

                {/* View Toggle */}
                <div className="flex border-b border-slate-200 mb-6">
                    <button
                        onClick={() => setActiveView('my')}
                        className={`flex-1 pb-4 text-sm font-medium text-center transition-colors ${activeView === 'my'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        내 기록
                    </button>
                    <button
                        onClick={() => setActiveView('public')}
                        className={`flex-1 pb-4 text-sm font-medium text-center transition-colors ${activeView === 'public'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        공개 피드
                    </button>
                </div>

                {/* Create Form Modal/Overlay */}
                {isCreating && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                            <h3 className="text-lg font-bold mb-4">새로운 수련 기록</h3>
                            <TrainingLogForm
                                userId={user?.id || ''}
                                onSubmit={handleCreate}
                                onCancel={() => setIsCreating(false)}
                            />
                        </div>
                    </div>
                )}

                {/* Feed Content */}
                <div className="space-y-6">
                    {activeView === 'my' ? (
                        user ? (
                            logs.length > 0 ? (
                                <div className="space-y-4">
                                    {logs.map(log => (
                                        <div key={log.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <div className="font-medium text-slate-900">{log.date}</div>
                                                    <div className="text-sm text-slate-500">{log.durationMinutes}분 수련</div>
                                                </div>
                                                {!log.isPublic && (
                                                    <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded">비공개</span>
                                                )}
                                            </div>
                                            <p className="text-slate-700 whitespace-pre-wrap mb-4">{log.notes}</p>
                                            <div className="flex flex-wrap gap-2">
                                                {log.techniques.map((tech, i) => (
                                                    <span key={i} className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                                                        {tech}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-500">아직 작성된 기록이 없습니다.</p>
                                </div>
                            )
                        ) : (
                            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-200">
                                <p className="text-slate-500 mb-4">로그인하고 수련 기록을 남겨보세요.</p>
                                <a href="/login" className="text-blue-600 font-medium hover:underline">로그인하기</a>
                            </div>
                        )
                    ) : (
                        <PublicJournalFeed />
                    )}
                </div>
            </div>

            {showBeltUp && beltUpData && (
                <BeltUpModal
                    oldLevel={beltUpData.old}
                    newLevel={beltUpData.new}
                    onClose={() => setShowBeltUp(false)}
                />
            )}
        </div>
    );
};
