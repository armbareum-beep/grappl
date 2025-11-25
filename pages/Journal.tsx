import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicTrainingLogs } from '../lib/api';
import { TrainingLog } from '../types';
import { SocialFeed } from '../components/social/SocialFeed';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { Plus } from 'lucide-react';

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
                    {user && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>
            </div>

            {/* Feed */}
            <div className="max-w-2xl mx-auto">
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
