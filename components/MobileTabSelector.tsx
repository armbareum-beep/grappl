import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Tab {
    id: string;
    label: string;
    icon?: React.ElementType;
}

interface MobileTabSelectorProps {
    tabs: Tab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
}

export const MobileTabSelector: React.FC<MobileTabSelectorProps> = ({
    tabs,
    activeTab,
    onTabChange
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectedTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
    const Icon = selectedTab?.icon;

    return (
        <div className="relative md:hidden mb-6">
            {/* Backdrop to close dropdown when clicking outside */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Main Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 shadow-sm active:bg-zinc-800 transition-colors"
            >
                <div className="flex items-center gap-3">
                    {Icon && <Icon className="w-5 h-5 text-violet-400" />}
                    <span className="font-medium text-white">{selectedTab?.label}</span>
                </div>
                <ChevronDown
                    className={`w-5 h-5 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Dropdown List */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="py-1 max-h-[60vh] overflow-y-auto">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            const isActive = activeTab === tab.id;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        onTabChange(tab.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${isActive ? 'bg-violet-500/10 text-violet-400' : 'text-zinc-400 hover:bg-zinc-800'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {TabIcon && (
                                            <TabIcon className={`w-5 h-5 ${isActive ? 'text-violet-400' : 'text-zinc-500'}`} />
                                        )}
                                        <span className={`font-medium ${isActive ? 'text-violet-400' : 'text-zinc-300'}`}>
                                            {tab.label}
                                        </span>
                                    </div>
                                    {isActive && <Check className="w-4 h-4 text-violet-400" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
