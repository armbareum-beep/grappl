import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getTrainingLogs, createTrainingLog, deleteTrainingLog } from '../lib/api';
import { TrainingLog } from '../types';
import { TrainingLogList } from '../components/journal/TrainingLogList';
import { TrainingLogForm } from '../components/journal/TrainingLogForm';
import { PublicJournalFeed } from '../components/journal/PublicJournalFeed';
import { LogDetailModal } from '../components/journal/LogDetailModal';
import { SkillTreeTab } from '../components/journal/SkillTreeTab';
import { TrainingCalendar } from '../components/journal/TrainingCalendar';
import { TournamentTab } from '../components/journal/TournamentTab';
import { Button } from '../components/Button';
import { Plus, BookOpen, Globe, User, Target, Calendar as CalendarIcon, List, Trophy } from 'lucide-react';

export const Journal: React.FC = () => {
    const { user } = useAuth();
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    // Default to 'my' if user is logged in, otherwise default to 'community'
    const [activeTab, setActiveTab] = useState<'my' | 'community' | 'skills' | 'tournament'>(user ? 'my' : 'community');
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<TrainingLog | null>(null);

    // Fetch logs when user is logged in and "my" tab is active
    useEffect(() => {
        const fetchMyLogs = async () => {
            if (!user || activeTab !== 'my') {
                setLoading(false);
                setLogs([]); // Clear logs if not on 'my' tab or not logged in
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
    }, [user, activeTab]);

    const handleCreate = async (logData: Omit<TrainingLog, 'id' | 'createdAt'>) => {
        if (!user) {
            alert('로그인 후 수련 일지를 작성할 수 있습니다.');
            return;
        }
        try {
            const { error } = await createTrainingLog(logData);
            if (error) throw error;
            // Refresh logs after creation
            const { data, error: fetchErr } = await getTrainingLogs(user.id);
            if (!fetchErr && data) setLogs(data);
            setIsCreating(false);
        } catch (e) {
            console.error('Error creating log:', e);
            alert('수련 일지 저장에 실패했습니다.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!user) {
            alert('로그인 후 수련 일지를 삭제할 수 있습니다.');
            return;
        }
        try {
            const { error } = await deleteTrainingLog(id);
            if (error) throw error;
            setLogs(prev => prev.filter(log => log.id !== id));
        } catch (e) {
            console.error('Error deleting log:', e);
            alert('수련 일지 삭제에 실패했습니다.');
        }
    };

    if (loading && activeTab === 'my' && user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
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
                        {activeTab === 'my' && !isCreating && user && ( // Only show create button if logged in and on 'my' tab
                            <Button onClick={() => setIsCreating(true)} className="flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>새 기록 작성</span>
                            </Button>
                        )}
                        {activeTab === 'my' && !user && ( // Show login prompt if not logged in and on 'my' tab
                            <a href="/login" className="text-blue-600 underline text-sm">로그인 후 기록 작성</a>
                        )}
                    </div>

                    {/* Tab navigation */}
                    <div className="flex space-x-6 border-b border-slate-200 -mb-6">
                        <button
                            onClick={() => setActiveTab('my')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'my' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <User className="w-4 h-4" />
                            내 수련 기록
                        </button>
                        <button
                            onClick={() => setActiveTab('skills')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'skills' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Target className="w-4 h-4" />
                            스킬 로드맵
                        </button>
                        <button
                            onClick={() => setActiveTab('tournament')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'tournament' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Trophy className="w-4 h-4" />
                            시합장
                        </button>
                        <button
                            onClick={() => setActiveTab('community')}
                            className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors ${activeTab === 'community' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Globe className="w-4 h-4" />
                            커뮤니티 피드
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'my' ? (
                    user ? ( // Render 'my' tab content only if user is logged in
                        <>
                            {isCreating && (
                                <div className="mb-8">
                                    <h2 className="text-lg font-semibold text-slate-900 mb-4">새 수련 기록</h2>
                                    <TrainingLogForm
                                        userId={user.id}
                                        onSubmit={handleCreate}
                                        onCancel={() => setIsCreating(false)}
                                    />
                                </div>
                            )}
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-slate-900">최근 기록</h2>
                                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('calendar')}
                                        className={`p-1.5 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <CalendarIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {viewMode === 'list' ? (
                                <TrainingLogList logs={logs} onDelete={handleDelete} />
                            ) : (
                                <div className="space-y-6">
                                    <TrainingCalendar
                                        logs={logs}
                                        onDateSelect={setSelectedDate}
                                        selectedDate={selectedDate}
                                    />
                                    {selectedDate && (
                                        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-semibold text-slate-900">{selectedDate}의 기록</h3>
                                                <button
                                                    onClick={() => setSelectedDate(null)}
                                                    className="text-sm text-slate-500 hover:text-slate-700"
                                                >
                                                    닫기
                                                </button>
                                            </div>
                                            <TrainingLogList
                                                logs={logs.filter(log => log.date === selectedDate)}
                                                onDelete={handleDelete}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : ( // Prompt to log in if 'my' tab is active but no user
                        <div className="flex items-center justify-center min-h-[300px] bg-white rounded-lg shadow-sm p-8">
                            <div className="text-center">
                                <p className="text-slate-600 mb-4">로그인 후 나만의 수련 일지를 관리하세요.</p>
                                <a href="/login" className="text-blue-600 underline">로그인</a>
                            </div>
                        </div>
                    )
                ) : activeTab === 'skills' ? (
                    <SkillTreeTab />
                ) : activeTab === 'tournament' ? (
                    <TournamentTab />
                ) : (
                    <PublicJournalFeed onLogClick={setSelectedLog} />
                )}
            </div>

            {selectedLog && (
                <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
            )}
        </div>
    );
};
