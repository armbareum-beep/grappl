import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Crown, Trophy, User } from 'lucide-react';

interface LeaderboardUser {
    id: string;
    rank: number;
    name: string;
    avatar_url: string | null;
    total_xp: number;
    streak?: number;
}

export const LeaderboardPanel: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
    const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [myRankInfo, setMyRankInfo] = useState<{ rank: number | string, xp: number } | null>(null);

    useEffect(() => {
        const fetchLeaders = async () => {
            try {
                // 1. Calculate Start of Week (Monday 00:00)
                const now = new Date();
                const day = now.getDay(); // 0 (Sun) - 6 (Sat)
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
                const monday = new Date(now.setDate(diff));
                monday.setHours(0, 0, 0, 0);
                const startOfWeekISO = monday.toISOString();

                // 2. Fetch XP Transactions for this week
                const { data: transactions, error } = await supabase
                    .from('xp_transactions')
                    .select(`
                        amount,
                        user_id,
                        users (
                            name,
                            avatar_url
                        )
                    `)
                    .gte('created_at', startOfWeekISO);

                if (error) throw error;

                // 3. Aggregate XP by User
                const userXpMap = new Map<string, { total_xp: number, user: any }>();

                transactions?.forEach((tx: any) => {
                    const userId = tx.user_id;
                    const amount = tx.amount;
                    const userInfo = tx.users;

                    // Skip if user data is missing (deleted users?)
                    if (!userInfo) return;

                    if (!userXpMap.has(userId)) {
                        userXpMap.set(userId, {
                            total_xp: 0,
                            user: {
                                id: userId,
                                name: userInfo.name || 'Unknown',
                                avatar_url: userInfo.avatar_url,
                            }
                        });
                    }

                    const current = userXpMap.get(userId)!;
                    current.total_xp += amount;
                });

                // 4. Convert to Array and Sort
                const sortedLeaders = Array.from(userXpMap.values())
                    .sort((a, b) => b.total_xp - a.total_xp)
                    .map((item, index) => ({
                        id: item.user.id,
                        rank: index + 1,
                        name: item.user.name,
                        avatar_url: item.user.avatar_url,
                        total_xp: item.total_xp
                    }));

                // 5. Update State (Top 5)
                setLeaders(sortedLeaders.slice(0, 5));

                // 6. Find My Rank
                const myEntryIndex = sortedLeaders.findIndex(l => l.id === currentUserId);
                if (myEntryIndex !== -1) {
                    setMyRankInfo({
                        rank: myEntryIndex + 1,
                        xp: sortedLeaders[myEntryIndex].total_xp
                    });
                } else {
                    // If not in the list (no XP this week), check if they have any XP 
                    // For now, simpler to say "Not Ranked" or 0 XP
                    setMyRankInfo({ rank: '-', xp: 0 });
                }

            } catch (err) {
                console.error('Error fetching leaderboard:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaders();
    }, [currentUserId]);

    if (loading) return <div className="animate-pulse h-full bg-slate-900 rounded-xl"></div>;

    // Calculate max XP for progress bar scaling (avoid div by zero)
    const topXP = leaders.length > 0 ? leaders[0].total_xp : 100;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-full flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    주간 랭킹
                </h3>
                <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">TOP 5</span>
            </div>

            <div className="flex-1 space-y-2 relative z-10 overflow-hidden">
                {leaders.length > 0 ? (
                    leaders.map((user) => (
                        <div
                            key={user.id}
                            className={`flex items-center gap-3 p-2 rounded-lg border transition-all ${user.id === currentUserId
                                ? 'bg-indigo-500/10 border-indigo-500/30'
                                : 'bg-slate-950/30 border-slate-800/50 hover:border-slate-700'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${user.rank === 1 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' :
                                user.rank === 2 ? 'bg-slate-300 text-slate-900' :
                                    user.rank === 3 ? 'bg-amber-700 text-amber-100' :
                                        'bg-slate-800 text-slate-500'
                                }`}>
                                {user.rank <= 3 ? <Crown className="w-3 h-3" /> : user.rank}
                            </div>

                            {/* Avatar */}
                            <div className="w-8 h-8 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-700">
                                {user.avatar_url ? (
                                    <img src={user.avatar_url} alt={user.name} loading="lazy" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                )}
                            </div>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold truncate ${user.id === currentUserId ? 'text-indigo-300' : 'text-slate-300'}`}>
                                        {user.name}
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                        {user.total_xp.toLocaleString()} XP
                                    </span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${user.rank === 1 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${(user.total_xp / topXP) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                        <Trophy className="w-8 h-8 mb-2 opacity-20" />
                        <p>이번 주 랭킹 데이터가 없습니다.</p>
                        <p className="text-[10px] mt-1">수련을 시작하여 첫 번째 랭커가 되세요!</p>
                    </div>
                )}
            </div>

            {/* My Rank Summary */}
            <div className="mt-auto pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">내 주간 순위</span>
                <span className="text-white font-bold flex items-center gap-2">
                    {myRankInfo ? (
                        <>
                            <span className={myRankInfo.rank === '-' ? 'text-slate-500' : 'text-indigo-400'}>
                                {typeof myRankInfo.rank === 'number' ? `${myRankInfo.rank}위` : '순위 밖'}
                            </span>
                            <span className="text-[10px] text-slate-500">({myRankInfo.xp} XP)</span>
                        </>
                    ) : (
                        'Checking...'
                    )}
                </span>
            </div>
        </div>
    );
};
