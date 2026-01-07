import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Dumbbell, Target, Video, ChevronLeft, ChevronRight, History } from 'lucide-react';

interface ActivityItem {
    id: string;
    courseId?: string;
    type: 'lesson' | 'course' | 'routine' | 'sparring';
    title: string;
    courseTitle?: string;
    thumbnail?: string;
    progress: number;
    watchedSeconds?: number;
    lastWatched: string;
    lessonNumber?: number;
}

interface ContinueLearningSectionProps {
    items: ActivityItem[];
}

export const ContinueLearningSection: React.FC<ContinueLearningSectionProps> = ({ items }) => {
    const navigate = useNavigate();
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -400 : 400;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    const handleContinue = (item: ActivityItem) => {
        if (item.type === 'lesson') {
            navigate(`/courses/${item.courseId}?lessonId=${item.id}&t=${item.watchedSeconds || 0}`);
        } else if (item.type === 'course') {
            navigate(`/courses/${item.id}`);
        } else if (item.type === 'routine') {
            navigate(`/drill-routines/${item.id}`);
        } else if (item.type === 'sparring') {
            navigate('/sparring', { state: { highlightVideoId: item.id } });
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'routine': return <Dumbbell className="w-3 h-3" />;
            case 'sparring': return <Target className="w-3 h-3" />;
            default: return <Video className="w-3 h-3" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'routine': return 'Drill Routine';
            case 'sparring': return 'Sparring';
            default: return 'Lesson';
        }
    };

    return (
        <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20 relative group/section">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                        <History className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white leading-none mb-1">Continue Learning</h2>
                        <p className="text-sm text-zinc-500 font-medium">멈추지 말고 수련을 이어가세요.</p>
                    </div>
                </div>

                {/* Navigation Buttons (Visible on Hover/Desktop) */}
                {items && items.length > 0 && (
                    <div className="hidden md:flex items-center gap-2 opacity-0 group-hover/section:opacity-100 transition-opacity">
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 hover:text-white transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {(!items || items.length === 0) ? (
                <div className="w-full h-40 flex items-center justify-center rounded-[24px] border border-zinc-800 border-dashed bg-zinc-900/30 text-zinc-500 font-medium">
                    아직 시청한 기록이 없습니다. 오늘의 수련을 시작해보세요! 🥋
                </div>
            ) : (
                <div
                    ref={scrollRef}
                    className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {items.map((item, idx) => (
                        <div
                            key={`${item.type}-${item.id}-${idx}`}
                            onClick={() => handleContinue(item)}
                            className="snap-start flex-shrink-0 w-[300px] md:w-[400px] group cursor-pointer"
                        >
                            <div className="relative aspect-video rounded-[24px] overflow-hidden border border-zinc-800 group-hover:border-violet-500/50 transition-all duration-300 shadow-lg bg-zinc-900">
                                {/* Thumbnail */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                                    style={{ backgroundImage: `url(${item.thumbnail || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop'})` }}
                                />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />

                                {/* Play Icon Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
                                    <div className="w-14 h-14 rounded-full bg-violet-600/90 backdrop-blur-sm flex items-center justify-center shadow-xl">
                                        <Play className="w-6 h-6 fill-white text-white ml-1" />
                                    </div>
                                </div>

                                {/* Progress Bar (Bottom) */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-zinc-800">
                                    <div
                                        className="h-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                                        style={{ width: `${Math.max(item.progress || 0, 0)}%` }}
                                    />
                                </div>

                                {/* Type Badge */}
                                <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md text-[10px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 border border-white/10">
                                    {getTypeIcon(item.type)}
                                    {getTypeLabel(item.type)}
                                </div>
                            </div>

                            {/* Meta Info */}
                            <div className="mt-4 px-1">
                                <h3 className="text-lg font-bold text-white line-clamp-1 group-hover:text-violet-400 transition-colors">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 font-medium">
                                    <span>{item.courseTitle || 'Training'}</span>
                                    {item.lessonNumber && (
                                        <>
                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                            <span>Ep. {item.lessonNumber}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
