import React from 'react';
import { TrainingLog } from '../../types';
import { Calendar, Clock, Activity, Trash2, Edit2, BookOpen } from 'lucide-react';
import { Button } from '../Button';
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
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                    <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 font-medium">아직 작성된 수련 일지가 없습니다.</p>
                    <p className="text-sm text-slate-400 mt-1">오늘의 수련을 기록하고 AI 분석을 받아보세요!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-2 text-slate-500 text-sm">
                                    <Calendar className="w-4 h-4" />
                                    <span className="font-medium text-slate-700">{log.date}</span>
                                    {log.location && (
                                        <>
                                            <span className="mx-1 text-slate-300">•</span>
                                            <span>{log.location}</span>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onLogClick(log)}
                                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (window.confirm('정말 삭제하시겠습니까?')) {
                                                onDelete(log.id);
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-4">
                                <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{log.durationMinutes}분</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium border border-purple-100">
                                    <Activity className="w-3.5 h-3.5" />
                                    <span>스파링 {log.sparringRounds}R</span>
                                </div>
                            </div>

                            {log.techniques && log.techniques.length > 0 && (
                                <div className="mb-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Techniques</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {log.techniques.map((tech, index) => (
                                            <span key={index} className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200">
                                                #{tech}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {log.notes && (
                                <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100">
                                    {log.notes}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
