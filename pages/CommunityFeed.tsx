import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicTrainingLogs } from '../lib/api';
import { TrainingLog } from '../types';
import { SocialPost } from '../components/social/SocialPost';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { ErrorScreen } from '../components/ErrorScreen';
import { supabase } from '../lib/supabase';
import {
    Activity,
    ChevronDown
} from 'lucide-react';

export const CommunityFeed: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);

    // Filter State
    const [filter, setFilter] = useState<string>('all');
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
            if (data?.avatar_url) setUserAvatar(data.avatar_url);
        } catch (err) {
            console.error('Error loading avatar:', err);
        }
    };

    const loadPosts = async () => {
        try {
            setLoading(true);
            setError(null);
            const result = await getPublicTrainingLogs(1, 40); // 좀 더 넉넉히 가져옴
            if (result.error) throw result.error;

            if (result.data) {
                setPosts(result.data);
            }
        } catch (err: any) {
            console.error('Feed loading error:', err);
            setError('피드를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handlePostCreated = (newPost: TrainingLog) => {
        setPosts([newPost, ...posts]);
        setShowCreateModal(false);
    };

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

    const filteredPosts = posts.filter(post => {
        if (filter === 'all') return true;

        const feedType = post.location?.replace('__FEED__', '') || post.type;

        if (filter === 'sparring') {
            return feedType === 'sparring' || post.type === 'sparring' || (post.sparringRounds && post.sparringRounds > 0);
        }
        if (filter === 'training') {
            return feedType === 'training' || feedType === 'general' || (!feedType && !post.sparringRounds);
        }
        if (filter === 'following') {
            // 임시로 추천과 동일하게 처리하거나 전용 로직 필요
            return true;
        }
        return feedType === filter;
    });

    if (error) return <ErrorScreen error={error} />;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200" onClick={() => setShowFilterMenu(false)}>
            {/* Header (Threads Style Dropdown) */}
            <div className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 transition-all duration-200">
                <div className="max-w-xl mx-auto h-14 flex items-center justify-center px-4 relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowFilterMenu(!showFilterMenu); }}
                        className="flex items-center gap-2 text-lg font-bold text-zinc-100 hover:text-zinc-300 transition-colors"
                    >
                        {getFilterLabel(filter)}
                        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                    </button>

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
                                    onClick={() => { setFilter(item.id); setShowFilterMenu(false); }}
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

            <main className="max-w-xl mx-auto">
                {/* Post Input Trigger */}
                {user && (
                    <div
                        onClick={() => setShowCreateModal(true)}
                        className="border-b border-zinc-900 p-4 cursor-pointer hover:bg-zinc-900/20 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-800">
                                {userAvatar ? (
                                    <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 text-zinc-500 text-sm">새로운 소식이 있나요?</div>
                            <button className="px-5 py-1.5 rounded-full border border-zinc-800 text-zinc-100 text-xs font-bold hover:bg-zinc-900 transition-colors">
                                게시
                            </button>
                        </div>
                    </div>
                )}

                {/* 피드 목록 */}
                <div className="space-y-0">
                    {loading && posts.length === 0 ? (
                        <div className="space-y-6 px-4 py-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse bg-zinc-900/40 rounded-3xl h-64 border border-zinc-900" />
                            ))}
                        </div>
                    ) : (
                        filteredPosts.map(post => (
                            <SocialPost key={post.id} post={post} />
                        ))
                    )}

                    {!loading && filteredPosts.length === 0 && (
                        <div className="text-center py-20 px-4">
                            <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                                <Activity className="w-10 h-10 text-zinc-700" />
                            </div>
                            <h3 className="text-zinc-300 font-bold text-lg">아직 기록이 없습니다</h3>
                            <p className="text-zinc-500">첫 번째 수련 기록의 주인공이 되어보세요!</p>
                        </div>
                    )}
                </div>
            </main>

            {/* 만들기 모달 */}
            {showCreateModal && (
                <CreatePostModal
                    onClose={() => setShowCreateModal(false)}
                    onPostCreated={handlePostCreated}
                />
            )}
        </div>
    );
};
