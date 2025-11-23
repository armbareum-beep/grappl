import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getCourseById, getLessonsByCourse, getCreatorById, purchaseCourse, checkCourseOwnership, getLessonProgress, markLessonComplete, updateLastWatched, enrollInCourse, recordWatchTime } from '../lib/api';
import { Course, Lesson, Creator } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Lock, Heart, Share2, Clock, Eye, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const CourseDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [course, setCourse] = useState<Course | null>(null);
    const [creator, setCreator] = useState<Creator | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);
    const [ownsCourse, setOwnsCourse] = useState(false);
    const [purchasing, setPurchasing] = useState(false);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

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

        setPurchasing(true);
        try {
            if (course.price === 0) {
                // Free course enrollment
                const { error } = await enrollInCourse(user.id, course.id);
                if (error) {
                    alert('라이브러리 추가 중 오류가 발생했습니다: ' + error.message);
                } else {
                    alert('라이브러리에 추가되었습니다! 📚');
                    setOwnsCourse(true);
                }
            } else {
                // Paid course purchase
                const { error } = await purchaseCourse(user.id, course.id, course.price);

                if (error) {
                    alert('구매 중 오류가 발생했습니다: ' + error.message);
                } else {
                    alert('구매가 완료되었습니다! 🎉\n이제 모든 레슨을 시청할 수 있습니다.');
                    setOwnsCourse(true);
                }
            }
        } catch (err) {
            alert('처리 중 오류가 발생했습니다.');
            console.error('Purchase/Enroll error:', err);
        } finally {
            setPurchasing(false);
        }
    };

    const canWatchLesson = (lesson: Lesson) => {
        // Free courses: all lessons accessible
        if (course?.price === 0) return true;
        // Paid courses: first lesson free, rest require purchase OR subscription
        return lesson.lessonNumber === 1 || ownsCourse || user?.isSubscriber;
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

            // Record watch time if user is a subscriber
            // (Regardless of whether they own the course or not, their subscription fee should contribute)
            if (user.isSubscriber) {
                recordWatchTime(user.id, timeToSend, undefined, selectedLesson.id);
            }
        }
    };
    <div className="bg-white min-h-screen pb-20">
        <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <Link to="/browse" className="inline-flex items-center text-slate-600 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    <span className="font-medium">강좌 목록으로</span>
                </Link>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Video Player Section */}
            <div className="mb-8 rounded-2xl overflow-hidden shadow-2xl bg-black">
                {selectedLesson && canWatchLesson(selectedLesson) && selectedLesson.vimeoUrl ? (
                    <VideoPlayer
                        vimeoId={selectedLesson.vimeoUrl}
                        title={selectedLesson.title}
                        onEnded={handleVideoEnded}
                        onProgress={handleProgress}
                    />
                ) : (
                    <div className="w-full bg-slate-900 aspect-video flex items-center justify-center relative">
                        <img
                            src={course.thumbnailUrl}
                            alt={course.title}
                            className="w-full h-full object-cover opacity-40"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                            <div className="bg-white/10 p-6 rounded-full backdrop-blur-sm mb-4 border border-white/20">
                                <Lock className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">이 레슨을 시청하려면 구매하세요</h2>
                            <p className="text-slate-300">
                                {isFree ? '로그인 후 시청 가능합니다' : '1번 레슨은 무료 미리보기로 제공됩니다'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-2/3">
                    <div className="mb-8">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className="text-blue-600 font-bold text-sm tracking-wide uppercase">
                                    {course.category} &bull; {course.difficulty === 'Beginner' ? '초급' : course.difficulty === 'Intermediate' ? '중급' : '상급'}
                                </span>
                                <h1 className="text-3xl font-bold text-slate-900 mt-1">{course.title}</h1>

                                <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                                    <div className="flex items-center">
                                        <Eye className="w-4 h-4 mr-1" />
                                        <span>{course.views.toLocaleString()} 조회</span>
                                    </div>
                                    <div className="flex items-center">
                                        <BookOpen className="w-4 h-4 mr-1" />
                                        <span>{lessons.length}개 레슨</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-1" />
                                        <span>{totalHours > 0 ? `${totalHours}시간 ` : ''}{totalMins}분</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                                    <Heart className="w-6 h-6" />
                                </button>
                                <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                                    <Share2 className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <p className="text-slate-600 mb-6">{course.description}</p>

                        {creator && (
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center">
                                <img src={creator.profileImage} alt={creator.name} className="w-16 h-16 rounded-full object-cover mr-4" />
                                <div className="flex-grow">
                                    <h3 className="font-bold text-lg text-slate-900">{creator.name}</h3>
                                    <p className="text-slate-500 text-sm">{creator.bio}</p>
                                </div>
                                <Link to={`/creator/${creator.id}`}>
                                    <Button variant="outline" size="sm">채널 보기</Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">강좌 목차</h2>
                        <div className="space-y-2">
                            {lessons.map((lesson) => (
                                <div
                                    key={lesson.id}
                                    className={`w-full p-4 rounded-lg border transition-all ${selectedLesson?.id === lesson.id
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <button
                                            onClick={() => handleLessonSelect(lesson)}
                                            className="flex-grow text-left"
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                {completedLessons.has(lesson.id) && (
                                                    <CheckCircle className="w-5 h-5 text-green-600 fill-green-100" />
                                                )}
                                                <span className={`text-sm font-bold ${selectedLesson?.id === lesson.id ? 'text-blue-600' : 'text-slate-400'
                                                    }`}>
                                                    레슨 {lesson.lessonNumber}
                                                </span>
                                                {(lesson.lessonNumber === 1 && !isFree) && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700">
                                                        무료 미리보기
                                                    </span>
                                                )}
                                                {!canWatchLesson(lesson) && (
                                                    <Lock className="w-4 h-4 text-slate-400" />
                                                )}
                                                <span className={`text-xs px-2 py-0.5 rounded ${lesson.difficulty === 'Advanced' ? 'bg-red-100 text-red-700' :
                                                    lesson.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                    {lesson.difficulty === 'Beginner' ? '초급' : lesson.difficulty === 'Intermediate' ? '중급' : '상급'}
                                                </span>
                                            </div>
                                            <h3 className={`font-semibold mb-1 ${selectedLesson?.id === lesson.id ? 'text-blue-900' : 'text-slate-900'
                                                }`}>
                                                {lesson.title}
                                            </h3>
                                            <p className="text-sm text-slate-600 line-clamp-2">{lesson.description}</p>
                                        </button>
                                        <div className="flex flex-col items-end ml-4 gap-2">
                                            <span className="text-sm text-slate-500">{lesson.length}</span>
                                            {user && canWatchLesson(lesson) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleLessonComplete(lesson.id);
                                                    }}
                                                    className={`text-xs px-3 py-1 rounded-full transition-colors ${completedLessons.has(lesson.id)
                                                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {completedLessons.has(lesson.id) ? '완료됨' : '완료'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="lg:w-1/3">
                    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6 sticky top-24">
                        <h3 className="text-lg font-bold text-slate-900 mb-4">구매 옵션</h3>

                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-600">단품 구매</span>
                                <span className={`text-2xl font-bold ${isFree ? 'text-green-600' : 'text-slate-900'}`}>
                                    {formattedPrice}
                                </span>
                            </div>

                            {isFree && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2">
                                    <p className="text-green-800 font-medium text-center">
                                        🎉 모든 레슨을 무료로 시청하세요!
                                    </p>
                                </div>
                            )}

                            {ownsCourse ? (
                                <Button className="w-full mb-2" disabled>
                                    ✓ {isFree ? '라이브러리에 추가됨' : '구매 완료'}
                                </Button>
                            ) : (
                                <Button
                                    className="w-full mb-2"
                                    onClick={handlePurchase}
                                    disabled={purchasing}
                                >
                                    {purchasing ? '처리 중...' : isFree ? '내 라이브러리에 담기' : '이 강좌만 구매하기'}
                                </Button>
                            )}

                            <p className="text-xs text-slate-400 text-center">평생 소장 및 무제한 시청</p>
                            {!isFree && <p className="text-xs text-green-600 text-center mt-2">💡 1번 레슨 무료 미리보기 가능</p>}
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-slate-600">월간 구독</span>
                                <span className="text-xl font-bold text-blue-600">₩29,000<span className="text-sm text-slate-400 font-normal">/월</span></span>
                            </div>
                            {user?.isSubscriber ? (
                                <Button className="w-full mb-2" disabled>
                                    ✓ 구독 중
                                </Button>
                            ) : (
                                <Link to="/pricing">
                                    <Button variant="secondary" className="w-full mb-2">구독하고 전체 강좌 보기</Button>
                                </Link>
                            )}
                            <p className="text-xs text-slate-400 text-center">모든 강좌 무제한 접근</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div >
};
