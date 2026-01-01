import React from 'react';
import { X, Lock, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

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
    if (!isOpen) return null;

    const colorClasses = {
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
        rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400' },
        amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
        violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400' },
    };

    const colors = colorClasses[iconColor];

    // Map maxWidth string to class
    const maxWidthClasses = {
        'sm': 'max-w-sm',
        'md': 'max-w-md',
        'lg': 'max-w-lg',
        'xl': 'max-w-xl',
        '2xl': 'max-w-2xl',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            <div className={`bg-zinc-900 border border-zinc-800 rounded-2xl w-full ${maxWidthClasses[maxWidth]} p-6 relative z-10 animate-in zoom-in-95 duration-200 shadow-2xl shadow-black/50`}>
                {/* Header with Icon */}
                <div className="flex flex-col items-center justify-center mb-4">
                    {Icon && (
                        <div className={`w-12 h-12 ${colors.bg} rounded-full flex items-center justify-center mb-4 border ${colors.border}`}>
                            <Icon className={`w-6 h-6 ${colors.text}`} />
                        </div>
                    )}
                    <h3 className="text-lg font-bold text-white text-center">{title}</h3>
                </div>

                {/* Content */}
                <div className="text-slate-400 text-center text-sm leading-relaxed mb-6">
                    {children}
                </div>

                {/* Footer (Buttons) */}
                {footer && (
                    <div className="flex gap-3 mt-auto">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};
