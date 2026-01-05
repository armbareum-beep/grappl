import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLessonById, getCourseById, checkCourseOwnership } from '../lib/api';
import { toggleLessonLike, checkLessonLiked } from '../lib/api-lessons';
import { Lock, Heart } from 'lucide-react';
import { Lesson, Course } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Calendar, Eye, Clock, BookOpen, Share2 } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const LessonDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isSubscribed, isAdmin } = useAuth();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);
    const [owns, setOwns] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;
            setLoading(true);
            setOwns(false);

            try {
                const lessonData = await getLessonById(id);
                setLesson(lessonData);

                if (lessonData) {
                    // Check like status
                    if (user) {
                        checkLessonLiked(user.id, lessonData.id).then(({ liked }) => setIsLiked(liked));
                    }

                    let courseData = null;
                    if (lessonData.courseId) {
                        courseData = await getCourseById(lessonData.courseId);
                        setCourse(courseData);
                    }

                    const isCreator = user && courseData && courseData.creatorId === user.id;
                    const isOwner = user && lessonData.courseId ? await checkCourseOwnership(user.id, lessonData.courseId) : false;

                    // Core Permission Check
                    let hasAccess = isAdmin || (isSubscribed && !lessonData.isSubscriptionExcluded) || isOwner || isCreator;

                    // 1. Check if first lesson of its course OR course is free (Free Preview/Access)
                    if (!hasAccess && (lessonData.lessonNumber === 1 || (courseData && courseData.price === 0))) {
                        hasAccess = true;
                    }

                    setOwns(hasAccess || false);

                    // 2. Check if this belongs to the daily free course
                    if (!hasAccess && lessonData.courseId) {
                        try {
                            const { getDailyFreeCourse } = await import('../lib/api');
                            const { data: dailyCourse } = await getDailyFreeCourse();
                            if (dailyCourse && dailyCourse.id === lessonData.courseId) {
                                hasAccess = true;
                                setOwns(true);
                            }
                        } catch (e) {
                            console.warn('Failed to check daily free course access:', e);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching lesson details:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id, user, isSubscribed, isAdmin]);

    if (loading) {
        return <LoadingScreen message="레슨 정보를 불러오는 중..." />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!lesson) {
        return <ErrorScreen
            title="레슨을 찾을 수 없습니다"
            error="요청하신 레슨이 존재하지 않거나 액세스 권한이 없습니다."
            resetMessage="브라우저를 새로고침하거나 고객센터에 문의해주세요."
        />;
    }

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 selection:bg-violet-500/30 relative">
            {/* Floating Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="fixed top-24 left-4 lg:left-8 z-[100] w-12 h-12 rounded-full bg-zinc-900/80 backdrop-blur-md border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 hover:border-zinc-700 transition-all shadow-xl"
                title="뒤로 가기"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Main Content Area */}
            <div className="pt-24 pb-20 px-4 lg:px-8 max-w-[1800px] mx-auto">
                <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">

                    {/* Left Column: Video Player & Main Info */}
                    <div className="flex-1 min-w-0">
                        {/* Video Player Container */}
                        <div className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-2xl ring-1 ring-zinc-800 group mb-8">
                            {/* Ambient Glow */}
                            <div className="absolute -inset-1 bg-violet-500/20 blur-3xl opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-1000"></div>

                            <div className="relative h-full z-10">
                                {owns && (lesson.videoUrl || lesson.vimeoUrl) ? (
                                    <VideoPlayer
                                        vimeoId={lesson.videoUrl || lesson.vimeoUrl || ''}
                                        title={lesson.title}
                                        onProgress={() => { }}
                                        onEnded={() => { }}
                                    />
                                ) : !owns ? (
                                    <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center relative">
                                        {course?.thumbnailUrl && (
                                            <img
                                                src={course.thumbnailUrl}
                                                alt={course?.title}
                                                className="absolute inset-0 w-full h-full object-cover opacity-30"
                                            />
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent"></div>

                                        <div className="relative z-10 flex flex-col items-center p-4 md:p-8 text-center max-w-lg">
                                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-zinc-800/80 backdrop-blur-md flex items-center justify-center mb-4 md:mb-6 border border-zinc-700 shadow-xl">
                                                <Lock className="w-5 h-5 md:w-6 md:h-6 text-zinc-400" />
                                            </div>
                                            <h2 className="text-xl md:text-3xl font-bold text-white mb-2 md:mb-3 tracking-tight px-4">잠겨있는 레슨입니다</h2>
                                            <p className="text-zinc-400 text-sm md:text-lg mb-6 md:mb-8 px-4">
                                                이 클래스를 구매하거나 구독하여 시청하세요.
                                            </p>

                                            <Link to="/pricing">
                                                <Button className="rounded-full px-6 py-4 md:px-8 md:py-6 text-base md:text-lg bg-violet-600 hover:bg-violet-500 border-none shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                                                    구독/구매 안내 보기
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
                                        <div className="w-16 h-16 border-4 border-zinc-700 border-t-violet-500 rounded-full animate-spin mb-4"></div>
                                        <p className="text-xl font-medium text-white mb-2">비디오 처리 중입니다</p>
                                        <p className="text-sm text-zinc-500">업로드된 영상을 처리하고 있습니다. 잠시만 기다려주세요.</p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="mt-6 px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-full transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                                        >
                                            새로고침
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Title & Stats */}
                        <div className="mb-12">
                            <div className="flex flex-wrap items-center gap-3 mb-4">
                                {course && (
                                    <span className="px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-violet-400 text-xs font-bold tracking-wide uppercase shadow-sm">
                                        {course.category}
                                    </span>
                                )}
                                <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium">
                                    <Eye className="w-4 h-4" />
                                    {lesson.views?.toLocaleString() || 0} 조회
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                                <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium">
                                    <Clock className="w-4 h-4" />
                                    {lesson.durationMinutes}분
                                </div>
                                <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
                                <div className="flex items-center gap-1.5 text-zinc-500 text-sm font-medium">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(lesson.createdAt).toLocaleDateString()}
                                </div>
                            </div>

                            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
                                {lesson.title}
                            </h1>

                            {/* Actions: Like & Share */}
                            <div className="flex items-center gap-3 mb-8">
                                <button
                                    onClick={async () => {
                                        if (!user || !lesson) return navigate('/login');
                                        const { liked } = await toggleLessonLike(user.id, lesson.id);
                                        setIsLiked(liked);
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all text-sm font-bold ${isLiked ? 'bg-zinc-900 border-red-500/50 text-red-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                                >
                                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                    좋아요
                                </button>
                                <button
                                    onClick={() => setIsShareModalOpen(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all border border-zinc-800 text-sm font-bold"
                                >
                                    <Share2 className="w-4 h-4" />
                                    공유하기
                                </button>
                            </div>

                            <div className="border-t border-zinc-900 pt-8">
                                <h3 className="text-zinc-100 text-lg font-bold mb-4 flex items-center gap-2">
                                    레슨 설명
                                </h3>
                                <div className="prose prose-invert prose-zinc max-w-none text-zinc-400 leading-relaxed text-sm md:text-base">
                                    <p className="whitespace-pre-line">{lesson.description}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Sidebar (Included Course) */}
                    {course && (
                        <div className="w-full lg:w-[400px] shrink-0">
                            <div className="sticky top-24 space-y-6">
                                <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-widest px-1">포함된 클래스</h3>

                                <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-3xl overflow-hidden p-5 group hover:border-zinc-700 transition-all">
                                    <Link to={`/courses/${course.id}`} className="block">
                                        <div className="aspect-video rounded-2xl overflow-hidden bg-zinc-800 mb-4 ring-1 ring-zinc-800 group-hover:ring-violet-500/50 transition-all">
                                            <img
                                                src={course.thumbnailUrl}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        </div>
                                        <h4 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-2 mb-2 leading-snug">
                                            {course.title}
                                        </h4>
                                        <p className="text-sm text-zinc-400 flex items-center gap-2 mb-6">
                                            <BookOpen className="w-4 h-4 text-violet-500" />
                                            {course.lessonCount}개의 레슨
                                        </p>
                                    </Link>

                                    <Link to={`/courses/${course.id}`}>
                                        <Button className="w-full h-12 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white border-none font-bold text-sm transition-all">
                                            클래스 전체 보기
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isShareModalOpen && lesson && (
                <React.Suspense fallback={null}>
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={lesson.title}
                        text={lesson.description}
                        url={window.location.href}
                        imageUrl={lesson.thumbnailUrl || course?.thumbnailUrl}
                        initialStep="write"
                        activityType="general"
                        metadata={{
                            type: 'lesson',
                            lessonId: lesson.id,
                            lessonTitle: lesson.title
                        }}
                    />
                </React.Suspense>
            )}
        </div>
    );
};

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));
