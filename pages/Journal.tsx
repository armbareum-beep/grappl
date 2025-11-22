import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTrainingLogs, createTrainingLog, deleteTrainingLog } from '../lib/api';
import { TrainingLog } from '../types';
import { TrainingLogList } from '../components/journal/TrainingLogList';
import { TrainingLogForm } from '../components/journal/TrainingLogForm';
import { PublicJournalFeed } from '../components/journal/PublicJournalFeed';
import { LogDetailModal } from '../components/journal/LogDetailModal';
import { SkillTreeTab } from '../components/journal/SkillTreeTab';
import { Button } from '../components/Button';
import { Plus, BookOpen, Globe, User, Target } from 'lucide-react';

export const Journal: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [activeTab, setActiveTab] = useState<'my' | 'community' | 'skills'>('my');
    const [selectedLog, setSelectedLog] = useState<TrainingLog | null>(null);

    const fetchLogs = async () => {
        if (!user) return;
        try {
            const { data, error } = await getTrainingLogs(user.id);
            if (error) throw error;
            if (data) setLogs(data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'my') {
            fetchLogs();
        }
    }, [user, activeTab]);

    const handleCreate = async (logData: Omit<TrainingLog, 'id' | 'createdAt'>) => {
        try {
            const { error } = await createTrainingLog(logData);
            if (error) throw error;
            await fetchLogs();
            setIsCreating(false);
        } catch (error) {
            console.error('Error creating log:', error);
            alert('수련 일지 저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await deleteTrainingLog(id);
            if (error) throw error;
            setLogs(logs.filter(log => log.id !== id));
        } catch (error) {
            console.error('Error deleting log:', error);
            alert('수련 일지 삭제에 실패했습니다.');
        }
    };

    if (loading && activeTab === 'my') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">수련 일지</h1>
                                <p className="text-slate-600 text-sm">나만의 주짓수 여정을 기록하고 공유하세요</p>
                            </div>
                        </div>
                        {!isCreating && activeTab === 'my' && (
                            <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>새 기록 작성</span>
                            </Button>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex space-x-6 border-b border-slate-200 -mb-6">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'my'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <User className="w-4 h-4" />
                            내 수련 기록
                        </button>
                        <button
                            onClick={() => setActiveTab('skills')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'skills'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Target className="w-4 h-4" />
                            스킬 로드맵
                        </button>
                        <button
                            onClick={() => setActiveTab('community')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'community'
                                ? 'text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            <Globe className="w-4 h-4" />
                            커뮤니티 피드
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'my' ? (
                    <>
                        {isCreating ? (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-slate-900 mb-4">새 수련 기록</h2>
                                <TrainingLogForm
                                    userId={user?.id || ''}
                                    onSubmit={handleCreate}
                                    onCancel={() => setIsCreating(false)}
                                />
                            </div>
                        ) : null}

                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-slate-900">최근 기록</h2>
                            <span className="text-sm text-slate-500">총 {logs.length}개의 기록</span>
                        </div>

                        <TrainingLogList logs={logs} onDelete={handleDelete} />
                    </>
                ) : activeTab === 'skills' ? (
                    <SkillTreeTab />
                ) : (
                    <PublicJournalFeed onLogClick={setSelectedLog} />
                )}
            </div>

            {selectedLog && (
                <LogDetailModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
};
