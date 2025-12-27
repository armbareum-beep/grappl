import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Award, BookOpen, MessageSquare, Clock, DollarSign, Shield, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCreatorById, getCoursesByCreator, getRoutines, getFeedbackSettings, createFeedbackRequest, subscribeToCreator, unsubscribeFromCreator, checkSubscriptionStatus } from '../lib/api';
import { Creator, Course, FeedbackSettings, DrillRoutine } from '../types';
import { CourseCard } from '../components/CourseCard';
import { DrillRoutineCard } from '../components/DrillRoutineCard';
import { Button } from '../components/Button';

export const CreatorProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [creator, setCreator] = useState<Creator | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [activeTab, setActiveTab] = useState<'courses' | 'routines'>('courses');
    const [feedbackSettings, setFeedbackSettings] = useState<FeedbackSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [videoUrl, setVideoUrl] = useState('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [subscribeLoading, setSubscribeLoading] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const [creatorData, coursesData, routinesData, feedbackData] = await Promise.all([
                    getCreatorById(id),
                    getCoursesByCreator(id),
                    getRoutines(id),
                    getFeedbackSettings(id)
                ]);
                setCreator(creatorData);
                setCourses(coursesData);
                setRoutines(routinesData);
                if (feedbackData.data) {
                    setFeedbackSettings(feedbackData.data);
                }

                if (user && id) {
                    const subscribed = await checkSubscriptionStatus(user.id, id);
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
        if (!user || !id || !videoUrl.trim() || !feedbackSettings) return;

        // Validate YouTube URL
        const isValidYouTubeUrl = videoUrl.includes('youtube.com/watch') || videoUrl.includes('youtu.be/');
        if (!isValidYouTubeUrl) {
            alert('올바른 YouTube URL을 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const { data, error } = await createFeedbackRequest({
                studentId: user.id,
                instructorId: id,
                videoUrl: videoUrl.trim(),
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
            setSubmitting(false);
        }
    };

    const handleSubscribe = async () => {
        if (!user) {
            alert('로그인이 필요한 서비스입니다.');
            return;
        }
        if (!creator) return;

        setSubscribeLoading(true);

        // Optimistic update
        const newStatus = !isSubscribed;
        setIsSubscribed(newStatus);
        setCreator(prev => prev ? {
            ...prev,
            subscriberCount: prev.subscriberCount + (newStatus ? 1 : -1)
        } : null);

        try {
            if (newStatus) {
                await subscribeToCreator(user.id, creator.id);
            } else {
                await unsubscribeFromCreator(user.id, creator.id);
            }
        } catch (error) {
            // Revert on error
            setIsSubscribed(!newStatus);
            setCreator(prev => prev ? {
                ...prev,
                subscriberCount: prev.subscriberCount + (newStatus ? -1 : 1)
            } : null);
            console.error('Subscription error:', error);
            alert('오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setSubscribeLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!creator) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">인스트럭터를 찾을 수 없습니다</h2>
                    <Link to="/">
                        <Button>홈으로 돌아가기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const totalViews = courses.reduce((sum, course) => sum + course.views, 0);

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Back Button */}
            <div className="bg-slate-900/50 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link to="/" className="inline-flex items-center text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        <span className="font-medium">홈으로</span>
                    </Link>
                </div>
            </div>

            {/* Creator Header */}
            <div className="relative bg-slate-900 border-b border-slate-800 overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/10 to-slate-900 pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Profile Image */}
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            {creator.profileImage ? (
                                <img
                                    src={creator.profileImage}
                                    alt={creator.name}
                                    className="relative w-40 h-40 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
                                />
                            ) : (
                                <div className="relative w-40 h-40 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center">
                                    <Shield className="w-16 h-16 text-slate-600" />
                                </div>
                            )}
                        </div>

                        {/* Creator Info */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <div>
                                    <h1 className="text-4xl font-black text-white mb-2">{creator.name}</h1>
                                    <div className="flex items-center justify-center md:justify-start gap-2">
                                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-xs font-bold rounded border border-indigo-500/20">INSTRUCTOR</span>
                                        {isSubscribed && <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs font-bold rounded border border-green-500/20">SUBSCRIBED</span>}
                                    </div>
                                </div>

                                {user?.id === creator.id && (
                                    <div className="flex gap-2">
                                        <Link to="/settings">
                                            <Button variant="outline" size="sm">프로필 수정</Button>
                                        </Link>
                                        <Link to="/creator/courses/new">
                                            <Button size="sm">새 강좌 만들기</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            <p className="text-lg text-slate-400 mb-8 max-w-2xl leading-relaxed">{creator.bio || '소개가 없습니다.'}</p>

                            {/* Stats */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-8">
                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg">
                                        <Users className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-bold uppercase">구독자</div>
                                        <div className="font-bold text-white text-lg">{creator.subscriberCount.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors">
                                    <div className="p-2 bg-blue-500/10 rounded-lg">
                                        <BookOpen className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-bold uppercase">강좌</div>
                                        <div className="font-bold text-white text-lg">{courses.length}개</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-slate-800/50 border border-slate-700 px-5 py-3 rounded-xl hover:bg-slate-800 transition-colors">
                                    <div className="p-2 bg-amber-500/10 rounded-lg">
                                        <Award className="w-5 h-5 text-amber-400" />
                                    </div>
                                    <div>
                                        <div className="text-xs text-slate-500 font-bold uppercase">총 조회수</div>
                                        <div className="font-bold text-white text-lg">{totalViews.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className={`shadow-lg transition-all min-w-[140px] ${isSubscribed
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'}`}
                                onClick={handleSubscribe}
                                disabled={subscribeLoading}
                            >
                                {isSubscribed ? '구독중' : '구독하기'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* 1:1 Feedback Section */}
            {feedbackSettings?.enabled && user?.id !== creator.id && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border border-indigo-500/30 rounded-2xl p-8 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                                        <MessageSquare className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-white">1:1 피드백 받기</h3>
                                </div>
                                <p className="text-slate-300 mb-4">
                                    <span className="text-indigo-400 font-bold">{creator.name}</span> 인스트럭터에게 내 스파링/드릴 영상을 보내고 직접 피드백을 받아보세요.
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
                                        <DollarSign className="w-4 h-4 text-green-400" />
                                        <span className="text-slate-300">₩{feedbackSettings.price.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-700">
                                        <Clock className="w-4 h-4 text-blue-400" />
                                        <span className="text-slate-300">{feedbackSettings.turnaroundDays}일 이내 응답</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFeedbackModal(true)}
                                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/20 hover:scale-105"
                            >
                                피드백 요청하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Request Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <h2 className="text-2xl font-bold text-white mb-6">피드백 요청하기</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    YouTube 영상 URL *
                                </label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500"
                                />
                                <p className="text-xs text-slate-500 mt-2">
                                    YouTube에 업로드한 영상의 링크를 입력해주세요 (비공개/unlisted 가능)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">
                                    질문 / 설명 (선택사항)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    placeholder="어떤 부분에 대한 피드백을 원하시나요?"
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-slate-500 resize-none"
                                />
                            </div>

                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-indigo-300">결제 금액</span>
                                    <span className="text-2xl font-bold text-white">
                                        ₩{feedbackSettings?.price.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-indigo-400/70">
                                    {feedbackSettings?.turnaroundDays}일 이내에 텍스트 피드백을 받으실 수 있습니다
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowFeedbackModal(false);
                                    setVideoUrl('');
                                    setDescription('');
                                }}
                                className="flex-1 px-4 py-3 border border-slate-700 text-slate-300 rounded-xl hover:bg-slate-800 transition-colors font-bold"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmitFeedbackRequest}
                                disabled={!videoUrl.trim() || submitting}
                                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-bold shadow-lg shadow-indigo-900/20"
                            >
                                {submitting ? '요청 중...' : '결제 및 요청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Creator Content - Courses and Routines */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Tab Navigation */}
                <div className="flex items-center gap-4 mb-6 border-b border-slate-800">
                    <button
                        onClick={() => setActiveTab('courses')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold transition-all relative ${activeTab === 'courses'
                                ? 'text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <BookOpen className="w-5 h-5" />
                        <span>강좌</span>
                        <span className="text-sm">({courses.length})</span>
                        {activeTab === 'courses' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('routines')}
                        className={`flex items-center gap-2 px-4 py-3 font-bold transition-all relative ${activeTab === 'routines'
                                ? 'text-white'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Zap className="w-5 h-5" />
                        <span>루틴</span>
                        <span className="text-sm">({routines.length})</span>
                        {activeTab === 'routines' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"></div>
                        )}
                    </button>
                </div>

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                    <>
                        {courses.length > 0 ? (
                            <div className="grid md:grid-cols-3 gap-6">
                                {courses.map((course) => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <BookOpen className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-slate-400 font-medium">아직 개설된 강좌가 없습니다.</p>
                                <p className="text-slate-600 text-sm mt-1">새로운 강좌가 곧 올라올 예정입니다.</p>
                            </div>
                        )}
                    </>
                )}

                {/* Routines Tab */}
                {activeTab === 'routines' && (
                    <>
                        {routines.length > 0 ? (
                            <div className="grid md:grid-cols-3 gap-6">
                                {routines.map((routine) => (
                                    <DrillRoutineCard key={routine.id} routine={routine} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
                                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Zap className="w-8 h-8 text-slate-600" />
                                </div>
                                <p className="text-slate-400 font-medium">아직 개설된 루틴이 없습니다.</p>
                                <p className="text-slate-600 text-sm mt-1">새로운 루틴이 곧 올라올 예정입니다.</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
