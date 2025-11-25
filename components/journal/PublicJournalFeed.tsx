import React, { useEffect, useState } from 'react';
import { TrainingLog } from '../../types';
import { getPublicTrainingLogs } from '../../lib/api';
import { Heart, MessageCircle, Repeat, Send, MoreHorizontal, User, PlayCircle } from 'lucide-react';

interface PublicJournalFeedProps {
    onLogClick: (log: TrainingLog) => void;
}

export const PublicJournalFeed: React.FC<PublicJournalFeedProps> = ({ onLogClick }) => {
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        loadLogs(currentPage);
    }, [currentPage]);

    const loadLogs = async (page: number) => {
        setLoading(true);
        const { data, count } = await getPublicTrainingLogs(page, ITEMS_PER_PAGE);
        if (data) {
            setLogs(data);
            if (count) {
                setTotalPages(Math.ceil(count / ITEMS_PER_PAGE));
            }
        }
        setLoading(false);
    };

    if (loading && logs.length === 0) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-900" />
            </div>
        );
    }

    return (
        <div className="max-w-xl mx-auto divide-y divide-slate-100">
            {logs.map((log) => (
                <div key={log.id} className="py-4 px-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onLogClick(log)}>
                    <div className="flex gap-3">
                        {/* Avatar Column */}
                        <div className="flex flex-col items-center">
                            <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                                <User className="w-5 h-5 text-slate-500" />
                            </div>
                            {/* Thread line connector could go here */}
                        </div>

                        {/* Content Column */}
                        <div className="flex-1 min-w-0">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-sm text-slate-900">{log.userName || 'Unknown User'}</span>
                                    <span className="text-slate-400 text-sm">{log.date}</span>
                                </div>
                                <button className="text-slate-400 hover:text-slate-900">
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="text-[15px] text-slate-900 leading-relaxed mb-2 whitespace-pre-wrap">
                                {log.notes}
                            </div>

                            {/* Media / Tags */}
                            {(log.techniques?.length > 0 || log.youtubeUrl) && (
                                <div className="mb-3">
                                    {log.youtubeUrl && (
                                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 mb-2 relative aspect-video flex items-center justify-center">
                                            <PlayCircle className="w-10 h-10 text-slate-400" />
                                        </div>
                                    )}

                                    {log.techniques?.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {log.techniques.map((tech, i) => (
                                                <span key={i} className="text-blue-600 text-sm">#{tech}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer / Actions */}
                            <div className="flex items-center gap-6 mt-2">
                                <button className="group flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors">
                                    <Heart className="w-5 h-5" />
                                    {/* <span className="text-xs">12</span> */}
                                </button>
                                <button className="group flex items-center gap-1.5 text-slate-500 hover:text-blue-500 transition-colors">
                                    <MessageCircle className="w-5 h-5" />
                                    {/* <span className="text-xs">3</span> */}
                                </button>
                                <button className="group flex items-center gap-1.5 text-slate-500 hover:text-green-500 transition-colors">
                                    <Repeat className="w-5 h-5" />
                                </button>
                                <button className="group flex items-center gap-1.5 text-slate-500 hover:text-blue-500 transition-colors">
                                    <Send className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}

            {/* Load More Trigger */}
            {currentPage < totalPages && (
                <div className="py-6 text-center">
                    <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        className="text-sm text-blue-600 font-medium hover:underline"
                    >
                        더 보기
                    </button>
                </div>
            )}
        </div>
    );
};
