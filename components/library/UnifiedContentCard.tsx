import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, PlaySquare, Bookmark, Share2, MoreHorizontal } from 'lucide-react';
import { ActionMenuModal } from './ActionMenuModal';
import { cn } from '../../lib/utils';
import { ContentBadge } from '../common/ContentBadge';
import { Course, DrillRoutine, SparringVideo } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import {
    toggleCourseSave, checkCourseSaved,
    toggleRoutineSave, checkRoutineSaved,
    toggleSparringSave, checkSparringSaved
} from '../../lib/api';

const ShareModal = React.lazy(() => import('../social/ShareModal'));

export type ContentType = 'class' | 'routine' | 'sparring';

export type CardVariant = 'wide' | 'tall' | 'square' | 'large';

export interface UnifiedContentItem {
    id: string;
    type: ContentType;
    title: string;
    thumbnailUrl: string;
    creatorName?: string;
    creatorProfileImage?: string;
    creatorId?: string;
    createdAt?: string;
    views?: number;
    rank?: number;
    isDailyFree?: boolean;
    drillCount?: number;
    originalData: Course | DrillRoutine | SparringVideo;
    variant?: CardVariant;
}

interface UnifiedContentCardProps {
    item: UnifiedContentItem;
    onSparringClick?: (item: UnifiedContentItem) => void;
    className?: string;
    minimal?: boolean;
    isMasonry?: boolean;
}

// Spans are now calculated dynamically via Ref and ResizeObserver to avoid gaps
const getColSpanClass = (item: UnifiedContentItem): string => {
    if (item.type === 'class' || (item.type === 'sparring' && item.variant === 'large')) {
        return 'col-span-1 md:col-span-2';
    }
    return 'col-span-1';
};

const getItemLink = (item: UnifiedContentItem): string => {
    switch (item.type) {
        case 'class':
            return `/courses/${item.id}`;
        case 'routine':
            return `/routines/${item.id}`;
        case 'sparring':
            return `/sparring?id=${item.id}`;
        default:
            return '#';
    }
};

const isRecent = (createdAt?: string): boolean => {
    if (!createdAt) return false;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    return new Date(createdAt).getTime() > thirtyDaysAgo;
};

