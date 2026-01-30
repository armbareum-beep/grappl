import React, { useState, useEffect } from 'react';
import { Drill, DrillRoutine, Difficulty, VideoCategory } from '../types';
import { Button } from './Button';
import { Plus, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AddToRoutineModalProps {
    drill: Drill;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const AddToRoutineModal: React.FC<AddToRoutineModalProps> = ({
    drill,
    isOpen,
    onClose,
    onSuccess
}) => {
    const { user } = useAuth();
    const [customRoutines, setCustomRoutines] = useState<DrillRoutine[]>([]);
    const [showNewRoutineForm, setShowNewRoutineForm] = useState(false);
    const [newRoutineName, setNewRoutineName] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadCustomRoutines();
        }
    }, [isOpen]);

    const loadCustomRoutines = () => {
        const routines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        setCustomRoutines(routines);
    };

    const handleAddToRoutine = (routine: DrillRoutine) => {
        // Check if drill is already in this routine
        if (routine.drills?.some(d => d.id === drill.id)) {
            alert('이 드릴은 이미 해당 루틴에 포함되어 있습니다.');
            return;
        }

        // Add drill to routine
        const updatedRoutine = {
            ...routine,
            drills: [...(routine.drills || []), drill],
            drillCount: (routine.drillCount || 0) + 1,
            totalDurationMinutes: (routine.totalDurationMinutes || 0) + (parseInt(drill.length?.split(':')[0] || '0') || 1)
        };

        // Update in localStorage
        const allRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        const updatedRoutines = allRoutines.map((r: DrillRoutine) =>
            r.id === routine.id ? updatedRoutine : r
        );
        localStorage.setItem('my_custom_routines', JSON.stringify(updatedRoutines));

        alert(`"${routine.title}" 루틴에 추가되었습니다!`);
        onSuccess();
        onClose();
    };

    const handleCreateNewRoutine = () => {
        if (!newRoutineName.trim()) {
            alert('루틴 이름을 입력해주세요.');
            return;
        }

        const newRoutine: DrillRoutine = {
            id: `custom-${Date.now()}`,
            title: newRoutineName,
            description: '나만의 커스텀 루틴',
            creatorId: user?.id || 'me',
            creatorName: user?.user_metadata?.name || '나',
            thumbnailUrl: drill.thumbnailUrl,
            price: 0,
            views: 0,
            drillCount: 1,
            drills: [drill],
            createdAt: new Date().toISOString(),
            difficulty: Difficulty.Intermediate,
            category: VideoCategory.Standing,
            totalDurationMinutes: parseInt(drill.length?.split(':')[0] || '0') || 1
        };

        const existingRoutines = JSON.parse(localStorage.getItem('my_custom_routines') || '[]');
        localStorage.setItem('my_custom_routines', JSON.stringify([...existingRoutines, newRoutine]));

        alert(`"${newRoutineName}" 루틴이 생성되고 드릴이 추가되었습니다!`);
        setNewRoutineName('');
        setShowNewRoutineForm(false);
        onSuccess();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white">루틴에 추가</h2>
                        <p className="text-sm text-slate-400 mt-1">드릴을 추가할 루틴을 선택하세요</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Drill Info */}
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                        <div className="flex gap-3">
                            <img
                                src={drill.thumbnailUrl}
                                alt={drill.title}
                                className="w-16 h-16 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-white font-bold text-sm line-clamp-1">{drill.title}</h3>
                                <p className="text-slate-400 text-xs">{drill.creatorName}</p>
                                <p className="text-slate-500 text-xs mt-1">{drill.length || '0:00'}</p>
                            </div>
                        </div>
                    </div>

                    {/* New Routine Form */}
                    {showNewRoutineForm ? (
                        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 space-y-3">
                            <div>
                                <label className="text-sm font-medium text-white block mb-2">
                                    새 루틴 이름
                                </label>
                                <input
                                    type="text"
                                    value={newRoutineName}
                                    onChange={(e) => setNewRoutineName(e.target.value)}
                                    placeholder="예: 아침 워밍업 루틴"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setShowNewRoutineForm(false);
                                        setNewRoutineName('');
                                    }}
                                    className="flex-1"
                                >
                                    취소
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleCreateNewRoutine}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                >
                                    생성하기
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowNewRoutineForm(true)}
                            className="w-full bg-blue-900/20 border border-blue-800 rounded-xl p-4 text-blue-400 hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus className="w-5 h-5" />
                            새 루틴 만들기
                        </button>
                    )}

                    {/* Existing Routines */}
                    {customRoutines.length > 0 && (
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">
                                내 루틴 ({customRoutines.length})
                            </h3>
                            {customRoutines.map((routine) => {
                                const alreadyAdded = routine.drills?.some(d => d.id === drill.id);
                                return (
                                    <button
                                        key={routine.id}
                                        onClick={() => !alreadyAdded && handleAddToRoutine(routine)}
                                        disabled={alreadyAdded}
                                        className={`w-full bg-slate-800 rounded-xl p-4 text-left transition-all ${alreadyAdded
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:bg-slate-700 hover:border-blue-500'
                                            } border border-slate-700`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-bold text-sm mb-1">{routine.title}</h4>
                                                <p className="text-slate-400 text-xs">
                                                    {(routine.views || 0).toLocaleString()} 조회수 · {routine.totalDurationMinutes || 0}분
                                                </p>
                                            </div>
                                            {alreadyAdded && (
                                                <div className="flex items-center gap-1 text-green-500 text-xs font-medium">
                                                    <Check className="w-4 h-4" />
                                                    추가됨
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {customRoutines.length === 0 && !showNewRoutineForm && (
                        <div className="text-center py-8">
                            <p className="text-slate-500 text-sm">
                                아직 만든 루틴이 없습니다.<br />
                                새 루틴을 만들어보세요!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
