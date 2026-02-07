import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Network, ArrowRight, Play, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { listUserSkillTrees } from '../../lib/api-skill-tree';
import { getUserTechniqueMastery, getTechniqueById } from '../../lib/api-technique-mastery';
import { getLessonById, getDrillById } from '../../lib/api';
import { UserTechniqueMastery } from '../../types';

// Helper to fetch title if missing
async function fetchContentTitle(contentId: string, type: 'technique' | 'lesson' | 'drill' | string): Promise<string> {
    try {
        if (type === 'technique') {
            const res = await getTechniqueById(contentId);
            return res.data?.name || 'Unknown Technique';
        } else if (type === 'lesson') {
            const l = await getLessonById(contentId);
            return l.data?.title || 'Unknown Lesson';
        } else if (type === 'drill') {
            const d = await getDrillById(contentId);
            // getDrillById returns the object directly or with .data depending on version, 
            // but our outline showed it returns transformDrill(enrichedDrill) which is the object.
            // Let's handle both just in case.
            return (d as any)?.title || (d as any)?.data?.title || 'Unknown Drill';
        }
        return 'Unknown Content';
    } catch (e) {
        return 'Unknown Content';
    }
}

interface RoadmapCardData {
    treeId: string;
    treeTitle: string;
    nodeId: string;
    techniqueId: string;
    title: string;
    mastery?: UserTechniqueMastery;
}

