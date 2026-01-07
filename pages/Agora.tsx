
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChainLibrary } from '../components/library/ChainLibrary';
import { SharedRoutineLibrary } from '../components/library/SharedRoutineLibrary';
import { cn } from '../lib/utils';
import { Network, Dumbbell } from 'lucide-react';

type AgoraTab = 'roadmaps' | 'routines';

export const Agora: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    // Default to 'roadmaps' if no tab specified or invalid
    const initialTab = (searchParams.get('tab') as AgoraTab) || 'roadmaps';
    const [activeTab, setActiveTab] = useState<AgoraTab>(
        ['roadmaps', 'routines'].includes(initialTab) ? initialTab : 'roadmaps'
    );

    useEffect(() => {
        // Update state if URL changes
        const tab = searchParams.get('tab') as AgoraTab;
        if (tab && ['roadmaps', 'routines'].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (tab: AgoraTab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24">
            {/* Header Section */}
            <div className="pt-8 pb-4 px-6 md:px-12 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
                <div className="max-w-[1600px] mx-auto">
                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">아고라 <span className="text-zinc-600 font-medium text-lg ml-2">Agora</span></h1>
                    <p className="text-zinc-400 text-sm mb-6">전 세계 그래플러들이 공유한 기술과 훈련 루틴을 만나보세요.</p>

                    <div className="flex gap-8">
                        <button
                            onClick={() => handleTabChange('roadmaps')}
                            className={cn(
                                "pb-3 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2",
                                activeTab === 'roadmaps' ? "text-violet-500" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Network className="w-4 h-4" />
                            스킬 로드맵
                            {activeTab === 'roadmaps' && (
                                <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                            )}
                        </button>
                        <button
                            onClick={() => handleTabChange('routines')}
                            className={cn(
                                "pb-3 text-sm font-bold transition-all relative whitespace-nowrap flex items-center gap-2",
                                activeTab === 'routines' ? "text-violet-500" : "text-zinc-500 hover:text-zinc-300"
                            )}
                        >
                            <Dumbbell className="w-4 h-4" />
                            훈련 루틴
                            {activeTab === 'routines' && (
                                <div className="absolute bottom-[-1px] left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-6 md:px-10 mt-8">
                <div className="max-w-[1600px] mx-auto">
                    {activeTab === 'roadmaps' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ChainLibrary />
                        </div>
                    )}
                    {activeTab === 'routines' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Reusing Routines component but embedded */}
                            <SharedRoutineLibrary />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
