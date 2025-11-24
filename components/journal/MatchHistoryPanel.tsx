import React, { useEffect, useState } from 'react';
import { getMatchHistory, type MatchHistory } from '../../lib/api';
import { Trophy, X } from 'lucide-react';

interface MatchHistoryPanelProps {
    userId: string;
}

export const MatchHistoryPanel: React.FC<MatchHistoryPanelProps> = ({ userId }) => {
    const [matches, setMatches] = useState<MatchHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMatches();
    }, [userId]);

    const loadMatches = async () => {
        setLoading(true);
        const { data } = await getMatchHistory(userId, 10);
        if (data) {
            setMatches(data);
        }
        setLoading(false);
    };

    if (loading) {
        return <div className="bg-white rounded-lg shadow p-6">로딩 중...</div>;
    }

    const winRate = matches.length > 0
        ? ((matches.filter(m => m.result === 'win').length / matches.length) * 100).toFixed(1)
        : '0';

    const wins = matches.filter(m => m.result === 'win').length;
    const losses = matches.filter(m => m.result === 'loss').length;

    return (
        <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold mb-4">시합 기록</h3>

            {/* Win Rate Stats */}
            <div className="mb-4 p-4 bg-blue-50 rounded">
                <div className="text-sm text-slate-600">승률</div>
                <div className="text-2xl font-bold text-blue-600">{winRate}%</div>
                <div className="text-xs text-slate-500">
                    {wins}승 {losses}패
                </div>
            </div>

            {/* Match List */}
            {matches.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                    아직 시합 기록이 없습니다
                </div>
            ) : (
                <div className="space-y-2">
                    {matches.map(match => (
                        <div
                            key={match.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded hover:bg-slate-100 transition"
                        >
                            <div className="flex items-center gap-3">
                                {match.result === 'win' ? (
                                    <Trophy className="w-5 h-5 text-yellow-500" />
                                ) : (
                                    <X className="w-5 h-5 text-slate-400" />
                                )}
                                <div>
                                    <div className="font-medium">
                                        vs {match.opponentName} (Lv.{match.opponentLevel})
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {match.winType === 'submission'
                                            ? `서브미션 (${match.submissionType})`
                                            : match.winType === 'points'
                                                ? `포인트 (${match.pointsUser}-${match.pointsOpponent})`
                                                : match.result === 'win'
                                                    ? '승리'
                                                    : '패배'}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm text-slate-500">
                                +{match.xpEarned} XP
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
