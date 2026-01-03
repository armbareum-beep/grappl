import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Info, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '무림의 정보를 불러오는 중...' }) => {
    const [showReset, setShowReset] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowReset(true);
        }, 5000); // Show reset option after 5 seconds to give more time

        return () => clearTimeout(timer);
    }, []);

    const handleReset = () => {
        if (window.confirm('캐시를 삭제하고 새로고침하시겠습니까?\n\n로그인 정보는 유지되며, 앱이 최신 버전으로 업데이트됩니다.')) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/';
        }
    };

    return (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#09090b] overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

            <div className="relative z-10 flex flex-col items-center gap-8 p-6">
                {/* Advanced Spinner */}
                <div className="relative w-24 h-24">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 rounded-full border-t-2 border-r-2 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                    />
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-4 rounded-full border-b-2 border-l-2 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping" />
                    </div>
                </div>

                <div className="text-center space-y-3">
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-white font-black text-lg tracking-tight"
                    >
                        {message}
                    </motion.p>
                    <p className="text-zinc-500 text-sm font-medium animate-pulse">
                        잠시만 기다려 주세요
                    </p>
                </div>

                <AnimatePresence>
                    {showReset && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="mt-8 relative"
                        >
                            <div className="bg-zinc-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] border border-zinc-800 max-w-sm shadow-2xl shadow-black ring-1 ring-white/10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
                                        <Info className="w-6 h-6 text-violet-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-black text-xl leading-tight">앱 업데이트 필요</h3>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Update Required</p>
                                    </div>
                                </div>
                                <p className="text-zinc-300 text-sm mb-6 leading-relaxed font-medium">
                                    새로운 기능과 개선사항이 적용되었습니다.<br />
                                    원활한 사용을 위해 캐시를 삭제해 주세요.
                                </p>
                                <button
                                    onClick={handleReset}
                                    className="w-full px-4 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-violet-900/20 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    캐시 삭제하고 새로고침
                                </button>
                                <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-zinc-500 font-bold">
                                    <ShieldCheck className="w-3 h-3" />
                                    로그인 정보는 안전하게 유지됩니다
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};
