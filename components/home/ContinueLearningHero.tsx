import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ArrowRight, Video, Target, Dumbbell } from 'lucide-react';

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

interface ContinueLearningHeroProps {
    item: ActivityItem | null;
}

export const ContinueLearningHero: React.FC<ContinueLearningHeroProps> = ({ item }) => {
    const navigate = useNavigate();

    if (!item) return null;

    const handleContinue = () => {
        if (item.type === 'lesson') {
            navigate(`/courses/${item.courseId}?lessonId=${item.id}&t=${item.watchedSeconds || 0}`);
        } else if (item.type === 'course') {
            navigate(`/courses/${item.id}`);
        } else if (item.type === 'routine') {
            navigate(`/drill-routines/${item.id}`); // Correct route for routines
        } else if (item.type === 'sparring') {
            navigate('/sparring', { state: { highlightVideoId: item.id } });
        }
    };

    const getTypeIcon = () => {
        switch (item.type) {
            case 'routine': return <Dumbbell className="w-4 h-4" />;
            case 'sparring': return <Target className="w-4 h-4" />;
            default: return <Video className="w-4 h-4" />;
        }
    };

    const getTypeLabel = () => {
        switch (item.type) {
            case 'routine': return 'Drill Routine';
            case 'sparring': return 'Sparring Review';
            default: return 'Online Lesson';
        }
    };

    return (
        <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-16">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-1.5 h-8 bg-violet-500 rounded-full" />
                <h2 className="text-2xl font-black text-white">수련 이어가기</h2>
            </div>

            <div
                onClick={handleContinue}
                className="group relative w-full h-[300px] md:h-[400px] rounded-[32px] overflow-hidden cursor-pointer border border-zinc-800 hover:border-violet-500/50 transition-all duration-500 shadow-2xl"
            >
                {/* Background Image */}
                <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                    style={{ backgroundImage: `url(${item.thumbnail || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop'})` }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/80 via-transparent to-transparent" />

                {/* Content */}
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                    <div className="max-w-3xl">
                        {/* Type Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-xs font-bold uppercase tracking-wider mb-4">
                            {getTypeIcon()}
                            {getTypeLabel()}
                        </div>

                        <h3 className="text-3xl md:text-5xl font-black text-white mb-2 leading-tight drop-shadow-lg line-clamp-2">
                            {item.title}
                        </h3>

                        <div className="flex items-center gap-4 text-zinc-400 font-medium mb-8">
                            <span className="text-white/80">{item.courseTitle || 'Training Session'}</span>
                            {item.lessonNumber && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                    <span className="text-violet-400 font-bold">Lesson {item.lessonNumber}</span>
                                </>
                            )}
                            {item.progress > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                    <span>{item.progress}% Complete</span>
                                </>
                            )}
                        </div>

                        {/* Progress Bar */}
                        <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden max-w-md group-hover:h-2 transition-all">
                            <div
                                className="absolute top-0 left-0 h-full bg-violet-500 transition-all duration-1000 ease-out"
                                style={{ width: `${Math.max(item.progress || 0, 5)}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Play Button (Hover) */}
                <div className="absolute right-8 bottom-8 md:right-12 md:bottom-12 w-16 h-16 md:w-20 md:h-20 bg-violet-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-violet-900/40 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 scale-90 group-hover:scale-100">
                    <Play className="w-8 h-8 md:w-10 md:h-10 fill-current ml-1" />
                </div>
            </div>
        </section>
    );
};
