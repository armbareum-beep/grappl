import React, { useEffect, useState } from 'react';
import { Users, Shield, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
}

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
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

            <div className="instructor-scroll-container flex gap-6 px-4">
                {creators.map((creator, index) => (
                    <div
                        key={`${creator.id}-${index}`}
                        className="group relative flex-shrink-0 w-[280px] h-[420px] rounded-2xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 hover:border-blue-500/50 transition-all duration-500"
                    >
                        {/* Background Image (Full Cover) */}
                        <div className="absolute inset-0">
                            {creator.profile_image ? (
                                <img
                                    src={creator.profile_image}
                                    alt={creator.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                            ) : (
                                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                    <Shield className="w-20 h-20 text-slate-700" />
                                </div>
                            )}
                            {/* Dark Gradient Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                        </div>

                        {/* Content */}
                        <div className="absolute inset-0 p-6 flex flex-col justify-end transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                            {/* Badge */}
                            <div className="mb-auto opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform -translate-y-4 group-hover:translate-y-0">
                                <span className="inline-block px-3 py-1 bg-blue-600/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-lg">
                                    Verified Instructor
                                </span>
                            </div>

                            {/* Text Info */}
                            <div className="relative z-10">
                                <h3 className="text-2xl font-black text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors">
                                    {creator.name}
                                </h3>

                                <p className="text-slate-300 text-sm line-clamp-2 mb-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100 h-0 group-hover:h-auto">
                                    {creator.bio || '세계적인 주짓수 기술을 가르칩니다.'}
                                </p>

                                <div className="flex items-center justify-between border-t border-white/10 pt-4 mt-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                        <Users className="w-3.5 h-3.5" />
                                        <span>{creator.subscriber_count.toLocaleString()} 수련생</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                        <ChevronRight className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>
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
