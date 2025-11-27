import React, { useEffect, useState, useRef } from 'react';
import { Trophy, Sparkles, Star, Zap, Share2 } from 'lucide-react';
import { getBeltInfo, getBeltIcon } from '../lib/belt-system';
import { ShareToFeedModal } from './social/ShareToFeedModal';
import { useAuth } from '../contexts/AuthContext';
import { createFeedPost } from '../lib/api';
import { Button } from './Button';

interface LevelUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    oldLevel: number;
    newLevel: number;
    beltLevel: number;
}

export const LevelUpModal: React.FC<LevelUpModalProps> = ({
    isOpen,
    onClose,
    oldLevel,
    newLevel,
    beltLevel
}) => {
    const { user } = useAuth();
    const [showContent, setShowContent] = useState(false);
    const [showRewards, setShowRewards] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const beltInfo = getBeltInfo(beltLevel);
    const beltIcon = getBeltIcon(beltInfo.belt);

    useEffect(() => {
        if (isOpen) {
            setShowContent(false);
            setShowRewards(false);
            setShowShareModal(false);

            // Stagger animations
            setTimeout(() => setShowContent(true), 300);
            setTimeout(() => setShowRewards(true), 1000);

            // Auto close after 5 seconds (slightly longer to allow reading)
            // Only if share modal is not open
            if (!showShareModal) {
                timerRef.current = setTimeout(() => {
                    onClose();
                }, 5000);
            }

            return () => {
                if (timerRef.current) clearTimeout(timerRef.current);
            };
        }
    }, [isOpen, onClose]);

    const handleShareClick = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        setShowShareModal(true);
    };

    const handleShareToFeed = async (comment: string) => {
        if (!user) return;

        await createFeedPost({
            userId: user.id,
            content: comment,
            type: 'level_up',
            metadata: {
                oldLevel,
                newLevel,
                beltName: beltInfo.name
            }
        });

        alert('피드에 공유되었습니다!');
        onClose(); // Close the level up modal after sharing
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with blur */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => {
                    if (!showShareModal) onClose();
                }}
            ></div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-3xl animate-pulse"></div>

                {/* Card */}
                <div className="relative bg-slate-900 border-2 border-indigo-500/50 rounded-3xl p-8 shadow-2xl overflow-hidden">
                    {/* Animated Background Particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-1 h-1 bg-white rounded-full animate-float"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`,
                                    animationDuration: `${2 + Math.random() * 3}s`
                                }}
                            ></div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="relative z-10 text-center">
                        {/* Level Up Badge */}
                        <div className={`mb-6 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white font-black text-sm shadow-lg shadow-yellow-500/50">
                                <Sparkles className="w-4 h-4" />
                                LEVEL UP!
                                <Sparkles className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Belt Icon */}
                        <div className={`mb-4 transition-all duration-700 delay-200 ${showContent ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-180'}`}>
                            <div className="text-8xl mb-2 animate-bounce-slow">
                                {beltIcon}
                            </div>
                        </div>

                        {/* Belt Name */}
                        <div className={`mb-6 transition-all duration-500 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                            <h2 className="text-3xl font-black text-white mb-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                {beltInfo.name}
                            </h2>
                            <div className="flex items-center justify-center gap-3 text-slate-400">
                                <span className="text-lg">Level {oldLevel}</span>
                                <Zap className="w-5 h-5 text-yellow-500" />
                                <span className="text-2xl font-bold text-white">Level {newLevel}</span>
                            </div>
                        </div>

                        {/* Rewards */}
                        {showRewards && (
                            <div className="space-y-3 animate-slide-up">
                                <div className="bg-slate-800/50 border border-indigo-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                                <Trophy className="w-5 h-5 text-indigo-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">새로운 기술 해금</p>
                                                <p className="text-xs text-slate-400">고급 기술 접근 가능</p>
                                            </div>
                                        </div>
                                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 border border-purple-500/30 rounded-xl p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-bold text-white">보너스 XP 획득</p>
                                                <p className="text-xs text-slate-400">다음 레벨까지 +50 XP</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-purple-400">+50</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleShareClick}
                                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                자랑하기
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/50 hover:shadow-indigo-500/70 hover:scale-105"
                            >
                                계속하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {showShareModal && (
                <ShareToFeedModal
                    isOpen={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    onShare={handleShareToFeed}
                    activityType="level_up"
                    defaultContent={`🎉 레벨 업! Level ${newLevel} 달성!\n\n${beltInfo.name} 벨트로 승급했습니다. 더 높은 곳을 향해 계속 정진하겠습니다! 🥋`}
                    metadata={{
                        oldLevel,
                        newLevel,
                        beltName: beltInfo.name
                    }}
                />
            )}

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};
