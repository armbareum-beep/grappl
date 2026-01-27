import React from 'react';
import { motion } from 'framer-motion';
import { LoadingTimeoutGuard } from './common/LoadingTimeoutGuard';

interface LoadingScreenProps {
    message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = '무림의 정보를 불러오는 중...' }) => {
    return (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#09090b] overflow-hidden">
            <LoadingTimeoutGuard loading={true} />
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
            </div>
        </div>
    );
};
