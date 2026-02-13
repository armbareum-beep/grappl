import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Drill } from '../types';
import { PlayCircle, Clock, Bookmark, Share2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { toggleDrillSave, checkDrillSaved } from '../lib/api-user-interactions';

const ShareModal = lazy(() => import('./social/ShareModal'));

interface DrillCardProps {
    drill: Drill;
    className?: string; // Add className for flexibility
}

export const DrillCard: React.FC<DrillCardProps> = ({ drill, className }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    useEffect(() => {
        if (user && drill.id) {
            checkDrillSaved(user.id, drill.id).then(setIsSaved).catch(console.error);
        }
    }, [user?.id, drill.id]);

    const handleSave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user) {
            navigate('/login');
            return;
        }
        try {
            await toggleDrillSave(user.id, drill.id);
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

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <Link
                to={`/drills?id=${drill.id}`}
                className={cn(
                    "group block relative overflow-hidden rounded-lg bg-slate-900 transition-all duration-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] hover:ring-1 hover:ring-violet-500/30 grow aspect-[9/16]"
                )}
            >
                {/* Thumbnail */}
                <div className="absolute inset-0">
                    <img
                        src={drill.thumbnailUrl}
                        alt={drill.title}
                        className="w-full h-full object-cover group-hover:scale-145 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>

                {/* Badge area — top-left placeholder if needed */}
                <div className="absolute top-2.5 left-2.5 z-10">
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 z-[1]" />

                {/* Icons Area — Visible on hover */}
                {/* Save — top-right */}
                <button
                    className={cn(
                        "absolute top-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 hover:bg-white hidden md:block",
                        isSaved ? "text-violet-500 hover:text-violet-600" : "hover:text-zinc-900"
                    )}
                    onClick={handleSave}
                    aria-label="저장"
                >
                    <Bookmark className={cn("w-3.5 h-3.5", isSaved && "fill-current")} />
                </button>

                {/* Share — bottom-right */}
                <button
                    className="absolute bottom-2.5 right-2.5 z-20 p-2 rounded-full bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 delay-75 hover:bg-white hover:text-zinc-900 hidden md:block"
                    onClick={handleShare}
                    aria-label="공유"
                >
                    <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* Play Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <PlayCircle className="w-8 h-8 text-white" />
                    </div>
                </div>

                {/* Views (Moved/Integrated or Hidden on hover) */}
                <div className="absolute top-2.5 left-2.5 text-[10px] text-white bg-black/50 backdrop-blur-sm rounded px-1.5 py-0.5 opacity-100 group-hover:opacity-0 transition-opacity">
                    {(drill.views || 0).toLocaleString()} views
                </div>
            </Link>

            {/* Content Area (Below) */}
            <div className="pt-3 px-1">
                {/* Duration Badge */}
                <div className="flex items-center gap-1 text-[10px] text-zinc-400 mb-1.5 font-bold uppercase tracking-tight">
                    <Clock className="w-3 h-3" />
                    <span>{drill.duration || (drill.durationMinutes ? `${drill.durationMinutes}분` : '')}</span>
                </div>

                {/* Title */}
                <Link to={`/drills?id=${drill.id}`}>
                    <h3 className="font-bold text-zinc-100 text-sm line-clamp-2 leading-tight group-hover:text-violet-400 transition-colors">{drill.title}</h3>
                </Link>

                {/* Creator & Price */}
                <div className="flex items-center justify-between mt-2">
                    <span className="text-zinc-500 text-[11px] font-medium truncate max-w-[100px]">{drill.creatorName}</span>
                    <span className="text-zinc-100 text-xs font-bold">{drill.price ? `₩${drill.price.toLocaleString()}` : '무료'}</span>
                </div>
            </div>

            <Suspense fallback={null}>
                {isShareModalOpen && (
                    <ShareModal
                        isOpen={isShareModalOpen}
                        onClose={() => setIsShareModalOpen(false)}
                        title={drill.title}
                        text={`${drill.creatorName || 'Grapplay'}님의 드릴을 확인해보세요!`}
                        imageUrl={drill.thumbnailUrl}
                        url={`${window.location.origin}/drills?id=${drill.id}`}
                    />
                )}
            </Suspense>
        </div>
    );
};
