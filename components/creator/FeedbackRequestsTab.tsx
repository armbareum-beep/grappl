import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFeedbackRequests, submitFeedbackResponse, updateFeedbackStatus } from '../../lib/api';
import { FeedbackRequest } from '../../types';
import { MessageSquare, Clock, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

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
    }, [user]);

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">피드백 요청 관리</h2>
                <p className="text-slate-400">학생들의 피드백 요청을 확인하고 응답하세요</p>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-6 border-b border-slate-800">
                <button
                    onClick={() => setFilter('pending')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${filter === 'pending'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    대기 중 ({pendingCount})
                </button>
                <button
                    onClick={() => setFilter('in_progress')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${filter === 'in_progress'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    진행 중 ({inProgressCount})
                </button>
                <button
                    onClick={() => setFilter('completed')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${filter === 'completed'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    완료 ({completedCount})
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors ${filter === 'all'
                        ? 'text-blue-400 border-b-2 border-blue-400'
                        : 'text-slate-400 hover:text-slate-200'
                        }`}
                >
                    전체 ({requests.length})
                </button>
            </div>

            {/* Requests List */}
            {filteredRequests.length === 0 ? (
                <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center">
                    <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-500">
                        {filter === 'pending' ? '대기 중인 요청이 없습니다.' : '요청이 없습니다.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => (
                        <div
                            key={request.id}
                            className="bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-slate-700 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-semibold text-white">
                                            {request.studentName || '학생'}
                                        </h3>
                                        <StatusBadge status={request.status} />
                                    </div>

                                    <p className="text-sm text-slate-400 mb-3">
                                        {request.description || '설명 없음'}
                                    </p>

                                    <div className="flex items-center gap-4 text-sm text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{new Date(request.createdAt).toLocaleDateString('ko-KR')}</span>
                                        </div>
                                        <div className="font-semibold text-purple-400">
                                            ₩{request.price.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <a
                                        href={request.videoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        영상 보기
                                    </a>
                                    {request.status === 'pending' && (
                                        <button
                                            onClick={() => setSelectedRequest(request)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-xl max-w-4xl w-full p-8 max-h-[90vh] overflow-y-auto border border-slate-800">
                        <h2 className="text-2xl font-bold text-white mb-6">피드백 작성</h2>

                        <div className="mb-6">
                            <h3 className="font-semibold text-white mb-2">학생 정보</h3>
                            <p className="text-slate-400">{selectedRequest.studentName || '학생'}</p>
                            <p className="text-sm text-slate-500 mt-1">{selectedRequest.description}</p>
                        </div>

                        <div className="mb-6">
                            <h3 className="font-semibold text-white mb-2">영상</h3>
                            <a
                                href={selectedRequest.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-400 hover:underline"
                            >
                                <ExternalLink className="w-4 h-4" />
                                YouTube에서 보기
                            </a>
                        </div>

                        <div className="mb-6">
                            <label className="block font-semibold text-white mb-2">
                                피드백 내용 *
                            </label>
                            <textarea
                                value={feedbackContent}
                                onChange={(e) => setFeedbackContent(e.target.value)}
                                rows={12}
                                placeholder="학생에게 전달할 피드백을 작성해주세요..."
                                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                구체적이고 건설적인 피드백을 제공해주세요
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setSelectedRequest(null);
                                    setFeedbackContent('');
                                }}
                                className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmitFeedback}
                                disabled={!feedbackContent.trim() || submitting}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? '제출 중...' : '피드백 제출'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const config = {
        pending: { label: '대기 중', color: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', icon: Clock },
        in_progress: { label: '진행 중', color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', icon: MessageSquare },
        completed: { label: '완료', color: 'bg-green-500/10 text-green-400 border border-green-500/20', icon: CheckCircle },
        cancelled: { label: '취소됨', color: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', icon: XCircle }
    };

    const { label, color, icon: Icon } = config[status as keyof typeof config] || config.pending;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
            <Icon className="w-3 h-3" />
            {label}
        </span>
    );
};
