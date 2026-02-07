import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getLessonHistory } from '../lib/api';
import { LoadingScreen } from '../components/LoadingScreen';
import { ArrowLeft, Search, MoreVertical, X } from 'lucide-react';

interface HistoryItem {
    id: string;
    courseId: string;
    type: 'lesson';
    title: string;
    courseTitle: string;
    creatorName: string;
    creatorProfileImage: string;
    progress: number;
    watchedSeconds: number;
    thumbnail: string;
    lastWatched: string;
    lessonNumber: number;
    durationMinutes?: number;
}

export const History: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<HistoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                const history = await getLessonHistory(user.id);
                setItems(history as unknown as HistoryItem[]);
            } catch (error) {
                console.error('Error fetching history:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    if (loading) return <LoadingScreen message="시청 기록을 불러오는 중..." />;

    // Grouping Logic
    const groupedItems = items.reduce((acc, item) => {
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.courseTitle.toLowerCase().includes(searchQuery.toLowerCase())) {
            return acc;
        }

        const date = new Date(item.lastWatched);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let key = '';
        if (date.toDateString() === today.toDateString()) {
            key = '오늘';
        } else if (date.toDateString() === yesterday.toDateString()) {
            key = '어제';
        } else {
            key = `${date.getMonth() + 1}월 ${date.getDate()}일`;
        }

        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {} as Record<string, HistoryItem[]>);

    return (
        <div className="min-h-screen bg-[#09090b] text-white pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[#09090b]/90 backdrop-blur-md border-b border-white/5">
                <div className="flex items-center gap-4 px-4 h-16 max-w-2xl mx-auto md:px-0">
                    <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </button>

                    {isSearchActive ? (
                        <div className="flex-1 flex items-center bg-zinc-800 rounded-full px-4 h-10 animate-fadeIn">
                            <input
                                autoFocus
                                type="text"
                                placeholder="시청 기록 검색"
                                aria-label="시청 기록 검색"
                                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-zinc-500"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery('')} className="p-1">
                                    <X className="w-4 h-4 text-zinc-400" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <h1 className="text-lg font-bold flex-1">기록</h1>
                    )}

                    {!isSearchActive ? (
                        <button onClick={() => setIsSearchActive(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                            <Search className="w-6 h-6" />
                        </button>
                    ) : (
                        <button onClick={() => { setIsSearchActive(false); setSearchQuery(''); }} className="text-sm font-bold text-zinc-400 p-2">
                            취소
                        </button>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="max-w-2xl mx-auto px-0 md:px-4 py-4">
                {Object.keys(groupedItems).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <p>시청 기록이 없습니다.</p>
                    </div>
                ) : (
                    Object.entries(groupedItems).map(([date, groupItems]) => (
                        <div key={date} className="mb-8">
                            <h2 className="text-lg font-bold mb-4 px-4 md:px-0">{date}</h2>
                            <div className="space-y-4">
                                {groupItems.map((item) => (
                                    <div
                                        key={`${item.id}-${item.lastWatched}`}
                                        onClick={() => navigate(`/courses/${item.courseId}?lessonId=${item.id}&t=${item.watchedSeconds || 0}`)}
                                        className="flex gap-3 px-4 md:px-0 cursor-pointer group hover:bg-white/5 p-2 rounded-xl transition-colors"
                                    >
                                        {/* Thumbnail */}
                                        <div className="relative w-[160px] aspect-video flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden border border-white/5">
                                            {item.thumbnail ? (
                                                <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-zinc-600">No Image</div>
                                            )}
                                            {/* Duration Badge (Optional) */}
                                            {item.durationMinutes && (
                                                <div className="absolute bottom-1 right-1 bg-black/80 px-1 py-0.5 rounded text-[10px] font-bold text-white">
                                                    {item.durationMinutes}:00
                                                </div>
                                            )}
                                            {/* Progress Bar (Red like YouTube) */}
                                            <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-700/50">
                                                <div
                                                    className="h-full bg-red-600"
                                                    style={{ width: `${item.progress}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-sm md:text-base font-bold text-zinc-100 line-clamp-2 leading-tight mb-1">
                                                    {item.lessonNumber}. {item.title}
                                                </h3>
                                                <p className="text-xs text-zinc-400 line-clamp-1">
                                                    {item.creatorName} • {item.courseTitle}
                                                </p>
                                            </div>
                                            <button className="self-end p-2 -mr-2 text-zinc-500 hover:text-white md:opacity-0 md:group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); /* Menu logic */ }}>
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
