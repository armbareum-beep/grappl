import React, { useState, useEffect } from 'react';
import { TrainingLog } from '../../types';
import { SocialPost } from './SocialPost';
import { Loader2, RefreshCw } from 'lucide-react';

interface SocialFeedProps {
    posts: TrainingLog[];
    loading: boolean;
    onRefresh: () => void;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ posts, loading, onRefresh }) => {
    const [showRefreshButton, setShowRefreshButton] = useState(false);

    useEffect(() => {
        if (loading) {
            setShowRefreshButton(false);
            const timer = setTimeout(() => {
                setShowRefreshButton(true);
            }, 5000); // Show refresh button after 5 seconds

            return () => clearTimeout(timer);
        }
    }, [loading]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                {showRefreshButton && (
                    <div className="text-center">
                        <p className="text-slate-400 text-sm mb-3">로딩이 오래 걸리고 있습니다</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            캐시 삭제 후 새로고침
                        </button>
                    </div>
                )}
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
