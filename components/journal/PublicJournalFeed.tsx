import React, { useEffect, useState } from 'react';
import { TrainingLog } from '../../types';
import { getPublicTrainingLogs } from '../../lib/api';
import { Calendar, Clock, Activity, PlayCircle, User, ChevronLeft, ChevronRight } from 'lucide-react';

interface PublicJournalFeedProps {
    onLogClick: (log: TrainingLog) => void;
}

export const PublicJournalFeed: React.FC<PublicJournalFeedProps> = ({ onLogClick }) => {
    const [logs, setLogs] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const ITEMS_PER_PAGE = 12;

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

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    if (loading && logs.length === 0) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-slate-500">커뮤니티 피드를 불러오는 중...</p>
            </div>
        );
    }

    if (logs.length === 0 && !loading) {
        return (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                <p className="text-slate-500">아직 공개된 수련 일지가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid md:grid-cols-2 gap-6">
                {logs.map((log) => (
                    <div
                        key={log.id}
                        onClick={() => onLogClick(log)}
                        className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                    >
                        {log.youtubeUrl && (
                            <div className="h-32 bg-slate-900 relative flex items-center justify-center">
                                <PlayCircle className="w-10 h-10 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                            </div>
                        )}

                        <div className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                                    <User className="w-4 h-4 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{log.userName || 'User'}</p>
                                    <p className="text-xs text-slate-500">
                                        {log.date}
                                        {log.location && ` • ${log.location}`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                                    <Clock className="w-3 h-3" />
                                    {log.durationMinutes}분
                                </span>
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs font-medium">
                                    <Activity className="w-3 h-3" />
                                    스파링 {log.sparringRounds}R
                                </span>
                            </div>

                            {log.notes && (
                                <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                                    {log.notes}
                                </p>
                            )}

                            {log.techniques && log.techniques.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {log.techniques.slice(0, 3).map((tech, i) => (
                                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded">
                                            #{tech}
                                        </span>
                                    ))}
                                    {log.techniques.length > 3 && (
                                        <span className="text-xs text-slate-400">+{log.techniques.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2">
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-slate-600" />
                    </button>

                    <div className="flex gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-slate-600" />
                    </button>
                </div>
            )}
        </div>
    );
};
