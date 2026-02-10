import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
    <div className={cn("animate-pulse bg-zinc-800 rounded-lg", className)} />
);

// 카드 스켈레톤 (코스, 루틴, 스파링용)
export const CardSkeleton: React.FC<{ aspectRatio?: 'video' | 'square' }> = ({ aspectRatio = 'video' }) => (
    <div className="flex flex-col gap-3">
        <Skeleton className={cn(
            "w-full rounded-xl",
            aspectRatio === 'video' ? 'aspect-video' : 'aspect-square'
        )} />
        <div className="space-y-2 px-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    </div>
);

// 그리드 스켈레톤
export const GridSkeleton: React.FC<{ count?: number; columns?: number }> = ({
    count = 6,
    columns = 3
}) => (
    <div className={cn(
        "grid gap-4",
        columns === 2 && "grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
    )}>
        {Array.from({ length: count }).map((_, i) => (
            <CardSkeleton key={i} />
        ))}
    </div>
);

// 콘텐츠 Row 스켈레톤 (홈페이지용)
export const ContentRowSkeleton: React.FC = () => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
            </div>
            <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[280px]">
                    <CardSkeleton />
                </div>
            ))}
        </div>
    </div>
);

// 리스트 아이템 스켈레톤
export const ListItemSkeleton: React.FC = () => (
    <div className="flex items-center gap-4 p-4">
        <Skeleton className="w-24 h-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    </div>
);

// 프로필 스켈레톤
export const ProfileSkeleton: React.FC = () => (
    <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-full" />
        <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
        </div>
    </div>
);

// 피드 아이템 스켈레톤 (드릴 릴스용)
export const FeedItemSkeleton: React.FC = () => (
    <div className="aspect-[9/16] bg-zinc-900 rounded-2xl overflow-hidden relative">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute bottom-4 left-4 right-16 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="absolute right-4 bottom-20 space-y-4">
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
            <Skeleton className="w-10 h-10 rounded-full" />
        </div>
    </div>
);

// 페이지 전체 스켈레톤
export const PageSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
    <div className="space-y-12 py-8 px-4 md:px-12">
        {Array.from({ length: rows }).map((_, i) => (
            <ContentRowSkeleton key={i} />
        ))}
    </div>
);
