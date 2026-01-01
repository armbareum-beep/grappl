import React, { useState, useEffect } from 'react';
import { TrainingLog, LogFeedback } from '../../types';
import { X, Calendar, Clock, Activity, MessageSquare, Send, User, Edit2 } from 'lucide-react';
import { Button } from '../Button';
import { getLogFeedback, createLogFeedback } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { TrainingLogForm } from './TrainingLogForm';
import { UserCourseProfile } from '../UserCourseProfile';

interface LogDetailModalProps {
    log: TrainingLog;
    onClose: () => void;
    onEdit?: (log: TrainingLog) => void;
}

export const LogDetailModal: React.FC<LogDetailModalProps> = ({ log, onClose, onEdit }) => {
    const { user } = useAuth();
    const [feedback, setFeedback] = useState<LogFeedback[]>([]);
    const [newFeedback, setNewFeedback] = useState('');
    const [loadingFeedback, setLoadingFeedback] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedFeedbackUserId, setSelectedFeedbackUserId] = useState<string | null>(null);

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

    if (isEditing && onEdit && user) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-white">수련 일지 수정</h2>
                        <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <TrainingLogForm
                        userId={user.id}
                        initialData={log}
                        onSubmit={async (data) => {
                            await onEdit({ ...log, ...data });
                            setIsEditing(false);
                        }}
                        onCancel={() => setIsEditing(false)}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col md:flex-row shadow-2xl overflow-hidden ring-1 ring-white/5">
                {/* Left Side: Log Details */}
                <div className="flex-1 p-8 border-b md:border-b-0 md:border-r border-white/5">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">수련 일지</h2>
                            <div className="flex flex-wrap items-center gap-3 text-zinc-400 text-sm">
                                <div className="flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-violet-400" />
                                    <span>{log.date}</span>
                                </div>
                                {log.location && (
                                    <>
                                        <span className="text-zinc-700">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <span>{log.location}</span>
                                        </div>
                                    </>
                                )}
                                {log.user?.name && (
                                    <>
                                        <span className="text-zinc-700">•</span>
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-zinc-500" />
                                            <span className="font-medium text-zinc-300">{log.user.name}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {onEdit && user?.id === log.userId && (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-2.5 bg-violet-500/10 text-violet-400 hover:bg-violet-500 hover:text-white rounded-full transition-all duration-200"
                                    title="수정하기"
                                >
                                    <Edit2 className="w-5 h-5" />
                                </button>
                            )}
                            <button onClick={onClose} className="p-2.5 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {embedUrl && (
                        <div className="aspect-video w-full bg-zinc-950 rounded-2xl mb-8 overflow-hidden border border-white/5 shadow-inner">
                            <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 mb-8">
                        <div className="flex items-center gap-2 bg-violet-500/10 text-violet-400 px-4 py-2 rounded-xl text-sm font-bold border border-violet-500/20">
                            <Clock className="w-4 h-4" />
                            <span>{log.durationMinutes}분 수련</span>
                        </div>
                        <div className="flex items-center gap-2 bg-purple-500/10 text-purple-400 px-4 py-2 rounded-xl text-sm font-bold border border-purple-500/20">
                            <Activity className="w-4 h-4" />
                            <span>스파링 {log.sparringRounds}라운드</span>
                        </div>
                    </div>

                    {log.techniques && log.techniques.length > 0 && (
                        <div className="mb-8">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">배운 기술</h4>
                            <div className="flex flex-wrap gap-2">
                                {log.techniques.map((tech, index) => (
                                    <span key={index} className="px-3 py-1.5 bg-zinc-800/50 text-zinc-300 text-sm font-medium rounded-lg border border-white/5">
                                        #{tech}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {log.notes && (
                        <div className="bg-zinc-800/30 p-5 rounded-2xl text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed border border-white/5">
                            {log.notes}
                        </div>
                    )}

                    {log.user && (
                        <div className="mt-8 pt-8 border-t border-white/5">
                            <UserCourseProfile
                                userId={log.userId}
                                userName={log.user.name}
                                userBelt={log.user.belt}
                            />
                        </div>
                    )}
                </div>

                {/* Right Side: Feedback */}
                <div className="w-full md:w-96 flex flex-col h-[500px] md:h-auto bg-zinc-950/30">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-violet-400" />
                            피드백
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
                        {loadingFeedback ? (
                            <div className="text-center py-4 text-zinc-500 text-sm animate-pulse">로딩 중...</div>
                        ) : feedback.length === 0 ? (
                            <div className="text-center py-12 text-zinc-500 text-sm">
                                <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p>아직 피드백이 없습니다.</p>
                                <p className="text-xs mt-1">첫 번째 피드백을 남겨보세요!</p>
                            </div>
                        ) : (
                            feedback.map((item) => (
                                <div key={item.id} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 shadow-sm group">
                                    <div className="flex items-center justify-between mb-2">
                                        <button
                                            onClick={() => setSelectedFeedbackUserId(selectedFeedbackUserId === item.userId ? null : item.userId)}
                                            className="font-bold text-xs text-zinc-300 hover:text-violet-400 transition-colors"
                                        >
                                            {item.userName}
                                        </button>
                                        <span className="text-[10px] text-zinc-500 font-medium">
                                            {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-zinc-400 leading-relaxed">{item.content}</p>

                                    {selectedFeedbackUserId === item.userId && (
                                        <div className="mt-4 pt-4 border-t border-white/5 animate-in fade-in slide-in-from-top-2">
                                            <UserCourseProfile
                                                userId={item.userId}
                                                userName={item.userName}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-6 border-t border-white/5 bg-zinc-900/50 backdrop-blur-md">
                        <form onSubmit={handleSubmitFeedback} className="flex gap-2">
                            <input
                                type="text"
                                value={newFeedback}
                                onChange={(e) => setNewFeedback(e.target.value)}
                                placeholder="피드백 남기기..."
                                className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all"
                            />
                            <Button type="submit" size="sm" disabled={submitting || !newFeedback.trim()} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl aspect-square p-0 flex items-center justify-center">
                                {submitting ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};
