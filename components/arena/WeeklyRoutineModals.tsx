import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Save, FolderOpen, X, Trash2, Calendar, ChevronRight,
    Camera
} from 'lucide-react';
import { WeeklyRoutinePlan } from '../../types';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface WeeklyRoutineSaveData {
    title: string;
    isPublic: boolean;
    description?: string;
    tags?: string[];
}

interface SaveModalProps extends ModalProps {
    onSave: (data: WeeklyRoutineSaveData) => Promise<void>;
    initialTitle: string;
    initialIsPublic: boolean;
    isSaving: boolean;
    thumbnailPreview?: string | null;
}

export const SaveRoutineModal: React.FC<SaveModalProps> = ({
    isOpen, onClose, onSave, initialTitle, isSaving, thumbnailPreview
}) => {
    const [titleInput, setTitleInput] = useState(initialTitle);

    // Metadata State - Optional, but kept if user wants to add detail
    // We simplified by removing the 'isPublic' toggle step, effectively defaulting to private (or whatever the parent passes)
    // But since the parent passed 'initialIsPublic={false}', we can assume private saves primarily.
    // However, user said "Don't need public/private. Instead let me write a name."
    // So we will just focus on the name.

    useEffect(() => {
        if (isOpen) {
            setTitleInput(initialTitle);
        }
    }, [isOpen, initialTitle]);

    const handleSave = async () => {
        if (!titleInput.trim()) return;

        await onSave({
            title: titleInput,
            isPublic: false, // Defaulting to private as requested "Public/Private not needed"
            // We could add description support here if we wanted
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, x: -20 }}
                className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />

                <div className="p-8">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                            <Save className="w-6 h-6 text-zinc-300" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-white leading-tight">루틴 저장하기</h3>
                            <p className="text-zinc-500 text-sm font-medium">현재 주간 계획을 저장합니다</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Thumbnail Preview */}
                        <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden group">
                            {thumbnailPreview ? (
                                <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-contain bg-zinc-900 opacity-80" />
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                                    <Camera className="w-8 h-8 mb-2 animate-pulse" />
                                    <span className="text-xs font-bold">썸네일 생성 중...</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block px-1">루틴 이름</label>
                            <input
                                autoFocus
                                type="text"
                                value={titleInput}
                                onChange={(e) => setTitleInput(e.target.value)}
                                className="w-full bg-zinc-800/50 border border-zinc-700/50 focus:border-violet-500/50 focus:bg-zinc-800 rounded-2xl p-4 text-white font-bold outline-none transition-all focus:ring-4 focus:ring-violet-500/10 placeholder:text-zinc-600"
                                placeholder="예: 시합 준비 루틴, 기초 체력 주간..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 mt-10">
                        <button
                            onClick={onClose}
                            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black text-sm rounded-2xl transition-all active:scale-95"
                        >
                            취소
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!titleInput.trim() || isSaving}
                            className={`flex-1 py-4 font-black text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${!titleInput.trim() || isSaving ? 'bg-zinc-700 text-zinc-500' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-900/20'
                                }`}
                        >
                            {isSaving ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                                    저장 중...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    저장하기
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

interface LoadModalProps extends ModalProps {
    plans: WeeklyRoutinePlan[];
    onLoad: (id: string) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export const LoadRoutineModal: React.FC<LoadModalProps> = ({ isOpen, onClose, plans, onLoad, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 blur-[60px] rounded-full -mr-16 -mt-16" />

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
                                <FolderOpen className="w-6 h-6 text-violet-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white leading-tight">불러오기</h3>
                                <p className="text-zinc-500 text-sm font-medium">저장된 주간 루틴 목록</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {plans.length === 0 ? (
                            <div className="py-12 text-center bg-zinc-800/20 rounded-3xl border border-zinc-800/50 border-dashed">
                                <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">저장된 루틴이 없습니다</p>
                            </div>
                        ) : (
                            plans.map(plan => (
                                <div
                                    key={plan.id}
                                    onClick={() => onLoad(plan.id)}
                                    className="group flex items-center justify-between p-5 rounded-2xl bg-zinc-800/30 hover:bg-zinc-800 border border-zinc-800/50 hover:border-violet-500/30 cursor-pointer transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                            {/* Just show lock since public is deprecated for now in this request */}
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500">
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="font-black text-zinc-200 group-hover:text-violet-400 transition-colors mb-1">
                                                {plan.title || '제목 없음'}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(plan.updatedAt || plan.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(plan.id, e); }}
                                            className="p-3 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-violet-500 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
