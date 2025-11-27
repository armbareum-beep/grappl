import React, { useEffect, useState } from 'react';
import { CheckCircle, Flame, Trophy, Zap, Star } from 'lucide-react';

interface QuestCompleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onContinue?: () => void; // Optional callback for "계속하기" button
    questName: string;
    xpEarned: number;
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
    streak,
    bonusReward
}) => {
    const [showContent, setShowContent] = useState(false);
    const [showRewards, setShowRewards] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowContent(false);
            setShowRewards(false);

            setTimeout(() => setShowContent(true), 200);
            setTimeout(() => setShowRewards(true), 600);

            // Only auto close if no onContinue callback is provided
            if (!onContinue) {
                const timer = setTimeout(() => {
                    onClose();
                }, 3000);

                return () => clearTimeout(timer);
            }
        }
    }, [isOpen, onClose, onContinue]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-sm">
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-2xl blur-2xl animate-pulse"></div>

                {/* Card */}
                <div className="relative bg-slate-900 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-2xl">
                    {/* Success Icon */}
                    <div className={`text-center mb-4 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/50 mb-4">
                            <CheckCircle className="w-12 h-12 text-white animate-bounce-once" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1">완료!</h2>
                        <p className="text-slate-400 text-sm">{questName}</p>
                    </div>

                    {/* Rewards */}
                    {showRewards && (
                        <div className="space-y-3 animate-slide-up">
                            {/* XP Reward */}
                            <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                            <Zap className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">경험치 획득</p>
                                            <p className="text-xs text-slate-400">레벨업까지 한 걸음!</p>
                                        </div>
                                    </div>
                                    <span className="text-xl font-black text-indigo-400">+{xpEarned}</span>
                                </div>
                            </div>

                            {/* Streak Bonus */}
                            {streak && (
                                <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border border-orange-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                                <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">연속 달성</p>
                                                <p className="text-xs text-slate-400">불타는 열정!</p>
                                            </div>
                                        </div>
                                        <span className="text-xl font-black text-orange-400">{streak}일</span>
                                    </div>
                                </div>
                            )}

                            {/* Bonus Reward */}
                            {bonusReward && (
                                <div className="bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                                {bonusReward.type === 'badge' ? (
                                                    <Trophy className="w-5 h-5 text-yellow-400" />
                                                ) : (
                                                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">보너스 보상</p>
                                                <p className="text-xs text-slate-400">{bonusReward.value}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Continue Button */}
                    <button
                        onClick={() => {
                            if (onContinue) {
                                onContinue();
                            } else {
                                onClose();
                            }
                        }}
                        className="mt-6 w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50"
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
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-once {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
        .animate-bounce-once {
          animation: bounce-once 0.6s ease-out;
        }
      `}</style>
        </div>
    );
};
