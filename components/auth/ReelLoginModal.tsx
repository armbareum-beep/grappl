import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Zap, ArrowRight, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ReelLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    redirectUrl?: string; // Where to redirect after login/signup
}

export const ReelLoginModal: React.FC<ReelLoginModalProps> = ({
    isOpen,
    onClose: _onClose,
    redirectUrl = '/watch'
}) => {
    const navigate = useNavigate();

    const handleLogin = () => {
        navigate('/login', { state: { from: { pathname: redirectUrl } } });
    };

    const handleSignup = () => {
        navigate('/login', { state: { from: { pathname: redirectUrl } } }); // Usually same page, maybe different tab if you have one
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
                        // onClick={onClose} // Prevent closing on backdrop click
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
                            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-600/20 rounded-full blur-[60px] -ml-24 -mb-24 pointer-events-none" />

                            {/* Close Button Removed */}
                            {/* <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors z-20"
                            >
                                <X className="w-5 h-5" />
                            </button> */}

                            {/* Content */}
                            <div className="relative z-10 flex flex-col items-center text-center">

                                {/* Icon / Logo Area */}
                                <div className="mb-8 relative">
                                    <div className="w-24 h-24 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-3xl rotate-6 flex items-center justify-center shadow-lg shadow-violet-900/30">
                                        <Lock className="w-10 h-10 text-white drop-shadow-md" />
                                    </div>
                                    <div className="absolute -bottom-3 -right-3 bg-zinc-900 border border-zinc-700 p-2 rounded-xl rotate-12">
                                        <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                                    </div>
                                </div>

                                {/* Texts */}
                                <h2 className="text-2xl font-black text-white mb-3">
                                    더 보고 싶으신가요?
                                </h2>
                                <p className="text-zinc-400 text-sm leading-relaxed mb-8 px-2">
                                    무료 회원가입으로 <span className="text-white font-bold">모든 릴스와 강좌</span>를<br />
                                    제한 없이 이용해보세요.
                                </p>

                                {/* Buttons */}
                                <div className="w-full space-y-3">
                                    {/* Primary Action */}
                                    <button
                                        onClick={handleSignup}
                                        className="relative group w-full py-4 bg-white text-black font-black text-base rounded-2xl overflow-hidden transition-transform active:scale-95 shadow-lg shadow-white/10"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative flex items-center justify-center gap-2">
                                            <span>무료로 시작하기</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </div>
                                    </button>

                                    {/* Secondary Action */}
                                    <button
                                        onClick={handleLogin}
                                        className="w-full py-4 bg-zinc-800/50 hover:bg-zinc-800 text-white font-bold text-sm rounded-2xl border border-white/5 hover:border-white/10 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <LogIn className="w-4 h-4 text-zinc-400" />
                                        <span>이미 계정이 있어요</span>
                                    </button>
                                </div>

                                {/* Footer Text */}
                                <p className="mt-6 text-[10px] text-zinc-600 font-medium">
                                    10초면 회원가입 완료! 카드 등록 필요 없음
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div >
            )}
        </AnimatePresence >
    );
};
