import React, { useState, useEffect } from 'react';
import { PlaySquare, Clock, ChevronRight, Dumbbell, Play, Lock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRoutines, createTrainingLog, addXP, updateQuestProgress } from '../../lib/api';
import { DrillRoutine } from '../../types';
import { ActiveRoutineView } from './ActiveRoutineView';
import { Button } from '../Button';

export const TrainingRoutinesTab: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRoutine, setActiveRoutine] = useState<DrillRoutine | null>(null);
    const [completedRoutineData, setCompletedRoutineData] = useState<{ duration: number; xp: number } | null>(null);

    useEffect(() => {
        if (user) {
            loadRoutines();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadRoutines = async () => {
        if (!user) return;
        setLoading(true);
        const { data } = await getUserRoutines(user.id);
        if (data) {
            setRoutines(data);
        }
        setLoading(false);
    };

    const handleStartRoutine = (routine: DrillRoutine) => {
        setActiveRoutine(routine);
    };

    const handleRoutineComplete = async (durationSeconds: number) => {
        if (!user || !activeRoutine) return;

        const durationMinutes = Math.ceil(durationSeconds / 60);

        // 1. Create Training Log
        const { data: log, error } = await createTrainingLog({
            userId: user.id,
            userName: user.user_metadata?.name || 'Unknown User',
            date: new Date().toISOString().split('T')[0],
            durationMinutes: durationMinutes,
            sparringRounds: 0,
            notes: `[Routine Completed] ${activeRoutine.title}\n\n${activeRoutine.description || ''}`,
            techniques: activeRoutine.items?.map(item => item.title) || [],
            isPublic: true,
            location: 'Home / Gym'
        });

        if (error) {
            console.error('Error saving routine log:', error);
            alert('기록 저장 중 오류가 발생했습니다.');
            setActiveRoutine(null);
            return;
        }

        // 2. Award Arena XP (1 XP per 5 mins)
        const xpAmount = Math.max(1, Math.floor(durationMinutes / 5));
        const { xpEarned } = await addXP(user.id, xpAmount, 'training_log', log?.id);

        // 3. Award Technique XP for linked techniques
        // TODO: Get technique IDs from routine metadata and award XP
        // const { awardTechniqueXp } = await import('../../lib/api-technique-mastery');
        // if (activeRoutine.linkedTechniqueIds) {
        //     for (const techniqueId of activeRoutine.linkedTechniqueIds) {
        //         await awardTechniqueXp(user.id, techniqueId, 'routine_completion', activeRoutine.id);
        //     }
        // }

        // 4. Update Quests
        await updateQuestProgress(user.id, 'write_log');

        // 5. Show Success State
        setCompletedRoutineData({ duration: durationMinutes, xp: xpEarned });
        setActiveRoutine(null);
    };

    if (activeRoutine) {
        return (
            <ActiveRoutineView
                routine={activeRoutine}
                onComplete={handleRoutineComplete}
                onCancel={() => setActiveRoutine(null)}
            />
        );
    }

    if (completedRoutineData) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                    </div>

                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">루틴 완료!</h2>
                        <p className="text-slate-400">오늘도 수련을 완료하셨군요. 멋집니다!</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800 p-4 rounded-xl">
                            <div className="text-slate-400 text-xs mb-1">수련 시간</div>
                            <div className="text-2xl font-bold text-white">{completedRoutineData.duration}분</div>
                        </div>
                        <div className="bg-slate-800 p-4 rounded-xl">
                            <div className="text-slate-400 text-xs mb-1">획득 XP</div>
                            <div className="text-2xl font-bold text-yellow-500">+{completedRoutineData.xp} XP</div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setCompletedRoutineData(null)}
                        >
                            닫기
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={() => {
                                setCompletedRoutineData(null);
                            }}
                        >
                            수련일지 확인
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">나의 훈련 루틴</h2>
                    <p className="text-slate-400 text-sm">구매한 루틴을 따라하고 기록하세요</p>
                </div>
                <Link to="/drills">
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <Dumbbell className="w-4 h-4" />
                        새 루틴 찾기
                    </button>
                </Link>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-slate-400">루틴을 불러오는 중...</p>
                </div>
            ) : routines.length === 0 ? (
                <div className="text-center py-12 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Dumbbell className="w-8 h-8 text-slate-500" />
                    </div>
                    <h3 className="text-white font-bold mb-2">구매한 루틴이 없습니다</h3>
                    <p className="text-slate-400 text-sm mb-6">
                        드릴 탭에서 전문가들의 루틴을 구매해보세요.
                    </p>
                    <Link to="/drills" className="text-blue-500 hover:text-blue-400 font-medium">
                        드릴 보러 가기 &rarr;
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {routines.map((routine) => (
                        <div key={routine.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors group">
                            <div className="flex gap-4 items-start">
                                {/* Thumbnail */}
                                <div className="w-24 h-24 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                    <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <PlaySquare className="w-8 h-8 text-white opacity-80" />
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 inline-block bg-purple-900/50 text-purple-400">
                                                ROUTINE
                                            </span>
                                            <h3 className="text-white font-bold text-lg leading-tight">{routine.title}</h3>
                                            <p className="text-slate-400 text-sm">{routine.creatorName}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {routine.totalDuration || 0}분
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Dumbbell className="w-3 h-3" />
                                            {routine.drillCount || 0}개 드릴
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => handleStartRoutine(routine)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 h-auto text-sm flex items-center justify-center gap-2"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        루틴 시작하기
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

function CheckCircle({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
