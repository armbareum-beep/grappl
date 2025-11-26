import React, { useEffect, useState } from 'react';
import { Sparkles, Zap, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SkillUnlockModalProps {
    isOpen: boolean;
    onClose: () => void;
    skillName: string;
    skillCategory: string;
    skillIcon?: string;
    courseId?: string;
}

export const SkillUnlockModal: React.FC<SkillUnlockModalProps> = ({
    isOpen,
    onClose,
    skillName,
    skillCategory,
    skillIcon = '🥋',
    courseId
}) => {
    const navigate = useNavigate();
    const [showContent, setShowContent] = useState(false);
    const [showButton, setShowButton] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowContent(false);
            setShowButton(false);

            setTimeout(() => setShowContent(true), 300);
            setTimeout(() => setShowButton(true), 1000);

            // Auto close after 4 seconds if no interaction
            const timer = setTimeout(() => {
                onClose();
            }, 4500);

            return () => clearTimeout(timer);
        }
    }, [isOpen, onClose]);

    const handleViewSkillTree = () => {
        onClose();
        navigate('/arena?tab=skills');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Content */}
            <div className="relative z-10 w-full max-w-md">
                {/* Glow Effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-teal-500/20 rounded-3xl blur-3xl animate-pulse"></div>

                {/* Card */}
                <div className="relative bg-slate-900 border-2 border-cyan-500/50 rounded-3xl p-8 shadow-2xl overflow-hidden">
                    {/* Animated Background */}
                    <div className="absolute inset-0">
                        {[...Array(15)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute animate-sparkle"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            >
                                <Sparkles className="w-3 h-3 text-cyan-400" />
                            </div>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="relative z-10 text-center">
                        {/* Badge */}
                        <div className={`mb-6 transition-all duration-500 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full text-white font-black text-sm shadow-lg shadow-cyan-500/50">
                                <Zap className="w-4 h-4" />
                                NEW SKILL UNLOCKED!
                                <Zap className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Skill Icon */}
                        <div className={`mb-6 transition-all duration-700 delay-200 ${showContent ? 'scale-100 opacity-100 rotate-0' : 'scale-0 opacity-0 rotate-180'}`}>
                            <div className="inline-flex items-center justify-center w-32 h-32 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-2 border-cyan-500/50 shadow-2xl shadow-cyan-500/30">
                                <span className="text-6xl animate-bounce-slow">{skillIcon}</span>
                            </div>
                        </div>

                        {/* Skill Info */}
                        <div className={`mb-6 transition-all duration-500 delay-400 ${showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                            <div className="inline-block px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-400 mb-3">
                                {skillCategory}
                            </div>
                            <h2 className="text-2xl font-black text-white mb-2">
                                {skillName}
                            </h2>
                            <p className="text-slate-400 text-sm">
                                이 기술이 스킬 트리에 추가되었습니다!
                            </p>
                        </div>

                        {/* Stats */}
                        {showButton && (
                            <div className="grid grid-cols-2 gap-3 mb-6 animate-slide-up">
                                <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-3">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <BookOpen className="w-4 h-4 text-cyan-400" />
                                        <span className="text-xs text-slate-400">완강률</span>
                                    </div>
                                    <p className="text-lg font-bold text-white">100%</p>
                                </div>
                                <div className="bg-slate-800/50 border border-cyan-500/20 rounded-xl p-3">
                                    <div className="flex items-center justify-center gap-2 mb-1">
                                        <Zap className="w-4 h-4 text-yellow-400" />
                                        <span className="text-xs text-slate-400">획득 XP</span>
                                    </div>
                                    <p className="text-lg font-bold text-yellow-400">+50</p>
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        {showButton && (
                            <div className="space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                                <button
                                    onClick={handleViewSkillTree}
                                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 flex items-center justify-center gap-2"
                                >
                                    <span>스킬 트리에서 확인하기</span>
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="w-full py-3 border-2 border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white font-bold rounded-xl transition-all duration-300"
                                >
                                    닫기
                                </button>
                            </div>
                        )}
                    </div>
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
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.05); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};
