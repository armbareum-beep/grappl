import React, { useEffect, useState } from 'react';
import { Users, Shield, ChevronRight, Trophy } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
}

const getCardStyle = (index: number) => {
    const styles = [
        // Emerald (Green)
        {
            bg: 'bg-emerald-500',
            gradient: 'from-emerald-500/0 via-emerald-900/40 to-emerald-950/90',
            text: 'text-emerald-50',
            accent: 'text-emerald-300',
            number: 'text-emerald-900/20'
        },
        // Orange
        {
            bg: 'bg-orange-500',
            gradient: 'from-orange-500/0 via-orange-900/40 to-orange-950/90',
            text: 'text-orange-50',
            accent: 'text-orange-300',
            number: 'text-orange-900/20'
        },
        // Violet (Purple)
        {
            bg: 'bg-violet-500',
            gradient: 'from-violet-500/0 via-violet-900/40 to-violet-950/90',
            text: 'text-violet-50',
            accent: 'text-violet-300',
            number: 'text-violet-900/20'
        },
        // Blue
        {
            bg: 'bg-blue-500',
            gradient: 'from-blue-500/0 via-blue-900/40 to-blue-950/90',
            text: 'text-blue-50',
            accent: 'text-blue-300',
            number: 'text-blue-900/20'
        },
        // Rose (Pink/Red)
        {
            bg: 'bg-rose-500',
            gradient: 'from-rose-500/0 via-rose-900/40 to-rose-950/90',
            text: 'text-rose-50',
            accent: 'text-rose-300',
            number: 'text-rose-900/20'
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

            // Duplicate for infinite scroll
            const duplicatedData = data ? [...data, ...data, ...data] : [];
            setCreators(duplicatedData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching creators:', error);
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center text-slate-500 py-12">로딩 중...</div>;
    if (creators.length === 0) return <div className="text-center text-slate-500 py-12">등록된 인스트럭터가 없습니다</div>;

    return (
        <div className="relative overflow-hidden mb-12 py-8">
            {/* Gradient Fade Edges */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-950 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-950 to-transparent z-20 pointer-events-none"></div>

            <div className="instructor-scroll-container flex gap-6 px-4">
                {creators.map((creator, index) => {
                    const style = getCardStyle(index);
                    const rank = (index % (creators.length / 3)) + 1; // Calculate rank 1, 2, 3...

                    return (
                        <div
                            key={`${creator.id}-${index}`}
                            className={`group relative flex-shrink-0 w-[260px] h-[340px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${style.bg}`}
                        >
                            {/* Big Rank Number Background */}
                            <div className={`absolute -bottom-10 -left-6 text-[180px] font-black leading-none ${style.number} select-none z-0 transition-transform duration-500 group-hover:scale-110`}>
                                {rank}
                            </div>

                            {/* Image Container */}
                            <div className="absolute inset-0 z-10">
                                {creator.profile_image ? (
                                    <img
                                        src={creator.profile_image}
                                        alt={creator.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 mix-blend-normal"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-black/20">
                                        <Shield className="w-20 h-20 text-white/50" />
                                    </div>
                                )}
                                {/* Gradient Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-b ${style.gradient}`}></div>
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 p-5 flex flex-col justify-end z-20">
                                <div className="transform transition-transform duration-300 group-hover:-translate-y-1">
                                    <div className="flex items-center gap-2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 backdrop-blur-sm ${style.text}`}>
                                            TOP INSTRUCTOR
                                        </span>
                                    </div>

                                    <h3 className={`text-2xl font-black ${style.text} mb-1 leading-tight drop-shadow-lg`}>
                                        {creator.name}
                                    </h3>

                                    <p className={`text-sm font-medium ${style.accent} line-clamp-1 mb-3 opacity-90`}>
                                        {creator.bio || 'BJJ Specialist'}
                                    </p>

                                    <div className={`flex items-center justify-between pt-3 border-t border-white/10`}>
                                        <div className={`flex items-center gap-1.5 text-xs font-bold ${style.text} opacity-80`}>
                                            <Users className="w-3.5 h-3.5" />
                                            <span>{creator.subscriber_count.toLocaleString()}</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-transform group-hover:scale-110 group-hover:bg-white/30`}>
                                            <ChevronRight className={`w-4 h-4 ${style.text}`} />
                                        </div>
                                    </div>
                                </div>
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
