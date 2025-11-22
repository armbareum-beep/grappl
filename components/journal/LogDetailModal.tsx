import React, { useState, useEffect } from 'react';
import { TrainingLog, LogFeedback } from '../../types';
import { X, Calendar, Clock, Activity, MessageSquare, Send, User } from 'lucide-react';
import { Button } from '../Button';
import { getLogFeedback, createLogFeedback } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

interface LogDetailModalProps {
    log: TrainingLog;
    onClose: () => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose }) => {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState<LogFeedback[]>([]);
    const [newFeedback, setNewFeedback] = useState('');
    const [loadingFeedback, setLoadingFeedback] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadFeedback();
    }, [log.id]);

    const loadFeedback = async () => {
        const { data } = await getLogFeedback(log.id);
        if (data) setFeedback(data);
        setLoadingFeedback(false);
    };

    const handleSubmitFeedback = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !newFeedback.trim()) return;

        setSubmitting(true);
        try {
            const { error } = await createLogFeedback(log.id, user.id, newFeedback);
            if (!error) {
                setNewFeedback('');
                await loadFeedback();
            }
        } finally {
            setSubmitting(false);
        }
    };

    const getYoutubeEmbedUrl = (url: string) => {
        try {
            // Handle various YouTube URL formats
            let videoId = '';
            if (url.includes('youtu.be/')) {
                videoId = url.split('youtu.be/')[1];
            } else if (url.includes('v=')) {
                videoId = url.split('v=')[1].split('&')[0];
            }

            if (videoId) {
                return `https://www.youtube.com/embed/${videoId}`;
            }
        } catch (e) {
            return null;
        }
        return null;
    };

    const embedUrl = log.youtubeUrl ? getYoutubeEmbedUrl(log.youtubeUrl) : null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row">
                {/* Left Side: Log Details */}
                <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 mb-1">수련 일지</h2>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                <Calendar className="w-4 h-4" />
                                <span>{log.date}</span>
                                {log.user?.name && (
                                    <>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <User className="w-4 h-4" />
                                        <span>{log.user.name}</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {embedUrl && (
                        <div className="aspect-video w-full bg-black rounded-lg mb-6 overflow-hidden">
                            <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-4 mb-6">
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
                        <div className="mb-6">
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

                {/* Right Side: Feedback */}
                <div className="w-full md:w-96 flex flex-col h-[500px] md:h-auto">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            피드백
                        </h3>
                        <button onClick={onClose} className="hidden md:block text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                        {loadingFeedback ? (
                            <div className="text-center py-4 text-slate-500">로딩 중...</div>
                        ) : feedback.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                아직 피드백이 없습니다.<br />첫 번째 피드백을 남겨보세요!
                            </div>
                        ) : (
                            feedback.map((item) => (
                                <div key={item.id} className="bg-white p-3 rounded-lg shadow-sm border border-slate-100">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="font-semibold text-xs text-slate-900">{item.userName}</span>
                                        <span className="text-xs text-slate-400">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-700">{item.content}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-white">
                        <form onSubmit={handleSubmitFeedback} className="flex gap-2">
                            <input
                                type="text"
                                value={newFeedback}
                                onChange={(e) => setNewFeedback(e.target.value)}
                                placeholder="피드백을 남겨주세요..."
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <Button type="submit" size="sm" disabled={submitting || !newFeedback.trim()}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
