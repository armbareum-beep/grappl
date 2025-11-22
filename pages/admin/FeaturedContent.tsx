import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Save, Star } from 'lucide-react';
import { getCourses, getCreators, getFeaturedContent, updateFeaturedContent } from '../../lib/api';
import { Course, Creator } from '../../types';
import { Button } from '../../components/Button';

export const FeaturedContent: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
    const [selectedCreatorIds, setSelectedCreatorIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [coursesData, creatorsData, featuredData] = await Promise.all([
                    getCourses(),
                    getCreators(),
                    getFeaturedContent()
                ]);

                setCourses(coursesData);
                setCreators(creatorsData);

                if (featuredData.data) {
                    setSelectedCourseIds(featuredData.data.featuredCourseIds || []);
                    setSelectedCreatorIds(featuredData.data.featuredCreatorIds || []);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    const toggleCourse = (courseId: string) => {
        setSelectedCourseIds(prev => {
            if (prev.includes(courseId)) {
                return prev.filter(id => id !== courseId);
            } else if (prev.length < 3) {
                return [...prev, courseId];
            }
            return prev;
        });
    };

    const toggleCreator = (creatorId: string) => {
        setSelectedCreatorIds(prev => {
            if (prev.includes(creatorId)) {
                return prev.filter(id => id !== creatorId);
            } else if (prev.length < 2) {
                return [...prev, creatorId];
            }
            return prev;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateFeaturedContent({
                featuredCourseIds: selectedCourseIds,
                featuredCreatorIds: selectedCreatorIds
            });
            alert('홈 화면 설정이 저장되었습니다! 🎉');
        } catch (error) {
            alert('저장 중 오류가 발생했습니다.');
            console.error('Save error:', error);
        } finally {
            setSaving(false);
        }
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

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link to="/admin" className="text-slate-600 hover:text-slate-900">
                                <ArrowLeft className="w-6 h-6" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900">홈 화면 관리</h1>
                                <p className="text-slate-600 mt-1">인기 강좌와 대표 인스트럭터를 선택하세요</p>
                            </div>
                        </div>
                        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
                            <Save className="w-4 h-4" />
                            {saving ? '저장 중...' : '저장하기'}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Featured Courses Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-900">인기 강좌 선택</h2>
                        <span className="text-sm text-slate-500">({selectedCourseIds.length}/3 선택됨)</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-6">홈 화면에 표시할 강좌를 최대 3개까지 선택하세요</p>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {courses.map(course => {
                            const isSelected = selectedCourseIds.includes(course.id);
                            const selectionIndex = selectedCourseIds.indexOf(course.id);

                            return (
                                <div
                                    key={course.id}
                                    onClick={() => toggleCourse(course.id)}
                                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            {selectionIndex + 1}
                                        </div>
                                    )}
                                    <img
                                        src={course.thumbnailUrl}
                                        alt={course.title}
                                        className="w-full h-32 object-cover rounded-lg mb-3"
                                    />
                                    <h3 className="font-semibold text-slate-900 mb-1 line-clamp-1">{course.title}</h3>
                                    <p className="text-sm text-slate-600 line-clamp-2">{course.description}</p>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                                        <span>{course.creatorName}</span>
                                        <span>{course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Featured Creators Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-blue-600" />
                        <h2 className="text-xl font-bold text-slate-900">대표 인스트럭터 선택</h2>
                        <span className="text-sm text-slate-500">({selectedCreatorIds.length}/2 선택됨)</span>
                    </div>
                    <p className="text-sm text-slate-600 mb-6">홈 화면에 표시할 인스트럭터를 최대 2명까지 선택하세요</p>

                    <div className="grid md:grid-cols-2 gap-4">
                        {creators.map(creator => {
                            const isSelected = selectedCreatorIds.includes(creator.id);
                            const selectionIndex = selectedCreatorIds.indexOf(creator.id);

                            return (
                                <div
                                    key={creator.id}
                                    onClick={() => toggleCreator(creator.id)}
                                    className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-4 right-4 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            {selectionIndex + 1}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={creator.profileImage}
                                            alt={creator.name}
                                            className="w-16 h-16 rounded-full object-cover"
                                        />
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-900 mb-1">{creator.name}</h3>
                                            <p className="text-sm text-slate-600 line-clamp-2">{creator.bio}</p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                구독자 {creator.subscriberCount.toLocaleString()}명
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};
