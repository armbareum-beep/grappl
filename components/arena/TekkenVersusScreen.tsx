import React, { useState, useEffect } from 'react';
import { Shield, Swords, Zap, Trophy, Skull } from 'lucide-react';

interface TekkenVersusScreenProps {
    user: any;
    onBattleStart: (opponent: any) => void;
}

export const TekkenVersusScreen: React.FC<TekkenVersusScreenProps> = ({ user, onBattleStart }) => {
    const [isSearching, setIsSearching] = useState(false);
    const [opponent, setOpponent] = useState<any>(null);
    const [showVS, setShowVS] = useState(false);

    const handleFindMatch = () => {
        setIsSearching(true);
        // Simulate finding a match
        setTimeout(() => {
            const foundOpponent = {
                name: "Grappler_X",
                rank: "Purple Belt",
                power: 1450,
                winRate: 62,
                avatar: null, // Use placeholder
                level: 5 // Added level for BattleScene
            };
            setOpponent(foundOpponent);
            setIsSearching(false);
            setShowVS(true);

            // Auto-start battle after VS animation
            setTimeout(() => {
                onBattleStart(foundOpponent);
            }, 4000); // 4 seconds for VS animation
        }, 3000);
    };

    return (
        <div className="relative w-full h-[600px] bg-black overflow-hidden rounded-3xl border-4 border-slate-800 shadow-2xl group">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80"></div>
            
            {/* Split Screen Container */}
            <div className="absolute inset-0 flex">
                {/* Left Side (Player) */}
                <div className={`relative w-1/2 h-full transition-all duration-1000 ${showVS ? '-translate-x-4' : ''}`}>
                    {/* Character Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900/40 to-transparent transform -skew-x-12 scale-110 origin-bottom-left border-r-4 border-blue-500/50"></div>
                    
                    {/* Character Image (Placeholder) */}
                    <div className="absolute bottom-0 left-10 w-full h-[90%] flex items-end justify-start">
                         {user?.profile_image ? (
                            <img 
                                src={user.profile_image} 
                                alt="Player" 
                                className="h-full w-auto object-cover drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] mask-image-gradient"
                            />
                        ) : (
                            <div className="h-full w-2/3 bg-gradient-to-t from-blue-900 to-blue-500/20 flex items-center justify-center rounded-t-3xl backdrop-blur-sm border-t border-l border-blue-400/30">
                                <Shield className="w-48 h-48 text-blue-400/50" />
                            </div>
                        )}
                    </div>

                    {/* Player Stats Overlay */}
                    <div className="absolute top-10 left-10 z-20">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="px-4 py-1 bg-blue-600 text-white font-black italic text-xl skew-x-[-10deg] shadow-[0_0_15px_rgba(37,99,235,0.8)] border border-blue-400">
                                PLAYER 1
                            </div>
                            <div className="text-blue-400 font-bold tracking-widest animate-pulse">READY</div>
                        </div>
                        <h2 className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg uppercase mb-2" style={{ textShadow: '0 0 20px rgba(59,130,246,0.8)' }}>
                            {user?.name || 'FIGHTER'}
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="text-xs text-blue-300 font-bold uppercase">Rank</span>
                                <span className="text-2xl font-black text-white italic">DIAMOND</span>
                            </div>
                            <div className="w-px h-10 bg-blue-500/50"></div>
                            <div className="flex flex-col">
                                <span className="text-xs text-blue-300 font-bold uppercase">Power</span>
                                <span className="text-2xl font-black text-white italic">1,250</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side (Opponent) */}
                <div className={`relative w-1/2 h-full transition-all duration-1000 ${showVS ? 'translate-x-4' : ''}`}>
                    {/* Character Background */}
                    <div className="absolute inset-0 bg-gradient-to-l from-red-900/40 to-transparent transform skew-x-12 scale-110 origin-bottom-right border-l-4 border-red-500/50"></div>

                    {/* Opponent Content */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        {!isSearching && !opponent ? (
                            <div className="text-center z-20">
                                <button 
                                    onClick={handleFindMatch}
                                    className="group relative px-12 py-6 bg-transparent overflow-hidden transform transition-all hover:scale-105"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 skew-x-[-20deg] border-2 border-white/20 group-hover:border-white transition-colors"></div>
                                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                                    <span className="relative z-10 text-3xl font-black text-white italic tracking-wider flex items-center gap-3">
                                        <Swords className="w-8 h-8" />
                                        FIND MATCH
                                    </span>
                                </button>
                                <p className="mt-4 text-red-400 font-bold tracking-widest text-sm animate-pulse">PRESS TO START</p>
                            </div>
                        ) : isSearching ? (
                            <div className="flex flex-col items-center z-20">
                                <div className="w-24 h-24 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                                <h3 className="text-3xl font-black text-white italic tracking-wider animate-pulse">SEARCHING...</h3>
                                <p className="text-red-400 font-bold mt-2">LOOKING FOR WORTHY OPPONENT</p>
                            </div>
                        ) : (
                            // Opponent Found
                            <div className="w-full h-full relative animate-slide-in-right">
                                <div className="absolute bottom-0 right-10 w-full h-[90%] flex items-end justify-end">
                                    <div className="h-full w-2/3 bg-gradient-to-t from-red-900 to-red-500/20 flex items-center justify-center rounded-t-3xl backdrop-blur-sm border-t border-r border-red-400/30">
                                        <Skull className="w-48 h-48 text-red-400/50" />
                                    </div>
                                </div>
                                
                                {/* Opponent Stats Overlay */}
                                <div className="absolute top-10 right-10 z-20 text-right">
                                    <div className="flex items-center justify-end gap-4 mb-2">
                                        <div className="text-red-400 font-bold tracking-widest animate-pulse">CHALLENGER</div>
                                        <div className="px-4 py-1 bg-red-600 text-white font-black italic text-xl skew-x-[-10deg] shadow-[0_0_15px_rgba(220,38,38,0.8)] border border-red-400">
                                            PLAYER 2
                                        </div>
                                    </div>
                                    <h2 className="text-5xl font-black text-white italic tracking-tighter drop-shadow-lg uppercase mb-2" style={{ textShadow: '0 0 20px rgba(220,38,38,0.8)' }}>
                                        {opponent.name}
                                    </h2>
                                    <div className="flex items-center justify-end gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-red-300 font-bold uppercase">Power</span>
                                            <span className="text-2xl font-black text-white italic">{opponent.power}</span>
                                        </div>
                                        <div className="w-px h-10 bg-red-500/50"></div>
                                        <div className="flex flex-col">
                                            <span className="text-xs text-red-300 font-bold uppercase">Rank</span>
                                            <span className="text-2xl font-black text-white italic">PURPLE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Center VS Logo */}
            {showVS && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                    <div className="relative animate-vs-zoom">
                        {/* Lightning Effects */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-2 bg-yellow-400 blur-md rotate-45 animate-lightning"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-2 bg-white blur-md -rotate-45 animate-lightning-delayed"></div>
                        
                        {/* VS Text */}
                        <h1 className="text-[150px] font-black italic leading-none text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-500 to-orange-600 drop-shadow-[0_0_50px_rgba(234,179,8,0.8)] transform -skew-x-12"
                            style={{ WebkitTextStroke: '4px white' }}>
                            VS
                        </h1>
                    </div>
                </div>
            )}

            {/* Global Styles for Animations */}
            <style>{`
                @keyframes slide-in-right {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slide-in-right 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes vs-zoom {
                    0% { transform: scale(3); opacity: 0; }
                    15% { transform: scale(1); opacity: 1; }
                    20% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }
                .animate-vs-zoom {
                    animation: vs-zoom 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
                @keyframes lightning {
                    0%, 100% { opacity: 0; }
                    10%, 90% { opacity: 1; }
                    50% { opacity: 0; }
                }
                .animate-lightning {
                    animation: lightning 0.2s linear infinite;
                }
                .animate-lightning-delayed {
                    animation: lightning 0.3s linear infinite reverse;
                }
            `}</style>
        </div>
    );
};
