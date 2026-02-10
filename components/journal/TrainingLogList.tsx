import React, { useState } from 'react';
import { TrainingLog } from '../../types';
import { Calendar, Clock, Activity, Trash2, Edit2, BookOpen } from 'lucide-react';
import { AICoachWidget } from './AICoachWidget';
import { ConfirmModal } from '../common/ConfirmModal';

interface TrainingLogListProps {
    logs: TrainingLog[];
    onDelete: (id: string) => void;
    onLogClick: (log: TrainingLog) => void;
}

export const TrainingLogList: React.FC<TrainingLogListProps> = ({ logs, onDelete, onLogClick }) => {
    const [deleteConfirmLogId, setDeleteConfirmLogId] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {/* AI Coach Widget - Always visible to encourage usage */}
            <AICoachWidget logs={logs} />

            {logs.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
                    <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">아직 작성된 수련 일지가 없습니다.</p>
                    <p className="text-sm text-zinc-500 mt-1">오늘의 수련을 기록하고 AI 분석을 받아보세요!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => onLogClick(log)}
                            className="bg-zinc-900 rounded-xl border border-zinc-800 hover:border-violet-500/50 transition-all cursor-pointer group relative overflow-hidden shadow-lg"
                        >
                            {/* Action Buttons Overlay */}
                            <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLogClick(log);
                                    }}
                                    className="p-2 rounded-full backdrop-blur-md bg-black/40 text-slate-300 hover:bg-violet-500 hover:text-white transition-all"
                                    title="수정"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeleteConfirmLogId(log.id);
                                    }}
                                    className="p-2 rounded-full backdrop-blur-md bg-black/40 text-slate-300 hover:bg-red-500 hover:text-white transition-all"
                                    title="삭제"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Header Section */}
                            <div className="p-4 border-b border-zinc-800/50">
                                <div className="flex items-center gap-2 text-zinc-400 text-sm">
                                    <Calendar className="w-4 h-4 text-violet-500" />
                                    <span className="font-medium text-zinc-100">{log.date}</span>
                                </div>
                            </div>

                            {/* Stats Section */}
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 bg-violet-900/20 text-violet-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-violet-800/30 flex-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{log.durationMinutes}분</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-purple-900/20 text-purple-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-purple-800/30 flex-1">
                                        <Activity className="w-3.5 h-3.5" />
                                        <span>{log.sparringRounds}R</span>
                                    </div>
                                </div>

                                {/* Techniques */}
                                {log.techniques && log.techniques.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">훈련 기술</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {log.techniques.slice(0, 3).map((tech, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-[10px] font-bold rounded border border-violet-500/20"
                                                >
                                                    #{tech}
                                                </span>
                                            ))}
                                            {log.techniques.length > 3 && (
                                                <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[10px] font-bold rounded border border-zinc-700">
                                                    +{log.techniques.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Notes Preview */}
                                {log.notes && (
                                    <div className="bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed italic">
                                            "{log.notes}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <ConfirmModal
                isOpen={deleteConfirmLogId !== null}
                onClose={() => setDeleteConfirmLogId(null)}
                onConfirm={() => {
                    if (deleteConfirmLogId) {
                        onDelete(deleteConfirmLogId);
                    }
                    setDeleteConfirmLogId(null);
                }}
                title="수련 일지 삭제"
                message="정말 삭제하시겠습니까?"
                confirmText="삭제"
                cancelText="취소"
                variant="danger"
            />
        </div>
    );
};
