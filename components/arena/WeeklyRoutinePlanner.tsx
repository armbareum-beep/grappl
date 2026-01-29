import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DrillRoutine, WeeklySchedule, WeeklyRoutinePlan } from '../../types';
import { Calendar, Trash2, Clock, Play, Share2, Download, Save, FolderOpen, FilePlus, Dumbbell } from 'lucide-react';
import { toPng } from 'html-to-image';
import { ShareModal } from '../../components/social/ShareModal';
import { useAuth } from '../../contexts/AuthContext';
import {
    saveWeeklyRoutinePlan,
    listUserWeeklyRoutinePlans,
    getWeeklyRoutinePlan,
    deleteWeeklyRoutinePlan
} from '../../lib/api-weekly-routine';
import { SaveRoutineModal, LoadRoutineModal, WeeklyRoutineSaveData } from './WeeklyRoutineModals';
import { ConfirmModal } from '../common/ConfirmModal';
import { Modal } from '../Modal';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'];

interface WeeklyRoutinePlannerProps {
    selectedRoutine?: DrillRoutine | null;
    onAddToDay?: (day: string) => void;
    selectedDay?: string | null;
    onSelectDay?: (day: string) => void;
    isGuest?: boolean;
    guestRoutines?: DrillRoutine[];
}

export const WeeklyRoutinePlanner: React.FC<WeeklyRoutinePlannerProps> = ({
    selectedRoutine,
    onAddToDay,
    selectedDay,
    onSelectDay,
    isGuest = false,
    guestRoutines = []
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [schedule, setSchedule] = useState<WeeklySchedule>({
        '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': []
    });

    // Plan Management State
    const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);
    const [currentPlanTitle, setCurrentPlanTitle] = useState('나의 주간 루틴');
    const [savedPlans, setSavedPlans] = useState<WeeklyRoutinePlan[]>([]);

    // Modal States
    const [isNewConfirmOpen, setIsNewConfirmOpen] = useState(false); // Changed from isNewModalOpen
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
    const [isSavingPlan, setIsSavingPlan] = useState(false);

    // Mouse drag scroll state
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [dragDistance, setDragDistance] = useState(0);
    const [isSharing, setIsSharing] = useState(false);
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    // Start Routine Modal State
    const [isStartModalOpen, setIsStartModalOpen] = useState(false);
    const [startModalRoutines, setStartModalRoutines] = useState<DrillRoutine[]>([]);

    useEffect(() => {
        // Try to load from local storage first
        const saved = localStorage.getItem('weekly_schedule_draft');
        let loadedSchedule: WeeklySchedule | null = null;

        if (saved) {
            try {
                loadedSchedule = JSON.parse(saved);
            } catch (e) {
                console.error('Failed to load schedule', e);
            }
        }

        if (loadedSchedule) {
            setSchedule(loadedSchedule);
        } else if (isGuest) {
            // Only use guest routines if no local save exists
            const newSchedule: WeeklySchedule = { '월': [], '화': [], '수': [], '목': [], '금': [], '토': [], '일': [] };
            if (guestRoutines.length > 0) {
                newSchedule['월'] = [guestRoutines[0]];
                if (guestRoutines.length > 1) newSchedule['수'] = [guestRoutines[1]];
                if (guestRoutines.length > 2) newSchedule['금'] = [guestRoutines[2]];
            }
            setSchedule(newSchedule);
            // Save this initial guest schedule to localStorage so it persists
            localStorage.setItem('weekly_schedule_draft', JSON.stringify(newSchedule));
        }
    }, [isGuest, guestRoutines]);

    // Listen for external updates to the schedule (e.g. from TrainingRoutinesTab)
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('weekly_schedule_draft');
            if (saved) {
                try {
                    setSchedule(JSON.parse(saved));
                } catch (e) {
                    console.error('Failed to load schedule', e);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        window.addEventListener('weekly_schedule_update', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('weekly_schedule_update', handleStorageChange);
        };
    }, [isGuest]);

    //---------------------------------------------------------
    // Plan Management Functions
    //---------------------------------------------------------

    const handleNewPlanRequest = () => {
        setIsNewConfirmOpen(true);
    };

    const handleConfirmNewPlan = () => {
        const emptySchedule: WeeklySchedule = {};
        DAYS.forEach(day => { emptySchedule[day] = []; });
        setSchedule(emptySchedule);
        setCurrentPlanId(null);
        setCurrentPlanTitle('나의 주간 루틴');
        // Clear local storage draft primarily
        localStorage.removeItem('weekly_schedule_draft');
        window.dispatchEvent(new Event('weekly_schedule_update'));
        setIsNewConfirmOpen(false);
    };

    const handleOpenSaveModal = async () => {
        if (!user) {
            alert('로그인 후 이용해주세요.');
            return;
        }
        // Capture thumbnail before opening modal
        setIsSharing(true); // Show loading state
        const img = await captureRoutineImage();
        setCapturedImage(img);
        setIsSharing(false);

        setIsSaveModalOpen(true);
    };

    const handleSavePlan = async (data: WeeklyRoutineSaveData) => {
        if (!user) return;

        try {
            setIsSavingPlan(true);
            const res = await saveWeeklyRoutinePlan(
                user.id,
                schedule,
                currentPlanId || undefined,
                data.title,
                data.isPublic,
                data.description,
                data.tags
            );

            if (res.error || !res.data) {
                throw new Error(res.error?.message || 'Failed to save');
            }

            setCurrentPlanId(res.data.id);
            setCurrentPlanTitle(res.data.title);
            // alert('루틴이 저장되었습니다.'); // Success handled in modal step 3
        } catch (err) {
            console.error('Save failed:', err);
            alert('저장에 실패했습니다.');
        } finally {
            setIsSavingPlan(false);
        }
    };

    const handleOpenLoadModal = async () => {
        if (!user) {
            alert('로그인 후 이용해주세요.');
            return;
        }

        try {
            const res = await listUserWeeklyRoutinePlans(user.id);
            if (res.data) {
                setSavedPlans(res.data);
                setIsLoadModalOpen(true);
            }
        } catch (err) {
            console.error('Failed to list plans:', err);
            alert('목록을 불러오는데 실패했습니다.');
        }
    };

    const handleLoadPlan = async (id: string) => {
        try {
            const res = await getWeeklyRoutinePlan(id);
            if (res.data) {
                setSchedule(res.data.schedule);
                setCurrentPlanId(res.data.id);
                setCurrentPlanTitle(res.data.title);
                setIsLoadModalOpen(false);

                // Update local storage draft to match loaded plan
                localStorage.setItem('weekly_schedule_draft', JSON.stringify(res.data.schedule));
            }
        } catch (err) {
            console.error('Load failed:', err);
            alert('루틴을 불러오는데 실패했습니다.');
        }
    };

    const handleDeletePlan = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm('정말 이 루틴을 삭제하시겠습니까?')) return;

        try {
            await deleteWeeklyRoutinePlan(id);
            setSavedPlans(prev => prev.filter(p => p.id !== id));
            if (currentPlanId === id) {
                setCurrentPlanId(null);
                setCurrentPlanTitle('나의 주간 루틴');
            }
        } catch (err) {
            console.error('Delete failed:', err);
            alert('삭제에 실패했습니다.');
        }
    };

    // Scroll to today or selected day on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollContainerRef.current) {
                const targetDay = selectedDay || todayKorean;
                const targetElement = scrollContainerRef.current.querySelector(`[data-day="${targetDay}"]`);
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            }
        }, 100);
        return () => clearTimeout(timer);
    }, []); // Only run on mount to satisfy "Initial screen" requirement

    const saveSchedule = (newSchedule: WeeklySchedule) => {
        setSchedule(newSchedule);
        if (isGuest) return;
        localStorage.setItem('weekly_schedule_draft', JSON.stringify(newSchedule));
        window.dispatchEvent(new Event('weekly_schedule_update'));
    };

    const captureRoutineImage = async () => {
        if (!scrollContainerRef.current) return null;

        try {
            const container = scrollContainerRef.current;
            return await toPng(container, {
                cacheBust: true,
                width: container.scrollWidth,
                height: container.scrollHeight,
                backgroundColor: '#18181b', // Zinc-950 background
                style: {
                    overflow: 'visible', // Reveal all content
                    transform: 'none', // Reset transform if any
                }
            });
        } catch (err) {
            console.error('Failed to capture image:', err);
            return null;
        }
    };

    const handleShare = async () => {
        if (isSharing) return;

        try {
            setIsSharing(true);
            const dataUrl = await captureRoutineImage();

            if (dataUrl) {
                setCapturedImage(dataUrl);
                setShareModalOpen(true);
            } else {
                alert('이미지 생성에 실패했습니다. 다시 시도해주세요.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleDownloadImage = async () => {
        if (isSharing) return;

        try {
            setIsSharing(true);
            const dataUrl = await captureRoutineImage();

            if (dataUrl) {
                const link = document.createElement('a');
                link.download = `grapplay-weekly-plan-${new Date().toISOString().slice(0, 10)}.png`;
                link.href = dataUrl;
                link.click();
            } else {
                alert('이미지 저장에 실패했습니다.');
            }
        } finally {
            setIsSharing(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.currentTarget.classList.add('bg-zinc-800/80', 'ring-2', 'ring-blue-500');
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.currentTarget.classList.remove('bg-zinc-800/80', 'ring-2', 'ring-blue-500');
    };

    const handleDrop = (e: React.DragEvent, day: string) => {
        e.preventDefault();
        e.currentTarget.classList.remove('bg-zinc-800/80', 'ring-2', 'ring-blue-500');

        try {
            const routineData = e.dataTransfer.getData('application/json');
            if (!routineData) return;

            const routine: DrillRoutine = JSON.parse(routineData);

            // Check for duplicates in the same day (optional, but good UX)
            if (schedule[day].some((r: DrillRoutine) => r.id === routine.id)) {
                alert('이미 해당 요일에 추가된 루틴입니다.');
                return;
            }

            const newSchedule = {
                ...schedule,
                [day]: [...schedule[day], routine]
            };
            saveSchedule(newSchedule);

            // Trigger callback if provided, even for guests (they can show modal)
            if (onAddToDay) {
                onAddToDay(day);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    const handleDayClick = (day: string) => {
        // Prevent click if we just finished dragging
        if (dragDistance > 5) return;

        // Always trigger selection first
        if (onSelectDay) onSelectDay(day);

        if (selectedRoutine) {
            const newSchedule = {
                ...schedule,
                [day]: [...schedule[day], selectedRoutine]
            };
            saveSchedule(newSchedule);

            if (onAddToDay) {
                onAddToDay(day);
            }
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        setDragDistance(0);
    };

    const handleMouseLeave = () => {
        setIsDragging(false);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;
        setDragDistance(Math.abs(x - startX));
    };

    const removeRoutine = (day: string, routineId: string) => {
        const newSchedule = {
            ...schedule,
            [day]: schedule[day].filter((r: DrillRoutine) => r.id !== routineId)
        };
        saveSchedule(newSchedule);
    };

    // Get today's day in Korean
    const getTodayKorean = () => {
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        const today = new Date().getDay();
        return days[today];
    };

    const todayKorean = getTodayKorean();

    return (
        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl border border-zinc-800 p-6 md:p-8 mb-8 relative overflow-hidden">
            {/* Soft Radial Gradient Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-900/5 via-transparent to-transparent pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                        <Calendar className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-50 flex items-center gap-2">
                            {currentPlanTitle}
                            {currentPlanId && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">저장됨</span>}
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1">
                            {selectedRoutine
                                ? <span className="text-violet-400 font-bold animate-pulse">'{selectedRoutine.title}' 루틴을 추가할 요일을 선택하세요.</span>
                                : "좌우로 스와이프하여 요일별 계획을 확인하세요."
                            }
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                        onClick={handleNewPlanRequest}
                        className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-all active:scale-95"
                        title="새 계획"
                    >
                        <FilePlus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleOpenLoadModal}
                        className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-all active:scale-95"
                        title="불러오기"
                    >
                        <FolderOpen className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleOpenSaveModal}
                        className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-all active:scale-95"
                        title="저장하기"
                    >
                        <Save className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1" />
                    <button
                        onClick={handleDownloadImage}
                        disabled={isSharing}
                        className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-all active:scale-95 disabled:opacity-50"
                        title="이미지로 저장"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className="p-2 rounded-full bg-violet-600 hover:bg-violet-500 border border-violet-500 text-white transition-all active:scale-95 disabled:opacity-50"
                        title="친구에게 공유하기"
                    >
                        <Share2 className={`w-4 h-4 ${isSharing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Mobile-First Horizontal Scroll Carousel */}
            <div
                ref={scrollContainerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className={`flex overflow-x-auto snap-x snap-mandatory gap-4 py-4 scrollbar-hide -mx-2 px-2 cursor-grab active:cursor-grabbing select-none ${isDragging ? 'snap-none' : ''}`}
            >
                {DAYS.map((day) => {
                    const isTargetDay = selectedDay === day;
                    const isToday = day === todayKorean;
                    const routinesForDay = schedule[day] || [];

                    return (
                        <div
                            key={day}
                            data-day={day}
                            data-today={isToday}
                            className={`
                                flex-shrink-0 w-[80%] md:w-[45%] lg:w-[30%] snap-center
                                bg-zinc-900/40 border rounded-2xl flex flex-col overflow-hidden
                                transition-all duration-300
                                ${isToday
                                    ? 'border-violet-500 bg-violet-600/5 scale-105 shadow-[0_0_30px_rgba(124,58,237,0.3)]'
                                    : 'border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-900/60'
                                }
                            `}
                        >
                            {/* Header */}
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (onSelectDay) onSelectDay(day);
                                }}
                                className={`
                                    bg-zinc-800/50 text-zinc-400 text-sm font-bold py-3 px-4 flex items-center justify-between cursor-pointer transition-colors
                                    ${isTargetDay ? '!bg-violet-600 !text-zinc-50' : 'hover:text-zinc-200'}
                                    ${isToday && !isTargetDay ? 'bg-violet-600/20 text-violet-300' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    {day}
                                    {isToday && <span className="text-[10px] bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">오늘</span>}
                                </div>
                                {isToday && routinesForDay.length > 0 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            // Show confirmation modal instead of immediate navigation
                                            setStartModalRoutines(routinesForDay);
                                            setIsStartModalOpen(true);
                                        }}
                                        className="p-1.5 rounded-full transition-all bg-violet-600 hover:bg-violet-500 text-white shadow-lg"
                                        title="오늘의 루틴 통합 재생"
                                    >
                                        <Play className="w-3 h-3 fill-current" />
                                    </button>
                                )}
                            </div>

                            {/* Content Area */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, day)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDayClick(day);
                                    if (onSelectDay) onSelectDay(day);
                                }}
                                className={`
                                    flex-1 p-4 transition-all cursor-pointer relative overflow-y-auto min-h-[320px]
                                    ${selectedRoutine || isTargetDay
                                        ? 'bg-violet-900/10'
                                        : ''
                                    }
                                    ${isTargetDay
                                        ? '!bg-violet-600/10 ring-1 ring-violet-500/50 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                                        : ''}
                                `}
                            >
                                {routinesForDay.length === 0 ? (
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDayClick(day);
                                            if (onSelectDay) onSelectDay(day);
                                        }}
                                        className="h-full flex flex-col items-center justify-center gap-3 group"
                                    >
                                        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-700 group-hover:text-violet-400 group-hover:border-violet-500/50 transition-colors">
                                            <span className="text-2xl font-light">+</span>
                                        </div>
                                        <span className="text-sm text-zinc-600 group-hover:text-zinc-500 transition-colors">
                                            루틴 추가
                                        </span>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {routinesForDay.map((routine: DrillRoutine, idx: number) => (
                                            <div
                                                key={`${routine.id}-${idx}`}
                                                className={`
                                                    bg-zinc-800/80 backdrop-blur-sm rounded-xl p-3 group relative border transition-all cursor-pointer shadow-sm
                                                    ${selectedRoutine?.id === routine.id
                                                        ? 'border-violet-500 ring-1 ring-violet-500 shadow-[0_0_15px_rgba(124,58,237,0.3)]'
                                                        : 'border-zinc-700/50 hover:border-violet-500/30 hover:bg-zinc-800'
                                                    }
                                                `}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex items-start justify-between gap-2 mb-2">
                                                    <span className="text-sm font-bold text-zinc-100 line-clamp-2 leading-snug flex-1">
                                                        {routine.title}
                                                    </span>
                                                    <button
                                                        onClick={() => removeRoutine(day, routine.id)}
                                                        className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs">
                                                    <div className="flex items-center gap-1 text-zinc-500">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{routine.totalDurationMinutes}분</span>
                                                    </div>
                                                    <div className="text-zinc-500">
                                                        드릴 {routine.drills?.length || 0}개
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <ShareModal
                isOpen={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                title="주간 루틴 공유"
                text="이번 주 제 주짓수 훈련 루틴입니다! 같이 하실래요?"
                imageUrl={capturedImage || ''}
                url={window.location.href}
            />

            <SaveRoutineModal
                isOpen={isSaveModalOpen}
                onClose={() => setIsSaveModalOpen(false)}
                onSave={handleSavePlan}
                initialTitle={currentPlanTitle}
                initialIsPublic={false}
                isSaving={isSavingPlan}
                thumbnailPreview={capturedImage}
            />

            <ConfirmModal
                isOpen={isNewConfirmOpen}
                onClose={() => setIsNewConfirmOpen(false)}
                title="새 루틴 시작"
                message={`현재 작업 중인 내용은 저장하지 않으면 사라집니다.\n정말 새로 시작하시겠습니까?`}
                confirmText="새로 만들기"
                onConfirm={handleConfirmNewPlan}
                variant="warning"
            />

            {/* Start Routine Confirmation Modal */}
            <Modal
                isOpen={isStartModalOpen}
                onClose={() => setIsStartModalOpen(false)}
                title="오늘의 훈련 시작"
                icon={Play}
                iconColor="violet"
                maxWidth="md"
            >
                <div className="flex flex-col gap-4 text-left">
                    <p className="text-zinc-300 text-center mb-2">
                        오늘 진행할 훈련 루틴 목록입니다.<br />
                        준비되셨나요?
                    </p>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                        {startModalRoutines.map((routine, idx) => (
                            <div key={`${routine.id}-${idx}`} className="flex items-center gap-3 bg-zinc-800/50 p-3 rounded-xl border border-zinc-800">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-xs font-bold border border-violet-500/30">
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-zinc-200 truncate">{routine.title}</div>
                                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {routine.totalDurationMinutes}분</span>
                                        <span className="flex items-center gap-0.5"><Dumbbell className="w-3 h-3" /> 드릴 {routine.drillCount || routine.drills?.length || 0}개</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-violet-600/10 border border-violet-600/20 rounded-xl p-4 mt-2">
                        <div className="flex justify-between items-center text-sm mb-1">
                            <span className="text-zinc-400">총 소요 시간</span>
                            <span className="text-violet-300 font-bold text-lg">
                                {startModalRoutines.reduce((acc, r) => acc + (r.totalDurationMinutes || 0), 0)}분
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-zinc-400">총 루틴 수</span>
                            <span className="text-zinc-200 font-bold">{startModalRoutines.length}개</span>
                        </div>
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => setIsStartModalOpen(false)}
                            className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-xl transition-colors"
                        >
                            취소
                        </button>
                        <button
                            onClick={() => {
                                setIsStartModalOpen(false);
                                const playlist = startModalRoutines.map(r => r.id).join(',');
                                navigate(`/my-routines/${startModalRoutines[0].id}?playlist=${playlist}`);
                            }}
                            className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg shadow-violet-900/20 transition-all flex items-center justify-center gap-2"
                        >
                            <Play className="w-4 h-4 fill-current" />
                            훈련 시작하기
                        </button>
                    </div>
                </div>
            </Modal>

            <LoadRoutineModal
                isOpen={isLoadModalOpen}
                onClose={() => setIsLoadModalOpen(false)}
                plans={savedPlans}
                onLoad={handleLoadPlan}
                onDelete={handleDeletePlan}
            />
        </div>
    );
};

