import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    variant = 'warning',
    isLoading = false
}) => {
    const variants = {
        danger: {
            icon: Trash2,
            iconBg: 'bg-violet-600/20',
            iconBorder: 'border-violet-500/30',
            iconColor: 'text-violet-400',
            confirmBg: 'bg-violet-700 hover:bg-violet-600 shadow-violet-900/50',
            glow: 'bg-violet-500/20'
        },
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-violet-500/10',
            iconBorder: 'border-violet-500/20',
            iconColor: 'text-violet-400',
            confirmBg: 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/40',
            glow: 'bg-violet-500/10'
        },
        info: {
            icon: AlertTriangle,
            iconBg: 'bg-violet-500/10',
            iconBorder: 'border-violet-500/20',
            iconColor: 'text-violet-500',
            confirmBg: 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/40',
            glow: 'bg-violet-500/10'
        }
    };

    const config = variants[variant];
    const Icon = config.icon;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl shadow-black/50"
                    >
                        {/* Background Glow */}
                        <div className={cn("absolute top-0 left-0 w-32 h-32 blur-[60px] rounded-full -ml-16 -mt-16 transition-colors duration-500", config.glow)} />

                        <div className="p-8 relative z-10 text-center">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                aria-label="모달 닫기"
                                className="absolute top-6 right-6 p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-95"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header with Icon */}
                            <div className="flex flex-col items-center justify-center mb-6">
                                <div className={cn("w-20 h-20 rounded-3xl flex items-center justify-center mb-6 border shadow-lg shadow-black/20 transform transition-transform duration-500 hover:rotate-6",
                                    config.iconBg, config.iconBorder)}>
                                    <Icon className={cn("w-10 h-10 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]", config.iconColor)} />
                                </div>
                                <h3 className="text-2xl font-black text-white leading-tight tracking-tight px-4">{title}</h3>
                            </div>

                            {/* Content */}
                            <div className="text-zinc-500 text-center text-sm leading-relaxed font-medium mb-10 px-4 whitespace-pre-wrap">
                                {message}
                            </div>

                            {/* Footer (Buttons) */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={onClose}
                                    disabled={isLoading}
                                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black text-sm rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={() => {
                                        onConfirm();
                                    }}
                                    disabled={isLoading}
                                    className={cn("flex-1 py-4 text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2",
                                        config.confirmBg)}
                                >
                                    {isLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        confirmText
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
