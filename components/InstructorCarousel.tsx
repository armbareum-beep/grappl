import React, { useEffect, useState } from 'react';
import { Users, Shield, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
    course_count: number;
    routine_count: number;
    sparring_count: number;
}

export const InstructorCarousel: React.FC = () => {
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCreators();
    }, []);

    const fetchCreators = async () => {
        try {
            // Fetch creators with course count
            const { data: creatorsData, error: creatorsError } = await supabase
                .from('creators')
                .select('id, name, bio, profile_image, subscriber_count')
                .eq('approved', true)
                .order('subscriber_count', { ascending: false });

            if (creatorsError) throw creatorsError;

            // Get course, routine, and sparring counts for each creator
            const creatorsWithCounts = await Promise.all(
                (creatorsData || []).map(async (creator) => {
                    const [coursesResult, routinesResult, sparringResult] = await Promise.all([
                        supabase
                            .from('courses')
                            .select('id', { count: 'exact', head: true })
                            .eq('creator_id', creator.id),
                        supabase
                            .from('routines')
                            .select('id', { count: 'exact', head: true })
                            .eq('creator_id', creator.id),
                        supabase
                            .from('sparring_videos')
                            .select('id', { count: 'exact', head: true })
                            .eq('creator_id', creator.id)
                    ]);

                    return {
                        ...creator,
                        course_count: coursesResult.count || 0,
                        routine_count: routinesResult.count || 0,
                        sparring_count: sparringResult.count || 0
                    };
                })
            );

            // Randomize the data
            const shuffledData = creatorsWithCounts.sort(() => Math.random() - 0.5);

            // Duplicate for infinite scroll (Triple for smoother 33% scroll)
            const duplicatedData = [...shuffledData, ...shuffledData, ...shuffledData];
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
                        onClick={() => window.location.href = `/creator/${creator.id}`}
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
                                <div className="flex gap-3">
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">강좌</span>
                                        <div className="text-sm font-bold text-indigo-400">
                                            {creator.course_count}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">루틴</span>
                                        <div className="text-sm font-bold text-indigo-400">
                                            {creator.routine_count}
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">스파링</span>
                                        <div className="text-sm font-bold text-indigo-400">
                                            {creator.sparring_count}
                                        </div>
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
                    animation: scroll-left 20s linear infinite;
                    width: max-content;
                }
                @media (max-width: 768px) {
                    .instructor-scroll-container {
                        animation: scroll-left 15s linear infinite;
                    }
                }
                .instructor-scroll-container:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};
