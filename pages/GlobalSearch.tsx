import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchContent } from '../lib/api';
import { Course, DrillRoutine } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { CourseCard } from "../components/CourseCard";
import { DrillRoutineCard as RoutineCard } from "../components/DrillRoutineCard";
import { Search, ArrowLeft } from 'lucide-react';

export const GlobalSearch: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';

    const [courses, setCourses] = useState<Course[]>([]);
    const [routines, setRoutines] = useState<DrillRoutine[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'routines'>('all');

    useEffect(() => {
        if (query) {
            performSearch();
        } else {
            setLoading(false);
        }
    }, [query]);

    const performSearch = async () => {
        setLoading(true);
        try {
            const { courses, routines } = await searchContent(query);
            setCourses(courses);
            setRoutines(routines);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen message="검색 중..." />;

    const hasResults = courses.length > 0 || routines.length > 0;

    return (
        <div className="min-h-screen bg-slate-950 py-20 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center text-slate-400 hover:text-white mb-4 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        뒤로 가기
                    </button>

                    <h1 className="text-3xl font-bold text-white mb-2">
                        "{query}" 검색 결과
                    </h1>
                    <p className="text-slate-400">
                        총 {courses.length + routines.length}개의 콘텐츠가 발견되었습니다.
                    </p>
                </div>

                {/* Tabs */}
                {hasResults && (
                    <div className="flex gap-4 mb-8 border-b border-slate-800 pb-1">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all'
                                ? 'border-blue-500 text-blue-500'
                                : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            전체
                        </button>
                        <button
                            onClick={() => setActiveTab('courses')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'courses'
                                ? 'border-blue-500 text-blue-500'
                                : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            클래스 ({courses.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('routines')}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'routines'
                                ? 'border-blue-500 text-blue-500'
                                : 'border-transparent text-slate-400 hover:text-white'
                                }`}
                        >
                            루틴 ({routines.length})
                        </button>
                    </div>
                )}

                {/* Results */}
                {!hasResults ? (
                    <div className="text-center py-20 text-slate-500">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>검색 결과가 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Courses Section */}
                        {(activeTab === 'all' || activeTab === 'courses') && courses.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                                    클래스
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {courses.map(course => (
                                        <CourseCard key={course.id} course={course} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Routines Section */}
                        {(activeTab === 'all' || activeTab === 'routines') && routines.length > 0 && (
                            <section>
                                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-green-500 rounded-full"></span>
                                    루틴
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {routines.map(routine => (
                                        <RoutineCard key={routine.id} routine={routine} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
