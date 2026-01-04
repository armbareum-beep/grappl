import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, X } from 'lucide-react';

interface PromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (value: string) => void;
    title: string;
    message: string;
    placeholder?: string;
    initialValue?: string;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
}

export const PromptModal: React.FC<PromptModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    placeholder = '여기에 입력하세요...',
    initialValue = '',
    confirmText = '확인',
    cancelText = '취소',
    isLoading = false
}) => {
    const [value, setValue] = useState(initialValue);

    useEffect(() => {
        if (isOpen) {
            setValue(initialValue);
        }
    }, [isOpen, initialValue]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (value.trim()) {
            onConfirm(value);
        }
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
                        className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl shadow-black/50"
                    >
                        {/* Background Glow */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-violet-500/10 blur-[60px] rounded-full -ml-16 -mt-16 transition-colors duration-500" />

                        <div className="p-8 relative z-10">
                            {/* Close Button */}
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 p-2 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all active:scale-95"
                            >
                                <X className="w-5 h-5" />
                            </button>

                            {/* Header with Icon */}
                            <div className="flex flex-col items-center justify-center mb-6">
                                <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-6 shadow-lg shadow-black/20 transform transition-transform duration-500 hover:rotate-6">
                                    <Edit3 className="w-10 h-10 text-violet-400 drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                                </div>
                                <h3 className="text-2xl font-black text-white leading-tight tracking-tight px-4 text-center">{title}</h3>
                            </div>

                            {/* Content */}
                            <div className="text-zinc-500 text-sm leading-relaxed font-medium mb-6 px-4 text-center whitespace-pre-wrap">
                                {message}
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="px-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        value={value}
                                        onChange={(e) => setValue(e.target.value)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700/50 focus:border-violet-500/50 focus:bg-zinc-800 rounded-2xl p-4 text-white font-bold outline-none transition-all focus:ring-4 focus:ring-violet-500/10 placeholder:text-zinc-600"
                                        placeholder={placeholder}
                                    />
                                </div>

                                {/* Footer (Buttons) */}
                                <div className="flex gap-3 w-full">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={isLoading}
                                        className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black text-sm rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {cancelText}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading || !value.trim()}
                                        className="flex-1 py-4 bg-violet-600 hover:bg-violet-500 text-white font-black text-sm rounded-2xl transition-all active:scale-95 shadow-xl shadow-violet-900/40 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            confirmText
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
