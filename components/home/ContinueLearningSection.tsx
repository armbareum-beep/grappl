import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, ChevronRight, Play } from 'lucide-react';

interface ActivityItem {
    id: string;
    creatorId?: string;
    courseId?: string;
    type: 'lesson' | 'course' | 'routine' | 'sparring' | 'drill';
    title: string;
    courseTitle?: string;
    thumbnail?: string;
    progress: number;
    creatorProfileImage?: string;
    creatorName?: string;
    watchedSeconds?: number;
    lastWatched: string;
    lessonNumber?: number;
    durationMinutes?: number;
}

interface ContinueLearningSectionProps {
    items: ActivityItem[];
    title?: string;
    subtitle?: string;
    hideHeader?: boolean;
}

export const ContinueLearningSection: React.FC<ContinueLearningSectionProps> = ({
    items,
    title = "계속 수련하기",
    subtitle = "지난번 수련을 이어서 진행해보세요.",
    hideHeader = false
}) => {
    const navigate = useNavigate();

    const handleContinue = (item: ActivityItem) => {
        if (!item.id || item.id === 'undefined') {
            console.warn('[ContinueLearningSection] Invalid item ID', item);
            return;
        }

        if (item.type === 'lesson') {
            if (!item.courseId) {
                console.warn('[ContinueLearningSection] Missing courseId for lesson', item);
                return;
            }
            navigate(`/courses/${item.courseId}?lessonId=${item.id}&t=${item.watchedSeconds || 0}`);
        } else if (item.type === 'course') {
            navigate(`/courses/${item.id}`);
        } else if (item.type === 'routine') {
            navigate(`/routines/${item.id}`);
        } else if (item.type === 'sparring') {
            navigate(`/sparring/${item.id}`);
        } else if (item.type === 'drill') {
            navigate(`/drills/${item.id}`);
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
                        <h2 className="text-2xl font-black text-white leading-none mb-1">계속 수련하기</h2>
                        <p className="text-sm text-zinc-500 font-medium">멈추지 말고 수련을 이어가세요.</p>
                    </div>
                </div>

                {/* Navigation Buttons (Visible on Hover/Desktop) */}
                {/* Navigation Buttons (Visible on Hover/Desktop) */}
                {items && items.length > 0 && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/history')}
                            className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 px-4 py-2 rounded-full border border-violet-500/20 flex items-center"
                        >
                            더 보기
                            <ChevronRight className="w-4 h-4 ml-1" />
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

                            </div>

                            {/* Meta Info */}
                            <div className="mt-3 flex gap-2.5 px-1">
                                {/* Creator Avatar (Left side) */}
                                {/* Creator Avatar (Left side) */}
                                <div
                                    className="shrink-0 pt-0.5 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (item.creatorId) {
                                            navigate(`/creator/${item.creatorId}`);
                                        }
                                    }}
                                >
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden group-hover:border-violet-500/50 transition-colors">
                                        {item.creatorProfileImage ? (
                                            <img
                                                src={item.creatorProfileImage}
                                                alt={item.creatorName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                                {item.creatorName?.[0]}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Text Content (Right side) */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-zinc-100 text-sm md:text-base font-bold line-clamp-2 leading-snug mb-1 group-hover:text-violet-400 transition-colors">
                                        {item.title}
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <p className="text-zinc-500 text-xs font-medium truncate max-w-[60%]">
                                            {item.creatorName}
                                        </p>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 line-clamp-1 max-w-[40%] text-right overflow-hidden text-ellipsis whitespace-nowrap">
                                            {item.courseTitle || '클래스'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
};
