import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicTrainingLogs } from '../lib/api';
import { TrainingLog } from '../types';
import { SocialFeed } from '../components/social/SocialFeed';
import { CreatePostModal } from '../components/social/CreatePostModal';

export const Journal: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadPosts();
    }, []);

    const loadPosts = async () => {
        setLoading(true);
        const { data } = await getPublicTrainingLogs();
        if (data) {
            setPosts(data);
        }
        setLoading(false);
    };

    const handlePostCreated = (newPost: TrainingLog) => {
        setPosts([newPost, ...posts]);
        setShowCreateModal(false);
    };

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-white">커뮤니티</h1>
                </div>
            </div>

            {/* Feed */}
            <div className="max-w-2xl mx-auto">
                {/* Post Input Trigger (Threads Style) */}
                {user && (
                    <div
                        onClick={() => setShowCreateModal(true)}
                        className="border-b border-slate-800 p-4 sm:p-6 cursor-pointer hover:bg-slate-900/30 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                                {user?.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                        {user?.email?.[0].toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Fake Input */}
                            <div className="flex-1">
                                <div className="text-slate-500 text-sm">새로운 소식이 있나요?</div>
                            </div>

                            {/* Post Button (Visual only) */}
                            <button className="px-4 py-1.5 rounded-lg border border-slate-700 text-white text-sm font-bold hover:bg-slate-800 transition-colors">
                                게시
                            </button>
                        </div>
                    </div>
                )}

                <SocialFeed
                    posts={posts}
                    loading={loading}
                    onRefresh={loadPosts}
                />
            </div>

            {/* Create Post Modal */}
            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onPostCreated={handlePostCreated}
                />
            )}
        </div>
    );
};
