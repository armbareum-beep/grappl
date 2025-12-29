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
    MiniMap,
    ConnectionMode,
    ReactFlowInstance,
    OnConnectStart,
    OnConnectEnd
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
    getLatestUserSkillTree,
    listUserSkillTrees,
    createNewSkillTree,
    updateUserSkillTree,
    deleteUserSkillTree,
    getUserSkillTree
} from '../../lib/api-skill-tree';
import { getLessons, getDrills, getUserSkills } from '../../lib/api';
import { getUserTechniqueMastery } from '../../lib/api-technique-mastery';
import { Lesson, Drill, SkillTreeNode, UserSkill, UserTechniqueMastery, UserSkillTree } from '../../types';
import { TechniqueNode } from './TechniqueNode';
import { AddTechniqueModal } from './AddTechniqueModal';
import { LoadingScreen } from '../LoadingScreen';
import { TextNode } from './TextNode';
import { Plus, Save, Trash2, FolderOpen, FilePlus, X, Share2, Type } from 'lucide-react';
import ShareModal from '../social/ShareModal';

const nodeTypes: NodeTypes = {
    content: TechniqueNode as any,
    technique: TechniqueNode as any, // Keep temporary for backward compatibility during migration
    text: TextNode as any
};

export const TechniqueSkillTree: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [allLessons, setAllLessons] = useState<(Lesson & { course?: { title: string; creatorName?: string } })[]>([]);
    const [allDrills, setAllDrills] = useState<Drill[]>([]);
    const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
    const [masteries, setMasteries] = useState<UserTechniqueMastery[]>([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    // Multi-save states
    const [currentTreeId, setCurrentTreeId] = useState<string | null>(null);
    const [currentTreeTitle, setCurrentTreeTitle] = useState('나의 첫 스킬 트리');
    const [treeList, setTreeList] = useState<UserSkillTree[]>([]);
    const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);

    // Custom Modal States
    const [isNewTreeModalOpen, setIsNewTreeModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [saveTitleInput, setSaveTitleInput] = useState('');
    const [alertConfig, setAlertConfig] = useState<{ title: string; message: string; onConfirm?: () => void; confirmText?: string; cancelText?: string } | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [customShareUrl, setCustomShareUrl] = useState<string | null>(null);

    // Encode/Decode Helpers
    const encodeGuestData = (data: any) => {
        try {
            const json = JSON.stringify(data);
            return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode(parseInt(p1, 16));
                }));
        } catch (e) { return null; }
    };

    const decodeGuestData = (encoded: string) => {
        try {
            const json = decodeURIComponent(atob(encoded).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(json);
        } catch (e) { return null; }
    };

    // Drag to Create State
    const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);
    const [pendingConnection, setPendingConnection] = useState<{ source: string; sourceHandle: string | null; position: { x: number; y: number } } | null>(null);
    const connectionStartRef = React.useRef<{ nodeId: string; handleId: string | null } | null>(null);

    // Helper to update node data (for TextNode)
    const handleNodeDataChange = useCallback((id: string, newData: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === id) {
                return { ...node, data: { ...node.data, ...newData } };
            }
            return node;
        }));
    }, [setNodes]);

    // Guest Auto-Save: Persist data to localStorage when nodes/edges change
    useEffect(() => {
        // Only saving for guests (no user) and when not loading
        if (!user && !loading) {
            // Even if nodes are empty, we might want to save if title changed? 
            // But let's verify we have something meaningful or at least initialized.
            // If nodes became empty because user deleted everything, we should reflect that.

            // Debounce could be good, but simple effect is fine for now
            const guestData = {
                title: currentTreeTitle,
                nodes: nodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    position: node.position,
                    data: {
                        label: node.data.label,
                        style: node.data.style,
                        contentType: node.data.contentType,
                        contentId: node.data.contentId
                        // Don't save large objects like lesson/drill/callbacks, reconstruct them on load
                    },
                    contentType: node.data.contentType,
                    contentId: node.data.contentId
                })),
                edges: edges,
                updatedAt: Date.now()
            };

            localStorage.setItem('guest_skill_tree', JSON.stringify(guestData));
        }
    }, [user, loading, nodes, edges, currentTreeTitle]);

    // Load data definition (must be defined before useEffect uses it)
    const loadData = useCallback(async (treeId?: string, skipGuestCheck: boolean = false) => {
        setLoading(true);
        setError(null);

        try {
            // 로그인 후 게스트 데이터가 있으면 먼저 복원 (저장할 수 있게)
            // 단, 공유된 트리나 특정 트리를 로드하는 경우는 제외
            if (user && !treeId && !skipGuestCheck) {
                const guestData = localStorage.getItem('guest_skill_tree');
                if (guestData) {
                    try {
                        const parsed = JSON.parse(guestData);
                        if (parsed.nodes && parsed.nodes.length > 0) {
                            // 게스트 데이터가 있으면 먼저 복원 (사용자가 저장할 수 있게)
                            // 먼저 lessons와 drills를 로드해야 함
                            const [lessons, drills] = await Promise.all([
                                getLessons(300).then(res => res),
                                getDrills(undefined, 100).then(res => res.data || [])
                            ]);
                            setAllLessons(lessons);
                            setAllDrills(drills);

                            const flowNodes: Node[] = parsed.nodes.map((node: any) => {
                                const type = node.type === 'text' ? 'text' : 'content';
                                if (type === 'text') {
                                    return {
                                        id: node.id,
                                        type: 'text',
                                        position: node.position,
                                        data: {
                                            label: node.data?.label || 'Text',
                                            style: node.data?.style || {},
                                            onChange: (newData: any) => handleNodeDataChange(node.id, newData),
                                            onDelete: () => {
                                                setNodes((nds) => nds.filter((n) => n.id !== node.id));
                                                setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
                                            }
                                        }
                                    };
                                }
                                const contentId = node.contentId || '';
                                const lesson = node.contentType === 'lesson' ? lessons.find(l => l.id === contentId) : undefined;
                                const drill = node.contentType === 'drill' ? drills.find(d => d.id === contentId) : undefined;
                                return {
                                    id: node.id,
                                    type: 'content',
                                    position: node.position,
                                    data: {
                                        contentType: node.contentType || 'technique',
                                        contentId,
                                        lesson,
                                        drill
                                    }
                                };
                            });
                            const flowEdges: Edge[] = parsed.edges.map((edge: any) => ({
                                id: edge.id,
                                source: edge.source,
                                target: edge.target,
                                type: edge.type === 'animated' ? 'smoothstep' : 'default',
                                animated: edge.type === 'animated',
                                style: { stroke: '#facc15', strokeWidth: 3 }
                            }));
                            setNodes(flowNodes);
                            setEdges(flowEdges);
                            setCurrentTreeTitle(parsed.title || '나의 스킬 트리');
                            setCurrentTreeId(null); // 게스트 데이터는 아직 저장되지 않음
                            setIsReadOnly(false);
                            setLoading(false);
                            // 게스트 데이터는 유지 (사용자가 저장할 때까지)
                            // 저장 후에는 localStorage에서 제거됨
                            return;
                        }
                    } catch (e) {
                        console.error('Error loading guest skill tree:', e);
                        // 에러 발생 시 계속 진행하여 서버 데이터 로드
                    }
                }
            }

            // 1. Fetch Public Data
            const [lessons, drills] = await Promise.all([
                getLessons(300).then(res => res),
                getDrills(undefined, 100).then(res => res.data || [])
            ]);

            setAllLessons(lessons);
            setAllDrills(drills);

            // 2. Fetch Tree & User Data
            // 로그인 후 게스트 데이터가 있으면 서버 데이터를 로드하지 않음
            if (user && !treeId && !skipGuestCheck) {
                const guestData = localStorage.getItem('guest_skill_tree');
                if (guestData) {
                    try {
                        const parsed = JSON.parse(guestData);
                        if (parsed.nodes && parsed.nodes.length > 0) {
                            // 게스트 데이터가 있으면 서버 데이터를 로드하지 않음
                            // 이미 위에서 게스트 데이터를 복원했으므로 여기서는 return
                            return;
                        }
                    } catch (e) {
                        // 파싱 에러 시 계속 진행
                    }
                }
            }

            let treeRes = { data: null };
            let skills: UserSkill[] = [];
            let masteryRes: UserTechniqueMastery[] = [];

            if (treeId) {
                // Case A: Loading a specific tree (Shared Link) - Works for Guests too
                const [tr, userSkillsRes, mastery] = await Promise.all([
                    getUserSkillTree(treeId),
                    user ? getUserSkills(user.id).then(res => res) : Promise.resolve([]),
                    user ? getUserTechniqueMastery(user.id).then(res => res.data || []) : Promise.resolve([])
                ]);
                treeRes = tr as any;
                skills = userSkillsRes;
                masteryRes = mastery;

                // 공유된 트리를 찾을 수 없으면 에러 표시
                if (!treeRes.data && (tr as any).error) {
                    throw new Error(`공유된 스킬 트리를 찾을 수 없습니다. 링크가 올바른지 확인해주세요.`);
                }
            } else if (user) {
                // Case B: Logged-in User default view (Latest Tree)
                // 단, 게스트 데이터가 있으면 로드하지 않음 (이미 위에서 체크)
                const [tr, userSkillsRes, mastery] = await Promise.all([
                    getLatestUserSkillTree(user.id),
                    getUserSkills(user.id).then(res => res),
                    getUserTechniqueMastery(user.id).then(res => res.data || [])
                ]);
                treeRes = tr as any;
                skills = userSkillsRes;
                masteryRes = mastery;
            }

            setUserSkills(skills);
            setMasteries(masteryRes);

            // Convert skill tree to React Flow format
            if (treeRes.data) {
                const tree = (treeRes as any).data;
                setCurrentTreeId(tree.id);
                setCurrentTreeTitle(tree.title || '나의 스킬 트리');

                // Check ownership
                // If loaded via ID and user mismatch (or no user), it's read-only
                if (user && tree.userId === user.id) {
                    setIsReadOnly(false);
                } else {
                    setIsReadOnly(true);
                    // For now, if no user logged in, or mismatch, allow view but no edit.
                    if (!user) {
                        // GUEST VIEWING SHARED TREE
                        setCurrentTreeTitle(tree.title || '공유된 스킬 트리');
                    }
                }

                const flowNodes: Node[] = (tree.nodes || []).map((node: any) => {
                    const type = node.type === 'text' ? 'text' : 'content';
                    const contentType = node.contentType || 'technique';

                    if (type === 'text') {
                        return {
                            id: node.id,
                            type: 'text',
                            position: node.position,
                            data: {
                                label: node.data?.label || 'Text',
                                style: node.data?.style || {},
                                onChange: (newData: any) => handleNodeDataChange(node.id, newData),
                                onDelete: () => {
                                    setNodes((nds) => nds.filter((n) => n.id !== node.id));
                                    setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
                                }
                            }
                        };
                    }

                    const contentId = node.contentId || (node as any).techniqueId || '';

                    const lesson = contentType === 'lesson' ? lessons.find(l => l.id === contentId) : undefined;
                    const drill = contentType === 'drill' ? drills.find(d => d.id === contentId) : undefined;

                    // Determine completion status
                    const isCompleted = contentType === 'lesson'
                        ? skills.some(s => s.courseId === lesson?.courseId && s.status === 'mastered')
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
                            isCompleted
                        }
                    };
                });

                const flowEdges: Edge[] = (tree.edges || []).map((edge: any) => ({
                    id: edge.id,
                    source: edge.source as string,
                    target: edge.target as string,
                    type: edge.type === 'animated' ? 'smoothstep' : 'default',
                    animated: edge.type === 'animated',
                    sourceHandle: edge.sourceHandle,
                    targetHandle: edge.targetHandle,
                    style: { stroke: '#facc15', strokeWidth: 3 }
                }));

                setNodes(flowNodes);
                setEdges(flowEdges);
            } else {
                // If no tree loaded (e.g. guest or new user failed create), ensure basics
                if (!user) {
                    // Guest without tree ID -> Try to load from localStorage
                    const guestData = localStorage.getItem('guest_skill_tree');
                    let hasGuestData = false;

                    if (guestData) {
                        try {
                            const parsed = JSON.parse(guestData);
                            if (parsed.nodes && parsed.nodes.length > 0) {
                                // Restore guest session
                                const flowNodes: Node[] = parsed.nodes.map((node: any) => {
                                    const type = node.type === 'text' ? 'text' : 'content';
                                    if (type === 'text') {
                                        return {
                                            id: node.id,
                                            type: 'text',
                                            position: node.position,
                                            data: {
                                                label: node.data?.label || 'Text',
                                                style: node.data?.style || {},
                                                onChange: (newData: any) => handleNodeDataChange(node.id, newData),
                                                onDelete: () => {
                                                    setNodes((nds) => nds.filter((n) => n.id !== node.id));
                                                    setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
                                                }
                                            }
                                        };
                                    }
                                    const contentId = node.contentId || '';
                                    const lesson = node.contentType === 'lesson' ? lessons.find(l => l.id === contentId) : undefined;
                                    const drill = node.contentType === 'drill' ? drills.find(d => d.id === contentId) : undefined;
                                    return {
                                        id: node.id,
                                        type: 'content',
                                        position: node.position,
                                        data: {
                                            contentType: node.contentType || 'technique',
                                            contentId,
                                            lesson,
                                            drill
                                        }
                                    };
                                });
                                const flowEdges: Edge[] = parsed.edges.map((edge: any) => ({
                                    id: edge.id,
                                    source: edge.source,
                                    target: edge.target,
                                    type: edge.type === 'animated' ? 'smoothstep' : 'default',
                                    animated: edge.type === 'animated',
                                    style: { stroke: '#facc15', strokeWidth: 3 }
                                }));
                                setNodes(flowNodes);
                                setEdges(flowEdges);
                                setCurrentTreeTitle(parsed.title || '자유롭게 기술트리를 만들어보세요');
                                hasGuestData = true;
                            }
                        } catch (e) {
                            console.error('Error loading guest data:', e);
                        }
                    }

                    if (!hasGuestData) {
                        setCurrentTreeTitle('자유롭게 기술트리를 만들어보세요');
                    }
                    setIsReadOnly(false); // Guest can edit
                } else {
                    // Logged in but no tree found -> Check if there's guest data to migrate
                    const guestData = localStorage.getItem('guest_skill_tree');
                    if (guestData) {
                        try {
                            const parsed = JSON.parse(guestData);
                            if (parsed.nodes && parsed.nodes.length > 0) {
                                // Ask user if they want to keep guest data
                                const keepGuestData = confirm('게스트 모드에서 만든 로드맵이 있습니다. 계속 사용하시겠습니까?');
                                if (keepGuestData) {
                                    // Convert guest nodes to flow format
                                    const flowNodes: Node[] = parsed.nodes.map((node: any) => {
                                        const type = node.type === 'text' ? 'text' : 'content';
                                        if (type === 'text') {
                                            return {
                                                id: node.id,
                                                type: 'text',
                                                position: node.position,
                                                data: {
                                                    label: node.data?.label || 'Text',
                                                    style: node.data?.style || {},
                                                    onChange: (newData: any) => handleNodeDataChange(node.id, newData),
                                                    onDelete: () => {
                                                        setNodes((nds) => nds.filter((n) => n.id !== node.id));
                                                        setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
                                                    }
                                                }
                                            };
                                        }
                                        const contentId = node.contentId || '';
                                        const lesson = node.contentType === 'lesson' ? lessons.find(l => l.id === contentId) : undefined;
                                        const drill = node.contentType === 'drill' ? drills.find(d => d.id === contentId) : undefined;
                                        return {
                                            id: node.id,
                                            type: 'content',
                                            position: node.position,
                                            data: {
                                                contentType: node.contentType || 'technique',
                                                contentId,
                                                lesson,
                                                drill
                                            }
                                        };
                                    });
                                    const flowEdges: Edge[] = parsed.edges.map((edge: any) => ({
                                        id: edge.id,
                                        source: edge.source,
                                        target: edge.target,
                                        type: edge.type === 'animated' ? 'smoothstep' : 'default',
                                        animated: edge.type === 'animated',
                                        style: { stroke: '#facc15', strokeWidth: 3 }
                                    }));
                                    setNodes(flowNodes);
                                    setEdges(flowEdges);
                                    setCurrentTreeTitle(parsed.title || '나의 스킬 트리');
                                    // Clear guest data after migration
                                    localStorage.removeItem('guest_skill_tree');
                                } else {
                                    localStorage.removeItem('guest_skill_tree');
                                }
                            }
                        } catch (e) {
                            console.error('Error migrating guest skill tree:', e);
                            localStorage.removeItem('guest_skill_tree');
                        }
                    }
                    setIsReadOnly(false);
                }
            }
        } catch (err: any) {
            console.error('Error loading skill tree:', err);
            setError(err.message || '데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [user, handleNodeDataChange]);

    useEffect(() => {
        const sharedData = searchParams.get('data');
        // 공유된 데이터(URL)가 있으면 항상 로드 (DB보다 우선)
        if (sharedData) {
            try {
                const decoded = decodeGuestData(sharedData);
                if (decoded && decoded.nodes) {
                    // Need to fetch lessons/drills to populate nodes
                    setLoading(true);
                    Promise.all([
                        getLessons(300).then(res => res),
                        getDrills(undefined, 100).then(res => res.data || [])
                    ]).then(([lessons, drills]) => {
                        setAllLessons(lessons);
                        setAllDrills(drills);

                        const flowNodes: Node[] = decoded.nodes.map((node: any) => {
                            const type = node.type === 'text' ? 'text' : 'content';
                            if (type === 'text') {
                                return {
                                    id: node.id,
                                    type: 'text',
                                    position: node.position,
                                    data: {
                                        label: node.data?.label || 'Text',
                                        style: node.data?.style || {},
                                        onChange: (newData: any) => handleNodeDataChange(node.id, newData),
                                        onDelete: () => {
                                            setNodes((nds) => nds.filter((n) => n.id !== node.id));
                                            setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
                                        }
                                    }
                                };
                            }
                            const contentId = node.contentId || '';
                            const lesson = node.contentType === 'lesson' ? lessons.find(l => l.id === contentId) : undefined;
                            const drill = node.contentType === 'drill' ? drills.find(d => d.id === contentId) : undefined;
                            return {
                                id: node.id,
                                type: 'content',
                                position: node.position,
                                data: {
                                    contentType: node.contentType || 'technique',
                                    contentId,
                                    lesson,
                                    drill
                                }
                            };
                        });
                        const flowEdges: Edge[] = decoded.edges.map((edge: any) => ({
                            id: edge.id,
                            source: edge.source,
                            target: edge.target,
                            type: edge.type === 'animated' ? 'smoothstep' : 'default',
                            animated: edge.type === 'animated',
                            style: { stroke: '#facc15', strokeWidth: 3 }
                        }));

                        setNodes(flowNodes);
                        setEdges(flowEdges);
                        setCurrentTreeTitle(decoded.title || '공유된 스킬 트리');
                        setCurrentTreeId(null);
                        setIsReadOnly(true); // Shared view is read-only initially, but guest can fork by just editing
                        setLoading(false);
                    });
                    return;
                }
            } catch (e) {
                console.error('Error decoding shared data:', e);
            }
        }

        const sharedTreeId = searchParams.get('id');
        // 공유된 트리가 있으면 항상 로드
        if (sharedTreeId) {
            loadData(sharedTreeId);
            return;
        }
        // 로그인 후 게스트 데이터가 있으면 서버 데이터를 로드하지 않음
        if (user) {
            const guestData = localStorage.getItem('guest_skill_tree');
            if (guestData) {
                try {
                    const parsed = JSON.parse(guestData);
                    if (parsed.nodes && parsed.nodes.length > 0) {
                        // 게스트 데이터가 있으면 서버 데이터를 로드하지 않음
                        // loadData는 게스트 데이터를 복원할 것이므로 호출
                        loadData(undefined);
                        return;
                    }
                } catch (e) {
                    // 파싱 에러 시 계속 진행
                }
            }
        }
        // 일반적인 경우: 서버 데이터 로드
        loadData(undefined);
    }, [user, searchParams, loadData]);

    const loadTreeList = async () => {
        if (!user) {
            setAlertConfig({
                title: '로그인 필요',
                message: '저장된 로드맵을 불러오려면 로그인이 필요합니다.',
                confirmText: '확인'
            });
            return;
        }
        const res = await listUserSkillTrees(user.id);
        if (res.data) {
            setTreeList(res.data);
            setIsLoadModalOpen(true);
        }
    };

    const handleLoadTree = (id: string) => {
        setIsLoadModalOpen(false);
        loadData(id);
    };

    const handleNewTree = () => {
        setIsNewTreeModalOpen(true);
    };

    const confirmNewTree = () => {
        setCurrentTreeId(null);
        setCurrentTreeTitle('새 스킬 트리');
        setNodes([]);
        setEdges([]);
        setIsNewTreeModalOpen(false);
    };

    const handleAddTextNode = () => {
        const nodeId = `text-${Date.now()}`;
        const newNode: Node = {
            id: nodeId,
            type: 'text',
            position: { x: 250, y: 150 }, // Default position
            data: {
                label: '텍스트 입력',
                onChange: (newData: any) => handleNodeDataChange(nodeId, newData),
                onDelete: () => {
                    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
                    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
                }
            }
        };
        setNodes((nds) => [...nds, newNode]);
    };

    // Unified Connection Logic
    const handleNodeConnection = useCallback((targetNode: Node) => {
        if (!selectedNodeId) return;
        if (selectedNodeId === targetNode.id) return;

        // Calculate best handles based on relative position
        const sourceNode = nodes.find(n => n.id === selectedNodeId);

        // Default handles
        let sourceHandle = 'source-bottom';
        let targetHandle = 'target-top';

        if (sourceNode) {
            const sx = sourceNode.position.x + (sourceNode.width || 0) / 2;
            const sy = sourceNode.position.y + (sourceNode.height || 0) / 2;
            const tx = targetNode.position.x + (targetNode.width || 0) / 2;
            const ty = targetNode.position.y + (targetNode.height || 0) / 2;

            const dx = tx - sx;
            const dy = ty - sy;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Horizontal
                if (dx > 0) {
                    sourceHandle = 'source-right';
                    targetHandle = 'target-left';
                } else {
                    sourceHandle = 'source-left';
                    targetHandle = 'target-right';
                }
            } else {
                // Vertical
                if (dy > 0) {
                    sourceHandle = 'source-bottom';
                    targetHandle = 'target-top';
                } else {
                    sourceHandle = 'source-top';
                    targetHandle = 'target-bottom';
                }
            }
        }

        const newEdge: Edge = {
            id: `edge-${selectedNodeId}-${targetNode.id}-${sourceHandle}-${targetHandle}`,
            source: selectedNodeId,
            target: targetNode.id,
            sourceHandle,
            targetHandle,
            type: 'default',
            style: { stroke: '#facc15', strokeWidth: 3 }
        };

        setEdges(eds => {
            // Check for ANY connection between these two nodes (bidirectional check)
            const exists = eds.some(
                e => (e.source === selectedNodeId && e.target === targetNode.id) ||
                    (e.source === targetNode.id && e.target === selectedNodeId)
            );

            if (exists) {
                return eds;
            }
            return addEdge(newEdge, eds);
        });

        // Clear selection after connecting
        setSelectedNodeId(null);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));

    }, [selectedNodeId, nodes, setNodes, setEdges]);

    // Handle node click (Selection & Connection)
    const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
        const nodeId = node.id;

        if (!selectedNodeId) {
            // Case 1: No selection -> Select this node
            setSelectedNodeId(nodeId);
            setNodes((nds) => nds.map((n) => ({
                ...n,
                selected: n.id === nodeId
            })));
            return;
        }

        if (selectedNodeId === nodeId) {
            // Case 2: Clicked already selected node -> Do nothing
            return;
        }

        // Case 3: Clicked different node -> Connect
        handleNodeConnection(node);

    }, [selectedNodeId, setNodes, handleNodeConnection]);

    // Handle node drag stop (Connect if pending)
    const onNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
        if (selectedNodeId && selectedNodeId !== node.id) {
            // If we have a selected node and we finished dragging ANOTHER node,
            // assume user wanted to move-and-connect.
            handleNodeConnection(node);
        }
    }, [selectedNodeId, handleNodeConnection]);

    // Handle node double click (Delete)
    const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
        // Prevent deletion of Text Nodes on double click (as they use it for editing)
        if (node.type === 'text') return;

        setNodes((nds) => nds.filter((n) => n.id !== node.id));
        setEdges((eds) => eds.filter((e) => e.source !== node.id && e.target !== node.id));
        if (selectedNodeId === node.id) setSelectedNodeId(null);
    }, [selectedNodeId, setNodes, setEdges]);

    // Handle canvas click (deselect)
    const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null);
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
    }, [setNodes]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target) return;

        // Prevent self-connections
        if (params.source === params.target) return;

        setEdges((eds) => {
            // Check for ANY connection between these two nodes (bidirectional check)
            const duplicate = eds.some(
                e => (e.source === params.source && e.target === params.target) ||
                    (e.source === params.target && e.target === params.source)
            );
            if (duplicate) return eds;

            const newEdge: Edge = {
                id: `edge-${params.source}-${params.target}-${params.sourceHandle}-${params.targetHandle}`,
                source: params.source,
                target: params.target,
                sourceHandle: params.sourceHandle,
                targetHandle: params.targetHandle,
                style: { stroke: '#facc15', strokeWidth: 3 }
            };
            return addEdge(newEdge, eds);
        });
    }, [setEdges]);


    // Handle edge click for two-step deletion (Select -> Click again to delete)
    const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
        // Find the actual current state of the edge
        const currentEdge = edges.find(e => e.id === edge.id);

        if (currentEdge?.selected) {
            // If already blue (selected), delete it
            setEdges((eds) => eds.filter((e) => e.id !== edge.id));
        }
    }, [edges, setEdges]);

    // Drag to Create Handlers
    const onConnectStart: OnConnectStart = useCallback((_, { nodeId, handleId }) => {
        connectionStartRef.current = { nodeId: nodeId || '', handleId };
    }, []);

    const onConnectEnd: OnConnectEnd = useCallback((event) => {
        const target = event.target as Element;
        const isPane = target.classList.contains('react-flow__pane');

        if (isPane && connectionStartRef.current && rfInstance) {
            // Calculate position
            const position = rfInstance.project({
                x: (event as any).clientX,
                y: (event as any).clientY,
            });

            setPendingConnection({
                source: connectionStartRef.current.nodeId,
                sourceHandle: connectionStartRef.current.handleId,
                position
            });
            setIsAddModalOpen(true);
        }
        // Reset ref is not strictly necessary as we set state, but good practice? 
        // Actually we keep it until modal closes or something else happens? 
        // No, 'onConnectStart' will reset it next time. 
    }, [rfInstance]);

    // Add content from modal
    const handleAddContent = async (
        items: { id: string, type: 'technique' | 'lesson' | 'drill' }[],
        positionOverride?: { x: number, y: number }
    ) => {

        // Use override > pending position > default grid
        const startX = positionOverride ? positionOverride.x : (pendingConnection ? pendingConnection.position.x : 100);
        const startY = positionOverride ? positionOverride.y : (pendingConnection ? pendingConnection.position.y : 100);
        const spacing = 180;
        const cols = 4;

        const newNodes: Node[] = [];
        const newEdges: Edge[] = [];

        items.forEach((item, index) => {
            const lesson = item.type === 'lesson' ? allLessons.find(l => l.id === item.id) : undefined;
            const drill = item.type === 'drill' ? allDrills.find(d => d.id === item.id) : undefined;

            const isCompleted = item.type === 'lesson'
                ? userSkills.some(s => s.courseId === lesson?.courseId && s.status === 'mastered')
                : false;

            const mastery = item.type === 'technique'
                ? masteries.find(m => m.techniqueId === item.id)
                : undefined;

            // Logic:
            // 1. Drag-and-Drop (positionOverride): Place exactly there (if multiple, stack or offset slightly)
            // 2. Drag-to-Create (pendingConnection): Place at cursor (if multiple, offset)
            // 3. Button Add (Grid): Use grid layout relative to current nodes

            let x, y;

            if (positionOverride || pendingConnection) {
                x = startX + (index * 20);
                y = startY + (index * 20);
            } else {
                const col = index % cols;
                const row = Math.floor(index / cols);
                x = startX + (col * spacing);
                y = startY + (row * spacing) + (nodes.length * 50);
            }

            const nodeId = `node-${Date.now()}-${index}`;

            newNodes.push({
                id: nodeId,
                type: 'content',
                position: { x, y },
                data: {
                    contentType: item.type,
                    contentId: item.id,
                    lesson,
                    drill,
                    mastery,
                    isCompleted
                }
            });

            // Create Edge if this was a Drag-to-Create action (Handle Drag)
            // Only if NOT a direct drop from modal (unless we want to support dropping onto a node to connect?)
            // For now, pendingConnection is strictly for Handle Drag.
            if (pendingConnection) {
                newEdges.push({
                    id: `edge-${pendingConnection.source}-${nodeId}`,
                    source: pendingConnection.source,
                    target: nodeId,
                    sourceHandle: pendingConnection.sourceHandle,
                    targetHandle: 'target-top',
                    type: 'default',
                    style: { stroke: '#facc15', strokeWidth: 3 }
                });
            }
        });

        setNodes(nds => [...nds, ...newNodes]);
        if (newEdges.length > 0) {
            setEdges(eds => [...eds, ...newEdges]);
        }

        // Reset pending state
        setPendingConnection(null);
    };

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            // Check if it's our app data
            const dataStr = event.dataTransfer.getData('application/grapplay-node');
            if (!dataStr || !rfInstance) {
                return;
            }

            try {
                const item = JSON.parse(dataStr);

                const position = rfInstance.project({
                    x: event.clientX,
                    y: event.clientY,
                });

                handleAddContent([item], position);
                // Can keep modal open or close. User might want to drag multiple.
                // But usually drop implies intent to finish action for that item.
                // Let's NOT close modal to allow multiple drags.
            } catch (e) {
                console.error('Failed to parse dropped data', e);
            }
        },
        [rfInstance, handleAddContent]
    );

    // Save tree
    // Save tree logic
    const executeSave = async (titleToUse: string): Promise<boolean> => {
        setSaving(true);
        try {
            const skillTreeNodes: SkillTreeNode[] = nodes
                .map(node => ({
                    id: node.id,
                    contentType: (node.type === 'text' ? 'text' : (node.data.contentType || 'technique')) as 'text' | 'technique' | 'lesson' | 'drill',
                    contentId: node.type === 'text' ? '' : (node.data.contentId || node.data.technique?.id || node.data.lesson?.id || node.data.drill?.id || ''),
                    position: node.position,
                    type: (node.type === 'text' ? 'text' : 'content') as 'text' | 'content',
                    data: node.type === 'text' ? { label: node.data.label, style: node.data.style } : undefined
                }))
                .filter(n => n.type === 'text' || (n.contentId && n.contentId.trim() !== ''));

            const skillTreeEdges = edges.map(edge => ({
                id: edge.id,
                source: edge.source as string,
                target: edge.target as string,
                type: edge.animated ? 'animated' as const : 'default' as const
            }));

            let result;
            if (currentTreeId) {
                // Update existing
                // If title changed, update it too
                result = await updateUserSkillTree(currentTreeId, titleToUse, skillTreeNodes, skillTreeEdges);
            } else {
                // Create new
                result = await createNewSkillTree(user!.id, titleToUse, skillTreeNodes, skillTreeEdges);
                if (result.data) {
                    setCurrentTreeId(result.data.id);
                }
            }

            if (result.error) throw result.error;

            setCurrentTreeTitle(titleToUse);
            setIsSaveModalOpen(false);

            // 저장 성공 시 게스트 데이터 제거 (서버에 저장되었으므로)
            localStorage.removeItem('guest_skill_tree');

            // Optional: Success toast could go here
            return true;
        } catch (error) {
            console.error('Error saving skill tree:', error);
            setAlertConfig({
                title: '저장 실패',
                message: '저장 중 오류가 발생했습니다. 다시 시도해주세요.',
                confirmText: '확인'
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!user) {
            // 게스트도 로컬 스토리지에 명시적 저장 허용
            const guestData = {
                title: currentTreeTitle,
                nodes: nodes.map(node => ({
                    id: node.id,
                    type: node.type,
                    position: node.position,
                    data: {
                        label: node.data.label,
                        style: node.data.style,
                        contentType: node.data.contentType,
                        contentId: node.data.contentId
                    },
                    contentType: node.data.contentType,
                    contentId: node.data.contentId
                })),
                edges: edges,
                updatedAt: Date.now()
            };
            localStorage.setItem('guest_skill_tree', JSON.stringify(guestData));

            setAlertConfig({
                title: '임시 저장 완료',
                message: '현재 기기에 임시 저장되었습니다.\n로그인하면 클라우드에 영구 저장하고 다른 기기에서도 불러올 수 있습니다.\n\n로그인 하시겠습니까?',
                confirmText: '로그인 하러 가기',
                cancelText: '계속 작성하기',
                onConfirm: () => navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } })
            });
            return;
        }


        // Check title
        if (!currentTreeTitle || currentTreeTitle.trim() === '새 스킬 트리' || currentTreeTitle.trim() === '나의 첫 스킬 트리') {
            setSaveTitleInput(currentTreeTitle);
            setIsSaveModalOpen(true);
        } else {
            // Check if we are creating NEW but have a title (e.g. typed in input box)
            // or updating existing.
            // Just proceed with current title
            executeSave(currentTreeTitle);
        }
    };

    const handleDeleteTree = async (treeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('정말 이 로드맵을 삭제하시겠습니까? 복구할 수 없습니다.')) {
            await deleteUserSkillTree(treeId);
            setTreeList(prev => prev.filter(t => t.id !== treeId));
            if (currentTreeId === treeId) {
                // If deleted current tree, reset to new
                handleNewTree();
            }
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
            {/* Toolbar */}
            <div className="bg-slate-900 border-b border-slate-800 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                    {/* Left: Title */}
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <FolderOpen className="w-5 h-5 text-blue-500" />
                        </div>
                        <input
                            type="text"
                            value={currentTreeTitle}
                            onChange={(e) => setCurrentTreeTitle(e.target.value)}
                            className="bg-transparent border-none text-xl font-bold text-white focus:ring-0 placeholder-slate-600 w-full"
                            placeholder="로드맵 이름 입력..."
                        />
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {!isReadOnly && (
                            <>
                                {/* File Management */}
                                <button
                                    onClick={handleNewTree}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                                    title="새 로드맵"
                                >
                                    <FilePlus className="w-5 h-5" />
                                </button>

                                <button
                                    onClick={loadTreeList}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-700"
                                    title="불러오기"
                                >
                                    <FolderOpen className="w-5 h-5" />
                                </button>



                                <div className="w-px h-8 bg-slate-800 mx-2" />
                            </>
                        )}

                        {/* Add Text - Moved outside ReadOnly check so guests can try it */}
                        <button
                            onClick={handleAddTextNode}
                            className="bg-slate-800 text-white px-3 py-2 rounded-lg hover:bg-slate-700 border border-slate-700 flex items-center gap-2 transition-colors"
                            title="글자 박스 추가"
                        >
                            <Type className="w-4 h-4" />
                            <span className="hidden sm:inline font-medium">글자</span>
                        </button>


                        {/* Add Technique */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">콘텐츠 추가</span>
                        </button>

                        {/* Share */}
                        <button
                            onClick={async () => {
                                // GUEST SHARING SUPPORT
                                if (!user) {
                                    // Serialize current state
                                    const guestData = {
                                        title: currentTreeTitle,
                                        nodes: nodes.map(node => ({
                                            id: node.id,
                                            type: node.type,
                                            position: node.position,
                                            data: {
                                                label: node.data.label,
                                                style: node.data.style,
                                                contentType: node.data.contentType,
                                                contentId: node.data.contentId
                                            },
                                            contentType: node.data.contentType,
                                            contentId: node.data.contentId
                                        })),
                                        edges: edges.map(e => ({
                                            id: e.id,
                                            source: e.source,
                                            target: e.target,
                                            type: e.type,
                                            animated: e.animated
                                        }))
                                    };

                                    const encoded = encodeGuestData(guestData);
                                    if (encoded) {
                                        // Construct URL
                                        const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
                                        setCustomShareUrl(url);
                                        setIsShareModalOpen(true);
                                    } else {
                                        alert('데이터가 너무 커서 공유 링크를 생성할 수 없습니다.');
                                    }
                                    return;
                                }

                                // LOGGED IN USER SHARING
                                // 공유 전에 저장되지 않은 트리가 있으면 먼저 저장
                                if (!currentTreeId && (nodes.length > 0 || edges.length > 0)) {
                                    // 자동 저장
                                    const titleToUse = currentTreeTitle || '나의 스킬 트리';
                                    const saved = await executeSave(titleToUse);
                                    // 저장 성공 시에만 모달 열기
                                    if (saved && currentTreeId) {
                                        setCustomShareUrl(null); // Use default ID-based URL
                                        setIsShareModalOpen(true);
                                    }
                                } else {
                                    setCustomShareUrl(null); // Use default ID-based URL
                                    setIsShareModalOpen(true);
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors border border-slate-700"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">공유</span>
                        </button>

                        {/* Save */}
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-all ${saving ? 'bg-yellow-600 cursor-wait' : 'bg-green-600 hover:bg-green-700'
                                }`}
                        >
                            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">
                                {saving ? '저장 중...' : '저장'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* React Flow Canvas */}
            <div className="flex-1">
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onConnectStart={onConnectStart}
                    onConnectEnd={onConnectEnd}
                    onInit={setRfInstance}
                    onDragOver={onDragOver}
                    onDrop={onDrop}
                    onNodeClick={onNodeClick}
                    onNodeDragStop={onNodeDragStop}
                    onNodeDoubleClick={onNodeDoubleClick}
                    onEdgeClick={onEdgeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    defaultEdgeOptions={{
                        style: { stroke: '#facc15', strokeWidth: 3 },
                        interactionWidth: 20, // Make edges easier to click
                        animated: false,
                    }}
                    fitView
                    minZoom={0.05}
                    maxZoom={2}
                    className="bg-slate-950"
                    connectionMode={ConnectionMode.Loose}
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
                        className="bg-slate-900 border border-slate-700 !w-28 !h-20 sm:!w-48 sm:!h-36 !bottom-4 !right-4"
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
                        maskColor="rgba(15, 23, 42, 0.6)"
                    />



                </ReactFlow>
            </div>

            {/* --- CUSTOM MODALS --- */}

            {/* New Tree Confirmation Modal */}
            {isNewTreeModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden p-6 text-center">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FilePlus className="w-6 h-6 text-blue-500" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">새 로드맵 만들기</h3>
                        <p className="text-slate-400 mb-6 text-sm">
                            현재 작업 중인 내용이 저장되지 않았을 수 있습니다.<br />
                            정말 새로 만드시겠습니까?
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setIsNewTreeModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-bold text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmNewTree}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold text-sm shadow-lg shadow-blue-500/20"
                            >
                                새로 만들기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Save Title Modal */}
            {isSaveModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden p-6">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Save className="w-5 h-5 text-green-500" />
                            로드맵 저장
                        </h3>
                        <div className="mb-6">
                            <label className="text-xs text-slate-500 font-bold mb-2 block uppercase">로드맵 이름</label>
                            <input
                                type="text"
                                value={saveTitleInput}
                                onChange={(e) => setSaveTitleInput(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500 outline-none font-bold"
                                placeholder="나만의 로드맵 이름을 입력하세요"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setIsSaveModalOpen(false)}
                                className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-bold text-sm"
                            >
                                취소
                            </button>
                            <button
                                onClick={() => executeSave(saveTitleInput || '나의 로드맵')}
                                className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-500 transition-colors font-bold text-sm shadow-lg shadow-green-500/20"
                            >
                                저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Share Modal */}
            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={currentTreeTitle || '나의 스킬 트리'}
                text={`${user?.user_metadata?.full_name || '게스트'}님의 그랩플레이 스킬 트리를 확인해보세요!`}
                url={customShareUrl || (currentTreeId ? `${window.location.origin}${window.location.pathname}?id=${currentTreeId}` : undefined)}
            />

            {/* Generic Alert/Confirm Modal */}
            {alertConfig && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
                    <div className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-700 shadow-2xl overflow-hidden p-6 text-center">
                        <h3 className="text-lg font-bold text-white mb-2">{alertConfig.title}</h3>
                        <p className="text-slate-400 mb-6 text-sm whitespace-pre-line">
                            {alertConfig.message}
                        </p>
                        <div className="flex gap-3 justify-center">
                            {alertConfig.cancelText && (
                                <button
                                    onClick={() => setAlertConfig(null)}
                                    className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors font-bold text-sm"
                                >
                                    {alertConfig.cancelText}
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    if (alertConfig.onConfirm) alertConfig.onConfirm();
                                    setAlertConfig(null);
                                }}
                                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-colors font-bold text-sm shadow-lg shadow-blue-500/20"
                            >
                                {alertConfig.confirmText || '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AddTechniqueModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setPendingConnection(null); // Clear pending if cancelled
                }}
                lessons={allLessons}
                drills={allDrills}
                addedItems={nodes.map(n => ({
                    id: n.data.contentId || '',
                    type: n.data.contentType || 'technique'
                }))}
                onAddContent={handleAddContent}
            />

            {/* Load Tree Modal */}
            {isLoadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <FolderOpen className="w-5 h-5 text-blue-500" />
                                로드맵 불러오기
                            </h3>
                            <button onClick={() => setIsLoadModalOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto p-2">
                            {treeList.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    저장된 로드맵이 없습니다.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {treeList.map(tree => (
                                        <div
                                            key={tree.id}
                                            className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-700"
                                            onClick={() => handleLoadTree(tree.id)}
                                        >
                                            <div>
                                                <div className="font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                                                    {tree.title || '제목 없음'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(tree.updatedAt || tree.createdAt || Date.now()).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => handleDeleteTree(tree.id, e)}
                                                className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
