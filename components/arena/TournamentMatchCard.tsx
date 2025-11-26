import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Swords, X, Loader2, Radar, Shield, Zap } from 'lucide-react';

interface OpponentStats {
    name: string;
    belt: string;
    power: number;
    winRate: number;
    avatar?: string;
    style?: string;
}

interface TournamentMatchCardProps {
    onMatchStart?: (opponent: OpponentStats) => void;
    myPower?: number;
}

export const TournamentMatchCard: React.FC<TournamentMatchCardProps> = ({
    onMatchStart,
    myPower = 375,
}) => {
    const [isMatching, setIsMatching] = useState(false);
    const [scanAngle, setScanAngle] = useState(0);
    const [opponent, setOpponent] = useState<OpponentStats | null>(null);
    const [scanText, setScanText] = useState('상대 탐색 중...');

    useEffect(() => {
        if (isMatching) {
            const interval = setInterval(() => {
                setScanAngle(prev => (prev + 5) % 360);
            }, 20);

            const textInterval = setInterval(() => {
                const texts = ['전투력 분석 중...', '지역 스캔 중...', '비슷한 실력자 찾는 중...', '매칭 대기열 확인...'];
                setScanText(texts[Math.floor(Math.random() * texts.length)]);
            }, 800);

            return () => {
                clearInterval(interval);
                clearInterval(textInterval);
            };
        }
    }, [isMatching]);

    const handleMatchClick = () => {
        setIsMatching(true);

        // Simulate matchmaking process
        setTimeout(() => {
            setOpponent({
                name: '김주짓수',
                belt: '퍼플벨트',
                power: Math.floor(myPower * (0.8 + Math.random() * 0.4)),
                winRate: 60 + Math.floor(Math.random() * 30),
                style: '가드 플레이어',
                avatar: undefined,
            });
            setIsMatching(false);
        }, 3000);
    };

    const handleCancel = () => {
        setIsMatching(false);
        setOpponent(null);
    };

    return (
        <>
            {/* Main Card */}
            <div className="tournament-match-card bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl relative overflow-hidden group hover:border-orange-500/30 transition-all duration-500">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-600/5 via-red-600/5 to-transparent pointer-events-none"></div>

                {/* Radar Scan Effect Overlay (Always visible but subtle) */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-orange-500/20 rounded-full"></div>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-orange-500/20 rounded-full"></div>
                </div>

                {!isMatching && !opponent ? (
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <div className="mb-6 relative">
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-400/30 flex items-center justify-center animate-float">
                                <Trophy className="w-12 h-12 text-orange-400 drop-shadow-glow" />
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-orange-500/20 border border-orange-500/50 rounded-full text-xs font-bold text-orange-300 whitespace-nowrap">
                                SEASON 3
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 flex items-center gap-2">
                            <Swords className="w-7 h-7 text-orange-500" />
                            토너먼트 아레나
                        </h2>
                        <p className="text-slate-400 mb-8 max-w-md">
                            비슷한 실력의 상대와 실시간으로 매칭되어<br />
                            당신의 기술을 증명하세요.
                        </p>

                        <button
                            onClick={handleMatchClick}
                            className="group relative px-10 py-5 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold text-xl rounded-2xl shadow-lg shadow-orange-600/20 hover:shadow-orange-600/40 transition-all duration-300 hover:scale-105 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <span className="relative z-10 flex items-center gap-3">
                                <Flame className="w-6 h-6 animate-pulse" />
                                매칭 시작하기
                            </span>
                        </button>
                    </div>
                ) : isMatching ? (
                    <div className="relative z-10 flex flex-col items-center justify-center py-8">
                        {/* Radar UI */}
                        <div className="relative w-48 h-48 mb-8">
                            <div className="absolute inset-0 border-2 border-orange-500/30 rounded-full bg-slate-950/50"></div>
                            <div className="absolute inset-4 border border-orange-500/20 rounded-full"></div>
                            <div className="absolute inset-0 rounded-full overflow-hidden">
                                <div
                                    className="absolute top-1/2 left-1/2 w-1/2 h-1/2 origin-top-left bg-gradient-to-r from-transparent to-orange-500/50"
                                    style={{ transform: `rotate(${scanAngle}deg)` }}
                                ></div>
                            </div>
                            {/* Blip */}
                            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-orange-400 rounded-full animate-ping"></div>

                            <div className="absolute inset-0 flex items-center justify-center">
                                <Radar className="w-12 h-12 text-orange-500/50" />
                            </div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2 animate-pulse">{scanText}</h3>
                        <p className="text-slate-400 text-sm">평균 대기 시간: 15초</p>

                        <button
                            onClick={handleCancel}
                            className="mt-8 px-6 py-2 border border-slate-600 text-slate-400 rounded-full hover:bg-slate-800 hover:text-white transition-colors text-sm"
                        >
                            매칭 취소
                        </button>
                    </div>
                ) : null}
            </div>

            {/* Opponent Found Modal */}
            {opponent && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-50 animate-fade-in p-4">
                    <div className="max-w-4xl w-full bg-slate-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative">
                        {/* Dramatic VS Background */}
                        <div className="absolute inset-0 flex">
                            <div className="w-1/2 bg-gradient-to-r from-blue-900/20 to-transparent"></div>
                            <div className="w-1/2 bg-gradient-to-l from-red-900/20 to-transparent"></div>
                        </div>

                        {/* Content */}
                        <div className="relative z-10 p-8 md:p-12">
                            <div className="text-center mb-12">
                                <h2 className="text-4xl font-black text-white italic tracking-wider animate-bounce-in">MATCH FOUND!</h2>
                                <p className="text-slate-400 mt-2">상대가 수락 대기중입니다</p>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                                {/* You */}
                                <div className="flex-1 text-center transform hover:scale-105 transition-transform duration-300">
                                    <div className="relative w-32 h-32 mx-auto mb-6">
                                        <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                                        <div className="relative w-full h-full rounded-full bg-slate-800 border-4 border-blue-500 flex items-center justify-center overflow-hidden">
                                            <span className="text-4xl font-bold text-blue-500">나</span>
                                        </div>
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            Lv. {Math.floor(myPower / 100)}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">나의 전사</h3>
                                    <div className="flex items-center justify-center gap-2 text-blue-400 font-mono">
                                        <Zap className="w-4 h-4" />
                                        {myPower} CP
                                    </div>
                                </div>

                                {/* VS Badge */}
                                <div className="relative z-20">
                                    <div className="w-20 h-20 bg-slate-950 rounded-full border-4 border-white/10 flex items-center justify-center shadow-xl">
                                        <span className="text-3xl font-black text-white italic">VS</span>
                                    </div>
                                </div>

                                {/* Opponent */}
                                <div className="flex-1 text-center transform hover:scale-105 transition-transform duration-300">
                                    <div className="relative w-32 h-32 mx-auto mb-6">
                                        <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                                        <div className="relative w-full h-full rounded-full bg-slate-800 border-4 border-red-500 flex items-center justify-center overflow-hidden">
                                            <span className="text-4xl font-bold text-red-500">{opponent.name[0]}</span>
                                        </div>
                                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                                            {opponent.belt}
                                        </div>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-1">{opponent.name}</h3>
                                    <div className="flex items-center justify-center gap-2 text-red-400 font-mono">
                                        <Zap className="w-4 h-4" />
                                        {opponent.power} CP
                                    </div>
                                    <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-400">
                                        <Shield className="w-3 h-3" />
                                        {opponent.style}
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 max-w-md mx-auto">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-colors"
                                >
                                    거절하기
                                </button>
                                <button
                                    onClick={() => {
                                        if (opponent) {
                                            onMatchStart?.(opponent);
                                            setOpponent(null);
                                        }
                                    }}
                                    className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:-translate-y-1"
                                >
                                    전투 시작!
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .drop-shadow-glow {
                    filter: drop-shadow(0 0 15px rgba(251, 146, 60, 0.5));
                }
                @keyframes bounce-in {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
                .animate-bounce-in {
                    animation: bounce-in 0.6s cubic-bezier(0.215, 0.610, 0.355, 1.000) both;
                }
            `}</style>
        </>
    );
};
