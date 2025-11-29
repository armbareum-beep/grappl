import React from 'react';
import { TrainingLog } from '../../types';
import { Calendar, Clock, Activity, Trash2, Edit2, BookOpen, MapPin } from 'lucide-react';
import { AICoachWidget } from './AICoachWidget';

interface TrainingLogListProps {
    logs: TrainingLog[];
    onDelete: (id: string) => void;
    onLogClick: (log: TrainingLog) => void;
}

export const TrainingLogList: React.FC<TrainingLogListProps> = ({ logs, onDelete, onLogClick }) => {
    return (
        <div className="space-y-6">
            {/* AI Coach Widget - Always visible to encourage usage */}
            <AICoachWidget logs={logs} />

            {logs.length === 0 ? (
                <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                    <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">아직 작성된 수련 일지가 없습니다.</p>
                    <p className="text-sm text-slate-500 mt-1">오늘의 수련을 기록하고 AI 분석을 받아보세요!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            onClick={() => onLogClick(log)}
                            className="bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all cursor-pointer group relative overflow-hidden"
                        >
                            {/* Action Buttons Overlay */}
                            <div className="absolute top-2 right-2 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLogClick(log);
                                    }}
                                    className="p-2 rounded-full backdrop-blur-md bg-black/40 text-slate-300 hover:bg-blue-500 hover:text-white transition-all"
                                    title="수정"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('정말 삭제하시겠습니까?')) {
                                            onDelete(log.id);
                                        }
                                    }}
                                    className="p-2 rounded-full backdrop-blur-md bg-black/40 text-slate-300 hover:bg-red-500 hover:text-white transition-all"
                                    title="삭제"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Header Section */}
                            <div className="p-4 border-b border-slate-800">
                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                                    <Calendar className="w-4 h-4 text-blue-500" />
                                    <span className="font-medium text-white">{log.date}</span>
                                </div>
                                {log.location && (
                                    <div className="flex items-center gap-2 text-slate-500 text-xs">
                                        <MapPin className="w-3 h-3" />
                                        <span>{log.location}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats Section */}
                            <div className="p-4 space-y-3">
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-1.5 bg-blue-900/20 text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-800/30 flex-1">
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
                                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Techniques</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {log.techniques.slice(0, 3).map((tech, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs font-medium rounded border border-slate-700"
                                                >
                                                    #{tech}
                                                </span>
                                            ))}
                                            {log.techniques.length > 3 && (
                                                <span className="px-2 py-0.5 bg-slate-800 text-slate-500 text-xs font-medium rounded border border-slate-700">
                                                    +{log.techniques.length - 3}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Notes Preview */}
                                {log.notes && (
                                    <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                                            {log.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
