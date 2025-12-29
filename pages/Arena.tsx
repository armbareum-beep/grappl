import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target, BookOpen, Swords, Dumbbell } from 'lucide-react';
import { TechniqueSkillTree } from '../components/technique/TechniqueSkillTree';
import { JournalTab } from '../components/arena/JournalTab';
import { SparringReviewTab } from '../components/arena/SparringReviewTab';
import { TrainingRoutinesTab } from '../components/arena/TrainingRoutinesTab';
import { useAuth } from '../contexts/AuthContext';

type ArenaTab = 'routines' | 'sparring' | 'skills' | 'journal';

export const Arena: React.FC = () => {
    const { } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<ArenaTab>('journal');

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const skillTreeId = searchParams.get('id');
        const skillTreeData = searchParams.get('data'); // For encoded guest data

        // If specific skill tree params exist, force skills tab
        if (skillTreeId || skillTreeData) {
            setActiveTab('skills');
            return;
        }

        if (tabParam && ['routines', 'sparring', 'skills', 'journal'].includes(tabParam)) {
            setActiveTab(tabParam as ArenaTab);
        } else if (!tabParam) {
            // If no tab param, default to journal but don't force URL update yet to avoid replace loop
            // unless we want to canonicalize the URL.
            // For now, just let the state handle it.
            setActiveTab('journal');
        }
    }, [searchParams]);

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId as ArenaTab);
        setSearchParams({ tab: tabId });
    };

    const ARENA_TABS = [
        { id: 'journal', label: '수련일지', icon: BookOpen, color: 'blue', desc: '성장 기록' },
        { id: 'routines', label: '훈련 루틴', icon: Dumbbell, color: 'emerald', desc: '매일 10분 드릴' },
        { id: 'skills', label: '테크닉 로드맵', icon: Target, color: 'purple', desc: '기술 체계화' },
    ];

    return (
        <div className="h-[calc(100dvh-64px)] md:h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Tab Navigation Area */}
            <div className="flex-none bg-slate-900 border-b border-slate-800 z-20">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    {/* Desktop Tabs */}
                    <div className="hidden md:flex py-4 gap-3">
                        {ARENA_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const colorClasses = {
                                blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', shadow: 'shadow-blue-900/20', ring: 'ring-blue-500/20', bottomBar: 'bg-blue-500' },
                                emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/50', shadow: 'shadow-emerald-900/20', ring: 'ring-emerald-500/20', bottomBar: 'bg-emerald-500' },
                                purple: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/50', shadow: 'shadow-purple-900/20', ring: 'ring-purple-500/20', bottomBar: 'bg-purple-500' },
                            };
                            const colors = colorClasses[tab.color as keyof typeof colorClasses] || colorClasses.blue;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        relative group flex items-center gap-3 p-3 rounded-xl transition-all duration-300 border text-left
                                        ${isActive
                                            ? `bg-slate-800 ${colors.border} shadow-lg ${colors.shadow} ring-1 ${colors.ring}`
                                            : 'bg-slate-900/50 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
                                        }
                                    `}
                                >
                                    <div className={`p-2 rounded-lg transition-colors ${isActive ? `${colors.bg} ${colors.text}` : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-bold ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                                            {tab.label}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium hidden sm:block">
                                            {tab.desc}
                                        </span>
                                    </div>
                                    {isActive && (
                                        <div className={`absolute bottom-0 left-0 w-full h-0.5 ${colors.bottomBar} rounded-b-xl opacity-50`}></div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Mobile Tabs */}
                    <div className="md:hidden flex overflow-x-auto scrollbar-hide py-0">
                        {ARENA_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const activeColor = tab.color === 'purple' ? 'text-purple-500 border-purple-500' :
                                tab.color === 'emerald' ? 'text-emerald-500 border-emerald-500' :
                                    'text-blue-500 border-blue-500';

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap min-w-fit flex-1 justify-center
                                        ${isActive
                                            ? `${activeColor} bg-slate-900/50 font-bold`
                                            : 'border-transparent text-slate-400 hover:text-slate-200'}
                                    `}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? '' : 'opacity-70'}`} />
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content Area - Full height minus tabs */}
            <div className="flex-1 overflow-hidden relative bg-slate-950">
                {activeTab === 'skills' ? (
                    // Skills: No scroll, full height
                    <div className="w-full h-full touch-none">
                        <TechniqueSkillTree />
                    </div>
                ) : (
                    // Others: Scrollable content
                    <div className="h-full overflow-y-auto overflow-x-hidden">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-6">
                            {activeTab === 'routines' && <TrainingRoutinesTab />}
                            {activeTab === 'sparring' && (
                                <SparringReviewTab
                                    autoRunAI={searchParams.get('action') === 'analyze'}
                                />
                            )}
                            {activeTab === 'journal' && <JournalTab />}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Arena;