export const UnifiedContentCard: React.FC<UnifiedContentCardProps> = ({ item, onSparringClick, className, minimal = false, isMasonry = false }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const link = getItemLink(item);
    const PlayIcon = item.type === 'sparring' ? PlaySquare : PlayCircle;

    const cardRef = React.useRef<HTMLDivElement>(null);
    const [span, setSpan] = useState(0);

    const updateSpan = React.useCallback(() => {
        if (cardRef.current) {
            const height = cardRef.current.getBoundingClientRect().height;
            if (height > 0) {
                // Add 12px vertical gap between cards (row-gap is 0, spacing is included in span)
                setSpan(Math.ceil(height + 12));
            }
        }
    }, []);

    useEffect(() => {
        const observer = new ResizeObserver(updateSpan);
        if (cardRef.current) observer.observe(cardRef.current);

        // Initial call
        updateSpan();

        // Also check periodically for a few frames in case of layout shifts
        const timers = [100, 300, 600].map(ms => setTimeout(updateSpan, ms));

        return () => {
            observer.disconnect();
            timers.forEach(clearTimeout);
        };
    }, [item, updateSpan]);

    const colSpanClass = getColSpanClass(item);
    // Use a reasonable default (300px-ish) to avoid zero-height clumping
    const spanStyle = (span && (minimal || isMasonry)) ? { gridRowEnd: `span ${span}` } : {};

    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        const checkStatus = async () => {
            try {
                let saved = false;
                if (item.type === 'class') {
                    saved = await checkCourseSaved(user.id, item.id);
                } else if (item.type === 'routine') {
                    saved = await checkRoutineSaved(user.id, item.id);
                } else if (item.type === 'sparring') {
                    saved = await checkSparringSaved(user.id, item.id);
                }
                setIsSaved(saved);
            } catch (e) {
                console.error("Failed to check save status", e);
            }
        };
        checkStatus();
    }, [user, item.id, item.type]);

    const handleClick = (e: React.MouseEvent) => {
        if (item.type === 'sparring' && onSparringClick) {
            e.preventDefault();
            onSparringClick(item);
        }
    };

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!user) {
            navigate('/login');
            return;
        }

        // Optimistic update
        const newStatus = !isSaved;
        setIsSaved(newStatus);

        try {
            if (item.type === 'class') {
                await toggleCourseSave(user.id, item.id);
            } else if (item.type === 'routine') {
                await toggleRoutineSave(user.id, item.id);
            } else if (item.type === 'sparring') {
                await toggleSparringSave(user.id, item.id);
            }
        } catch (error) {
            console.error("Failed to toggle save", error);
            setIsSaved(!newStatus); // Revert
        }
    };

    const handleShare = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsShareModalOpen(true);
    };

    return (
        <div
            ref={cardRef}
            className={cn("group cursor-pointer flex flex-col h-fit", colSpanClass, className)}
            style={spanStyle}
        >
            {/* Image area — fills remaining space via flex-1 */}
            <div
                className={cn(
                    "relative group z-10",
                    item.type === 'class' ? (minimal ? "aspect-[4/3]" : "aspect-video") :
                        item.type === 'routine' ? "aspect-[9/16]" :
                            "aspect-square",
                    "bg-zinc-900 rounded-2xl md:rounded-[2rem] overflow-hidden transition-all duration-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:ring-1 hover:ring-violet-500/30"
                )}>
                <Link
                    to={link}
                    onClick={handleClick}
                    className="absolute inset-0 block"
                >
                    {item.thumbnailUrl && !item.thumbnailUrl.includes('removed') ? (
                        <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            onLoad={updateSpan}
                            onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling?.classList.remove('hidden');
                            }}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 opacity-90 group-hover:opacity-100 group-hover:scale-105"
                        />
                    ) : null}
                    {/* Fallback pattern for missing/error images */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center",
                        item.thumbnailUrl && !item.thumbnailUrl.includes('removed') && "hidden"
                    )}>
                        <div className="text-zinc-700 font-bold text-4xl opacity-20 select-none">
                            {item.title.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    {/* Badge — top-left, single: FREE > HOT > NEW priority */}
                    <div className="absolute top-2.5 left-2.5 pointer-events-none z-10">
                        {item.isDailyFree ? (
                            <ContentBadge type="daily_free" />
                        ) : item.rank ? (
                            <ContentBadge type="popular" rank={item.rank} />
                        ) : isRecent(item.createdAt) ? (
                            <ContentBadge type="recent" />
                        ) : null}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />

                    {/* Save — top-right, visible on hover */}
                    <button
                        className={cn(
                            "absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white",
                            isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                        )}
                        onClick={handleSave}
                        aria-label="저장"
                    >
                        <Bookmark className={cn("w-4 h-4", isSaved && "fill-violet-500")} />
                    </button>

                    {/* Share — bottom-right, visible on hover */}
                    <button
                        className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900"
                        onClick={handleShare}
                        aria-label="공유"
                    >
                        <Share2 className="w-4 h-4" />
                    </button>

                </Link>
            </div>

            {/* Pinterest Style: Three dots button below the image for minimal cards */}
            {minimal && (
                <div className="flex justify-end pt-1 px-1">
                    <button
                        className="p-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsActionMenuOpen(true);
                        }}
                        aria-label="더보기"
                    >
                        <MoreHorizontal className="w-5 h-5" />
                    </button>
                </div>
            )}

            <ActionMenuModal
                isOpen={isActionMenuOpen}
                onClose={() => setIsActionMenuOpen(false)}
                item={item}
                isSaved={isSaved}
                onSave={handleSave}
                onShare={handleShare}
            />

            <React.Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={item.title}
                        text={`${item.creatorName || 'Grapplay'}님의 콘텐츠를 확인해보세요!`}
                        imageUrl={item.thumbnailUrl}
                        url={`${window.location.origin}${link}`}
                    />
                )}
            </React.Suspense>

            {/* Info Area — shrink-0 keeps it at natural height */}
            {!minimal && (
                <div className="flex gap-3 px-1 mt-2 shrink-0">
                    {/* Creator Avatar */}

                    {/* Text Info */}
                    <div className="flex-1 min-w-0 pr-1">
                        <div className="flex justify-between items-start gap-2">
                            <Link to={link} onClick={handleClick} className="flex-1 min-w-0">
                                <h3 className="text-zinc-100 font-bold text-[13px] md:text-[14px] leading-tight mb-0 group-hover:text-violet-400 transition-colors uppercase tracking-tight">
                                    {item.title}
                                </h3>
                            </Link>
                            <button
                                className="shrink-0 p-1 -mr-1 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors opacity-100"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setIsActionMenuOpen(true);
                                }}
                                aria-label="더보기"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between gap-4 mt-0">
                            <div className="text-[11px] md:text-[12px] text-zinc-500 font-medium uppercase tracking-tighter">
                                {item.creatorName}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                                <PlayIcon className="w-3 h-3" />
                                <span>
                                    {(item.views || 0).toLocaleString()} 조회수
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
