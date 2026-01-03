import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import {
    getPublicTrainingLogs
} from '../lib/api';
import { ErrorScreen } from '../components/ErrorScreen';
import { supabase } from '../lib/supabase';
import { TrainingLog } from '../types';
import { CreatePostModal } from '../components/social/CreatePostModal';
import {
    Activity,
    ChevronDown,
    MessageSquare,
    Library,
    Plus
} from 'lucide-react';
import { ChainLibraryTab } from '../components/arena/ChainLibraryTab';
import { SocialPost } from '../components/social/SocialPost';

export const CommunityFeed: React.FC = () => {
    const { user } = useAuth();
    const [posts, setPosts] = useState<TrainingLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<'feed' | 'library'>(
        (searchParams.get('tab') as 'feed' | 'library') || 'feed'
    );

    // Unified Filter / UI State
    const [filter, setFilter] = useState<string>('all');
    const [showFilterMenu, setShowFilterMenu] = useState(false);

    // Library Specific State (Lifted)
    const [libCategory, setLibCategory] = useState('All');
    const [libViewMode, setLibViewMode] = useState<'grid' | 'list'>('grid');
    const [libSearchQuery, setLibSearchQuery] = useState('');
    const [showLibCategoryMenu, setShowLibCategoryMenu] = useState(false);

    const LIB_CATEGORIES = ['All', 'Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'];

    useEffect(() => {
        loadPosts();
        loadUserAvatar();
    }, [user]);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'library') setActiveTab('library');
        else setActiveTab('feed');
    }, [searchParams]);

    const handleTabChange = (tab: 'feed' | 'library') => {
        setActiveTab(tab);
        setSearchParams({ tab });
    };

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
            const result = await getPublicTrainingLogs(1, 40);
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
            return true;
        }
        return feedType === filter;
    });

    if (error) return <ErrorScreen error={error} />;

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-200" onClick={() => setShowFilterMenu(false)}>

            {/* 1. View Mode Toggle (Fixed Top Left) - Only for Library */}
            {activeTab === 'library' && (
                <div className="fixed top-24 left-4 md:left-8 z-[60] animate-in fade-in slide-in-from-left-4 duration-500">
                    <div className="flex items-center bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-full p-1 shadow-2xl h-12">
                        <button
                            onClick={() => setLibViewMode('list')}
                            className={`flex items-center justify-center gap-2 px-4 h-10 rounded-full transition-all duration-300 ${libViewMode === 'list'
                                ? 'bg-violet-600 text-white shadow-lg'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            <Library className="w-4 h-4 md:hidden" />
                            <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">리스트</span>
                        </button>
                        <button
                            onClick={() => setLibViewMode('grid')}
                            className={`flex items-center justify-center gap-2 px-4 h-10 rounded-full transition-all duration-300 ${libViewMode === 'grid'
                                ? 'bg-violet-600 text-white shadow-lg'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                                }`}
                        >
                            <Activity className="w-4 h-4 md:hidden" />
                            <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">썸네일</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Page Tab Navigation (Fixed to Top Right) */}
            <div className="fixed top-24 right-4 md:right-8 z-[60] animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-full p-1 shadow-2xl h-12">
                    <button
                        onClick={() => handleTabChange('feed')}
                        className={`flex items-center justify-center gap-2 px-4 h-10 rounded-full transition-all duration-300 ${activeTab === 'feed'
                            ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <MessageSquare className="w-4 h-4 md:hidden" />
                        <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">커뮤니티 피드</span>
                    </button>
                    <button
                        onClick={() => handleTabChange('library')}
                        className={`flex items-center justify-center gap-2 px-4 h-10 rounded-full transition-all duration-300 ${activeTab === 'library'
                            ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <Library className="w-4 h-4 md:hidden" />
                        <span className="hidden md:inline text-[11px] font-black uppercase tracking-wider">체인 라이브러리</span>
                    </button>
                </div>
            </div>

            {/* 3. Central Category Filter (Common Structure) */}
            <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-top-1 duration-500">
                <div className="relative group">
                    <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-full p-1 shadow-2xl transition-all duration-300 hover:bg-zinc-900/80 h-12 flex items-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (activeTab === 'feed') setShowFilterMenu(!showFilterMenu);
                                else setShowLibCategoryMenu(!showLibCategoryMenu);
                            }}
                            className="flex items-center justify-center gap-2 px-6 h-10 text-[13px] font-black text-zinc-100 transition-colors uppercase tracking-[0.1em]"
                        >
                            <span className={(activeTab === 'feed' ? filter !== 'all' : libCategory !== 'All') ? 'text-violet-400' : ''}>
                                {activeTab === 'feed' ? getFilterLabel(filter) : (libCategory === 'All' ? 'All' : libCategory)}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform duration-300 ${(activeTab === 'feed' ? showFilterMenu : showLibCategoryMenu) ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {/* Feed Dropdown */}
                    {activeTab === 'feed' && showFilterMenu && (
                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-[24px] shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {[
                                { id: 'all', label: '추천' },
                                { id: 'following', label: '팔로잉' },
                                { id: 'course', label: '클래스' },
                                { id: 'sparring', label: '스파링' },
                                { id: 'training', label: '수련일지' },
                                { id: 'technique_roadmap', label: '테크닉로드맵' }
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => { setFilter(item.id); setShowFilterMenu(false); }}
                                    className={`w-full text-center px-5 py-3 text-xs font-bold transition-all hover:bg-white/5 ${filter === item.id ? 'text-violet-400 bg-violet-500/5' : 'text-zinc-400'}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Library Dropdown */}
                    {activeTab === 'library' && showLibCategoryMenu && (
                        <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-48 bg-zinc-900/95 backdrop-blur-2xl border border-zinc-800 rounded-[24px] shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            {LIB_CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => { setLibCategory(cat); setShowLibCategoryMenu(false); }}
                                    className={`w-full text-center px-5 py-3 text-xs font-bold transition-all hover:bg-white/5 ${libCategory === cat ? 'text-violet-400 bg-violet-500/5' : 'text-zinc-400'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area - ADJUSTED PT TO 30 AS REQUESTED */}
            <main className={`mx-auto pt-[30px] pb-32 transition-all ${activeTab === 'library' ? 'max-w-7xl px-5' : 'max-w-xl px-4'}`}>
                {activeTab === 'feed' ? (
                    <>
                        <div className="h-[52px]" />
                        {/* Post Input Trigger - Hidden on mobile, FAB is used instead */}
                        {user && (
                            <div
                                onClick={() => setShowCreateModal(true)}
                                className="hidden md:block mb-6 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 cursor-pointer hover:border-zinc-700 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                                        {userAvatar ? (
                                            <img src={userAvatar} className="w-full h-full object-cover" alt="Profile" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500 font-bold text-sm">
                                                {user.email?.[0].toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-zinc-500 text-sm">새로운 소식을 공유해보세요...</div>
                                    <button className="px-6 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                                        게시
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Single Column Feed */}
                        {loading && posts.length === 0 ? (
                            <div className="columns-1 gap-4 space-y-4">
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <div key={i} className="break-inside-avoid animate-pulse bg-zinc-900/40 rounded-2xl border border-zinc-900" style={{ height: `${200 + Math.random() * 200}px` }} />
                                ))}
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="text-center py-20 px-4">
                                <Activity className="w-10 h-10 text-zinc-700 mx-auto mb-4" />
                                <h3 className="text-zinc-300 font-bold text-lg">아직 기록이 없습니다</h3>
                                <p className="text-zinc-500">첫 번째 수련 기록의 주인공이 되어보세요!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredPosts.map(post => (
                                    <SocialPost key={post.id} post={post} />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <ChainLibraryTab
                        category={libCategory}
                        viewMode={libViewMode}
                        searchQuery={libSearchQuery}
                        onSearchChange={setLibSearchQuery}
                    />
                )}
            </main>

            {/* 만들기 FAB (Floating Action Button) - Circular Icon Only */}
            {user && (
                <div className="fixed bottom-24 right-6 z-[70] md:bottom-12 md:right-12">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="group flex items-center justify-center bg-violet-600 hover:bg-violet-500 text-white p-4 md:p-5 rounded-full shadow-[0_12px_40px_rgba(124,58,237,0.5)] transition-all duration-500 hover:scale-110 active:scale-90"
                    >
                        <Plus className="w-7 h-7 md:w-8 md:h-8" />
                    </button>
                </div>
            )}

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

// FeedCard component was removed to use common SocialPost component
