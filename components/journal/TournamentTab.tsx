import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserStats, getLeaderboard } from '../../lib/api';
import { Trophy, Swords, Zap, Crown, Medal, BookOpen } from 'lucide-react';

interface Stats {
    Standing: number;
    Guard: number;
    'Guard Pass': number;
    Side: number;
    Mount: number;
    Back: number;
    logCount: number;
    total: number;
}

interface LeaderboardEntry {
    userId: string;
    userName: string;
    score: number;
    stats: Stats;
}

export const TournamentTab: React.FC = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [userRank, setUserRank] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [matchLog, setMatchLog] = useState<string[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [tournamentResult, setTournamentResult] = useState<'win' | 'loss' | null>(null);

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);

        const [statsRes, leaderboardRes] = await Promise.all([
            getUserStats(user.id),
            getLeaderboard()
        ]);

        if (statsRes.data) setStats(statsRes.data);
        if (leaderboardRes.data) {
            setLeaderboard(leaderboardRes.data.slice(0, 10)); // Top 10
            const myRank = leaderboardRes.data.findIndex(entry => entry.userId === user.id);
            if (myRank !== -1) setUserRank(myRank + 1);
        }

        setLoading(false);
    };

    const simulateMatch = async () => {
        if (!stats) return;
        setIsPlaying(true);
        setMatchLog([]);
        setTournamentResult(null);

        const opponentStats = {
            Standing: Math.floor(Math.random() * 20) + 5,
            Guard: Math.floor(Math.random() * 20) + 5,
            'Guard Pass': Math.floor(Math.random() * 20) + 5,
            Side: Math.floor(Math.random() * 20) + 5,
            Mount: Math.floor(Math.random() * 20) + 5,
            Back: Math.floor(Math.random() * 20) + 5,
        };

        const logs: string[] = [];
        let playerScore = 0;
        let opponentScore = 0;

        // Strict Match Scenarios
        const scenarios = [
            { name: '스탠딩 대결', player: 'Standing', opponent: 'Standing' },
            { name: '가드 vs 패스', player: 'Guard', opponent: 'Guard Pass' }, // Player is Guard
            { name: '패스 vs 가드', player: 'Guard Pass', opponent: 'Guard' }, // Player is Passer
            { name: '사이드 탈출', player: 'Side', opponent: 'Side' }, // Both fighting for position
            { name: '마운트 탈출', player: 'Mount', opponent: 'Mount' },
            { name: '백 탈출/공격', player: 'Back', opponent: 'Back' }
        ];

        // Simulate 3 rounds
        for (let i = 1; i <= 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 800));

            // Randomly select a scenario
            const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

            const playerVal = stats[scenario.player as keyof Stats];
            const opponentVal = (opponentStats as any)[scenario.opponent];

            const playerRoll = (Math.random() * playerVal);
            const opponentRoll = (Math.random() * opponentVal);

            logs.push(`Round ${i}: ${scenario.name} (${scenario.player} vs ${scenario.opponent})`);

            if (playerRoll > opponentRoll) {
                playerScore++;
                logs.push(`✅ 승리! 당신의 기술이 더 정교했습니다!`);
            } else {
                opponentScore++;
                logs.push(`❌ 패배... 상대방이 우세했습니다.`);
            }
            setMatchLog([...logs]);
        }

        await new Promise(resolve => setTimeout(resolve, 500));

        if (playerScore > opponentScore) {
            setTournamentResult('win');
            logs.push('🏆 경기 종료: 승리! 토너먼트 우승!');
        } else if (playerScore < opponentScore) {
            setTournamentResult('loss');
            logs.push('❌ 경기 종료: 패배... 더 수련하고 오세요.');
        } else {
            setTournamentResult('loss'); // Draw counts as loss
            logs.push('⚖️ 무승부 (판정패)');
        }
        setMatchLog([...logs]);
        setIsPlaying(false);
    };

    if (loading) return <div className="p-8 text-center">로딩 중...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4">
            <div className="mb-12 text-center">
                <h2 className="text-4xl font-bold text-slate-900 mb-4 flex items-center justify-center gap-3">
                    <Trophy className="w-10 h-10 text-yellow-500" />
                    시합장 (Competition Arena)
                </h2>
                <p className="text-lg text-slate-600">
                    수련일지와 스킬 트리로 강해지세요! 실제 상황과 같은 치열한 승부!
                </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Stats (3 cols) */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-blue-500" />
                        나의 전투력
                    </h3>

                    <div className="space-y-5">
                        {stats && Object.entries(stats).map(([key, value]) => {
                            if (key === 'total' || key === 'logCount') return null;
                            const max = 50;
                            const percentage = Math.min((value / max) * 100, 100);

                            return (
                                <div key={key}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-medium text-slate-700">{key}</span>
                                        <span className="font-bold text-slate-900">{value}</span>
                                    </div>
                                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-6 border-t border-slate-100">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-medium text-slate-700 flex items-center gap-2">
                                    <BookOpen className="w-4 h-4" /> 수련 일지 점수
                                </span>
                                <span className="font-bold text-slate-900">+{Math.floor((stats?.logCount || 0) * 0.5)}</span>
                            </div>
                            <p className="text-xs text-slate-400 text-right">일지당 0.5점</p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">총 전투력</span>
                            <span className="text-4xl font-bold text-blue-600">{stats?.total}</span>
                        </div>
                        {userRank && (
                            <div className="mt-4 text-center bg-yellow-50 text-yellow-700 py-3 rounded-xl font-bold border border-yellow-100">
                                현재 랭킹: {userRank}위
                            </div>
                        )}
                    </div>
                </div>

                {/* Middle Column: Arena (6 cols) */}
                <div className={`lg:col-span-6 bg-white rounded-2xl border p-8 shadow-lg flex flex-col transition-all duration-500 min-h-[600px] ${tournamentResult === 'win' ? 'border-yellow-400 bg-gradient-to-b from-yellow-50 to-white' :
                        tournamentResult === 'loss' ? 'border-red-400 bg-gradient-to-b from-red-50 to-white' :
                            'border-slate-200'
                    }`}>
                    <h3 className="text-2xl font-bold mb-8 flex items-center justify-center gap-3">
                        <Swords className="w-8 h-8 text-red-500" />
                        토너먼트 매치
                    </h3>

                    <div className="flex-1 bg-white rounded-xl border border-slate-100 p-6 mb-8 overflow-y-auto shadow-inner">
                        {matchLog.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                <Crown className="w-20 h-20 mb-6 opacity-20" />
                                <p className="text-center text-lg font-medium">
                                    참가 버튼을 눌러 시합을 시작하세요.<br />
                                    <span className="text-sm font-normal mt-2 block opacity-75">
                                        가드 vs 패스, 스탠딩 vs 스탠딩 등<br />
                                        실전과 같은 상황이 펼쳐집니다!
                                    </span>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {matchLog.map((log, index) => (
                                    <div key={index} className={`p-4 rounded-xl border text-sm animate-fade-in shadow-sm ${log.includes('승리') ? 'bg-blue-50 border-blue-100 text-blue-800' :
                                            log.includes('패배') ? 'bg-red-50 border-red-100 text-red-800' :
                                                'bg-white border-slate-100 text-slate-700'
                                        }`}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={simulateMatch}
                        disabled={isPlaying}
                        className={`w-full py-5 rounded-xl font-bold text-xl transition-all transform active:scale-[0.98] shadow-lg ${isPlaying
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:shadow-xl hover:from-yellow-600 hover:to-orange-600'
                            }`}
                    >
                        {isPlaying ? '시합 진행 중...' : '토너먼트 참가하기'}
                    </button>
                </div>

                {/* Right Column: Leaderboard (3 cols) */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <Medal className="w-5 h-5 text-yellow-500" />
                        랭킹 (TOP 10)
                    </h3>

                    <div className="space-y-3">
                        {leaderboard.map((entry, index) => (
                            <div
                                key={entry.userId}
                                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${entry.userId === user?.id ? 'bg-blue-50 border border-blue-200 shadow-sm' : 'bg-slate-50 hover:bg-slate-100'
                                    }`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                            index === 1 ? 'bg-slate-200 text-slate-700' :
                                                index === 2 ? 'bg-orange-100 text-orange-700' :
                                                    'bg-white text-slate-500 border border-slate-200'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <span className={`font-medium truncate ${entry.userId === user?.id ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {entry.userName}
                                    </span>
                                </div>
                                <span className="font-bold text-slate-900">{entry.score}</span>
                            </div>
                        ))}

                        {leaderboard.length === 0 && (
                            <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl">
                                <p>랭킹 데이터가 없습니다.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
