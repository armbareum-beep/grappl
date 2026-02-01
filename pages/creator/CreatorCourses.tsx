import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Edit, Trash, Eye, Users, TrendingUp, DollarSign, PlayCircle, Grid, ChevronDown, ChevronUp } from 'lucide-react';
import { getCreatorCourses } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Course } from '../../types';

export const CreatorCourses: React.FC = () => {
    const { user } = useAuth();
    const [courses, setCourses] = useState<Course[]>([]);
    const [routines, setRoutines] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'courses' | 'routines'>('courses');
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function fetchContent() {
            if (!user) return;
            try {
                const coursesData = await getCreatorCourses(user.id);
                setCourses(coursesData);

                // Fetch routines (mock for now)
                // TODO: Implement getCreatorRoutines API
                setRoutines([]);
            } catch (error) {
                console.error('Error fetching content:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchContent();
    }, [user?.id]);

    const toggleExpand = (id: string) => {
        const newExpanded = new Set(expandedItems);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedItems(newExpanded);
    };

    const filteredCourses = courses.filter(course =>
        course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRoutines = routines.filter(routine =>
        routine.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        routine.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="p-8 text-center text-slate-400">로딩 중...</div>;
    }

    const currentItems = activeTab === 'courses' ? filteredCourses : filteredRoutines;

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white mb-2">콘텐츠 관리</h1>
                    <p className="text-slate-400">내가 만든 클래스와 루틴을 관리하세요.</p>
                </div>

                <div className="flex gap-2">
                    <Link to="/creator/courses/new">
                        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold shadow-lg shadow-blue-500/25">
                            <Plus className="w-5 h-5" />
                            새 클래스
                        </button>
                    </Link>

                    <Link to="/creator/routines/new">
                        <button className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all font-bold shadow-lg shadow-purple-500/25">
                            <Plus className="w-5 h-5" />
                            새 루틴
                        </button>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 bg-slate-900 p-1 rounded-xl border border-slate-800 w-fit">
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'courses'
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    클래스 ({courses.length})
                </button>

                <button
                    onClick={() => setActiveTab('routines')}
                    className={`px-6 py-2 rounded-lg font-medium transition-all ${activeTab === 'routines'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white'
                        }`}
                >
                    루틴 ({routines.length})
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`${activeTab === 'courses' ? '클래스' : '루틴'} 검색...`}

                        className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                </div>
            </div>

            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">총 {activeTab === 'courses' ? '클래스' : '루틴'}</span>

                        <TrendingUp className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{currentItems.length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">총 조회수</span>
                        <Eye className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-white">{currentItems.reduce((sum, c) => sum + (c.views || 0), 0).toLocaleString()}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">총 수강생</span>
                        <Users className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="text-2xl font-black text-white">0</div>
                </div>
                <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400 text-sm font-medium">총 수익</span>
                        <DollarSign className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="text-2xl font-black text-white">₩0</div>
                </div>
            </div>

            {/* Content Grid */}
            {currentItems.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/50 rounded-xl border border-slate-800">
                    <div className="text-slate-500 mb-4">
                        {searchQuery ? '검색 결과가 없습니다.' : `아직 등록된 ${activeTab === 'courses' ? '클래스' : '루틴'}가 없습니다.`}
                    </div>

                    {!searchQuery && (
                        <Link to={`/creator/${activeTab}/new`}>
                            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                첫 {activeTab === 'courses' ? '클래스' : '루틴'} 만들기

                            </button>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {activeTab === 'courses' && filteredCourses.map((course) => {
                        const isExpanded = expandedItems.has(course.id);
                        return (
                            <div key={course.id} className="bg-slate-900 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all overflow-hidden">
                                {/* Course Header */}
                                <div className="p-5 flex items-center gap-4">
                                    {/* Thumbnail */}
                                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                                        <img
                                            src={course.thumbnailUrl}
                                            alt={course.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-lg mb-1 truncate">
                                            {course.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>{course.category}</span>
                                            <span>•</span>
                                            <div className="flex items-center gap-1">
                                                <PlayCircle className="w-3 h-3" />
                                                <span>{course.lessonCount || 0} 레슨</span>
                                            </div>
                                            <span>•</span>
                                            <div className="flex items-center gap-1">
                                                <Eye className="w-3 h-3" />
                                                <span>{course.views.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Price */}
                                    <div className="text-right flex-shrink-0">
                                        <div className="text-lg font-bold text-white mb-1">
                                            {course.price === 0 ? '무료' : `₩${course.price.toLocaleString()}`}
                                        </div>
                                        <span className="text-xs text-green-400">판매중</span>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => toggleExpand(course.id)}
                                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </button>
                                        <Link to={`/creator/courses/${course.id}/edit`}>
                                            <button className="p-2 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <button className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content - Lessons */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800 bg-slate-950/50 p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <PlayCircle className="w-4 h-4 text-blue-400" />
                                            <span className="text-sm font-bold text-white">레슨 목록</span>
                                        </div>
                                        <div className="space-y-2">
                                            {course.lessonCount === 0 ? (
                                                <div className="text-sm text-slate-500 py-4 text-center">
                                                    아직 레슨이 없습니다.
                                                </div>
                                            ) : (
                                                // Mock lessons - replace with actual data
                                                Array.from({ length: course.lessonCount || 0 }).map((_, idx) => (
                                                    <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                                                            <span className="text-xs font-bold text-blue-400">{idx + 1}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-sm text-white font-medium truncate">레슨 {idx + 1}</div>
                                                            <div className="text-xs text-slate-500">10:00</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {activeTab === 'routines' && filteredRoutines.map((routine) => {
                        const isExpanded = expandedItems.has(routine.id);
                        return (
                            <div key={routine.id} className="bg-slate-900 rounded-xl border border-slate-800 hover:border-purple-500/50 transition-all overflow-hidden">
                                {/* Routine Header */}
                                <div className="p-5 flex items-center gap-4">
                                    <div className="w-32 h-20 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                                        <img
                                            src={routine.thumbnailUrl}
                                            alt={routine.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white text-lg mb-1 truncate">
                                            {routine.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span>{routine.category}</span>
                                            <span>•</span>
                                            <div className="flex items-center gap-1">
                                                <Grid className="w-3 h-3" />
                                                <span>{routine.drillCount || 0} 드릴</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right flex-shrink-0">
                                        <div className="text-lg font-bold text-white mb-1">
                                            ₩{routine.price?.toLocaleString() || 0}
                                        </div>
                                        <span className="text-xs text-green-400">판매중</span>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => toggleExpand(routine.id)}
                                            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                                        >
                                            {isExpanded ? (
                                                <ChevronUp className="w-5 h-5 text-slate-400" />
                                            ) : (
                                                <ChevronDown className="w-5 h-5 text-slate-400" />
                                            )}
                                        </button>
                                        <Link to={`/creator/routines/${routine.id}/edit`}>
                                            <button className="p-2 hover:bg-purple-500/10 text-purple-400 rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                        </Link>
                                        <button className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content - Drills */}
                                {isExpanded && (
                                    <div className="border-t border-slate-800 bg-slate-950/50 p-5">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Grid className="w-4 h-4 text-purple-400" />
                                            <span className="text-sm font-bold text-white">드릴 목록</span>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {routine.drillCount === 0 ? (
                                                <div className="col-span-full text-sm text-slate-500 py-4 text-center">
                                                    아직 드릴이 없습니다.
                                                </div>
                                            ) : (
                                                // Mock drills - replace with actual data
                                                Array.from({ length: routine.drillCount || 0 }).map((_, idx) => (
                                                    <div key={idx} className="aspect-[9/16] bg-slate-800 rounded-lg overflow-hidden relative group">
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-3">
                                                            <span className="text-xs text-white font-medium">드릴 {idx + 1}</span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
