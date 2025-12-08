import React, { useEffect, useState } from 'react';
import { Shield, Users, Trophy, Star, Zap, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
}

// Mock stats generator based on name hash
const generateStats = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
        pac: 85 + (hash % 14),
        sho: 80 + (hash % 19),
        pas: 82 + (hash % 17),
        dri: 88 + (hash % 11),
        def: 75 + (hash % 24),
        phy: 84 + (hash % 15),
        ovr: 90 + (hash % 9)
    };
};

const getCardStyle = (index: number) => {
    const styles = [
        // Gold Rare
        {
            bg: 'bg-gradient-to-b from-yellow-200 via-yellow-500 to-yellow-700',
            border: 'border-yellow-400',
            text: 'text-yellow-900',
            accent: 'bg-yellow-900',
            glow: 'shadow-yellow-500/50'
        },
        // TOTY (Blue/Purple)
        {
            bg: 'bg-gradient-to-b from-blue-400 via-blue-700 to-indigo-900',
            border: 'border-blue-300',
            text: 'text-white',
            accent: 'bg-blue-900',
            glow: 'shadow-blue-500/50'
        },
        // Icon (White/Gold)
        {
            bg: 'bg-gradient-to-b from-slate-100 via-slate-300 to-slate-400',
            border: 'border-yellow-200',
            text: 'text-slate-900',
            accent: 'bg-slate-800',
            glow: 'shadow-white/50'
        },
        // Shapeshifters (Red/Pink)
        {
            bg: 'bg-gradient-to-b from-red-400 via-red-600 to-rose-900',
            border: 'border-rose-300',
            text: 'text-white',
            accent: 'bg-rose-950',
            glow: 'shadow-rose-500/50'
        }
    ];
    return styles[index % styles.length];
};

export const InstructorCarousel: React.FC = () => {
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCreators();
    }, []);

    const fetchCreators = async () => {
        try {
            const { data, error } = await supabase
                .from('creators')
                .select('id, name, bio, profile_image, subscriber_count')
                .eq('approved', true)
                .order('subscriber_count', { ascending: false });

            if (error) throw error;

            // Duplicate the array to create seamless infinite scroll
            const duplicatedData = data ? [...data, ...data, ...data] : [];
            setCreators(duplicatedData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching creators:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="text-center text-slate-400 py-12">
                로딩 중...
            </div>
        );
    }

    if (creators.length === 0) {
        return (
            <div className="text-center text-slate-400 py-12">
                등록된 인스트럭터가 없습니다
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden mb-12 py-10">
            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-20 pointer-events-none"></div>

            {/* Scrolling Container */}
            <div className="instructor-scroll-container flex gap-8 px-4">
                {creators.map((creator, index) => {
                    const stats = generateStats(creator.name);
                    const style = getCardStyle(index);

                    return (
                        <div
                            key={`${creator.id}-${index}`}
                            className={`instructor-card flex-shrink-0 w-64 relative group transition-all duration-500 hover:scale-105 hover:z-30`}
                        >
                            {/* Card Shape & Background */}
                            <div className={`relative h-[400px] w-full rounded-t-2xl rounded-b-[3rem] p-1 shadow-2xl ${style.glow} overflow-hidden`}>
                                {/* Background Gradient */}
                                <div className={`absolute inset-0 ${style.bg}`}></div>

                                {/* Pattern Overlay */}
                                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                                {/* Inner Border */}
                                <div className={`absolute inset-1 border-2 ${style.border} rounded-t-xl rounded-b-[2.8rem] opacity-70`}></div>

                                {/* Content Container */}
                                <div className="relative h-full flex flex-col p-3">

                                    {/* Top Section: Rating & Position & Image */}
                                    <div className="flex justify-between items-start mb-2 relative z-10">
                                        <div className="flex flex-col items-center pt-2 pl-1">
                                            <span className={`text-4xl font-black ${style.text} leading-none`}>{stats.ovr}</span>
                                            <span className={`text-sm font-bold ${style.text} opacity-80`}>PRO</span>
                                            <div className="mt-2 w-6 h-4 bg-slate-800 rounded-sm overflow-hidden border border-white/30">
                                                {/* Flag placeholder - could be dynamic */}
                                                <div className="w-full h-full bg-blue-600 relative">
                                                    <div className="absolute inset-x-0 top-1/3 bottom-1/3 bg-white"></div>
                                                    <div className="absolute inset-y-0 left-1/3 right-1/3 bg-white"></div>
                                                </div>
                                            </div>
                                            <div className="mt-1 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                                <Shield className={`w-4 h-4 ${style.text}`} />
                                            </div>
                                        </div>

                                        {/* Player Image */}
                                        <div className="absolute top-4 right-2 w-40 h-40 z-0">
                                            {creator.profile_image ? (
                                                <img
                                                    src={creator.profile_image}
                                                    alt={creator.name}
                                                    className="w-full h-full object-cover object-top drop-shadow-2xl mask-image-gradient"
                                                    style={{ maskImage: 'linear-gradient(to bottom, black 80%, transparent 100%)' }}
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Shield className="w-20 h-20 text-white/50" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Name Section */}
                                    <div className="mt-auto relative z-10 text-center mb-2">
                                        <h3 className={`text-xl font-black ${style.text} uppercase tracking-wider truncate px-1 drop-shadow-md`}>
                                            {creator.name}
                                        </h3>
                                        <div className={`h-0.5 w-full ${style.accent} opacity-30 my-1`}></div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className={`grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs font-bold ${style.text} px-2 pb-4 relative z-10`}>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">TEC</span>
                                            <span>{stats.pac}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">DRI</span>
                                            <span>{stats.dri}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">STR</span>
                                            <span>{stats.sho}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">DEF</span>
                                            <span>{stats.def}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">PAS</span>
                                            <span>{stats.pas}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="opacity-70">PHY</span>
                                            <span>{stats.phy}</span>
                                        </div>
                                    </div>

                                    {/* Bottom Decoration */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 opacity-30">
                                        <Trophy className={`w-full h-full ${style.text}`} />
                                    </div>
                                </div>

                                {/* Shine Effect */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes scroll-left {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }

                .instructor-scroll-container {
                    animation: scroll-left 40s linear infinite;
                }

                .instructor-scroll-container:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};
