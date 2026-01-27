import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, Clock, Star } from 'lucide-react';

interface ContentBadgeProps {
    type: 'popular' | 'recent' | 'daily_free';
    rank?: number;
    className?: string;
}

export const ContentBadge: React.FC<ContentBadgeProps> = ({ type, rank: _rank, className }) => {
    if (type === 'daily_free') {
        return (
            <div className={cn("px-2.5 py-1 bg-violet-600/90 backdrop-blur-md rounded-md shadow-[0_0_20px_rgba(139,92,246,0.6)] border border-violet-400/40 z-20 pointer-events-none flex items-center gap-1.5 animate-pulse", className)}>
                <Star className="w-3 h-3 text-white fill-white shadow-sm" />
                <span className="text-[10px] font-black text-white tracking-widest uppercase">FREE</span>
            </div>
        );
    }

    if (type === 'popular') {
        return (
            <div className={cn("px-2.5 py-1 bg-gradient-to-r from-zinc-200 to-white backdrop-blur-md rounded-md shadow-[0_0_20px_rgba(255,255,255,0.3)] border border-white/50 z-20 pointer-events-none flex items-center gap-1.5", className)}>
                <TrendingUp className="w-3.5 h-3.5 text-zinc-900" />
                <span className="text-[10px] font-black text-zinc-900 tracking-tighter uppercase whitespace-nowrap">
                    HOT
                </span>
            </div>
        );
    }

    if (type === 'recent') {
        return (
            <div className={cn("px-2.5 py-1 bg-gradient-to-r from-sky-400 to-blue-500 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(14,165,233,0.4)] border border-sky-300/40 z-20 pointer-events-none flex items-center gap-1.5", className)}>
                <Clock className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] font-black text-white tracking-widest uppercase">NEW</span>
            </div>
        );
    }

    return null;
};
