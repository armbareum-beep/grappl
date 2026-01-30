import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, Clock, Star } from 'lucide-react';

interface ContentBadgeProps {
    type: 'popular' | 'recent' | 'daily_free';
    rank?: number;
    className?: string;
}

const base = "px-2 py-1 md:px-2.5 md:py-1 backdrop-blur-md rounded-lg z-20 pointer-events-none flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide";

export const ContentBadge: React.FC<ContentBadgeProps> = ({ type, rank: _rank, className }) => {
    if (type === 'daily_free') {
        return (
            <div className={cn(base, "bg-violet-500/20 border border-violet-400/30 text-violet-200", className)}>
                <Star className="w-3 h-3 fill-violet-300 text-violet-300" />
                <span className="hidden md:inline">FREE</span>
            </div>
        );
    }

    if (type === 'popular') {
        return (
            <div className={cn(base, "bg-white/15 border border-white/20 text-zinc-100", className)}>
                <TrendingUp className="w-3 h-3" />
                <span className="hidden md:inline">HOT</span>
            </div>
        );
    }

    if (type === 'recent') {
        return (
            <div className={cn(base, "bg-sky-500/20 border border-sky-400/25 text-sky-200", className)}>
                <Clock className="w-3 h-3" />
                <span className="hidden md:inline">NEW</span>
            </div>
        );
    }

    return null;
};
