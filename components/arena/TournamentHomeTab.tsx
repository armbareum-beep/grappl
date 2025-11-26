import React, { useEffect, useState } from 'react';
import { StatPowerPanel } from './StatPowerPanel';
import { TournamentMatchCard } from './TournamentMatchCard';
import { LeaderboardCard } from './LeaderboardCard';
import { MatchHistoryCard } from './MatchHistoryCard';
import { AnimatedBackground } from './AnimatedBackground';
import { BattleScene } from './BattleScene';

export const TournamentHomeTab: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [battleState, setBattleState] = useState<'idle' | 'battling'>('idle');
    const [currentOpponent, setCurrentOpponent] = useState<any>(null);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleMatchStart = (opponent: any) => {
        setCurrentOpponent(opponent);
        setBattleState('battling');
    };

    const handleBattleEnd = (result: 'win' | 'loss') => {
        console.log(`Battle ended with result: ${result}`);
        // Here you would update user stats, history, etc.
        setBattleState('idle');
        setCurrentOpponent(null);
    };

    return (
        <div className="relative min-h-screen bg-[#0f172a] text-white overflow-hidden">
            {/* Dynamic Background */}
            <AnimatedBackground />

            {/* Battle Scene Overlay */}
            {battleState === 'battling' && currentOpponent && (
                <BattleScene
                    myStats={{ name: '나의 전사', power: 375, belt: '블루벨트' }}
                    opponent={currentOpponent}
                    onBattleEnd={handleBattleEnd}
                />
            )}

            {/* Content Container */}
            <div className={`relative z-10 container mx-auto px-4 py-8 transition-opacity duration-1000 ${isVisible && battleState === 'idle' ? 'opacity-100' : 'opacity-0'} ${battleState === 'battling' ? 'pointer-events-none' : ''}`}>

                {/* Header Section */}
                <header className="mb-12 text-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-purple-600/20 blur-[100px] rounded-full pointer-events-none"></div>
                    <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-200 to-slate-400 mb-4 tracking-tight drop-shadow-lg">
                        시합장
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-light tracking-wide">
                        당신의 기술을 증명하고, <span className="text-purple-400 font-semibold">최고의 전사</span>가 되세요
                    </p>
                </header>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto relative">

                    {/* Top Row: Power Stats (Full Width) */}
                    <div className="lg:col-span-12 transform transition-all duration-700 hover:translate-y-[-4px] relative z-20">
                        <StatPowerPanel />
                    </div>

                    {/* Middle Row: Tournament Match (Center Focus) - Highest Z-Index */}
                    <div className="lg:col-span-12 flex justify-center py-4 relative z-30">
                        <div className="w-full max-w-3xl transform transition-all duration-700 delay-100 hover:scale-[1.02]">
                            <TournamentMatchCard onMatchStart={handleMatchStart} />
                        </div>
                    </div>

                    {/* Bottom Row: Leaderboard & History (Split) - Lower Z-Index */}
                    <div className="lg:col-span-5 transform transition-all duration-700 delay-200 relative z-10">
                        <LeaderboardCard />
                    </div>

                    <div className="lg:col-span-7 transform transition-all duration-700 delay-300 relative z-10">
                        <MatchHistoryCard />
                    </div>
                </div>
            </div>

            {/* Global Styles for Scrollbar */}
            <style>{`
                ::-webkit-scrollbar {
                    width: 8px;
                }
                ::-webkit-scrollbar-track {
                    background: #0f172a; 
                }
                ::-webkit-scrollbar-thumb {
                    background: #334155; 
                    border-radius: 4px;
                }
                ::-webkit-scrollbar-thumb:hover {
                    background: #475569; 
                }
            `}</style>
        </div>
    );
};
