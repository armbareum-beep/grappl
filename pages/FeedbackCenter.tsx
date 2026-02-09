import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getFeedbackRequests, getAvailableInstructorsForFeedback, createFeedbackRequest, uploadFeedbackVideo, deleteFeedbackRequest } from '../lib/api';
import { FeedbackRequest } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { MessageSquare, Video, Clock, CheckCircle2, ChevronRight, Info, Users, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';

export const FeedbackCenter: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [feedbacks, setFeedbacks] = useState<FeedbackRequest[]>([]);
    const [availableInstructors, setAvailableInstructors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFeedback, setSelectedFeedback] = useState<FeedbackRequest | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedInstructor, setSelectedInstructor] = useState<any | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        async function fetchData() {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const [feedbackRes, instructorsRes] = await Promise.all([
                    getFeedbackRequests(user.id, 'student'),
                    getAvailableInstructorsForFeedback()
                ]);

                console.log('Feedback Response:', feedbackRes);
                console.log('Instructors Response:', instructorsRes);

                // Process feedbacks - only use real data
                const finalFeedbacks = feedbackRes.data || [];
                setFeedbacks(finalFeedbacks);

                // Process instructors - only use real data
                const instructors = instructorsRes.data || [];
                setAvailableInstructors(instructors);

                if (instructorsRes.error) {
                    console.error('Instructors fetch error:', instructorsRes.error);
                }

            } catch (err) {
                console.error('Error fetching feedback center:', err);
                setError('데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [user, error]);

    const handleSubmitFeedbackRequest = async () => {
        if (!user || !selectedInstructor || !selectedFile) return;

        setSubmitting(true);
        setUploadProgress(0);
        try {
            // Self-Cleaning: Delete any existing pending requests for this student
            const { data: existingRequests } = await getFeedbackRequests(user.id, 'student');
            if (existingRequests) {
                const pendingRequests = existingRequests.filter(req => req.status === 'pending');
                for (const req of pendingRequests) {
                    await deleteFeedbackRequest(req.id);
                }
            }

            // 1. Upload video to storage
            const { url, error: uploadError } = await uploadFeedbackVideo(
                user.id,
                selectedFile,
                (progress) => setUploadProgress(progress)
            );

            if (uploadError) throw uploadError;
            if (!url) throw new Error('파일 업로드 후 URL을 받지 못했습니다.');

            // 2. Create feedback request with the storage URL
            const { data, error } = await createFeedbackRequest({
                studentId: user.id,
                instructorId: selectedInstructor.id,
                videoUrl: url,
                description: description.trim(),
                price: selectedInstructor.feedbackSettings?.price
            });

            if (error) throw error;
            if (!data) throw new Error('데이터가 생성되지 않았습니다.');

            // Redirect to checkout
            navigate(`/checkout/feedback/${data.id}`);
        } catch (error: any) {
            console.error('Feedback request failed:', error);
            alert(`요청 중 오류가 발생했습니다: ${error.message || error.details || JSON.stringify(error) || '알 수 없는 오류'}`);
        } finally {
            setSubmitting(false);
            setUploadProgress(0);
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="bg-zinc-950 min-h-screen pb-20">
            <div className="max-w-7xl mx-auto py-8 space-y-12 px-4 md:px-8">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">피드백 센터</h1>
                    <p className="text-zinc-400">인스트럭터에게 직접 질문하고 영상 피드백을 받아보세요.</p>
                </div>

                {/* Section 1: Available Instructors */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Users className="w-5 h-5 text-violet-400" />
                            피드백 신청 가능한 인스트럭터
                        </h2>
                        <Link to="/instructors" className="text-sm text-zinc-500 hover:text-white transition-colors flex items-center gap-1 font-medium">
                            모든 인스트럭터 보기 <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {availableInstructors.map((instructor) => (
                            <Link
                                key={instructor.id}
                                to={`/creator/${instructor.id}`}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1 no-underline"
                            >
                                {/* Glowing Backlight Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                {/* Card Header Background */}
                                <div className="h-32 bg-gradient-to-b from-zinc-800 to-zinc-900 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent opacity-50"></div>

                                    {/* Price Badge */}
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-zinc-950/50 border border-violet-500/30 rounded-full backdrop-blur-sm">
                                        <span className="text-[10px] font-bold text-violet-300 tracking-wider">₩{instructor.feedbackSettings?.price?.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Avatar (Centered) */}
                                <div className="relative -mt-16 flex justify-center mb-4 z-10">
                                    <div className="w-32 h-32 rounded-full p-1 bg-zinc-900 ring-4 ring-zinc-900 group-hover:ring-violet-500/30 transition-all duration-300 shadow-xl">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 relative">
                                            <img
                                                src={instructor.profile_image}
                                                alt={instructor.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Content (Centered) */}
                                <div className="px-6 pb-8 flex-1 flex flex-col items-center text-center z-10">
                                    <h3 className="text-xl font-bold text-white group-hover:text-violet-400 transition-colors mb-2">
                                        {instructor.name}
                                    </h3>

                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-6 max-w-sm leading-relaxed min-h-[40px] px-2">
                                        {instructor.bio || '영상 피드백 제공 중'}
                                    </p>

                                    {/* Specialties */}
                                    {instructor.specialties && instructor.specialties.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                            {instructor.specialties.slice(0, 2).map((s: string) => (
                                                <span key={s} className="bg-zinc-800/50 text-zinc-300 text-[11px] px-2 py-1 rounded-lg border border-zinc-700/50 font-medium">
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="w-full pt-6 mt-auto border-t border-zinc-800/50">
                                        <div className="flex items-center justify-center gap-4 mb-6 text-xs text-zinc-400">
                                            <div className="flex items-center gap-1 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-violet-500" />
                                                {instructor.feedbackSettings?.turnaroundDays || '3'}일 내 답변
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSelectedInstructor(instructor);
                                            }}
                                            className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn border border-violet-500/30 hover:border-violet-500"
                                        >
                                            <span>피드백 신청</span>
                                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {availableInstructors.length === 0 && (
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-12 text-center">
                            <Info className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                            <p className="text-zinc-500">현재 피드백 신청이 가능한 인스트럭터가 없습니다.</p>
                        </div>
                    )}
                </section>

                <div className="h-px bg-zinc-800/50" />

                {/* Section 2: My Feedback Requests */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-violet-400" />
                            내 피드백 요청 내역
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {feedbacks.map((feedback) => (
                            <button
                                key={feedback.id}
                                onClick={() => setSelectedFeedback(feedback)}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1 text-left"
                            >
                                {/* Glowing Backlight Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                {/* Card Header Background with Video Thumbnail */}
                                <div className="h-40 bg-gradient-to-b from-zinc-800 to-zinc-900 relative overflow-hidden">
                                    <div className="absolute inset-0">
                                        {feedback.videoUrl ? (
                                            <video
                                                src={feedback.videoUrl}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                onLoadedMetadata={(e) => {
                                                    e.currentTarget.currentTime = e.currentTarget.duration * 0.25;
                                                }}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                <Video className="w-12 h-12 text-zinc-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4 z-10">
                                        {feedback.status === 'completed' ? (
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/20 px-3 py-1.5 rounded-full border border-green-500/40 backdrop-blur-sm">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> 완료
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/40 backdrop-blur-sm">
                                                <Clock className="w-3.5 h-3.5" /> {feedback.status === 'pending' ? '결제 대기' : '진행 중'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content Section */}
                                <div className="p-6 space-y-4 flex-1 flex flex-col relative z-10">
                                    {/* Instructor Info */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-violet-400 uppercase tracking-wider">인스트럭터</p>
                                        <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                                            {feedback.instructorName || '인스트럭터 미정'}
                                        </h3>
                                    </div>

                                    {/* Description */}
                                    <div className="space-y-2 flex-1">
                                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">질문 내용</p>
                                        <p className="text-sm text-zinc-300 line-clamp-3 leading-relaxed">
                                            {feedback.description || '내용 없음'}
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                                        <span className="text-xs text-zinc-500 font-medium">
                                            {new Date(feedback.createdAt).toLocaleDateString('ko-KR')}
                                        </span>
                                        <span className="text-xs text-violet-400 font-bold flex items-center gap-1">
                                            상세 보기 <ChevronRight className="w-4 h-4" />
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}

                        {feedbacks.length === 0 && (
                            <div className="col-span-full py-20 text-center bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                                <Video className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                                <h3 className="text-white font-bold text-lg mb-2">요청한 피드백이 없습니다</h3>
                                <p className="text-zinc-500 text-sm mb-8">인스트럭터의 조언이 필요하다면 첫 피드백을 신청해 보세요!</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {selectedFeedback && (
                <FeedbackDetailModal
                    feedback={selectedFeedback}
                    onClose={() => setSelectedFeedback(null)}
                />
            )}
        </div>
    );
};

function FeedbackDetailModal({ feedback, onClose }: { feedback: FeedbackRequest; onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 scrollbar-hide">
                <div className="sticky top-0 z-10 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800 px-8 py-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            피드백 상세 내역
                            {feedback.status === 'completed' && (
                                <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 font-bold">완료</span>
                            )}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">{feedback.instructorName} 인스트럭터</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-8 space-y-10">
                    {/* Student Question */}
                    <div className="space-y-5">
                        <div className="flex items-center gap-2 text-zinc-300 text-sm font-bold bg-zinc-800/50 w-fit px-3 py-1.5 rounded-lg border border-zinc-700/50">
                            <Video className="w-4 h-4 text-violet-400" /> 내 질문 영상 및 내용
                        </div>
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-xl group relative">
                            <video
                                src={feedback.videoUrl}
                                controls
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="bg-zinc-800/20 rounded-2xl p-6 border border-zinc-800/50">
                            <p className="text-zinc-200 text-base leading-relaxed whitespace-pre-wrap">{feedback.description || '입력된 내용이 없습니다.'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="h-px bg-zinc-800 flex-1" />
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
                            <ChevronRight className="w-4 h-4 text-zinc-600 rotate-90" />
                        </div>
                        <div className="h-px bg-zinc-800 flex-1" />
                    </div>

                    {/* Instructor Response */}
                    <div className="space-y-5 pb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-violet-400 text-sm font-bold bg-violet-600/10 w-fit px-3 py-1.5 rounded-lg border border-violet-500/20">
                                <MessageSquare className="w-4 h-4" /> {feedback.instructorName} 인스트럭터의 피드백
                            </div>
                        </div>

                        {feedback.status === 'completed' ? (
                            <div className="space-y-6">
                                {feedback.responseVideoUrl && (
                                    <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-violet-500/30 shadow-[0_0_30px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/20">
                                        <video
                                            src={feedback.responseVideoUrl}
                                            controls
                                            autoPlay
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="bg-violet-600/5 border border-violet-500/20 rounded-2xl p-7 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-5">
                                        <MessageSquare className="w-20 h-20 text-violet-400" />
                                    </div>
                                    <p className="text-zinc-100 text-base md:text-lg leading-relaxed whitespace-pre-wrap font-medium">
                                        {feedback.feedbackContent || '작성된 피드백 내용이 없습니다.'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-zinc-900 border border-dashed border-zinc-700 rounded-3xl p-16 text-center">
                                <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-700/50">
                                    <Clock className="w-10 h-10 text-violet-400 animate-pulse" />
                                </div>
                                <h4 className="text-white font-bold text-xl mb-2">인스트럭터가 분석 중입니다</h4>
                                <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-2 leading-relaxed">정성스러운 피드백을 전달해 드리기 위해 꼼꼼히 영상을 확인하고 있어요.</p>
                                <p className="text-violet-500 text-xs font-bold bg-violet-500/10 inline-block px-3 py-1 rounded-full border border-violet-500/20">완료되면 알림으로 보내드릴게요!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Feedback Request Modal */}
                {selectedInstructor && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h2 className="text-2xl font-bold text-white mb-6">피드백 요청하기</h2>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        영문/숫자 파일명의 영상 업로드 (MP4, MOV 등) *
                                    </label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${selectedFile
                                            ? 'border-violet-500/50 bg-violet-500/5'
                                            : 'border-zinc-700 hover:border-zinc-600 bg-black/50'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    if (file.size > 500 * 1024 * 1024) { // 500MB limit for now
                                                        alert('파일 크기는 500MB 이하의 영상만 가능합니다.');
                                                        return;
                                                    }
                                                    setSelectedFile(file);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />

                                        {selectedFile ? (
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 bg-violet-500/20 rounded-full flex items-center justify-center mb-3">
                                                    <Video className="w-6 h-6 text-violet-400" />
                                                </div>
                                                <p className="text-white font-medium mb-1 truncate max-w-xs">{selectedFile.name}</p>
                                                <p className="text-xs text-zinc-500">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFile(null);
                                                    }}
                                                    className="mt-4 text-xs text-zinc-500 hover:text-white transition-colors"
                                                >
                                                    파일 변경하기
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-3">
                                                    <Upload className="w-6 h-6 text-zinc-400" />
                                                </div>
                                                <p className="text-zinc-300 font-medium mb-1">클릭하거나 영상을 드래그하세요</p>
                                                <p className="text-xs text-zinc-500">MP4, MOV (최대 500MB)</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                        <p className="text-xs text-amber-200/80 leading-relaxed">
                                            한글 파일명은 업로드가 실패할 수 있습니다. <strong>영문이나 숫자</strong>로 된 파일명으로 변경 후 업로드해주세요.
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">
                                        질문 / 설명 (선택사항)
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="어떤 부분에 대한 피드백을 원하시나요?"
                                        className="w-full px-4 py-3 bg-black border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder-zinc-600 resize-none"
                                    />
                                </div>

                                <div className="bg-violet-900/20 border border-violet-500/30 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-semibold text-violet-300">결제 금액</span>
                                        <span className="text-2xl font-bold text-white">
                                            ₩{selectedInstructor.feedbackSettings?.price.toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-xs text-violet-400/70">
                                        {selectedInstructor.feedbackSettings?.turnaroundDays}일 이내에 텍스트 피드백을 받으실 수 있습니다
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedInstructor(null);
                                        setSelectedFile(null);
                                        setDescription('');
                                    }}
                                    className="flex-1 px-4 py-3 border border-zinc-700 text-zinc-300 rounded-xl hover:bg-zinc-800 transition-colors font-bold"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSubmitFeedbackRequest}
                                    disabled={!selectedFile || submitting}
                                    className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-violet-900/20"
                                >
                                    {submitting ? (
                                        <div className="w-full flex flex-col items-center gap-2">
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>업로드 중... {uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-violet-500 transition-all duration-300 ease-out"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    ) : '결제 및 요청하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
