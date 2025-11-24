import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Award, BookOpen, MessageSquare, Clock, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCreatorById, getCoursesByCreator, getFeedbackSettings, createFeedbackRequest, subscribeToCreator, unsubscribeFromCreator, checkSubscriptionStatus } from '../lib/api';
import { Creator, Course, FeedbackSettings } from '../types';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';

export const CreatorProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [creator, setCreator] = useState<Creator | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
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
                const [creatorData, coursesData, feedbackData] = await Promise.all([
                    getCreatorById(id),
                    getCoursesByCreator(id),
                    getFeedbackSettings(id)
                ]);
                setCreator(creatorData);
                setCourses(coursesData);
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
        const { error } = await createFeedbackRequest({
            studentId: user.id,
            instructorId: id,
            videoUrl: videoUrl.trim(),
            description: description.trim(),
            price: feedbackSettings.price
        });

        if (!error) {
            alert('피드백 요청이 완료되었습니다!');
            setShowFeedbackModal(false);
            setVideoUrl('');
            setDescription('');
        } else {
            alert('요청 중 오류가 발생했습니다.');
        }
        setSubmitting(false);
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!creator) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">인스트럭터를 찾을 수 없습니다</h2>
                    <Link to="/">
                        <Button>홈으로 돌아가기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const totalViews = courses.reduce((sum, course) => sum + course.views, 0);

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Back Button */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <Link to="/" className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        <span className="font-medium">홈으로</span>
                    </Link>
                </div>
            </div>

            {/* Creator Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                        {/* Profile Image */}
                        <img
                            src={creator.profileImage}
                            alt={creator.name}
                            className="w-40 h-40 rounded-full object-cover border-4 border-blue-100 shadow-lg"
                        />

                        {/* Creator Info */}
                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                                <h1 className="text-4xl font-black text-slate-900">{creator.name}</h1>
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
                            <p className="text-lg text-slate-600 mb-6 max-w-2xl">{creator.bio}</p>

                            {/* Stats */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-6 mb-6">
                                <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <div className="text-sm text-slate-500">구독자</div>
                                        <div className="font-bold text-slate-900">{creator.subscriberCount.toLocaleString()}</div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg">
                                    <BookOpen className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <div className="text-sm text-slate-500">강좌</div>
                                        <div className="font-bold text-slate-900">{courses.length}개</div>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2 bg-slate-50 px-4 py-2 rounded-lg">
                                    <Award className="w-5 h-5 text-blue-600" />
                                    <div>
                                        <div className="text-sm text-slate-500">총 조회수</div>
                                        <div className="font-bold text-slate-900">{totalViews.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                className={`shadow-lg transition-all ${isSubscribed ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : ''}`}
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
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 text-white">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <MessageSquare className="w-8 h-8" />
                                    <h3 className="text-2xl font-bold">1:1 피드백 받기</h3>
                                </div>
                                <p className="text-purple-100 mb-4">
                                    {creator.name} 인스트럭터에게 직접 피드백을 받아보세요
                                </p>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4" />
                                        <span>₩{feedbackSettings.price.toLocaleString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        <span>{feedbackSettings.turnaroundDays}일 이내 응답</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowFeedbackModal(true)}
                                className="px-8 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors shadow-lg"
                            >
                                피드백 요청하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Feedback Request Modal */}
            {showFeedbackModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-8">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">피드백 요청하기</h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    YouTube 영상 URL *
                                </label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => setVideoUrl(e.target.value)}
                                    placeholder="https://youtube.com/watch?v=..."
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    YouTube에 업로드한 영상의 링크를 입력해주세요 (비공개/unlisted 가능)
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    질문 / 설명 (선택사항)
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    placeholder="어떤 부분에 대한 피드백을 원하시나요?"
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-semibold text-slate-900">결제 금액</span>
                                    <span className="text-2xl font-bold text-purple-600">
                                        ₩{feedbackSettings?.price.toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600">
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
                                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSubmitFeedbackRequest}
                                disabled={!videoUrl.trim() || submitting}
                                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? '요청 중...' : '결제 및 요청하기'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Creator Courses */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">
                    {creator.name}의 강좌 ({courses.length})
                </h2>

                {courses.length > 0 ? (
                    <div className="grid md:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <CourseCard key={course.id} course={course} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                        <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">아직 개설된 강좌가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
