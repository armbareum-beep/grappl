import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getPublicTrainingLogs } from '../lib/api';
import { TrainingLog } from '../types';
import { SocialFeed } from '../components/social/SocialFeed';
import { CreatePostModal } from '../components/social/CreatePostModal';
import { ErrorScreen } from '../components/ErrorScreen';
import { supabase } from '../lib/supabase';
import { ChevronDown, Bot, Sparkles, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Journal: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
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

    // Add timeout detection
    useEffect(() => {
        if (loading) {
            const timeout = setTimeout(() => {
                if (loading) {
                    setError('Error: Feed timeout');
                    setLoading(false);
                }
            }, 5000);

            return () => clearTimeout(timeout);
        }
    }, [loading]);

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

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Header (Threads Style) */}
            <div className="sticky top-16 z-40 bg-slate-950/95 backdrop-blur-sm border-b border-slate-900 transition-all duration-200">
                <div className="max-w-xl mx-auto h-14 flex items-center justify-center relative">
                    {/* Dropdown Trigger */}
                    <button
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-900 transition-colors"
                    >
                        <span className="text-white font-bold text-lg">
                            {filter === 'all' ? '추천' :
                                filter === 'sparring' ? '스파링 복기' :
                                    filter === 'training' ? '수련 일지' :
                                        filter === 'lesson' ? '레슨' :
                                            filter === 'routine' ? '루틴' :
                                                filter === 'drill' ? '드릴' :
                                                    filter === 'course' ? '클래스' :
                                                        filter === 'technique_roadmap' ? '테크닉로드맵' :
                                                            filter === 'training_routine' ? '훈련루틴' : '추천'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Filter Menu */}
                    {showFilterMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowFilterMenu(false)} />
                            <div className="absolute top-12 bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden z-50 min-w-[180px] animate-in fade-in zoom-in-95 duration-100 flex flex-col">
                                {[
                                    { id: 'all', label: '추천' },
                                    { id: 'sparring', label: '스파링 복기' },
                                    { id: 'training', label: '수련 일지' },
                                    { id: 'lesson', label: '레슨' },
                                    { id: 'routine', label: '루틴' },
                                    { id: 'drill', label: '드릴' },
                                    { id: 'course', label: '클래스' },
                                    { id: 'technique_roadmap', label: '테크닉로드맵' },
                                    { id: 'training_routine', label: '훈련루틴' },
                                ].map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => { setFilter(option.id as any); setShowFilterMenu(false); }}
                                        className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors border-b border-slate-900 last:border-0 ${filter === option.id ? 'text-white bg-slate-900' : 'text-slate-400 hover:text-white hover:bg-slate-900'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span>{option.label}</span>
                                            {filter === option.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Feed */}
            <div className="max-w-xl mx-auto">
                {/* AI Coach Analysis Widget */}
                <div className="mb-6 relative group overflow-hidden rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-900/40 via-purple-900/40 to-slate-900/80 p-6 flex flex-col justify-between transition-all hover:border-indigo-400/50 hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer" onClick={() => navigate('/arena?tab=sparring')}>
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-400/30 transition-colors"></div>

                    <div className="relative z-10 flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-300">
                                <Bot className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base group-hover:text-indigo-200 transition-colors">AI 코치 분석</h3>
                                <p className="text-xs text-indigo-200/70">Gemini Pro가 플레이를 분석합니다</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-bold text-indigo-300 animate-pulse">
                            LIVE
                        </div>
                    </div>

                    <div className="relative z-10">
                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>서브미션 기회 포착</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>포지션 점유율 분석</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>개선점 및 드릴 추천</span>
                            </div>
                        </div>

                        <button
                            className="w-full py-3 rounded-lg bg-white text-indigo-900 font-bold text-sm hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 shadow-lg group-hover:translate-y-[-2px]"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate('/arena?tab=sparring');
                            }}
                        >
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                            지금 분석 받아보기
                        </button>
                    </div>
                </div>

                {/* Post Input Trigger (Threads Style) */}
                {user && (
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
                            <div className="flex-1">
                                <div className="text-slate-500 text-sm">새로운 소식이 있나요?</div>
                            </div>

                            {/* Post Button (Visual only) */}
                            <button className="px-5 py-1.5 rounded-full border border-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors">
                                게시
                            </button>
                        </div>
                    </div>
                )}

                <SocialFeed
                    posts={filteredPosts}
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