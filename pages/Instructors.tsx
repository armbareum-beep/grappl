import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, CheckCircle, Search, BookOpen, Dumbbell, Video } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { LoadingScreen } from '../components/LoadingScreen';

interface Creator {
    id: string;
    name: string;
    bio: string;
    profile_image: string;
    subscriber_count: number;
}

export const Instructors: React.FC = () => {
    const navigate = useNavigate();
    const [creators, setCreators] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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
            setCreators(data || []);
        } catch (error) {
            console.error('Error fetching creators:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCreators = creators.filter(creator =>
        creator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <LoadingScreen message="인스트럭터 목록 불러오는 중..." />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-20">
            {/* Header */}
            <div className="relative bg-zinc-900 border-b border-zinc-800 py-16 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-violet-600/5 blur-[100px] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                        World Class <span className="text-violet-500">Instructors</span>
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        세계 최고의 블랙벨트 인스트럭터들과 함께 성장하세요.<br className="hidden md:block" />
                        검증된 기술과 노하우를 가장 체계적으로 전달합니다.
                    </p>

                    {/* Search */}
                    <div className="max-w-md mx-auto relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="인스트럭터 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10 transition-all backdrop-blur-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                {filteredCreators.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredCreators.map((creator) => (
                            <div
                                key={creator.id}
                                onClick={() => navigate(`/creator/${creator.id}`)}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-violet-500/50 hover:shadow-[0_0_30px_rgba(124,58,237,0.15)] transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
                            >
                                {/* Glowing Backlight Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                {/* Card Header Background */}
                                <div className="h-32 bg-gradient-to-b from-zinc-800 to-zinc-900 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-transparent to-transparent opacity-50"></div>

                                    {/* Optional Badge */}
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-zinc-950/50 border border-violet-500/30 rounded-full backdrop-blur-sm">
                                        <span className="text-[10px] font-bold text-violet-300 tracking-wider">INSTRUCTOR</span>
                                    </div>
                                </div>

                                {/* Avatar (Centered) */}
                                <div className="relative -mt-16 flex justify-center mb-4 z-10">
                                    <div className="w-32 h-32 rounded-full p-1 bg-zinc-900 ring-4 ring-zinc-900 group-hover:ring-violet-500/30 transition-all duration-300 shadow-xl">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 relative">
                                            {creator.profile_image ? (
                                                <img
                                                    src={creator.profile_image}
                                                    alt={creator.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                                    <Shield className="w-12 h-12 text-zinc-600" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Content (Centered) */}
                                <div className="px-6 pb-8 flex-1 flex flex-col items-center text-center z-10">
                                    <div className="flex items-center gap-2 mb-3 justify-center">
                                        <h3 className="text-2xl font-bold text-white group-hover:text-violet-400 transition-colors">
                                            {creator.name}
                                        </h3>
                                        <CheckCircle className="w-5 h-5 text-violet-500 fill-violet-500/10" />
                                    </div>

                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-8 max-w-sm leading-relaxed min-h-[40px] px-2">
                                        {creator.bio || 'Grappl 인증 블랙벨트 인스트럭터입니다.'}
                                    </p>

                                    <div className="w-full pt-6 mt-auto border-t border-zinc-800/50">
                                        <div className="grid grid-cols-4 gap-2 mb-6">
                                            {/* Students */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">수련생</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <Users className="w-3 h-3 text-violet-500" />
                                                    <span>{creator.subscriber_count > 9999 ? '9.9k+' : creator.subscriber_count.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Courses */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">클래스</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <BookOpen className="w-3 h-3 text-violet-500" />
                                                    <span>5</span>
                                                </div>
                                            </div>

                                            {/* Routines */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">루틴</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <Dumbbell className="w-3 h-3 text-violet-500" />
                                                    <span>3</span>
                                                </div>
                                            </div>

                                            {/* Sparring */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">스파링</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <Video className="w-3 h-3 text-violet-500" />
                                                    <span>8</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button className="w-full py-4 bg-zinc-800/50 hover:bg-violet-600 text-zinc-300 hover:text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn border border-zinc-800 hover:border-violet-500 hover:shadow-lg hover:shadow-violet-900/20">
                                            <span>프로필 보기</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-violet-400 group-hover/btn:bg-white transition-colors" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-32 bg-zinc-900/30 rounded-[2rem] border border-zinc-800/50 border-dashed">
                        <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-zinc-300 mb-2">검색 결과가 없습니다</h3>
                        <p className="text-zinc-500">다른 키워드로 검색해보세요.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
