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
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="w-5 h-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-500" />;
            case 'info':
            default:
                return <Info className="w-5 h-5 text-blue-500" />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-white border-green-100 shadow-green-100/50';
            case 'error':
                return 'bg-white border-red-100 shadow-red-100/50';
            case 'warning':
                return 'bg-white border-amber-100 shadow-amber-100/50';
            case 'info':
            default:
                return 'bg-white border-blue-100 shadow-blue-100/50';
        }
    };

    return (
        <div className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border
            transform transition-all duration-300 ease-in-out
            animate-in slide-in-from-top-2 fade-in
            ${getStyles()}
            min-w-[300px] max-w-md pointer-events-auto
        `}>
            <div className="flex-shrink-0">
                {getIcon()}
            </div>
            <p className="flex-1 text-sm font-medium text-slate-700">
                {message}
            </p>
            <button
                onClick={() => onDismiss(id)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
