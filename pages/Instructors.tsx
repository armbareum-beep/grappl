import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, CheckCircle, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
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
                                className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer"
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
                                            className="px-3 py-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-bold rounded-lg transition-colors"
                                        >
                                            프로필
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
