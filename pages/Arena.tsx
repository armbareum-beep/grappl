import React, { useState } from 'react';
import { Trophy, Target } from 'lucide-react';
import { TournamentTab } from '../components/journal/TournamentTab';
import { SkillTreeTab } from '../components/journal/SkillTreeTab';
import { MobileTabSelector } from '../components/MobileTabSelector';
import { BeltProgressBar } from '../components/BeltProgressBar';
import { useAuth } from '../contexts/AuthContext';

export const Arena: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'tournament' | 'skills'>('tournament');

    const ARENA_TABS = [
        { id: 'tournament', label: '시합장', icon: Trophy },
        { id: 'skills', label: '스킬 로드맵', icon: Target },
    ];

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header & Tabs */}
            <div className="bg-white border-b border-slate-200 relative z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">아레나</h1>
                            <p className="text-slate-600">
                                당신의 실력을 증명하고 성장하세요.
                            </p>
                        </div>

                        {/* Level Up System (Belt Progress) - Always Visible */}
                        {user && (
                            <div className="w-full md:w-1/3">
                                <BeltProgressBar userId={user.id} />
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        {/* Tab Navigation - Desktop */}
                        <div className="hidden md:flex space-x-6 -mb-6">
                            <button
                                onClick={() => setActiveTab('tournament')}
                                className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'tournament' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Trophy className="w-4 h-4" />
                                시합장
                            </button>
                            <button
                                onClick={() => setActiveTab('skills')}
                                className={`pb-4 px-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === 'skills' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <Target className="w-4 h-4" />
                                스킬 로드맵
                            </button>
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
                {activeTab === 'tournament' ? (
                    <TournamentTab />
                ) : (
                    <SkillTreeTab />
                )}
            </div>
        </div>
    );
};
