import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Star, Eye, User, Search, ArrowRight, Bookmark, Filter, Hash } from 'lucide-react';
import { listPublicSkillTrees, listFeaturedSkillTrees } from '../../lib/api-skill-tree';
import { UserSkillTree } from '../../types';
import { LoadingScreen } from '../LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = ['All', 'Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'];

export const ChainLibraryTab: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [publicTrees, setPublicTrees] = useState<UserSkillTree[]>([]);
    const [featuredTrees, setFeaturedTrees] = useState<UserSkillTree[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent');
    const [savingChainId, setSavingChainId] = useState<string | null>(null);
    const [savedChains, setSavedChains] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchTrees = async () => {
            setLoading(true);
            try {
                const [featuredRes, publicRes] = await Promise.all([
                    listFeaturedSkillTrees(),
                    listPublicSkillTrees(100)
                ]);

                setFeaturedTrees(featuredRes.data || []);
                setPublicTrees(publicRes.data || []);
            } catch (error) {
                console.error('Failed to fetch library data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTrees();
    }, []);

    const filteredTrees = publicTrees
        .filter(tree => {
            const matchesSearch =
                tree.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tree.creatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                tree.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory === 'All' ||
                tree.tags?.some(t => t.toLowerCase().trim() === selectedCategory.toLowerCase().trim()) ||
                tree.title?.toLowerCase().includes(selectedCategory.toLowerCase());

            return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
            if (sortBy === 'popular') return (b.views || 0) - (a.views || 0);
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });

    const handleSaveChain = async (e: React.MouseEvent, chainId: string) => {
        e.stopPropagation();

        if (!user) {
            navigate('/login');
            return;
        }

        if (savedChains.has(chainId)) {
            return; // Already saved
        }

        setSavingChainId(chainId);
        try {
            const { copyChainToMyLibrary } = await import('../../lib/api-skill-tree');
            const { data, error } = await copyChainToMyLibrary(user.id, chainId);

            if (error) throw error;

            if (data) {
                setSavedChains(prev => new Set([...prev, chainId]));
                // Show success feedback
                setTimeout(() => setSavingChainId(null), 2000);
            }
        } catch (error) {
            console.error('Failed to save chain:', error);
            alert('체인 저장에 실패했습니다. 다시 시도해주세요.');
            setSavingChainId(null);
        }
    };

    if (loading) return <LoadingScreen message="체인 라이브러리 데이터를 불러오고 있습니다..." />;

    return (
        <div className="space-y-12 pb-24">
            {/* 1. Hero & Search */}
            <div className="relative overflow-hidden rounded-[40px] bg-zinc-900 border border-white/5 p-10 md:p-16">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-violet-600/10 blur-[120px]" />
                <div className="relative z-10 max-w-2xl">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-400 text-[10px] font-black uppercase tracking-widest mb-6"
                    >
                        <Network className="w-3 h-3" /> Technical Intelligence
                    </motion.div>
                    <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 leading-none">
                        익스퍼트들의 <br />
                        <span className="text-violet-500">체인 라이브러리</span>
                    </h2>
                    <p className="text-zinc-500 text-base md:text-lg font-medium mb-10 leading-relaxed">
                        전 세계 주짓수 플레이어들이 설계한 승리의 로드맵을 탐색하고 <br className="hidden md:block" />
                        당신의 것으로 만드세요. 모든 체인은 즉시 저장하고 수정할 수 있습니다.
                    </p>

                    <div className="relative group max-w-lg">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="기술 이름, 제작자, 태그 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white focus:ring-2 focus:ring-violet-500/30 outline-none transition-all placeholder:text-zinc-600"
                        />
                    </div>
                </div>
            </div>

            {/* 2. Filters */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-5 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${selectedCategory === cat
                                    ? 'bg-white text-black border-white'
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center bg-zinc-900 rounded-xl p-1 border border-zinc-800">
                        <button
                            onClick={() => setSortBy('recent')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'recent' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            최신순
                        </button>
                        <button
                            onClick={() => setSortBy('popular')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${sortBy === 'popular' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            인기순
                        </button>
                    </div>
                </div>
            </div>

            {/* 3. Featured Mastery (Big Cards) */}
            {featuredTrees.length > 0 && !searchQuery && selectedCategory === 'All' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    {featuredTrees.slice(0, 2).map((tree) => (
                        <motion.div
                            key={tree.id}
                            whileHover={{ scale: 1.01 }}
                            className="group cursor-pointer relative aspect-[16/10] rounded-[32px] overflow-hidden border border-white/5"
                            onClick={() => navigate(`/arena?tab=skills&id=${tree.id}`)}
                        >
                            {/* Background Image / Placeholder */}
                            <div className="absolute inset-0 bg-zinc-900">
                                {tree.thumbnailUrl ? (
                                    <img src={tree.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" alt="" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/20 to-zinc-900">
                                        <Network className="w-32 h-32 text-white/5" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                            </div>

                            <div className="absolute inset-0 p-8 flex flex-col justify-end">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="px-2 py-0.5 bg-violet-600 text-white text-[9px] font-black rounded-full uppercase tracking-widest">Featured</span>
                                    <div className="flex gap-1">
                                        {tree.tags?.slice(0, 2).map((tag, i) => (
                                            <span key={i} className="text-[10px] text-zinc-400 font-bold bg-white/5 px-2 py-0.5 rounded-full">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                                <h4 className="text-3xl font-black text-white mb-4 group-hover:text-violet-400 transition-colors leading-tight line-clamp-2">
                                    {tree.title}
                                </h4>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                                            <img src={tree.creatorAvatar || `https://ui-avatars.com/api/?name=${tree.creatorName}&background=random`} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <span className="text-white text-sm font-bold">{tree.creatorName}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-zinc-400 text-xs font-bold">
                                        <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {tree.views}</span>
                                        <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* 4. Masonry-ish Gallery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredTrees.map((tree, index) => (
                        <motion.div
                            key={tree.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            className="group flex flex-col bg-zinc-900/50 backdrop-blur-sm border border-white/5 rounded-[24px] overflow-hidden hover:border-violet-500/50 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all cursor-pointer"
                            onClick={() => navigate(`/arena?tab=skills&id=${tree.id}`)}
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
                                {tree.thumbnailUrl ? (
                                    <img
                                        src={tree.thumbnailUrl}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                                        alt=""
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center opacity-20">
                                        <Network className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <div className="flex gap-1 mt-1">
                                        {tree.tags?.slice(0, 1).map((tag, i) => (
                                            <span key={i} className="text-[9px] text-white/70 font-black uppercase tracking-tighter bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-white/50 font-bold bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5">
                                        Open Chain
                                    </span>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-5 flex flex-col flex-1">
                                <h5 className="text-zinc-100 font-bold text-sm mb-4 line-clamp-2 group-hover:text-violet-400 transition-colors">
                                    {tree.title}
                                </h5>

                                <div className="mt-auto flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-zinc-800">
                                            <img src={tree.creatorAvatar || `https://ui-avatars.com/api/?name=${tree.creatorName}&background=random`} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <span className="text-zinc-500 text-[11px] font-bold truncate max-w-[80px]">
                                            {tree.creatorName || 'Anonymous'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-zinc-600 text-[10px] font-black">
                                            <Eye className="w-3 h-3" /> {tree.views || 0}
                                        </div>
                                        <button
                                            onClick={(e) => handleSaveChain(e, tree.id)}
                                            disabled={savingChainId === tree.id || savedChains.has(tree.id)}
                                            className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${savedChains.has(tree.id)
                                                    ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                                                    : savingChainId === tree.id
                                                        ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30 animate-pulse'
                                                        : 'bg-violet-600 hover:bg-violet-500 text-white border border-violet-500'
                                                }`}
                                        >
                                            {savedChains.has(tree.id) ? '✓ Saved' : savingChainId === tree.id ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {filteredTrees.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-zinc-900/50 border border-dashed border-zinc-800 rounded-[32px]">
                        <p className="text-zinc-500 font-bold">검색 결과가 없습니다. 첫 번째 체인을 만들어보세요!</p>
                    </div>
                )}
            </div>
        </div>
    );
};
