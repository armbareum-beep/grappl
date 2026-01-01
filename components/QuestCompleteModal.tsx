import React from 'react';
import { Flame, Trophy, Zap, Star, Swords } from 'lucide-react';

interface QuestCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContinue?: () => void;
    questName: string;
    xpEarned: number;
    combatPowerEarned?: number;
    streak?: number;
    bonusReward?: {
        type: 'xp_boost' | 'badge' | 'unlock';
        value: string;
    };
    continueLabel?: string;
}

export const QuestCompleteModal: React.FC<QuestCompleteModalProps> = ({
    isOpen,
    onClose,
    onContinue,
    questName,
    xpEarned,
    combatPowerEarned,
    streak,
    bonusReward,
    continueLabel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm pointer-events-none">
                {/* Reward Icon & Animation Background Glow */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-500/30 rounded-full blur-[60px]"></div>

                {/* Particle Effects (Simple CSS implementation) */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full overflow-visible">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute top-1/2 left-1/2 w-2 h-2 bg-violet-400 rounded-full animate-particle-explosion"
                            style={{
                                '--tx': `${Math.cos(i * 60 * Math.PI / 180) * 100}px`,
                                '--ty': `${Math.sin(i * 60 * Math.PI / 180) * 100}px`,
                                animationDelay: '0.1s'
                            } as any}
                        />
                    ))}
                </div>

                {/* Card */}
                <div className="pointer-events-auto relative bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_0_50px_rgba(124,58,237,0.25)] overflow-hidden animate-scale-in">

                    {/* Background Detail */}
                    <div className="absolute inset-0 bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />

                    {/* Success Icon */}
                    <div className="text-center mb-8 relative">
                        {/* Radial Gradient Glow behind icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-violet-600/30 rounded-full blur-2xl animate-pulse"></div>

                        <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-zinc-900 border border-violet-500/50 shadow-[0_0_30px_rgba(124,58,237,0.4)] mb-6 animate-bounce-custom">
                            <Flame className="w-12 h-12 text-violet-400 fill-violet-500 animate-pulse" />
                        </div>

                        <h2 className="text-white text-3xl font-black mb-1 drop-shadow-[0_2px_10px_rgba(124,58,237,0.5)]">
                            수련 완료!
                        </h2>
                        <p className="text-zinc-400 text-sm font-medium mt-1">{questName}</p>
                        {streak && streak > 0 && (
                            <p className="text-violet-300 text-lg font-bold mt-2 animate-fade-in-up">
                                {streak}일 연속 수련 중! 🔥
                            </p>
                        )}
                    </div>

                    {/* Rewards */}
                    <div className="space-y-3 relative z-10">
                        {/* XP Reward Card */}
                        <div className="bg-zinc-800/50 border border-violet-500/20 rounded-2xl p-4 backdrop-blur-sm animate-slide-up flex items-center justify-between group hover:border-violet-500/40 transition-colors" style={{ animationDelay: '0.2s', opacity: 0, animationFillMode: 'forwards' }}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                    <Zap className="w-5 h-5 text-violet-300 fill-violet-300" />
                                </div>
                                <div className="text-left">
                                    <p className="text-zinc-400 text-[10px] uppercase tracking-widest font-bold">XP 획득</p>
                                    <p className="text-xs text-zinc-300">레벨업 진행도</p>
                                </div>
                            </div>
                            <span className="text-violet-400 text-2xl font-black italic">
                                {xpEarned > 0 ? `+${xpEarned} XP` : '습관 지속!'}
                            </span>
                        </div>

                        {/* Combat Power Reward Card */}
                        {combatPowerEarned && combatPowerEarned > 0 && (
                            <div className="bg-zinc-800/50 border border-white/5 rounded-2xl p-4 backdrop-blur-sm animate-slide-up flex items-center justify-between" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-zinc-700/50 flex items-center justify-center">
                                        <Swords className="w-5 h-5 text-zinc-300" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-zinc-200">전투력</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-zinc-200">+{combatPowerEarned}</span>
                            </div>
                        )}

                        {/* Bonus Item */}
                        {bonusReward && (
                            <div className="bg-zinc-800/50 border border-amber-500/20 rounded-2xl p-4 backdrop-blur-sm animate-slide-up flex items-center justify-between" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                        {bonusReward.type === 'badge' ? (
                                            <Trophy className="w-5 h-5 text-amber-400" />
                                        ) : (
                                            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-amber-100">보너스</p>
                                        <p className="text-xs text-amber-500/80">{bonusReward.value}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={() => {
                            if (onContinue) {
                                onContinue();
                            } else {
                                onClose();
                            }
                        }}
                        className="mt-8 w-full py-4 bg-violet-600 hover:bg-violet-500 text-white text-lg font-bold rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:shadow-[0_8px_30px_rgba(124,58,237,0.6)] hover:scale-[1.02] active:scale-[0.98] animate-fade-in relative overflow-hidden group"
                        style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        {continueLabel || '확인'}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-custom {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes particle-explosion {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.5s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-bounce-custom {
          animation: bounce-custom 2s infinite ease-in-out;
        }
        .animate-particle-explosion {
            animation: particle-explosion 0.8s ease-out forwards;
        }
      `}</style>
        </div>
    );
};
