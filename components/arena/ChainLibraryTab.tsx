import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, Eye, ArrowRight, Bookmark, ChevronRight, Plus } from 'lucide-react';
import { listPublicSkillTrees, listFeaturedSkillTrees } from '../../lib/api-skill-tree';
import { UserSkillTree } from '../../types';
import { LoadingScreen } from '../LoadingScreen';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

interface ChainLibraryTabProps {
    category: string;
    viewMode: 'grid' | 'list';
    searchQuery: string;
    onSearchChange: (val: string) => void;
}

export const ChainLibraryTab: React.FC<ChainLibraryTabProps> = ({
    category,
    viewMode,
    searchQuery,
    onSearchChange
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [publicTrees, setPublicTrees] = useState<UserSkillTree[]>([]);
    const [featuredTrees, setFeaturedTrees] = useState<UserSkillTree[]>([]);
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

            const matchesCategory = category === 'All' ||
                tree.tags?.some(t => t.toLowerCase().trim() === category.toLowerCase().trim()) ||
                tree.title?.toLowerCase().includes(category.toLowerCase());

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
        <div className="space-y-6 pb-24">
            <div className="h-8" />

            {/* 4. Search & Sort Header */}
            <div className="flex items-center justify-between gap-4 px-5">
                <div className="relative flex-1 max-w-xs group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-violet-500 transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="기술명, 태그 검색..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-violet-500/50 transition-all placeholder:text-zinc-700"
                    />
                </div>

                <div className="flex items-center bg-zinc-900/50 rounded-xl p-1 border border-zinc-800 h-10">
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

            {/* 5. Featured Mastery (Big Cards) - Only show in Grid View and default state */}
            {viewMode === 'grid' && featuredTrees.length > 0 && category === 'All' && !searchQuery && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
                    {featuredTrees.slice(0, 2).map((tree) => (
                        <motion.div
                            key={tree.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => navigate(`/arena?tab=skills&treeId=${tree.id}`)}
                            className="group relative h-[400px] rounded-[48px] overflow-hidden cursor-pointer border border-white/5"
                        >
                            {/* Background Image with Overlay */}
                            <div className="absolute inset-0">
                                <img
                                    src={tree.thumbnailUrl || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2000'}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    alt={tree.title}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
                            </div>

                            {/* Content */}
                            <div className="absolute inset-0 p-10 flex flex-col justify-end">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="px-4 py-1.5 rounded-full bg-violet-600/90 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-widest">
                                        MASTER CLASS
                                    </div>
                                    <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-bold">
                                        <Eye className="w-3.5 h-3.5" /> {tree.views || 0}
                                    </div>
                                </div>
                                <h3 className="text-4xl font-black text-white mb-4 tracking-tighter leading-tight group-hover:text-violet-400 transition-colors">
                                    {tree.title}
                                </h3>
                                <p className="text-zinc-400 text-sm mb-8 line-clamp-2 max-w-lg font-medium">
                                    {tree.description}
                                </p>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center font-bold text-sm text-white">
                                            {tree.creatorName?.[0]}
                                        </div>
                                        <div>
                                            <div className="text-xs font-black text-white">{tree.creatorName}</div>
                                            <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Expert Instructor</div>
                                        </div>
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-violet-600 transition-all duration-500">
                                        <ArrowRight className="w-5 h-5 text-white" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* 6. List / Grid View Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${viewMode}-${category}-${sortBy}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-0 border border-zinc-800 rounded-3xl overflow-hidden bg-zinc-900/30"}
                >
                    {filteredTrees.map((tree) => (
                        viewMode === 'grid' ? (
                            <div
                                key={tree.id}
                                onClick={() => navigate(`/arena?tab=skills&treeId=${tree.id}`)}
                                className="group relative bg-zinc-900/40 backdrop-blur-md rounded-[32px] border border-zinc-800 p-4 transition-all duration-500 hover:bg-zinc-800/50 hover:border-violet-500/50 cursor-pointer"
                            >
                                <div className="relative h-48 rounded-[24px] overflow-hidden mb-4">
                                    <img
                                        src={tree.thumbnailUrl || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=800'}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        alt={tree.title}
                                    />
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <button
                                            onClick={(e) => handleSaveChain(e, tree.id)}
                                            className={`w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center border transition-all duration-300 ${savedChains.has(tree.id)
                                                ? 'bg-violet-600 border-violet-500 text-white'
                                                : 'bg-black/40 border-white/10 text-white hover:bg-violet-600'
                                                }`}
                                        >
                                            <Bookmark className={`w-4 h-4 ${savedChains.has(tree.id) ? 'fill-current' : ''}`} />
                                        </button>
                                    </div>
                                </div>
                                <div className="px-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        {tree.tags?.slice(0, 2).map((tag, idx) => (
                                            <span key={idx} className="text-[10px] font-black text-violet-400 uppercase tracking-wider">#{tag}</span>
                                        ))}
                                    </div>
                                    <h4 className="text-lg font-black text-white mb-2 line-clamp-1 group-hover:text-violet-400 transition-colors">
                                        {tree.title}
                                    </h4>
                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400 border border-white/5">
                                                {tree.creatorName?.[0]}
                                            </div>
                                            <span className="text-xs font-bold text-zinc-500">{tree.creatorName}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                                            <div className="flex items-center gap-1.5">
                                                <Eye className="w-3 h-3" /> {tree.views || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                key={tree.id}
                                onClick={() => navigate(`/arena?tab=skills&treeId=${tree.id}`)}
                                className="group flex items-center justify-between p-4 md:p-6 border-b border-zinc-800 hover:bg-white/5 transition-all cursor-pointer last:border-b-0"
                            >
                                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-800">
                                        <img src={tree.thumbnailUrl || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=400'} className="w-full h-full object-cover" alt={tree.title} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-base md:text-lg font-black text-white truncate group-hover:text-violet-400 transition-colors">
                                                {tree.title}
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-black text-zinc-500 uppercase">
                                                {tree.tags?.[0] || 'Chain'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium">
                                            <span>by {tree.creatorName}</span>
                                            <span className="w-1 h-1 rounded-full bg-zinc-700" />
                                            <div className="flex items-center gap-1.5">
                                                <Eye className="w-3.5 h-3.5" /> {tree.views || 0}
                                            </div>
                                            <span className="hidden md:inline w-1 h-1 rounded-full bg-zinc-700" />
                                            <span className="hidden md:inline uppercase tracking-tighter text-[10px] font-black text-zinc-600">Updated {new Date(tree.createdAt || Date.now()).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 md:gap-4 ml-4">
                                    <button
                                        onClick={(e) => handleSaveChain(e, tree.id)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${savedChains.has(tree.id)
                                            ? 'bg-violet-600 border-violet-500 text-white'
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-violet-600 hover:text-white'
                                            }`}
                                    >
                                        {savingChainId === tree.id ? (
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Bookmark className={`w-4 h-4 ${savedChains.has(tree.id) ? 'fill-current' : ''}`} />
                                        )}
                                    </button>
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 text-zinc-400 group-hover:bg-violet-600 group-hover:text-white transition-all">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        )
                    ))}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};
