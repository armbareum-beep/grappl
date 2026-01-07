import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Browse } from './Browse';
import { Routines } from './Routines';
import { SparringFeed } from './SparringFeed';

type LibraryTab = 'classes' | 'routines' | 'sparring';

export const Library: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialTab = (searchParams.get('tab') as LibraryTab) || 'classes';
    const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);

    const handleTabChange = (tab: LibraryTab) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-24 px-6 md:px-10">
            {/* Content Area */}
            <div className="max-w-[1600px] mx-auto mt-8">
                {activeTab === 'classes' && (
                    <Browse
                        isEmbedded={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}
                {activeTab === 'routines' && (
                    <Routines
                        isEmbedded={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}
                {activeTab === 'sparring' && (
                    <SparringFeed
                        isEmbedded={true}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                        forceViewMode="grid"
                    />
                )}
            </div>
        </div>
    );
};
