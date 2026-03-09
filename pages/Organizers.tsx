import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, CheckCircle, Search, Trophy, Users, MapPin } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchOrganizers } from '../lib/api-organizers';
import { Creator } from '../types';

const MOBILE_PAGE_SIZE = 5;

const OrganizerAvatar: React.FC<{ src: string; name: string }> = ({ src, name }) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <Calendar className="w-12 h-12 text-zinc-600" />
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

export const Organizers: React.FC = () => {
    const navigate = useNavigate();
    const [organizers, setOrganizers] = useState<Creator[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const loadOrganizers = async () => {
            try {
                const data = await fetchOrganizers();
                setOrganizers(data);
            } catch (error) {
                console.error('Failed to load organizers:', error);
            } finally {
                setLoading(false);
            }
        };
        loadOrganizers();
    }, []);

    const filteredOrganizers = useMemo(() => {
        return organizers.filter(org =>
            org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            org.bio?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [organizers, searchTerm]);

    const totalPages = Math.ceil(filteredOrganizers.length / MOBILE_PAGE_SIZE);

    const displayedOrganizers = useMemo(() => {
        if (!isMobile) return filteredOrganizers;
        const start = currentPage * MOBILE_PAGE_SIZE;
        return filteredOrganizers.slice(start, start + MOBILE_PAGE_SIZE);
    }, [filteredOrganizers, isMobile, currentPage]);

    useEffect(() => {
        setCurrentPage(0);
    }, [searchTerm]);

    if (loading) {
        return <LoadingScreen message="주최자 목록 불러오는 중..." />;
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="relative bg-zinc-900 border-b border-zinc-800 py-16 px-4 overflow-hidden">
                <div className="absolute inset-0 bg-amber-600/5 blur-[100px] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
                        Event <span className="text-amber-500">Organizers</span>
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                        시합, 세미나, 오픈매트를 주최하는<br className="hidden md:block" />
                        검증된 주최자들을 만나보세요.
                    </p>

                    {/* Search */}
                    <div className="max-w-md mx-auto relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-amber-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="주최자 검색..."
                            aria-label="주최자 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-zinc-950/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-6 text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10 transition-all backdrop-blur-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="max-w-7xl mx-auto px-4 py-12">
                {filteredOrganizers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayedOrganizers.map((organizer) => (
                            <div
                                key={organizer.id}
                                onClick={() => navigate(`/organizer/${organizer.id}`)}
                                className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-amber-500/50 hover:shadow-[0_0_30px_rgba(245,158,11,0.15)] transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
                            >
                                {/* Glowing Backlight Effect on Hover */}
                                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                                {/* Card Header Background */}
                                <div className="h-32 bg-gradient-to-b from-zinc-800 to-zinc-900 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-amber-900/20 via-transparent to-transparent opacity-50"></div>

                                    {/* Badge */}
                                    <div className="absolute top-4 right-4 px-3 py-1 bg-zinc-950/50 border border-amber-500/30 rounded-full backdrop-blur-sm">
                                        <span className="text-[10px] font-bold text-amber-300 tracking-wider">ORGANIZER</span>
                                    </div>
                                </div>

                                {/* Avatar (Centered) */}
                                <div className="relative -mt-16 flex justify-center mb-4 z-10">
                                    <div className="w-32 h-32 rounded-full p-1 bg-zinc-900 ring-4 ring-zinc-900 group-hover:ring-amber-500/30 transition-all duration-300 shadow-xl">
                                        <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800 relative">
                                            <OrganizerAvatar src={organizer.profileImage || ''} name={organizer.name} />
                                        </div>
                                    </div>
                                </div>

                                {/* Content (Centered) */}
                                <div className="px-6 pb-8 flex-1 flex flex-col items-center text-center z-10">
                                    <div className="flex items-center gap-2 mb-3 justify-center">
                                        <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                                            {organizer.name}
                                        </h3>
                                        {organizer.verifiedOrganizer && (
                                            <CheckCircle className="w-5 h-5 text-amber-500 fill-amber-500/10" />
                                        )}
                                    </div>

                                    <p className="text-sm text-zinc-400 line-clamp-2 mb-8 max-w-sm leading-relaxed min-h-[40px] px-2">
                                        {organizer.bio || 'Grappl 인증 이벤트 주최자입니다.'}
                                    </p>

                                    <div className="w-full pt-6 mt-auto border-t border-zinc-800/50">
                                        <div className="grid grid-cols-3 gap-2 mb-6">
                                            {/* Events Hosted */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">이벤트</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <Trophy className="w-3 h-3 text-amber-500" />
                                                    <span>{organizer.totalEventsHosted || 0}</span>
                                                </div>
                                            </div>

                                            {/* Subscribers/Followers */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">팔로워</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <Users className="w-3 h-3 text-amber-500" />
                                                    <span>{(organizer.subscriberCount || 0) > 9999 ? '9.9k+' : (organizer.subscriberCount || 0).toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Location placeholder */}
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">지역</span>
                                                <div className="flex items-center gap-1 text-sm font-bold text-zinc-200">
                                                    <MapPin className="w-3 h-3 text-amber-500" />
                                                    <span>-</span>
                                                </div>
                                            </div>
                                        </div>

                                        <button className="w-full py-4 bg-zinc-800/50 hover:bg-amber-600 text-zinc-300 hover:text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group/btn border border-zinc-800 hover:border-amber-500 hover:shadow-lg hover:shadow-amber-900/20">
                                            <span>프로필 보기</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover/btn:bg-white transition-colors" />
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

                {/* Mobile Pagination */}
                {isMobile && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                        {Array.from({ length: totalPages }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => setCurrentPage(i)}
                                className={`w-10 h-10 rounded-full text-sm font-bold transition-all duration-200 ${
                                    currentPage === i
                                        ? 'bg-amber-600 text-white'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                            >
                                {i + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
