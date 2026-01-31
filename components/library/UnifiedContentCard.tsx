import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlayCircle, PlaySquare, Bookmark, Share2 } from 'lucide-react';
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
}

const getSpanClass = (type: ContentType, variant?: CardVariant): string => {
    // Class: ~16:9 Aspect Ratio Image + Text
    // Small: 1 col x 3 row (Total ~190px -> Image ~110px which is 16:9 of 180px)
    // Large: 2 col x 5 row (Total ~310px -> Image ~230px which is 16:9 of 360px)
    if (type === 'class') {
        if (variant === 'wide' || variant === 'large') {
            return 'col-span-2 row-span-5';
        }
        return 'col-span-1 row-span-3';
    }

    // Routine: 9:16 Ratio (Standard Vertical)
    // 1 col x 5 row (Total ~350px -> Image ~300px which is good for 9:16 of 180px)
    if (type === 'routine') {
        return 'col-span-1 row-span-5';
    }

    // For sparring, always square (1:1) -> distinct sizes
    if (type === 'sparring') {
        if (variant === 'large') {
            return 'col-span-2 row-span-8';
        }
        return 'col-span-1 row-span-4';
    }

    return 'row-span-4';
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

export const UnifiedContentCard: React.FC<UnifiedContentCardProps> = ({ item, onSparringClick, className }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const link = getItemLink(item);
    const PlayIcon = item.type === 'sparring' ? PlaySquare : PlayCircle;
    const spanClass = getSpanClass(item.type, item.variant);

    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
            className={cn("group cursor-pointer flex flex-col h-full", spanClass, className)}
        >
            {/* Image area — fills remaining space via flex-1 */}
            <div
                className={cn(
                    "relative bg-zinc-900 rounded-2xl overflow-hidden transition-all duration-500 flex-1 min-h-0",
                    "hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:ring-1 hover:ring-violet-500/30"
                )}
            >
                <Link
                    to={link}
                    onClick={handleClick}
                    className="absolute inset-0 block"
                >
                    <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />

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
            <div className="flex gap-3 px-1 mt-2 shrink-0">
                {/* Creator Avatar */}
                {item.creatorId && (
                    <Link
                        to={`/creator/${item.creatorId}`}
                        className="shrink-0 pt-0.5"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-800 overflow-hidden group-hover:border-violet-500/50 transition-colors">
                            {item.creatorProfileImage ? (
                                <img
                                    src={item.creatorProfileImage}
                                    alt={item.creatorName}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                                    {item.creatorName?.charAt(0)}
                                </div>
                            )}
                        </div>
                    </Link>
                )}

                {/* Text Info */}
                <div className="flex-1 min-w-0 pr-1">
                    <Link to={link} onClick={handleClick}>
                        <h3 className="text-zinc-100 font-bold text-sm md:text-base leading-tight mb-1 line-clamp-2 group-hover:text-violet-400 transition-colors min-h-[2.5rem] md:min-h-[2.8rem]">
                            {item.title}
                        </h3>
                    </Link>

                    <div className="flex items-center justify-between gap-4 mt-1.5">
                        {item.creatorName && (
                            <div className="text-xs md:text-sm text-zinc-400 font-medium truncate">
                                {item.creatorName}
                            </div>
                        )}

                        <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 shrink-0 font-bold">
                            <PlayIcon className="w-3 h-3" />
                            <span>
                                {(item.views || 0).toLocaleString()} 조회수
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
