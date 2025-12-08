import React, { useEffect, useState } from 'react';
import { Users, Shield, CheckCircle } from 'lucide-react';
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
            const duplicatedData = data ? [...data, ...data] : [];
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
                {creators.map((creator, index) => (
                    <div
                        key={`${creator.id}-${index}`}
                        className="group relative flex-shrink-0 w-[260px] bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
                    >
                        {/* Card Header Background */}
                        <div className="h-24 bg-gradient-to-br from-slate-800 to-slate-900 relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent opacity-50"></div>
                        </div>

                        {/* Avatar */}
                        <div className="relative -mt-12 px-6 mb-3">
                            <div className="w-24 h-24 rounded-full p-1 bg-slate-900 ring-4 ring-slate-900 group-hover:ring-indigo-500/30 transition-all duration-300">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800">
                                    {creator.profile_image ? (
                                        <img
                                            src={creator.profile_image}
                                            alt={creator.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Shield className="w-10 h-10 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="px-6 pb-6">
                            <div className="flex items-center gap-1.5 mb-1">
                                <h3 className="text-lg font-bold text-white group-hover:text-indigo-400 transition-colors">
                                    {creator.name}
                                </h3>
                                <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2 mb-4 h-8 leading-relaxed">
                                {creator.bio || 'Grappl 인증 인스트럭터입니다.'}
                            </p>

                            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">수련생</span>
                                    <div className="flex items-center gap-1.5 text-sm font-bold text-slate-300">
                                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{creator.subscriber_count.toLocaleString()}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.location.href = `/creator/${creator.id}`;
                                    }}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                    프로필
                                </button>
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
