import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourseById, getLessonsByCourse, getCreatorById, purchaseCourse, checkCourseOwnership, getLessonProgress, markLessonComplete, updateLastWatched, enrollInCourse, recordWatchTime, checkCourseCompletion, getCourseDrillBundles } from '../lib/api';
import { Course, Lesson, Creator, Drill } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Lock, Heart, Share2, Clock, Eye, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { LoadingScreen } from '../components/LoadingScreen';



export const CourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { success, error: toastError } = useToast();
    const [course, setCourse] = useState<Course | null>(null);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [ownsCourse, setOwnsCourse] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [bundledDrills, setBundledDrills] = useState<Drill[]>([]);
    const [activeTab, setActiveTab] = useState<'lessons' | 'drills'>('lessons');


    const lastTickRef = React.useRef<number>(0);
    const accumulatedTimeRef = React.useRef<number>(0);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
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

                if (lessonsData.length > 0) {
                    setSelectedLesson(lessonsData[0]);
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
                            const progress = await getLessonProgress(user.id, lesson.id);
                            if (progress?.completed) {
                                completed.add(lesson.id);
                            }
                        }
                        setCompletedLessons(completed);
                    }
                }
            } catch (error) {
                console.error('Error fetching course details:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id, user]);

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
        setSelectedLesson(lesson);

        // Update last watched time
        if (user && canWatchLesson(lesson)) {
            await updateLastWatched(user.id, lesson.id);
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
                success(`🎉 강좌 완강 축하합니다!\n\n전투력 증가: ${data.category} +${data.stat_gained}\nXP 획득: +${data.xp_gained}`);
            }
        }
    };

    const toggleLessonComplete = async (lessonId: string) => {
        if (!user) return;

        const isCompleted = completedLessons.has(lessonId);
        await markLessonComplete(user.id, lessonId, !isCompleted);

        setCompletedLessons(prev => {
            const newSet = new Set(prev);
            if (isCompleted) {
                newSet.delete(lessonId);
            } else {
                newSet.add(lessonId);
            }
            return newSet;
        });

        // Check for course completion if we just marked a lesson as complete
        if (!isCompleted && course) {
            const { data } = await checkCourseCompletion(user.id, course.id);
            if (data && data.newly_awarded) {
                success(`🎉 강좌 완강 축하합니다!\n\n전투력 증가: ${data.category} +${data.stat_gained}\nXP 획득: +${data.xp_gained}`);
            }
        }
    };

    if (loading) {
        return <LoadingScreen message="강좌 정보 불러오는 중..." />;
    }

    if (!course) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">강좌를 찾을 수 없습니다</h2>
                    <Link to="/browse">
                        <Button>강좌 둘러보기</Button>
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
        const [mins, secs] = lesson.length.split(':').map(Number);
        return total + mins * 60 + secs;
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

        if (accumulatedTimeRef.current >= 10) {
            const timeToSend = Math.floor(accumulatedTimeRef.current);
            accumulatedTimeRef.current -= timeToSend;

            // Record watch time if user is a subscriber AND does NOT own the course
            // (If they own it, it shouldn't count towards subscription revenue pool)
            if (user.isSubscriber && !ownsCourse) {
                recordWatchTime(user.id, timeToSend, undefined, selectedLesson.id);
            }
        }
    };
    return (
        <div className="bg-black min-h-screen text-white">
            {/* Header */}
            <div className="bg-black/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
                    <Link to="/browse" className="inline-flex items-center text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        <span className="font-medium">강좌 목록으로</span>
                    </Link>
                </div>
            </div>

            {/* Main Content - YouTube Style Layout */}
            <div className="max-w-[1800px] mx-auto px-0 lg:px-6 py-0 lg:py-6">
                <div className="flex flex-col lg:flex-row gap-0 lg:gap-6">
                    {/* Left Column - Video Player & Course Info */}
                    <div className="flex-1 lg:max-w-[calc(100%-400px)]">
                        {/* Video Player */}
                        <div className="bg-black lg:rounded-xl overflow-hidden shadow-lg">
                            {selectedLesson && canWatchLesson(selectedLesson) && selectedLesson.vimeoUrl ? (
                                <VideoPlayer
                                    vimeoId={selectedLesson.vimeoUrl}
                                    title={selectedLesson.title}
                                    onEnded={handleVideoEnded}
                                    onProgress={handleProgress}
                                />
                            ) : (
                                <div className="w-full bg-zinc-900 aspect-video flex items-center justify-center relative">
                                    <img
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        className="w-full h-full object-cover opacity-20"
                                    />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                                        <div className="bg-zinc-800/50 p-6 rounded-full backdrop-blur-sm mb-4 border border-white/10">
                                            <Lock className="w-10 h-10 text-zinc-400" />
                                        </div>
                                        <h2 className="text-2xl font-bold mb-2">이 레슨을 시청하려면 구매하세요</h2>
                                        <p className="text-zinc-400">
                                            {isFree ? '로그인 후 시청 가능합니다' : '1번 레슨은 무료 미리보기로 제공됩니다'}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Course Info Below Video */}
                        <div className="bg-zinc-900/50 border border-zinc-800 lg:rounded-xl p-4 lg:p-6 mt-0 lg:mt-4">
                            {/* Title */}
                            <h1 className="text-xl lg:text-2xl font-bold text-white mb-3">{course.title}</h1>

                            {/* Creator Info - YouTube Style (Compact) */}
                            {creator && (
                                <div className="flex items-center justify-between mb-3">
                                    <Link to={`/creator/${creator.id}`} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity">
                                        <img src={creator.profileImage} alt={creator.name} className="w-10 h-10 rounded-full object-cover flex-shrink-0 border border-zinc-700" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-sm text-white">{creator.name}</h3>
                                            <p className="text-xs text-zinc-400 truncate">{creator.bio}</p>
                                        </div>
                                    </Link>
                                    <div className="flex gap-2 ml-4">
                                        <button className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors">
                                            <Heart className="w-5 h-5" />
                                        </button>
                                        <button className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 transition-colors">
                                            <Share2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stats and Category */}
                            <div className="flex items-center gap-3 text-xs text-zinc-500 mb-4 pb-4 border-b border-zinc-800">
                                <div className="flex items-center">
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    <span>{course.views.toLocaleString()} 조회</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center">
                                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                                    <span>{lessons.length}개 레슨</span>
                                </div>
                                <span>•</span>
                                <div className="flex items-center">
                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                    <span>{totalHours > 0 ? `${totalHours}시간 ` : ''}{totalMins}분</span>
                                </div>
                                <span>•</span>
                                <span className="text-blue-400 font-semibold">
                                    {course.category}
                                </span>
                                <span>•</span>
                                <span className={`font-semibold ${course.difficulty === 'Advanced' ? 'text-red-400' :
                                    course.difficulty === 'Intermediate' ? 'text-yellow-400' :
                                        'text-green-400'
                                    }`}>
                                    {course.difficulty === 'Beginner' ? '초급' : course.difficulty === 'Intermediate' ? '중급' : '상급'}
                                </span>
                            </div>

                            {/* Description */}
                            <p className="text-zinc-300 text-sm leading-relaxed">{course.description}</p>
                        </div>
                    </div>

                    {/* Right Sidebar - Lesson List */}
                    <div className="lg:w-[400px] lg:sticky lg:top-20 lg:self-start">
                        <div className="bg-zinc-900/50 border border-zinc-800 lg:rounded-xl shadow-lg overflow-hidden" style={{ maxHeight: 'calc(100vh - 100px)' }}>
                            {/* Sidebar Header with Tabs */}
                            <div className="border-b border-zinc-800 bg-zinc-900/80">
                                {bundledDrills.length > 0 ? (
                                    <div className="flex">
                                        <button
                                            onClick={() => setActiveTab('lessons')}
                                            className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'lessons'
                                                ? 'border-blue-500 text-blue-400'
                                                : 'border-transparent text-zinc-400 hover:text-white'
                                                }`}
                                        >
                                            강좌 목차 ({lessons.length})
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('drills')}
                                            className={`flex-1 py-4 text-sm font-bold text-center transition-colors border-b-2 ${activeTab === 'drills'
                                                ? 'border-blue-500 text-blue-400'
                                                : 'border-transparent text-zinc-400 hover:text-white'
                                                }`}
                                        >
                                            보너스 드릴 ({bundledDrills.length})
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-4">
                                        <h2 className="text-lg font-bold text-white">강좌 목차</h2>
                                        <p className="text-sm text-zinc-500 mt-1">{lessons.length}개 레슨 • {totalHours > 0 ? `${totalHours}시간 ` : ''}{totalMins}분</p>
                                    </div>
                                )}
                            </div>

                            {/* Content Area - Scrollable */}
                            <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                                {activeTab === 'lessons' ? (
                                    <div className="divide-y divide-zinc-800">
                                        {lessons.map((lesson) => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => handleLessonSelect(lesson)}
                                                className={`w-full p-4 text-left transition-all hover:bg-zinc-800/50 ${selectedLesson?.id === lesson.id
                                                    ? 'bg-blue-900/20 border-l-4 border-blue-500'
                                                    : 'border-l-4 border-transparent'
                                                    }`}
                                            >
                                                {/* Lesson Number and Status */}
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-xs font-bold ${selectedLesson?.id === lesson.id ? 'text-blue-400' : 'text-zinc-500'
                                                        }`}>
                                                        {lesson.lessonNumber}
                                                    </span>
                                                    {completedLessons.has(lesson.id) && (
                                                        <CheckCircle className="w-4 h-4 text-green-500 fill-green-900/20" />
                                                    )}
                                                    {!canWatchLesson(lesson) && (
                                                        <Lock className="w-3 h-3 text-zinc-600" />
                                                    )}
                                                    {(lesson.lessonNumber === 1 && !isFree) && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-800">
                                                            무료
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Lesson Title */}
                                                <h3 className={`font-semibold text-sm mb-1 line-clamp-2 ${selectedLesson?.id === lesson.id ? 'text-blue-100' : 'text-zinc-300'
                                                    }`}>
                                                    {lesson.title}
                                                </h3>

                                                {/* Duration and Complete Button */}
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-zinc-500">{lesson.length}</span>
                                                    {user && canWatchLesson(lesson) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleLessonComplete(lesson.id);
                                                            }}
                                                            className={`text-xs px-2 py-1 rounded transition-colors ${completedLessons.has(lesson.id)
                                                                ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800'
                                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700'
                                                                }`}
                                                        >
                                                            {completedLessons.has(lesson.id) ? '✓' : '완료'}
                                                        </button>
                                                    )}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="divide-y divide-zinc-800">
                                        {bundledDrills.map((drill) => (
                                            <Link
                                                key={drill.id}
                                                to={`/drills/${drill.id}`}
                                                className="block w-full p-4 text-left transition-all hover:bg-zinc-800/50 border-l-4 border-transparent hover:border-zinc-700"
                                            >
                                                <div className="flex gap-3">
                                                    <div className="w-20 h-12 bg-zinc-800 rounded overflow-hidden flex-shrink-0">
                                                        {drill.thumbnailUrl ? (
                                                            <img src={drill.thumbnailUrl} alt={drill.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                                                <div className="w-4 h-4 bg-zinc-700 rounded-full" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-semibold text-sm text-zinc-300 mb-1 truncate">
                                                            {drill.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">{drill.category}</span>
                                                            <span>{drill.difficulty}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Purchase Options in Sidebar */}
                            <div className="p-4 border-t border-zinc-800 bg-zinc-900/80">
                                <div className="mb-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-zinc-400">단품 구매</span>
                                        <span className={`text-xl font-bold ${isFree ? 'text-green-400' : 'text-white'}`}>
                                            {formattedPrice}
                                        </span>
                                    </div>

                                    {ownsCourse ? (
                                        <Button className="w-full bg-zinc-800 text-zinc-400 border border-zinc-700" size="sm" disabled>
                                            ✓ {isFree ? '라이브러리에 추가됨' : '구매 완료'}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white"
                                            size="sm"
                                            onClick={handlePurchase}
                                            disabled={purchasing}
                                        >
                                            {purchasing ? '처리 중...' : isFree ? '내 라이브러리에 담기' : '구매하기'}
                                        </Button>
                                    )}
                                </div>

                                {!course.isSubscriptionExcluded && (
                                    <div className="pt-3 border-t border-zinc-800">
                                        {user?.isSubscriber ? (
                                            <div className="text-center py-2">
                                                <span className="text-sm text-blue-400 font-semibold">✓ 구독 중</span>
                                            </div>
                                        ) : (
                                            <Link to="/pricing">
                                                <Button variant="secondary" className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700" size="sm">
                                                    구독하고 전체 강좌 보기
                                                </Button>
                                            </Link>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 p-4 lg:hidden z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <p className="text-xs text-zinc-500 mb-0.5">
                            {isFree ? '무료 강좌' : course.isSubscriptionExcluded ? '단품 전용' : '월간 구독 포함'}
                        </p>
                        <p className="text-xl font-bold text-white">
                            {formattedPrice}
                        </p>
                    </div>
                    <div className="flex-1">
                        {ownsCourse ? (
                            <Button className="w-full bg-zinc-800 text-zinc-400 border border-zinc-700" disabled>
                                {isFree ? '추가됨' : '구매 완료'}
                            </Button>
                        ) : (
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                                onClick={handlePurchase}
                                disabled={purchasing}
                            >
                                {purchasing ? '처리 중...' : isFree ? '담기' : '구매하기'}
                            </Button>
                        )}
                    </div>
                </div>
            </div>


        </div>
    );
};
