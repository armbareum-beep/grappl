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
        <div className="min-h-screen bg-slate-950 text-white pb-20">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-800 py-12 px-4">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-4xl font-black mb-4">
                        World Class <span className="text-blue-500">Instructors</span>
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
                        세계 최고의 블랙벨트 인스트럭터들과 함께 성장하세요.
                    </p>

                    {/* Search */}
                    <div className="max-w-md mx-auto relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="인스트럭터 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-full py-3 pl-12 pr-6 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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
                                className="group relative bg-[#0B0F19] border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all duration-300 cursor-pointer flex flex-col"
                            >
                                {/* Glowing Backlight Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                {/* Card Header Background */}
                                <div className="h-32 bg-gradient-to-b from-slate-900 to-[#0B0F19] relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] to-transparent opacity-80"></div>

                                    {/* Optional Badge */}
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 rounded-full backdrop-blur-sm">
                                        <span className="text-[10px] font-bold text-indigo-400 tracking-wider">INSTRUCTOR</span>
                                    </div>
                                </div>

                                {/* Avatar (Centered) */}
                                <div className="relative -mt-16 flex justify-center mb-4 z-10">
                                    <div className="w-32 h-32 rounded-full p-1 bg-[#0B0F19] ring-4 ring-[#0B0F19] group-hover:ring-indigo-500/30 transition-all duration-300 shadow-xl">
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
                                                    <Shield className="w-12 h-12 text-slate-600" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Content (Centered) */}
                                <div className="px-6 pb-8 flex-1 flex flex-col items-center text-center z-10">
                                    <div className="flex items-center gap-2 mb-2 justify-center">
                                        <h3 className="text-2xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                                            {creator.name}
                                        </h3>
                                        <CheckCircle className="w-5 h-5 text-blue-500 fill-blue-500/10" />
                                    </div>

                                    <p className="text-sm text-slate-400 line-clamp-2 mb-6 max-w-sm leading-relaxed min-h-[40px]">
                                        {creator.bio || 'Grappl 인증 블랙벨트 인스트럭터입니다.'}
                                    </p>

                                    <div className="w-full border-t border-slate-800 pt-6 mt-auto">
                                        <div className="grid grid-cols-4 gap-2 mb-2">
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
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">클래스</span>
                                                <div className="flex items-center gap-1 text-sm font-black text-white">
                                                    <BookOpen className="w-3 h-3 text-indigo-500" />
                                                    <span>5</span>
                                                </div>
                                            </div>

                                            {/* Routines */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">루틴</span>
                                                <div className="flex items-center gap-1 text-sm font-black text-white">
                                                    <Dumbbell className="w-3 h-3 text-indigo-500" />
                                                    <span>3</span>
                                                </div>
                                            </div>

                                            {/* Sparring */}
                                            <div className="flex flex-col items-center">
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">스파링</span>
                                                <div className="flex items-center gap-1 text-sm font-black text-white">
                                                    <Video className="w-3 h-3 text-indigo-500" />
                                                    <span>8</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button className="w-full mt-6 py-3 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn">
                                            <span>프로필 보기</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover/btn:bg-white transition-colors" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-slate-500 text-lg">검색 결과가 없습니다.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
