import React from 'react';
import { TrainingLog } from '../../types';
import { SocialPost } from './SocialPost';

interface SocialFeedProps {
    posts: TrainingLog[];
    loading: boolean;
}

export const SocialFeed: React.FC<SocialFeedProps> = ({ posts, loading }) => {

    if (loading) {
        return (
            <div className="space-y-4 py-4 animate-in fade-in duration-500">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-slate-900/40 rounded-3xl p-6 border border-slate-800/50 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-800 animate-pulse" />
                            <div className="space-y-2">
                                <div className="w-24 h-4 bg-slate-800 rounded animate-pulse" />
                                <div className="w-16 h-3 bg-slate-800/50 rounded animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="w-full h-4 bg-slate-800 rounded animate-pulse" />
                            <div className="w-3/4 h-4 bg-slate-800 rounded animate-pulse" />
                        </div>
                        <div className="w-full aspect-video bg-slate-800 rounded-2xl animate-pulse" />
                    </div>
                ))}
            </div>
        );
    }

    if (posts.length === 0) {
        return (
            <div className="text-center py-32 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-700/50 rotate-3">
                    <span className="text-4xl">💭</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">아직 게시물이 없습니다</h3>
                <p className="text-slate-400 max-w-xs mx-auto text-sm leading-relaxed">
                    첫 번째 게시물을 작성하여 당신의 훈련 경험을 공유해보세요!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 py-4 max-w-2xl mx-auto">
            {posts.map((post) => (
                <SocialPost key={post.id} post={post} />
            ))}
        </div>
    );
};
