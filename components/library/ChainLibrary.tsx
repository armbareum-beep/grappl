
import React, { useEffect, useState } from 'react';
import { UserSkillTree } from '../../types';
import { listPublicSkillTrees, copyChainToMyLibrary } from '../../lib/api-skill-tree';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Search, Loader2, GitFork, User, Layers, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const ChainLibrary: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { success, error: toastError } = useToast();

    const [chains, setChains] = useState<UserSkillTree[]>([]);
    const [loading, setLoading] = useState(true);
    const [copyingId, setCopyingId] = useState<string | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadChains();
    }, []);

    const loadChains = async () => {
        setLoading(true);
        try {
            const { data, error } = await listPublicSkillTrees(50);
            if (error) throw error;
            if (data) {
                setChains(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async (chain: UserSkillTree) => {
        if (!user) {
            navigate('/login');
            return;
        }

        setCopyingId(chain.id);
        try {
            const { error } = await copyChainToMyLibrary(user.id, chain.id);
            if (error) throw error;

            success(`'${chain.title}' 로드맵을 내 보관함에 복사했습니다.`);
        } catch (err) {
            toastError('로드맵 복사에 실패했습니다.');
            console.error(err);
        } finally {
            setCopyingId(null);
        }
    };

    const filteredChains = chains.filter(chain =>
        chain.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (chain.tags && chain.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-4" />
                <p className="text-zinc-500">체인 라이브러리를 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">스킬 로드맵 라이브러리</h2>
                    <p className="text-zinc-400 text-sm">다른 사용자들이 공유한 기술 체계를 탐색하고 내 로드맵으로 가져오세요.</p>
                </div>

                <div className="relative w-full md:w-64">
                    <input
                        type="text"
                        placeholder="로드맵 검색..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-zinc-600"
                    />
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
            </div>

            {filteredChains.length === 0 ? (
                <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 border-dashed">
                    <Globe className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-zinc-400 mb-2">공유된 로드맵이 없습니다</h3>
                    <p className="text-zinc-600 text-sm">가장 먼저 나만의 로드맵을 공유해보세요!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredChains.map(chain => (
                        <div key={chain.id} className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 flex flex-col h-full">
                            {/* Card Header / Thumbnail */}
                            <div className="h-32 bg-zinc-950 relative overflow-hidden group-hover:h-32 transition-all">
                                {chain.thumbnailUrl ? (
                                    <img src={chain.thumbnailUrl} alt={chain.title} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
                                        <Layers className="w-8 h-8 text-zinc-800 group-hover:text-zinc-700 transition-colors" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2">
                                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white font-bold border border-white/10 flex items-center gap-1">
                                        <Layers className="w-3 h-3" />
                                        {chain.nodes.length} Nodes
                                    </span>
                                </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                                            {chain.creatorAvatar ? (
                                                <img src={chain.creatorAvatar} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="w-3 h-3 text-zinc-500 m-auto" />
                                            )}
                                        </div>
                                        <span className="text-xs text-zinc-500 font-medium truncate">{chain.creatorName || 'Unknown User'}</span>
                                        <span className="text-[10px] text-zinc-600">•</span>
                                        <span className="text-[10px] text-zinc-600">{format(new Date(chain.createdAt || Date.now()), 'yyyy.MM.dd')}</span>
                                    </div>

                                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1 group-hover:text-violet-400 transition-colors">{chain.title}</h3>

                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {chain.difficulty && (
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${chain.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                    chain.difficulty === 'Advanced' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                }`}>
                                                {chain.difficulty}
                                            </span>
                                        )}
                                        {chain.tags?.slice(0, 3).map(tag => (
                                            <span key={tag} className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-[10px] border border-zinc-700">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 mt-2 border-t border-zinc-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3 text-zinc-500 text-xs">
                                        <span className="flex items-center gap-1" title="조회수">
                                            <Globe className="w-3 h-3" /> {chain.views || 0}
                                        </span>
                                    </div>

                                    <button
                                        onClick={() => handleCopy(chain)}
                                        disabled={copyingId === chain.id}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-violet-600 hover:text-white text-zinc-400 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                                    >
                                        {copyingId === chain.id ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <GitFork className="w-3 h-3 group-hover/btn:rotate-180 transition-transform duration-500" />
                                        )}
                                        {copyingId === chain.id ? '복사 중...' : '가져오기'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
