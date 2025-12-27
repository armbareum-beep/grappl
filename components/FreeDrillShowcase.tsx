import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Drill {
    id: string;
    title: string;
    thumbnail_url: string;
    creator_id: string;
    creator_name?: string;
}

export const FreeDrillShowcase: React.FC = () => {
    const navigate = useNavigate();
    const [drills, setDrills] = useState<Drill[]>([]);
    const [loading, setLoading] = useState(true);

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
                        creator_id,
                        users:creator_id (
                            name
                        )
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
                    creator_id: rd.drills.creator_id,
                    creator_name: rd.drills.users?.name || '익명'
                }));

            // Remove duplicates (same drill might be first in multiple routines)
            const uniqueDrills = Array.from(
                new Map(drillsData.map((drill: Drill) => [drill.id, drill])).values()
            );

            // Shuffle and take 4 random drills
            const shuffled = uniqueDrills
                .sort(() => Math.random() - 0.5)
                .slice(0, 4);

            setDrills(shuffled);
            console.log('FreeDrillShowcase: Loaded', shuffled.length, 'drills');
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
                        className="aspect-[9/16] bg-slate-800 rounded-2xl animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (drills.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-400 text-lg mb-4">무료 드릴이 아직 없습니다</p>
                <p className="text-slate-500 text-sm">루틴의 첫 번째 드릴이 자동으로 무료로 제공됩니다.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {drills.map((drill) => (
                <div
                    key={drill.id}
                    className="aspect-[9/16] bg-slate-800 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-700 hover:border-blue-500/50 transition-all duration-300"
                    onClick={() => navigate('/drills')}
                >
                    {/* Thumbnail */}
                    {drill.thumbnail_url ? (
                        <img
                            src={drill.thumbnail_url}
                            alt={drill.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-purple-900/40"></div>
                    )}

                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20">
                        <div className="w-16 h-16 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                            <Play className="w-8 h-8 text-slate-900 fill-slate-900 ml-1" />
                        </div>
                    </div>

                    {/* Info Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-4">
                        <h4 className="font-bold text-white mb-1 line-clamp-2">{drill.title}</h4>
                        <p className="text-xs text-slate-300">{drill.creator_name}</p>
                    </div>

                    {/* Free Badge */}
                    <div className="absolute top-3 right-3 px-2 py-1 bg-green-500/80 backdrop-blur-sm rounded-full border border-green-400/30">
                        <span className="text-xs text-white font-bold">FREE</span>
                    </div>
                </div>
            ))}
        </div>
    );
};
