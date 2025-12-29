import React, { useState, useEffect } from 'react';
import { PlaySquare, Clock, Dumbbell, Check, CalendarCheck, MousePointerClick, Trash2, X, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getUserRoutines, getCompletedRoutinesToday, getUserSavedDrills, toggleDrillSave } from '../../lib/api';
import { DrillRoutine, Drill, Difficulty, VideoCategory } from '../../types';
import { Button } from '../Button';
import { WeeklyRoutinePlanner } from './WeeklyRoutinePlanner';
import { supabase } from '../../lib/supabase';
import { ErrorScreen } from '../ErrorScreen';

export const TrainingRoutinesTab: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savedDrills, setSavedDrills] = useState<Drill[]>([]);
    const [completedRoutineIds, setCompletedRoutineIds] = useState<Set<string>>(new Set());

    // Custom Routine Creation State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedDrills, setSelectedDrills] = useState<Set<string>>(new Set());

    // Click-to-Place State
    const [selectedRoutineForPlacement, setSelectedRoutineForPlacement] = useState<DrillRoutine | null>(null);
    const [selectedDayForPlacement, setSelectedDayForPlacement] = useState<string | null>(null);

    // Show More/Less State
    const [showAllRoutines, setShowAllRoutines] = useState(false);

    // Collapsible Create Section State
    const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);

    useEffect(() => {
        const loadSavedDrills = async () => {
            console.log('=== loadSavedDrills called ===', { hasUser: !!user });

            // First, load from localStorage immediately for instant display
            const localSaved = JSON.parse(localStorage.getItem('saved_drills') || '[]');
            setSavedDrills(localSaved);

            if (user) {
                try {
                    const drills = await getUserSavedDrills(user.id);

                    // Only update if DB returned data
                    if (drills && drills.length > 0) {
                        setSavedDrills(drills);
                        // Sync to localStorage
                        localStorage.setItem('saved_drills', JSON.stringify(drills));
                    } else if (localSaved.length === 0) {
                        // If both DB and localStorage are empty, show empty state
                        setSavedDrills([]);
                    }
                    // If DB is empty but localStorage has data, keep localStorage data
                } catch (error) {
                    console.error('Error loading saved drills from DB:', error);
                    // Keep using localStorage data on error
                }
            }
        };

        loadSavedDrills();

        // Reload when window regains focus (user comes back from drill page)
        const handleFocus = () => {
            loadSavedDrills();
        };

        // Reload when localStorage changes (from other tabs or components)
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'saved_drills') {
                loadSavedDrills();
            }
        };

        // Custom event for same-tab updates
        const handleCustomStorage = () => {
            loadSavedDrills();
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('storage', handleCustomStorage);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('storage', handleCustomStorage);
        };
    }, [user]);

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
        try {
            setLoading(true);
            setError(null);

            // Load all user routines (purchased + created)
            const result = await getUserRoutines(user.id);
            if (result.error) throw result.error;

            // Load custom routines from LocalStorage
            const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');

            // Merge and set
            if (result.data) {
                const combined = [...customRoutines, ...result.data];
                // Shuffle for dynamic display
                for (let i = combined.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [combined[i], combined[j]] = [combined[j], combined[i]];
                }
                setRoutines(combined);
            } else {
                setRoutines(customRoutines);
            }

            // Load completed routines for today
            const completedIds = await getCompletedRoutinesToday(user.id);
            setCompletedRoutineIds(new Set(completedIds));
        } catch (err: any) {
            console.error('Error loading routines:', err);
            setError(err.message || '훈련 루틴을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const { success } = useToast();

    useEffect(() => {
        if (user) {
            loadRoutines();
        } else {
            setLoading(false);
        }
    }, [user]);

    const handleCreateRoutine = () => {
        if (!user) {
            navigate('/login');
            return;
        }

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
            totalDurationMinutes: selectedDrillsList.length // 1 drill = 1 minute rule
        };

        const existingCustomRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        localStorage.setItem('my_custom_routines', JSON.stringify([...existingCustomRoutines, newRoutine]));

        success('루틴이 생성되었습니다!');
        setIsSelectionMode(false);
        setSelectedDrills(new Set());
        loadRoutines(); // Reload to show the new routine immediately
    };

    const handleRoutineClick = (routine: DrillRoutine) => {
        if (selectedDayForPlacement) {
            // Case: Day First -> Add routine to that day
            const savedSchedule = JSON.parse(localStorage.getItem('weekly_routine_schedule') || '{"월":[],"화":[],"수":[],"목":[],"금":[],"토":[],"일":[]}');
            const currentDayRoutines = savedSchedule[selectedDayForPlacement] || [];

            if (currentDayRoutines.some((r: any) => r.id === routine.id)) {
                alert('이미 해당 요일에 추가된 루틴입니다.');
                return;
            }

            const newSchedule = {
                ...savedSchedule,
                [selectedDayForPlacement]: [...currentDayRoutines, routine]
            };

            localStorage.setItem('weekly_routine_schedule', JSON.stringify(newSchedule));
            window.dispatchEvent(new Event('weekly_schedule_update'));

            success(`${selectedDayForPlacement}요일에 루틴이 추가되었습니다.`);
            setSelectedDayForPlacement(null);
            return;
        }

        if (selectedRoutineForPlacement?.id === routine.id) {
            navigate(`/my-routines/${routine.id}`);
        } else {
            setSelectedRoutineForPlacement(routine);
            setSelectedDayForPlacement(null); // Ensure mutually exclusive
        }
    };

    const handleDragStart = (e: React.DragEvent, routine: DrillRoutine) => {
        e.dataTransfer.setData('application/json', JSON.stringify(routine));
        e.dataTransfer.effectAllowed = 'copy';

        if (e.currentTarget) {
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            const clone = target.cloneNode(true) as HTMLElement;
            clone.style.position = 'absolute';
            clone.style.top = '-9999px';
            clone.style.left = '-9999px';
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.zIndex = '1000';
            clone.style.pointerEvents = 'none';
            clone.style.transition = 'none';
            clone.style.transform = 'none';
            clone.classList.add('bg-slate-900');

            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(clone, offsetX, offsetY);

            setTimeout(() => {
                if (document.body.contains(clone)) {
                    document.body.removeChild(clone);
                }
            }, 0);
        }
    };

    const handleRoutineAdded = (_day: string) => {
        // Optional: Show a toast or feedback
        // We keep the selection active for multiple placements
    };

    const handleDeleteRoutine = async (e: React.MouseEvent, routineId: string) => {
        e.stopPropagation(); // Prevent navigation

        if (!confirm('이 루틴을 삭제하시겠습니까?')) {
            return;
        }

        // Check if it's a custom routine
        if (routineId.startsWith('custom-')) {
            // Remove from localStorage
            const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
            const updatedRoutines = customRoutines.filter((r: DrillRoutine) => r.id !== routineId);
            localStorage.setItem('my_custom_routines', JSON.stringify(updatedRoutines));
        } else {
            // For purchased routines, remove from user_routines table
            if (user) {
                const { error } = await supabase
                    .from('user_routines')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('routine_id', routineId);

                if (error) {
                    console.error('Error deleting routine:', error);
                    alert('루틴 삭제에 실패했습니다.');
                    return;
                }
            }
        }

        // Update state
        setRoutines(prev => prev.filter(r => r.id !== routineId));
    };

    const ROUTINES_DISPLAY_LIMIT = 6;
    const displayedRoutines = showAllRoutines ? routines : routines.slice(0, ROUTINES_DISPLAY_LIMIT);

    if (error) {
        return <ErrorScreen error={error} resetMessage="훈련 루틴 목록을 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }

    return (
        <div className="space-y-8 min-h-screen" onClick={() => {
            setSelectedRoutineForPlacement(null);
            setSelectedDayForPlacement(null);
        }}>

            {/* Floating Instruction for Day selection */}
            {selectedDayForPlacement && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce font-bold flex items-center gap-4">
                    <span>'{selectedDayForPlacement}'요일에 추가할 루틴을 선택하세요!</span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayForPlacement(null);
                        }}
                        className="bg-white/20 hover:bg-white/30 rounded-full p-1"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
            {/* Create Routine Section - MOVED TO TOP */}
            <section className="bg-slate-900 rounded-2xl border border-slate-800 transition-all">
                <div
                    className="p-4 sm:p-6 flex items-center justify-between cursor-pointer md:cursor-default"
                    onClick={() => setIsCreateSectionOpen(!isCreateSectionOpen)}
                >
                    <div className="flex items-center gap-2">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">새 루틴 만들기</h2>
                            <p className="text-slate-400 text-sm break-keep">저장된 드릴을 조합하여 새로운 루틴을 생성하세요.</p>
                        </div>
                    </div>
                </div>

                {/* Collapsible Content */}
                <div className={`${isCreateSectionOpen ? 'block' : 'hidden md:block'} px-4 sm:px-6 pb-6`}>
                    <div className="flex justify-end mb-6">
                        {isSelectionMode ? (
                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsSelectionMode(false);
                                        setSelectedDrills(new Set());
                                    }}
                                    className="flex-1 sm:flex-none"
                                >
                                    취소
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateRoutine();
                                    }}
                                    disabled={selectedDrills.size === 0}
                                    className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                                >
                                    {selectedDrills.size}개 선택됨 - 루틴 생성
                                </Button>
                            </div>
                        ) : (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSelectionMode(true);
                                }}
                                className="bg-slate-800 hover:bg-slate-700 w-full sm:w-auto whitespace-nowrap"
                            >
                                드릴 선택하기
                            </Button>
                        )}
                    </div>

                    {savedDrills.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedDrills.map((drill) => {
                                const cardContent = (
                                    <>
                                        <div className="w-20 h-12 bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                            {isSelectionMode && selectedDrills.has(drill.id) && (
                                                <div className="absolute inset-0 bg-blue-500/50 flex items-center justify-center">
                                                    <Check className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-medium text-sm truncate">{drill.title}</h4>
                                            <p className="text-slate-400 text-xs">{drill.length || '0:00'}</p>
                                        </div>
                                    </>
                                );

                                const handleDeleteDrill = async (e: React.MouseEvent, drillId: string) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (confirm('이 드릴을 저장 목록에서 삭제하시겠습니까?')) {
                                        // Optimistic update
                                        const updatedDrills = savedDrills.filter(d => d.id !== drillId);
                                        setSavedDrills(updatedDrills);
                                        localStorage.setItem('saved_drills', JSON.stringify(updatedDrills));

                                        if (user) {
                                            const { error } = await toggleDrillSave(user.id, drillId);
                                            if (error) {
                                                console.error('Error removing saved drill:', error);
                                                alert('삭제에 실패했습니다.');
                                                // Revert
                                                setSavedDrills(savedDrills);
                                                localStorage.setItem('saved_drills', JSON.stringify(savedDrills));
                                            }
                                        }
                                    }
                                };

                                return isSelectionMode ? (
                                    <div
                                        key={drill.id}
                                        onClick={() => toggleDrillSelection(drill.id)}
                                        className={`
                                            relative flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer
                                            ${selectedDrills.has(drill.id)
                                                ? 'bg-blue-900/20 border-blue-500'
                                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                                            }
                                        `}
                                    >
                                        {cardContent}
                                    </div>
                                ) : (
                                    <div key={drill.id} className="relative group">
                                        <Link
                                            to={`/drills/${drill.id}?source=saved`}
                                            className="relative flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer bg-slate-800/50 border-slate-800 hover:border-slate-600"
                                        >
                                            {cardContent}
                                        </Link>

                                        <button
                                            onClick={(e) => handleDeleteDrill(e, drill.id)}
                                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="삭제"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-center bg-slate-800/20 rounded-xl border border-slate-800/50">
                            <p className="text-slate-500 text-sm mb-4">저장된 드릴이 없습니다.</p>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/drills');
                                }}
                                className="flex items-center gap-2"
                            >
                                <Zap className="w-4 h-4" />
                                드릴 찾아보기
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* My Routines Section */}
            <section onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <PlaySquare className="w-5 h-5 text-blue-500" />
                        나의 훈련 루틴
                    </h2>
                    {selectedRoutineForPlacement && (
                        <div className="text-sm text-blue-400 font-bold animate-pulse flex items-center gap-2">
                            <MousePointerClick className="w-4 h-4" />
                            배치할 요일을 선택하세요
                            <button
                                onClick={() => setSelectedRoutineForPlacement(null)}
                                className="text-slate-500 hover:text-white underline ml-2"
                            >
                                취소
                            </button>
                        </div>
                    )}
                    {selectedDayForPlacement && (
                        <div className="text-sm text-purple-400 font-bold animate-pulse flex items-center gap-2">
                            <MousePointerClick className="w-4 h-4" />
                            추가할 루틴을 선택하세요
                            <button
                                onClick={() => setSelectedDayForPlacement(null)}
                                className="text-slate-500 hover:text-white underline ml-2"
                            >
                                취소
                            </button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-500">로딩 중...</div>
                ) : routines.length > 0 ? (
                    <>
                        {/* Mobile List View */}
                        <div className="md:hidden space-y-3">
                            {displayedRoutines.map((routine) => {
                                const isCompleted = completedRoutineIds.has(routine.id);
                                const isSelected = selectedRoutineForPlacement?.id === routine.id;

                                return (
                                    <div
                                        key={routine.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, routine)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoutineClick(routine);
                                        }}
                                        className={`bg-slate-900 rounded-xl border transition-all cursor-pointer group relative p-4
                                            ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}
                                            ${isCompleted ? 'border-green-500/50' : 'border-slate-800 hover:border-blue-500/50'}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icon */}
                                            <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Dumbbell className="w-6 h-6 text-slate-600" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold text-sm truncate ${isCompleted ? 'text-green-400' : 'text-white'}`}>
                                                        {routine.title}
                                                    </h3>
                                                    {isCompleted && (
                                                        <div className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
                                                            <CalendarCheck className="w-2.5 h-2.5" />
                                                            완료
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-1">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {routine.totalDurationMinutes}분
                                                    </span>
                                                    <span>{routine.drillCount}개 드릴</span>
                                                </div>
                                                {/* Creator Info */}
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // if (routine.creatorId) navigate(`/creator/${routine.creatorId}`);
                                                    }}
                                                    className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-white transition-colors"
                                                >
                                                    <img
                                                        src={(routine as any).creatorImage || `https://ui-avatars.com/api/?name=${routine.creatorName}&background=random`}
                                                        className="w-4 h-4 rounded-full"
                                                        alt={routine.creatorName}
                                                    />
                                                    <span className="truncate">{routine.creatorName}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons - Only Delete */}
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button
                                                    onClick={(e) => handleDeleteRoutine(e, routine.id)}
                                                    className="p-2 rounded-full bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all"
                                                    title="루틴 삭제"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Card View */}
                        <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {displayedRoutines.map((routine) => {
                                const isCompleted = completedRoutineIds.has(routine.id);
                                const isSelected = selectedRoutineForPlacement?.id === routine.id;

                                return (
                                    <div
                                        key={routine.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, routine)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleRoutineClick(routine);
                                        }}
                                        className={`bg-slate-900 rounded-xl overflow-hidden border transition-all cursor-pointer group relative 
                                            ${isSelected ? 'ring-2 ring-blue-500 border-transparent shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}
                                            ${isCompleted ? 'border-green-500/50' : 'border-slate-800 hover:border-blue-500/50'}
                                        `}
                                    >

                                        {/* Top Right Actions (Completed Badge & Delete) */}
                                        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                                            {isCompleted && (
                                                <div className="bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-lg backdrop-blur-sm">
                                                    <CalendarCheck className="w-3 h-3" />
                                                    <span>완료</span>
                                                </div>
                                            )}

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => handleDeleteRoutine(e, routine.id)}
                                                className="p-1.5 bg-slate-800/80 hover:bg-red-600 text-slate-400 hover:text-white rounded-full transition-all shadow-lg backdrop-blur-sm"
                                                title="루틴 삭제"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        <div className="aspect-video bg-slate-800 relative">
                                            {routine.thumbnailUrl ? (
                                                <img
                                                    draggable={false}
                                                    src={routine.thumbnailUrl}
                                                    alt={routine.title}
                                                    className={`w-full h-full object-cover transition-transform duration-500 ${isCompleted ? 'grayscale-[0.5]' : 'group-hover:scale-105'
                                                        }`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                                    <Dumbbell className="w-8 h-8" />
                                                </div>
                                            )}
                                            <div className={`absolute inset-0 transition-colors ${isCompleted ? 'bg-black/40' : 'bg-black/20 group-hover:bg-black/0'
                                                }`} />

                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {routine.totalDurationMinutes}분
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className={`font-bold mb-1 transition-colors ${isCompleted ? 'text-green-400' : 'text-white group-hover:text-blue-400'
                                                }`}>
                                                {routine.title}
                                            </h3>
                                            <p className="text-slate-400 text-sm line-clamp-1 mb-3">{routine.description}</p>
                                            <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                                                <span>{routine.drillCount}개 드릴</span>
                                                <span>{new Date(routine.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            {/* Creator Info Footer */}
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // if (routine.creatorId) navigate(`/creator/${routine.creatorId}`);
                                                }}
                                                className="pt-3 border-t border-slate-800/50 flex items-center justify-between group/creator"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={(routine as any).creatorImage || `https://ui-avatars.com/api/?name=${routine.creatorName}&background=random`}
                                                        className="w-6 h-6 rounded-full ring-1 ring-slate-800 group-hover/creator:ring-blue-500 transition-all"
                                                        alt={routine.creatorName}
                                                    />
                                                    <span className="text-xs font-semibold text-slate-400 group-hover/creator:text-white transition-colors">{routine.creatorName}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded tracking-wider uppercase">INSTRUCTOR</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {routines.length > ROUTINES_DISPLAY_LIMIT && (
                            <div className="mt-6 text-center">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowAllRoutines(!showAllRoutines)}
                                    className="min-w-[200px]"
                                >
                                    {showAllRoutines ? '접기' : `더보기 (${routines.length - ROUTINES_DISPLAY_LIMIT}개 더)`}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                        <Dumbbell className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 mb-2">아직 생성된 루틴이 없습니다.</p>
                        <p className="text-sm text-slate-500 mb-6">저장된 드릴을 선택하여 나만의 루틴을 만들어보세요!</p>
                        <Button
                            onClick={() => navigate('/drills')}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                            드릴 탐색하러 가기
                        </Button>
                    </div>
                )}
            </section>

            {/* Weekly Planner - MOVED TO BOTTOM */}
            <WeeklyRoutinePlanner
                selectedRoutine={selectedRoutineForPlacement}
                onAddToDay={handleRoutineAdded}
                selectedDay={selectedDayForPlacement}
                onSelectDay={(day) => {
                    setSelectedDayForPlacement(day);
                    setSelectedRoutineForPlacement(null); // Mutually exclusive
                }}
            />
        </div>
    );
};
