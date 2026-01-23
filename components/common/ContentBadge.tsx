import React from 'react';
import { cn } from '../../lib/utils';
import { TrendingUp, Clock, Star } from 'lucide-react';

interface ContentBadgeProps {
    type: 'popular' | 'recent' | 'daily_free';
    rank?: number;
    className?: string;
}

export const ContentBadge: React.FC<ContentBadgeProps> = ({ type, rank, className }) => {
    if (type === 'daily_free') {
        return (
            <div className={cn("px-2.5 py-1 bg-violet-600/90 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-violet-400/30 z-20 pointer-events-none flex items-center gap-1.5", className)}>
                <Star className="w-3 h-3 text-white fill-white" />
                <span className="text-[10px] font-black text-white tracking-widest uppercase">TODAY'S FREE</span>
            </div>
        );
    }

    if (type === 'popular') {
        return (
            <div className={cn("px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-600 backdrop-blur-md rounded-md shadow-[0_0_20px_rgba(245,158,11,0.4)] border border-amber-300/30 z-20 pointer-events-none flex items-center gap-1.5", className)}>
                <TrendingUp className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] font-black text-white tracking-tighter uppercase">
                    {rank ? `TOP ${rank}` : 'POPULAR'}
                </span>
            </div>
        );
    }

    if (type === 'recent') {
        return (
            <div className={cn("px-2.5 py-1 bg-gradient-to-r from-emerald-500 to-teal-600 backdrop-blur-md rounded-md shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-300/30 z-20 pointer-events-none flex items-center gap-1.5", className)}>
                <Clock className="w-3.5 h-3.5 text-white" />
                <span className="text-[10px] font-black text-white tracking-widest uppercase">NEW</span>
            </div>
        );
    }

    return null;
};
