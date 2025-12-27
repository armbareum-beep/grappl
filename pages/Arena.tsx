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
        { id: 'sparring', label: '스파링 복기', icon: Swords, color: 'red', desc: 'AI 분석 & 피드백' },
    ];

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Premium Header */}
            <div className="relative bg-slate-900 border-b border-slate-800 pt-8 pb-4 px-4 md:px-8 overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="mb-8">
                        <h1 className="text-3xl font-black text-white mb-2 flex items-center gap-3">
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                아레나
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                BETA
                            </span>
                        </h1>
                        <p className="text-slate-400 text-sm max-w-xl leading-relaxed break-keep">
                            체계적인 훈련과 데이터 기반의 분석으로 당신의 주짓수를 완성하세요.
                            <br className="block" />
                            매일의 루틴이 챔피언을 만듭니다.
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    {/* Tab Navigation - Desktop */}
                    <div className="hidden md:flex flex-wrap gap-3">
                        {ARENA_TABS.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;

                            // Color classes mapping
                            const colorClasses = {
                                blue: {
                                    bg: 'bg-blue-500/20',
                                    text: 'text-blue-400',
                                    border: 'border-blue-500/50',
                                    shadow: 'shadow-blue-900/20',
                                    ring: 'ring-blue-500/20',
                                    bottomBar: 'bg-blue-500'
                                },
                                emerald: {
                                    bg: 'bg-emerald-500/20',
                                    text: 'text-emerald-400',
                                    border: 'border-emerald-500/50',
                                    shadow: 'shadow-emerald-900/20',
                                    ring: 'ring-emerald-500/20',
                                    bottomBar: 'bg-emerald-500'
                                },
                                purple: {
                                    bg: 'bg-purple-500/20',
                                    text: 'text-purple-400',
                                    border: 'border-purple-500/50',
                                    shadow: 'shadow-purple-900/20',
                                    ring: 'ring-purple-500/20',
                                    bottomBar: 'bg-purple-500'
                                },
                                red: {
                                    bg: 'bg-red-500/20',
                                    text: 'text-red-400',
                                    border: 'border-red-500/50',
                                    shadow: 'shadow-red-900/20',
                                    ring: 'ring-red-500/20',
                                    bottomBar: 'bg-red-500'
                                },
                                amber: {
                                    bg: 'bg-amber-500/20',
                                    text: 'text-amber-400',
                                    border: 'border-amber-500/50',
                                    shadow: 'shadow-amber-900/20',
                                    ring: 'ring-amber-500/20',
                                    bottomBar: 'bg-amber-500'
                                }
                            };

                            const colors = colorClasses[tab.color as keyof typeof colorClasses];

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
                                    <div className={`
                                        p-2 rounded-lg transition-colors
                                        ${isActive ? `${colors.bg} ${colors.text}` : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}
                                    `}>
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

                    {/* Mobile Dropdown Navigation */}
                    <div className="md:hidden relative">
                        <select
                            value={activeTab}
                            onChange={(e) => handleTabChange(e.target.value)}
                            className="w-full appearance-none bg-slate-800 border border-slate-700 text-white py-3 px-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            {ARENA_TABS.map((tab) => (
                                <option key={tab.id} value={tab.id}>
                                    {tab.label} - {tab.desc}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[600px]">
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'routines' && <TrainingRoutinesTab />}
                    {activeTab === 'sparring' && (
                        <SparringReviewTab
                            autoRunAI={searchParams.get('action') === 'analyze'}
                        />
                    )}
                    {activeTab === 'skills' && <TechniqueSkillTree />}
                    {activeTab === 'journal' && <JournalTab />}
                </div>
            </div>
        </div>
    );
};
