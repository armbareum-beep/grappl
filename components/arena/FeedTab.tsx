import React from 'react';
import { PublicJournalFeed } from '../journal/PublicJournalFeed';

export const FeedTab: React.FC = () => {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-2">커뮤니티 피드</h2>
                <p className="text-slate-400 text-sm">다른 수련생들의 훈련 일지를 확인하세요</p>
            </div>
            <PublicJournalFeed onLogClick={(log) => console.log('Log clicked', log)} />
        </div>
    );
};
