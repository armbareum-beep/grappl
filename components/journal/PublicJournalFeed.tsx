import React, { useEffect, useState } from 'react';
import { TrainingLog } from '../../types';
import { getPublicTrainingLogs } from '../../lib/api';
import { Heart, MessageCircle, MoreHorizontal, User, Clock, Swords, Share2 } from 'lucide-react';

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
            // For infinite scroll, append new logs if page > 1, else replace
            setLogs(prevLogs => page === 1 ? data : [...prevLogs, ...data]);
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
        <div className="space-y-6">
            {logs.map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer" onClick={() => onLogClick(log)}>
                    <div className="p-5">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 border border-slate-200">
                                    <User className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-sm">{log.userName || 'Unknown User'}</div>
                                    <div className="text-xs text-slate-500">{log.date}</div>
                                </div>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="mb-4">
                            <p className="text-slate-800 leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-4 mb-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-blue-500" />
                                <span className="font-medium">{log.durationMinutes}분</span>
                            </div>
                            <div className="w-px h-3 bg-slate-300"></div>
                            <div className="flex items-center gap-1.5">
                                <Swords className="w-4 h-4 text-red-500" />
                                <span className="font-medium">{log.sparringRounds}라운드</span>
                            </div>
                        </div>

                        {/* Techniques */}
                        {log.techniques && log.techniques.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4">
                                {log.techniques.map((tech, idx) => (
                                    <span
                                        key={idx}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.location.href = `/drills?search=${encodeURIComponent(tech)}`;
                                        }}
                                        className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-md border border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors cursor-pointer"
                                    >
                                        #{tech}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-6">
                                <button className="flex items-center gap-1.5 text-slate-500 hover:text-red-500 transition-colors group">
                                    <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">좋아요</span>
                                </button>
                                <button className="flex items-center gap-1.5 text-slate-500 hover:text-blue-500 transition-colors group">
                                    <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-xs font-medium">댓글</span>
                                </button>
                            </div>
                            <button className="text-slate-400 hover:text-slate-600">
                                <Share2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}

            {currentPage < totalPages && (
                <div className="text-center pt-4">
                    <button
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={loading}
                        className="px-6 py-2 bg-white border border-slate-200 text-slate-600 rounded-full text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {loading ? '로딩 중...' : '더 보기'}
                    </button>
                </div>
            )}
        </div>
    );
};
