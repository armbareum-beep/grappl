import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Drill {
    id: string;
    title: string;
    thumbnail_url: string;
    vimeo_url: string;
    creator_id: string;
    creator_name?: string;
}

export const FreeDrillShowcase: React.FC = () => {
    const navigate = useNavigate();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);
    const [hoveredDrill, setHoveredDrill] = useState<string | null>(null);

    useEffect(() => {
        fetchFreeDrills();
    }, []);

    const fetchFreeDrills = async () => {
        try {
            // Fetch first drills from routines (order_index = 0)
            // These are the free preview drills
            const { data: routineDrills, error } = await supabase
                .from('routine_drills')
                .select(`
                    drill_id,
                    drills (
                        id,
                        title,
                        thumbnail_url,
                        vimeo_url,
                        creator_id
                    )
                `)
                .eq('order_index', 0)
                .limit(20);

            if (error) {
                console.error('Error fetching free drills:', error);
                setLoading(false);
                return;
            }

            // Extract drill data
            const drillsData = (routineDrills || [])
                .filter((rd: any) => rd.drills)
                .map((rd: any) => ({
                    id: rd.drills.id,
                    title: rd.drills.title,
                    thumbnail_url: rd.drills.thumbnail_url,
                    vimeo_url: rd.drills.vimeo_url,
                    creator_id: rd.drills.creator_id,
                    creator_name: 'Unknown'
                }));

            // Fetch actual creator names
            const creatorIds = Array.from(new Set(drillsData.map(d => d.creator_id).filter(Boolean)));
            if (creatorIds.length > 0) {
                const { data: users } = await supabase
                    .from('users')
                    .select('id, name')
                    .in('id', creatorIds);

                const { data: creators } = await supabase
                    .from('creators')
                    .select('id, name')
                    .in('id', creatorIds);

                const namesMap: Record<string, string> = {};
                users?.forEach(u => { namesMap[u.id] = u.name; });
                creators?.forEach(c => { if (c.name) namesMap[c.id] = c.name; });

                drillsData.forEach(d => {
                    if (namesMap[d.creator_id]) d.creator_name = namesMap[d.creator_id];
                });
            }

            // Remove duplicates (same drill might be first in multiple routines)
            const uniqueDrills = Array.from(
                new Map(drillsData.map((drill: Drill) => [drill.id, drill])).values()
            );

            // Truly random shuffle using time-based seed (changes every 10 seconds)
            const timeSeed = Math.floor(Date.now() / 10000);
            const seededRandom = (seed: number) => {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            };

            const shuffled = [...uniqueDrills]
                .map((drill, index) => ({
                    drill,
                    sort: seededRandom(timeSeed + index)
                }))
                .sort((a, b) => a.sort - b.sort)
                .map(item => item.drill)
                .slice(0, 4);

            setDrills(shuffled);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching free drills:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                {[...Array(4)].map((_, i) => (
                    <div
                        key={i}
                        className="aspect-[9/16] bg-zinc-900 rounded-xl animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (drills.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-zinc-400 text-lg mb-4">무료 드릴이 아직 없습니다</p>
                <p className="text-zinc-500 text-sm">루틴의 첫 번째 드릴이 자동으로 무료로 제공됩니다.</p>
            </div>
        );
    }

    const getVimeoId = (url?: string) => {
        if (!url) return null;
        if (/^\d+$/.test(url)) return url;
        const match = url.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
        return match ? match[1] : null;
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {drills.map((drill) => {
                const vimeoId = getVimeoId(drill.vimeo_url);
                const isHovered = hoveredDrill === drill.id;

                return (
                    <div
                        key={drill.id}
                        className="group cursor-pointer flex flex-col gap-3"
                        onClick={() => navigate('/drills')}
                        onMouseEnter={() => setHoveredDrill(drill.id)}
                        onMouseLeave={() => setHoveredDrill(null)}
                    >
                        {/* Card Base */}
                        <div className="relative aspect-[9/14] rounded-2xl overflow-hidden bg-zinc-900/30 backdrop-blur-xl border border-zinc-800 transition-all duration-300 group-hover:shadow-[0_0_30px_rgba(124,58,237,0.1)] group-hover:border-zinc-700">

                            {/* Thumbnail */}
                            {drill.thumbnail_url && (
                                <img
                                    src={drill.thumbnail_url}
                                    alt={drill.title}
                                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${isHovered ? 'opacity-0' : 'grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-105'
                                        }`}
                                    loading="lazy"
                                />
                            )}

                            {/* Video Player (shown on hover) - Rendered AFTER thumbnail to be on top */}
                            {vimeoId && isHovered && (
                                <iframe
                                    src={`https://player.vimeo.com/video/${vimeoId}?background=1&autoplay=1&loop=1&muted=1&controls=0`}
                                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-10"
                                    frameBorder="0"
                                    allow="autoplay; fullscreen"
                                />
                            )}

                            {/* Top Gradient Overlay */}
                            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"></div>

                            {/* Bottom Gradient Overlay */}
                            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none"></div>

                            {/* Play Button Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                                <div className="w-14 h-14 rounded-full bg-violet-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                                </div>
                            </div>

                            {/* Free Badge */}
                            <div className="absolute top-3 right-3 px-2.5 py-1 bg-violet-600/90 backdrop-blur-md rounded-full border border-violet-400/20 shadow-lg">
                                <span className="text-[10px] text-white font-bold tracking-wider">FREE</span>
                            </div>
                        </div>

                        {/* Meta Info */}
                        <div className="px-1">
                            <h4 className="font-bold text-zinc-100 text-lg leading-snug line-clamp-2 group-hover:text-violet-400 transition-colors">
                                {drill.title}
                            </h4>
                            <p className="text-zinc-500 text-sm mt-1 flex items-center gap-1">
                                <span>{drill.creator_name}</span>
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
