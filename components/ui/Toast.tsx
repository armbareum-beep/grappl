import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
    onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
    id,
    message,
    type,
    duration = 3000,
    onDismiss
}) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, duration);

        return () => clearTimeout(timer);
    }, [id, duration, onDismiss]);

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-emerald-400" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-rose-400" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'info':
            default:
                return <Info className="w-5 h-5 text-violet-400" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]';
            case 'error':
                return 'border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)]';
            case 'warning':
                return 'border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]';
            case 'info':
            default:
                return 'border-violet-500/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]';
        }
    };

    return (
        <div className={`
            flex items-center gap-4 px-6 py-4 rounded-2xl border backdrop-blur-xl
            bg-zinc-900/80 text-white font-medium
            transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1)
            animate-in slide-in-from-right-10 fade-in
            ${getStyles()}
            min-w-[320px] max-w-md pointer-events-auto group
        `}>
            <div className="flex-shrink-0">
                <div className="p-2 rounded-xl bg-white/5 border border-white/5">
                    {getIcon()}
                </div>
            </div>

            <div className="flex-1">
                <p className="text-sm text-zinc-100 leading-snug">
                    {message}
                </p>
            </div>

            <button
                onClick={() => onDismiss(id)}
                className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-zinc-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
