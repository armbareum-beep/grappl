import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target, BookOpen, Dumbbell } from 'lucide-react';
import { TechniqueRoadmapDashboard } from '../components/technique/TechniqueRoadmapDashboard';
import { JournalTab } from '../components/arena/JournalTab';
import { SparringReviewTab } from '../components/arena/SparringReviewTab';
import { TrainingRoutinesTab } from '../components/arena/TrainingRoutinesTab';
import { useAuth } from '../contexts/AuthContext';

type ArenaTab = 'routines' | 'sparring' | 'skills' | 'journal';

export const Arena: React.FC = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<ArenaTab>('journal');
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        const skillTreeId = searchParams.get('id');
        const skillTreeData = searchParams.get('data'); // For encoded guest data

        // If specific skill tree params exist, force skills tab (Viewer)
        if (skillTreeId || skillTreeData) {
            setActiveTab('skills');
        }

        if (tabParam && ['routines', 'sparring', 'skills', 'journal'].includes(tabParam)) {
            setActiveTab(tabParam as ArenaTab);
        } else if (!tabParam) {
            // Guest users: default to 'skills' to showcase community content (or guest roadmap)
            // Logged-in users: default to 'journal'
            setActiveTab(user ? 'journal' : 'skills');
        }
    }, [searchParams, user]);

    // Detect fullscreen changes (both browser and internal simulated)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullScreen(!!document.fullscreenElement);
        };

        const handleInternalFullscreen = (e: any) => {
            setIsFullScreen(e.detail);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        window.addEventListener('app-fullscreen-toggle', handleInternalFullscreen);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            window.removeEventListener('app-fullscreen-toggle', handleInternalFullscreen);
        };
    }, []);

    const handleTabChange = (tabId: ArenaTab) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    const ARENA_TABS = [
        { id: 'journal', label: '수련일지', icon: BookOpen, color: 'indigo', desc: '오늘의 기록' },
        { id: 'routines', label: '훈련 루틴', icon: Dumbbell, color: 'emerald', desc: '매일 10분 드릴' },
        { id: 'skills', label: '테크닉 로드맵', icon: Target, color: 'purple', desc: '기술 체계화' },
    ];

    return (
        <div className="h-[calc(100dvh-64px)] md:h-[calc(100vh-64px)] bg-slate-950 text-white flex flex-col overflow-hidden">
            {/* Floating Tab Navigation - Capsule Style */}
            <div className={`fixed ${isFullScreen ? '!top-4' : '!top-[94px]'} left-1/2 -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none`}>
                <div className="inline-flex items-center bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-full p-1 gap-1 pointer-events-auto shadow-2xl h-12">
                    {ARENA_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        const isLocked = !user && (tab.id === 'routines' || tab.id === 'journal');

                        return (
                            <div key={tab.id} className="relative group">
                                <button
                                    onClick={() => {
                                        if (isLocked) {
                                            window.location.href = '/login';
                                        } else {
                                            handleTabChange(tab.id as ArenaTab);
                                        }
                                    }}
                                    className={`
                                        flex items-center justify-center gap-1.5 px-3 md:px-6 h-10 rounded-full text-xs font-black transition-all duration-300 uppercase tracking-wider
                                        ${isActive
                                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                                            : isLocked
                                                ? 'bg-transparent text-zinc-600 hover:text-zinc-400 cursor-pointer'
                                                : 'bg-transparent text-zinc-500 hover:text-zinc-300'
                                        }
                                    `}
                                >
                                    <Icon className="w-4 h-4 md:hidden" />
                                    <span className="hidden md:inline">{tab.label}</span>
                                </button>
                                {isLocked && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-violet-500 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
                                        로그인하여 모든 기능 활용하기
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-violet-500"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area - Full height minus tabs */}
            <div className="flex-1 overflow-hidden relative bg-zinc-950">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 bg-violet-900/10 blur-[100px] pointer-events-none rounded-full" />
                {activeTab === 'skills' ? (
                    <div className="w-full h-full relative">
                        <TechniqueRoadmapDashboard />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto overflow-x-hidden relative z-10">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pb-6">
                            {activeTab === 'journal' && <JournalTab />}
                            {activeTab === 'routines' && <TrainingRoutinesTab />}
                            {activeTab === 'sparring' && <SparringReviewTab />}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};

export default Arena;
