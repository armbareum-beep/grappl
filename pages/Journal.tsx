import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicTrainingLogs } from '../lib/api';
import { TrainingLog } from '../types';
import { SocialFeed } from '../components/social/SocialFeed';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { ErrorScreen } from '../components/ErrorScreen';
import { supabase } from '../lib/supabase';
import { ChevronDown } from 'lucide-react';
import { LoadingTimeoutGuard } from '../components/common/LoadingTimeoutGuard';

export const Journal: React.FC = () => {
    const { user } = useAuth();

    const [posts, setPosts] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showCreateModal, setShowCreateModal] = useState(false);

    const [userAvatar, setUserAvatar] = useState<string | null>(null);


    // Filter State
    const [filter, setFilter] = useState<'all' | 'sparring' | 'training' | 'lesson' | 'routine' | 'drill' | 'course' | 'technique_roadmap' | 'training_routine'>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    useEffect(() => {
        loadPosts();
        loadUserAvatar();
    }, [user]);



    const loadUserAvatar = async () => {
        if (!user) return;

        try {
            const { data } = await supabase
                .from('users')
                .select('avatar_url')
                .eq('id', user.id)
                .single();

            if (data?.avatar_url) {
                setUserAvatar(data.avatar_url);
            }
        } catch (err) {
            console.error('Error loading user avatar:', err);
        }
    };

    const loadPosts = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getPublicTrainingLogs(1, 20); // Fetch more for filtering

            if (result.error) throw result.error;

            if (result.data) {
                setPosts(result.data);
            }
        } catch (err: any) {
            console.error('Error loading posts:', err);
            setError(err.message || '게시물을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePostCreated = (newPost: TrainingLog) => {
        setPosts([newPost, ...posts]);
        setShowCreateModal(false);
    };

    const filteredPosts = posts.filter(post => {
        if (filter === 'all') return true;

        // location에서 타입 추출 (__FEED__{type} 형식)
        const feedType = post.location?.replace('__FEED__', '') || post.type;

        if (filter === 'sparring') {
            return feedType === 'sparring' || post.type === 'sparring' || (post.sparringRounds && post.sparringRounds > 0) || (post.metadata?.result);
        }
        if (filter === 'training') {
            return feedType === 'training' || feedType === 'general' || (!feedType && !post.sparringRounds && (!post.type || post.type === 'general' || post.type === 'technique'));
        }
        if (filter === 'lesson') {
            return feedType === 'lesson';
        }
        if (filter === 'routine') {
            return feedType === 'routine';
        }
        if (filter === 'drill') {
            return feedType === 'drill';
        }
        if (filter === 'course') {
            return feedType === 'course';
        }
        if (filter === 'technique_roadmap') {
            return feedType === 'technique_roadmap';
        }
        if (filter === 'training_routine') {
            return feedType === 'training_routine';
        }

        return true;
    });

    if (error) {
        return <ErrorScreen error={error} resetMessage="피드 게시물을 불러오는 중 오류가 발생했습니다. 앱이 업데이트되었을 가능성이 있습니다." />;
    }
    const getFilterLabel = (f: string) => {
        const labels: Record<string, string> = {
            'all': '추천',
            'following': '팔로잉',
            'course': '클래스',
            'lesson': '레슨',
            'routine': '루틴',
            'drill': '드릴',
            'sparring': '스파링',
            'training': '수련일지',
            'training_routine': '훈련루틴',
            'technique_roadmap': '테크닉로드맵'
        };
        return labels[f] || '추천';
    };

    return (
        <div className="min-h-screen bg-slate-950" onClick={() => setShowFilterMenu(false)}>
            {/* Header (Threads Style Dropdown) */}
            <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 transition-all duration-200">
                <div className="max-w-xl mx-auto h-14 flex items-center justify-center px-4 relative">
                    {/* Dropdown Trigger */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
                        className="flex items-center gap-2 text-lg font-bold text-zinc-100 hover:text-zinc-300 transition-colors"
                    >
                        {getFilterLabel(filter)}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {showFilterMenu && (
                        <div className="absolute top-12 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-200">
                            {[
                                { id: 'all', label: '추천' },
                                { id: 'following', label: '팔로잉' },
                                { id: 'course', label: '클래스' },
                                { id: 'lesson', label: '레슨' },
                                { id: 'routine', label: '루틴' },
                                { id: 'drill', label: '드릴' },
                                { id: 'sparring', label: '스파링' },
                                { id: 'training', label: '수련일지' },
                                { id: 'training_routine', label: '훈련루틴' },
                                { id: 'technique_roadmap', label: '테크닉로드맵' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setFilter(item.id as any)}
                                    className={`w-full text-left px-6 py-3 font-medium transition-colors hover:bg-zinc-800 ${filter === item.id ? 'text-violet-500' : 'text-zinc-300'
                                        }`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Feed */}
            <div className="max-w-xl mx-auto">
            </div>

            {/* Post Input Trigger (Threads Style) */}
            {user && (
                <div className="max-w-2xl mx-auto">
                    <div
                        onClick={() => setShowCreateModal(true)}
                        className="border-b border-slate-900 p-4 sm:p-5 cursor-pointer hover:bg-slate-900/20 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-slate-800 overflow-hidden flex-shrink-0">
                                {userAvatar ? (
                                    <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold">
                                        {user?.email?.[0].toUpperCase() || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Fake Input */}
                            <div className="flex-1 flex items-center justify-center h-9">
                                <div className="text-slate-500 text-sm">새로운 소식이 있나요?</div>
                            </div>

                            {/* Post Button (Visual only) */}
                            <div className="h-9 flex items-center">
                                <button className="px-5 py-1.5 rounded-full border border-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors">
                                    게시
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <SocialFeed
                posts={filteredPosts}
                loading={loading}
                onRefresh={loadPosts}
            />

            {/* Create Post Modal */}
            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onPostCreated={handlePostCreated}
                />
            )}

            {/* Cache Refresh Modal */}
            <LoadingTimeoutGuard loading={loading} />

        </div>
    );
};