import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    icon?: React.ElementType;
    iconColor?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'blue' | 'violet';
    footer?: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    icon: Icon,
    iconColor = 'indigo',
    footer,
    maxWidth = 'sm'
}) => {
    const colorClasses = {
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', glow: 'bg-indigo-500/5' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', glow: 'bg-emerald-500/5' },
        rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', glow: 'bg-rose-500/5' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', glow: 'bg-amber-500/5' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', glow: 'bg-blue-500/5' },
        violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', glow: 'bg-violet-500/5' },
    };

    const colors = colorClasses[iconColor];

    const maxWidthClasses = {
        'sm': 'max-w-sm',
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
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
                        className={`relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full ${maxWidthClasses[maxWidth]} overflow-hidden shadow-2xl shadow-black/50 overflow-y-auto max-h-[90vh] custom-scrollbar`}
                    >
                        {/* Background Glow */}
                        <div className={`absolute top-0 left-0 w-32 h-32 ${colors.glow} blur-[60px] rounded-full -ml-16 -mt-16 transition-colors duration-500`} />

                        <div className="p-8 relative z-10">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-95"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header with Icon */}
                            <div className="flex flex-col items-center justify-center mb-8">
                                {Icon && (
                                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mb-6 border ${colors.border} shadow-lg shadow-black/20`}>
                                        <Icon className={`w-8 h-8 ${colors.text} drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                                    </div>
                                )}
                                <h3 className="text-2xl font-black text-white text-center leading-tight tracking-tight px-4">{title}</h3>
                            </div>

                            {/* Content */}
                            <div className="text-zinc-400 text-center text-sm leading-relaxed font-medium mb-8">
                                {children}
                            </div>

                            {/* Footer (Buttons) */}
                            {footer && (
                                <div className="flex gap-3 w-full">
                                    {footer}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
