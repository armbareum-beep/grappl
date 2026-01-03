import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { getCourseById, getLessonsByCourse, getCreatorById, checkCourseOwnership, getLessonProgress, markLessonComplete, updateLastWatched, enrollInCourse, recordWatchTime, checkCourseCompletion, getCourseDrillBundles, getCourseSparringVideos, toggleCourseLike, checkCourseLiked, getCourseLikeCount, incrementCourseViews, toggleCreatorFollow, checkCreatorFollowStatus } from '../lib/api';
import { Course, Lesson, Creator, Drill, SparringVideo } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Lock, Heart, Share2, Clock, Eye, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

import { cn } from '../lib/utils';



export const CourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [course, setCourse] = useState<Course | null>(null);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ownsCourse, setOwnsCourse] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [bundledDrills, setBundledDrills] = useState<Drill[]>([]);
    const [bundledSparringVideos, setBundledSparringVideos] = useState<SparringVideo[]>([]);
    const [activeTab, setActiveTab] = useState<'lessons' | 'drills' | 'sparring'>('lessons');
    const [isLiked, setIsLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [isFollowed, setIsFollowed] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const [initialStartTime, setInitialStartTime] = useState<number>(0);


    const lastTickRef = React.useRef<number>(0);
    const accumulatedTimeRef = React.useRef<number>(0);
    const lastSavedTimeRef = React.useRef<number>(0);

    useEffect(() => {
        async function fetchData() {
            if (!id) {
                setLoading(false);
                return;
            }

            try {
                const searchParams = new URLSearchParams(location.search);
                const queryLessonId = searchParams.get('lessonId');
                const queryTime = searchParams.get('t');

                const [courseData, lessonsData] = await Promise.all([
                    getCourseById(id),
                    getLessonsByCourse(id),
                ]);

                setCourse(courseData);
                setLessons(lessonsData);

                // Fetch bundled drills
                try {
                    const { data: drillsData } = await getCourseDrillBundles(id);
                    if (drillsData) {
                        setBundledDrills(drillsData);
                    }
                } catch (e) {
                    console.warn('Failed to fetch bundled drills:', e);
                }

                // Fetch bundled sparring videos
                try {
                    const { data: sparringData } = await getCourseSparringVideos(id);
                    if (sparringData) {
                        setBundledSparringVideos(sparringData);
                    }
                } catch (e) {
                    console.warn('Failed to fetch bundled sparring videos:', e);
                }

                if (lessonsData.length > 0) {
                    // Decide which lesson to select
                    let lessonToSelect = lessonsData[0];
                    if (queryLessonId) {
                        const found = lessonsData.find(l => l.id === queryLessonId);
                        if (found) {
                            lessonToSelect = found;
                            if (queryTime) {
                                setInitialStartTime(parseFloat(queryTime));
                            }
                        }
                    }
                    setSelectedLesson(lessonToSelect);
                }

                if (courseData) {
                    const creatorData = await getCreatorById(courseData.creatorId);
                    setCreator(creatorData);

                    if (user) {
                        const owns = await checkCourseOwnership(user.id, id);
                        setOwnsCourse(owns);

                        // Fetch lesson progress
                        const completed = new Set<string>();
                        for (const lesson of lessonsData) {
                            const prog = await getLessonProgress(user.id, lesson.id);
                            if (prog?.completed) {
                                completed.add(lesson.id);
                            }
                            // If we didn't have a query time but have saved progress, use it
                            if (!queryTime && lesson.id === (queryLessonId || lessonsData[0].id) && prog?.watched_seconds) {
                                setInitialStartTime(prog.watched_seconds);
                            }
                        }
                        setCompletedLessons(completed);

                        // Check if course is liked
                        const liked = await checkCourseLiked(user.id, id);
                        setIsLiked(liked);

                        // Check follow status
                        if (courseData.creatorId) {
                            const followed = await checkCreatorFollowStatus(user.id, courseData.creatorId);
                            setIsFollowed(followed);
                        }
                    }

                    // Get like count
                    const count = await getCourseLikeCount(id);
                    setLikeCount(count);

                    // Increment views
                    incrementCourseViews(id);
                }
            } catch (error: any) {
                console.error('Error fetching course details:', error);
                setError(error.message || '클래스 정보를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id, user, location.search]);

    const handlePurchase = async () => {
        if (!user) {
            navigate('/login', { state: { from: { pathname: `/courses/${id}` } } });
            return;
        }

        if (!course) return;

        if (course.price === 0) {
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
        // Free courses: all lessons accessible
        if (course?.price === 0) return true;
        // Paid courses: first lesson free, rest require purchase OR subscription (unless excluded)
        if (lesson.lessonNumber === 1) return true;
        if (ownsCourse) return true;
        // If subscription excluded, subscriber status doesn't grant access
        if (user?.isSubscriber && !course?.isSubscriptionExcluded) return true;
        return false;
    };

    const handleLessonSelect = async (lesson: Lesson) => {
        if (selectedLesson?.id === lesson.id) return;

        setSelectedLesson(lesson);
        setInitialStartTime(0); // Reset for new lesson

        // Update last watched time
        if (user && canWatchLesson(lesson)) {
            await updateLastWatched(user.id, lesson.id);

            // Try to get existing progress for this lesson
            const prog = await getLessonProgress(user.id, lesson.id);
            if (prog?.watched_seconds) {
                setInitialStartTime(prog.watched_seconds);
            }
        }
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
            if (data && data.newly_awarded) {
                success(`🎉 클래스 완강 축하합니다!\n\n전투력 증가: ${data.category} +${data.stat_gained}\nXP 획득: +${data.xp_gained}`);
            }
        }
    };


    if (loading) {
        return <LoadingScreen message="클래스 정보 불러오는 중..." />;
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

    const isFree = course.price === 0;
    const formattedPrice = isFree ? '무료' : new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
    }).format(course.price);

    const totalDuration = lessons.reduce((total, lesson) => {
        if (!lesson.length) return total;

        // Handle "MM:SS" format
        if (lesson.length.includes(':')) {
            const parts = lesson.length.split(':').map(Number);
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                return total + parts[0] * 60 + parts[1];
            }
        }

        return total;
    }, 0);
    const totalHours = Math.floor(totalDuration / 3600);
    const totalMins = Math.floor((totalDuration % 3600) / 60);

    const handleProgress = async (seconds: number) => {
        if (!user || !selectedLesson) return;

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

        // 2. Save playback position (every 5 seconds of video time)
        if (Math.abs(seconds - lastSavedTimeRef.current) >= 5) {
            lastSavedTimeRef.current = seconds;
            updateLastWatched(user.id, selectedLesson.id, Math.floor(seconds));
        }
    };

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

        const { liked, error } = await toggleCourseLike(user.id, id);
        if (error) {
            console.error('Like failed:', error);
            setIsLiked(!newStatus); // Revert
            setLikeCount(prev => newStatus ? prev - 1 : prev + 1);
        } else {
            setIsLiked(liked);
            // Fetch actual count to ensure accuracy
            const count = await getCourseLikeCount(id);
            setLikeCount(count);
        }
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

    const renderVideoPlayer = () => (
        <div className="relative rounded-3xl overflow-hidden bg-black aspect-video shadow-2xl ring-1 ring-zinc-800 group mb-6 lg:mb-0">
            {/* Ambient Glow */}
            <div className="absolute -inset-1 bg-violet-500/20 blur-3xl opacity-20 pointer-events-none group-hover:opacity-30 transition-opacity duration-1000"></div>

            <div className="relative h-full z-10">
                {selectedLesson && canWatchLesson(selectedLesson) && (selectedLesson.videoUrl || selectedLesson.vimeoUrl) ? (
                    <VideoPlayer
                        vimeoId={selectedLesson.videoUrl || selectedLesson.vimeoUrl || ''}
                        title={selectedLesson.title}
                        startTime={initialStartTime}
                        onEnded={handleVideoEnded}
                        onProgress={handleProgress}
                    />
                ) : (
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
                                {isFree ? '로그인하고 무료로 시청하세요.' : '이 클래스를 구매하거나 구독하여 시청하세요.'}
                            </p>

                            {!user && (
                                <Link to="/login" state={{ from: location }}>
                                    <Button className="rounded-full px-6 py-4 md:px-8 md:py-6 text-base md:text-lg bg-violet-600 hover:bg-violet-500 border-none shadow-[0_0_20px_rgba(124,58,237,0.3)]">
                                        로그인하기
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

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
                                <img src={creator.profileImage} alt={creator.name} className="w-full h-full object-cover" />
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

    const renderPurchaseBox = () => (
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-xl shadow-black/50 overflow-hidden relative mb-6">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[60px] rounded-full pointer-events-none"></div>

            <div className="relative mb-6">
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Access Option</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white">{formattedPrice}</span>
                    {!isFree && <span className="text-zinc-500 text-sm font-medium">/ lifetime</span>}
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
                        className="w-full h-14 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-bold text-base shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] transition-all duration-300"
                    >
                        {purchasing ? 'Processing...' : isFree ? 'Start Watching (Free)' : 'Buy Now'}
                    </Button>
                )}

                {!course?.isSubscriptionExcluded && !ownsCourse && !isFree && (
                    <Link to="/pricing" className="block">
                        <Button variant="secondary" className="w-full h-12 rounded-full bg-transparent border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 hover:bg-zinc-800 transition-all font-semibold text-sm">
                            또는 월 ₩29,000으로 구독하기
                        </Button>
                    </Link>
                )}
            </div>

            <p className="text-center text-zinc-600 text-xs mt-6">
                {isFree ? '무제한 스트리밍이 제공됩니다.' : '구매 시 평생 소장 및 무제한 스트리밍.'}
            </p>
        </div>
    );

    const renderCurriculum = () => (
        <div className="bg-zinc-900/20 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden shadow-sm">
            {/* Tabs */}
            {(bundledDrills.length > 0 || bundledSparringVideos.length > 0) ? (
                <div className="flex border-b border-zinc-800/50">
                    <button
                        onClick={() => setActiveTab('lessons')}
                        className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-wider text-center transition-colors",
                            activeTab === 'lessons' ? "text-violet-400 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                        )}
                    >
                        Curriculum
                    </button>
                    <button
                        onClick={() => setActiveTab('drills')}
                        className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-wider text-center transition-colors",
                            activeTab === 'drills' ? "text-violet-400 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                        )}
                    >
                        Drills
                    </button>
                    <button
                        onClick={() => setActiveTab('sparring')}
                        className={cn("flex-1 py-4 text-xs font-bold uppercase tracking-wider text-center transition-colors",
                            activeTab === 'sparring' ? "text-violet-400 bg-zinc-800/50" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30"
                        )}
                    >
                        Sparring
                    </button>
                </div>
            ) : (
                <div className="px-6 py-4 border-b border-zinc-800/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">Curriculum</h3>
                    <span className="text-xs text-zinc-500 font-medium">{lessons.length} Lessons</span>
                </div>
            )}

            {/* List Content */}
            <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent p-2 space-y-1">
                {activeTab === 'lessons' && (
                    lessons.map((lesson) => (
                        <button
                            key={lesson.id}
                            onClick={() => handleLessonSelect(lesson)}
                            className={cn(
                                "w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all border group relative overflow-hidden",
                                selectedLesson?.id === lesson.id
                                    ? "bg-violet-600/10 border-violet-500/50"
                                    : "bg-transparent border-transparent hover:bg-zinc-800/50 hover:border-zinc-800"
                            )}
                        >
                            {/* Left Indicator (Only active) */}
                            {selectedLesson?.id === lesson.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500"></div>
                            )}

                            <div className="shrink-0 pt-0.5">
                                {completedLessons.has(lesson.id) ? (
                                    <CheckCircle className="w-5 h-5 text-violet-500" />
                                ) : !canWatchLesson(lesson) ? (
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
                                    selectedLesson?.id === lesson.id ? "text-violet-200" : "text-zinc-300 group-hover:text-zinc-100"
                                )}>
                                    {lesson.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-zinc-500">{lesson.length}</span>
                                    {(lesson.lessonNumber === 1 && !isFree) && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20 font-bold">
                                            Free Preview
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Play Icon on Hover */}
                            {canWatchLesson(lesson) && selectedLesson?.id !== lesson.id && (
                                <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                        <svg className="w-3 h-3 text-zinc-300 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </div>
                                </div>
                            )}
                        </button>
                    ))
                )}

                {/* Drills Tab */}
                {activeTab === 'drills' && (
                    bundledDrills.length > 0 ? (
                        bundledDrills.map(drill => (
                            <Link
                                key={drill.id}
                                to={`/drills/${drill.id}`}
                                className="flex gap-4 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group"
                            >
                                <div className="w-24 aspect-video bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-800 group-hover:border-zinc-600">
                                    {drill.thumbnailUrl ? (
                                        <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                                            <div className="w-2 h-2 rounded-full bg-zinc-600" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 py-1">
                                    <h4 className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate mb-1">{drill.title}</h4>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-500">{drill.category}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center text-zinc-500 text-sm">No affiliated drills.</div>
                    )
                )}

                {/* Sparring Tab */}
                {activeTab === 'sparring' && (
                    bundledSparringVideos.length > 0 ? (
                        bundledSparringVideos.map(video => (
                            <Link
                                key={video.id}
                                to="/sparring"
                                state={{ highlightVideoId: video.id }}
                                className="flex gap-4 p-3 rounded-xl hover:bg-zinc-800/50 transition-colors group"
                            >
                                <div className="w-24 aspect-video bg-zinc-800 rounded-lg overflow-hidden shrink-0 border border-zinc-800 group-hover:border-zinc-600 relative">
                                    {video.thumbnailUrl && <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                            <svg className="w-2.5 h-2.5 text-white ml-0.5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                        </div>
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 py-1">
                                    <h4 className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 truncate mb-1">{video.title}</h4>
                                    <span className="text-[10px] text-zinc-500">{new Date(video.createdAt || '').toLocaleDateString()}</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="p-8 text-center text-zinc-500 text-sm">No affiliated sparring videos.</div>
                    )
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 selection:bg-violet-500/30">
            {/* Header (Transparent Sticky) */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <Link to="/browse" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">라이브러리로 돌아가기</span>
                    </Link>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="pt-24 pb-20 px-4 lg:px-8 max-w-[1800px] mx-auto">
                {/* Mobile Layout: Video -> Curriculum -> Instructor -> Payment -> Info */}
                <div className="flex flex-col gap-6 lg:hidden">
                    {renderVideoPlayer()}
                    {renderHeaderInfo()}
                    {renderCurriculum()}
                    {renderInstructor()}
                    {renderPurchaseBox()}
                    {renderAppDescription()}
                </div>

                {/* Desktop Layout (Original) */}
                <div className="hidden lg:flex flex-row gap-8 xl:gap-12">
                    {/* Left Column: Video Player & Main Info */}
                    <div className="flex-1 min-w-0">
                        {renderVideoPlayer()}
                        {renderHeaderInfo()}
                        {renderInstructor()}
                        {renderAppDescription()}
                    </div>

                    {/* Right Column: Sidebar (Curriculum + Purchase) */}
                    <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-6">
                        <div className="space-y-6 z-20">
                            {renderPurchaseBox()}
                            {renderCurriculum()}
                        </div>
                    </div>
                </div>
            </div>



            {isShareModalOpen && course && (
                <React.Suspense fallback={null}>
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={course.title}
                        text={course.description}
                        url={window.location.href}
                        imageUrl={course.thumbnailUrl}
                        initialStep="write"
                        activityType="general"
                        metadata={{
                            type: 'course',
                            courseId: course.id,
                            courseTitle: course.title
                        }}
                    />
                </React.Suspense>
            )}
        </div>
    );
};

// Lazy load ShareModal
const ShareModal = React.lazy(() => import('../components/social/ShareModal'));
