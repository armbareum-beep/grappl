import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useCourse, useCourseLessons, useCourseDrills, useCourseSparring, useRelatedCourses } from '../hooks/use-queries';
import { getCreatorById, checkCourseOwnership, getLessonProgress, markLessonComplete, updateLastWatched, enrollInCourse, recordWatchTime, checkCourseCompletion, toggleCourseLike, checkCourseLiked, getCourseLikeCount, toggleCreatorFollow, checkCreatorFollowStatus, toggleCourseSave, checkCourseSaved, incrementLessonViews } from '../lib/api';
import { Course, Lesson, Creator } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Clock, Eye, BookOpen, CheckCircle, Heart, Share2, Lock, Play, Zap, ChevronLeft, Bookmark } from 'lucide-react';

import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ReelLoginModal } from '../components/auth/ReelLoginModal';

import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';



export const CourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isSubscribed, isAdmin } = useAuth();
    const { success, error: toastError } = useToast();
    const queryClient = useQueryClient();

    // React Query hooks with placeholder data
    const { data: course, isLoading: courseLoading, error: courseError } = useCourse(id, {
        placeholderData: () => {
            // Try to find course in cached lists (from Browse/Home pages)
            const cachedCourses = queryClient.getQueryData<Course[]>(['courses']) || [];
            const cachedTrending = queryClient.getQueryData<Course[]>(['trending', 'courses']) || [];
            const cachedNew = queryClient.getQueryData<Course[]>(['new', 'courses']) || [];

            return [...cachedCourses, ...cachedTrending, ...cachedNew].find(c => c.id === id);
        }
    }) as { data: Course | null | undefined; isLoading: boolean; error: any };

    const { data: lessonsResponse, isLoading: lessonsLoading } = useCourseLessons(id);
    const { data: drillsResponse } = useCourseDrills(id);
    const { data: sparringResponse } = useCourseSparring(id);
    const { data: relatedCoursesData } = useRelatedCourses(id || '', course?.category || '');

    const lessons = lessonsResponse?.data || [];
    const bundledDrills = drillsResponse?.data || [];
    const bundledSparringVideos = sparringResponse?.data || [];
    const relatedCourses = relatedCoursesData || [];

    const loading = courseLoading || lessonsLoading;
    const error = courseError ? '클래스 정보를 불러오는 중 오류가 발생했습니다.' : null;

    const [creator, setCreator] = useState<Creator | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [ownsCourse, setOwnsCourse] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [dailyFreeLessonId, setDailyFreeLessonId] = useState<string | null>(null);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    // activeTab state removed as tabs are no longer used
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isFollowed, setIsFollowed] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isPaywallOpen, setIsPaywallOpen] = useState(false);
    const [actualIsSubscribed, setActualIsSubscribed] = useState<boolean | null>(null); // Direct DB check to bypass AuthContext
    const [actualIsAdmin, setActualIsAdmin] = useState<boolean | null>(null); // Direct DB check to bypass AuthContext

    const [initialStartTime, setInitialStartTime] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);

    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

    // Responsive listener to prevent double-mounting VideoPlayer
    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const lastTickRef = React.useRef<number>(0);
    const accumulatedTimeRef = React.useRef<number>(0);
    const lastSavedTimeRef = React.useRef<number>(0);
    const currentTimeRef = React.useRef<number>(0);
    const userRef = React.useRef(user);
    const selectedLessonRef = React.useRef(selectedLesson);

    React.useEffect(() => {
        userRef.current = user;
        selectedLessonRef.current = selectedLesson;
    }, [user, selectedLesson]);

    // Record initial view for history (Recent Activity)
    React.useEffect(() => {
        if (user && selectedLesson && selectedLesson.id) {
            updateLastWatched(user.id, selectedLesson.id).catch(console.error);
        }
    }, [user?.id, selectedLesson?.id]);

    // Increment lesson view count after 10 seconds (for authorized users)
    React.useEffect(() => {
        if (!selectedLesson || !ownsCourse || !selectedLesson.id) return;

        const timer = setTimeout(() => {
            incrementLessonViews(selectedLesson.id).catch(console.error);
        }, 10000); // 10 seconds

        return () => clearTimeout(timer);
    }, [selectedLesson?.id, ownsCourse]);

    // Save progress on page leave (unmount / beforeunload)
    React.useEffect(() => {
        const saveOnLeave = () => {
            const u = userRef.current;
            const lesson = selectedLessonRef.current;
            const t = currentTimeRef.current;
            if (u && lesson && t > 0) {
                updateLastWatched(u.id, lesson.id, Math.floor(t));
            }
        };

        window.addEventListener('beforeunload', saveOnLeave);
        return () => {
            window.removeEventListener('beforeunload', saveOnLeave);
            saveOnLeave();
        };
    }, []);

    // Fetch creator and handle ownership/permissions when course data is available
    useEffect(() => {
        async function handleCourseData() {
            if (!course || !id) return;

            try {
                // Fetch creator
                const creatorData = await getCreatorById(course.creatorId);
                setCreator(creatorData);

                if (user) {
                    // DIRECT DB CHECK - Bypass AuthContext potential inconsistencies
                    const { data: directUserData, error: userQueryError } = await supabase
                        .from('users')
                        .select('is_subscriber, is_complimentary_subscription, is_admin')
                        .eq('id', user.id)
                        .maybeSingle();

                    // Only set actual values if query succeeded - otherwise keep null to fall back to AuthContext
                    if (directUserData && !userQueryError) {
                        const dbIsAdmin = !!(directUserData.is_admin);
                        const dbIsSubscribed = !!(
                            directUserData.is_subscriber ||
                            directUserData.is_complimentary_subscription ||
                            dbIsAdmin
                        );
                        setActualIsSubscribed(dbIsSubscribed);
                        setActualIsAdmin(dbIsAdmin);
                    }

                    let owns = await checkCourseOwnership(user.id, id);

                    // Admin and subscribers have access to all courses
                    if (!owns && directUserData && !userQueryError) {
                        const dbIsAdmin = !!(directUserData.is_admin);
                        const dbIsSubscribed = !!(
                            directUserData.is_subscriber ||
                            directUserData.is_complimentary_subscription
                        );
                        if (dbIsAdmin || dbIsSubscribed) {
                            owns = true;
                        }
                    }

                    // Check ownership via user.ownedVideoIds from AuthContext
                    if (!owns && user.ownedVideoIds) {
                        const normalizedOwnedIds = user.ownedVideoIds.map((oid: any) => String(oid).trim().toLowerCase());
                        const courseIdLower = String(id).trim().toLowerCase();

                        if (normalizedOwnedIds.includes(courseIdLower)) {
                            owns = true;
                        }

                        if (!owns) {
                            const courseVimeoIds = [
                                (course as any).vimeoUrl,
                                (course as any).vimeo_url,
                                course.previewVimeoId,
                                (course as any).preview_vimeo_id
                            ].filter(Boolean).map(v => String(v).trim().toLowerCase());

                            owns = courseVimeoIds.some(vid => normalizedOwnedIds.includes(vid));
                        }

                        if (!owns && lessons && lessons.length > 0) {
                            for (const lesson of lessons) {
                                const lessonVimeoIds = [lesson.vimeoUrl, (lesson as any).vimeo_url, lesson.videoUrl]
                                    .filter(Boolean).map(v => String(v).trim().toLowerCase());
                                if (lessonVimeoIds.some(vid => normalizedOwnedIds.includes(vid))) {
                                    owns = true;
                                    break;
                                }
                            }
                        }
                    }

                    setOwnsCourse(owns);

                    // Progress and Interactions
                    const completed = new Set<string>();
                    if (lessons) {
                        for (const lesson of lessons) {
                            const prog = await getLessonProgress(user.id, lesson.id);
                            if (prog?.completed) completed.add(lesson.id);
                        }
                    }
                    setCompletedLessons(completed);
                    checkCourseLiked(user.id, id).then(setIsLiked);
                    checkCourseSaved(user.id, id).then(setIsSaved);

                    if (course.creatorId) {
                        checkCreatorFollowStatus(user.id, course.creatorId).then(setIsFollowed);
                    }
                } else {
                    // Reset states when user is null (logged out)
                    setOwnsCourse(false);
                    setActualIsSubscribed(false);
                    setActualIsAdmin(false);
                    setCompletedLessons(new Set());
                    setIsLiked(false);
                    setIsSaved(false);
                    setIsFollowed(false);
                }

                // Check for daily free lesson
                try {
                    const { getDailyFreeLesson } = await import('../lib/api');
                    const { data: dailyLesson } = await getDailyFreeLesson();
                    if (dailyLesson) setDailyFreeLessonId(dailyLesson.id);
                } catch (e) { /* ignore */ }

                // Increment views & like count
                getCourseLikeCount(id).then(setLikeCount);
            } catch (error: any) {
                console.error('Error handling course data:', error);
            }
        }

        handleCourseData();
    }, [course, id, user?.id, lessons]);

    // Note: Course views are calculated as the sum of all lesson views within the course
    // Lesson views are recorded in LessonDetail when users watch lessons
    // No direct view counting needed here

    // Handle Lesson Selection & Progress Sync based on URL
    useEffect(() => {
        if (!lessons.length) return;

        const searchParams = new URLSearchParams(location.search);
        const queryLessonId = searchParams.get('lessonId');
        const queryTime = searchParams.get('t');

        let lessonToSelect = lessons[0];
        if (queryLessonId) {
            const found = lessons.find(l => l.id === queryLessonId);
            if (found) lessonToSelect = found;
        }

        setSelectedLesson(lessonToSelect);

        if (queryTime) {
            setInitialStartTime(parseFloat(queryTime));
        } else if (user && lessonToSelect) {
            getLessonProgress(user.id, lessonToSelect.id).then(prog => {
                if (prog?.watched_seconds) setInitialStartTime(prog.watched_seconds);
            });
        }
    }, [location.search, lessons, user?.id]);


    const handlePurchase = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${id}` } } });
            return;
        }

        if (!course) return;
        const coursePrice = Number(course.price || 0);

        if (coursePrice === 0) {
            setPurchasing(true);
            try {
                // Free course enrollment
                const { error } = await enrollInCourse(user.id, course.id);
                if (error) {
                    toastError('라이브러리 추가 중 오류가 발생했습니다: ' + error.message);
                } else {
                    success('라이브러리에 추가되었습니다! 📚');
                    setOwnsCourse(true);
                }
            } catch (err) {
                console.error('Enroll error:', err);
                toastError('처리 중 오류가 발생했습니다.');
            } finally {
                setPurchasing(false);
            }
        } else {
            // Paid course - Redirect to Checkout
            navigate(`/checkout/course/${course.id}`);
        }
    };

    const canWatchLesson = (lesson: Lesson) => {
        if (actualIsAdmin ?? isAdmin) return true;
        if (ownsCourse) return true;

        // Use direct DB check value if available, otherwise fall back to context
        // Also check user object directly as additional fallback
        const subscriptionStatus = actualIsSubscribed ?? isSubscribed ??
            !!(user?.isSubscriber || (user as any)?.is_complimentary_subscription);
        if (subscriptionStatus && !course?.isSubscriptionExcluded) return true;

        // Check owned_video_ids for lesson UUID, course UUID, and Vimeo IDs
        if (user && user.ownedVideoIds) {
            const normalizedOwnedIds = user.ownedVideoIds.map(oid => String(oid).trim().toLowerCase());

            // Check lesson UUID
            if (normalizedOwnedIds.some(oid => oid === String(lesson.id).trim().toLowerCase())) {
                return true;
            }

            // Check course UUID
            if (course && normalizedOwnedIds.some(oid => oid === String(course.id).trim().toLowerCase())) {
                return true;
            }

            // Check lesson Vimeo IDs
            const lessonVimeoIds = [
                lesson.vimeoUrl,
                // @ts-ignore
                lesson.vimeo_url,
                lesson.videoUrl
            ].filter(Boolean).map(v => String(v).trim().toLowerCase());

            for (const vimeoId of lessonVimeoIds) {
                if (normalizedOwnedIds.includes(vimeoId)) {
                    return true;
                }
            }

            // Check course Vimeo IDs
            if (course) {
                const courseVimeoIds = [
                    // @ts-ignore
                    course.vimeoUrl,
                    // @ts-ignore
                    course.vimeo_url,
                    course.previewVimeoId,
                    // @ts-ignore
                    course.preview_vimeo_id
                ].filter(Boolean).map(v => String(v).trim().toLowerCase());

                for (const vimeoId of courseVimeoIds) {
                    if (normalizedOwnedIds.includes(vimeoId)) {
                        return true;
                    }
                }
            }
        }

        if (course && course.price === 0) return true;

        if (lesson.id === dailyFreeLessonId) {
            return true;
        }

        if (lesson.isPreview || lesson.lessonNumber === 1) return true;

        return false;
    };

    const isPreviewOnly = React.useCallback((lesson: Lesson) => {
        if (!user || !user.id) return true;
        if (ownsCourse || isAdmin || isSubscribed) return false;
        return !!(lesson.isPreview || lesson.lessonNumber === 1 || lesson.id === dailyFreeLessonId);
    }, [user, ownsCourse, isAdmin, isSubscribed, dailyFreeLessonId]);

    // Initialize timeRemaining when lesson changes
    useEffect(() => {
        if (selectedLesson && isPreviewOnly(selectedLesson)) {
            setTimeRemaining(60);
        } else {
            setTimeRemaining(null);
        }
    }, [selectedLesson, isPreviewOnly]);

    const isPreviewMode = React.useCallback((lesson: Lesson) => {
        return !!lesson.isPreview;
    }, []);

    const handleProgress = React.useCallback(async (seconds: number) => {
        setCurrentTime(seconds);
        currentTimeRef.current = seconds;

        // Update timeRemaining for preview (even for guests)
        if (selectedLesson && isPreviewOnly(selectedLesson)) {
            setTimeRemaining(Math.max(0, 60 - Math.ceil(seconds)));
        }

        if (!user || !selectedLesson) {
            return;
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

        // 1. Record platform watch time (every 10 seconds of active viewing)
        if (accumulatedTimeRef.current >= 10) {
            const timeToSend = Math.floor(accumulatedTimeRef.current);
            accumulatedTimeRef.current -= timeToSend;

            if (user.isSubscriber && !ownsCourse) {
                recordWatchTime(user.id, timeToSend, undefined, selectedLesson.id);
            }
        }

        // 2. Save playback position
        // Save every 5 seconds
        const saveThreshold = 5;
        if (Math.abs(seconds - lastSavedTimeRef.current) >= saveThreshold) {
            lastSavedTimeRef.current = seconds;
            updateLastWatched(user.id, selectedLesson.id, Math.floor(seconds));
        }

        // Update timeRemaining for preview
        if (isPreviewOnly(selectedLesson)) {
            setTimeRemaining(Math.max(0, 60 - Math.ceil(seconds)));
        }
    }, [user, selectedLesson, ownsCourse, isPreviewOnly]);

    const handleLessonSelect = async (lesson: Lesson) => {
        if (selectedLesson?.id === lesson.id) return;

        // Preview mode: always start from beginning
        if (isPreviewMode(lesson)) {
            setInitialStartTime(0);
            setSelectedLesson(lesson);
            return;
        }

        // Full access: load saved progress BEFORE setting the lesson
        // so VideoPlayer initializes with the correct startTime
        let resumeTime = 0;
        if (user && canWatchLesson(lesson)) {
            try {
                const prog = await getLessonProgress(user.id, lesson.id);
                if (prog?.watched_seconds) {
                    resumeTime = prog.watched_seconds;
                }
            } catch (e) {
                console.warn('Failed to load lesson progress:', e);
            }
        }

        setInitialStartTime(resumeTime);
        setSelectedLesson(lesson);
    };

    const handleVideoEnded = async () => {
        if (!user || !selectedLesson) return;

        // Mark lesson as complete automatically
        await markLessonComplete(user.id, selectedLesson.id, true);

        setCompletedLessons(prev => {
            const newSet = new Set(prev);
            newSet.add(selectedLesson.id);
            return newSet;
        });

        // Check for course completion
        if (course) {
            const { data } = await checkCourseCompletion(user.id, course.id);
            const completionData = data as any;
            if (completionData && completionData.newly_awarded) {
                success(`🎉 클래스 완강 축하합니다!\n\n전투력 증가: ${completionData.category} +${completionData.stat_gained}\nXP 획득: +${completionData.xp_gained}`);
            }
        }
    };


    if (loading) {
        return (
            <LoadingScreen message="클래스 정보를 불러오고 있습니다..." />
        );
    }

    if (error) {
        return <ErrorScreen error={error} resetMessage="클래스 정보를 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">클래스를 찾을 수 없습니다</h2>
                    <p className="text-slate-600 mb-8 font-medium">찾으시는 클래스가 존재하지 않거나 비공개 상태입니다.</p>
                    <Link to="/browse">
                        <Button>클래스 둘러보기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    const isFree = Number(course.price || 0) === 0;
    const formattedPrice = isFree ? '무료' : new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
    }).format(Number(course.price || 0));

    const totalDuration = lessons.reduce((total, lesson) => {
        if (!lesson.length) return total;

        // Handle numeric seconds (number or string)
        const numericDuration = Number(lesson.length);
        if (!isNaN(numericDuration) && !lesson.length.toString().includes(':')) {
            return total + numericDuration;
        }

        // Handle "MM:SS" or "HH:MM:SS" format
        if (typeof lesson.length === 'string' && lesson.length.includes(':')) {
            const parts = lesson.length.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return total + parts[0] * 60 + parts[1];
            }
            if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
                return total + parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }

        return total;
    }, 0);
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMins = Math.floor((totalDuration % 3600) / 60);



    const handleLike = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${id}` } } });
            return;
        }
        if (!id) return;

        // Optimistic UI
        const newStatus = !isLiked;
        setIsLiked(newStatus);
        setLikeCount(prev => newStatus ? prev + 1 : prev - 1);

        const { liked } = await toggleCourseLike(user.id, id);

        setIsLiked(liked);
        const count = await getCourseLikeCount(id);
        setLikeCount(count);
    };

    const handleFollow = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        if (!creator) return;

        // Optimistic UI
        const newStatus = !isFollowed;
        setIsFollowed(newStatus);

        try {
            const { followed } = await toggleCreatorFollow(user.id, creator.id);
            setIsFollowed(followed);
        } catch (error) {
            console.error('Follow failed:', error);
            setIsFollowed(!newStatus); // Revert
        }
    };

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const handleSave = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${id}` } } });
            return;
        }
        if (!id) return;

        // Optimistic UI
        const newStatus = !isSaved;
        setIsSaved(newStatus);

        const { saved } = await toggleCourseSave(user.id, id);

        if (saved) {
            success('보관함에 저장되었습니다.');
        } else {
            success('보관함에서 삭제되었습니다.');
        }
        setIsSaved(saved);
    };

    const renderVideoPlayer = () => {
        const hasAccess = selectedLesson && canWatchLesson(selectedLesson);
        // Handle both camelCase (transformed) and snake_case (raw) properties
        // @ts-ignore
        const vimeoIdToSend = selectedLesson?.vimeo_url || selectedLesson?.vimeoUrl || selectedLesson?.videoUrl || '';
        const hasVideo = selectedLesson && (!!vimeoIdToSend);

        // @ts-ignore
        const previewIdToSend = course?.previewVimeoId || (course as any)?.preview_vimeo_id || lessons[0]?.vimeoUrl || lessons[0]?.vimeo_url;
        const hasPreview = !!previewIdToSend;

        return (
            <div className="relative rounded-3xl overflow-hidden bg-black shadow-2xl ring-1 ring-zinc-800 group mb-6 lg:mb-0">
                {/* Ambient Glow */}
                <div className="absolute -inset-1 bg-violet-500/20 blur-3xl opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-1000"></div>
                <div className="relative h-full z-10">
                    {hasAccess && hasVideo ? (
                        <div className="relative h-full">
                            <VideoPlayer
                                key={vimeoIdToSend}
                                vimeoId={vimeoIdToSend}
                                title={selectedLesson!.title}
                                playing={!isPaywallOpen}
                                startTime={initialStartTime}
                                onEnded={handleVideoEnded}
                                onProgress={handleProgress}
                                maxPreviewDuration={isPreviewOnly(selectedLesson!) ? 60 : undefined}
                                isPreviewMode={isPreviewOnly(selectedLesson!)}
                                onPreviewLimitReached={() => setIsPaywallOpen(true)}
                                isPaused={isPaywallOpen}
                                onDoubleTap={handleLike}
                                muted={false}
                                watermarkText={user?.email}
                            />

                            {/* 프리뷰 카운트다운 (부모 관리) */}
                            {isPreviewOnly(selectedLesson!) && !isPaywallOpen && timeRemaining !== null && timeRemaining > 0 && (
                                <div className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-md border border-violet-500/30 pointer-events-none">
                                    <span className="text-xs font-bold text-violet-300">
                                        프리뷰: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')} 남음
                                    </span>
                                </div>
                            )}
                        </div>
                    ) : !hasAccess && hasPreview ? (
                        <div className="relative h-full">
                            <VideoPlayer
                                key={`preview-${previewIdToSend}`}
                                vimeoId={previewIdToSend!}
                                title={`[미리보기] ${course!.title}`}
                                onEnded={() => setIsPaywallOpen(true)}
                                isPaused={isPaywallOpen}
                                maxPreviewDuration={60}
                                isPreviewMode={true}
                                onPreviewLimitReached={() => setIsPaywallOpen(true)}
                                onDoubleTap={handleLike}
                                muted={false}
                            />
                        </div>
                    ) : (
                        <div className="w-full h-full bg-zinc-900 flex flex-col items-center justify-center relative p-6 text-center">
                            {!hasAccess ? (
                                <>
                                    <div className="mb-6 relative">
                                        <div className="absolute -inset-4 bg-violet-500/20 blur-xl rounded-full"></div>
                                        <Lock className="w-12 h-12 text-zinc-400 relative z-10 mx-auto" />
                                    </div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-zinc-500 mb-2">Membership Only</span>
                                    <h3 className="text-2xl font-black text-white mb-2">
                                        {selectedLesson?.id === dailyFreeLessonId && !user
                                            ? "오늘의 무료 레슨입니다"
                                            : "잠긴 레슨입니다"}
                                    </h3>
                                    <p className="text-sm text-zinc-400 font-medium mb-8 max-w-[280px] leading-relaxed mx-auto">
                                        {selectedLesson?.id === dailyFreeLessonId && !user
                                            ? "로그인하면 오늘의 무료 레슨을 즉시 시청할 수 있습니다."
                                            : "이 레슨을 수강하려면 클래스를 구매하거나 그래플레이 멤버십을 구독하세요."}
                                    </p>
                                    <div className="flex justify-center gap-3">
                                        {selectedLesson?.id === dailyFreeLessonId && !user ? (
                                            <Button
                                                onClick={() => navigate('/login')}
                                                className="bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl px-10 py-4 h-auto text-lg transition-all shadow-lg shadow-violet-900/40 active:scale-95"
                                            >
                                                로그인하기
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => navigate('/pricing')}
                                                className="bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl px-10 py-4 h-auto text-lg transition-all shadow-lg shadow-violet-900/40 active:scale-95"
                                            >
                                                멤버십 보기
                                            </Button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-zinc-500">
                                    <p>재생할 영상이 없습니다.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderHeaderInfo = () => (
        <div className="mt-8 mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-6">
                {course?.title}
            </h1>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 md:flex md:flex-wrap gap-y-4 gap-x-6 mb-8 p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Category</span>
                    <span className="text-zinc-200 font-medium text-sm">{course?.category}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Difficulty</span>
                    <span className={cn("font-medium text-sm",
                        course?.difficulty === 'Advanced' ? 'text-violet-400' :
                            course?.difficulty === 'Intermediate' ? 'text-violet-300' : 'text-zinc-200'
                    )}>
                        {course?.difficulty}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Duration</span>
                    <span className="text-zinc-200 font-medium text-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {totalHours > 0 ? `${totalHours}hr ` : ''}{totalMins}min
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Lectures</span>
                    <span className="text-zinc-200 font-medium text-sm flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {lessons.length}
                    </span>
                </div>
                <div className="flex flex-col">
                    <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Views</span>
                    <span className="text-zinc-200 font-medium text-sm flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" />
                        {course?.views.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-3 border-b border-zinc-800/50 pb-8 mb-8">
                <button
                    onClick={handleLike}
                    className={cn(
                        "group relative flex items-center justify-center w-12 h-12 rounded-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden",
                        isLiked
                            ? "bg-gradient-to-br from-rose-500/20 via-pink-500/10 to-violet-500/20 border-rose-500/40 text-rose-400 shadow-lg shadow-rose-500/20"
                            : "bg-zinc-900/60 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800/80 hover:border-zinc-700 hover:text-white hover:shadow-lg hover:shadow-violet-500/10"
                    )}
                >
                    {/* Animated gradient background on hover */}
                    {!isLiked && (
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/5 to-violet-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    )}

                    <Heart className={cn("w-5 h-5 relative z-10 transition-transform duration-300",
                        isLiked && "fill-current",
                        "group-hover:scale-110"
                    )} />
                </button>

                {likeCount > 0 && (
                    <span className="text-sm font-medium text-zinc-400">{likeCount.toLocaleString()}</span>
                )}

                <button
                    onClick={handleSave}
                    className={cn(
                        "group relative flex items-center justify-center w-12 h-12 rounded-2xl backdrop-blur-xl border transition-all duration-300 overflow-hidden",
                        isSaved
                            ? "bg-violet-500/20 border-violet-500/40 text-violet-400 shadow-lg shadow-violet-500/20"
                            : "bg-zinc-900/60 border-zinc-800/60 text-zinc-400 hover:bg-zinc-800/80 hover:border-zinc-700 hover:text-white hover:shadow-lg hover:shadow-violet-500/10"
                    )}
                >
                    {!isSaved && (
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/5 to-violet-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    )}
                    <Bookmark className={cn("w-5 h-5 relative z-10 transition-transform duration-300",
                        isSaved && "fill-current",
                        "group-hover:scale-110"
                    )} />
                </button>

                <button
                    onClick={handleShare}
                    className="group relative flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 text-zinc-400 hover:bg-zinc-800/80 hover:border-zinc-700 hover:text-white transition-all duration-300 overflow-hidden hover:shadow-lg hover:shadow-violet-500/10"
                >
                    {/* Animated gradient background on hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-600/0 via-violet-600/5 to-violet-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <Share2 className="w-5 h-5 relative z-10 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                </button>
            </div>
        </div>
    );

    const renderInstructor = () => (
        <div className="mb-12">
            <h3 className="text-zinc-100 text-lg font-bold mb-6 flex items-center gap-2">
                About Instructor
            </h3>
            {creator && (
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-6 md:p-8 backdrop-blur-sm">
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                        <Link to={`/creator/${creator.id}`} className="shrink-0 group relative">
                            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-zinc-800 group-hover:border-violet-500 transition-colors">
                                <img src={creator.profileImage} alt={creator.name} loading="lazy" className="w-full h-full object-cover" />
                            </div>
                        </Link>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <Link to={`/creator/${creator.id}`} className="hover:underline decoration-zinc-500 underline-offset-4">
                                    <h4 className="text-xl font-bold text-white">{creator.name}</h4>
                                </Link>
                                <button
                                    onClick={handleFollow}
                                    className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all",
                                        isFollowed
                                            ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                                            : "bg-transparent text-violet-400 border-violet-500/30 hover:bg-violet-500/10"
                                    )}
                                >
                                    {isFollowed ? 'Following' : 'Follow'}
                                </button>
                            </div>
                            <p className="text-zinc-400 text-sm leading-relaxed max-w-2xl line-clamp-2 md:line-clamp-none">
                                {creator.bio}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderAppDescription = () => (
        <div>
            <h3 className="text-zinc-100 text-lg font-bold mb-4">Course Description</h3>
            <div className="prose prose-invert prose-zinc max-w-none text-zinc-400 leading-relaxed text-sm md:text-base">
                <p className="whitespace-pre-line">{course?.description}</p>
            </div>
        </div>
    );

    const renderBonusContent = () => {
        if (bundledDrills.length === 0 && bundledSparringVideos.length === 0) return null;

        return (
            <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="bg-gradient-to-br from-zinc-900/40 to-zinc-950/40 rounded-3xl p-6 md:p-8 border border-zinc-800/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 blur-[80px] rounded-full pointer-events-none"></div>

                    <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                        <span className="text-2xl">🎁</span>
                        Included Bonus Content
                    </h3>

                    <div className="space-y-8 relative z-10">
                        {bundledDrills.length > 0 && (
                            <div>
                                <h4 className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                    Bonus Drills
                                </h4>
                                <div className="space-y-2">
                                    {bundledDrills.map(drill => (
                                        <Link
                                            key={drill.id}
                                            to={`/drills/${drill.id}`}
                                            className="group flex items-center gap-4 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-violet-500/30 transition-all"
                                        >
                                            <div className="w-20 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                                                {drill.thumbnailUrl ? (
                                                    <img src={drill.thumbnailUrl} alt={drill.title} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                        <Play className="w-4 h-4 text-zinc-600" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{drill.title}</h5>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-[10px] text-zinc-500 font-medium">{drill.category}</span>
                                                    <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                                                    <span className="text-[10px] text-zinc-500 font-medium capitalize">{drill.difficulty}</span>
                                                </div>
                                            </div>
                                            <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180 group-hover:text-violet-400 transition-colors" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}

                        {bundledSparringVideos.length > 0 && (
                            <div>
                                <h4 className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                                    Sparring Analysis
                                </h4>
                                <div className="space-y-2">
                                    {bundledSparringVideos.map(video => (
                                        <Link
                                            key={video.id}
                                            to="/sparring"
                                            state={{ highlightVideoId: video.id }}
                                            className="group flex items-center gap-4 p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-indigo-500/30 transition-all"
                                        >
                                            <div className="w-20 aspect-video rounded-xl overflow-hidden bg-black shrink-0">
                                                {video.thumbnailUrl ? (
                                                    <img src={video.thumbnailUrl} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                                        <Play className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-sm font-bold text-zinc-200 group-hover:text-white truncate">{video.title}</h5>
                                                <p className="text-[10px] text-zinc-500 mt-1">{new Date(video.createdAt || '').toLocaleDateString()}</p>
                                            </div>
                                            <ChevronLeft className="w-4 h-4 text-zinc-600 rotate-180 group-hover:text-indigo-400 transition-colors" />
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderPurchaseBox = () => (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl shadow-black/50 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="relative mb-6">
                <p className="text-zinc-500 text-[10px] font-extrabold uppercase tracking-widest mb-3 text-center">Lifetime Access</p>
                <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/50 rounded-2xl border border-zinc-800/50 mb-6">
                    <span className="text-3xl font-black text-white mb-1">{formattedPrice}</span>
                    {!isFree && <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">단품 평생 소장</span>}
                </div>
            </div>

            <div className="space-y-3">
                {ownsCourse ? (
                    <Button className="w-full h-14 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold text-base hover:bg-zinc-800 cursor-default" disabled>
                        <CheckCircle className="w-5 h-5 mr-2 text-violet-500" />
                        {isFree ? '라이브러리에 있음' : '구매 완료'}
                    </Button>
                ) : (
                    <Button
                        onClick={handlePurchase}
                        disabled={purchasing}
                        className="w-full h-16 rounded-2xl bg-white text-black hover:bg-zinc-200 font-black text-lg transition-all duration-300 active:scale-95"
                    >
                        {purchasing ? '처리 중...' :
                            course?.price === 0 ? '지금 무료 소장하기' : '단품 평생 소장하기'}
                    </Button>
                )}

                {!course?.isSubscriptionExcluded && !ownsCourse && !isFree && !(actualIsSubscribed ?? isSubscribed) && (
                    <div className="relative pt-6">
                        <div className="absolute inset-x-0 top-0 flex items-center justify-center">
                            <span className="bg-zinc-900 px-3 text-[10px] font-extrabold text-zinc-600 uppercase tracking-widest">or</span>
                        </div>
                        <Link to="/pricing" className="block mt-2">
                            <Button variant="secondary" className="w-full h-16 rounded-2xl bg-violet-600 border border-violet-500/50 text-white hover:bg-violet-500 transition-all font-black text-lg shadow-[0_4px_20px_rgba(124,58,237,0.3)] active:scale-95 flex items-center justify-center gap-2">
                                <Zap className="w-5 h-5 fill-current" /> 멤버십 구독으로 전체 시청
                            </Button>
                        </Link>
                        <p className="text-[11px] text-center text-zinc-500 mt-4 font-medium leading-relaxed">
                            월 ₩29,000으로 그래플레이의 모든 콘텐츠를 무제한 시청하세요.
                        </p>
                    </div>
                )}
            </div>

            <p className="text-center text-zinc-600 text-[10px] mt-6 font-medium">
                {isFree ? '무제한 스트리밍이 제공됩니다.' : '구매 시 평생 소장 및 무제한 스트리밍.'}
            </p>
        </div>
    );

    const renderCurriculum = () => (
        <div className="bg-zinc-900/20 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden shadow-sm">
            {/* Only Lessons List - Tabs Removed */}
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent p-2 space-y-1">
                {lessons.map((lesson) => {
                    const hasAccess = canWatchLesson(lesson);
                    const isLocked = !hasAccess;

                    return (
                        <button
                            key={lesson.id}
                            onClick={() => hasAccess && handleLessonSelect(lesson)}
                            disabled={isLocked}
                            className={cn(
                                "w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all border group relative overflow-hidden",
                                isLocked && "cursor-not-allowed opacity-60",
                                selectedLesson?.id === lesson.id
                                    ? "bg-violet-600/10 border-violet-500/50"
                                    : "bg-transparent border-transparent",
                                hasAccess && "hover:bg-zinc-800/50 hover:border-zinc-800"
                            )}
                        >
                            {/* Left Indicator (Only active) */}
                            {selectedLesson?.id === lesson.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500"></div>
                            )}

                            <div className="shrink-0 pt-0.5">
                                {completedLessons.has(lesson.id) ? (
                                    <CheckCircle className="w-5 h-5 text-violet-500" />
                                ) : isLocked ? (
                                    <Lock className="w-5 h-5 text-zinc-600" />
                                ) : (
                                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border-2 text-[10px] font-bold",
                                        selectedLesson?.id === lesson.id ? "border-violet-500 text-violet-400" : "border-zinc-700 text-zinc-500"
                                    )}>
                                        {lesson.lessonNumber}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h4 className={cn("text-sm font-medium mb-1 line-clamp-2 transition-colors",
                                    selectedLesson?.id === lesson.id ? "text-violet-200" :
                                        isLocked ? "text-zinc-500" : "text-zinc-300 group-hover:text-zinc-100"
                                )}>
                                    {lesson.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">{lesson.length}</span>
                                    {isPreviewMode(lesson) && canWatchLesson(lesson) && lesson.id !== dailyFreeLessonId && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                                            1분 프리뷰
                                        </span>
                                    )}
                                    {lesson.id === dailyFreeLessonId && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold flex items-center gap-1">
                                            <Clock className="w-2.5 h-2.5" /> 오늘의 무료 레슨
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Play Icon on Hover / Lock Icon */}
                            {!isLocked && selectedLesson?.id !== lesson.id && (
                                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-zinc-300 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    return (
        <div
            className="bg-zinc-950 min-h-screen text-zinc-100 selection:bg-violet-500/30"
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Header (Transparent Sticky) */}
            <div className="fixed top-20 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-4">
                <div className="max-w-[1800px] mx-auto h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors border border-zinc-800">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">뒤로 가기</span>
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pt-24 pb-24 px-4 lg:px-8 max-w-[1800px] mx-auto">
                {/* Mobile Layout: Video -> Curriculum -> Instructor -> Payment -> Info */}
                <div className="flex flex-col gap-6 lg:hidden">
                    {!isDesktop && renderVideoPlayer()}
                    {renderCurriculum()}
                    {renderHeaderInfo()}
                    {renderAppDescription()}
                    {renderBonusContent()}
                    {renderInstructor()}
                    {renderPurchaseBox()}
                </div>

                {/* Desktop Layout (Original) */}
                <div className="hidden lg:flex flex-row gap-8 xl:gap-12">
                    {/* Left Column: Video Player & Main Info */}
                    <div className="flex-1 min-w-0">
                        {isDesktop && renderVideoPlayer()}
                        {renderHeaderInfo()}
                        {renderAppDescription()}
                        {renderBonusContent()}
                        {renderInstructor()}
                    </div>

                    {/* Right Column: Sidebar (Curriculum + Purchase) */}
                    <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-6">
                        <div className="space-y-6 z-20">
                            {renderPurchaseBox()}
                            {renderCurriculum()}
                        </div>
                    </div>
                </div>


                {/* Recommended for You Section */}
                {
                    relatedCourses.length > 0 && (
                        <div className="w-full mt-24">
                            <h3 className="text-xl font-bold text-white mb-6">추천 클래스</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                                {relatedCourses.map(course => (
                                    <div
                                        key={course.id}
                                        onClick={() => navigate(`/courses/${course.id}`)}
                                        className="group cursor-pointer"
                                    >
                                        <div className="aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 mb-3 relative shadow-lg group-hover:shadow-violet-900/10 transition-all">
                                            {course.thumbnailUrl ? (
                                                <img src={course.thumbnailUrl} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800"><Play className="w-10 h-10 text-zinc-600" /></div>
                                            )}
                                            {course.price === 0 && (
                                                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] text-white font-bold border border-white/10 uppercase tracking-wide">Free</div>
                                            )}
                                        </div>
                                        <h4 className="text-sm md:text-base font-bold text-zinc-100 line-clamp-1 group-hover:text-violet-400 transition-colors">{course.title}</h4>
                                        <p className="text-xs text-zinc-500 mt-1">{course.creatorName}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }




                {
                    isShareModalOpen && course && (
                        <React.Suspense fallback={null}>
                            <ShareModal
                                isOpen={isShareModalOpen}
                                onClose={() => setIsShareModalOpen(false)}
                                title={course.title}
                                text={course.description}
                                url={window.location.href}
                                imageUrl={course.thumbnailUrl}
                            />
                        </React.Suspense>
                    )
                }

                {
                    isPaywallOpen && !user ? (
                        <ReelLoginModal
                            isOpen={isPaywallOpen}
                            onClose={() => setIsPaywallOpen(false)}
                            redirectUrl={`/courses/${id}${selectedLesson ? `?lessonId=${selectedLesson.id}` : ''}`}
                        />
                    ) : isPaywallOpen && (
                        <ConfirmModal
                            isOpen={isPaywallOpen}
                            onClose={() => setIsPaywallOpen(false)}
                            onConfirm={() => {
                                // Logged-in users: redirect to pricing with return URL
                                const returnUrl = `/courses/${id}${selectedLesson ? `?lessonId=${selectedLesson.id}` : ''}`;
                                navigate('/pricing', { state: { returnUrl } });
                            }}
                            title="1분 무료 체험 종료"
                            message="이 레슨의 뒷부분과 모든 블랙벨트의 커리큘럼을 무제한으로 이용하려면 그래플레이 구독을 시작하세요."
                            confirmText="구독 요금제 보기"
                            cancelText="나중에 하기"
                            variant="info"
                        />
                    )
                }
            </div >
        </div >

    );
};

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));
