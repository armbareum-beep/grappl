import React from 'react';
import { History, Award, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface MatchRecord {
    id: string;
    date: string;
    opponent: string;
    result: 'win' | 'loss' | 'draw';
    powerChange: number;
}

interface MatchHistoryCardProps {
    matches?: MatchRecord[];
    totalMatches?: number;
    wins?: number;
    losses?: number;
    draws?: number;
}

const DEFAULT_MATCHES: MatchRecord[] = [
    // Empty by default - showing no recent matches
];

export const MatchHistoryCard: React.FC<MatchHistoryCardProps> = ({
    matches = DEFAULT_MATCHES,
    totalMatches = 0,
    wins = 0,
    losses = 0,
    draws: _draws = 0,
}) => {
    const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : 0;

    const getResultStyle = (result: 'win' | 'loss' | 'draw') => {
        switch (result) {
            case 'win':
                return {
                    bg: 'bg-green-500/20',
                    border: 'border-green-400/50',
                    text: 'text-green-400',
                    label: '승리',
                };
            case 'loss':
                return {
                    bg: 'bg-red-500/20',
                    border: 'border-red-400/50',
                    text: 'text-red-400',
                    label: '패배',
                };
            case 'draw':
                return {
                    bg: 'bg-slate-500/20',
                    border: 'border-slate-400/50',
                    text: 'text-slate-400',
                    label: '무승부',
                };
        }
    };

    return (
        <div className="match-history-card bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 border border-purple-500/20 shadow-2xl relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-pink-600/5 to-transparent pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl"></div>

            {/* Header */}
            <div className="relative z-10 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-purple-400" />
                    시합 기록
                </h2>
                <p className="text-sm text-slate-400 mt-1">나의 전투 히스토리</p>
            </div>

            {/* Stats Overview */}
            <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {/* Win Rate */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1">승률</div>
                    <div className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400">
                        {winRate}%
                    </div>
                </div>

                {/* Wins */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        승리
                    </div>
                    <div className="text-2xl font-bold text-green-400">{wins}</div>
                </div>

                {/* Losses */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1">패배</div>
                    <div className="text-2xl font-bold text-red-400">{losses}</div>
                </div>

                {/* Total */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1">총 경기</div>
                    <div className="text-2xl font-bold text-white">{totalMatches}</div>
                </div>
            </div>

            {/* Match History Timeline */}
            <div className="relative z-10">
                <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    최근 경기
                </h3>

                {matches.length === 0 ? (
                    // Empty State
                    <div className="text-center py-12">
                        <div className="w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                            <History className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-slate-500 font-medium mb-2">최근 경기 없음</p>
                        <p className="text-sm text-slate-600">
                            토너먼트에 참가하여 첫 경기를 시작하세요!
                        </p>
                    </div>
                ) : (
                    // Match List
                    <div className="space-y-3">
                        {matches.map((match, index) => {
                            const style = getResultStyle(match.result);
                            return (
                                <div
                                    key={match.id}
                                    className={`
                                        match-record flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
                                        ${style.bg} ${style.border} hover:scale-[1.02] cursor-pointer
                                    `}
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Result Badge */}
                                    <div className={`flex items-center justify-center w-16 h-16 rounded-lg ${style.bg} ${style.border} border-2 font-bold ${style.text}`}>
                                        {match.result === 'win' && <Award className="w-8 h-8" />}
                                        {match.result === 'loss' && <span className="text-2xl">✕</span>}
                                        {match.result === 'draw' && <span className="text-2xl">=</span>}
                                    </div>

                                    {/* Match Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-xs font-bold uppercase ${style.text}`}>
                                                {style.label}
                                            </span>
                                            <span className="text-xs text-slate-500">vs {match.opponent}</span>
                                        </div>
                                        <div className="text-xs text-slate-400">{match.date}</div>
                                    </div>

                                    {/* Power Change */}
                                    <div className="text-right">
                                        <div className={`flex items-center gap-1 text-sm font-bold ${match.powerChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {match.powerChange >= 0 ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                            {match.powerChange >= 0 ? '+' : ''}{match.powerChange}
                                        </div>
                                        <div className="text-xs text-slate-500">전투력</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes match-slide-in {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .match-record {
                    animation: match-slide-in 0.5s ease-out forwards;
                    opacity: 0;
                }
            `}</style>
        </div>
    );
};
