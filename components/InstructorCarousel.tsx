import React, { useEffect, useState, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Users, BookOpen, Dumbbell, Shield, CheckCircle, Video } from 'lucide-react';
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

interface InstructorCarouselProps {
    searchQuery?: string;
}

const InstructorAvatar: React.FC<{ src: string; name: string }> = ({ src, name }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Shield className="w-10 h-10 text-zinc-600" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={() => setError(true)}
        />
    );
};

export const InstructorCarousel: React.FC<InstructorCarouselProps> = ({ searchQuery = '' }) => {
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);

    const [emblaRef] = useEmblaCarousel({ loop: true, align: 'center' }, [
        Autoplay({ delay: 3000, stopOnInteraction: false })
    ]);

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
                        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('creator_id', creator.id),
                        supabase.from('routines').select('id', { count: 'exact', head: true }).eq('creator_id', creator.id),
                        supabase.from('sparring_videos').select('id', { count: 'exact', head: true }).eq('creator_id', creator.id)
                    ]);

                    return {
                        ...creator,
                        course_count: coursesResult.count || 0,
                        routine_count: routinesResult.count || 0,
                        sparring_count: sparringResult.count || 0
                    };
                })
            );

            setCreators(creatorsWithCounts);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching creators:', error);
            setLoading(false);
        }
    };

    const filteredCreators = useMemo(() => {
        if (!searchQuery) return creators;
        const query = searchQuery.toLowerCase();
        return creators.filter(creator =>
            creator.name.toLowerCase().includes(query) ||
            (creator.bio && creator.bio.toLowerCase().includes(query))
        );
    }, [creators, searchQuery]);

    if (loading) return <div className="text-center text-slate-500 py-12">로딩 중...</div>;

    // If no results specifically from search, show distinct message or just "none found"
    if (creators.length === 0) return <div className="text-center text-slate-500 py-12">등록된 인스트럭터가 없습니다</div>;
    if (filteredCreators.length === 0) return <div className="text-center text-slate-500 py-12">검색 결과가 없습니다</div>;

    return (
        <div className="relative group/carousel max-w-7xl mx-auto px-4 md:px-0">
            {/* Carousel Viewport */}
            <div className="overflow-hidden" ref={emblaRef}>
                <div className="flex -ml-4">
                    {filteredCreators.map((creator) => (
                        <div key={creator.id} className="flex-[0_0_85%] md:flex-[0_0_300px] min-w-0 pl-4">
                            <div
                                onClick={() => window.location.href = `/creator/${creator.id}`}
                                className="relative h-full bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl overflow-hidden hover:border-violet-600/50 hover:shadow-[0_0_30px_-5px_rgba(124,58,237,0.3)] transition-all duration-500 cursor-pointer group"
                            >
                                {/* Card Header / Background */}
                                <div className="h-32 bg-gradient-to-br from-zinc-950 to-zinc-900 relative">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                                    {/* Radial Glow Top Right */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl transform translate-x-10 -translate-y-10 group-hover:bg-violet-500/20 transition-colors"></div>
                                </div>

                                {/* Content Container */}
                                <div className="px-6 pb-6 pt-0 relative">
                                    {/* Avatar (Overlapping Header) */}
                                    <div className="relative -mt-16 mb-4 flex justify-center">
                                        <div className="w-28 h-28 rounded-full p-1 bg-zinc-900 ring-4 ring-zinc-900 group-hover:ring-violet-500/30 transition-all duration-300 shadow-xl relative z-10">
                                            {/* Glow behind headshot */}
                                            <div className="absolute inset-0 bg-violet-600 rounded-full blur-md opacity-0 group-hover:opacity-40 transition-opacity duration-300 -z-10"></div>

                                            <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                                                <InstructorAvatar src={creator.profile_image} name={creator.name} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Name & Bio */}
                                    <div className="text-center mb-6">
                                        <div className="flex items-center gap-2 justify-center mb-1">
                                            <h3 className="text-lg font-bold text-slate-100 group-hover:text-violet-400 transition-colors">
                                                {creator.name}
                                            </h3>
                                            <CheckCircle className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                                        </div>
                                        <p className="text-xs text-slate-400 line-clamp-2 h-[40px] leading-relaxed">
                                            {creator.bio || 'Grappl 인증 블랙벨트 인스트럭터입니다.'}
                                        </p>
                                    </div>

                                    {StatStat(creator)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

function StatStat(creator: Creator) {
    return (
        <div className="grid grid-cols-4 gap-1 py-4 border-t border-zinc-800/50 bg-zinc-900/30 rounded-xl">
            <div className="flex flex-col items-center">
                <Users className="w-3 h-3 text-violet-500 mb-1" />
                <span className="text-xs font-bold text-white">{creator.subscriber_count > 999 ? '999+' : creator.subscriber_count}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider">수련생</span>
            </div>
            <div className="flex flex-col items-center border-l border-zinc-800/50">
                <BookOpen className="w-3 h-3 text-violet-500 mb-1" />
                <span className="text-xs font-bold text-white">{creator.course_count}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider">클래스</span>
            </div>
            <div className="flex flex-col items-center border-l border-zinc-800/50">
                <Dumbbell className="w-3 h-3 text-violet-500 mb-1" />
                <span className="text-xs font-bold text-white">{creator.routine_count}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider">루틴</span>
            </div>
            <div className="flex flex-col items-center border-l border-zinc-800/50">
                <Video className="w-3 h-3 text-violet-500 mb-1" />
                <span className="text-xs font-bold text-white">{creator.sparring_count}</span>
                <span className="text-[8px] text-zinc-500 uppercase tracking-wider">스파링</span>
            </div>
        </div>
    );
}
