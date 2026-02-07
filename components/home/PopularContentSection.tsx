import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Course, DrillRoutine, SparringVideo } from '../../types';

interface PopularContentSectionProps {
    items: (Course | DrillRoutine | SparringVideo)[];
    type: 'course' | 'routine' | 'sparring';
    title?: string;
    subtitle?: string;
}

export const PopularContentSection: React.FC<PopularContentSectionProps> = ({
    items,
    type,
    title,
    subtitle
}) => {
    const navigate = useNavigate();

    if (!items || items.length === 0) return null;

    // Limit to Top 10
    const displayItems = items.slice(0, 10);

    const handleClick = (item: any) => {
        if (type === 'course') navigate(`/courses/${item.id}`);
        else if (type === 'routine') navigate(`/routines/${item.id}`);
        else if (type === 'sparring') navigate(`/watch?id=${item.id}&type=sparring`);
    };

    const getThumbnail = (item: any) => {
        if (type === 'course') return item.thumbnailUrl;
        if (type === 'routine') return item.thumbnailUrl;
        if (type === 'sparring') return item.thumbnailUrl; // Or youtube/vimeo logic
        return '';
    };

    const getTitle = (item: any) => {
        if (type === 'course') return item.title;
        if (type === 'routine') return item.title;
        if (type === 'sparring') return item.title;
        return '';
    };

    const getSubtitle = (item: any) => {
        if (type === 'course') return item.creatorName;
        if (type === 'routine') return `${item.totalDurationMinutes} min`;
        if (type === 'sparring') return item.player1 && item.player2 ? `${item.player1} vs ${item.player2}` : 'Sparring';
        return '';
    };

    return (
        <div className="w-full">
            {title && (
                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white mb-1">{title}</h2>
                    {subtitle && <p className="text-zinc-400 text-sm">{subtitle}</p>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 gap-y-10">
                {displayItems.map((item, idx) => (
                    <div
                        key={item.id}
                        onClick={() => handleClick(item)}
                        className="group relative cursor-pointer flex flex-col items-center md:items-start"
                    >
                        {/* Rank Number (Absolute positioned to overlap the card) */}
                        <div className="absolute -top-6 -left-4 z-20 pointer-events-none">
                            <span
                                className="text-[80px] md:text-[100px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-b from-white/20 to-transparent italic"
                                style={{
                                    WebkitTextStroke: '1px rgba(255,255,255,0.3)',
                                    fontFamily: 'Inter, sans-serif'
                                }}
                            >
                                {idx + 1}
                            </span>
                        </div>

                        {/* Card Container */}
                        <div className="relative w-full aspect-[4/5] md:aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 group-hover:border-violet-500/50 transition-all shadow-lg group-hover:shadow-violet-900/20 z-10 ml-4 md:ml-6 mt-4 md:mt-0">
                            {/* Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                style={{ backgroundImage: `url(${getThumbnail(item)})` }}
                            />

                            {/* Gradient Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/50 to-transparent" />

                            {/* Content Info */}
                            <div className="absolute bottom-0 inset-x-0 p-4">
                                <h3 className="text-white font-bold text-lg leading-tight line-clamp-2 mb-1 group-hover:text-violet-200 transition-colors">
                                    {getTitle(item)}
                                </h3>
                                <p className="text-zinc-400 text-xs font-medium uppercase tracking-wider">
                                    {getSubtitle(item)}
                                </p>
                            </div>

                            {/* Play Icon Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[1px]">
                                <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                                    <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
