import React, { useState } from 'react';
import { Trophy, Target, BookOpen, Swords, Dumbbell } from 'lucide-react';
import { TournamentHomeTab } from '../components/arena/TournamentHomeTab';
import { SkillTreeTab } from '../components/journal/SkillTreeTab';
import { JournalTab } from '../components/arena/JournalTab';
import { SparringReviewTab } from '../components/arena/SparringReviewTab';
import { TrainingRoutinesTab } from '../components/arena/TrainingRoutinesTab';
import { MobileTabSelector } from '../components/MobileTabSelector';
import { useAuth } from '../contexts/AuthContext';

type ArenaTab = 'journal' | 'routines' | 'skills' | 'sparring' | 'tournament';

export const Arena: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ArenaTab>('tournament');

    const ARENA_TABS = [
        { id: 'journal', label: '수련일지', icon: BookOpen },
        { id: 'routines', label: '훈련 루틴', icon: Dumbbell },
        { id: 'skills', label: '테크닉 로드맵', icon: Target },
        { id: 'sparring', label: '스파링 복기', icon: Swords },
        { id: 'tournament', label: '시합장', icon: Trophy },
    ];

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header & Tabs */}
            <div className="bg-slate-900 border-b border-slate-800 relative z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-white mb-2">아레나</h1>
                        <p className="text-slate-400">
                            당신의 실력을 증명하고 성장하세요.
                        </p>
                    </div>

                    <div className="flex items-center justify-between">
                        {/* Tab Navigation - Desktop */}
                        <div className="hidden md:flex space-x-6 -mb-6 overflow-x-auto scrollbar-hide">
                            {ARENA_TABS.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id as ArenaTab)}
                                        className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                                            ? 'text-blue-500 border-b-2 border-blue-500'
                                            : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab Navigation - Mobile Dropdown */}
                        <MobileTabSelector
                            tabs={ARENA_TABS}
                            activeTab={activeTab}
                            onTabChange={(id) => setActiveTab(id as any)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === 'journal' && <JournalTab />}
                {activeTab === 'routines' && <TrainingRoutinesTab />}
                {activeTab === 'skills' && <SkillTreeTab />}
                {activeTab === 'sparring' && <SparringReviewTab />}
                {activeTab === 'tournament' && <TournamentHomeTab />}
            </div>
        </div>
    );
};
