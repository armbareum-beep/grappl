import React from 'react';
import { PublicJournalFeed } from '../components/journal/PublicJournalFeed';

export const Journal: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">커뮤니티 피드</h1>
                    <p className="text-slate-400">
                        다른 수련생들의 훈련 일지를 확인하고 소통하세요
                    </p>
                </div>

                {/* Public Feed */}
                <PublicJournalFeed onLogClick={(log) => console.log('Log clicked', log)} />
            </div>
        </div>
    );
};
