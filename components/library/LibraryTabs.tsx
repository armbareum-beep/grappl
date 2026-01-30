import React from 'react';
import { cn } from '../../lib/utils';

export type LibraryTabType = 'all' | 'classes' | 'routines' | 'sparring';

interface LibraryTabsProps {
    activeTab: LibraryTabType;
    onTabChange: (tab: LibraryTabType) => void;
}

const tabs: { key: LibraryTabType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'classes', label: 'Classes' },
    { key: 'routines', label: 'Routines' },
    { key: 'sparring', label: 'Sparring' },
];

export const LibraryTabs: React.FC<LibraryTabsProps> = ({ activeTab, onTabChange }) => {
    return (
        <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md -mx-4 px-4 md:-mx-12 md:px-12">
            <div className="flex gap-8 border-b border-zinc-900 overflow-x-auto no-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => onTabChange(tab.key)}
                        className={cn(
                            "pb-4 pt-4 text-sm font-bold transition-all relative whitespace-nowrap",
                            activeTab === tab.key ? "text-violet-500" : "text-zinc-500 hover:text-zinc-300"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};
