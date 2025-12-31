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
    // Remove internal state for animations to prevent race conditions
    // const [showContent, setShowContent] = useState(false);
    // const [showRewards, setShowRewards] = useState(false);

    // useEffect(() => {
    //     if (isOpen) {
    //         setShowContent(false);
    //         setShowRewards(false);
    //         setTimeout(() => setShowContent(true), 200);
    //         setTimeout(() => setShowRewards(true), 600);
    //     }
    // }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
            ></div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm">
                {/* Reward Icon & Animation Background Glow */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-500/20 rounded-full blur-[60px] pointer-events-none"></div>

                {/* Card */}
                <div className="relative bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800 rounded-[32px] p-8 shadow-[0_0_50px_rgba(124,58,237,0.15)] overflow-hidden">
                    {/* Success Icon */}
                    <div className="text-center mb-8 relative">
                        {/* Radial Gradient Glow behind icon */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-violet-600/20 rounded-full blur-2xl"></div>

                        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-zinc-900 border border-violet-500/30 shadow-[0_0_30px_rgba(124,58,237,0.2)] mb-6 animate-bounce">
                            <Zap className="w-10 h-10 text-violet-500 fill-violet-500" />
                        </div>

                        <h2 className="text-zinc-50 text-3xl font-black mb-1">완료!</h2>
                        <p className="text-zinc-500 text-sm font-medium">{questName}</p>
                    </div>

                    {/* Rewards */}
                    <div className="space-y-3">
                        {/* XP Reward Card */}
                        <div className="bg-zinc-900/50 border border-violet-500/30 rounded-2xl p-6 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                                        <Zap className="w-6 h-6 text-violet-400 fill-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">경험치 획득</p>
                                        <p className="text-xs text-zinc-500 mt-0.5">레벨업까지 한 걸음!</p>
                                    </div>
                                </div>
                                <span className="text-violet-400 text-4xl font-black italic">+{xpEarned}</span>
                            </div>
                        </div>

                        {/* Combat Power Reward Card */}
                        {combatPowerEarned && combatPowerEarned > 0 && (
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                            <Swords className="w-6 h-6 text-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-100">전투력 상승</p>
                                            <p className="text-xs text-zinc-500">강해지고 있습니다!</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-black text-zinc-100">+{combatPowerEarned}</span>
                                </div>
                            </div>
                        )}

                        {/* Streak Bonus Card */}
                        {streak !== undefined && streak > 0 && (
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                            <Flame className="w-6 h-6 text-zinc-400 fill-zinc-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-100">연속 달성</p>
                                            <p className="text-xs text-zinc-500">불타는 열정!</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-black text-zinc-100">{streak}일</span>
                                </div>
                            </div>
                        )}

                        {/* Bonus Reward Card */}
                        {bonusReward && (
                            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                                            {bonusReward.type === 'badge' ? (
                                                <Trophy className="w-6 h-6 text-zinc-400" />
                                            ) : (
                                                <Star className="w-6 h-6 text-zinc-400 fill-zinc-400" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-100">보너스 보상</p>
                                            <p className="text-xs text-zinc-500">{bonusReward.value}</p>
                                        </div>
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
                        className="mt-8 w-full py-4 bg-violet-600 hover:bg-violet-500 text-zinc-50 text-lg font-bold rounded-full transition-all duration-300 shadow-[0_10px_20px_rgba(124,58,237,0.3)] hover:scale-[1.02] active:scale-[0.98] animate-fade-in"
                        style={{ animationDelay: '0.6s', opacity: 0, animationFillMode: 'forwards' }}
                    >
                        {continueLabel || '계속하기'}
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }
        .animate-bounce-once {
          animation: bounce-once 0.8s ease-out;
        }
      `}</style>
        </div>
    );
};
