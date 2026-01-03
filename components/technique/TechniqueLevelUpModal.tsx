import React, { useEffect, useState } from 'react';
import { MasteryLevel, MASTERY_LEVEL_NAMES_KO, Technique } from '../../types';
import { MasteryRingLevelUp } from './MasteryRing';
import { Button } from '../Button';
import { Sparkles, TrendingUp, Target } from 'lucide-react';

interface TechniqueLevelUpModalProps {
    technique: Technique;
    oldLevel: MasteryLevel;
    newLevel: MasteryLevel;
    combatStatsGained?: {
        standing: number;
        guard: number;
        pass: number;
        submission: number;
    };
    onClose: () => void;
    onViewRecommendations?: () => void;
}

export const TechniqueLevelUpModal: React.FC<TechniqueLevelUpModalProps> = ({
    technique,
    oldLevel,
    newLevel,
    combatStatsGained,
    onClose,
    onViewRecommendations
}) => {
    const [show, setShow] = useState(false);
    const [animationComplete, setAnimationComplete] = useState(false);

    useEffect(() => {
        // Trigger entrance animation
        setTimeout(() => setShow(true), 100);
    }, []);

    const handleClose = () => {
        setShow(false);
        setTimeout(onClose, 300);
    };

    return (
        <div
            className={`fixed inset-0 z-[1000] flex items-center justify-center p-4 transition-all duration-300 ${show ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/0'
                }`}
            onClick={handleClose}
        >
            <div
                className={`bg-slate-900 rounded-3xl border border-slate-800 p-8 max-w-lg w-full relative overflow-hidden transition-all duration-500 ${show ? 'scale-100 opacity-100' : 'scale-90 opacity-0'
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-purple-500/10" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-yellow-400/20 blur-[100px] rounded-full" />

                {/* Sparkle effects */}
                <div className="absolute top-8 right-8 text-yellow-400 animate-pulse">
                    <Sparkles className="w-6 h-6" />
                </div>
                <div className="absolute bottom-8 left-8 text-purple-400 animate-pulse delay-150">
                    <Sparkles className="w-5 h-5" />
                </div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold mb-4">
                            <TrendingUp className="w-4 h-4" />
                            LEVEL UP!
                        </div>
                        <h2 className="text-3xl font-black text-white mb-2">
                            {technique.name}
                        </h2>
                        <p className="text-slate-400">
                            {MASTERY_LEVEL_NAMES_KO[oldLevel]} → {MASTERY_LEVEL_NAMES_KO[newLevel]}
                        </p>
                    </div>

                    {/* Mastery Ring */}
                    <div className="flex justify-center mb-8">
                        <MasteryRingLevelUp
                            oldLevel={oldLevel}
                            newLevel={newLevel}
                            onComplete={() => setAnimationComplete(true)}
                        />
                    </div>

                    {/* Combat Stats Gained */}
                    {combatStatsGained && (
                        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
                            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                전투력 증가
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {combatStatsGained.standing > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">스탠딩</span>
                                        <span className="text-sm font-bold text-green-400">+{combatStatsGained.standing}</span>
                                    </div>
                                )}
                                {combatStatsGained.guard > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">가드</span>
                                        <span className="text-sm font-bold text-green-400">+{combatStatsGained.guard}</span>
                                    </div>
                                )}
                                {combatStatsGained.pass > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">패스</span>
                                        <span className="text-sm font-bold text-green-400">+{combatStatsGained.pass}</span>
                                    </div>
                                )}
                                {combatStatsGained.submission > 0 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-400">서브미션</span>
                                        <span className="text-sm font-bold text-green-400">+{combatStatsGained.submission}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleClose}
                        >
                            닫기
                        </Button>
                        {onViewRecommendations && (
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                    handleClose();
                                    onViewRecommendations();
                                }}
                            >
                                추천 루틴 보기
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
