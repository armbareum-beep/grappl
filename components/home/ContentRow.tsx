import React, { useState, useEffect, Suspense, lazy } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bookmark, Share2, MoreHorizontal } from 'lucide-react';
import { ActionMenuModal } from '../library/ActionMenuModal';
import { cn } from '../../lib/utils';
import { useAuth as useAuthContext } from '../../contexts/AuthContext';
import {
    toggleCourseSave, checkCourseSaved,
    toggleRoutineSave, checkRoutineSaved,
    toggleSparringSave, checkSparringSaved,
    toggleLessonSave, checkLessonSaved
} from '../../lib/api';

const ShareModal = lazy(() => import('../social/ShareModal'));

interface ContentRowItemProps {
    item: any;
    type: 'course' | 'routine' | 'sparring' | 'lesson' | 'chain';
    variant: 'ranking' | 'standard';
    idx: number;
    cardClass: string;
    getThumbnail: (item: any) => string;
    getTitle: (item: any) => string;
    getSubtitle: (item: any) => string;
    handleClick: (item: any) => void;
}

const ContentRowItem: React.FC<ContentRowItemProps> = ({
    item, type, variant, idx, cardClass, getThumbnail, getTitle, getSubtitle, handleClick
}) => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    useEffect(() => {
        if (!user || !item.id) return;

        const checkSaved = async () => {
            try {
                let saved = false;
                if (type === 'course') saved = await checkCourseSaved(user.id, item.id);
                else if (type === 'routine') saved = await checkRoutineSaved(user.id, item.id);
                else if (type === 'sparring') saved = await checkSparringSaved(user.id, item.id);
                else if (type === 'lesson') saved = await checkLessonSaved(user.id, item.id);
                setIsSaved(saved);
            } catch (err) {
                console.error(err);
            }
        };
        checkSaved();
    }, [user?.id, item.id, type]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            if (type === 'course') await toggleCourseSave(user.id, item.id);
            else if (type === 'routine') await toggleRoutineSave(user.id, item.id);
            else if (type === 'sparring') await toggleSparringSave(user.id, item.id);
            else if (type === 'lesson') await toggleLessonSave(user.id, item.id);
            setIsSaved(!isSaved);
        } catch (err) {
            console.error(err);
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsShareModalOpen(true);
    };

    const getShareUrl = () => {
        const origin = window.location.origin;
        if (type === 'course') return `${origin}/courses/${item.courseId || item.id}`;
        if (type === 'routine') return `${origin}/routines/${item.id}`;
        if (type === 'sparring') return `${origin}/sparring/${item.id}`;
        if (type === 'lesson') return `${origin}/lessons/${item.id}`;
        return origin;
    };

    const profileImage = type === 'sparring'
        ? ((item.creator as any)?.avatar_url || (item.creator as any)?.profileImage || (item.creator as any)?.image)
        : item.creatorProfileImage;

    const categoryText = (type === 'course' || type === 'lesson' || type === 'sparring')
        ? item.category
        : (type === 'routine' ? item.difficulty : null);

    const renderButtons = () => (
        <>


            {/* Save — top-right */}
            {type !== 'chain' && (
                <button
                    className={cn(
                        "absolute top-2 right-2 z-30 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white",
                        isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                    )}
                    onClick={handleSave}
                    aria-label="저장"
                >
                    <Bookmark className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                </button>
            )}

            {/* Share — bottom-right */}
            <button
                className="absolute bottom-2.5 right-2 z-30 p-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900 hidden group-hover:block"
                onClick={handleShare}
                aria-label="공유"
            >
                <Share2 className="w-3.5 h-3.5" />
            </button>
        </>
    );

    return (
        <div
            onClick={() => handleClick(item)}
            className={cn(
                "group relative flex-shrink-0 cursor-pointer transition-transform duration-300 ease-out origin-center hover:scale-105 hover:z-20",
                "isolation-auto transform-gpu", // Fix for corner rounding clipping
                variant !== 'ranking' ? cardClass : ""
            )}
            style={{
                perspective: '1000px',
                transformStyle: 'preserve-3d',
                ...(variant === 'ranking' ? { width: (type === 'routine' || type === 'sparring') ? '230px' : '380px' } : {})
            }}
        >
            {variant === 'ranking' ? (
                <div className="relative w-full overflow-visible">
                    <div className="absolute left-[-10px] md:left-[-20px] bottom-0 z-10 text-[140px] md:text-[200px] font-[900] leading-none tracking-tighter text-white/5 select-none italic"
                        style={{
                            WebkitTextStroke: '6px rgba(255,255,255,0.95)',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            filter: 'drop-shadow(0 0 15px rgba(0,0,0,1)) drop-shadow(0 0 5px rgba(0,0,0,1))'
                        }}>
                        {idx + 1}
                    </div>

                    <div
                        className="relative z-20 rounded-lg overflow-hidden bg-zinc-900 shadow-2xl transition-transform duration-300 group-hover:scale-[1.03] transform-gpu"
                        style={{
                            marginLeft: (type === 'routine' || type === 'sparring') ? '55px' : '90px',
                            width: (type === 'routine' || type === 'sparring') ? '170px' : '300px',
                            aspectRatio: type === 'routine' ? '2/3' : type === 'sparring' ? '1/1' : '16/9'
                        }}
                    >
                        {type === 'routine' ? (
                            <img
                                src={getThumbnail(item)}
                                className="absolute inset-0 !w-full !h-full !max-w-none !max-h-none object-cover !scale-[1.21] transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                alt={getTitle(item)}
                            />
                        ) : (
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{ backgroundImage: `url(${getThumbnail(item)})` }}
                            />
                        )}
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-300" />
                        {renderButtons()}
                    </div>
                </div>
            ) : (
                <div className="w-full h-full rounded-lg overflow-hidden relative bg-zinc-900 group-hover:scale-[1.03] transition-transform duration-300 transform-gpu">
                    {type === 'routine' ? (
                        <img
                            src={getThumbnail(item)}
                            className="absolute inset-0 !w-full !h-full !max-w-none !max-h-none object-cover !scale-[1.21] transition-transform duration-500 opacity-90 group-hover:opacity-100"
                            alt={getTitle(item)}
                        />
                    ) : (
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${getThumbnail(item)})` }}
                        />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
                    {renderButtons()}
                </div>
            )}

            <div className="pt-3 px-1 flex flex-col gap-0 items-start relative" style={variant === 'ranking' ? { marginLeft: (type === 'routine' || type === 'sparring') ? '55px' : '90px' } : {}}>
                <div className="flex-1 min-w-0 relative pb-1 pr-1 w-full">
                    <div className="flex justify-between items-start gap-1">
                        <h3 className="flex-1 text-white text-[13px] md:text-[14px] font-bold truncate group-hover:text-violet-400 transition-colors uppercase tracking-tight leading-tight">{getTitle(item)}</h3>
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsActionMenuOpen(true);
                            }}
                            className="shrink-0 p-1 -mr-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                        >
                            <MoreHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                    <p className="text-zinc-500 text-[11px] truncate uppercase tracking-tighter font-medium leading-none -mt-1">{getSubtitle(item)}</p>
                    {categoryText && (
                        <div className="absolute bottom-0 right-0 text-[9px] font-black text-zinc-600 uppercase tracking-widest pb-0.5">
                            {categoryText}
                        </div>
                    )}
                </div>
            </div>

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                item={{
                    id: item.id,
                    type: type === 'course' ? 'class' : (type === 'sparring' ? 'sparring' : 'routine'),
                    title: getTitle(item),
                    thumbnailUrl: getThumbnail(item),
                    creatorName: item.creatorName || (item.creator as any)?.name || 'Grapplay Creator',
                    creatorProfileImage: profileImage,
                    originalData: item
                } as any}
                isSaved={isSaved}
                onSave={handleSave}
                onShare={handleShare}
            />

            <Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={getTitle(item)}
                        text={`${item.creatorName || getSubtitle(item) || 'Grapplay'}의 콘텐츠를 확인해보세요!`}
                        imageUrl={getThumbnail(item)}
                        url={getShareUrl()}
                    />
                )}
            </Suspense>
        </div>
    );
};

interface ContentRowProps {
    items: any[];
    type: 'course' | 'routine' | 'sparring' | 'lesson' | 'chain';
    title: string;
    subtitle?: string;
    variant?: 'ranking' | 'standard';
    basePath?: string;
}

export const ContentRow: React.FC<ContentRowProps> = ({
    items,
    type,
    title,
    subtitle,
    variant = 'standard',
    basePath
}) => {
    const navigate = useNavigate();

    if (!items || items.length === 0) return null;

    const displayItems = items.slice(0, 15);

    const handleClick = (item: any) => {
        if (type === 'course') navigate(`/courses/${item.courseId || item.id}`);
        else if (type === 'routine') navigate(`/routines/${item.id}`);
        else if (type === 'sparring') navigate(`/sparring/${item.id}`);
        else if (type === 'lesson') navigate(`/lessons/${item.id}`);
        else if (type === 'chain') navigate(`/skill-tree?id=${item.id}`);
    };

    const getThumbnail = (item: any) => {
        return item.thumbnailUrl || (item as any).thumbnail || '';
    };

    const getTitle = (item: any) => {
        return item.title || '';
    };

    const getSubtitle = (item: any) => {
        if (type === 'course') return item.creatorName;
        if (type === 'routine') return item.creatorName || (item.creator ? (item.creator as any).name : 'Grapplay Team');
        if (type === 'sparring') return (item.creator as any)?.name || item.creatorName || 'Sparring Video';
        return '';
    };

    const getCardStyle = () => {
        if (type === 'course' || type === 'lesson') return 'w-[280px] md:w-[320px] aspect-video mr-0';
        if (type === 'routine') return 'w-[160px] md:w-[170px] aspect-[2/3] mr-0';
        if (type === 'sparring' || type === 'chain') return 'w-[158px] md:w-[180px] aspect-square mr-0';
        return 'w-[260px] md:w-[320px] aspect-video';
    };

    const cardClass = getCardStyle();

    const [emblaRef] = useEmblaCarousel({
        align: 'start',
        containScroll: 'trimSnaps',
        dragFree: true,
        watchDrag: true
    });

    return (
        <section className="w-full mb-6 relative z-10">
            <div className="px-4 md:px-12 mb-2 flex items-end justify-between group/header cursor-pointer" onClick={() => basePath && navigate(basePath)}>
                <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 group-hover/header:text-violet-200 transition-colors">
                        {title}
                        <span className="text-zinc-600 text-sm font-bold opacity-0 -translate-x-2 group-hover/header:opacity-100 group-hover/header:translate-x-0 transition-all duration-300 flex items-center">
                            모두 보기 <ChevronRight className="w-4 h-4" />
                        </span>
                    </h2>
                    {subtitle && <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>}
                </div>
            </div>

            <div className="relative w-full group/row overflow-hidden" ref={emblaRef}>
                <div className="flex gap-4 px-4 md:px-12 pt-4 pb-6">
                    {displayItems.map((item, idx) => (
                        <div key={item.id} className="flex-[0_0_auto]">
                            <ContentRowItem
                                item={item}
                                type={type}
                                variant={variant}
                                idx={idx}
                                cardClass={cardClass}
                                getThumbnail={getThumbnail}
                                getTitle={getTitle}
                                getSubtitle={getSubtitle}
                                handleClick={handleClick}
                            />
                        </div>
                    ))}
                    <div className="w-12 flex-shrink-0" />
                </div>
            </div>
        </section>
    );
};

