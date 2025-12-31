import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLessonById, getCourseById } from '../lib/api';
import { Lesson, Course } from '../types';
import { Button } from '../components/Button';
import { VideoPlayer } from '../components/VideoPlayer';
import { ArrowLeft, Calendar, Eye, Clock, BookOpen } from 'lucide-react';

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
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-zinc-400">로딩 중...</p>
                </div>
            </div>
        );
    }

    if (!lesson) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">레슨을 찾을 수 없습니다</h2>
                    <Button onClick={() => navigate(-1)}>뒤로 가기</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white pb-20">
            {/* Header / Back Button */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-zinc-400 hover:text-white transition-colors mb-4"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    돌아가기
                </button>
            </div>

            {/* Video Player Section */}
            <div className="w-full bg-black aspect-video max-h-[70vh] flex justify-center border-b border-zinc-800">
                <div className="w-full h-full max-w-7xl mx-auto">
                    {lesson.videoUrl || lesson.vimeoUrl ? (
                        <VideoPlayer
                            vimeoId={lesson.videoUrl || lesson.vimeoUrl || ''}
                            title={lesson.title}
                            onProgress={() => { }}
                            onEnded={() => { }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-zinc-400">
                            <div className="w-16 h-16 border-4 border-zinc-700 border-t-blue-500 rounded-full animate-spin mb-4"></div>
                            <p className="text-xl font-medium text-white mb-2">비디오 처리 중입니다</p>
                            <p className="text-sm text-zinc-500">업로드된 영상을 처리하고 있습니다. 잠시만 기다려주세요.</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            >
                                새로고침
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Info Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Main Content */}
                    <div className="lg:w-3/4">
                        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">{lesson.title}</h1>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 mb-6 pb-6 border-b border-zinc-800">
                            <div className="flex items-center">
                                <Eye className="w-4 h-4 mr-1.5" />
                                {lesson.views?.toLocaleString() || 0} 조회
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-1.5" />
                                {lesson.durationMinutes}분
                            </div>
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1.5" />
                                {new Date(lesson.createdAt).toLocaleDateString()}
                            </div>
                            {course && (
                                <Link to={`/courses/${course.id}`} className="flex items-center text-blue-400 hover:text-blue-300 ml-auto">
                                    <BookOpen className="w-4 h-4 mr-1.5" />
                                    클래스 보기: {course.title}
                                </Link>
                            )}
                        </div>

                        <div className="prose prose-invert max-w-none">
                            <h3 className="text-lg font-bold text-white mb-2">레슨 설명</h3>
                            <p className="text-zinc-300 whitespace-pre-line">{lesson.description}</p>
                        </div>
                    </div>

                    {/* Sidebar (Course Info) */}
                    {course && (
                        <div className="lg:w-1/4">
                            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6 sticky top-24">
                                <h3 className="font-bold text-white mb-4">포함된 클래스</h3>
                                <Link to={`/courses/${course.id}`} className="block group">
                                    <div className="aspect-video rounded-lg overflow-hidden bg-zinc-800 mb-3">
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                    </div>
                                    <h4 className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                                        {course.title}
                                    </h4>
                                    <p className="text-sm text-zinc-400 mt-1">
                                        {course.lessonCount}개의 레슨
                                    </p>
                                </Link>
                                <Link to={`/courses/${course.id}`}>
                                    <Button className="w-full mt-4 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700" variant="outline">
                                        클래스 전체 보기
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