export const MasteryRoadmapWidget: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [roadmaps, setRoadmaps] = useState<RoadmapCardData[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // 1. Get ALL Skill Trees
                let trees;
                try {
                    const res = await listUserSkillTrees(user.id);
                    trees = res.data;
                } catch (e) {
                    console.error('Error fetching skill trees:', e);
                    setLoading(false);
                    return;
                }

                if (!trees || trees.length === 0) {
                    setLoading(false);
                    return;
                }

                // 2. Get Mastery Data (Shared across all trees)
                const { data: allMasteries } = await getUserTechniqueMastery(user.id);
                const masteryMap = new Map((allMasteries || []).map((m: any) => [m.techniqueId, m]));

                const computedRoadmaps: RoadmapCardData[] = [];

                // 3. Process EACH tree to find its "Next Step"
                for (const tree of trees) {
                    if (!tree.nodes || tree.nodes.length === 0) continue;

                    // Extract Lesson/Drill Nodes
                    const contentNodes = tree.nodes.filter((n: any) =>
                        (n.contentType === 'lesson' || n.contentType === 'drill') && n.contentId
                    );

                    if (contentNodes.length === 0) continue;

                    let targetNode = null;
                    let targetMastery = undefined;

                    for (const node of contentNodes) {
                        const contentId = node.contentId || node.data?.contentId;
                        let label = node.data?.label || node.data?.lesson?.title || node.data?.drill?.title;
                        const mastery = masteryMap.get(contentId);

                        // If label is missing (lazy fetch later or settle for placeholder? Better to fetch if critical)
                        // Fetching inside loop is slow. For now, try to use node data.
                        // If really needed, we should fetch concurrently. Let's do lazy fetch just for the TARGET node.

                        if (!mastery) {
                            targetNode = { nodeId: node.id, techniqueId: contentId, title: label, contentType: node.contentType };
                            break;
                        }

                        if (mastery.masteryLevel < 6) {
                            targetNode = { nodeId: node.id, techniqueId: contentId, title: label, contentType: node.contentType };
                            targetMastery = mastery;
                            break;
                        }
                    }

                    // If all mastered, pick last
                    if (!targetNode && contentNodes.length > 0) {
                        const last = contentNodes[contentNodes.length - 1];
                        const contentId = last.contentId || last.data?.contentId;
                        targetNode = { nodeId: last.id, techniqueId: contentId, title: last.data?.label, contentType: last.contentType };
                        targetMastery = masteryMap.get(contentId);
                    }

                    if (targetNode) {
                        // Fetch title if missing
                        let finalTitle = targetNode.title;
                        if (!finalTitle || finalTitle === 'Unknown Technique' || finalTitle === 'New Node' || finalTitle === 'Unknown') {
                            finalTitle = await fetchContentTitle(targetNode.techniqueId, targetNode.contentType || 'lesson');
                        }

                        computedRoadmaps.push({
                            treeId: tree.id,
                            treeTitle: tree.title,
                            nodeId: targetNode.nodeId,
                            techniqueId: targetNode.techniqueId,
                            title: finalTitle || 'Unknown Content',
                            mastery: targetMastery
                        });
                    }
                }

                setRoadmaps(computedRoadmaps);

            } catch (error) {
                console.error("Error loading roadmap widget:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user?.id]);

    // [DEMO] Mock Data Fallback
    useEffect(() => {
        if (!loading && roadmaps.length === 0) {
            setRoadmaps([{
                treeId: 'demo-tree',
                treeTitle: '나의 첫 로드맵 (예시)',
                nodeId: 'demo-node',
                techniqueId: 'demo-tech',
                title: '데라히바 가드 셋업 (Demo)',
                mastery: {
                    id: 'demo-mastery',
                    userId: user?.id || 'demo-user',
                    techniqueId: 'demo-tech',
                    masteryLevel: 2,
                    masteryXp: 150,
                    progressPercent: 35,
                    totalSuccessCount: 5,
                    totalAttemptCount: 10,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            }]);
        }
    }, [loading, roadmaps.length, user]);

    if (!user) return null;

    if (loading) {
        return (
            <div className="w-full h-[180px] bg-zinc-900/40 border border-zinc-800 rounded-[32px] animate-pulse p-6">
                <div className="h-6 w-1/3 bg-zinc-800 rounded mb-4" />
                <div className="h-4 w-1/2 bg-zinc-800 rounded mb-8" />
                <div className="h-10 w-32 bg-zinc-800 rounded-full" />
            </div>
        );
    }

    if (roadmaps.length === 0) {
        return (
            <div className="relative overflow-hidden w-full bg-zinc-900/40 border border-zinc-800/50 p-6 md:p-8 rounded-[32px] group hover:border-violet-500/30 transition-all">
                <div className="relative z-10 flex flex-row items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-1 flex items-center gap-2">
                            <Network className="w-5 h-5 text-violet-500 flex-shrink-0" />
                            <span className="truncate">나만의 로드맵 만들기</span>
                        </h3>
                        <p className="text-zinc-400 text-xs md:text-sm line-clamp-2">아직 생성된 스킬 트리가 없습니다. 지금 바로 수련 계획을 세워보세요.</p>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate('/skill-tree');
                        }}
                        className="flex-shrink-0 bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 px-4 md:py-3 md:px-6 rounded-full text-xs md:text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-900/20"
                    >
                        <span>생성</span>
                        <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto pb-4 -mb-4 hide-scrollbar snap-x snap-mandatory flex gap-4">
            {roadmaps.map((mapData, idx) => {
                const level = mapData.mastery ? mapData.mastery.masteryLevel : 1;
                const progress = mapData.mastery ? mapData.mastery.progressPercent : 0;
                const isMastered = level >= 6;

                return (
                    <div
                        key={mapData.treeId}
                        onClick={() => navigate(`/skill-tree?id=${mapData.treeId}`)} // Navigate to specific tree
                        className="snap-center relative flex-shrink-0 w-full md:w-[600px] overflow-hidden bg-[#121215] border border-zinc-800 p-6 md:p-8 rounded-[32px] cursor-pointer group hover:border-violet-500/50 transition-all duration-500"
                    >
                        {/* Background Effects (Only for first item to distinguish 'Active' focus?) Or all? Let's do all but slightly different color? No keep consistent */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-900/10 blur-[80px] rounded-full group-hover:bg-violet-900/20 transition-all" />

                        <div className="relative z-10 flex flex-row gap-4 items-center justify-between">
                            {/* Left: Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`px-3 py-1 text-[10px] font-bold rounded-full border flex items-center gap-1.5 uppercase tracking-wider ${idx === 0 ? 'bg-violet-500/10 text-violet-300 border-violet-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                        <Network className="w-3 h-3" />
                                        {idx === 0 ? '현재 진행 중' : '저장된 로드맵'}
                                    </span>
                                    <span className="hidden sm:inline text-zinc-500 text-xs font-medium truncate max-w-[150px]">
                                        {mapData.treeTitle}
                                    </span>
                                </div>

                                <h3 className="text-xl md:text-3xl font-black text-white mb-2 whitespace-pre-wrap break-words leading-tight group-hover:text-violet-200 transition-colors">
                                    {mapData.title}
                                </h3>

                                <div className="flex items-center gap-4 mt-2 md:mt-4">
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex items-end gap-2 text-sm font-bold text-zinc-300">
                                            <span>Level {level}</span>
                                            <span className="text-xs text-zinc-500 font-normal mb-0.5">
                                                {isMastered ? '마스터 완료' : '진행도'}
                                            </span>
                                        </div>
                                        <div className="w-32 sm:w-48 h-1.5 md:h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000 ${isMastered ? 'bg-gradient-to-r from-violet-600 to-indigo-500' : 'bg-gradient-to-r from-violet-600 to-indigo-500'}`}
                                                style={{ width: `${isMastered ? 100 : Math.max(5, progress)}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Action */}
                            <div className="flex-shrink-0">
                                <button className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-zinc-800 border-2 border-zinc-700 group-hover:bg-violet-600 group-hover:border-violet-500 flex items-center justify-center transition-all duration-300 shadow-xl">
                                    {isMastered ? (
                                        <Star className="w-5 h-5 md:w-6 md:h-6 text-zinc-400 group-hover:text-white fill-current" />
                                    ) : (
                                        <Play className="w-5 h-5 md:w-6 md:h-6 text-zinc-400 group-hover:text-white fill-current ml-0.5 md:ml-1" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
