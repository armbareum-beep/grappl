import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Star, ArrowRight, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReelSubscriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ReelSubscriptionModal: React.FC<ReelSubscriptionModalProps> = ({
    isOpen,
    onClose,
}) => {
    const navigate = useNavigate();

    const handleSubscribe = () => {
        navigate('/pricing');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-sm overflow-hidden"
                    >
                        {/* Glass Card */}
                        <div className="relative bg-zinc-900/90 border border-white/10 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden">

                            {/* Decorative Background Effects */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-600/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-600/20 rounded-full blur-[60px] -ml-24 -mb-24 pointer-events-none" />

                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                aria-label="구독 안내 닫기"
                                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center text-center">

                                {/* Icon / Logo Area */}
                                <div className="mb-8 relative">
                                    <div className="w-24 h-24 bg-gradient-to-tr from-yellow-500 to-amber-600 rounded-3xl rotate-6 flex items-center justify-center shadow-lg shadow-amber-900/30">
                                        <Crown className="w-10 h-10 text-white drop-shadow-md" />
                                    </div>
                                    <div className="absolute -bottom-3 -right-3 bg-zinc-900 border border-zinc-700 p-2 rounded-xl rotate-12">
                                        <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    </div>
                                </div>

                                {/* Texts */}
                                <h2 className="text-2xl font-black text-white mb-3">
                                    프리미엄 컨텐츠입니다
                                </h2>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-6 px-2">
                                    구독하고 모든 <span className="text-white font-bold">심층 분석과 설명 영상</span>을<br />
                                    무제한으로 시청하세요.
                                </p>

                                {/* Benefits List */}
                                <div className="w-full bg-white/5 rounded-2xl p-4 mb-6 border border-white/5">
                                    <ul className="space-y-2 text-left">
                                        <li className="flex items-center gap-2 text-xs text-zinc-300">
                                            <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            모든 기술의 상세 설명 영상 잠금 해제
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-zinc-300">
                                            <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            프로 선수의 실전 스파링 분석
                                        </li>
                                        <li className="flex items-center gap-2 text-xs text-zinc-300">
                                            <div className="p-1 rounded-full bg-green-500/20 text-green-400">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            오리지널 기술 강좌 무제한 수강
                                        </li>
                                    </ul>
                                </div>

                                {/* Buttons */}
                                <div className="w-full space-y-3">
                                    {/* Primary Action */}
                                    <button
                                        onClick={handleSubscribe}
                                        className="relative group w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-base rounded-2xl overflow-hidden transition-transform active:scale-95 shadow-lg shadow-amber-500/20"
                                    >
                                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center gap-2">
                                            <span>멤버십 시작하기</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </button>

                                    {/* Secondary Action */}
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 text-sm font-bold rounded-2xl border border-white/5 hover:border-white/10 transition-all active:scale-95"
                                    >
                                        나중에 하기
                                    </button>
                                </div>

                                {/* Footer Text */}
                                <p className="mt-6 text-[10px] text-zinc-600 font-medium">
                                    언제든지 해지 가능합니다
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
