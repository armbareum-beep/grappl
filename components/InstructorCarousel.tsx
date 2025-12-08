import React, { useEffect, useState } from 'react';
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
            <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-slate-950 to-transparent z-20 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-slate-950 to-transparent z-20 pointer-events-none"></div>

            <div className="instructor-scroll-container flex gap-4 px-4">
                {creators.map((creator, index) => {
                    // Mock data for display based on the reference image
                    const courseCount = Math.floor(Math.random() * 20) + 2;
                    const videoCount = Math.floor(Math.random() * 200) + 20;

                    return (
                        <div
                            key={`${creator.id}-${index}`}
                            className="group relative flex-shrink-0 w-[280px] h-[400px] rounded-xl overflow-hidden cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-600 transition-all duration-300"
                        >
                            {/* Background Image */}
                            <div className="absolute inset-0">
                                <img
                                    src={creator.profile_image}
                                    alt={creator.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {/* Dark Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90"></div>
                            </div>

                            {/* Content Container */}
                            <div className="absolute inset-0 p-5 flex flex-col justify-between">
                                {/* Top: Name */}
                                <div>
                                    <h3 className="text-2xl font-bold text-white leading-tight drop-shadow-md">
                                        {creator.name}
                                    </h3>
                                </div>

                                {/* Bottom: Stats & Button */}
                                <div>
                                    <div className="mb-4">
                                        <p className="text-xs text-slate-300 font-medium mb-1">Full access</p>
                                        <p className="text-3xl font-bold text-white leading-none mb-1 shadow-black drop-shadow-sm">
                                            {courseCount} courses
                                        </p>
                                        <p className="text-3xl font-bold text-white leading-none shadow-black drop-shadow-sm">
                                            {videoCount} videos
                                        </p>
                                    </div>

                                    <button className="w-full bg-white hover:bg-slate-200 text-black text-sm font-bold py-3 px-4 rounded transition-colors shadow-lg">
                                        프로필 보기
                                    </button>
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
