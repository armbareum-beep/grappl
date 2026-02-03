import React, { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, MoreHorizontal } from 'lucide-react';
import { ActionMenuModal } from '../library/ActionMenuModal';
import { useAuth } from '../../contexts/AuthContext';
import {
    toggleCourseSave, checkCourseSaved,
    toggleRoutineSave, checkRoutineSaved,
    toggleSparringSave, checkSparringSaved
} from '../../lib/api';

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
    const [emblaRef] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
        watchDrag: true
    });

    if (isEmpty) return (
        <div className="w-full mb-10 px-4 md:px-12">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
            <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <p className="text-zinc-500 font-bold text-sm">{emptyText}</p>
            </div>
        </div>
    );
    return (
        <div className="w-full mb-6 relative z-10">
            <div className="px-4 md:px-12 mb-2 flex items-end justify-between group/header cursor-pointer" onClick={() => onViewAll && onViewAll()}>
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 group-hover/header:text-violet-200 transition-colors">
                    {title}
                    <span className="text-zinc-600 text-sm font-bold opacity-0 -translate-x-2 group-hover/header:opacity-100 group-hover/header:translate-x-0 transition-all duration-300 flex items-center">
                        전체보기 <ChevronRight className="w-4 h-4 ml-1" />
                    </span>
                </h2>
            </div>
            <div className="relative w-full overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4 px-4 md:px-12 pt-0 pb-6">
                    {React.Children.map(children, (child) => (
                        <div className="flex-[0_0_auto]">
                            {child}
                        </div>
                    ))}
                    <div className="w-12 flex-shrink-0" />
                </div>
            </div>
        </div>
    );
};

export const UserDashboard: React.FC<UserDashboardProps> = ({ continueItems }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

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
                {continueItems.map((item) => <DashboardItem key={item.id} item={item} onContinue={handleContinue} user={user} />)}
            </SectionRow>
        </section>
    );
};

const DashboardItem = ({ item, onContinue, user }: { item: ActivityItem, onContinue: (item: ActivityItem) => void, user: any }) => {
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        if (!user || !item.id) return;
        const checkSaved = async () => {
            try {
                let saved = false;
                const targetId = (item.type === 'lesson' ? item.courseId : item.id) || item.id;
                if (item.type === 'course' || item.type === 'lesson') saved = await checkCourseSaved(user.id, targetId);
                else if (item.type === 'routine') saved = await checkRoutineSaved(user.id, targetId);
                else if (item.type === 'sparring') saved = await checkSparringSaved(user.id, targetId);
                setIsSaved(saved);
            } catch (err) { console.error(err); }
        };
        checkSaved();
    }, [user, item.id]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (!user) return;
        try {
            const targetId = (item.type === 'lesson' ? item.courseId : item.id) || item.id;
            if (item.type === 'course' || item.type === 'lesson') await toggleCourseSave(user.id, targetId);
            else if (item.type === 'routine') await toggleRoutineSave(user.id, targetId);
            else if (item.type === 'sparring') await toggleSparringSave(user.id, targetId);
            setIsSaved(!isSaved);
        } catch (err) { console.error(err); }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (navigator.share) {
            navigator.share({
                title: item.title,
                url: window.location.origin + (item.type === 'course' ? `/courses/${item.id}` : `/routines/${item.id}`)
            }).catch(console.error);
        }
    };

    const categoryText = (item.type === 'course' || item.type === 'lesson' || item.type === 'sparring')
        ? (item as any).category
        : (item.type === 'routine' ? (item as any).difficulty : null);

    return (
        <div
            onClick={() => onContinue(item)}
            className="group flex flex-col gap-1.5 w-[280px] md:w-[320px] flex-shrink-0 cursor-pointer isolation-auto transform-gpu"
            style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
        >
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-[#121215] transition-all duration-300 group-hover:scale-[1.03] transform-gpu">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-70 group-hover:opacity-90 transition-opacity"
                    style={{ backgroundImage: `url(${item.thumbnail || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000&auto=format&fit=crop'})` }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>

            <div className="flex flex-col gap-0 px-0.5">
                <div className="flex gap-0 items-start relative">
                    <div className="flex-1 min-w-0 relative pb-1 pr-1">
                        <div className="flex justify-between items-start gap-2">
                            <h3 className="flex-1 text-[13px] md:text-[14px] font-bold text-white truncate group-hover:text-violet-400 transition-colors uppercase tracking-tight leading-tight">
                                {item.title}
                            </h3>
                            <button
                                onClick={(e) => {
                                    e.preventDefault(); e.stopPropagation();
                                    setIsActionMenuOpen(true);
                                }}
                                className="shrink-0 p-1 -mr-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-zinc-500 text-[11px] font-medium truncate opacity-80 uppercase tracking-tighter leading-none -mt-1">
                            {item.creatorName || 'Grapplay'}
                        </p>
                        <div className="absolute bottom-0 right-0 flex items-center gap-1.5 text-[9px] font-black text-zinc-600 uppercase tracking-widest pb-0.5">
                            {categoryText && <span>{categoryText}</span>}
                            {categoryText && item.courseTitle && <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />}
                            {item.courseTitle && <span className="">{item.courseTitle}</span>}
                        </div>
                    </div>
                </div>
                <div className="w-full h-1 bg-zinc-800/80 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.3)]" style={{ width: `${Math.max(item.progress, 5)}%` }} />
                </div>
            </div>

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                item={{
                    id: item.id,
                    type: item.type === 'course' || item.type === 'lesson' ? 'class' : (item.type === 'sparring' ? 'sparring' : 'routine'),
                    title: item.title,
                    thumbnailUrl: item.thumbnail || '',
                    creatorName: item.creatorName || 'Grapplay Creator',
                    creatorProfileImage: item.creatorProfileImage,
                    originalData: item
                } as any}
                isSaved={isSaved}
                onSave={handleSave}
                onShare={handleShare}
            />
        </div>
    );
};
