import React, { useState, useEffect } from 'react';
import { PlaySquare, Clock, Dumbbell, Check, MousePointerClick, Trash2, X, ChevronDown, ChevronUp, Zap, Calendar, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { getUserSavedDrills, toggleDrillSave } from '../../lib/api';
import { DrillRoutine, Drill, Difficulty, VideoCategory } from '../../types';
import { Button } from '../Button';
import { WeeklyRoutinePlanner } from './WeeklyRoutinePlanner';
import { supabase } from '../../lib/supabase';
import { ErrorScreen } from '../ErrorScreen';
import { Modal } from '../Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { PromptModal } from '../common/PromptModal';

const ShareModal = React.lazy(() => import('../social/ShareModal'));


export const TrainingRoutinesTab: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [savedDrills, setSavedDrills] = useState<Drill[]>([]);


    // Custom Routine Creation State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedDrills, setSelectedDrills] = useState<Set<string>>(new Set());
    const [selectedDrillsMap, setSelectedDrillsMap] = useState<Map<string, Drill>>(new Map());

    // Click-to-Place State
    const [selectedRoutineForPlacement, setSelectedRoutineForPlacement] = useState<DrillRoutine | null>(null);
    const [selectedDayForPlacement, setSelectedDayForPlacement] = useState<string | null>(null);

    // Show More/Less State
    const [showAllRoutines, setShowAllRoutines] = useState(false);

    // Collapsible Create Section State
    const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);

    // Premium Modal State for non-logged-in users
    const [showPremiumModal, setShowPremiumModal] = useState(false);

    // Custom Modal States
    const [isCreatePromptOpen, setIsCreatePromptOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [routineToShare, setRoutineToShare] = useState<DrillRoutine | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    useEffect(() => {
        const loadSavedDrills = async () => {
            const localSaved = JSON.parse(localStorage.getItem('saved_drills') || '[]');
            setSavedDrills(localSaved);

            if (user) {
                try {
                    const drills = await getUserSavedDrills(user.id);
                    if (drills && drills.length > 0) {
                        setSavedDrills(drills);
                        localStorage.setItem('saved_drills', JSON.stringify(drills));
                    } else if (localSaved.length === 0) {
                        setSavedDrills([]);
                    }
                } catch (error) {
                    console.error('Error loading saved drills from DB:', error);
                }
            } else {
                // For non-logged-in users
                // If we already have saved drills in localStorage, use them and don't fetch random ones
                // This prevents the drills from changing (and clearing selection) when window focus changes
                if (localSaved.length > 0) {
                    setSavedDrills(localSaved);
                    setLoading(false);
                    return;
                }

                // fetch 3 random drills as demo ONLY if storage is empty
                try {
                    const { data: randomDrills, error } = await supabase
                        .from('drills')
                        .select('*')
                        .limit(50);

                    if (!error && randomDrills && randomDrills.length > 0) {
                        const creatorIds = [...new Set(randomDrills.map((d: any) => d.creator_id).filter(Boolean))];

                        // Fetch creator details directly from users table
                        let creatorsMap: Record<string, { name: string, avatarUrl: string }> = {};
                        if (creatorIds.length > 0) {
                            const { data: users } = await supabase
                                .from('users')
                                .select('id, name, avatar_url')
                                .in('id', creatorIds);

                            if (users) {
                                users.forEach((u: any) => {
                                    creatorsMap[u.id] = { name: u.name, avatarUrl: u.avatar_url };
                                });
                            }
                        }

                        const enrichedDrills = randomDrills.map((d: any) => ({
                            id: d.id,
                            title: d.title,
                            description: d.description,
                            creatorId: d.creator_id,
                            creatorName: creatorsMap[d.creator_id]?.name || 'Instructor',
                            creatorProfileImage: creatorsMap[d.creator_id]?.avatarUrl || '',
                            category: d.category,
                            difficulty: d.difficulty,
                            thumbnailUrl: d.thumbnail_url,
                            videoUrl: d.video_url,
                            vimeoUrl: d.vimeo_url,
                            descriptionVideoUrl: d.description_video_url,
                            views: d.views || 0,
                            duration: d.duration || '0:00',
                            price: d.price || 0,
                            likes: d.likes || 0,
                            createdAt: d.created_at,
                            tags: d.tags || [],
                            aspectRatio: '9:16' as const,
                            durationMinutes: 0
                        }));

                        const shuffled = [...enrichedDrills].sort(() => Math.random() - 0.5);
                        const randomThree = shuffled.slice(0, 3);
                        setSavedDrills(randomThree);
                        // Save to local storage so they persist
                        localStorage.setItem('saved_drills', JSON.stringify(randomThree));
                    }
                } catch (error) {
                    console.error('Error loading random drills:', error);
                }
            }
        };

        loadSavedDrills();

        const handleFocus = () => loadSavedDrills();
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'saved_drills') loadSavedDrills();
        };
        const handleCustomStorage = () => loadSavedDrills();

        window.addEventListener('focus', handleFocus);
        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('storage', handleCustomStorage);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('storage', handleCustomStorage);
        };
    }, [user]);

    const toggleDrillSelection = (drill: Drill) => {
        const drillId = drill.id;
        const newSelected = new Set(selectedDrills);
        const newMap = new Map(selectedDrillsMap);

        if (newSelected.has(drillId)) {
            newSelected.delete(drillId);
            newMap.delete(drillId);
        } else {
            newSelected.add(drillId);
            newMap.set(drillId, drill);
        }
        setSelectedDrills(newSelected);
        setSelectedDrillsMap(newMap);
    };

    const loadRoutines = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!user) {
                // For non-logged-in users, fetch random routines as demo
                const { data: publicRoutines, error: publicError } = await supabase
                    .from('routines')
                    .select('*')
                    .limit(20);

                let enrichedPublicRoutines: any[] = [];

                if (!publicError && publicRoutines) {
                    // Fetch creator details manually
                    const creatorIds = [...new Set(publicRoutines.map((r: any) => r.creator_id).filter(Boolean))];
                    let creatorsMap: Record<string, { name: string, avatarUrl: string }> = {};

                    if (creatorIds.length > 0) {
                        const { data: users } = await supabase
                            .from('users')
                            .select('id, name, avatar_url')
                            .in('id', creatorIds);

                        if (users) {
                            users.forEach((u: any) => {
                                creatorsMap[u.id] = { name: u.name, avatarUrl: u.avatar_url };
                            });
                        }
                    }

                    // Shuffle and pick 3
                    const shuffled = [...publicRoutines].sort(() => Math.random() - 0.5);
                    enrichedPublicRoutines = shuffled.slice(0, 3).map(r => ({
                        ...r,
                        // Ensure we use camelCase for internal use if needed, but Routine type might match DB? 
                        // Let's manually map important fields to stay safe
                        id: r.id,
                        title: r.title,
                        description: r.description,
                        thumbnailUrl: r.thumbnail_url || '', // Fix thumbnail
                        difficulty: r.difficulty,
                        category: r.category,
                        totalDurationMinutes: r.total_duration_minutes || r.duration_minutes || 0,
                        drillCount: r.drill_count || 0,
                        creatorId: r.creator_id,
                        // Use fetched name or fallback
                        creatorName: creatorsMap[r.creator_id]?.name || 'Instructor',
                        creatorProfileImage: creatorsMap[r.creator_id]?.avatarUrl || '',
                        price: r.price || 0,
                        views: r.views || 0,
                        createdAt: r.created_at,
                        drills: [] // Demo routines don't need drills loaded immediately
                    }));
                }

                // Load and Fix Custom Routines
                const localCustomRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
                const fixedCustomRoutines = localCustomRoutines.map((r: any) => ({
                    ...r,
                    // Force 'Guest' if currently a guest, fixing stale 'Me' data
                    creatorName: 'Guest',
                    creatorId: 'guest'
                }));

                const combined = [...fixedCustomRoutines, ...enrichedPublicRoutines];
                // Sort by creation date new -> old
                combined.sort((a: any, b: any) => {
                    const timeA = new Date(a.createdAt || 0).getTime();
                    const timeB = new Date(b.createdAt || 0).getTime();
                    return timeB - timeA;
                });

                setRoutines(combined);
            } else {
                // Logged in user logic
                const { getUserRoutines } = await import('../../lib/api');
                const result = await getUserRoutines(user.id);
                if (result.error) throw result.error;

                let customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');

                // Fetch real user profile from DB to get correct avatar
                const { data: userProfile } = await supabase
                    .from('users')
                    .select('name, avatar_url')
                    .eq('id', user.id)
                    .single();

                // Update local custom routines to belong to the logged-in user
                customRoutines = customRoutines.map((r: any) => ({
                    ...r,
                    creatorId: user.id,
                    creatorName: userProfile?.name || user.user_metadata?.name || 'User',
                    creatorProfileImage: userProfile?.avatar_url || user.user_metadata?.avatar_url || ''
                }));
                localStorage.setItem('my_custom_routines', JSON.stringify(customRoutines));

                if (result.data) {
                    const combined = [...customRoutines, ...result.data];
                    // Sort by creation date new -> old
                    combined.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setRoutines(combined);
                } else {
                    setRoutines(customRoutines);
                }
            }
        } catch (err: any) {
            console.error('Error loading routines:', err);
            setError(err.message || '훈련 루틴을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const { success, error: toastError } = useToast();

    useEffect(() => {
        loadRoutines();
    }, [user]);

    const handleCreateRoutine = () => {
        setIsCreatePromptOpen(true);
    };

    const handleCreateRoutineSubmit = (routineName: string) => {
        setIsCreatePromptOpen(false);
        if (!routineName) return;

        const selectedDrillsList = Array.from(selectedDrillsMap.values());

        if (selectedDrillsList.length === 0) {
            toastError('최소 1개 이상의 드릴을 선택해주세요.');
            return;
        }

        const totalDurationSeconds = selectedDrillsList.reduce((acc: number, drill: Drill) => {
            const duration = drill.duration || '0:00';
            const [min, sec] = duration.split(':').map(Number);
            return acc + (isNaN(min) ? 0 : min) * 60 + (isNaN(sec) ? 0 : sec);
        }, 0);
        const totalDurationMinutes = Math.ceil(totalDurationSeconds / 60);

        const newRoutine: DrillRoutine = {
            id: `custom-${Date.now()}`,
            title: routineName,
            description: '나만의 커스텀 루틴',
            creatorId: user?.id || 'guest',
            creatorName: user?.user_metadata?.name || 'Guest',
            thumbnailUrl: selectedDrillsList[0]?.thumbnailUrl || '',
            price: 0,
            views: 0,
            drillCount: selectedDrillsList.length,
            drills: selectedDrillsList,
            createdAt: new Date().toISOString(),
            difficulty: Difficulty.Intermediate,
            category: VideoCategory.Standing,
            totalDurationMinutes: totalDurationMinutes
        };

        const existingCustomRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        localStorage.setItem('my_custom_routines', JSON.stringify([...existingCustomRoutines, newRoutine]));

        success('루틴이 생성되었습니다!');
        setIsSelectionMode(false);
        setSelectedDrills(new Set());
        loadRoutines();
    };

    const handleRoutineClick = (routine: DrillRoutine) => {
        if (isSelectionMode) {
            toastError('드릴 선택 모드 중에는 루틴을 선택할 수 없습니다.');
            return;
        }
        if (selectedDayForPlacement) {
            const savedSchedule = JSON.parse(localStorage.getItem('weekly_schedule_draft') || '{"월":[],"화":[],"수":[],"목":[],"금":[],"토":[],"일":[]}');
            const currentDayRoutines = savedSchedule[selectedDayForPlacement] || [];

            if (currentDayRoutines.some((r: any) => r.id === routine.id)) {
                toastError('이미 해당 요일에 추가된 루틴입니다.');
                return;
            }

            const newSchedule = {
                ...savedSchedule,
                [selectedDayForPlacement]: [...currentDayRoutines, routine]
            };

            localStorage.setItem('weekly_schedule_draft', JSON.stringify(newSchedule));
            window.dispatchEvent(new Event('weekly_schedule_update'));

            success(`${selectedDayForPlacement}요일에 루틴이 추가되었습니다.`);
            // Keep selection active for rapid add
            return;
        }

        if (selectedRoutineForPlacement?.id === routine.id) {
            if (String(routine.id).startsWith('custom-')) {
                navigate(`/my-routines/${routine.id}`);
            } else {
                navigate(`/routines/${routine.id}`);
            }
        } else {
            setSelectedRoutineForPlacement(routine);
            setSelectedDayForPlacement(null);
        }
    };

    const handleDrillClick = (e: React.MouseEvent, drill: Drill) => {
        e.stopPropagation();
        e.preventDefault();

        if (selectedRoutineForPlacement) {
            toastError('루틴 배치 모드 중에는 드릴을 선택할 수 없습니다.');
            return;
        }

        // Check using current state directly
        if (isSelectionMode && selectedDrills.has(drill.id)) {
            // Already selected - navigate to drill reels context
            navigate('/drills', { state: { source: 'saved', drillId: drill.id } });
        } else {
            // Not in selection mode or not selected - toggle selection
            setIsSelectionMode(true);
            toggleDrillSelection(drill);
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
            Object.assign(clone.style, {
                position: 'absolute',
                top: '-9999px',
                left: '-9999px',
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                zIndex: '1000',
                pointerEvents: 'none',
                transition: 'none',
                transform: 'none'
            });
            clone.classList.add('bg-zinc-900'); // Updated to zinc

            document.body.appendChild(clone);
            e.dataTransfer.setDragImage(clone, offsetX, offsetY);

            setTimeout(() => {
                if (document.body.contains(clone)) document.body.removeChild(clone);
            }, 0);
        }
    };

    const handleRoutineAdded = (_day: string) => {
        // Clear routine selection after adding to a day
        setSelectedRoutineForPlacement(null);
    };

    const handleDeleteRoutine = (e: React.MouseEvent, routineId: string) => {
        e.stopPropagation();

        setConfirmConfig({
            isOpen: true,
            variant: 'danger',
            title: '루틴 삭제',
            message: '이 루틴을 정말 삭제하시겠습니까? 삭제된 루틴은 복구할 수 없습니다.',
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                if (routineId.startsWith('custom-')) {
                    const customRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
                    const updatedRoutines = customRoutines.filter((r: DrillRoutine) => r.id !== routineId);
                    localStorage.setItem('my_custom_routines', JSON.stringify(updatedRoutines));
                } else {
                    if (user) {
                        const { error } = await supabase
                            .from('user_routines')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('routine_id', routineId);

                        if (error) {
                            console.error('Error deleting routine:', error);
                            toastError('루틴 삭제에 실패했습니다.');
                            return;
                        }
                    }
                }
                setRoutines(prev => prev.filter(r => r.id !== routineId));
                success('루틴이 삭제되었습니다.');
            }
        });
    };

    const ROUTINES_DISPLAY_LIMIT = 6;
    const displayedRoutines = showAllRoutines ? routines : routines.slice(0, ROUTINES_DISPLAY_LIMIT);

    if (error) {
        return <ErrorScreen error={error} resetMessage="훈련 루틴 목록을 불러오는 중 오류가 발생했습니다." />;
    }

    return (
        <div
            className="space-y-8 min-h-screen pb-20"
            onClick={() => {
                if (selectedDayForPlacement || selectedRoutineForPlacement) {
                    setSelectedDayForPlacement(null);
                    setSelectedRoutineForPlacement(null);
                }
                if (isSelectionMode) {
                    setIsSelectionMode(false);
                    setSelectedDrills(new Set());
                }
            }}
        >
            {/* Contextual Action Bar */}
            {(selectedDayForPlacement || selectedRoutineForPlacement) && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300 w-[90%] max-w-md">
                    <div className="bg-zinc-900/90 backdrop-blur-md border border-violet-500/30 rounded-2xl shadow-2xl p-4 flex items-center justify-between gap-4 ring-1 ring-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 animate-pulse border border-white/10">
                                {selectedDayForPlacement ? <div className="text-white font-bold text-lg">{selectedDayForPlacement[0]}</div> : <Dumbbell className="w-5 h-5 text-white" />}
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-sm">
                                    {selectedDayForPlacement ? '루틴 선택 모드' : '배치할 요일 선택'}
                                </h3>
                                <p className="text-violet-200 text-xs">
                                    {selectedDayForPlacement
                                        ? `'${selectedDayForPlacement}'요일에 추가할 루틴을 선택하세요`
                                        : `루틴을 추가할 요일을 선택하세요`}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDayForPlacement(null);
                                setSelectedRoutineForPlacement(null);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-zinc-400" />
                        </button>
                    </div>
                </div>
            )}

            {/* Create Routine Section */}
            <section className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800/50 transition-all overflow-hidden relative group">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[80px] rounded-full pointer-events-none" />

                <div
                    className="p-6 sm:p-8 flex items-center justify-between cursor-pointer md:cursor-default"
                    onClick={() => setIsCreateSectionOpen(!isCreateSectionOpen)}
                >
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                            <Zap className="w-6 h-6 text-violet-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-zinc-50 mb-1 flex items-center gap-2">새 루틴 만들기</h2>
                            <p className="text-zinc-500 text-sm">저장된 드릴을 조합하여 새로운 루틴을 생성하세요.</p>
                        </div>
                    </div>
                    {/* Toggle Icon for Mobile */}
                    <div className="md:hidden text-zinc-500">
                        {isCreateSectionOpen ? <ChevronUp /> : <ChevronDown />}
                    </div>
                </div>

                {/* Collapsible Content */}
                <div className={`${isCreateSectionOpen ? 'block' : 'hidden md:block'} px-6 sm:px-8 pb-8 border-t border-zinc-800/50 pt-8`}>
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
                                    className="flex-1 sm:flex-none border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                                >
                                    취소
                                </Button>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCreateRoutine();
                                    }}
                                    disabled={selectedDrills.size === 0}
                                    className="bg-violet-600 hover:bg-violet-500 text-white font-bold border-none shadow-lg shadow-violet-900/40 flex-1 sm:flex-none"
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
                                className="bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300 w-full sm:w-auto whitespace-nowrap"
                            >
                                루틴 만들기
                            </Button>
                        )}
                    </div>

                    {savedDrills.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {savedDrills.map((drill) => {
                                const cardContent = (
                                    <>
                                        <div className="w-20 h-12 bg-zinc-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                            {isSelectionMode && selectedDrills.has(drill.id) && (
                                                <div className="absolute inset-0 bg-violet-600/50 flex items-center justify-center">
                                                    <Check className="w-6 h-6 text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-zinc-200 font-medium text-sm truncate">{drill.title}</h4>
                                            <p className="text-zinc-500 text-xs">{drill.length || '0:00'}</p>
                                        </div>
                                    </>
                                );

                                const handleDeleteDrill = (e: React.MouseEvent, drillId: string) => {
                                    e.preventDefault();
                                    e.stopPropagation();

                                    setConfirmConfig({
                                        isOpen: true,
                                        variant: 'danger',
                                        title: '드릴 삭제',
                                        message: '이 드릴을 저장 목록에서 삭제하시겠습니까?',
                                        onConfirm: async () => {
                                            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                            const updatedDrills = savedDrills.filter(d => d.id !== drillId);
                                            const originalDrills = [...savedDrills];
                                            setSavedDrills(updatedDrills);
                                            localStorage.setItem('saved_drills', JSON.stringify(updatedDrills));

                                            if (user) {
                                                const { error } = await toggleDrillSave(user.id, drillId);
                                                if (error) {
                                                    console.error('Error removing saved drill:', error);
                                                    toastError('삭제에 실패했습니다.');
                                                    setSavedDrills(originalDrills);
                                                    localStorage.setItem('saved_drills', JSON.stringify(originalDrills));
                                                } else {
                                                    success('저장된 드릴이 삭제되었습니다.');
                                                }
                                            }
                                        }
                                    });
                                };

                                const isSelected = selectedDrills.has(drill.id);

                                return (
                                    <div key={drill.id} className="relative group">
                                        <div
                                            onClick={(e) => handleDrillClick(e, drill)}
                                            className={`
                                                relative flex items-center gap-4 p-3 rounded-xl border transition-all cursor-pointer
                                                ${isSelected
                                                    ? 'bg-violet-900/20 border-violet-500 ring-2 ring-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.5)]'
                                                    : 'bg-zinc-800/50 border-zinc-800 hover:border-zinc-600'
                                                }
                                            `}
                                        >
                                            {cardContent}
                                        </div>

                                        {user && !isSelectionMode && (
                                            <button
                                                onClick={(e) => handleDeleteDrill(e, drill.id)}
                                                className="absolute top-2 right-2 p-1.5 bg-zinc-800/80 hover:bg-red-600 text-zinc-400 hover:text-white rounded-full transition-all shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                            <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                                <Zap className="w-8 h-8 text-zinc-600" />
                            </div>
                            <p className="text-zinc-400 font-bold mb-2">저장된 드릴이 없습니다.</p>
                            <p className="text-zinc-500 text-sm mb-6 max-w-xs mx-auto">드릴 페이지에서 마음에 드는 드릴을 저장하여 나만의 루틴을 만들어보세요.</p>
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/drills');
                                }}
                                className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full px-8 py-3 shadow-[0_10px_30px_rgba(124,58,237,0.2)] flex items-center gap-2 border-none"
                            >
                                <Zap className="w-4 h-4" />
                                드릴 찾아보기
                            </Button>
                        </div>
                    )}
                </div>
            </section>

            {/* My Routines Section */}
            <section>
                <div className="flex items-center justify-end mb-6">
                    <div className="flex flex-wrap items-center gap-3">
                        {user && (
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate('/my-schedule');
                                }}
                                variant="outline"
                                size="sm"
                                className="border-violet-500/30 text-violet-400 hover:bg-violet-500/10 hover:border-violet-500 flex items-center gap-2 rounded-full h-9"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>내 훈련 스케줄 보기</span>
                            </Button>
                        )}
                        {selectedRoutineForPlacement && (
                            <div className="text-sm text-violet-400 font-bold animate-pulse flex items-center gap-2 bg-violet-600/10 px-3 py-1.5 rounded-full border border-violet-500/30">
                                <MousePointerClick className="w-4 h-4" />
                                배치할 요일을 선택하세요
                            </div>
                        )}
                        {selectedDayForPlacement && (
                            <div className="text-sm text-violet-400 font-bold animate-pulse flex items-center gap-2 bg-violet-600/10 px-3 py-1.5 rounded-full border border-violet-500/30">
                                <MousePointerClick className="w-4 h-4" />
                                추가할 루틴을 선택하세요
                            </div>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-zinc-500">로딩 중...</div>
                ) : routines.length > 0 ? (
                    <>
                        {/* Mobile List View */}
                        <div className="md:hidden space-y-3">
                            {displayedRoutines.map((routine) => {

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
                                        className={`bg-zinc-900 rounded-xl border transition-all cursor-pointer group relative p-4
                                            ${isSelected ? 'ring-2 ring-violet-500 border-transparent' : ''}
                                            border-zinc-800 hover:border-violet-500/50
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icon */}
                                            <div className="w-16 h-20 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative border border-zinc-800 shadow-sm">
                                                {routine.thumbnailUrl ? (
                                                    <img src={routine.thumbnailUrl} alt={routine.title} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <PlaySquare className="w-6 h-6 text-zinc-700" />
                                                    </div>
                                                )}
                                                {/* Badge/Overlay removed */}
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className={`font-bold text-sm truncate text-zinc-100`}>
                                                        {routine.title}
                                                    </h3>
                                                    {/* Badge removed */}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-zinc-400 mb-2">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-violet-500" />
                                                        {routine.totalDurationMinutes || 0}분
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                                                        {routine.drillCount || 0}개 드릴
                                                    </span>
                                                </div>
                                                {/* Creator Info */}
                                                <div className="flex items-center gap-2 group/creator">
                                                    <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800 border border-zinc-700">
                                                        {routine.creatorProfileImage ? (
                                                            <img
                                                                src={routine.creatorProfileImage}
                                                                className="w-full h-full object-cover"
                                                                alt={routine.creatorName}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-zinc-500">
                                                                {routine.creatorName?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-[11px] font-medium text-zinc-500 group-hover/creator:text-zinc-300 transition-colors uppercase tracking-tight">{routine.creatorName}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            {user && (
                                                <div className="flex gap-2 flex-shrink-0">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setRoutineToShare(routine);
                                                            setIsShareModalOpen(true);
                                                        }}
                                                        className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-violet-500 hover:text-white transition-all"
                                                        title="루틴 공유"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteRoutine(e, routine.id)}
                                                        className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:bg-red-500 hover:text-white transition-all"
                                                        title="루틴 삭제"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop Card View */}
                        <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {displayedRoutines.map((routine) => {

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
                                        className={`bg-zinc-900 rounded-2xl overflow-hidden border transition-all cursor-pointer group relative 
                                            ${isSelected ? 'ring-2 ring-violet-500 border-transparent shadow-[0_0_15px_rgba(124,58,237,0.5)]' : ''}
                                            border-zinc-800 hover:border-violet-500/50
                                        `}
                                    >
                                        <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                                            {/* Badge removed as per request */}
                                            {user && (
                                                <>

                                                    <button
                                                        onClick={(e) => handleDeleteRoutine(e, routine.id)}
                                                        className="p-1.5 bg-zinc-800/80 hover:bg-red-600 text-zinc-400 hover:text-white rounded-full transition-all shadow-lg backdrop-blur-sm opacity-0 group-hover:opacity-100"
                                                        title="루틴 삭제"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <div className="aspect-video bg-zinc-800 relative">
                                            {routine.thumbnailUrl ? (
                                                <img
                                                    draggable={false}
                                                    src={routine.thumbnailUrl}
                                                    alt={routine.title}
                                                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105`}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/50">
                                                    <PlaySquare className="w-10 h-10 text-zinc-800 mb-2" />
                                                    <span className="text-[10px] font-bold text-zinc-700 uppercase tracking-widest">No Thumbnail</span>
                                                </div>
                                            )}
                                            <div className={`absolute inset-0 transition-colors bg-black/20 group-hover:bg-black/0`} />

                                            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {routine.totalDurationMinutes}분
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <h3 className={`font-bold mb-1 transition-colors text-zinc-100 group-hover:text-violet-400`}>
                                                {routine.title}
                                            </h3>
                                            <p className="text-xs text-zinc-500 mb-1.5 whitespace-pre-wrap">{routine.description}</p>
                                            <div className="flex items-center justify-between text-xs text-zinc-500 mb-3">
                                                <span>{routine.drillCount}개 드릴</span>
                                                <span>{new Date(routine.createdAt).toLocaleDateString()}</span>
                                            </div>
                                            <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between group/creator">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-800 overflow-hidden ring-1 ring-zinc-800 group-hover/creator:ring-violet-500/50 transition-all shadow-sm">
                                                        {routine.creatorProfileImage ? (
                                                            <img
                                                                src={routine.creatorProfileImage}
                                                                className="w-full h-full object-cover"
                                                                alt={routine.creatorName}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                                                {routine.creatorName?.charAt(0) || 'U'}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <span className="text-xs font-bold text-zinc-400 group-hover/creator:text-zinc-100 transition-colors tracking-tight">{routine.creatorName}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-violet-500 bg-violet-500/10 px-1.5 py-0.5 rounded tracking-wider uppercase">INSTRUCTOR</span>
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
                                    className="min-w-[200px] border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                                >
                                    {showAllRoutines ? '접기' : `더보기 (${routines.length - ROUTINES_DISPLAY_LIMIT}개 더)`}
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-16 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800 flex flex-col items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-zinc-800/50 flex items-center justify-center mb-6">
                            <Dumbbell className="w-10 h-10 text-zinc-600" />
                        </div>
                        <h3 className="text-zinc-200 font-bold text-lg mb-2">아직 생성된 루틴이 없습니다.</h3>
                        <p className="text-sm text-zinc-500 mb-8 max-w-sm">드릴을 선택하고 조합하여 나만의 최적화된 훈련 루틴을 계획해보세요!</p>
                        <Button
                            onClick={() => navigate('/library?tab=routines')}
                            className="bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full px-8 py-3 shadow-lg shadow-violet-900/30 border-none"
                        >
                            루틴 찾아보기
                        </Button>
                    </div>
                )}
            </section>

            {/* Weekly Planner */}
            <div className="relative">
                <div>
                    <WeeklyRoutinePlanner
                        selectedRoutine={selectedRoutineForPlacement}
                        onAddToDay={handleRoutineAdded}
                        selectedDay={selectedDayForPlacement}
                        isGuest={!user}
                        guestRoutines={routines}
                        onSelectDay={(day) => {
                            if (!selectedRoutineForPlacement) {
                                setSelectedDayForPlacement(day);
                            }
                        }}
                    />
                </div>

                {/* Social Proof Caption */}
                {!user && (
                    <div className="mt-6 text-center">
                        <p className="text-zinc-500 text-sm">
                            <span className="text-violet-400 font-bold">5,000명 이상</span>의 그래플러들이 이 플래너로 꾸준한 훈련을 이어가고 있습니다.
                        </p>
                    </div>
                )}
            </div>

            {/* Premium Modal */}
            <Modal
                isOpen={showPremiumModal}
                onClose={() => setShowPremiumModal(false)}
                title="훈련 시작하기"
                icon={Zap}
                iconColor="indigo"
                maxWidth="md"
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setShowPremiumModal(false)}
                            className="flex-1 border-zinc-700 hover:bg-zinc-800 text-zinc-400"
                        >
                            나중에 하기
                        </Button>
                        <Button
                            onClick={() => navigate('/login')}
                            className="flex-1 bg-violet-600 hover:bg-violet-500 text-zinc-50 font-bold rounded-full shadow-[0_10px_30px_rgba(124,58,237,0.3)] border-none"
                        >
                            로그인하고 루틴 시작
                        </Button>
                    </>
                }
            >
                <div className="text-center mb-6">
                    <p className="text-zinc-300 text-lg font-bold mb-2">
                        이 루틴으로 훈련을 시작하시겠습니까?
                    </p>
                    <p className="text-zinc-400 text-sm">
                        로그인하시면 모든 루틴을 무료로 시청하고<br />
                        나만의 훈련 계획을 세울 수 있습니다.
                    </p>
                </div>

                <div className="bg-zinc-800/50 rounded-xl p-4 mb-4 text-left border border-zinc-700">
                    <p className="text-zinc-200 font-semibold mb-3">포함된 혜택:</p>
                    <ul className="space-y-2.5 text-zinc-400 text-sm">
                        <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-violet-500" />
                            <span>모든 샘플 루틴 즉시 시청</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-violet-500" />
                            <span>나만의 커스텀 루틴 생성 및 저장</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="w-4 h-4 text-violet-500" />
                            <span>주간 훈련 플래너 사용 권한</span>
                        </li>
                    </ul>
                </div>
            </Modal>

            {/* Routine Name Prompt Modal */}
            <PromptModal
                isOpen={isCreatePromptOpen}
                onClose={() => setIsCreatePromptOpen(false)}
                onConfirm={handleCreateRoutineSubmit}
                title="새 루틴 만들기"
                message="루틴의 이름을 입력해주세요."
                placeholder="예: 월요일 오전 주짓수 드릴"
                confirmText="루틴 생성"
            />

            {/* Common Confirm Modal */}
            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmConfig.onConfirm}
                title={confirmConfig.title}
                message={confirmConfig.message}
                variant={confirmConfig.variant}
            />
            {/* Share Modal Portal */}
            <React.Suspense fallback={null}>
                {routineToShare && isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => {
                            setIsShareModalOpen(false);
                            setRoutineToShare(null);
                        }}
                        title={routineToShare.title}
                        text={routineToShare.description || `Check out this routine: ${routineToShare.title}`}
                        url={`${window.location.origin}/routines/${routineToShare.id}`}
                        imageUrl={routineToShare.thumbnailUrl}
                    />
                )}
            </React.Suspense>
        </div>
    );
};
