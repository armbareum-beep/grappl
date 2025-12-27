import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    NodeTypes,
    BackgroundVariant,
    MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    getUserSkillTree,
    saveUserSkillTree
} from '../../lib/api-skill-tree';
import { getLessons, getDrills, getUserSkills } from '../../lib/api';
import { getUserTechniqueMastery } from '../../lib/api-technique-mastery';
import { Lesson, Drill, SkillTreeNode, UserSkill, UserTechniqueMastery } from '../../types';
import { TechniqueNode } from './TechniqueNode';
import { AddTechniqueModal } from './AddTechniqueModal';
import { LoadingScreen } from '../LoadingScreen';
import { Plus, Link as LinkIcon, Save, Trash2 } from 'lucide-react';

const nodeTypes: NodeTypes = {
    content: TechniqueNode as any,
    technique: TechniqueNode as any // Keep temporary for backward compatibility during migration
};

export const TechniqueSkillTree: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allLessons, setAllLessons] = useState<(Lesson & { course?: { title: string } })[]>([]);
    const [allDrills, setAllDrills] = useState<Drill[]>([]);
    const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
    const [masteries, setMasteries] = useState<UserTechniqueMastery[]>([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConnectMode, setIsConnectMode] = useState(false);
    const [selectedNodeForConnect, setSelectedNodeForConnect] = useState<string | null>(null);
    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    // Detect mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Load data
    useEffect(() => {
        if (user) {
            loadData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const loadData = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        console.log('SkillTree: Starting loadData for user', user.id);

        try {
            // Load all relevant data in parallel
            const [treeRes, lessons, drills, skills, masteryRes] = await Promise.all([
                getUserSkillTree(user.id).then(res => res),
                getLessons(300).then(res => res),
                getDrills(undefined, 100).then(res => res.data || []),
                getUserSkills(user.id).then(res => res),
                getUserTechniqueMastery(user.id).then(res => res.data || [])
            ]);

            setAllLessons(lessons);
            setAllDrills(drills);
            setUserSkills(skills);
            setMasteries(masteryRes);

            // Convert skill tree to React Flow format
            if (treeRes.data) {
                const flowNodes: Node[] = (treeRes.data.nodes || []).map(node => {
                    const contentType = node.contentType || 'technique';
                    const contentId = node.contentId || (node as any).techniqueId || '';

                    const lesson = contentType === 'lesson' ? lessons.find(l => l.id === contentId) : undefined;
                    const drill = contentType === 'drill' ? drills.find(d => d.id === contentId) : undefined;

                    // Determine completion status
                    // For lessons: Check if exists in user_skills with 'mastered' status
                    const isCompleted = contentType === 'lesson'
                        ? skills.some(s => s.courseId === lesson?.courseId && s.status === 'mastered') // Simple check: if course mastered, lesson mastered
                        : false;

                    const mastery = contentType === 'technique'
                        ? masteryRes.find((m: UserTechniqueMastery) => m.techniqueId === contentId)
                        : undefined;

                    return {
                        id: node.id,
                        type: 'content',
                        position: node.position,
                        data: {
                            contentType,
                            contentId,
                            lesson,
                            drill,
                            mastery,
                            isCompleted,
                            onClick: () => handleNodeClick(node.id, contentId, contentType)
                        }
                    };
                });

                const flowEdges: Edge[] = (treeRes.data.edges || []).map(edge => ({
                    id: edge.id,
                    source: edge.source as string,
                    target: edge.target as string,
                    type: edge.type === 'animated' ? 'smoothstep' : 'default',
                    animated: edge.type === 'animated',
                    style: { stroke: '#facc15', strokeWidth: 3 }
                }));

                setNodes(flowNodes);
                setEdges(flowEdges);
            }
            console.log('SkillTree: loadData completed successfully');
        } catch (err: any) {
            console.error('Error loading skill tree:', err);
            setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleNodeClick = (nodeId: string, contentId: string, contentType: string = 'technique') => {
        if (isConnectMode) {
            if (!selectedNodeForConnect) {
                setSelectedNodeForConnect(nodeId);
            } else if (selectedNodeForConnect === nodeId) {
                // Cancel selection if re-clicked
                setSelectedNodeForConnect(null);
            } else {
                // Connect from selected to current
                const newEdge: Edge = {
                    id: `edge-${selectedNodeForConnect}-${nodeId}`,
                    source: selectedNodeForConnect,
                    target: nodeId,
                    sourceHandle: 'source-top', // Default to blue handle
                    targetHandle: 'target-bottom', // Default to yellow bottom handle
                    type: 'default',
                    style: { stroke: '#facc15', strokeWidth: 3 }
                };
                setEdges(eds => addEdge(newEdge, eds));
                setSelectedNodeForConnect(null);
            }
        } else if (isMobile) {
            if (activeNodeId === nodeId) {
                const path = contentType === 'course' ? `/courses/${contentId}`
                    : contentType === 'drill' ? `/drills/${contentId}`
                        : `/technique/${contentId}`;
                navigate(path);
            } else {
                onNodesChange([{ id: nodeId, type: 'select', selected: true }]);
                setActiveNodeId(nodeId);
                setTimeout(() => setActiveNodeId(prev => prev === nodeId ? null : prev), 3000);
            }
        } else {
            const path = contentType === 'course' ? `/courses/${contentId}`
                : contentType === 'drill' ? `/drills/${contentId}`
                    : `/technique/${contentId}`;
            navigate(path);
        }
    };

    // Handle canvas click (mobile move mode)
    const handlePaneClick = useCallback(() => {
        if (isConnectMode) {
            setSelectedNodeForConnect(null);
        }

        if (isMobile && selectedNodeForConnect && !isConnectMode) {
            // ... 기존 모바일 이동 로직 (생략 가능하지만 유지)
        }
    }, [isMobile, selectedNodeForConnect, isConnectMode]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target) return;

        // Check handle IDs (Blue -> Yellow rule)
        const isSourceBlue = params.sourceHandle === 'source-top';
        const isTargetYellow = params.targetHandle?.startsWith('target-');

        if (!isSourceBlue) {
            alert('연결은 12시 방향의 파란색 동그라미에서만 시작할 수 있습니다.');
            return;
        }

        if (!isTargetYellow) {
            alert('연결은 다른 노드의 노란색 동그라미로만 도착해야 합니다.');
            return;
        }

        const newEdge: Edge = {
            id: `edge-${params.source}-${params.target}-${params.sourceHandle}-${params.targetHandle}`,
            source: params.source,
            target: params.target,
            sourceHandle: params.sourceHandle,
            targetHandle: params.targetHandle,
            style: { stroke: '#facc15', strokeWidth: 3 }
        };
        setEdges(eds => addEdge(newEdge, eds));
    }, [setEdges]);

    // Handle edge click for two-step deletion (Select -> Click again to delete)
    const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        // Find the actual current state of the edge
        const currentEdge = edges.find(e => e.id === edge.id);

        if (currentEdge?.selected) {
            // If already blue (selected), delete it
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        }
    }, [edges, setEdges]);

    // Add content from modal
    const handleAddContent = async (items: { id: string, type: 'technique' | 'lesson' | 'drill' }[]) => {
        if (!user) return;

        // Calculate positions in a grid
        const startX = 100;
        const startY = 100;
        const spacing = 180; // Increased spacing for thumbnails
        const cols = 4;

        const newNodes: Node[] = items.map((item, index) => {
            const lesson = item.type === 'lesson' ? allLessons.find(l => l.id === item.id) : undefined;
            const drill = item.type === 'drill' ? allDrills.find(d => d.id === item.id) : undefined;

            // Check completion for new nodes
            const isCompleted = item.type === 'lesson'
                ? userSkills.some(s => s.courseId === lesson?.courseId && s.status === 'mastered')
                : false;

            const mastery = item.type === 'technique'
                ? masteries.find(m => m.techniqueId === item.id)
                : undefined;

            const col = index % cols;
            const row = Math.floor(index / cols);

            const nodeId = `node-${Date.now()}-${index}`;

            return {
                id: nodeId,
                type: 'content',
                position: {
                    x: startX + (col * spacing),
                    y: startY + (row * spacing) + (nodes.length * 50)
                },
                data: {
                    contentType: item.type,
                    contentId: item.id,
                    lesson,
                    drill,
                    mastery,
                    isCompleted,
                    onClick: () => handleNodeClick(nodeId, item.id, item.type)
                }
            };
        });

        setNodes(nds => [...nds, ...newNodes]);
    };

    // Save tree
    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        try {
            const skillTreeNodes: SkillTreeNode[] = nodes.map(node => ({
                id: node.id,
                contentType: node.data.contentType || 'technique',
                contentId: node.data.contentId || node.data.technique?.id || '',
                position: node.position,
                type: 'content'
            }));

            const skillTreeEdges = edges.map(edge => ({
                id: edge.id,
                source: edge.source as string,
                target: edge.target as string,
                type: edge.animated ? 'animated' as const : 'default' as const
            }));

            await saveUserSkillTree(user.id, skillTreeNodes, skillTreeEdges);

            // Show success message
            alert('스킬 트리가 저장되었습니다!');
        } catch (error) {
            console.error('Error saving skill tree:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteSelected = () => {
        const selectedNodes = nodes.filter(node => node.selected);
        const selectedEdges = edges.filter(edge => edge.selected);

        if (selectedNodes.length === 0 && selectedEdges.length === 0) {
            alert('삭제할 항목(노드 또는 연결선)을 선택하세요.');
            return;
        }

        let confirmMessage = '';
        if (selectedNodes.length > 0 && selectedEdges.length > 0) {
            confirmMessage = `${selectedNodes.length}개의 노드와 ${selectedEdges.length}개의 연결선을 삭제하시겠습니까?`;
        } else if (selectedNodes.length > 0) {
            confirmMessage = `${selectedNodes.length}개의 노드를 삭제하시겠습니까?`;
        } else {
            confirmMessage = `${selectedEdges.length}개의 연결선을 삭제하시겠습니까?`;
        }

        if (confirm(confirmMessage)) {
            if (selectedNodes.length > 0) {
                const selectedIds = selectedNodes.map(n => n.id);
                setNodes(nds => nds.filter(n => !selectedIds.includes(n.id)));
                setEdges(eds => eds.filter(e => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
            }
            if (selectedEdges.length > 0) {
                const selectedEdgeIds = selectedEdges.map(e => e.id);
                setEdges(eds => eds.filter(e => !selectedEdgeIds.includes(e.id)));
            }
        }
    };

    if (!user) {
        return (
            <div className="h-[calc(100vh-320px)] min-h-[600px] bg-slate-950 flex items-center justify-center p-4 rounded-2xl border border-slate-800">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Save className="w-8 h-8 text-slate-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">로그인이 필요합니다</h2>
                    <p className="text-slate-400 mb-6 font-medium">나만의 기술 트리를 만들고 저장하려면 로그인하세요.</p>
                    <div className="flex justify-center">
                        <button
                            onClick={() => navigate('/login')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold"
                        >
                            로그인하기
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-320px)] min-h-[600px] bg-slate-950 flex items-center justify-center p-4 rounded-2xl border border-red-900/30">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Trash2 className="w-8 h-8 text-red-500" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">데이터 로드 오류</h2>
                    <p className="text-slate-400 mb-6 font-medium bg-slate-900/50 p-3 rounded-lg border border-slate-800 text-xs text-left overflow-auto break-all">
                        {error}
                    </p>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => loadData()}
                            className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-bold"
                        >
                            다시 시도
                        </button>
                        <p className="text-[10px] text-slate-500">
                            💡 만약 `user_skill_trees` 테이블이 없다면 SQL 스키마를 실행해야 합니다.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return <LoadingScreen message="로드맵 정보를 불러오는 중..." />;
    }

    return (
        <div className="h-[calc(100vh-320px)] min-h-[600px] bg-slate-950 flex flex-col rounded-2xl overflow-hidden border border-slate-800">
            {/* Toolbar */}
            <div className="bg-slate-900 border-b border-slate-800 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                    <h1 className="text-2xl font-bold text-white">내 스킬 트리</h1>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Add Technique */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">콘텐츠 추가</span>
                        </button>

                        {/* Connect Mode */}
                        <button
                            onClick={() => {
                                setIsConnectMode(!isConnectMode);
                                setSelectedNodeForConnect(null);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isConnectMode
                                ? 'bg-yellow-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                }`}
                        >
                            <LinkIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {isConnectMode ? '연결 모드 (활성)' : '연결 모드'}
                            </span>
                        </button>

                        {/* Delete */}
                        <button
                            onClick={handleDeleteSelected}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">삭제</span>
                        </button>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">
                                {saving ? '저장 중...' : '저장'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Instructions */}
                {(isConnectMode || (isMobile && selectedNodeForConnect)) && (
                    <div className="max-w-7xl mx-auto mt-3 p-3 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                        <p className="text-sm text-blue-300">
                            {isConnectMode
                                ? '💡 12시 파란색 핸들에서 시작해서 노란색 핸들로 연결하세요. (파란색 선을 한 번 더 누르면 삭제됩니다)'
                                : '💡 이동할 위치를 탭하세요'}
                        </p>
                    </div>
                )}
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                        style: { stroke: '#facc15', strokeWidth: 3 },
                        interactionWidth: 20, // Make edges easier to click
                        animated: false,
                    }}
                    fitView
                    className="bg-slate-950"
                >
                    <style>{`
                        .react-flow__edge.selected .react-flow__edge-path {
                            stroke: #3b82f6 !important;
                            stroke-width: 5 !important;
                            filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.5));
                        }
                        .react-flow__edge:hover .react-flow__edge-path {
                            stroke-width: 5 !important;
                        }
                    `}</style>
                    <Background
                        variant={BackgroundVariant.Dots}
                        gap={20}
                        size={1}
                        color="#334155"
                    />
                    <Controls className="bg-slate-800 border border-slate-700" />
                    <MiniMap
                        className="bg-slate-900 border border-slate-700"
                        nodeColor={(node) => {
                            const mastery = node.data.mastery;
                            const isCompleted = node.data.isCompleted;

                            // Yellow for Mastered/Completed
                            if ((mastery && mastery.masteryLevel >= 5) || isCompleted) {
                                return '#facc15';
                            }
                            // Blue for In-progress
                            if (mastery && mastery.masteryLevel >= 2) {
                                return '#3b82f6';
                            }
                            // Gray for not started
                            return '#475569';
                        }}
                    />
                </ReactFlow>
            </div>

            <AddTechniqueModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                lessons={allLessons}
                drills={allDrills}
                addedItems={nodes.map(n => ({
                    id: n.data.contentId || '',
                    type: n.data.contentType || 'technique'
                }))}
                onAddContent={handleAddContent}
            />
        </div>
    );
};
