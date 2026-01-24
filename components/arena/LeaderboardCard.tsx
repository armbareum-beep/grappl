import React, { useEffect, useState } from 'react';
import { Crown, Medal, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface RankingEntry {
    rank: number;
    userId: string;
    username: string;
    power: number;
    belt: string;
    isCurrentUser?: boolean;
}

interface LeaderboardCardProps {
    rankings?: RankingEntry[];
    currentUserRank?: number;
}

const getRankIcon = (rank: number) => {
    switch (rank) {
        case 1:
            return <Crown className="w-5 h-5 text-yellow-400" />;
        case 2:
            return <Medal className="w-5 h-5 text-slate-300" />;
        case 3:
            return <Medal className="w-5 h-5 text-orange-400" />;
        default:
            return null;
    }
};

const getRankStyle = (rank: number) => {
    switch (rank) {
        case 1:
            return {
                bg: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20',
                border: 'border-yellow-400/50',
                text: 'text-yellow-400',
                glow: 'shadow-lg shadow-yellow-400/20',
            };
        case 2:
            return {
                bg: 'bg-gradient-to-r from-slate-400/20 to-slate-500/20',
                border: 'border-slate-300/50',
                text: 'text-slate-300',
                glow: 'shadow-lg shadow-slate-300/20',
            };
        case 3:
            return {
                bg: 'bg-gradient-to-r from-orange-500/20 to-orange-600/20',
                border: 'border-orange-400/50',
                text: 'text-orange-400',
                glow: 'shadow-lg shadow-orange-400/20',
            };
        default:
            return {
                bg: 'bg-slate-800/30',
                border: 'border-slate-700/50',
                text: 'text-slate-400',
                glow: '',
            };
    }
};

const getBeltName = (beltLevel: number): string => {
    const belts = ['화이트벨트', '블루벨트', '퍼플벨트', '브라운벨트', '블랙벨트'];
    return belts[Math.min(beltLevel, 4)] || '화이트벨트';
};

export const LeaderboardCard: React.FC<LeaderboardCardProps> = () => {
    const { user } = useAuth();
    const [rankings, setRankings] = useState<RankingEntry[]>([]);
    const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
    const [currentUserPower, setCurrentUserPower] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRankings();
    }, [user]);

    const fetchRankings = async () => {
        try {
            // Fetch top 10 users by combat_power
            const { data: topUsers, error: topError } = await supabase
                .from('users')
                .select('id, email, combat_power, belt_level')
                .order('combat_power', { ascending: false })
                .limit(10);

            if (topError) throw topError;

            // Transform data to RankingEntry format
            const rankingEntries: RankingEntry[] = (topUsers || []).map((u, index) => ({
                rank: index + 1,
                userId: u.id,
                username: u.email?.split('@')[0] || '익명',
                power: u.combat_power || 0,
                belt: getBeltName(u.belt_level || 0),
                isCurrentUser: user?.id === u.id,
            }));

            setRankings(rankingEntries);

            // If current user is in top 10, we already have their rank
            const userInTop10 = rankingEntries.find(r => r.isCurrentUser);
            if (userInTop10) {
                setCurrentUserRank(userInTop10.rank);
                setCurrentUserPower(userInTop10.power);
            } else if (user) {
                // Calculate current user's rank
                const { error: countError } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true })
                    .gt('combat_power', 0); // Users with higher power than current user

                if (!countError) {
                    // Get current user's power
                    const { data: userData } = await supabase
                        .from('users')
                        .select('combat_power')
                        .eq('id', user.id)
                        .single();

                    if (userData) {
                        setCurrentUserPower(userData.combat_power || 0);
                        
                        // Count users with higher power
                        const { count: higherCount } = await supabase
                            .from('users')
                            .select('*', { count: 'exact', head: true })
                            .gt('combat_power', userData.combat_power || 0);

                        setCurrentUserRank((higherCount || 0) + 1);
                    }
                }
            }

            setLoading(false);
        } catch (error) {
            console.error('Error fetching rankings:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="leaderboard-card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 border border-blue-500/20 shadow-2xl">
                <div className="text-center text-slate-400">로딩 중...</div>
            </div>
        );
    }

    return (
        <div className="leaderboard-card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 border border-blue-500/20 shadow-2xl relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-transparent pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl"></div>

            {/* Header */}
            <div className="relative z-10 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                    글로벌 랭킹
                </h2>
                <p className="text-sm text-slate-400 mt-1">TOP 10 전사들</p>
            </div>

            {/* Rankings List */}
            <div className="relative z-10 space-y-3">
                {rankings.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                        아직 랭킹 데이터가 없습니다
                    </div>
                ) : (
                    rankings.map((entry, index) => {
                        const style = getRankStyle(entry.rank);
                        const isTopThree = entry.rank <= 3;

                        return (
                            <div
                                key={entry.userId}
                                className={`
                                ranking-entry flex items-center gap-4 p-3 rounded-xl border transition-all duration-300
                                ${style.bg} ${style.border} ${style.glow}
                                ${entry.isCurrentUser ? 'ring-2 ring-green-400' : ''}
                                ${isTopThree ? 'hover:scale-105 cursor-pointer' : 'hover:bg-slate-700/30'}
                            `}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {/* Rank */}
                                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${isTopThree ? style.bg : 'bg-slate-700/50'} ${style.border} border font-bold ${style.text}`}>
                                    {getRankIcon(entry.rank) || entry.rank}
                                </div>

                                {/* User Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white truncate">
                                            {entry.username}
                                        </span>
                                        {entry.isCurrentUser && (
                                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-400/30">
                                                나
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400">{entry.belt}</div>
                                </div>

                                {/* Power */}
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${isTopThree ? style.text : 'text-white'}`}>
                                        {entry.power.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-slate-500">전투력</div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Current User Rank (if not in top 10) */}
            {currentUserRank && currentUserRank > 10 && (
                <div className="relative z-10 mt-4 pt-4 border-t border-slate-700">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-green-500/10 border border-green-400/30">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/20 border border-green-400/50 font-bold text-green-400">
                            {currentUserRank}
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold text-white flex items-center gap-2">
                                나의 순위
                                <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-400/30">
                                    현재
                                </span>
                            </div>
                            <div className="text-xs text-slate-400">계속 노력하세요!</div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold text-green-400">{currentUserPower.toLocaleString()}</div>
                            <div className="text-xs text-slate-500">전투력</div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes ranking-slide-in {
                    from {
                        opacity: 0;
                        transform: translateX(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                .ranking-entry {
                    animation: ranking-slide-in 0.5s ease-out forwards;
                    opacity: 0;
                }

                .ranking-entry:hover {
                    transform: translateX(4px);
                }
            `}</style>
        </div>
    );
};
