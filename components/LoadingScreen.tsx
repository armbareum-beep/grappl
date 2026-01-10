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
        }, 3000); // 3 seconds as requested

        return () => clearTimeout(timer);
    }, []);

    const handleReset = () => {
        // Force clear without confirmation
        localStorage.clear();
        sessionStorage.clear();
        // Remove Supabase auth token specifically if present in cookies (unlikely but safe)
        document.cookie.split(";").forEach((c) => {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        window.location.href = '/';
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
                                        <h3 className="text-white font-black text-xl leading-tight">로딩이 지연되고 있습니다</h3>
                                        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Slow Connection</p>
                                    </div>
                                </div>
                                <p className="text-zinc-300 text-sm mb-6 leading-relaxed font-medium">
                                    네트워크 상태가 원활하지 않거나 데이터 양이 많을 수 있습니다.<br />
                                    계속 기다리시거나 새로고침 해보세요.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleReset}
                                        className="w-full px-4 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl transition-all shadow-xl shadow-violet-900/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        새로고침
                                    </button>
                                    <button
                                        onClick={() => setShowReset(false)}
                                        className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-bold text-sm rounded-2xl transition-all active:scale-95"
                                    >
                                        계속 기다리기 (닫기)
                                    </button>
                                </div>
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
