import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getCreatorById, getCoursesByCreator } from '../lib/api';
import { Creator, Course } from '../types';
import { Button } from '../components/Button';
import { CourseCard } from '../components/CourseCard';
import { BookOpen, Users } from 'lucide-react';

export const CreatorProfile: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [creator, setCreator] = useState<Creator | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchCreator() {
            if (!id) return;

            try {
                const creatorData = await getCreatorById(id);
                setCreator(creatorData);

                if (creatorData) {
                    const coursesData = await getCoursesByCreator(id);
                    setCourses(coursesData);
                }
            } catch (error) {
                console.error('Error fetching creator:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchCreator();
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
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-4">인스트럭터를 찾을 수 없습니다</h2>
                    <Link to="/">
                        <Button>홈으로 돌아가기</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Creator Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-8">
                        <img
                            src={creator.profileImage}
                            alt={creator.name}
                            className="w-32 h-32 rounded-full border-4 border-white shadow-lg object-cover"
                        />
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold mb-2">{creator.name}</h1>
                            <p className="text-blue-100 text-lg mb-4">{creator.bio}</p>
                            <div className="flex items-center gap-6 text-blue-100">
                                <div className="flex items-center gap-2">
                                    <Users className="w-5 h-5" />
                                    <span>구독자 {creator.subscriberCount.toLocaleString()}명</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5" />
                                    <span>강좌 {courses.length}개</span>
                                </div>
                            </div>
                        </div>
                        <Link to="/settings">
                            <Button variant="secondary">프로필 수정</Button>
                        </Link>
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
