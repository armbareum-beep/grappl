import React from 'react';
import { cn } from '../../lib/utils';

interface LibraryTabsProps {
    activeTab: 'classes' | 'routines' | 'sparring';
    onTabChange: (tab: 'classes' | 'routines' | 'sparring') => void;
}

export const LibraryTabs: React.FC<LibraryTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="flex gap-8 border-b border-zinc-900 mb-8 overflow-x-auto no-scrollbar">
            <button
                onClick={() => onTabChange('classes')}
                className={cn(
                    "pb-4 text-sm font-bold transition-all relative whitespace-nowrap",
                    activeTab === 'classes' ? "text-violet-500" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                Classes
                {activeTab === 'classes' && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                )}
            </button>
            <button
                onClick={() => onTabChange('routines')}
                className={cn(
                    "pb-4 text-sm font-bold transition-all relative whitespace-nowrap",
                    activeTab === 'routines' ? "text-violet-500" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                Routines
                {activeTab === 'routines' && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                )}
            </button>
            <button
                onClick={() => onTabChange('sparring')}
                className={cn(
                    "pb-4 text-sm font-bold transition-all relative whitespace-nowrap",
                    activeTab === 'sparring' ? "text-violet-500" : "text-zinc-500 hover:text-zinc-300"
                )}
            >
                Sparring
                {activeTab === 'sparring' && (
                    <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                )}
            </button>
        </div>
    );
};
