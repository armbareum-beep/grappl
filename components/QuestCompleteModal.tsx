import React, { useEffect, useState } from 'react';
import { CheckCircle, Flame, Trophy, Zap, Star, Swords } from 'lucide-react';

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
}

export const QuestCompleteModal: React.FC<QuestCompleteModalProps> = ({
    isOpen,
    onClose,
    onContinue,
    questName,
    xpEarned,
    combatPowerEarned,
    streak,
    bonusReward
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
            <div className="relative z-10 w-full max-w-md">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/30 to-green-500/30 rounded-3xl blur-3xl animate-pulse"></div>

                {/* Card */}
                <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-8 shadow-2xl">
                    {/* Success Icon */}
                    <div className="text-center mb-6 animate-scale-in" style={{ animationDelay: '0.1s', opacity: 0, animationFillMode: 'forwards' }}>
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 shadow-2xl shadow-emerald-500/50 mb-4 animate-bounce-once">
                            <CheckCircle className="w-14 h-14 text-white" strokeWidth={2.5} />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">완료!</h2>
                        <p className="text-slate-300 text-base font-medium">{questName}</p>
                    </div>

                    {/* Rewards */}
                    <div className="space-y-3">
                        {/* XP Reward Card */}
                        <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border-2 border-indigo-500/40 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.3s', opacity: 0, animationFillMode: 'forwards' }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                        <Zap className="w-7 h-7 text-white fill-white" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold text-white">경험치 획득</p>
                                        <p className="text-sm text-indigo-300">레벨업까지 한 걸음!</p>
                                    </div>
                                </div>
                                <span className="text-3xl font-black text-indigo-300">+{xpEarned}</span>
                            </div>
                        </div>

                        {/* Combat Power Reward Card */}
                        {combatPowerEarned && combatPowerEarned > 0 && (
                            <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-2 border-blue-500/40 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.4s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                                            <Swords className="w-7 h-7 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-white">전투력 상승</p>
                                            <p className="text-sm text-blue-300">강해지고 있습니다!</p>
                                        </div>
                                    </div>
                                    <span className="text-3xl font-black text-blue-300">+{combatPowerEarned}</span>
                                </div>
                            </div>
                        )}

                        {/* Streak Bonus Card */}
                        {streak !== undefined && streak > 0 && (
                            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-2 border-orange-500/40 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.5s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                                            <Flame className="w-7 h-7 text-white fill-white" />
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-white">연속 달성</p>
                                            <p className="text-sm text-orange-300">불타는 열정!</p>
                                        </div>
                                    </div>
                                    <span className="text-3xl font-black text-orange-300">{streak}일</span>
                                </div>
                            </div>
                        )}

                        {/* Bonus Reward Card */}
                        {bonusReward && (
                            <div className="bg-gradient-to-r from-yellow-600/20 to-amber-600/20 border-2 border-yellow-500/40 rounded-2xl p-5 backdrop-blur-sm animate-slide-up" style={{ animationDelay: '0.7s', opacity: 0, animationFillMode: 'forwards' }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
                                            {bonusReward.type === 'badge' ? (
                                                <Trophy className="w-7 h-7 text-white" />
                                            ) : (
                                                <Star className="w-7 h-7 text-white fill-white" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-base font-bold text-white">보너스 보상</p>
                                            <p className="text-sm text-yellow-300">{bonusReward.value}</p>
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
                        className="mt-8 w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-white text-lg font-black rounded-2xl transition-all duration-300 shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-500/60 hover:scale-[1.02] active:scale-[0.98] animate-fade-in"
                        style={{ animationDelay: '0.8s', opacity: 0, animationFillMode: 'forwards' }}
                    >
                        계속하기
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
