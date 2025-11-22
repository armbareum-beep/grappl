import React from 'react';
import { TrainingLog } from '../../types';
import { Calendar, Clock, Activity, Trash2 } from 'lucide-react';
import { Button } from '../Button';

interface TrainingLogListProps {
    logs: TrainingLog[];
    onDelete: (id: string) => void;
}

export const TrainingLogList: React.FC<TrainingLogListProps> = ({ logs, onDelete }) => {
    if (logs.length === 0) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">아직 작성된 수련 일지가 없습니다.</p>
                <p className="text-sm text-slate-400 mt-1">오늘의 수련을 기록해보세요!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2 text-slate-500 text-sm">
                            <Calendar className="w-4 h-4" />
                            <span>{log.date}</span>
                            {log.location && (
                                <>
                                    <span className="mx-1">•</span>
                                    <span>{log.location}</span>
                                </>
                            )}
                        </div>
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

                    <div className="flex flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                            <Clock className="w-4 h-4" />
                            <span>{log.durationMinutes}분 수련</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                            <Activity className="w-4 h-4" />
                            <span>스파링 {log.sparringRounds}라운드</span>
                        </div>
                    </div>

                    {log.techniques && log.techniques.length > 0 && (
                        <div className="mb-4">
                            <h4 className="text-sm font-semibold text-slate-900 mb-2">배운 기술</h4>
                            <div className="flex flex-wrap gap-2">
                                {log.techniques.map((tech, index) => (
                                    <span key={index} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded-md">
                                        {tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {log.notes && (
                        <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 whitespace-pre-wrap">
                            {log.notes}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
