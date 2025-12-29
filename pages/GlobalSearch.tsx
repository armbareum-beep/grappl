import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Activity, Zap, Users, X, ChevronRight } from 'lucide-react';
import { searchContent } from '../lib/api';
import { Course, DrillRoutine, Drill, TrainingLog } from '../types';

export const GlobalSearch: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';

    // State
    const [searchTerm, setSearchTerm] = useState(query);
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        courses: Course[];
        routines: DrillRoutine[];
        drills: Drill[];
        feeds: TrainingLog[];
    }>({ courses: [], routines: [], drills: [], feeds: [] });

    const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'routines' | 'drills' | 'feed'>('all');

    useEffect(() => {
        if (query) {
            performSearch(query);
            setSearchTerm(query);
        }
    }, [query]);

    const performSearch = async (text: string) => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const data = await searchContent(text);
            setResults(data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            setSearchParams({ q: searchTerm });
        }
    };

    // Helper to clear search
    const clearSearch = () => {
        setSearchTerm('');
        setSearchParams({});
        setResults({ courses: [], routines: [], drills: [], feeds: [] });
    };

    const tabs = [
        { id: 'all', label: '전체' },
        { id: 'courses', label: '클래스', icon: BookOpen, count: results.courses.length },
        { id: 'routines', label: '루틴', icon: Activity, count: results.routines.length },
        { id: 'drills', label: '드릴', icon: Zap, count: results.drills.length },
        { id: 'feed', label: '피드', icon: Users, count: results.feeds.length },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Search Header */}
            <div className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 p-4">
                <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-12 pr-12 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-base"
                        placeholder="클래스, 드릴, 루틴, 피드 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </form>

                {/* Tabs */}
                {query && !loading && (
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1 max-w-2xl mx-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border ${activeTab === tab.id
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                                    }`}
                            >
                                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                                {tab.label}
                                {tab.id !== 'all' && <span className="text-xs opacity-60 ml-0.5">{tab.count}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Results Content */}
            <div className="max-w-2xl mx-auto p-4">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : !query ? (
                    <div className="text-center py-20 text-slate-500">
                        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>검색어를 입력해보세요</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* No Results */}
                        {activeTab === 'all' &&
                            results.courses.length === 0 &&
                            results.routines.length === 0 &&
                            results.drills.length === 0 &&
                            results.feeds.length === 0 && (
                                <div className="text-center py-20 text-slate-500">
                                    <p>검색 결과가 없습니다.</p>
                                </div>
                            )}

                        {/* Courses Section */}
                        {(activeTab === 'all' || activeTab === 'courses') && results.courses.length > 0 && (
                            <section>
                                {activeTab === 'all' && (
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-indigo-400" /> 클래스
                                        </h3>
                                        {results.courses.length > 3 && (
                                            <button onClick={() => setActiveTab('courses')} className="text-xs text-slate-400 flex items-center hover:text-white">
                                                더보기 <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {(activeTab === 'all' ? results.courses.slice(0, 3) : results.courses).map(course => (
                                        <div key={course.id} onClick={() => navigate(`/courses/${course.id}`)} className="flex gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                                            <div className="w-24 aspect-video bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                <img src={course.thumbnailUrl} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h4 className="font-bold text-white line-clamp-1 text-sm">{course.title}</h4>
                                                <p className="text-xs text-slate-400 mt-1">{course.creatorName} · {course.difficulty}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Routines Section */}
                        {(activeTab === 'all' || activeTab === 'routines') && results.routines.length > 0 && (
                            <section>
                                {activeTab === 'all' && (
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-emerald-400" /> 루틴
                                        </h3>
                                        {results.routines.length > 3 && (
                                            <button onClick={() => setActiveTab('routines')} className="text-xs text-slate-400 flex items-center hover:text-white">
                                                더보기 <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {(activeTab === 'all' ? results.routines.slice(0, 3) : results.routines).map(routine => (
                                        <div key={routine.id} onClick={() => navigate(`/routines/${routine.id}`)} className="flex gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                                            <div className="w-16 aspect-square bg-slate-800 rounded-lg overflow-hidden flex-shrink-0 relative">
                                                <img src={routine.thumbnailUrl} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <h4 className="font-bold text-white line-clamp-1 text-sm">{routine.title}</h4>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{routine.difficulty}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-800 rounded text-slate-400">{routine.drillCount} Drills</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Drills Section */}
                        {(activeTab === 'all' || activeTab === 'drills') && results.drills.length > 0 && (
                            <section>
                                {activeTab === 'all' && (
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-purple-400" /> 드릴
                                        </h3>
                                        {results.drills.length > 3 && (
                                            <button onClick={() => setActiveTab('drills')} className="text-xs text-slate-400 flex items-center hover:text-white">
                                                더보기 <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                    {(activeTab === 'all' ? results.drills.slice(0, 4) : results.drills).map(drill => (
                                        <div key={drill.id} onClick={() => navigate(`/drills?view=reels`)} className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative aspect-[9/16] cursor-pointer">
                                            <img src={drill.thumbnailUrl} className="w-full h-full object-cover opacity-80" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
                                                <h4 className="font-bold text-white text-xs line-clamp-2">{drill.title}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{drill.creatorName}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Feeds Section */}
                        {(activeTab === 'all' || activeTab === 'feed') && results.feeds.length > 0 && (
                            <section>
                                {activeTab === 'all' && (
                                    <div className="flex items-center justify-between mb-3 px-1">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Users className="w-5 h-5 text-blue-400" /> 커뮤니티
                                        </h3>
                                        {results.feeds.length > 3 && (
                                            <button onClick={() => setActiveTab('feed')} className="text-xs text-slate-400 flex items-center hover:text-white">
                                                더보기 <ChevronRight className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="space-y-3">
                                    {(activeTab === 'all' ? results.feeds.slice(0, 3) : results.feeds).map(feed => (
                                        <div key={feed.id} onClick={() => navigate(`/journal`)} className="bg-slate-900 p-4 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition-colors">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-800 overflow-hidden">
                                                    {feed.userAvatar ? (
                                                        <img src={feed.userAvatar} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-500 bg-slate-700">{(feed.userName || 'U')[0]}</div>
                                                    )}
                                                </div>
                                                <span className="text-xs text-slate-300 font-medium">{feed.userName || 'Unknown User'}</span>
                                                <span className="text-xs text-slate-500">· {new Date(feed.date).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-sm text-white line-clamp-2">{feed.notes || '내용 없음'}</p>
                                        </div>
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
