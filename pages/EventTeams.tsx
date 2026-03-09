import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Calendar, Users, Trophy, CheckCircle, Search, ArrowRight } from 'lucide-react';
import { LoadingScreen } from '../components/LoadingScreen';
import { fetchActiveBrands } from '../lib/api-organizers';
import { EventBrand } from '../types';

export const EventTeams: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [teams, setTeams] = useState<EventBrand[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function fetchData() {
            try {
                const data = await fetchActiveBrands();
                setTeams(data);
            } catch (error) {
                console.error('Error loading event teams:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    if (loading) {
        return <LoadingScreen message="이벤트 팀 불러오는 중..." />;
    }

    const filteredTeams = teams.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header */}
            <div className="bg-gradient-to-b from-amber-900/20 to-zinc-950 border-b border-zinc-800/50">
                <div className="max-w-6xl mx-auto px-4 py-12">
                    <div className="flex items-center gap-3 mb-4">
                        <Flag className="w-8 h-8 text-amber-500" />
                        <h1 className="text-3xl font-black">이벤트 팀</h1>
                    </div>
                    <p className="text-zinc-400 max-w-2xl">
                        시합, 세미나, 오픈매트를 주최하는 팀들을 둘러보세요.
                    </p>

                    {/* Search */}
                    <div className="mt-6 max-w-md">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="팀 이름으로 검색..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {filteredTeams.length === 0 ? (
                    <div className="text-center py-16">
                        <Flag className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-zinc-400 mb-2">
                            {searchQuery ? '검색 결과가 없습니다' : '등록된 이벤트 팀이 없습니다'}
                        </h2>
                        <p className="text-zinc-500 mb-6">
                            {searchQuery ? '다른 검색어로 시도해보세요.' : '첫 번째 이벤트 팀이 되어보세요!'}
                        </p>
                        {!searchQuery && (
                            <Link
                                to="/become-organizer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors"
                            >
                                <Flag className="w-5 h-5" />
                                주최자 신청하기
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredTeams.map((team) => (
                            <Link
                                key={team.id}
                                to={`/event-team/${team.slug || team.id}`}
                                className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-amber-500/50 transition-all"
                            >
                                {/* Cover */}
                                <div className="h-32 bg-gradient-to-br from-amber-900/30 to-zinc-900 relative">
                                    {team.coverImage && (
                                        <img
                                            src={team.coverImage}
                                            alt={team.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />

                                    {/* Logo */}
                                    <div className="absolute -bottom-8 left-4">
                                        <div className="w-16 h-16 bg-zinc-800 border-4 border-zinc-900 rounded-xl overflow-hidden">
                                            {team.logo ? (
                                                <img
                                                    src={team.logo}
                                                    alt={team.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-500">
                                                    {team.name.charAt(0)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="pt-10 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <h3 className="font-bold text-lg group-hover:text-amber-400 transition-colors">
                                            {team.name}
                                        </h3>
                                        {team.verified && (
                                            <CheckCircle className="w-4 h-4 text-amber-500" />
                                        )}
                                    </div>

                                    {team.description && (
                                        <p className="text-sm text-zinc-400 line-clamp-2 mb-4">
                                            {team.description}
                                        </p>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {team.totalEvents || 0} 이벤트
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Users className="w-3.5 h-3.5" />
                                            {team.totalParticipants || 0} 참가자
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}

                {/* CTA */}
                {filteredTeams.length > 0 && (
                    <div className="mt-12 text-center">
                        <div className="inline-flex flex-col items-center p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                            <Trophy className="w-10 h-10 text-amber-500 mb-4" />
                            <h3 className="text-lg font-bold mb-2">이벤트를 주최하고 싶으신가요?</h3>
                            <p className="text-zinc-400 text-sm mb-4">
                                무료로 시작하고 무제한 이벤트를 만들어보세요.
                            </p>
                            <Link
                                to="/become-organizer"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl transition-colors"
                            >
                                주최자 신청하기
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
