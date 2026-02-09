import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BookOpen, MessageSquare, Clock, DollarSign, Shield, Zap, PlayCircle, ArrowLeft, Upload, Video, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCreatorById, getCoursesByCreator, getRoutines, getSparringVideos, getFeedbackSettings, createFeedbackRequest, toggleCreatorFollow, checkCreatorFollowStatus, uploadFeedbackVideo, getFeedbackRequests, deleteFeedbackRequest } from '../lib/api';
import { Creator, Course, FeedbackSettings, DrillRoutine, SparringVideo } from '../types';
import { CourseCard } from '../components/CourseCard';
import { UnifiedContentCard } from '../components/library/UnifiedContentCard';
import { Button } from '../components/Button';

export const CreatorProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [creator, setCreator] = useState<Creator | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [sparringVideos, setSparringVideos] = useState<SparringVideo[]>([]);
    const [activeTab, setActiveTab] = useState<'courses' | 'routines' | 'sparring'>('courses');
    const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscribeLoading, setSubscribeLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const [creatorData, coursesData, routinesData, sparringData, feedbackData] = await Promise.all([
                    getCreatorById(id),
                    getCoursesByCreator(id),
                    getRoutines(id),
                    getSparringVideos(50, id), // Fetch up to 50 videos for the profile
                    getFeedbackSettings(id)
                ]);
                setCreator(creatorData);
                setCourses(coursesData);
                setRoutines(routinesData);
                setSparringVideos(sparringData.data || []);

                if (feedbackData.data) {
                    setFeedbackSettings(feedbackData.data);
                }

                if (user && id) {
                    const subscribed = await checkCreatorFollowStatus(user.id, id);
                    setIsSubscribed(subscribed);
                }
            } catch (error) {
                console.error('Error fetching creator data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

    const handleSubmitFeedbackRequest = async () => {
        if (!user || !id || !selectedFile || !feedbackSettings) return;

        setSubmitting(true);
        setUploadProgress(0);
        try {
            // Self-Cleaning: Delete any existing pending requests for this student
            // This prevents orphaned storage files if they didn't complete previous checkout
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
                instructorId: id,
                videoUrl: url,
                description: description.trim(),
                price: feedbackSettings.price
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

    const handleSubscribe = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        if (!creator) return;

        setSubscribeLoading(true);

        const previousStatus = isSubscribed;
        // Optimistic update
        const newStatus = !isSubscribed;
        setIsSubscribed(newStatus);
        setCreator(prev => prev ? {
            ...prev,
            subscriberCount: prev.subscriberCount + (newStatus ? 1 : -1)
        } : null);

        try {
            const { followed } = await toggleCreatorFollow(user.id, creator.id);

            // Sync with server if response differs from optimistic update
            if (followed !== newStatus) {
                setIsSubscribed(followed);
                setCreator(prev => prev ? {
                    ...prev,
                    subscriberCount: prev.subscriberCount + (followed ? 1 : -1) - (newStatus ? 1 : -1)
                } : null);
            }
        } catch (error) {
            // Revert on error
            setIsSubscribed(previousStatus);
            setCreator(prev => prev ? {
                ...prev,
                subscriberCount: prev.subscriberCount + (previousStatus ? 1 : -1) - (newStatus ? 1 : -1)
            } : null);
            console.error('Follow error:', error);
            alert('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setSubscribeLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-zinc-500">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!creator) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">인스트럭터를 찾을 수 없습니다</h2>
                    <Link to="/">
                        <Button>홈으로 돌아가기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20 relative">
            {/* Floating Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-24 left-4 lg:left-8 z-[100] w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-xl"
                title="뒤로 가기"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>


            {/* Creator Header */}
            <div className="relative bg-zinc-900 border-b border-zinc-800 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-b from-violet-900/20 to-black pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Profile Image */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            {creator.profileImage ? (
                                <img
                                    src={creator.profileImage}
                                    alt={creator.name}
                                    className="relative w-32 h-32 md:w-40 md:h-40 rounded-full object-cover border-4 border-zinc-900 shadow-2xl"
                                />
                            ) : (
                                <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center">
                                    <Shield className="w-16 h-16 text-zinc-600" />
                                </div>
                            )}
                        </div>

                        {/* Creator Info */}
                        <div className="flex-1 text-center md:text-left w-full">
                            {/* Top Row: Name, Badge, Actions */}
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
                                    <h1 className="text-3xl md:text-4xl font-black text-white">{creator.name}</h1>
                                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs font-bold rounded border border-violet-500/30 self-center">INSTRUCTOR</span>
                                </div>

                                {/* Actions (Follow / Edit) */}
                                <div className="flex items-center justify-center md:justify-start gap-3">
                                    {user?.id === creator.id ? (
                                        <div className="flex gap-2">
                                            <Link to="/settings">
                                                <Button variant="outline" size="sm">프로필 수정</Button>
                                            </Link>
                                        </div>
                                    ) : (
                                        <Button
                                            size="sm"
                                            className={`shadow-lg transition-all px-6 font-bold ${isSubscribed
                                                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                                                : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'}`}
                                            onClick={handleSubscribe}
                                            disabled={subscribeLoading}
                                        >
                                            {isSubscribed ? '팔로잉' : '팔로우'}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Bio */}
                            <p className="text-zinc-400 mb-6 max-w-2xl leading-relaxed text-sm md:text-base mx-auto md:mx-0 whitespace-pre-line">
                                {creator.bio || '소개가 없습니다.'}
                            </p>

                            {/* Key Stats: Minimalist at Bottom */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-8 md:gap-12 py-2">
                                <div className="text-center md:text-left">
                                    <div className="font-black text-white text-xl md:text-2xl leading-none mb-1">{creator.subscriberCount}</div>
                                    <div className="text-xs text-zinc-500 font-medium">수련생</div>
                                </div>
                                <div className="text-center md:text-left">
                                    <div className="font-black text-white text-xl md:text-2xl leading-none mb-1">{courses.length}</div>
                                    <div className="text-xs text-zinc-500 font-medium">클래스</div>
                                </div>
                                <div className="text-center md:text-left">
                                    <div className="font-black text-white text-xl md:text-2xl leading-none mb-1">{routines.length}</div>
                                    <div className="text-xs text-zinc-500 font-medium">루틴</div>
                                </div>
                                <div className="text-center md:text-left">
                                    <div className="font-black text-white text-xl md:text-2xl leading-none mb-1">{sparringVideos.length}</div>
                                    <div className="text-xs text-zinc-500 font-medium">스파링</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1:1 Feedback Section */}
            {feedbackSettings?.enabled && user?.id !== creator.id && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="bg-gradient-to-r from-violet-900/40 to-purple-900/40 border border-violet-500/20 rounded-2xl p-6 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-violet-500/5 group-hover:bg-violet-500/10 transition-colors"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1 text-center md:text-left">
                                <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                                    <MessageSquare className="w-5 h-5 text-violet-400" />
                                    <h3 className="text-xl font-bold text-white">1:1 피드백 받기</h3>
                                </div>
                                <p className="text-zinc-400 text-sm mb-4">
                                    내 스파링 영상을 보내고 <span className="text-violet-400 font-bold">{creator.name}</span>님에게 직접 피드백을 받아보세요.
                                </p>
                                <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm">
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <DollarSign className="w-3.5 h-3.5 text-green-400" />
                                        <span className="text-zinc-300">₩{feedbackSettings.price.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                                        <span className="text-zinc-300">{feedbackSettings.turnaroundDays}일 이내</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFeedbackModal(true)}
                                className="px-6 py-2.5 bg-violet-600 text-white rounded-lg font-bold hover:bg-violet-500 transition-all shadow-lg shadow-violet-900/20 hover:scale-105 active:scale-95 text-sm"
                            >
                                피드백 요청하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Tab Navigation */}
                <div className="flex items-center gap-1 mb-6 border-b border-zinc-800 overflow-x-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold transition-all relative whitespace-nowrap ${activeTab === 'courses'
                            ? 'text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        <span>클래스</span>
                        <span className="text-xs opacity-60">({courses.length})</span>
                        {activeTab === 'courses' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('routines')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold transition-all relative whitespace-nowrap ${activeTab === 'routines'
                            ? 'text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <Zap className="w-4 h-4" />
                        <span>루틴</span>
                        <span className="text-xs opacity-60">({routines.length})</span>
                        {activeTab === 'routines' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('sparring')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold transition-all relative whitespace-nowrap ${activeTab === 'sparring'
                            ? 'text-white'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <PlayCircle className="w-4 h-4" />
                        <span>스파링</span>
                        <span className="text-xs opacity-60">({sparringVideos.length})</span>
                        {activeTab === 'sparring' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500"></div>
                        )}
                    </button>
                </div>

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                    <>
                        {courses.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {courses.map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-8 h-8 text-zinc-600" />
                                </div>
                                <p className="text-zinc-400 font-medium">아직 개설된 클래스가 없습니다.</p>
                            </div>
                        )}
                    </>
                )}

                {/* Routines Tab */}
                {activeTab === 'routines' && (
                    <>
                        {routines.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {routines.map((routine) => (
                                    <UnifiedContentCard
                                        key={routine.id}
                                        item={{
                                            id: routine.id,
                                            type: 'routine',
                                            title: routine.title,
                                            thumbnailUrl: routine.thumbnailUrl,
                                            creatorName: creator.name,
                                            creatorProfileImage: creator.profileImage,
                                            creatorId: creator.id,
                                            createdAt: routine.createdAt,
                                            views: routine.views,
                                            originalData: routine
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Zap className="w-8 h-8 text-zinc-600" />
                                </div>
                                <p className="text-zinc-400 font-medium">아직 개설된 루틴이 없습니다.</p>
                            </div>
                        )}
                    </>
                )}

                {/* Sparring Tab */}
                {activeTab === 'sparring' && (
                    <>
                        {sparringVideos.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {sparringVideos.map((video) => (
                                    <UnifiedContentCard
                                        key={video.id}
                                        item={{
                                            id: video.id,
                                            type: 'sparring',
                                            title: video.title,
                                            thumbnailUrl: video.thumbnailUrl,
                                            creatorName: creator.name,
                                            creatorProfileImage: creator.profileImage,
                                            creatorId: creator.id,
                                            createdAt: video.createdAt,
                                            views: video.views,
                                            originalData: video
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-zinc-900/30 rounded-2xl border border-zinc-800 border-dashed">
                                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PlayCircle className="w-8 h-8 text-zinc-600" />
                                </div>
                                <p className="text-zinc-400 font-medium">아직 업로드된 스파링 영상이 없습니다.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Feedback Request Modal */}
            {showFeedbackModal && (
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
                                        ₩{feedbackSettings?.price.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-violet-400/70">
                                    {feedbackSettings?.turnaroundDays}일 이내에 텍스트 피드백을 받으실 수 있습니다
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowFeedbackModal(false);
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
    );
};
