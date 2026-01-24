import React, { useEffect, useState, useRef } from 'react';
import { Swords, Trophy, XCircle } from 'lucide-react';

interface OpponentStats {
    name: string;
    belt: string;
    power: number;
    style?: string;
    level?: number;
}

interface BattleSceneProps {
    myStats: { name: string; power: number; belt: string };
    opponent: OpponentStats;
    onBattleEnd: (result: 'win' | 'loss') => void;
}

export const BattleScene: React.FC<BattleSceneProps> = ({ myStats, opponent, onBattleEnd }) => {
    const [myHp, setMyHp] = useState(100);
    const [oppHp, setOppHp] = useState(100);
    const [logs, setLogs] = useState<string[]>([]);
    const [showResult, setShowResult] = useState<'win' | 'loss' | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Battle Simulation Logic
    useEffect(() => {
        const battleSequence = [
            { text: '경기 시작! 서로 탐색전을 벌입니다.', damage: 0, target: 'none' },
            { text: `${myStats.name}의 기습적인 테이크다운 시도!`, damage: 10, target: 'opp' },
            { text: `${opponent.name}가 가드로 방어했습니다.`, damage: 5, target: 'my' },
            { text: '치열한 그립 싸움이 이어집니다.', damage: 0, target: 'none' },
            { text: `${opponent.name}의 강력한 스윕!`, damage: 15, target: 'my' },
            { text: `${myStats.name}, 침착하게 가드 리커버리.`, damage: 5, target: 'opp' },
            { text: `${myStats.name}의 전광석화 같은 암바 시도!`, damage: 25, target: 'opp' },
            { text: `${opponent.name}가 필사적으로 방어합니다!`, damage: 10, target: 'opp' },
            { text: '마지막 힘을 짜내는 두 선수!', damage: 0, target: 'none' },
        ];

        let currentStep = 0;

        const interval = setInterval(() => {
            if (currentStep >= battleSequence.length) {
                clearInterval(interval);
                // Determine Winner based on final HP (randomized for drama if close)
                const finalResult = Math.random() > 0.4 ? 'win' : 'loss'; // 60% win rate for user feel
                setShowResult(finalResult);
                return;
            }

            const step = battleSequence[currentStep];
            setLogs(prev => [...prev, step.text]);

            if (step.target === 'opp') {
                setOppHp(prev => Math.max(0, prev - step.damage));
            } else if (step.target === 'my') {
                setMyHp(prev => Math.max(0, prev - step.damage));
            }

            // Auto scroll logs
            if (scrollRef.current) {
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }

            currentStep++;
        }, 800);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

            {/* Battle HUD */}
            <div className="relative z-10 w-full max-w-5xl px-4">

                {/* VS Header */}
                <div className="flex justify-between items-center mb-6 md:mb-12">
                    {/* Player (Left) */}
                    <div className="flex-1 flex flex-col items-start">
                        <div className="flex items-center gap-2 md:gap-4 mb-2">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-600 border-4 border-blue-400 flex items-center justify-center text-lg md:text-2xl font-bold shadow-[0_0_20px_rgba(37,99,235,0.5)]">
                                나
                            </div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold text-white">{myStats.name}</h2>
                                <span className="text-xs md:text-base text-blue-400 font-mono">{myStats.belt}</span>
                            </div>
                        </div>
                        {/* HP Bar */}
                        <div className="w-full max-w-xs h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500 ease-out"
                                style={{ width: `${myHp}%` }}
                            ></div>
                        </div>
                        <div className="text-sm text-slate-400 mt-1 font-mono">{myHp}/100 HP</div>
                    </div>

                    {/* VS Logo */}
                    <div className="mx-2 md:mx-8">
                        <div className="text-4xl md:text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse">
                            VS
                        </div>
                    </div>

                    {/* Opponent (Right) */}
                    <div className="flex-1 flex flex-col items-end text-right">
                        <div className="flex items-center gap-2 md:gap-4 mb-2 flex-row-reverse">
                            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-600 border-4 border-red-400 flex items-center justify-center text-lg md:text-2xl font-bold shadow-[0_0_20px_rgba(220,38,38,0.5)]">
                                {opponent.name[0]}
                            </div>
                            <div>
                                <h2 className="text-lg md:text-2xl font-bold text-white">{opponent.name}</h2>
                                <span className="text-xs md:text-base text-red-400 font-mono">{opponent.belt}</span>
                            </div>
                        </div>
                        {/* HP Bar */}
                        <div className="w-full max-w-xs h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                            <div
                                className="h-full bg-gradient-to-l from-red-500 to-orange-400 transition-all duration-500 ease-out"
                                style={{ width: `${oppHp}%` }}
                            ></div>
                        </div>
                        <div className="text-sm text-slate-400 mt-1 font-mono">{oppHp}/100 HP</div>
                    </div>
                </div>

                {/* Battle Log Area */}
                <div className="relative max-w-2xl mx-auto">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 rounded-xl opacity-30 blur-lg"></div>
                    <div className="relative bg-slate-900/80 backdrop-blur-md rounded-xl border border-white/10 p-6 h-64 overflow-hidden flex flex-col">
                        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
                            <Swords className="w-5 h-5 text-yellow-400" />
                            <span className="font-bold text-slate-200">Battle Log</span>
                        </div>
                        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 scroll-smooth">
                            {logs.map((log, i) => (
                                <div key={i} className="text-slate-300 animate-fade-in-left">
                                    <span className="text-slate-500 text-xs mr-2">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                                    {log}
                                </div>
                            ))}
                            <div className="h-4"></div> {/* Spacer */}
                        </div>
                    </div>
                </div>
            </div>

            {/* Result Overlay */}
            {showResult && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
                    <div className="text-center transform animate-bounce-in">
                        {showResult === 'win' ? (
                            <>
                                <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(250,204,21,0.6)] animate-bounce" />
                                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-4 drop-shadow-lg">
                                    VICTORY
                                </h1>
                                <p className="text-2xl text-yellow-200 font-bold mb-8">승리하셨습니다!</p>
                                <div className="flex gap-4 justify-center">
                                    <div className="px-6 py-3 bg-slate-800 rounded-lg border border-yellow-500/30">
                                        <span className="text-slate-400 text-sm block">획득 경험치</span>
                                        <span className="text-yellow-400 font-bold text-xl">+50 XP</span>
                                    </div>
                                    <div className="px-6 py-3 bg-slate-800 rounded-lg border border-yellow-500/30">
                                        <span className="text-slate-400 text-sm block">랭킹 포인트</span>
                                        <span className="text-yellow-400 font-bold text-xl">+25 RP</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-32 h-32 text-slate-500 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(100,116,139,0.4)]" />
                                <h1 className="text-8xl font-black text-slate-400 mb-4 tracking-widest">
                                    DEFEAT
                                </h1>
                                <p className="text-2xl text-slate-500 font-bold mb-8">아쉽게 패배했습니다.</p>
                                <div className="px-6 py-3 bg-slate-800 rounded-lg border border-slate-700 inline-block">
                                    <span className="text-slate-400 text-sm block">획득 경험치</span>
                                    <span className="text-slate-300 font-bold text-xl">+10 XP</span>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => onBattleEnd(showResult)}
                            className="mt-12 px-12 py-4 bg-white text-black font-black text-xl rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                        >
                            돌아가기
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fade-in-left {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-fade-in-left {
                    animation: fade-in-left 0.3s ease-out forwards;
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
        </div>
    );
};
