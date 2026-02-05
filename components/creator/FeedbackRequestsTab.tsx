import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFeedbackRequests, submitFeedbackResponse, updateFeedbackStatus } from '../../lib/api';
import { FeedbackRequest } from '../../types';
import { MessageSquare, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export const FeedbackRequestsTab: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<FeedbackRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('pending');
    const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user?.id]);

    const loadRequests = async () => {
        if (!user) return;
        const { data } = await getFeedbackRequests(user.id, 'instructor');
        if (data) {
            setRequests(data);
        }
        setLoading(false);
    };

    const handleSubmitFeedback = async () => {
        if (!selectedRequest || !feedbackContent.trim()) return;

        setSubmitting(true);
        const { error } = await submitFeedbackResponse(selectedRequest.id, feedbackContent.trim());

        if (!error) {
            await updateFeedbackStatus(selectedRequest.id, 'completed');
            alert('피드백이 제출되었습니다!');
            setSelectedRequest(null);
            setFeedbackContent('');
            await loadRequests();
        } else {
            alert('제출 중 오류가 발생했습니다.');
        }
        setSubmitting(false);
    };

    const filteredRequests = requests.filter(req => {
        if (filter === 'all') return true;
        return req.status === filter;
    });

    const pendingCount = requests.filter(r => r.status === 'pending').length;
    const inProgressCount = requests.filter(r => r.status === 'in_progress').length;
    const completedCount = requests.filter(r => r.status === 'completed').length;

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">피드백 요청 관리</h2>
                <p className="text-zinc-400">학생들의 피드백 요청을 확인하고 응답하세요</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-zinc-800">
                <button
                    onClick={() => setFilter('pending')}
                    className={cn(
                        "pb-3 px-4 text-sm font-medium transition-all duration-200 border-b-2",
                        filter === 'pending'
                            ? 'text-violet-400 border-violet-400'
                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
                    )}
                >
                    대기 중 ({pendingCount})
                </button>
                <button
                    onClick={() => setFilter('in_progress')}
                    className={cn(
                        "pb-3 px-4 text-sm font-medium transition-all duration-200 border-b-2",
                        filter === 'in_progress'
                            ? 'text-violet-400 border-violet-400'
                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
                    )}
                >
                    진행 중 ({inProgressCount})
                </button>
                <button
                    onClick={() => setFilter('completed')}
                    className={cn(
                        "pb-3 px-4 text-sm font-medium transition-all duration-200 border-b-2",
                        filter === 'completed'
                            ? 'text-violet-400 border-violet-400'
                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
                    )}
                >
                    완료 ({completedCount})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={cn(
                        "pb-3 px-4 text-sm font-medium transition-all duration-200 border-b-2",
                        filter === 'all'
                            ? 'text-violet-400 border-violet-400'
                            : 'text-zinc-400 border-transparent hover:text-zinc-200 hover:border-zinc-700'
                    )}
                >
                    전체 ({requests.length})
                </button>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
                <div className="bg-zinc-900/30 rounded-xl border border-dashed border-zinc-800 p-12 text-center flex flex-col items-center justify-center">
                    <MessageSquare className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">
                        {filter === 'pending' ? '대기 중인 요청이 없습니다.' : '요청이 없습니다.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <div
                            key={request.id}
                            className="bg-zinc-900/40 rounded-xl border border-zinc-800 p-6 hover:border-violet-500/20 hover:bg-zinc-900/60 transition-all group"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-white group-hover:text-violet-400 transition-colors">
                                            {request.studentName || '학생'}
                                        </h3>
                                        <StatusBadge status={request.status} />
                                    </div>

                                    <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
                                        {request.description || '설명 없음'}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{new Date(request.createdAt).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                        <div className="font-semibold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                                            ₩{request.price.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <a
                                        href={request.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2 border border-zinc-700"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        영상 보기
                                    </a>
                                    {request.status === 'pending' && (
                                        <button
                                            onClick={() => setSelectedRequest(request)}
                                            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/20"
                                        >
                                            피드백 작성
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Feedback Modal */}
            {selectedRequest && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-zinc-900 rounded-xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto border border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="p-2 bg-violet-500/10 rounded-lg">
                                <MessageSquare className="w-6 h-6 text-violet-400" />
                            </span>
                            피드백 작성
                        </h2>

                        <div className="space-y-6">
                            <div className="bg-zinc-950/50 p-6 rounded-xl border border-zinc-800">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-sm font-medium text-zinc-400 mb-2">학생 정보</h3>
                                        <div className="text-white font-medium text-lg">{selectedRequest.studentName || '학생'}</div>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-zinc-400 mb-2">영상 확인</h3>
                                        <a
                                            href={selectedRequest.videoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 hover:underline transition-colors"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            YouTube에서 보기
                                        </a>
                                    </div>
                                    <div className="md:col-span-2">
                                        <h3 className="text-sm font-medium text-zinc-400 mb-2">요청 내용</h3>
                                        <p className="text-zinc-300 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                            {selectedRequest.description || "내용 없음"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-white mb-2 ml-1">
                                    피드백 내용 <span className="text-violet-500">*</span>
                                </label>
                                <textarea
                                    value={feedbackContent}
                                    onChange={(e) => setFeedbackContent(e.target.value)}
                                    rows={12}
                                    placeholder="학생에게 전달할 피드백을 작성해주세요..."
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600 resize-none"
                                />
                                <p className="text-xs text-zinc-500 mt-2 ml-1">
                                    구체적이고 건설적인 피드백을 제공해주세요
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4 border-t border-zinc-800">
                                <button
                                    onClick={() => {
                                        setSelectedRequest(null);
                                        setFeedbackContent('');
                                    }}
                                    className="flex-1 px-4 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 hover:text-white transition-colors font-medium"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmitFeedback}
                                    disabled={!feedbackContent.trim() || submitting}
                                    className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg shadow-lg shadow-violet-500/20"
                                >
                                    {submitting ? '제출 중...' : '피드백 제출'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = {
        pending: { label: '대기 중', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
        in_progress: { label: '진행 중', className: 'bg-violet-500/10 text-violet-400 border-violet-500/20', icon: MessageSquare },
        completed: { label: '완료', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
        cancelled: { label: '취소됨', className: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: XCircle }
    };

    const { label, className, icon: Icon } = config[status as keyof typeof config] || config.pending;

    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border", className)}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
};
