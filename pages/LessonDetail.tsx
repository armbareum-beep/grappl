import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLessonById, getCourseById } from '../lib/api';
import { Lesson, Course } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Calendar, Eye, Clock, BookOpen } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';

export const LessonDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const lessonData = await getLessonById(id);
                setLesson(lessonData);

                if (lessonData && lessonData.courseId) {
                    const courseData = await getCourseById(lessonData.courseId);
                    setCourse(courseData);
                }
            } catch (error) {
                console.error('Error fetching lesson details:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [id]);

    if (loading) {
        return <LoadingScreen message="레슨 정보를 불러오는 중..." />;
    }

    if (!lesson) {
        return <ErrorScreen
            title="레슨을 찾을 수 없습니다"
            error="요청하신 레슨이 존재하지 않거나 액세스 권한이 없습니다."
            resetMessage="브라우저를 새로고침하거나 고객센터에 문의해주세요."
        />;
    }

    return (
        <div className="bg-zinc-950 min-h-screen text-zinc-100 selection:bg-violet-500/30">
            {/* Header (Transparent Sticky) */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900">
                <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
                    >
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center group-hover:bg-zinc-800 transition-colors">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-sm">뒤로 가기</span>
                    </button>
                    {course && (
                        <Link
                            to={`/courses/${course.id}`}
                            className="text-xs font-bold text-violet-400 uppercase tracking-wider hover:text-violet-300 transition-colors px-4 py-2 rounded-full bg-violet-500/10 border border-violet-500/20"
                        >
                            전체 클래스 보기
                        </Link>
                    )}
                </div>
            </div>

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
                                {lesson.videoUrl || lesson.vimeoUrl ? (
                                    <VideoPlayer
                                        vimeoId={lesson.videoUrl || lesson.vimeoUrl || ''}
                                        title={lesson.title}
                                        onProgress={() => { }}
                                        onEnded={() => { }}
                                    />
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

                            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight leading-tight mb-8">
                                {lesson.title}
                            </h1>

                            <div className="border-t border-zinc-900 pt-8 mt-8">
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
        </div>
    );
};
