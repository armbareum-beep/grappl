import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getFeedbackRequests, submitFeedbackResponse, updateFeedbackStatus, uploadFeedbackVideo } from '../../lib/api';
import { FeedbackRequest } from '../../types';
import { MessageSquare, Clock, CheckCircle, XCircle, ExternalLink, Video, Loader2 } from 'lucide-react';
import { cn, getYouTubeEmbedUrl } from '../../lib/utils';
import { useToast } from '../../contexts/ToastContext';

type FilterStatus = 'all' | 'pending' | 'in_progress' | 'completed';

export const FeedbackRequestsTab: React.FC = () => {
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [requests, setRequests] = useState<FeedbackRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterStatus>('pending');
    const [selectedRequest, setSelectedRequest] = useState<FeedbackRequest | null>(null);
    const [feedbackContent, setFeedbackContent] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (user) {
            loadRequests();
        }
    }, [user?.id]);

    const loadRequests = async () => {
        if (!user) return;
        const { data } = await getFeedbackRequests(user.id, 'instructor');

        let finalRequests = data || [];

        // Add dummy data for testing if no real data exists
        if (finalRequests.length === 0) {
            finalRequests = [
                {
                    id: 'dummy-1',
                    studentId: 'student-1',
                    studentName: '김철수',
                    instructorId: user.id,
                    instructorName: '나크리에이터',
                    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                    description: '기초 가드 패스 동작에서 중심이 자꾸 무너집니다. 직접 찍은 영상 확인 후 피드백 부탁드려요!',
                    status: 'pending',
                    price: 30000,
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'dummy-2',
                    studentId: 'student-2',
                    studentName: '이영희',
                    instructorId: user.id,
                    instructorName: '나크리에이터',
                    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                    description: '클로즈드 가드에서 스윕 타이밍을 잡기가 어려워요. 영상 보고 피드백 부탁드립니다!',
                    status: 'in_progress',
                    price: 35000,
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: 'dummy-3',
                    studentId: 'student-3',
                    studentName: '박지민',
                    instructorId: user.id,
                    instructorName: '나크리에이터',
                    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
                    description: '백 포지션 유지하는 팁 알려주세요.',
                    status: 'completed',
                    feedbackContent: '중심을 낮게 유지하고 상대방의 골반을 컨트롤하는 것이 중요합니다. 영상에서 본 것처럼 훅을 더 깊게 넣어보세요.',
                    price: 30000,
                    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
                    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
                }
            ];
        }

        setRequests(finalRequests);
        setLoading(false);
    };

    const handleSubmitFeedback = async () => {
        if (!selectedRequest || !feedbackContent.trim() || !user) return;

        setSubmitting(true);
        setUploadProgress(0);
        try {
            let responseVideoUrl = undefined;

            // 1. Upload instructor's video if selected
            if (selectedFile) {
                const { url, error: uploadError } = await uploadFeedbackVideo(
                    user.id,
                    selectedFile,
                    (progress) => setUploadProgress(progress)
                );

                if (uploadError) throw uploadError;
                responseVideoUrl = url || undefined;
            }

            // 2. Submit feedback response with (optional) video URL
            const { error } = await submitFeedbackResponse(
                selectedRequest.id,
                feedbackContent.trim(),
                responseVideoUrl
            );

            if (!error) {
                await updateFeedbackStatus(selectedRequest.id, 'completed');
                success('피드백이 제출되었습니다!');
                setSelectedRequest(null);
                setFeedbackContent('');
                setSelectedFile(null);
                await loadRequests();
            } else {
                throw error;
            }
        } catch (error: any) {
            console.error('Feedback submission failed:', error);
            toastError(`제출 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
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
                                    <button
                                        onClick={() => setSelectedRequest(request)}
                                        className={cn(
                                            "px-6 py-2 rounded-lg font-bold transition-all flex items-center gap-2 shadow-lg",
                                            request.status === 'completed'
                                                ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700 shadow-none"
                                                : "bg-violet-600 text-white hover:bg-violet-700 shadow-violet-500/20"
                                        )}
                                    >
                                        {request.status === 'completed' ? (
                                            <>상세 보기</>
                                        ) : request.status === 'in_progress' ? (
                                            <>피드백 계속 작성</>
                                        ) : (
                                            <>피드백 작성하기</>
                                        )}
                                    </button>
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
                                <Video className="w-6 h-6 text-violet-400" />
                            </span>
                            {selectedRequest.status === 'completed' ? '피드백 내역 확인' : '피드백 보기 및 작성'}
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
                                        <div className="flex flex-col gap-3">
                                            <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-black group">
                                                {selectedRequest.videoUrl.includes('youtube.com') || selectedRequest.videoUrl.includes('youtu.be') ? (
                                                    <iframe
                                                        src={getYouTubeEmbedUrl(selectedRequest.videoUrl)}
                                                        className="absolute inset-0 w-full h-full"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : (
                                                    <video
                                                        src={selectedRequest.videoUrl}
                                                        className="absolute inset-0 w-full h-full object-contain"
                                                        controls
                                                        controlsList="nodownload"
                                                    />
                                                )}
                                            </div>
                                            <a
                                                href={selectedRequest.videoUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 hover:underline transition-colors text-sm"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                원본 영상 보기
                                            </a>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <h3 className="text-sm font-medium text-zinc-400 mb-2">요청 내용</h3>
                                        <p className="text-zinc-300 bg-zinc-900 p-3 rounded-lg border border-zinc-800">
                                            {selectedRequest.description || "내용 없음"}
                                        </p>
                                    </div>
                                    {selectedRequest.status === 'completed' && selectedRequest.feedbackContent && (
                                        <div className="md:col-span-2 border-t border-zinc-800 pt-6">
                                            <h3 className="text-sm font-medium text-violet-400 mb-3 flex items-center gap-2">
                                                <CheckCircle className="w-4 h-4" />
                                                작성된 피드백
                                            </h3>
                                            <div className="bg-violet-500/5 p-4 rounded-xl border border-violet-500/10 space-y-4">
                                                <p className="text-zinc-200 whitespace-pre-wrap leading-relaxed">
                                                    {selectedRequest.feedbackContent}
                                                </p>
                                                {selectedRequest.responseVideoUrl && (
                                                    <div className="space-y-2">
                                                        <p className="text-xs text-zinc-500 font-medium">첨부된 피드백 영상:</p>
                                                        <div className="relative aspect-video rounded-lg overflow-hidden border border-zinc-800 bg-black max-w-md">
                                                            <video
                                                                src={selectedRequest.responseVideoUrl}
                                                                className="absolute inset-0 w-full h-full object-contain"
                                                                controls
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Instructor Video Upload */}
                            <div>
                                <label className="block font-semibold text-white mb-2 ml-1">
                                    피드백 영상 <span className="text-zinc-500 font-normal text-sm ml-2">(선택 사항)</span>
                                </label>
                                <div className="space-y-4">
                                    {!selectedFile ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 px-4 py-6 bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-xl cursor-pointer hover:border-violet-500/50 hover:bg-zinc-900/50 transition-all group">
                                            <div className="flex flex-col items-center justify-center">
                                                <Video className="w-8 h-8 text-zinc-500 group-hover:text-violet-400 mb-2 transition-colors" />
                                                <p className="text-sm text-zinc-400">
                                                    <span className="font-semibold">클릭하여 영상 업로드</span> 또는 드래그 앤 드롭
                                                </p>
                                                <p className="text-xs text-zinc-600 mt-1">MP4, MOV, WebM (최대 500MB)</p>
                                            </div>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="video/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 500 * 1024 * 1024) {
                                                            toastError('파일 크기는 500MB를 초과할 수 없습니다.');
                                                            return;
                                                        }
                                                        setSelectedFile(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    ) : (
                                        <div className="bg-zinc-900 border border-violet-500/30 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-violet-500/20 rounded-lg">
                                                    <Video className="w-5 h-5 text-violet-400" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{selectedFile.name}</p>
                                                    <p className="text-xs text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)}MB</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setSelectedFile(null)}
                                                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-red-400 transition-all"
                                            >
                                                <XCircle className="w-5 h-5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-white mb-2 ml-1">
                                    피드백 내용 <span className="text-violet-500">*</span>
                                </label>
                                <textarea
                                    value={feedbackContent}
                                    onChange={(e) => setFeedbackContent(e.target.value)}
                                    rows={8}
                                    placeholder="학생에게 전달할 피드백을 작성해주세요..."
                                    className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-zinc-600 resize-none"
                                />
                                <p className="text-xs text-zinc-500 mt-2 ml-1">
                                    구체적이고 건설적인 피드백을 제공해주세요
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-4 border-t border-zinc-800">
                                {submitting && (
                                    <div className="w-full space-y-2 mb-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-violet-400 flex items-center gap-2">
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                업로드 중...
                                            </span>
                                            <span className="text-zinc-400">{uploadProgress}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-violet-500 transition-all duration-300 ease-out"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => {
                                            setSelectedRequest(null);
                                            setFeedbackContent('');
                                            setSelectedFile(null);
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
