import React, { useEffect, useState } from 'react';
import { StatPowerPanel } from './StatPowerPanel';
import { TekkenVersusScreen } from './TekkenVersusScreen';
import { LeaderboardCard } from './LeaderboardCard';
import { MatchHistoryCard } from './MatchHistoryCard';
import { AnimatedBackground } from './AnimatedBackground';
import { BattleScene } from './BattleScene';
import { useAuth } from '../../contexts/AuthContext';

export const TournamentHomeTab: React.FC = () => {
    const { user } = useAuth();
    const [isVisible, setIsVisible] = useState(false);
    const [battleState, setBattleState] = useState<'idle' | 'battling'>('idle');
    const [currentOpponent, setCurrentOpponent] = useState<any>(null);
    const [matchHistory, setMatchHistory] = useState<any[]>([]);
    const [matchStats, setMatchStats] = useState({ wins: 0, losses: 0, draws: 0, total: 0 });

    const loadMatchHistory = async () => {
        try {
            const { supabase } = await import('../../lib/supabase');
            
            if (!user) return;

            const { data, error } = await supabase
                .from('match_history')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);
// ... (rest of loadMatchHistory is same, but we need to close the function and component correctly)

            if (error) {
                console.error('Error loading match history:', error);
                return;
            }

            if (data) {
                // Transform data for MatchHistoryCard
                const transformedMatches = data.map(match => ({
                    id: match.id,
                    date: new Date(match.created_at).toLocaleDateString('ko-KR'),
                    opponent: match.opponent_name,
                    result: match.result,
                    powerChange: match.result === 'win' ? 25 : match.result === 'loss' ? -15 : 0
                }));

                setMatchHistory(transformedMatches);

                // Calculate stats
                const wins = data.filter(m => m.result === 'win').length;
                const losses = data.filter(m => m.result === 'loss').length;
                const draws = data.filter(m => m.result === 'draw').length;
                
                setMatchStats({
                    wins,
                    losses,
                    draws,
                    total: data.length
                });
            }
        } catch (error) {
            console.error('Error in loadMatchHistory:', error);
        }
    };

    useEffect(() => {
        setIsVisible(true);
        loadMatchHistory();
    }, []);

    const handleMatchStart = (opponent: any) => {
        setCurrentOpponent(opponent);
        setBattleState('battling');
    };

    const handleBattleEnd = async (result: 'win' | 'loss') => {
        console.log(`Battle ended with result: ${result}`);

        try {
            const { supabase } = await import('../../lib/supabase');
            // Get user directly from supabase
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // 1. Save match history
            const { error: matchError } = await supabase
                .from('match_history')
                .insert({
                    user_id: user.id,
                    opponent_name: currentOpponent.name,
                    opponent_level: currentOpponent.level,
                    user_level: 1, // Should fetch real level
                    result: result,
                    win_type: result === 'win' ? 'submission' : null, // Mock for now
                    xp_earned: result === 'win' ? 50 : 10
                });

            if (matchError) throw matchError;

            // 2. Award XP
            const { addXP } = await import('../../lib/api');
            await addXP(user.id, result === 'win' ? 50 : 10, 'tournament_match');

            // 3. Update Quest
            const { updateQuestProgress } = await import('../../lib/api');
            await updateQuestProgress(user.id, 'tournament'); // Corrected quest type

            // alert(result === 'win' ? '승리했습니다! (+50 XP)' : '패배했습니다. (+10 XP)'); // Removed native alert
        } catch (error) {
            console.error('Error saving match result:', error);
            // alert('결과 저장 중 오류가 발생했습니다.'); // Removed native alert
        }

        setBattleState('idle');
        setCurrentOpponent(null);
        
        // Reload match history after battle
        loadMatchHistory();
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
                        <div className="w-full max-w-6xl transform transition-all duration-700 delay-100 hover:scale-[1.01]">
                            <TekkenVersusScreen 
                                user={user} 
                                onBattleStart={handleMatchStart} 
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Leaderboard & History (Split) - Lower Z-Index */}
                    <div className="lg:col-span-5 transform transition-all duration-700 delay-200 relative z-10">
                        <LeaderboardCard />
                    </div>

                    <div className="lg:col-span-7 transform transition-all duration-700 delay-300 relative z-10">
                        <MatchHistoryCard 
                            matches={matchHistory}
                            totalMatches={matchStats.total}
                            wins={matchStats.wins}
                            losses={matchStats.losses}
                            draws={matchStats.draws}
                        />
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
