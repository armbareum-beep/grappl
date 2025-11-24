import React from 'react';
import { getBeltInfo, getBeltIcon } from '../lib/belt-system';

interface BeltUpModalProps {
    oldLevel: number;
    newLevel: number;
    onClose: () => void;
}

export const BeltUpModal: React.FC<BeltUpModalProps> = ({ oldLevel, newLevel, onClose }) => {
    const oldBelt = getBeltInfo(oldLevel);
    const newBelt = getBeltInfo(newLevel);
    const oldIcon = getBeltIcon(oldBelt.belt);
    const newIcon = getBeltIcon(newBelt.belt);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-8 relative animate-scale-in">
                {/* Celebration Animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                    <div className="absolute top-0 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-confetti-1"></div>
                    <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full animate-confetti-2"></div>
                    <div className="absolute top-0 left-3/4 w-2 h-2 bg-red-400 rounded-full animate-confetti-3"></div>
                </div>

                {/* Content */}
                <div className="text-center relative z-10">
                    <div className="text-6xl mb-4 animate-bounce">🎉</div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">벨트 승급!</h2>
                    <p className="text-slate-600 mb-8">축하합니다! 새로운 단계에 도달했습니다.</p>

                    {/* Belt Transition */}
                    <div className="flex items-center justify-center gap-6 mb-8">
                        <div className="text-center">
                            <div className="text-5xl mb-2">{oldIcon}</div>
                            <div className="text-sm font-medium text-slate-700">{oldBelt.name}</div>
                        </div>

                        <div className="text-3xl text-slate-400">→</div>

                        <div className="text-center">
                            <div className="text-5xl mb-2 animate-pulse">{newIcon}</div>
                            <div className="text-sm font-bold text-slate-900">{newBelt.name}</div>
                        </div>
                    </div>

                    {/* Message */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-slate-700">
                            {newLevel <= 5 && "첫 걸음을 시작했습니다. 계속 수련하세요!"}
                            {newLevel > 5 && newLevel <= 10 && "파란띠의 길을 걷고 있습니다!"}
                            {newLevel > 10 && newLevel <= 15 && "보라띠! 중급자의 경지에 올랐습니다."}
                            {newLevel > 15 && newLevel <= 20 && "갈띠! 고수의 반열에 올랐습니다."}
                            {newLevel > 20 && newLevel <= 27 && "검정띠! 진정한 마스터입니다."}
                            {newLevel > 27 && "전설의 경지에 도달했습니다!"}
                        </p>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all"
                    >
                        계속 수련하기
                    </button>
                </div>
            </div>
        </div>
    );
};
