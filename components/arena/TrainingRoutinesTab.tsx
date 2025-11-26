import React, { useState, useEffect } from 'react';
import { PlaySquare, Clock, ChevronRight, Dumbbell, Play, Lock, Check } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getUserRoutines, createTrainingLog, addXP, updateQuestProgress } from '../../lib/api';
import { DrillRoutine, Drill, Difficulty, VideoCategory } from '../../types';
import { ActiveRoutineView } from './ActiveRoutineView';
import { Button } from '../Button';

export const TrainingRoutinesTab: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeRoutine, setActiveRoutine] = useState<DrillRoutine | null>(null);
    const [previewRoutine, setPreviewRoutine] = useState<DrillRoutine | null>(null);
    const [completedRoutineData, setCompletedRoutineData] = useState<{ duration: number; xp: number } | null>(null);
    const [savedDrills, setSavedDrills] = useState<Drill[]>([]);

    // Custom Routine Creation State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedDrills, setSelectedDrills] = useState<Set<string>>(new Set());

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('saved_drills') || '[]');
        setSavedDrills(saved);
    }, []);

    const toggleDrillSelection = (drillId: string) => {
        const newSelected = new Set(selectedDrills);
        if (newSelected.has(drillId)) {
            newSelected.delete(drillId);
        } else {
            newSelected.add(drillId);
        }
        setSelectedDrills(newSelected);
    };

    const loadRoutines = async () => {
        if (!user) return;
        setLoading(true);

        // Load purchased routines from API
        const { data } = await getUserRoutines(user.id);

        // Load custom routines from LocalStorage
        const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');

        // Merge and set
        if (data) {
            setRoutines([...customRoutines, ...data]);
        } else {
            setRoutines(customRoutines);
        }
        setLoading(false);
    };

    const handleCreateRoutine = () => {
        const routineName = prompt('새로운 루틴의 이름을 입력하세요:');
        if (!routineName) return;

        const selectedDrillsList = savedDrills.filter(d => selectedDrills.has(d.id));

        const newRoutine: DrillRoutine = {
            id: `custom-${Date.now()}`,
            title: routineName,
            description: '나만의 커스텀 루틴',
            creatorId: user?.id || 'me',
            creatorName: user?.user_metadata?.name || '나',
            thumbnailUrl: selectedDrillsList[0]?.thumbnailUrl || '',
            price: 0,
            views: 0,
            drillCount: selectedDrillsList.length,
            drills: selectedDrillsList,
            createdAt: new Date().toISOString(),
            difficulty: Difficulty.Intermediate,
            category: VideoCategory.Standing,
            totalDurationMinutes: selectedDrillsList.reduce((acc, curr) => acc + (parseInt(curr.length?.split(':')[0] || '0') || 1), 0)
        };

        const existingCustomRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        localStorage.setItem('my_custom_routines', JSON.stringify([...existingCustomRoutines, newRoutine]));

        alert('루틴이 생성되었습니다!');
        setIsSelectionMode(false);
        setSelectedDrills(new Set());
        loadRoutines(); // Reload to show the new routine immediately
    };

    useEffect(() => {
        if (user) {
            loadRoutines();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleRoutineClick = (routine: DrillRoutine) => {
        navigate(`/my-routines/${routine.id}`);
    };

    const handleStartRoutine = () => {
        if (previewRoutine) {
            setActiveRoutine(previewRoutine);
            setPreviewRoutine(null);
        }
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
            notes: `[Routine Completed] ${activeRoutine.title} \n\n${activeRoutine.description || ''} `,
            techniques: activeRoutine.drills?.map(item => item.title) || [],
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

        // 5. Ask if user wants to share to feed
        const shareToFeed = confirm(`루틴 완료!(+${xpEarned} XP) \n\n피드에 공유하시겠습니까 ? `);

        if (shareToFeed) {
            const { createFeedPost } = await import('../../lib/api');
            const feedContent = `💪 훈련 루틴 완료!\n\n${activeRoutine.title} \n소요 시간: ${durationMinutes} 분\n획득 XP: +${xpEarned} \n\n${activeRoutine.drills && activeRoutine.drills.length > 0 ? `완료한 드릴: ${activeRoutine.drills.slice(0, 3).map(item => item.title).join(', ')}${activeRoutine.drills.length > 3 ? ` 외 ${activeRoutine.drills.length - 3}개` : ''}` : ''} `;

            await createFeedPost({
                userId: user.id,
                content: feedContent,
                type: 'routine',
                metadata: {
                    routineTitle: activeRoutine.title,
                    durationMinutes,
                    xpEarned,
                    drillCount: activeRoutine.drills?.length || 0
                }
            });

            alert('피드에 공유되었습니다!');
        }

        // 6. Show Success State
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

    // Routine Preview Modal
    if (previewRoutine) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-2xl my-8">
                    <div className="p-6 border-b border-slate-800">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-1">{previewRoutine.title}</h2>
                                <p className="text-slate-400">{previewRoutine.description}</p>
                            </div>
                            <button
                                onClick={() => setPreviewRoutine(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-400">
                            <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4" />
                                {previewRoutine.totalDurationMinutes}분
                            </div>
                            <div className="flex items-center gap-1">
                                <Dumbbell className="w-4 h-4" />
                                {previewRoutine.drillCount}개 드릴
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-white mb-2">포함된 드릴</h3>
                        {previewRoutine.drills?.map((drill, index) => (
                            <Link to={`/drills/${drill.id}`} key={index} className="flex items-center gap-4 bg-slate-800/50 p-3 rounded-xl border border-slate-800 hover:bg-slate-800 transition-colors">
                                <div className="w-20 h-12 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                    <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-medium text-sm truncate">{drill.title}</h4>
                                    <p className="text-slate-400 text-xs">{drill.length || '0:00'}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500" />
                            </Link>
                        ))}
                    </div>

                    <div className="p-6 border-t border-slate-800 flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setPreviewRoutine(null)}
                        >
                            닫기
                        </Button>
                        <Button
                            className="flex-1 bg-blue-600 hover:bg-blue-700"
                            onClick={handleStartRoutine}
                        >
                            <Play className="w-4 h-4 mr-2 fill-current" />
                            루틴 시작하기
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (completedRoutineData) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-10 h-10 text-green-500" />
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
        <div className="max-w-2xl mx-auto space-y-8">
            {/* Saved Drills Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white">저장된 드릴</h2>
                    {savedDrills.length > 0 && (
                        <div className="flex gap-2">
                            {isSelectionMode ? (
                                <>
                                    <button
                                        onClick={() => {
                                            setIsSelectionMode(false);
                                            setSelectedDrills(new Set());
                                        }}
                                        className="text-sm text-slate-400 hover:text-white transition-colors"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={handleCreateRoutine}
                                        disabled={selectedDrills.size === 0}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${selectedDrills.size > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} `}
                                    >
                                        루틴 생성 ({selectedDrills.size})
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsSelectionMode(true)}
                                    className="px-3 py-1.5 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                    나만의 루틴 만들기
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {savedDrills.length === 0 ? (
                    <div className="text-center py-8 bg-slate-900 rounded-2xl border border-slate-800">
                        <p className="text-slate-400 text-sm">저장된 드릴이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        {savedDrills.map((drill: any) => (
                            <div key={drill.id} className="relative group">
                                <Link to={`/drills/${drill.id}`} className="block">
                                    <div className={`bg-slate-900 rounded-xl overflow-hidden border transition-colors ${isSelectionMode && selectedDrills.has(drill.id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-800 hover:border-slate-700'} `}>
                                        <div className="aspect-video bg-slate-800 relative">
                                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {drill.length || '0:00'}
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <h3 className="text-white font-bold text-sm line-clamp-1 mb-1">{drill.title}</h3>
                                            <p className="text-slate-400 text-xs">{drill.creatorName}</p>
                                        </div>
                                    </div>
                                </Link>

                                {isSelectionMode && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            toggleDrillSelection(drill.id);
                                        }}
                                        className="absolute inset-0 z-10 flex items-start justify-end p-2"
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${selectedDrills.has(drill.id) ? 'bg-blue-600 border-blue-600' : 'bg-black/40 border-white/50'} `}>
                                            {selectedDrills.has(drill.id) && <Check className="w-4 h-4 text-white" />}
                                        </div>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-6">
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
                                                {routine.totalDurationMinutes || 0}분
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Dumbbell className="w-3 h-3" />
                                                {routine.drillCount || 0}개 드릴
                                            </div>
                                        </div>

                                        <Button
                                            onClick={() => handleRoutineClick(routine)}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 h-auto text-sm flex items-center justify-center gap-2"
                                        >
                                            <Play className="w-4 h-4 fill-current" />
                                            루틴 보기
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
