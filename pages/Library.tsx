import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Browse } from './Browse';
import { Routines } from './Routines';
import { SparringFeed } from './SparringFeed';
import { AllContentFeed } from '../components/library/AllContentFeed';
import { LibraryTabType } from '../components/library/LibraryTabs';

export const Library: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as LibraryTabType) || 'all';
    const [activeTab, setActiveTab] = useState<LibraryTabType>(initialTab);

    // Sync activeTab with URL params
    useEffect(() => {
        const tab = (searchParams.get('tab') as LibraryTabType) || 'all';
        if (tab !== activeTab) {
            setActiveTab(tab);
        }
    }, [searchParams, activeTab]);

    const handleTabChange = (tab: LibraryTabType) => {
        // Keep existing non-tab params if possible, or reset them when switching tabs
        const newParams: Record<string, string> = { tab };
        setSearchParams(newParams);
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24 px-6 md:px-10">
            {/* Content Area */}
            <div className="max-w-[1600px] mx-auto mt-8">
                {activeTab === 'all' && (
                    <AllContentFeed
                        key="all-content"
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}
                {activeTab === 'classes' && (
                    <Browse
                        key="classes-feed"
                        isEmbedded={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}
                {activeTab === 'routines' && (
                    <Routines
                        key="routines-feed"
                        isEmbedded={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}
                {activeTab === 'sparring' && (
                    <SparringFeed
                        key="sparring-feed"
                        isEmbedded={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}
            </div>
        </div>
    );
};
