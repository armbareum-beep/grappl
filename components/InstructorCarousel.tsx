import React, { useEffect, useState } from 'react';
import { Shield, Users, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
}

const getBeltColor = (index: number): string => {
    const colors = [
        'from-slate-900 to-slate-700',      // Black
        'from-amber-800 to-amber-600',      // Brown
        'from-purple-600 to-purple-400',    // Purple
        'from-blue-600 to-blue-400',        // Blue
        'from-slate-400 to-slate-200',      // White
    ];
    return colors[index % colors.length];
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
        <div className="relative overflow-hidden mb-12">
            {/* Gradient Overlays */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>

            {/* Scrolling Container */}
            <div className="instructor-scroll-container flex gap-6 py-4">
                {creators.map((creator, index) => (
                    <div
                        key={`${creator.id}-${index}`}
                        className="instructor-card flex-shrink-0 w-80 group relative bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-3xl border border-slate-700/50 hover:border-blue-500/50 overflow-hidden transition-all duration-500 hover:transform hover:-translate-y-3 hover:shadow-2xl hover:shadow-blue-500/20"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-transparent transition-all duration-500"></div>

                        <div className="p-8 relative">
                            {/* Avatar with Belt Color */}
                            <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getBeltColor(index)} p-1 mb-6 mx-auto ring-4 ring-slate-700/50 group-hover:ring-blue-500/50 transition-all duration-300`}>
                                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                                    {creator.profile_image && creator.profile_image !== 'https://via.placeholder.com/150' ? (
                                        <img 
                                            src={creator.profile_image} 
                                            alt={creator.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Shield className="w-16 h-16 text-blue-400" />
                                    )}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="text-center space-y-3">
                                <div>
                                    <h3 className="text-2xl font-black text-white mb-1">{creator.name}</h3>
                                </div>

                                <div className="inline-block px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                                    <p className="text-blue-300 text-sm font-bold">인증 인스트럭터</p>
                                </div>

                                {/* Bio */}
                                <div className="pt-4">
                                    <p className="text-slate-300 text-sm line-clamp-3">
                                        {creator.bio || '세계적인 주짓수 기술을 가르칩니다'}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center gap-2 text-slate-500 text-sm pt-4">
                                    <Users className="w-4 h-4 text-blue-400" />
                                    <span className="text-blue-400 font-bold">{creator.subscriber_count.toLocaleString()}</span>
                                    <span>수련생</span>
                                </div>
                            </div>
                        </div>

                        {/* Hover Effect */}
                        <div className="absolute inset-0 border-2 border-blue-500/0 group-hover:border-blue-500/50 rounded-3xl transition-all duration-300 pointer-events-none"></div>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes scroll-left {
                    0% {
                        transform: translateX(0);
                    }
                    100% {
                        transform: translateX(-33.333%);
                    }
                }

                .instructor-scroll-container {
                    animation: scroll-left 30s linear infinite;
                }

                .instructor-scroll-container:hover {
                    animation-play-state: paused;
                }

                .instructor-card {
                    animation: none;
                }
            `}</style>
        </div>
    );
};
