import React, { useEffect, useState } from 'react';
import { Users, Shield, ChevronRight, Star, Zap, Crown } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
}

type CardStyle = 'classic' | 'modern' | 'neon';

export const InstructorCarousel: React.FC = () => {
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [styleMode, setStyleMode] = useState<CardStyle>('modern');

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

            const duplicatedData = data ? [...data, ...data, ...data] : [];
            setCreators(duplicatedData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching creators:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center text-slate-500 py-12">로딩 중...</div>;

    return (
        <div className="relative mb-12 py-8">
            {/* Style Switcher */}
            <div className="flex justify-center gap-2 mb-8 relative z-30">
                <button
                    onClick={() => setStyleMode('classic')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${styleMode === 'classic' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                    Classic Luxury
                </button>
                <button
                    onClick={() => setStyleMode('modern')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${styleMode === 'modern' ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                    Modern Glass
                </button>
                <button
                    onClick={() => setStyleMode('neon')}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${styleMode === 'neon' ? 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
                >
                    Neon Sport
                </button>
            </div>

            {/* Gradient Fade Edges */}
            <div className="absolute left-0 top-20 bottom-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-20 bottom-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-20 pointer-events-none"></div>

            <div className="instructor-scroll-container flex gap-6 px-4">
                {creators.map((creator, index) => (
                    <div key={`${creator.id}-${index}-${styleMode}`}>

                        {/* 1. Classic Luxury Style */}
                        {styleMode === 'classic' && (
                            <div className="group relative w-[280px] h-[400px] bg-slate-900 rounded-sm overflow-hidden border border-slate-800 hover:border-amber-500/50 transition-all duration-500">
                                <div className="absolute inset-0">
                                    <img
                                        src={creator.profile_image}
                                        alt={creator.name}
                                        className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90"></div>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full p-6 text-center">
                                    <div className="mb-2 flex justify-center">
                                        <Crown className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <h3 className="text-2xl font-serif text-white mb-1 tracking-widest uppercase">{creator.name}</h3>
                                    <div className="w-8 h-0.5 bg-amber-500 mx-auto mb-3"></div>
                                    <p className="text-slate-400 text-xs font-serif italic mb-4">{creator.bio || 'Master Instructor'}</p>
                                    <button className="text-amber-500 text-xs font-bold tracking-widest border border-amber-500/30 px-4 py-2 hover:bg-amber-500 hover:text-black transition-colors uppercase">
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 2. Modern Glass Style */}
                        {styleMode === 'modern' && (
                            <div className="group relative w-[280px] h-[400px] rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2">
                                <div className="absolute inset-0 bg-slate-800">
                                    <img
                                        src={creator.profile_image}
                                        alt={creator.name}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                                    />
                                </div>
                                {/* Glass Overlay */}
                                <div className="absolute inset-x-4 bottom-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-lg font-bold text-white">{creator.name}</h3>
                                        <div className="bg-blue-500 rounded-full p-1">
                                            <Shield className="w-3 h-3 text-white" />
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-xs line-clamp-1 mb-3">{creator.bio}</p>
                                    <div className="flex items-center gap-2 text-xs text-blue-300 font-medium">
                                        <Users className="w-3 h-3" />
                                        <span>{creator.subscriber_count.toLocaleString()} Students</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 3. Neon Sport Style */}
                        {styleMode === 'neon' && (
                            <div className="group relative w-[280px] h-[400px] bg-black rounded-xl overflow-hidden border border-slate-800 hover:border-fuchsia-500 transition-all duration-300">
                                {/* Neon Glow Background */}
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                                <div className="absolute inset-0 p-1">
                                    <div className="w-full h-full relative overflow-hidden rounded-lg bg-slate-900">
                                        <img
                                            src={creator.profile_image}
                                            alt={creator.name}
                                            className="w-full h-full object-cover mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-500 scale-110 group-hover:scale-100"
                                        />
                                        {/* Diagonal Lines */}
                                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-30 mix-blend-overlay"></div>

                                        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/90 to-transparent p-5">
                                            <div className="flex items-end justify-between">
                                                <div>
                                                    <div className="text-cyan-400 text-[10px] font-black italic tracking-wider mb-1">PRO FIGHTER</div>
                                                    <h3 className="text-3xl font-black text-white italic leading-none mb-1 shadow-black drop-shadow-md" style={{ textShadow: '2px 2px 0px #d946ef' }}>
                                                        {creator.name}
                                                    </h3>
                                                </div>
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <span className="bg-fuchsia-600 text-white text-[10px] font-bold px-2 py-0.5 skew-x-[-10deg]">BJJ</span>
                                                <span className="bg-cyan-600 text-black text-[10px] font-bold px-2 py-0.5 skew-x-[-10deg]">NO-GI</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                ))}
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
