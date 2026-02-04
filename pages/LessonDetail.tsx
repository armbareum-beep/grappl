import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    getLessonById as getLesson,
    getCourseById as getCourse,
    checkCourseOwnership,
    recordWatchTime,
    updateLastWatched,
    incrementLessonViews,
    getLessonProgress
} from '../lib/api';
import { toggleLessonLike, checkLessonLiked } from '../lib/api-lessons';
import { updateMasteryFromWatch } from '../lib/api-technique-mastery';
import { Heart, ArrowLeft, Calendar, Eye, Clock, BookOpen, Share2, ExternalLink, Lock } from 'lucide-react';
import { Lesson, Course } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ReelLoginModal } from '../components/auth/ReelLoginModal';


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
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [isDailyFree, setIsDailyFree] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);


    const lastTickRef = React.useRef<number>(0);
    const accumulatedTimeRef = React.useRef<number>(0);

    // Mastery Tracking Refs
    const hasRecordedStartRef = React.useRef(false);
    const hasRecordedHalfRef = React.useRef(false);

    const [initialStartTime, setInitialStartTime] = useState<number>(0);
    const lastSavedProgressRef = React.useRef<number>(0);

    // Fetch initial progress for resume playback
    useEffect(() => {
        async function fetchProgress() {
            if (user && id) {
                const progress = await getLessonProgress(user.id, id);
                if (progress && progress.watched_seconds) {
                    setInitialStartTime(progress.watched_seconds);
                    lastSavedProgressRef.current = progress.watched_seconds;
                }
            }
        }
        fetchProgress();
    }, [user, id]);

    const handleProgress = React.useCallback(async (seconds: number, _duration?: number, percent?: number) => {
        setCurrentTime(seconds);

        if (!user || !lesson) return;

        // Save progress to DB periodically (every 10 seconds of video time change)
        if (Math.abs(seconds - lastSavedProgressRef.current) >= 10) {
            lastSavedProgressRef.current = seconds;
            updateLastWatched(user.id, lesson.id, Math.floor(seconds)).catch(console.error);
        }

        // Mastery Level Logic (Start & 50%)
        if (percent) {
            // Level 1: Started (> 0%)
            if (percent > 0.01 && !hasRecordedStartRef.current) {
                hasRecordedStartRef.current = true;
                updateMasteryFromWatch(user.id, lesson.id, percent, false).catch(console.error);
            }

            // Level 2: Halfway (> 50%)
            if (percent > 0.5 && !hasRecordedHalfRef.current) {
                hasRecordedHalfRef.current = true;
                updateMasteryFromWatch(user.id, lesson.id, percent, false).catch(console.error);
            }
        }

        const now = Date.now();
        if (lastTickRef.current === 0) {
            lastTickRef.current = now;
            return;
        }

        const elapsed = (now - lastTickRef.current) / 1000;
        lastTickRef.current = now;

        if (elapsed > 0 && elapsed < 5) {
            accumulatedTimeRef.current += elapsed;
        }

        // Record platform watch time (every 10 seconds of active viewing)
        if (accumulatedTimeRef.current >= 10) {
            const timeToSend = Math.floor(accumulatedTimeRef.current);
            accumulatedTimeRef.current -= timeToSend;

            if (user.isSubscriber && !owns) {
                recordWatchTime(user.id, timeToSend, undefined, lesson.id);
            }
        }
    }, [user, lesson, owns]);

    // Update VideoPlayer component to use initialStartTime

    useEffect(() => {
        async function fetchData() {
            if (!id) return;
            setLoading(true);
            setOwns(false);

            try {
                const lessonData = await getLesson(id);
                setLesson(lessonData);

                if (lessonData) {
                    // Check like status
                    if (user) {
                        checkLessonLiked(user.id, lessonData.id).then(({ liked }) => setIsLiked(liked));
                    }

                    let courseData = null;
                    if (lessonData.courseId) {
                        courseData = await getCourse(lessonData.courseId);
                        setCourse(courseData);
                    }

                    const isCreator = user && courseData && courseData.creatorId === user.id;
                    let isOwner = user && lessonData.courseId ? await checkCourseOwnership(user.id, lessonData.courseId) : false;



                    // Core Permission Check - also check Vimeo IDs
                    let hasAccess = isAdmin || (isSubscribed && !lessonData.isSubscriptionExcluded) || isOwner || isCreator;

                    if (!hasAccess && user && user.ownedVideoIds) {
                        const normalizedOwnedIds = user.ownedVideoIds.map(oid => String(oid).trim().toLowerCase());

                        // Check lesson UUID
                        if (normalizedOwnedIds.includes(String(lessonData.id).trim().toLowerCase())) {
                            hasAccess = true;
                        }

                        // Check course UUID
                        if (!hasAccess && lessonData.courseId && normalizedOwnedIds.includes(String(lessonData.courseId).trim().toLowerCase())) {
                            hasAccess = true;
                        }

                        // Check lesson Vimeo IDs
                        if (!hasAccess) {
                            const lessonVimeoIds = [
                                lessonData.vimeoUrl,
                                // @ts-ignore
                                lessonData.vimeo_url,
                                lessonData.videoUrl
                            ].filter(Boolean).map(v => String(v).trim().toLowerCase());

                            for (const vimeoId of lessonVimeoIds) {
                                if (normalizedOwnedIds.includes(vimeoId)) {
                                    hasAccess = true;
                                    break;
                                }
                            }
                        }
                    }

                    // 1. Check if first lesson of its course OR course is free (Free Preview/Access)
                    if (!hasAccess && (courseData && courseData.price === 0)) {
                        hasAccess = true;
                    }

                    setOwns(hasAccess || false);

                    // 2. Check for daily free lesson (logged-in users get full access)
                    try {
                        const { getDailyFreeLesson } = await import('../lib/api');
                        const { data: dailyLesson } = await getDailyFreeLesson();
                        if (dailyLesson && dailyLesson.id === id) {
                            setIsDailyFree(true);
                            // Allow guest access for daily free lesson
                            setOwns(true);
                        }
                    } catch (e) {
                        console.warn('Failed to check daily free lesson access:', e);
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

    // Increment view count after 5 seconds of watching (only for authorized users)
    useEffect(() => {
        if (!lesson || !owns || !id) return;

        const timer = setTimeout(() => {
            incrementLessonViews(id).catch(console.error);
        }, 5000); // 5 seconds

        return () => clearTimeout(timer);
    }, [lesson?.id, owns, id]);


    // Record initial view for history (Recent Activity)
    useEffect(() => {
        if (user && lesson && lesson.id) {
            updateLastWatched(user.id, lesson.id, 0).catch(console.error);
        }
    }, [user, lesson?.id]);

    if (loading) {
        return (
            <LoadingScreen message="레슨을 불러오고 있습니다..." />
        );
    }

    // Allow non-logged-in users to view daily free lessons (with potential preview limit)
    // For other lessons, require login
    if (!user && !lesson) {
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
                        <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-zinc-800 group mb-8">
                            {/* Ambient Glow */}
                            <div className="absolute -inset-1 bg-violet-500/20 blur-3xl opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-1000"></div>

                            <div className="relative h-full z-10">
                                {(lesson.videoUrl || lesson.vimeoUrl) ? (
                                    (owns || lesson.lessonNumber === 1) ? (
                                        <VideoPlayer
                                            key={lesson.id}
                                            vimeoId={lesson.videoUrl || lesson.vimeoUrl || ''}
                                            title={lesson.title}
                                            playing={true}
                                            isPreviewMode={!owns}
                                            muted={false} // Default sound on
                                            maxPreviewDuration={
                                                owns ? (isDailyFree && !user ? 30 : undefined) : // If it's daily free and guest, limit to 30s
                                                    (user && isDailyFree) ? undefined : // Logged-in + daily free: full access
                                                        60 // Other previews: 1min
                                            }
                                            onPreviewLimitReached={() => setIsPaywallOpen(true)}
                                            isPaused={isPaywallOpen}
                                            onEnded={() => {
                                                if (user && lesson) {
                                                    updateMasteryFromWatch(user.id, lesson.id, 1, true).catch(console.error);
                                                    hasRecordedStartRef.current = false;
                                                    hasRecordedHalfRef.current = false;
                                                }
                                            }}
                                            onProgress={handleProgress}
                                            startTime={initialStartTime}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900/90 text-zinc-400 p-4 md:p-6 text-center backdrop-blur-sm">
                                            <div className="w-14 h-14 md:w-20 md:h-20 bg-zinc-800 rounded-full flex items-center justify-center mb-4 md:mb-8 ring-1 ring-zinc-700 shadow-xl">
                                                <Lock className="w-7 h-7 md:w-10 md:h-10 text-zinc-500" />
                                            </div>
                                            <h3 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">잠긴 레슨입니다</h3>
                                            <p className="text-sm md:text-base text-zinc-500 mb-6 md:mb-10 max-w-sm break-keep">
                                                이 레슨을 시청하려면 클래스를 구매하거나<br className="hidden md:block" />구독이 필요합니다.
                                            </p>
                                            <Button
                                                onClick={() => navigate(user ? '/pricing' : '/login')}
                                                className="bg-violet-600 hover:bg-violet-500 text-white rounded-full px-6 py-2 md:px-8 md:py-3 text-sm md:text-base font-bold shadow-lg shadow-violet-900/20"
                                            >
                                                {user ? '구독하고 전체 보기' : '로그인하여 보기'}
                                            </Button>
                                        </div>
                                    )
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

                            {/* Preview Time Limit Bar - Only for Previewable Lessons */}
                            {(!owns && lesson.lessonNumber === 1) && (
                                <div className="absolute bottom-0 left-0 right-0 z-50 h-1.5 bg-violet-900/30">
                                    <div
                                        className="h-full bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,1)] transition-all ease-linear"
                                        style={{
                                            width: `${(currentTime / (user ? (isDailyFree ? 1 : 60) : (isDailyFree ? 30 : 60))) * 100}%`,
                                            transitionDuration: '1000ms'
                                        }}
                                    />
                                </div>
                            )}

                            {/* Time Limit Warning Text - Only for Previewable Lessons */}
                            {(!owns && lesson.lessonNumber === 1 && currentTime > 0) && (
                                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-violet-600/90 backdrop-blur-sm rounded-full border border-violet-400/30 shadow-lg">
                                    <p className="text-white text-xs font-bold">
                                        {user
                                            ? `1분 후 구독 필요 (${Math.max(0, 60 - Math.floor(currentTime))}초 남음)`
                                            : isDailyFree
                                                ? `로그인하면 전체 시청 가능 (${Math.max(0, 30 - Math.floor(currentTime))}초 남음)`
                                                : `1분 후 로그인 필요 (${Math.max(0, 60 - Math.floor(currentTime))}초 남음)`
                                        }
                                    </p>
                                </div>
                            )}
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

                            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6 break-keep">
                                {lesson.title}
                            </h1>

                            {/* Actions: Like, Course View & Share */}
                            <div className="flex flex-wrap items-center gap-3 mb-8">
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
                                {lesson.courseId && course && (
                                    <button
                                        onClick={() => navigate(`/courses/${lesson.courseId}`)}
                                        className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-sm font-bold"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        클래스 보기
                                    </button>
                                )}
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
                    />
                </React.Suspense>
            )}
            {isPaywallOpen && !user ? (
                <ReelLoginModal
                    isOpen={isPaywallOpen}
                    onClose={() => setIsPaywallOpen(false)}
                    redirectUrl={`/lessons/${id}`}
                />
            ) : isPaywallOpen && (
                <ConfirmModal
                    isOpen={isPaywallOpen}
                    onClose={() => setIsPaywallOpen(false)}
                    onConfirm={() => navigate(user ? '/pricing' : '/login')}
                    title="1분 무료 체험 종료"
                    message={
                        user
                            ? "이 레슨의 뒷부분과 모든 블랙벨트의 커리큘럼을 무제한으로 이용하려면 그래플레이 구독을 시작하세요."
                            : "이 레슨을 계속 시청하려면 로그인이 필요합니다."
                    }
                    confirmText={user ? "구독 요금제 보기" : "로그인하기"}
                    cancelText="나중에 하기"
                    variant="info"
                />
            )}
        </div>
    );
};

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));
