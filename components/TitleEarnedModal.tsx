import React, { useEffect, useState, useRef } from 'react';
import { Trophy, Sparkles, Share2, Crown, Medal } from 'lucide-react';
import { ShareToFeedModal } from './social/ShareToFeedModal';
import { useAuth } from '../contexts/AuthContext';
import { createFeedPost } from '../lib/api';

interface TitleEarnedModalProps {
    isOpen: boolean;
    onClose: () => void;
    titleName: string;
    description?: string;
    rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export const TitleEarnedModal: React.FC<TitleEarnedModalProps> = ({
    isOpen,
    onClose,
    titleName,
    description = "새로운 칭호를 획득했습니다!",
    rarity = 'common'
}) => {
    const { user } = useAuth();
    const [showContent, setShowContent] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isOpen) {
            setShowContent(false);
            setShowShareModal(false);

            // Stagger animations
            setTimeout(() => setShowContent(true), 300);

            // Auto close after 5 seconds
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
            type: 'title_earned',
            metadata: {
                titleName,
                rarity,
                description
            }
        });

        alert('피드에 공유되었습니다!');
        onClose();
    };

    const getRarityColor = (r: string) => {
        switch (r) {
            case 'legendary': return 'from-yellow-500 via-orange-500 to-red-500';
            case 'epic': return 'from-purple-500 via-pink-500 to-red-500';
            case 'rare': return 'from-blue-500 via-indigo-500 to-purple-500';
            default: return 'from-slate-500 via-slate-400 to-slate-500';
        }
    };

    const getRarityText = (r: string) => {
        switch (r) {
            case 'legendary': return 'LEGENDARY';
            case 'epic': return 'EPIC';
            case 'rare': return 'RARE';
            default: return 'COMMON';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={() => {
                    if (!showShareModal) onClose();
                }}
            ></div>

            {/* Main Content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Glow Effects */}
                <div className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(rarity)} opacity-20 rounded-3xl blur-3xl animate-pulse`}></div>

                {/* Card */}
                <div className="relative bg-slate-900 border-2 border-slate-700/50 rounded-3xl p-8 shadow-2xl overflow-hidden">
                    {/* Animated Particles */}
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(15)].map((_, i) => (
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
                        {/* Rarity Badge */}
                        <div className={`mb-6 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                            <div className={`inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r ${getRarityColor(rarity)} rounded-full text-white font-black text-xs tracking-wider shadow-lg`}>
                                <Crown className="w-3 h-3" />
                                {getRarityText(rarity)} TITLE
                                <Crown className="w-3 h-3" />
                            </div>
                        </div>

                        {/* Icon */}
                        <div className={`mb-6 transition-all duration-700 delay-200 ${showContent ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-180'}`}>
                            <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-700 shadow-xl animate-bounce-slow relative">
                                <Medal className={`w-12 h-12 text-white drop-shadow-lg`} />
                                <div className={`absolute inset-0 rounded-full border-2 border-white/20 animate-ping-slow`}></div>
                            </div>
                        </div>

                        {/* Title Name */}
                        <div className={`mb-2 transition-all duration-500 delay-300 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                            <h2 className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${getRarityColor(rarity)}`}>
                                {titleName}
                            </h2>
                        </div>

                        {/* Description */}
                        <div className={`mb-8 transition-all duration-500 delay-400 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                            <p className="text-slate-400 text-sm">
                                {description}
                            </p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleShareClick}
                                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                자랑하기
                            </button>
                            <button
                                onClick={onClose}
                                className={`flex-1 px-4 py-3 bg-gradient-to-r ${getRarityColor(rarity)} text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:scale-105`}
                            >
                                확인
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
                    activityType="title_earned"
                    defaultContent={`🏆 새로운 칭호 획득!\n\n[${titleName}]\n${description}\n\n#Grappl #주짓수 #칭호획득`}
                    metadata={{
                        titleName,
                        rarity,
                        description
                    }}
                />
            )}

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes ping-slow {
            75%, 100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-float {
          animation: float linear infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
        .animate-ping-slow {
            animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
        </div>
    );
};
