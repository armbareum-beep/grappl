import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Activity, Users, X, ChevronRight, Swords, Trophy, PlayCircle } from 'lucide-react';
import { searchContent } from '../lib/api';
import { Course, DrillRoutine, TrainingLog, SparringVideo } from '../types';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';

interface GlobalSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const dragControls = useDragControls();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        courses: Course[];
        routines: DrillRoutine[];
        feeds: TrainingLog[];
        sparring: SparringVideo[];
        arena: any[]; // Placeholder
    }>({ courses: [], routines: [], feeds: [], sparring: [], arena: [] });

    const [activeTab, setActiveTab] = useState<'all' | 'courses' | 'routines' | 'sparring' | 'feed' | 'arena'>('all');

    // Reset search when modal closes
    useEffect(() => {
        if (!isOpen) {
            setSearchTerm('');
            setResults({ courses: [], routines: [], feeds: [], sparring: [], arena: [] });
            setActiveTab('all');
        } else {
            // Handle back button to close search
            const handlePopState = () => {
                onClose();
            };
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [isOpen]);

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
            performSearch(searchTerm);
        }
    };

    // Helper to clear search text
    const clearSearchText = () => {
        setSearchTerm('');
    };

    const handleItemClick = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.y > 100 || info.velocity.y > 500) {
            onClose();
        }
    };

    const tabs = [
        { id: 'all', label: '전체' },
        { id: 'courses', label: '클래스', icon: BookOpen, count: results.courses.length },
        { id: 'routines', label: '루틴', icon: Activity, count: results.routines.length },
        { id: 'sparring', label: '스파링', icon: Swords, count: results.sparring.length },
        { id: 'feed', label: '피드', icon: Users, count: results.feeds.length },
        { id: 'arena', label: '아레나', icon: Trophy, count: results.arena.length },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[15000] flex items-end md:items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, y: '100%' }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        drag="y"
                        dragControls={dragControls}
                        dragListener={false}
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 0.2 }}
                        onDragEnd={handleDragEnd}
                        className="relative bg-zinc-900 w-full md:max-w-2xl md:rounded-[2.5rem] h-[90vh] md:h-[80vh] overflow-hidden shadow-2xl shadow-black/50 flex flex-col border-t md:border border-zinc-800"
                    >
                        {/* Drag Handle */}
                        <div
                            className="w-full flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none bg-zinc-900 border-b border-zinc-800/50 shrink-0"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <div className="w-12 h-1.5 bg-zinc-700/50 rounded-full" />
                        </div>

                        {/* Scrollable Container including Header */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">

                            {/* Search Header (Inside ScrollView) */}
                            <div className="p-6 pt-2 pb-2">
                                <form onSubmit={handleSearchSubmit} className="flex items-center gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                                        <input
                                            className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl py-3.5 pl-12 pr-10 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 transition-all text-base font-medium"
                                            placeholder="기술 이름, 인스트럭터 검색"
                                            aria-label="기술 이름, 인스트럭터 검색"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                        {searchTerm && (
                                            <button
                                                type="button"
                                                onClick={clearSearchText}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white transition-colors"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="text-zinc-500 hover:text-white font-bold whitespace-nowrap px-2 py-2 -mr-2 flex items-center justify-center min-w-[44px] transition-colors"
                                    >
                                        취소
                                    </button>
                                </form>

                                {/* Tabs */}
                                {searchTerm && !loading && (
                                    <div className="flex items-center gap-2 mt-6 overflow-x-auto scrollbar-hide pb-2">
                                        {tabs.map(tab => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id as any)}
                                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border ${activeTab === tab.id
                                                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-900/30'
                                                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-zinc-200'
                                                    }`}
                                            >
                                                {tab.icon && <tab.icon className="w-4 h-4" />}
                                                {tab.label}
                                                {tab.id !== 'all' && <span className="text-xs opacity-60 ml-0.5">{tab.count}</span>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Results Content */}
                            <div className="p-6 pt-2">
                                {loading ? (
                                    <div className="py-20 flex justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-violet-500"></div>
                                    </div>
                                ) : !searchTerm ? (
                                    <div className="text-center py-20 text-zinc-500">
                                        <Search className="w-16 h-16 mx-auto mb-6 opacity-10" />
                                        <p className="font-medium">검색어를 입력해보세요</p>
                                    </div>
                                ) : (
                                    <div className="space-y-10">
                                        {/* No Results */}
                                        {activeTab === 'all' &&
                                            results.courses.length === 0 &&
                                            results.routines.length === 0 &&
                                            results.feeds.length === 0 &&
                                            results.sparring.length === 0 &&
                                            results.arena.length === 0 && (
                                                <div className="text-center py-20 text-zinc-500">
                                                    <p className="font-medium">검색 결과가 없습니다.</p>
                                                </div>
                                            )}

                                        {/* Courses Section */}
                                        {(activeTab === 'all' || activeTab === 'courses') && results.courses.length > 0 && (
                                            <section>
                                                {activeTab === 'all' && (
                                                    <div className="flex items-center justify-between mb-4 px-1">
                                                        <h3 className="text-lg font-black flex items-center gap-2 text-white">
                                                            <BookOpen className="w-5 h-5 text-violet-400" /> 클래스
                                                        </h3>
                                                        {results.courses.length > 3 && (
                                                            <button onClick={() => setActiveTab('courses')} className="text-xs text-zinc-400 flex items-center hover:text-white font-bold transition-colors">
                                                                더보기 <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {(activeTab === 'all' ? results.courses.slice(0, 3) : results.courses).map(course => (
                                                        <div key={course.id} onClick={() => handleItemClick(`/courses/${course.id}`)} className="flex gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50 cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
                                                            <div className="w-28 aspect-video bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative shadow-lg">
                                                                <img src={course.thumbnailUrl} alt={course.title} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                                                <h4 className="font-bold text-white line-clamp-1 text-sm group-hover:text-violet-400 transition-colors">{course.title}</h4>
                                                                <p className="text-xs text-zinc-500 mt-1.5 font-medium">{course.creatorName} · {course.difficulty}</p>
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
                                                    <div className="flex items-center justify-between mb-4 px-1">
                                                        <h3 className="text-lg font-black flex items-center gap-2 text-white">
                                                            <Activity className="w-5 h-5 text-emerald-400" /> 루틴
                                                        </h3>
                                                        {results.routines.length > 3 && (
                                                            <button onClick={() => setActiveTab('routines')} className="text-xs text-zinc-400 flex items-center hover:text-white font-bold transition-colors">
                                                                더보기 <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {(activeTab === 'all' ? results.routines.slice(0, 3) : results.routines).map(routine => (
                                                        <div key={routine.id} onClick={() => handleItemClick(`/routines/${routine.id}`)} className="flex gap-4 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800/50 cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
                                                            <div className="w-16 aspect-square bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 relative shadow-lg">
                                                                <img src={routine.thumbnailUrl} alt={routine.title} loading="lazy" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                            </div>
                                                            <div className="flex-1 min-w-0 flex flex-col justify-center py-1">
                                                                <h4 className="font-bold text-white line-clamp-1 text-sm group-hover:text-emerald-400 transition-colors">{routine.title}</h4>
                                                                <div className="flex gap-2 mt-2">
                                                                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-400 font-bold border border-zinc-700/50">{routine.difficulty}</span>
                                                                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-400 font-bold border border-zinc-700/50">{(routine.views || 0).toLocaleString()} 조회수</span>
                                                                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 rounded-md text-zinc-400 font-bold border border-zinc-700/50">{routine.creatorName}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Sparring Section */}
                                        {(activeTab === 'all' || activeTab === 'sparring') && results.sparring.length > 0 && (
                                            <section>
                                                {activeTab === 'all' && (
                                                    <div className="flex items-center justify-between mb-4 px-1">
                                                        <h3 className="text-lg font-black flex items-center gap-2 text-white">
                                                            <Swords className="w-5 h-5 text-red-400" /> 스파링
                                                        </h3>
                                                        {results.sparring.length > 3 && (
                                                            <button onClick={() => setActiveTab('sparring')} className="text-xs text-zinc-400 flex items-center hover:text-white font-bold transition-colors">
                                                                더보기 <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-3">
                                                    {(activeTab === 'all' ? results.sparring.slice(0, 4) : results.sparring).map(match => (
                                                        <div key={match.id} onClick={() => handleItemClick(`/sparring/${match.id}`)} className="bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800/50 relative aspect-video cursor-pointer group shadow-lg">
                                                            <img src={match.thumbnailUrl} alt={match.title} loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <PlayCircle className="w-8 h-8 text-white/90" />
                                                            </div>
                                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-3">
                                                                <h4 className="font-bold text-white text-xs line-clamp-1">{match.title}</h4>
                                                                <p className="text-[10px] text-zinc-400 mt-0.5">{match.creator?.name || 'Unknown'}</p>
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
                                                    <div className="flex items-center justify-between mb-4 px-1">
                                                        <h3 className="text-lg font-black flex items-center gap-2 text-white">
                                                            <Users className="w-5 h-5 text-blue-400" /> 피드
                                                        </h3>
                                                        {results.feeds.length > 3 && (
                                                            <button onClick={() => setActiveTab('feed')} className="text-xs text-zinc-400 flex items-center hover:text-white font-bold transition-colors">
                                                                더보기 <ChevronRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {(activeTab === 'all' ? results.feeds.slice(0, 3) : results.feeds).map(feed => (
                                                        <div key={feed.id} onClick={() => handleItemClick(`/journal`)} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 cursor-pointer hover:border-zinc-700 hover:bg-zinc-800/50 transition-all">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                                                                    {feed.userAvatar ? (
                                                                        <img src={feed.userAvatar} alt={`${feed.userName || '사용자'} 프로필`} loading="lazy" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-500 bg-zinc-800">{(feed.userName || 'U')[0]}</div>
                                                                    )}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="text-xs text-zinc-200 font-bold">{feed.userName || 'Unknown User'}</span>
                                                                    <span className="text-[10px] text-zinc-500 font-medium">{new Date(feed.date).toLocaleDateString()}</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-sm text-zinc-300 line-clamp-2 leading-relaxed">{feed.notes || '내용 없음'}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                        )}

                                        {/* Arena Section - Placeholder */}
                                        {(activeTab === 'all' || activeTab === 'arena') && results.arena.length > 0 && (
                                            <section>
                                                {activeTab === 'all' && (
                                                    <div className="flex items-center justify-between mb-4 px-1">
                                                        <h3 className="text-lg font-black flex items-center gap-2 text-white">
                                                            <Trophy className="w-5 h-5 text-yellow-400" /> 아레나
                                                        </h3>
                                                    </div>
                                                )}
                                                <div className="space-y-3">
                                                    {/* Arena content will go here */}
                                                </div>
                                            </section>
                                        )}
                                        {activeTab === 'arena' && results.arena.length === 0 && (
                                            <div className="text-center py-10 text-zinc-500">
                                                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                <p>진행 중인 아레나가 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
