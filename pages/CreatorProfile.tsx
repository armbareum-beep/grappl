import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Video as VideoIcon, Award, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCreatorById, getCoursesByCreator } from '../lib/api';
import { Creator, Course } from '../types';
import { CourseCard } from '../components/CourseCard';
import { Button } from '../components/Button';

export const CreatorProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const [creator, setCreator] = useState<Creator | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!id) return;

            try {
                const [creatorData, coursesData] = await Promise.all([
                    getCreatorById(id),
                    getCoursesByCreator(id),
                ]);
                setCreator(creatorData);
                setCourses(coursesData);
            } catch (error) {
                console.error('Error fetching creator data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [id]);

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

                            <Button size="lg" className="shadow-lg">
                                구독하기
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

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
