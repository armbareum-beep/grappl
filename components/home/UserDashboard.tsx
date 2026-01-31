import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// --- Types ---

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

interface UserDashboardProps {
    continueItems: ActivityItem[];
}

// --- Internal Row Helper ---
interface SectionRowProps {
    title: string;
    isEmpty: boolean;
    emptyText: string;
    onViewAll?: () => void;
    children: React.ReactNode;
}

const SectionRow: React.FC<SectionRowProps> = ({ title, isEmpty, emptyText, onViewAll, children }) => {
    if (isEmpty) return (
        <div className="w-full mb-10 px-4 md:px-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
            <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <p className="text-zinc-500 font-bold text-sm">{emptyText}</p>
            </div>
        </div>
    );
    return (
        <div className="w-full mb-10">
            <div className="px-4 md:px-12 mb-4 flex items-end justify-between group/header cursor-pointer" onClick={() => onViewAll && onViewAll()}>
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 group-hover/header:text-violet-200 transition-colors">
                    {title}
                    <span className="text-zinc-600 text-sm font-bold opacity-0 -translate-x-2 group-hover/header:opacity-100 group-hover/header:translate-x-0 transition-all duration-300 flex items-center">
                        전체보기 <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                </h2>
            </div>
            <div className="relative w-full">
                <div className="flex items-stretch gap-4 overflow-x-auto no-scrollbar px-4 md:px-12 pt-4 pb-10 scroll-smooth">
                    {children}
                    <div className="w-12 flex-shrink-0" /> {/* End padding */}
                </div>
            </div>
        </div>
    );
};

export const UserDashboard: React.FC<UserDashboardProps> = ({ continueItems }) => {
    const navigate = useNavigate();

    const handleContinue = (item: ActivityItem) => {
        if (!item.id || item.id === 'undefined') return;
        if (item.type === 'lesson') {
            if (!item.courseId) return;
            navigate(`/courses/${item.courseId}?lessonId=${item.id}&t=${item.watchedSeconds || 0}`);
        } else if (item.type === 'course') navigate(`/courses/${item.id}`);
        else if (item.type === 'routine') navigate(`/routines/${item.id}`);
        else if (item.type === 'sparring') navigate(`/sparring/${item.id}`);
        else if (item.type === 'drill') navigate(`/drills/${item.id}`);
    };

    return (
        <section className="w-full mx-auto mt-4 mb-12">
            {/* Continue Watching (16:9) */}
            <SectionRow
                title="이어보기"
                isEmpty={continueItems.length === 0}
                emptyText="시작한 수업이 없습니다."
                onViewAll={() => navigate('/history')}
            >
                {continueItems.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => handleContinue(item)}
                        className="group flex flex-col gap-3 w-[280px] md:w-[320px] flex-shrink-0 cursor-pointer"
                    >
                        <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#121215] transition-all duration-300 group-hover:scale-[1.03]">
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-90 transition-opacity"
                                style={{ backgroundImage: `url(${item.thumbnail || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop'})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                        </div>

                        <div className="flex flex-col gap-1.5 px-0.5">
                            <div className="flex flex-col">
                                <h3 className="text-[14px] md:text-[15px] font-bold text-white truncate group-hover:text-violet-400 transition-colors uppercase tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="text-zinc-500 text-[11px] font-medium truncate opacity-80 uppercase tracking-tighter">
                                    {item.courseTitle}
                                </p>
                            </div>
                            <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden">
                                <div className="h-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.3)]" style={{ width: `${Math.max(item.progress, 5)}%` }} />
                            </div>
                        </div>
                    </div>
                ))}
            </SectionRow>
        </section>
    );
};
