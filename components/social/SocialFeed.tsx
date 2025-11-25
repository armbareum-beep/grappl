import React, { useState } from 'react';
import { TrainingLog } from '../../types';
import { SocialPost } from './SocialPost';
import { Loader2 } from 'lucide-react';

interface SocialFeedProps {
    posts: TrainingLog[];
    loading: boolean;
    onRefresh: () => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ posts, loading, onRefresh }) => {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-20 px-4">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">💬</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">아직 게시물이 없습니다</h3>
                <p className="text-slate-400 text-sm">첫 번째 게시물을 작성해보세요!</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-800">
            {posts.map((post) => (
                <SocialPost key={post.id} post={post} />
            ))}
        </div>
    );
};
