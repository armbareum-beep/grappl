import React, { useEffect, useState } from 'react';
import { Users, Shield, CheckCircle, BookOpen, Dumbbell, Video } from 'lucide-react';
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
                        onClick={() => window.location.href = `/creator/${creator.id}`}
                        className="group relative flex-shrink-0 w-[280px] bg-[#0B0F19] border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer flex flex-col"
                    >
                        {/* Glowing Backlight Effect on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                        {/* Card Header Background */}
                        <div className="h-28 bg-gradient-to-b from-slate-900 to-[#0B0F19] relative overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] to-transparent opacity-80"></div>
                        </div>

                        {/* Avatar (Centered) */}
                        <div className="relative -mt-14 flex justify-center mb-3 z-10">
                            <div className="w-28 h-28 rounded-full p-1 bg-[#0B0F19] ring-4 ring-[#0B0F19] group-hover:ring-indigo-500/30 transition-all duration-300 shadow-xl">
                                <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 relative">
                                    {creator.profile_image ? (
                                        <img
                                            src={creator.profile_image}
                                            alt={creator.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                            <Shield className="w-10 h-10 text-slate-600" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Content (Centered) */}
                        <div className="px-5 pb-6 flex-1 flex flex-col items-center text-center z-10">
                            <div className="flex items-center gap-2 mb-1 justify-center">
                                <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                    {creator.name}
                                </h3>
                                <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500/10" />
                            </div>

                            <p className="text-xs text-slate-400 line-clamp-2 mb-5 max-w-[240px] leading-relaxed min-h-[36px]">
                                {creator.bio || 'Grappl 인증 블랙벨트 인스트럭터입니다.'}
                            </p>

                            <div className="w-full border-t border-slate-800 pt-4 mt-auto">
                                <div className="grid grid-cols-4 gap-1 mb-1">
                                    {/* Students */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">수련생</span>
                                        <div className="flex items-center gap-1 text-sm font-black text-white">
                                            <Users className="w-3 h-3 text-indigo-500" />
                                            <span>{creator.subscriber_count.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Courses */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">강좌</span>
                                        <div className="flex items-center gap-1 text-sm font-black text-white">
                                            <BookOpen className="w-3 h-3 text-indigo-500" />
                                            <span>{creator.course_count}</span>
                                        </div>
                                    </div>

                                    {/* Routines */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">루틴</span>
                                        <div className="flex items-center gap-1 text-sm font-black text-white">
                                            <Dumbbell className="w-3 h-3 text-indigo-500" />
                                            <span>{creator.routine_count}</span>
                                        </div>
                                    </div>

                                    {/* Sparring */}
                                    <div className="flex flex-col items-center">
                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">스파링</span>
                                        <div className="flex items-center gap-1 text-sm font-black text-white">
                                            <Video className="w-3 h-3 text-indigo-500" />
                                            <span>{creator.sparring_count}</span>
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
