import React from 'react';
import { Pencil, Trash2, Eye, BookOpen, Layers, Clapperboard, PlayCircle, Grid } from 'lucide-react';
import { Button } from '../Button';
import { cn } from '../../lib/utils';
import { MouseEvent } from 'react';

export type ContentType = 'course' | 'routine' | 'sparring' | 'lesson' | 'drill';

interface ContentCardProps {
    type: ContentType;
    title: string;
    description?: string;
    thumbnailUrl?: string;
    price?: number;
    views?: number;
    count?: number; // lessonCount, drillCount, etc.
    duration?: number; // durationMinutes, etc.
    createdAt?: string;
    isPublished?: boolean;
    isProcessing?: boolean;
    isError?: boolean;
    onEdit: () => void;
    onDelete: () => void;
    onClick?: () => void;
    category?: string;
    uniformType?: string;
}

export const ContentCard: React.FC<ContentCardProps> = ({
    type,
    title,
    description,
    thumbnailUrl,
    price,
    views = 0,
    count,
    duration,
    createdAt,
    isPublished = true,
    isProcessing = false,
    isError = false,
    onEdit,
    onDelete,
    onClick,
    category,
    uniformType
}) => {
    const Icon = {
        course: BookOpen,
        routine: Layers,
        sparring: Clapperboard,
        lesson: PlayCircle,
        drill: Grid
    }[type];

    const label = {
        course: '클래스',
        routine: '루틴',
        sparring: '스파링',
        lesson: '레슨',
        drill: '드릴'
    }[type];

    const countLabel = {
        course: '레슨',
        routine: '조회수',
        sparring: '',
        lesson: '',
        drill: ''
    }[type];

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden transition-all duration-300",
                onClick && "cursor-pointer hover:bg-zinc-900/60 hover:border-violet-500/30",
                !onClick && "hover:border-zinc-700"
            )}
        >
            {/* Thumbnail Header */}
            <div className="aspect-video w-full bg-zinc-800 relative overflow-hidden">
                {thumbnailUrl && !isProcessing && !isError ? (
                    <img
                        src={thumbnailUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                        {isProcessing ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
                        ) : (
                            <Icon className="w-10 h-10 opacity-20" />
                        )}
                        {isProcessing && <span className="text-xs font-medium text-zinc-500">영상 처리 중...</span>}
                        {isError && <span className="text-xs font-medium text-red-500 text-center px-4">영상 처리 실패.<br />다시 업로드해주세요.</span>}
                    </div>
                )}

                {/* Badges on Thumbnail */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[10px] font-bold text-white uppercase tracking-wider">
                        {label}
                    </span>
                    {price !== undefined && (
                        <span className={cn(
                            "px-2 py-1 rounded-md backdrop-blur-md border text-[10px] font-bold",
                            price === 0
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/20"
                                : "bg-violet-500/20 text-violet-400 border-violet-500/20"
                        )}>
                            {price === 0 ? '무료' : `₩${price.toLocaleString()}`}
                        </span>
                    )}
                </div>

                {/* Status Badges */}
                <div className="absolute top-3 right-3 flex gap-2">
                    {isPublished === false && (
                        <span className="px-2 py-1 rounded-md bg-zinc-900/80 backdrop-blur-md border border-zinc-700 text-[10px] font-bold text-zinc-400">
                            비공개
                        </span>
                    )}
                </div>

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>

            {/* Content Body */}
            <div className="p-4 flex flex-col flex-1">
                <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white group-hover:text-violet-400 transition-colors line-clamp-1 mb-1" title={title}>
                        {title}
                    </h3>
                    {description && (
                        <p className="text-xs text-zinc-500 line-clamp-2 mb-3 h-8">
                            {description}
                        </p>
                    )}
                </div>

                {/* Stats & Metadata */}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-zinc-800/50">
                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium">
                        <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {views.toLocaleString()}
                        </span>
                        {count !== undefined && countLabel && (
                            <span className="flex items-center gap-1">
                                <Icon className="w-3 h-3" />
                                {count} {countLabel}
                            </span>
                        )}
                        {duration !== undefined && (
                            <span className="flex items-center gap-1">
                                <PlayCircle className="w-3 h-3" />
                                {duration}분
                            </span>
                        )}
                        {createdAt && (
                            <span className="hidden sm:inline">
                                {new Date(createdAt).toLocaleDateString()}
                            </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                onEdit();
                            }}
                            className={cn(
                                "h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800",
                                (isProcessing || isError) && type !== 'course' && type !== 'routine' && "opacity-50 cursor-not-allowed"
                            )}
                            disabled={(isProcessing || isError) && type !== 'course' && type !== 'routine'}
                            title="수정"
                        >
                            <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e: MouseEvent) => {
                                e.stopPropagation();
                                onDelete();
                            }}
                            className="h-8 w-8 text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                            title="삭제"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Secondary Info (Optional) */}
                {(category || uniformType) && (
                    <div className="mt-2 flex items-center gap-2">
                        {category && (
                            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter bg-zinc-800/30 px-1.5 py-0.5 rounded">
                                {category}
                            </span>
                        )}
                        {uniformType && (
                            <span className="text-[10px] text-zinc-600 font-medium italic">
                                {uniformType}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
