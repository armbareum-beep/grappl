import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    SelectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
    getLatestUserSkillTree,
    listUserSkillTrees,
    createNewSkillTree,
    updateUserSkillTree,
    deleteUserSkillTree,
    getUserSkillTree,
    transformUserSkillTree
} from '../../lib/api-skill-tree';
import { getLessons, getDrills, getUserSkills } from '../../lib/api';
import { getUserTechniqueMastery } from '../../lib/api-technique-mastery';
import { Lesson, Drill, SkillTreeNode, UserSkill, UserTechniqueMastery, UserSkillTree } from '../../types';
import { TechniqueNode } from './TechniqueNode';
import { AddTechniqueModal } from './AddTechniqueModal';
import { LoadingScreen } from '../LoadingScreen';
import { TextNode } from './TextNode';
import GroupNode from './GroupNode';
import {
    MoreVertical, Plus, Trash2, Edit2, Play, Pause, RotateCcw,
    Maximize2, Minimize2, ZoomIn, ZoomOut, Save, Share2, FolderOpen,
    Menu, X, ChevronRight, Lock, Globe, Move, Grid, List as ListIcon, FilePlus, Video, AlertCircle, UploadCloud, Type,
    Map as MapIcon, Network, Signpost, Edit3, PlayCircle
} from 'lucide-react';

import { SaveModal, LoadModal, ConfirmModal, SaveData } from './SkillTreeModals';
import ShareModal from '../social/ShareModal';
import { motion, AnimatePresence } from 'framer-motion';
import screenfull from 'screenfull';
import {
    DndContext,
    closestCenter,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
    PointerSensor,
    DragEndEvent
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

const nodeTypes: NodeTypes = {
    content: TechniqueNode as any,
    technique: TechniqueNode as any,
    text: TextNode as any,
    group: GroupNode as any
};

const DraggableTechnique: React.FC<{ node: any; index: number; navigate: any }> = ({ node, index, navigate }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: node.id,
    });

    const style = transform ? {
        transform: CSS.Translate.toString(transform),
        zIndex: 100,
        transition: 'none' // Fixed: Disable transition during drag for smoothness
    } : undefined;

    const mastery = node.data.mastery;
    const isCompleted = node.data.isCompleted;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={`relative p-3 rounded-xl border cursor-pointer ${isDragging ? 'opacity-50' : 'transition-all'} ${isCompleted || (mastery && mastery.masteryLevel >= 5)
                ? 'bg-violet-500/10 border-violet-500/30'
                : mastery && mastery.masteryLevel >= 2
                    ? 'bg-violet-400/5 border-violet-400/20'
                    : 'bg-zinc-800/40 border-zinc-700/50'
                }`}
            onClick={() => {
                if (node.data.contentType === 'lesson' && node.data.lesson) {
                    navigate(`/lessons/${node.data.lesson.id}`);
                } else if (node.data.contentType === 'drill' && node.data.drill) {
                    navigate(`/drills/${node.data.drill.id}`);
                }
            }}
        >
            <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold ${isCompleted || (mastery && mastery.masteryLevel >= 5)
                    ? 'bg-violet-600 text-white'
                    : 'bg-zinc-700 text-zinc-400'
                    }`}>
                    {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-[12px] truncate">
                        {node.data.label || node.data.lesson?.title || node.data.drill?.title || '콘텐츠'}
                    </h3>
                    {mastery && (
                        <div className="flex items-center gap-1 mt-1">
                            <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <div
                                        key={level}
                                        className={`w-3 h-1 rounded-full ${level <= mastery.masteryLevel
                                            ? 'bg-violet-500'
                                            : 'bg-zinc-700'
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-[9px] text-zinc-500 ml-1 font-bold">
                                Lv.{mastery.masteryLevel}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DroppableMenu: React.FC<{
    group: any;
    children: React.ReactNode;
    onLabelChange: (id: string, label: string) => void;
    onDelete: (id: string) => void;
}> = ({ group, children, onLabelChange, onDelete }) => {
    const { isOver, setNodeRef } = useDroppable({
        id: group.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={`p-4 rounded-2xl border transition-all mb-4 ${isOver ? 'bg-violet-600/20 border-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.3)]' : 'bg-slate-900/40 border-slate-800/50 backdrop-blur-sm'
                }`}
        >
            <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2 flex-1">
                    <FolderOpen className="w-4 h-4 text-violet-400 shrink-0" />
                    <input
                        className="bg-transparent text-white font-bold text-sm tracking-tight border-none focus:ring-1 focus:ring-violet-500/50 rounded px-1 w-full outline-none transition-all placeholder:text-zinc-600"
                        value={group.data.label || ''}
                        onChange={(e) => onLabelChange(group.id, e.target.value)}
                        placeholder="메뉴 이름 입력"
                    />
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onDelete(group.id);
                    }}
                    className="p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    title="메뉴 삭제"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
            <div className="grid grid-cols-1 gap-2">
                {children}
            </div>
        </div>
    );
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
    const [thumbnailPreview, setThumbnailPreview] = useState<string | undefined>(undefined);

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
    const [alertConfig, setAlertConfig] = useState<{
        title: string;
        message: string;
        onConfirm?: () => void;
        confirmText?: string;
        cancelText?: string;
        confirmColor?: string;
        icon?: React.ReactNode;
    } | null>(null);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [customShareUrl, setCustomShareUrl] = useState<string | null>(null);
    const [isPublic, setIsPublic] = useState(false);

    // Video Modal State
    const [videoModal, setVideoModal] = useState<{ isOpen: boolean; url: string | null; title: string }>({ isOpen: false, url: null, title: '' });

    // Mobile Optimization States
    const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
    const [isMobile, setIsMobile] = useState(false);
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [isUIHidden] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [hideGuestOverlay, setHideGuestOverlay] = useState(false);
    const [menu, setMenu] = useState<{ id: string; top?: number; left?: number; right?: number; bottom?: number; type: 'node' | 'edge' | 'pane' | 'group'; data?: any; selectedNodes?: Node[] } | null>(null);
    const [copiedNodes, setCopiedNodes] = useState<Node[] | null>(null);

    // Grouping States
    const [isGroupSelectionMode, setIsGroupSelectionMode] = useState(false);
    const [groupingInitialNodeId, setGroupingInitialNodeId] = useState<string | null>(null);
    const [selectedForGrouping, setSelectedForGrouping] = useState<Set<string>>(new Set());

    // Visualization Mode
    const [mode, setMode] = useState<'skill-tree' | 'roadmap'>('roadmap');
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    // Update Nodes and Edges when Mode Changes
    useEffect(() => {
        if (loading) return;

        setNodes((nds) => {
            // Simple check to prevent infinite loops if mode and preview match
            if (nds.length > 0 && nds[0].data.mode === mode && nds[0].data.isPreview === isPreviewMode) return nds;
            return nds.map(n => ({ ...n, data: { ...n.data, mode, isPreview: isPreviewMode } }));
        });

        setEdges((eds) => {
            // Need current nodes map to determine status
            // We use the functional update's closure but we need access to latest 'nodes'.
            // Since we depend on [mode, loading, nodes.length], 'nodes' in outer scope should be reasonably fresh.
            // But to be safe, we might iterate 'nodes' from the state directly if possible, but here we use closure 'nodes'.
            const nodeStatus = new Map<string, string>();
            nodes.forEach(n => {
                const { mastery, isCompleted } = n.data;
                // If preview mode is ON, we mock everything as mastered OR in-progress
                if (isPreviewMode) {
                    // Alternate between mastered and in-progress for variety in preview
                    const isEven = parseInt(n.id.replace(/\D/g, '') || '0') % 2 === 0;
                    nodeStatus.set(n.id, isEven ? 'mastered' : 'in-progress');
                } else {
                    if ((mastery && mastery.masteryLevel >= 5) || isCompleted) {
                        nodeStatus.set(n.id, 'mastered');
                    } else if (mastery && mastery.masteryLevel >= 2) {
                        nodeStatus.set(n.id, 'in-progress');
                    } else {
                        nodeStatus.set(n.id, 'locked');
                    }
                }
            });

            return eds.map((e) => {
                const isRoadmap = mode === 'roadmap';
                if (!isRoadmap) {
                    return {
                        ...e,
                        animated: false,
                        style: { stroke: '#ffffff', strokeWidth: 2 },
                        className: 'skill-tree-edge', // Added class
                        data: { ...e.data, mode: 'skill-tree' }
                    };
                }

                // Roadmap Logic
                const status = nodeStatus.get(e.target);
                let className = '';
                let stroke = '#52525b'; // Default Locked (Zinc-600)

                if (status === 'mastered') {
                    className = 'roadmap-edge-glow';
                    stroke = '#8b5cf6';
                } else if (status === 'in-progress') {
                    className = 'roadmap-edge-flow';
                    stroke = '#a78bfa';
                }

                return {
                    ...e,
                    animated: false, // We use CSS animation for custom control
                    style: { stroke, strokeWidth: status === 'mastered' ? 4 : 3 },
                    className: `roadmap-edge ${className}`, // Added roadmap-edge base class
                    data: { ...e.data, mode: 'roadmap' }
                };
            });
        });
    }, [mode, loading, nodes.length, isPreviewMode]); // Re-run when mode or preview changes

    // Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Sync Fullscreen State
    useEffect(() => {
        if (screenfull && screenfull.isEnabled) {
            const handleChange = () => {
                setIsFullScreen(screenfull.isFullscreen);
            };
            screenfull.on('change', handleChange);
            return () => screenfull.off('change', handleChange);
        }
    }, []);

    // Dispatch fullscreen state to parent/window
    useEffect(() => {
        window.dispatchEvent(new CustomEvent('app-fullscreen-toggle', { detail: isFullScreen }));
    }, [isFullScreen]);

    // Encode/Decode Helpers
    const encodeGuestData = (data: any) => {
        try {
            const json = JSON.stringify(data);
            return btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(_match, p1) {
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
    const reactFlowWrapper = useRef<HTMLDivElement>(null);

    // Capture Thumbnail
    const handleCaptureThumbnail = useCallback(async () => {
        if (!reactFlowWrapper.current) return;
        try {
            const dataUrl = await toPng(reactFlowWrapper.current, {
                cacheBust: true,
                filter: (node) => !node.classList?.contains('react-flow__controls') && !node.classList?.contains('react-flow__minimap'),
                backgroundColor: '#09090b', // zinc-950
                width: reactFlowWrapper.current.offsetWidth,
                height: reactFlowWrapper.current.offsetHeight,
                style: {
                    width: `${reactFlowWrapper.current.offsetWidth}px`,
                    height: `${reactFlowWrapper.current.offsetHeight}px`,
                }
            });
            setThumbnailPreview(dataUrl);
        } catch (err) {
            console.error('Snapshot failed', err);
        }
    }, [reactFlowWrapper]);

    // Helper to update node data (for TextNode)
    const handleNodeDataChange = useCallback((nodeId: string, newData: any) => {
        setNodes((nds) => nds.map((node) => {
            if (node.id === nodeId) {
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
                                getDrills(undefined, 100).then(res => (res as any).data || (res as any) || [])
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
                                const lesson = node.contentType === 'lesson' ? lessons.find((l: Lesson) => l.id === contentId) : undefined;
                                const drill = node.contentType === 'drill' ? drills.find((d: Drill) => d.id === contentId) : undefined;
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
                                type: 'default',
                                animated: true,
                                sourceHandle: edge.sourceHandle,
                                targetHandle: edge.targetHandle,
                                style: { stroke: '#8b5cf6', strokeWidth: 3 },
                                className: 'roadmap-edge-dash'
                            }));
                            setNodes(flowNodes);
                            setEdges(flowEdges);
                            setCurrentTreeTitle(parsed.title || '나의 스킬 트리');
                            setCurrentTreeId(null); // 게스트 데이터는 아직 저장되지 않음
                            setIsReadOnly(false);
                            setIsPublic(parsed.isPublic || false);
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
                getDrills(undefined, 100).then(res => (res as any).data || (res as any) || [])
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

                setIsPublic(tree.isPublic || false);

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

                    const lesson = contentType === 'lesson' ? lessons.find((l: Lesson) => l.id === contentId) : undefined;
                    const drill = contentType === 'drill' ? drills.find((d: Drill) => d.id === contentId) : undefined;

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
                    type: 'default',
                    animated: true,
                    sourceHandle: edge.sourceHandle,
                    targetHandle: edge.targetHandle,
                    style: { stroke: '#8b5cf6', strokeWidth: 3 },
                    className: 'roadmap-edge-dash'
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
                                    const lesson = node.contentType === 'lesson' ? lessons.find((l: Lesson) => l.id === contentId) : undefined;
                                    const drill = node.contentType === 'drill' ? drills.find((d: Drill) => d.id === contentId) : undefined;
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
                                    type: 'default',
                                    animated: edge.type === 'animated',
                                    sourceHandle: edge.sourceHandle,
                                    targetHandle: edge.targetHandle,
                                    style: { stroke: '#8b5cf6', strokeWidth: 3 }
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
                                        const lesson = node.contentType === 'lesson' ? lessons.find((l: Lesson) => l.id === contentId) : undefined;
                                        const drill = node.contentType === 'drill' ? drills.find((d: Drill) => d.id === contentId) : undefined;
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
                                        type: 'default',
                                        animated: edge.type === 'animated',
                                        sourceHandle: edge.sourceHandle,
                                        targetHandle: edge.targetHandle,
                                        style: { stroke: '#8b5cf6', strokeWidth: 3 }
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
                        getDrills(undefined, 100).then(res => (res as any).data || res || [])
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
                            const lesson = node.contentType === 'lesson' ? lessons.find((l: Lesson) => l.id === contentId) : undefined;
                            const drill = node.contentType === 'drill' ? drills.find((d: Drill) => d.id === contentId) : undefined;
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
                            type: 'default',
                            animated: edge.type === 'animated',
                            sourceHandle: edge.sourceHandle,
                            targetHandle: edge.targetHandle,
                            style: { stroke: '#8b5cf6', strokeWidth: 3 }
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
    }, [user, searchParams, loadData, handleNodeDataChange]);

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

    const onLabelChange = useCallback((id: string, label: string) => {
        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n));
    }, [setNodes]);

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


    // Helper: Calculate world position of a handle
    const getHandlePosition = useCallback((node: Node, handleId: string, allNodes: Node[]) => {
        // Calculate absolute world position
        let absX = node.position.x;
        let absY = node.position.y;
        let curr = node;
        while (curr.parentNode) {
            const parent = allNodes.find(n => n.id === curr.parentNode);
            if (!parent) break;
            absX += parent.position.x;
            absY += parent.position.y;
            curr = parent;
        }

        // Pill Dimensions Approximation or Group dimensions
        let w = 180;
        let h = 48;

        if (node.type === 'group') {
            w = Number(node.style?.width) || 400;
            h = Number(node.style?.height) || 300;

            // Map simple group handles
            if (handleId === 'top') return { x: absX + w * 0.5, y: absY };
            if (handleId === 'bottom') return { x: absX + w * 0.5, y: absY + h };
            if (handleId === 'left') return { x: absX, y: absY + h * 0.5 };
            if (handleId === 'right') return { x: absX + w, y: absY + h * 0.5 };
        }

        if (handleId.includes('-t') || handleId === 'top') return { x: absX + w * 0.5, y: absY };
        if (handleId.includes('-r') || handleId === 'right') return { x: absX + w, y: absY + h * 0.5 };
        if (handleId.includes('-b') || handleId === 'bottom') return { x: absX + w * 0.5, y: absY + h };
        if (handleId.includes('-l') || handleId === 'left') return { x: absX, y: absY + h * 0.5 };

        return { x: absX + w / 2, y: absY + h / 2 };
    }, []);

    // Helper: Find best handle pair between two nodes
    const calculateOptimalConnection = useCallback((sourceNode: Node, targetNode: Node, allNodes: Node[]) => {
        const sourceHandles = sourceNode.type === 'group' ? ['top', 'bottom', 'left', 'right'] : ['source-r', 'source-l', 'source-t', 'source-b'];
        const targetHandles = targetNode.type === 'group' ? ['top', 'bottom', 'left', 'right'] : ['target-r', 'target-l', 'target-t', 'target-b'];

        let minDistance = Infinity;
        let bestSource = sourceHandles[0];
        let bestTarget = targetHandles[0];

        sourceHandles.forEach(sHandle => {
            const sPos = getHandlePosition(sourceNode, sHandle, allNodes);
            targetHandles.forEach(tHandle => {
                const tPos = getHandlePosition(targetNode, tHandle, allNodes);
                const dist = Math.sqrt(Math.pow(tPos.x - sPos.x, 2) + Math.pow(tPos.y - sPos.y, 2));
                if (dist < minDistance) {
                    minDistance = dist;
                    bestSource = sHandle;
                    bestTarget = tHandle;
                }
            });
        });

        return { sourceHandle: bestSource, targetHandle: bestTarget };
    }, [getHandlePosition]);
    const mapToGroupHandle = useCallback((node: Node | undefined, handleId: string | null) => {
        if (!node || !handleId || node.type !== 'group') return handleId;
        if (handleId.includes('-t')) return 'top';
        if (handleId.includes('-b')) return 'bottom';
        if (handleId.includes('-l')) return 'left';
        if (handleId.includes('-r')) return 'right';
        return handleId;
    }, []);



    // Optimized: Update connections in real-time (throttled by React Flow's internal handling)
    // We removed the throttle here because ReactFlow's onNodeDrag is already reasonably efficient,
    // and for visual smoothness, immediate feedback is better than throttled 'snapping'.
    const onNodeDrag = useCallback((_: React.MouseEvent, node: Node) => {
        setEdges(eds => {
            let hasChanges = false;
            const newEdges = eds.map(edge => {
                let otherNodeId: string | undefined;
                let isSource = false;

                if (edge.source === node.id) {
                    otherNodeId = edge.target;
                    isSource = true;
                } else if (edge.target === node.id) {
                    otherNodeId = edge.source;
                    isSource = false;
                }

                if (!otherNodeId) return edge;

                const otherNode = nodes.find(n => n.id === otherNodeId);
                if (!otherNode) return edge;

                // Recalculate optimal connection
                const { sourceHandle, targetHandle } = isSource
                    ? calculateOptimalConnection(node, otherNode, nodes)
                    : calculateOptimalConnection(otherNode, node, nodes);

                if (edge.sourceHandle !== sourceHandle || edge.targetHandle !== targetHandle) {
                    hasChanges = true;
                    return { ...edge, sourceHandle, targetHandle };
                }

                return edge;
            });

            // Only return new array if something actually changed
            return hasChanges ? newEdges : eds;
        });
    }, [nodes, calculateOptimalConnection, setEdges]);


    // Unified Connection Logic (Find Shortest Path)
    const handleNodeConnection = useCallback((targetNode: Node, sourceIdOverride?: string) => {
        const sourceId = sourceIdOverride || selectedNodeId;
        if (!sourceId || sourceId === targetNode.id) return;

        const sourceNode = nodes.find(n => n.id === sourceId);
        if (!sourceNode) return;

        // Prevent connecting node to its own parent group or vice versa
        if (sourceNode.parentNode === targetNode.id || targetNode.parentNode === sourceId) {
            return;
        }

        const connection = calculateOptimalConnection(sourceNode, targetNode, nodes);
        let sourceHandle: string | null = connection.sourceHandle;
        let targetHandle: string | null = connection.targetHandle;

        // Map handles if either is a group
        sourceHandle = mapToGroupHandle(sourceNode, sourceHandle);
        targetHandle = mapToGroupHandle(targetNode, targetHandle);

        setEdges(eds => {
            // Check if connection already exists (either direction)
            const exists = eds.some(
                e => (e.source === sourceId && e.target === targetNode.id) ||
                    (e.source === targetNode.id && e.target === sourceId)
            );

            if (exists) {
                return eds;
            }

            // Create new edge without arrows
            const isGroupConnection = sourceNode.type === 'group' || targetNode.type === 'group';

            const newEdge: Edge = {
                id: `edge-${sourceId}-${targetNode.id}-${Date.now()}`,
                source: sourceId,
                target: targetNode.id,
                sourceHandle: sourceHandle || undefined,
                targetHandle: targetHandle || undefined,
                type: 'default',
                style: { stroke: '#7c3aed', strokeWidth: isGroupConnection ? 3.5 : 3, strokeDasharray: '15 15' },
                className: 'roadmap-edge-dash'
            };

            return addEdge(newEdge, eds);
        });

        // Update state to enable chaining: the target becomes the new source
        setSelectedNodeId(targetNode.id);
        setNodes((nds) => nds.map((n) => ({
            ...n,
            selected: n.id === targetNode.id
        })));

    }, [selectedNodeId, nodes, setNodes, setEdges, calculateOptimalConnection, mapToGroupHandle]);

    // GROUPING HANDLERS
    const startGroupSelection = useCallback((initialNodeId: string | null) => {
        setIsGroupSelectionMode(true);
        setGroupingInitialNodeId(initialNodeId);
        setSelectedForGrouping(new Set(initialNodeId ? [initialNodeId] : []));
        setMenu(null);
    }, []);

    const toggleNodeForGrouping = useCallback((nodeId: string) => {
        setSelectedForGrouping(prev => {
            const newSet = new Set(prev);
            if (newSet.has(nodeId)) {
                newSet.delete(nodeId);
            } else {
                newSet.add(nodeId);
            }
            return newSet;
        });
    }, []);

    const toggleGroupCollapse = useCallback((groupId: string) => {
        // Use setNodes functional update to avoid relying on 'nodes' state in closure
        setNodes((currentNodes) => {
            const groupNode = currentNodes.find(n => n.id === groupId);
            if (!groupNode) return currentNodes;

            const isCurrentlyExpanded = groupNode.data.expanded !== false;
            const willExpand = !isCurrentlyExpanded;
            const childrenIds = currentNodes.filter(n => n.parentNode === groupId).map(n => n.id);

            // 1. Handle Edge Redirection in sync
            setEdges((eds) => eds.map(edge => {
                if (willExpand) {
                    // Expanding: Restore original connections
                    const newData = { ...edge.data };
                    let newSource = edge.source;
                    let newTarget = edge.target;
                    let newSourceHandle = edge.sourceHandle;
                    let newTargetHandle = edge.targetHandle;
                    let updated = false;

                    if (edge.source === groupId && newData.originalSource) {
                        newSource = newData.originalSource;
                        newSourceHandle = newData.originalSourceHandle || edge.sourceHandle;
                        delete newData.originalSource;
                        delete newData.originalSourceHandle;
                        updated = true;
                    }
                    if (edge.target === groupId && newData.originalTarget) {
                        newTarget = newData.originalTarget;
                        newTargetHandle = newData.originalTargetHandle || edge.targetHandle;
                        delete newData.originalTarget;
                        delete newData.originalTargetHandle;
                        updated = true;
                    }
                    return updated ? {
                        ...edge,
                        source: newSource,
                        target: newTarget,
                        sourceHandle: newSourceHandle,
                        targetHandle: newTargetHandle,
                        data: newData
                    } : edge;
                } else {
                    // Collapsing: Redirect external edges to group
                    if (childrenIds.includes(edge.source) && childrenIds.includes(edge.target)) return edge;

                    const newData = { ...edge.data };
                    let newSource = edge.source;
                    let newTarget = edge.target;
                    let newSourceHandle = edge.sourceHandle;
                    let newTargetHandle = edge.targetHandle;
                    let updated = false;

                    if (childrenIds.includes(edge.source)) {
                        newData.originalSource = edge.source;
                        newData.originalSourceHandle = edge.sourceHandle;
                        newSource = groupId;
                        // For group nodes, we map to explicit simple ID
                        newSourceHandle = mapToGroupHandle(groupNode, edge.sourceHandle || 'source-b');
                        updated = true;
                    }
                    if (childrenIds.includes(edge.target)) {
                        newData.originalTarget = edge.target;
                        newData.originalTargetHandle = edge.targetHandle;
                        newTarget = groupId;
                        newTargetHandle = mapToGroupHandle(groupNode, edge.targetHandle || 'target-t');
                        updated = true;
                    }

                    return updated ? {
                        ...edge,
                        source: newSource,
                        target: newTarget,
                        sourceHandle: newSourceHandle,
                        targetHandle: newTargetHandle,
                        data: newData
                    } : edge;
                }
            }));

            // 2. Handle Node Visibility & Size
            let originalHeight = groupNode.data.originalHeight;
            let originalWidth = groupNode.data.originalWidth;

            if (!willExpand && !originalHeight) {
                originalHeight = groupNode.style?.height;
                originalWidth = groupNode.style?.width;
            }

            return currentNodes.map(node => {
                if (node.id === groupId) {
                    return {
                        ...node,
                        style: {
                            ...node.style,
                            height: willExpand ? (originalHeight || node.style?.height) : 60,
                            width: originalWidth || node.style?.width
                        },
                        data: {
                            ...node.data,
                            expanded: willExpand,
                            originalHeight,
                            originalWidth
                        }
                    };
                }
                if (node.parentNode === groupId) {
                    return { ...node, hidden: !willExpand };
                }
                return node;
            });
        });
    }, [setNodes, setEdges, mapToGroupHandle]);

    // Ensure all group nodes have the latest collapse/label handlers
    useEffect(() => {
        setNodes(nds => nds.map(node => {
            if (node.type === 'group' && (node.data.onToggleCollapse !== toggleGroupCollapse || node.data.onLabelChange !== onLabelChange)) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        onToggleCollapse: toggleGroupCollapse,
                        onLabelChange: onLabelChange
                    }
                };
            }
            return node;
        }));
    }, [toggleGroupCollapse, onLabelChange, setNodes]);

    // DND Kit Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        if (activeId === overId) return;

        // If over a group, set as parent
        const overNode = nodes.find(n => n.id === overId);
        if (overNode && overNode.type === 'group') {
            setNodes(nds => nds.map(n => {
                if (n.id === activeId) {
                    return {
                        ...n,
                        parentNode: overId,
                        extent: 'parent' as const,
                        position: { x: 50, y: 50 }, // Default relative position
                        zIndex: 10
                    };
                }
                return n;
            }));
        }
    }, [nodes, setNodes]);

    const handleAddMenu = useCallback(() => {
        const groupNodeId = `group-${Date.now()}`;
        const newGroup: Node = {
            id: groupNodeId,
            type: 'group',
            position: { x: 100, y: 100 },
            style: { width: 400, height: 300, zIndex: -10 },
            data: {
                label: '새 메뉴',
                expanded: true,
                onLabelChange: onLabelChange,
                onToggleCollapse: toggleGroupCollapse
            }
        };
        setNodes((nds: Node[]) => [...nds, newGroup]);
    }, [setNodes, onLabelChange, toggleGroupCollapse]);

    const confirmGroupCreation = useCallback((providedNodes?: Node[]) => {
        const nodesToGroup = providedNodes || nodes.filter(n => selectedForGrouping.has(n.id));

        if (nodesToGroup.length < 2) {
            setAlertConfig({
                title: '그룹 생성 불가',
                message: '2개 이상의 노드를 선택해주세요.',
                confirmText: '확인'
            });
            return;
        }

        // Check if there's exactly one group and other nodes
        const existingGroups = nodesToGroup.filter(n => n.type === 'group');
        const otherNodes = nodesToGroup.filter(n => n.type !== 'group');

        if (existingGroups.length === 1 && otherNodes.length > 0) {
            // MOVE NODES INTO EXISTING GROUP
            const targetGroup = existingGroups[0];
            const targetGroupId = targetGroup.id;

            // Helper for absolute position
            const getAbs = (n: Node) => {
                let x = n.position.x;
                let y = n.position.y;
                let c = n;
                while (c.parentNode) {
                    const p = nodes.find(pn => pn.id === c.parentNode);
                    if (!p) break;
                    x += p.position.x;
                    y += p.position.y;
                    c = p;
                }
                return { x, y };
            };

            const groupAbs = getAbs(targetGroup);

            setNodes(nds => nds.map(node => {
                if (otherNodes.some(o => o.id === node.id)) {
                    const nodeAbs = getAbs(node);
                    return {
                        ...node,
                        parentNode: targetGroupId,
                        extent: 'parent' as const,
                        position: {
                            x: nodeAbs.x - groupAbs.x,
                            y: nodeAbs.y - groupAbs.y
                        },
                        selected: false,
                        zIndex: 10
                    };
                }
                return node;
            }));
        } else {
            // CREATE NEW GROUP
            const minX = Math.min(...nodesToGroup.map(n => n.position.x));
            const minY = Math.min(...nodesToGroup.map(n => n.position.y));
            const maxX = Math.max(...nodesToGroup.map(n => n.position.x + (n.width || 180)));
            const maxY = Math.max(...nodesToGroup.map(n => n.position.y + (n.height || 48)));

            const padding = 30;
            const groupNodeId = `group-${Date.now()}`;

            // NESTED GROUPS: If all selected nodes have the same parent, the new group should also have it
            const commonParent = nodesToGroup.every(n => n.parentNode === nodesToGroup[0].parentNode) ? nodesToGroup[0].parentNode : undefined;

            const groupNode: Node = {
                id: groupNodeId,
                type: 'group',
                parentNode: commonParent,
                extent: commonParent ? 'parent' : undefined,
                position: { x: minX - padding, y: minY - padding },
                style: {
                    width: maxX - minX + padding * 2,
                    height: maxY - minY + padding * 2,
                    zIndex: -10
                },
                data: {
                    label: 'New Group',
                    expanded: true,
                    onLabelChange: (id: string, label: string) => {
                        setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label } } : n));
                    },
                    onToggleCollapse: toggleGroupCollapse
                },
                selected: true
            };

            const updatedChildren = nodesToGroup.map(node => ({
                ...node,
                parentNode: groupNodeId,
                extent: 'parent' as const,
                position: {
                    x: node.position.x - (minX - padding),
                    y: node.position.y - (minY - padding)
                },
                data: {
                    ...node.data,
                    isGroupingSelected: false,
                    isGroupingInitial: false
                },
                selected: false,
                zIndex: 10
            }));

            const nodesToKeep = nodes.filter(n => !nodesToGroup.some(g => g.id === n.id));
            setNodes([...nodesToKeep, groupNode, ...updatedChildren] as Node[]);
        }

        setIsGroupSelectionMode(false);
        setGroupingInitialNodeId(null);
        setSelectedForGrouping(new Set());
    }, [selectedForGrouping, nodes, setNodes, toggleGroupCollapse]);

    const cancelGroupSelection = useCallback(() => {
        setIsGroupSelectionMode(false);
        setGroupingInitialNodeId(null);
        setSelectedForGrouping(new Set());
    }, []);

    const ungroupNodes = useCallback((groupId: string) => {
        const groupNode = nodes.find(n => n.id === groupId);
        if (!groupNode) return;

        const currentGroupX = groupNode.position.x;
        const currentGroupY = groupNode.position.y;

        const children = nodes.filter(n => n.parentNode === groupId);

        const updatedChildren = children.map(child => ({
            ...child,
            parentNode: undefined,
            extent: undefined,
            position: {
                // Adjust position based on group position 
                // Note: If usage was dragging group, child position is relative.
                // If group is collapsed, its position is still valid.
                x: currentGroupX + child.position.x,
                y: currentGroupY + child.position.y
            },
            zIndex: 0,
            hidden: false // FORCE VISIBLE in case it was collapsed
        }));

        // Restore edges if they were redirected to group (collapsed state)
        setEdges(eds => eds.map(e => {
            const newData = { ...e.data };
            let newSource = e.source;
            let newTarget = e.target;
            let newSourceHandle = e.sourceHandle;
            let newTargetHandle = e.targetHandle;
            let updated = false;

            if (e.source === groupId && newData.originalSource) {
                newSource = newData.originalSource;
                newSourceHandle = newData.originalSourceHandle || e.sourceHandle;
                delete newData.originalSource;
                delete newData.originalSourceHandle;
                updated = true;
            }
            if (e.target === groupId && newData.originalTarget) {
                newTarget = newData.originalTarget;
                newTargetHandle = newData.originalTargetHandle || e.targetHandle;
                delete newData.originalTarget;
                delete newData.originalTargetHandle;
                updated = true;
            }
            return updated ? { ...e, source: newSource, target: newTarget, sourceHandle: newSourceHandle, targetHandle: newTargetHandle, data: newData } : e;
        }));

        const otherNodes = nodes.filter(n => n.id !== groupId && n.parentNode !== groupId);

        setNodes([...otherNodes, ...updatedChildren] as Node[]);
    }, [nodes, setNodes, setEdges]);

    const deleteGroupAndContent = useCallback((groupId: string) => {
        if (confirm('그룹과 포함된 모든 내용을 삭제하시겠습니까?')) {
            const childrenIds = nodes.filter(n => n.parentNode === groupId).map(n => n.id);
            setNodes(nds => nds.filter(n => n.id !== groupId && n.parentNode !== groupId));
            setEdges(eds => eds.filter(e => !childrenIds.includes(e.source) && !childrenIds.includes(e.target)));
        }
    }, [nodes, setNodes, setEdges]);

    const focusNodeOrGroup = useCallback((id: string) => {
        const node = rfInstance?.getNode(id);
        if (node && rfInstance) {
            rfInstance.fitView({ nodes: [node], duration: 800, padding: 0.2 });
        }
    }, [rfInstance]);

    // CONTEXT MENU HANDLERS
    const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
        event.preventDefault();
        const pane = reactFlowWrapper.current?.getBoundingClientRect();
        if (!pane) return;

        // If multiple nodes are selected and we right-clicked one of them, use all selected nodes.
        const selectedNodes = nodes.filter(n => n.selected);
        const isPartofSelection = selectedNodes.some(sn => sn.id === node.id);

        setMenu({
            id: node.id,
            top: event.clientY < pane.height - 200 ? event.clientY : undefined,
            left: event.clientX < pane.width - 200 ? event.clientX : undefined,
            right: event.clientX >= pane.width - 200 ? pane.width - event.clientX : undefined,
            bottom: event.clientY >= pane.height - 200 ? pane.height - event.clientY : undefined,
            type: node.type === 'group' ? 'group' : 'node',
            data: node,
            selectedNodes: isPartofSelection ? selectedNodes : [node]
        });
    }, [nodes]);

    const onPaneContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
        const pane = reactFlowWrapper.current?.getBoundingClientRect();
        if (!pane) return;

        const selectedNodes = nodes.filter(n => n.selected);

        setMenu({
            id: 'pane',
            top: event.clientY < pane.height - 200 ? event.clientY : undefined,
            left: event.clientX < pane.width - 200 ? event.clientX : undefined,
            right: event.clientX >= pane.width - 200 ? pane.width - event.clientX : undefined,
            bottom: event.clientY >= pane.height - 200 ? pane.height - event.clientY : undefined,
            type: 'pane',
            selectedNodes // Pass selected nodes to pane menu
        });
    }, [nodes]);

    // Handle node double click (Delete or Edit)
    const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
        event.stopPropagation();
        // Text nodes handle double click internally for editing, so we skip here
        if (node.type === 'text') return;

        if (node.type === 'group') {
            // Group: Focus and Expand if collapsed
            focusNodeOrGroup(node.id);
            if (node.data.expanded === false) {
                toggleGroupCollapse(node.id);
            }
            return;
        }

        const isContent = node.type === 'content';
        const d = node.data;

        if (isContent) {
            // Find video URL from lesson or drill - Updated to match Context Menu logic (Step 109)
            // Need to check vimeoUrl and technique properties as well
            const videoUrl = d?.lesson?.videoUrl || d?.lesson?.vimeoUrl ||
                d?.drill?.videoUrl || d?.drill?.vimeoUrl ||
                d?.technique?.videoUrl || d?.technique?.vimeoUrl;

            const title = d?.label || d?.lesson?.title || d?.drill?.title || '미리보기';

            // Only open video modal if video exists
            if (videoUrl) {
                setVideoModal({
                    isOpen: true,
                    url: videoUrl,
                    title: title
                });
            }
        }
    }, [navigate, focusNodeOrGroup, toggleGroupCollapse, setVideoModal]);

    // Handle canvas click (deselect)
    const handlePaneClick = useCallback(() => {
        setSelectedNodeId(null);
        // Only reset React Flow selection if NOT in group selection mode
        if (!isGroupSelectionMode) {
            setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        }
        setMenu(null);
    }, [isGroupSelectionMode, setNodes]);

    const onEdgeContextMenu = useCallback(
        (event: React.MouseEvent, edge: Edge) => {
            event.preventDefault();
            const pane = reactFlowWrapper.current?.getBoundingClientRect();
            setMenu({
                id: edge.id,
                type: 'edge',
                top: event.clientY - (pane?.top || 0),
                left: event.clientX - (pane?.left || 0),
                data: edge,
            });
        },
        [setMenu]
    );

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target) return;
        if (params.source === params.target) return;

        setEdges((eds) => {
            // Check if connection already exists (either direction)
            const exists = eds.some(
                (e) => (e.source === params.source && e.target === params.target) ||
                    (e.source === params.target && e.target === params.source)
            );

            if (exists) {
                return eds;
            }

            const sNode = nodes.find(n => n.id === params.source);
            const tNode = nodes.find(n => n.id === params.target);

            if (!sNode || !tNode) return eds;

            const connection = calculateOptimalConnection(sNode!, tNode!, nodes);
            let sourceHandle: string | null = connection.sourceHandle;
            let targetHandle: string | null = connection.targetHandle;

            // Map handles if either is a group
            sourceHandle = mapToGroupHandle(sNode, params.sourceHandle || sourceHandle);
            targetHandle = mapToGroupHandle(tNode, params.targetHandle || targetHandle);

            const isGroupConnection = sNode?.type === 'group' || tNode?.type === 'group';

            const newEdge: Edge = {
                id: `edge-${params.source}-${params.target}-${Date.now()}`,
                source: params.source!,
                target: params.target!,
                sourceHandle: sourceHandle || undefined,
                targetHandle: targetHandle || undefined,
                type: 'default',
                style: { stroke: '#7c3aed', strokeWidth: isGroupConnection ? 3.5 : 3, strokeDasharray: '15 15' },
                className: 'roadmap-edge-dash'
            };

            return addEdge(newEdge, eds);
        });
    }, [setEdges, nodes, calculateOptimalConnection, mapToGroupHandle]);




    // Handle node click (Selection & Connection & Grouping)
    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        event.stopPropagation(); // Prevent Pane Click
        const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;

        // If in group selection mode, toggle node for grouping
        if (isGroupSelectionMode) {
            toggleNodeForGrouping(node.id);
            return;
        }

        // --- Single selection / Connection Logic ---
        if (!isMultiSelect) {
            // Find effective source
            // IMPORTANT: prioritized explicit selectedNodeId, but fallback to any single selected node
            let sourceId = selectedNodeId;
            if (!sourceId) {
                const selectedNodes = nodes.filter(n => n.selected);
                if (selectedNodes.length === 1) {
                    sourceId = selectedNodes[0].id;
                }
            }

            if (!sourceId) {
                // First click: select
                setSelectedNodeId(node.id);
                // Ensure immediate visual feedback
                setNodes((nds) => nds.map((n) => ({
                    ...n,
                    selected: n.id === node.id
                })));
                return;
            }

            if (sourceId === node.id) {
                // Clicked same node: STAY SELECTED (ignore to avoid accidental de-select) 
                // Or you can keep it as a toggle if you prefer. 
                // Given the "short click turns off" complaint, let's make it stay selected.
                return;
            }

            // Connection attempt
            handleNodeConnection(node, sourceId);
        }
    }, [selectedNodeId, nodes, handleNodeConnection, isGroupSelectionMode, toggleNodeForGrouping, setNodes]);

    // Handle node drag stop - DO NOT connect on drag
    // BUT we use onNodeDragStart to catch "Click -> Drag" attempt as a connection intention if source is selected
    const onNodeDragStart = useCallback((event: React.MouseEvent, node: Node) => {
        // Multi-selection modifiers should prevent connection logic
        if (event.shiftKey || event.ctrlKey || event.metaKey) return;

        // Interpret drag start on a different node as a connection attempt if something is highlighted
        let sourceId = selectedNodeId;
        if (!sourceId) {
            const selectedNodes = nodes.filter(n => n.selected);
            if (selectedNodes.length === 1) {
                sourceId = selectedNodes[0].id;
            }
        }

        if (sourceId && sourceId !== node.id && !isGroupSelectionMode) {
            handleNodeConnection(node, sourceId);
            // By connecting, handleNodeConnection sets the current node as the new selected source.
            return;
        }
    }, [selectedNodeId, nodes, handleNodeConnection, isGroupSelectionMode]);

    const onNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node) => {
        // Just update position, no connection logic
    }, []);

    // --- ADVANCED INTERACTIONS ---

    // DUPLICATE NODES
    const duplicateNodes = useCallback((nodesToDuplicate: Node[]) => {
        if (nodesToDuplicate.length === 0) return;

        const timestamp = Date.now();
        const newNodes: Node[] = nodesToDuplicate.map((node, index) => {
            const newNode: Node = {
                ...node,
                id: `node-${timestamp}-${index}`,
                position: {
                    x: node.position.x + 40,
                    y: node.position.y + 40,
                },
                selected: true,
            };

            // If it's a text node, ensure callbacks are re-bound
            if (node.type === 'text') {
                newNode.data = {
                    ...node.data,
                    onChange: (newData: any) => handleNodeDataChange(newNode.id, newData),
                    onDelete: () => {
                        setNodes((nds) => nds.filter((n) => n.id !== newNode.id));
                        setEdges((eds) => eds.filter((e) => e.source !== newNode.id && e.target !== newNode.id));
                    }
                };
            }
            return newNode;
        });

        setNodes((nds) => {
            // Deselect others
            const deselected = nds.map(n => ({ ...n, selected: false }));
            return [...deselected, ...newNodes];
        });
    }, [handleNodeDataChange, setNodes, setEdges]);

    // Backward compatibility for single node duplicate
    const duplicateNode = useCallback((node: Node) => {
        duplicateNodes([node]);
    }, [duplicateNodes]);

    // KEYBOARD SHORTCUTS
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input/textarea
            const target = e.target as HTMLElement;
            if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

            // CMD/CTRL + C: Copy
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                const selected = nodes.filter(n => n.selected);
                if (selected.length > 0) {
                    setCopiedNodes(selected);
                }
            }

            // CMD/CTRL + V: Paste
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                if (copiedNodes && copiedNodes.length > 0) {
                    duplicateNodes(copiedNodes);
                }
            }

            // CMD/CTRL + D: Duplicate (Immediate)
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
                e.preventDefault();
                const selected = nodes.filter(n => n.selected);
                if (selected.length > 0) duplicateNodes(selected);
            }

            // DELETE / BACKSPACE: Remove
            if (e.key === 'Delete' || e.key === 'Backspace') {
                const selectedNodes = nodes.filter(n => n.selected);
                const selectedEdges = edges.filter(e => e.selected);

                if (selectedNodes.length > 0 || selectedEdges.length > 0) {
                    setNodes((nds) => nds.filter((n) => !n.selected));
                    setEdges((eds) => eds.filter((e) => !e.selected && !selectedNodes.some(n => n.id === e.source || n.id === e.target)));
                    setMenu(null);
                }
            }

            // G: Quick Group (if multiple selected)
            if (e.key === 'g' || e.key === 'G') {
                const selected = nodes.filter(n => n.selected);
                if (selected.length >= 2) {
                    // Start grouping mode with these nodes
                    setSelectedForGrouping(new Set(selected.map(n => n.id)));
                    confirmGroupCreation(selected); // Call with specific nodes
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nodes, edges, copiedNodes, duplicateNodes, setNodes, setEdges, confirmGroupCreation]);

    // Sync grouping selection state with node data
    useEffect(() => {
        setNodes(nds => nds.map(node => {
            const isSelected = selectedForGrouping.has(node.id);
            const isInitial = groupingInitialNodeId === node.id;

            if (node.data.isGroupingSelected !== isSelected || node.data.isGroupingInitial !== isInitial) {
                return {
                    ...node,
                    data: {
                        ...node.data,
                        isGroupingSelected: isSelected,
                        isGroupingInitial: isInitial
                    }
                };
            }
            return node;
        }));
    }, [selectedForGrouping, groupingInitialNodeId, setNodes]);

    // Handle edge click/double-click (consistent with node deletion)
    const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
        event.stopPropagation();
        setEdges((eds: Edge[]) => eds.filter((e) => e.id !== edge.id));
    }, [setEdges]);

    // Handle edge selection or context deletion
    const onEdgeClick = useCallback(() => {
        // Just select on click
    }, []);

    // Drag to Create Handlers (Note: Removed onConnectStart/End as they were unused)

    // Add content from modal
    const handleAddContent = async (
        items: { id: string, type: 'technique' | 'lesson' | 'drill' }[],
        positionOverride?: { x: number, y: number },
        parentNodeId?: string
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
                parentNode: parentNodeId,
                extent: parentNodeId ? 'parent' : undefined,
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
            // Create Edge if this was a Drag-to-Create action (Handle Drag)
            if (pendingConnection) {
                const sourceNode = nodes.find(n => n.id === pendingConnection.source);
                let optimalSource = pendingConnection.sourceHandle;
                let optimalTarget = 'target-t';

                // Calculate optimal handles if source node is found
                // We can pass the raw object or the newNodes entry
                const newNodeGeometry = newNodes[newNodes.length - 1];
                if (sourceNode) {
                    const { sourceHandle, targetHandle } = calculateOptimalConnection(sourceNode, newNodeGeometry, nodes);
                    optimalSource = sourceHandle;
                    optimalTarget = targetHandle;
                }

                newEdges.push({
                    id: `edge-${pendingConnection.source}-${nodeId}-${optimalSource}-${optimalTarget}`,
                    source: pendingConnection.source,
                    target: nodeId,
                    sourceHandle: optimalSource,
                    targetHandle: optimalTarget,
                    type: 'default',
                    style: { stroke: '#8b5cf6', strokeWidth: 3 }
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

    // --- DRAG AND DROP HANDLING ---
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
            if (!reactFlowBounds) return;

            const type = event.dataTransfer.getData('application/reactflow');
            const dataStr = event.dataTransfer.getData('application/reactflow-data');

            // check if the dropped element is valid
            if (typeof type === 'undefined' || !type) {
                return;
            }

            const position = rfInstance?.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            if (!position) return;

            if (dataStr) {
                try {
                    const data = JSON.parse(dataStr);
                    handleAddContent([data], position);
                } catch (e) {
                    console.error('Error parsing dropped data:', e);
                }
            }
        },
        [rfInstance, handleAddContent]
    );

    // Save tree logic
    const executeSave = async (saveData: SaveData | string): Promise<boolean> => {
        const data: SaveData = typeof saveData === 'string'
            ? { title: saveData, isPublic: isPublic }
            : saveData;

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
                type: edge.animated ? 'animated' as const : 'default' as const,
                sourceHandle: edge.sourceHandle || undefined,
                targetHandle: edge.targetHandle || undefined
            }));

            // Thumbnail Upload
            let uploadedThumbnailUrl = data.thumbnailUrl;
            if (data.isPublic && thumbnailPreview && !uploadedThumbnailUrl && supabase) {
                try {
                    const blob = await (await fetch(thumbnailPreview)).blob();
                    const fileName = `${user?.id}_${Date.now()}.png`;
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('skill-tree-thumbnails')
                        .upload(fileName, blob);

                    if (uploadError) throw uploadError;

                    const { data: publicUrlData } = supabase.storage
                        .from('skill-tree-thumbnails')
                        .getPublicUrl(fileName);

                    uploadedThumbnailUrl = publicUrlData.publicUrl;
                } catch (thumbErr) {
                    console.error('Thumbnail upload failed:', thumbErr);
                }
            }

            let result;
            if (currentTreeId) {
                // For existing trees, update everything in one call
                const updatePayload: any = {
                    title: data.title,
                    tree_data: { nodes: skillTreeNodes, edges: skillTreeEdges },
                    is_public: data.isPublic,
                    updated_at: new Date().toISOString()
                };

                if (data.isPublic) {
                    updatePayload.description = data.description;
                    updatePayload.tags = data.tags;
                    updatePayload.difficulty = data.difficulty;
                    updatePayload.thumbnail_url = uploadedThumbnailUrl;
                }

                const { data: updatedData, error } = await supabase
                    .from('user_skill_trees')
                    .update(updatePayload)
                    .eq('id', currentTreeId)
                    .select()
                    .single();

                result = { data: updatedData ? transformUserSkillTree(updatedData) : null, error };
            } else {
                // For new trees, create with all metadata at once
                const insertPayload: any = {
                    user_id: user!.id,
                    title: data.title,
                    tree_data: { nodes: skillTreeNodes, edges: skillTreeEdges },
                    is_public: data.isPublic
                };

                if (data.isPublic) {
                    insertPayload.description = data.description;
                    insertPayload.tags = data.tags;
                    insertPayload.difficulty = data.difficulty;
                    insertPayload.thumbnail_url = uploadedThumbnailUrl;
                }

                const { data: newData, error } = await supabase
                    .from('user_skill_trees')
                    .insert(insertPayload)
                    .select()
                    .single();

                result = { data: newData ? transformUserSkillTree(newData) : null, error };
                if (result.data) {
                    setCurrentTreeId(result.data.id);
                    console.log('New chain created:', {
                        id: result.data.id,
                        title: result.data.title,
                        isPublic: result.data.isPublic,
                        tags: result.data.tags
                    });
                }
            }

            if (result.error) {
                console.error('Save error:', result.error);
                throw result.error;
            }

            console.log('Save successful! Final data:', {
                id: result.data?.id,
                title: data.title,
                isPublic: data.isPublic,
                tags: data.tags,
                difficulty: data.difficulty
            });
            console.log('=== SAVE DEBUG END ===');

            setCurrentTreeTitle(data.title);
            setIsPublic(data.isPublic);

            if (!data.isPublic && typeof saveData === 'string') {
                setIsSaveModalOpen(false);
            } else if (!data.isPublic) {
                setIsSaveModalOpen(false);
            }
            // If Wizard (public upload), SaveModal handles the success screen, so don't close here if it's public upload flow

            localStorage.removeItem('guest_skill_tree');
            return true;
        } catch (error: any) {
            console.error('Error saving skill tree:', error);

            let message = '저장 중 오류가 발생했습니다. 다시 시도해주세요.';

            if (error.code === '42703' || error.message?.includes('column "is_public" does not exist')) {
                message = '데이터베이스 스키마 업데이트가 필요합니다.\n`migrate_skill_tree_v2.sql`을 실행해주세요.';
            }

            setAlertConfig({
                title: '저장 실패',
                message: message,
                confirmText: '확인',
                confirmColor: 'bg-red-600 shadow-red-900/40',
                icon: <AlertCircle className="w-8 h-8 text-red-500" />
            });
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Fullscreen Toggle with Browser API Support
    const handleFullScreenToggle = () => {
        if (isMobile) {
            setIsFullScreen(!isFullScreen);
        } else if (screenfull && screenfull.isEnabled) {
            screenfull.toggle();
        } else {
            setIsFullScreen(!isFullScreen);
        }
    };

    const handleSave = async () => {
        if (!user) {
            // 게스트도 로컬 스토리지에 명시적 저장 허용
            // If we have a title, save with it.
            localStorage.setItem('guest_skill_tree', JSON.stringify({
                title: currentTreeTitle,
                nodes: nodes.map(node => ({
                    id: node.id, type: node.type, position: node.position, data: node.data, contentType: node.data.contentType, contentId: node.data.contentId
                })),
                edges: edges.map(edge => ({
                    id: edge.id, source: edge.source, target: edge.target, type: edge.type, sourceHandle: edge.sourceHandle, targetHandle: edge.targetHandle
                }))
            }));

            setAlertConfig({
                title: '임시 저장 완료',
                message: '현재 기기에 임시 저장되었습니다.\n로그인하면 클라우드에 영구 저장하고 다른 기기에서도 불러올 수 있습니다.\n\n로그인 하시겠습니까?',
                confirmText: '로그인 하러 가기',
                cancelText: '계속 작성하기',
                onConfirm: () => navigate('/login', { state: { from: { pathname: location.pathname, search: location.search } } })
            });
            return;
        }


        // Always open SaveModal to allow publishing/metadata management
        setSaveTitleInput(currentTreeTitle);
        setIsSaveModalOpen(true);
    };

    const handleDeleteTree = async (treeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('정말 이 로드맵을 삭제하시겠습니까? 복구할 수 없습니다.')) {
            await deleteUserSkillTree(treeId);
            setTreeList((prev: UserSkillTree[]) => prev.filter(t => t.id !== treeId));
            if (currentTreeId === treeId) {
                // If deleted current tree, reset to new
                handleNewTree();
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
        <div className={`w-full bg-zinc-950 flex flex-col overflow-hidden transition-all duration-500 ${isFullScreen
            ? 'fixed inset-0 !z-[9999] h-[100dvh] w-full top-0 left-0'
            : 'relative h-full'
            }`}>

            {/* View Mode Toggle - Always Visible */}
            <div className={`fixed ${isFullScreen ? '!top-4' : '!top-24'} left-4 z-[10000] flex flex-col items-start transition-opacity duration-300 ${isUIHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className={`flex items-center w-fit bg-zinc-900 rounded-full border border-zinc-800/50 shadow-xl ${isMobile ? 'p-0.5 gap-0.5' : 'p-1 gap-1'}`}>
                    <button
                        onClick={() => setViewMode('map')}
                        className={`rounded-full font-bold transition-all flex items-center justify-center ${String(viewMode) === 'map'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                            : 'text-zinc-400 hover:text-white'
                            } ${isMobile ? 'w-8 h-8 p-0' : 'px-4 py-2 text-xs'}`}
                        title="맵 뷰"
                    >
                        {isMobile ? <MapIcon className="w-4 h-4" /> : '맵'}
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`rounded-full font-bold transition-all flex items-center justify-center ${String(viewMode) === 'list'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                            : 'text-zinc-400 hover:text-white'
                            } ${isMobile ? 'w-8 h-8 p-0' : 'px-4 py-2 text-xs'}`}
                        title="리스트 뷰"
                    >
                        {isMobile ? <ListIcon className="w-4 h-4" /> : '리스트'}
                    </button>
                </div>
            </div>

            {/* Skill Tree / Roadmap Toggle - Top Right Floating */}
            <div className={`fixed ${isFullScreen ? '!top-4' : '!top-24'} right-4 z-[10000] flex flex-col items-end transition-opacity duration-300 ${isUIHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className={`flex items-center w-fit bg-zinc-900 rounded-full border border-zinc-800/50 shadow-xl ${isMobile ? 'p-0.5 gap-0.5' : 'p-1 gap-1'}`}>
                    <button
                        onClick={() => setMode('skill-tree')}
                        className={`rounded-full font-bold transition-all flex items-center justify-center ${mode === 'skill-tree'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                            : 'text-zinc-400 hover:text-white'
                            } ${isMobile ? 'w-8 h-8 p-0' : 'px-4 py-2 text-xs'}`}
                        title="스킬 트리 모드"
                    >
                        {isMobile ? <Network className="w-4 h-4" /> : '스킬 트리'}
                    </button>
                    <button
                        onClick={() => setMode('roadmap')}
                        className={`rounded-full font-bold transition-all flex items-center justify-center ${mode === 'roadmap'
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                            : 'text-zinc-400 hover:text-white'
                            } ${isMobile ? 'w-8 h-8 p-0' : 'px-4 py-2 text-xs'}`}
                        title="로드맵 모드"
                    >
                        {isMobile ? <Signpost className="w-4 h-4" /> : '로드맵'}
                    </button>
                </div>

                {/* Preview Toggle - only shows in Roadmap Mode */}
                <AnimatePresence>
                    {mode === 'roadmap' && (
                        <motion.button
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onClick={() => setIsPreviewMode(!isPreviewMode)}
                            className={`mt-2 w-fit flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold ${isPreviewMode
                                ? 'bg-violet-600/20 border-violet-500 text-violet-300 shadow-lg shadow-violet-500/20'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isPreviewMode ? 'bg-violet-400 animate-pulse' : 'bg-zinc-600'}`} />
                            {isPreviewMode ? '미리보기 끄기' : '애니메이션 미리보기'}
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>



            {/* Floating Adaptive Toolbar */}
            {String(viewMode) === 'map' && (
                <>
                    {/* Desktop: Floating Vertical Toolbar */}
                    {!isMobile && (
                        <div className={`fixed top-48 right-4 z-40 transition-opacity duration-300 ${isUIHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                            <div className="flex flex-col gap-2 bg-zinc-950/40 backdrop-blur-xl border border-zinc-800/50 p-2 rounded-2xl shadow-2xl">
                                {/* Title Input */}
                                <div className="pb-2 border-b border-zinc-800/50">
                                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                                        <span className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Roadmap Status</span>
                                        {isPublic && (
                                            <div className="flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest">Public</span>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        value={currentTreeTitle}
                                        onChange={(e) => setCurrentTreeTitle(e.target.value)}
                                        className="bg-zinc-900/60 border border-zinc-800 rounded-lg px-2 py-1.5 text-white text-xs font-bold focus:ring-2 focus:ring-violet-500 outline-none w-32"
                                        placeholder="로드맵 이름..."
                                    />
                                </div>

                                {/* Action Buttons */}
                                {!isReadOnly && (
                                    <>
                                        <button
                                            onClick={handleNewTree}
                                            className="flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800/50 hover:border-zinc-700"
                                            title="새 로드맵"
                                        >
                                            <FilePlus className="w-4 h-4 flex-shrink-0" />
                                            <span className="hidden xl:inline text-xs font-medium">새로 만들기</span>
                                        </button>

                                        <button
                                            onClick={loadTreeList}
                                            className="flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800/50 hover:border-zinc-700"
                                            title="불러오기"
                                        >
                                            <FolderOpen className="w-4 h-4 flex-shrink-0" />
                                            <span className="hidden xl:inline text-xs font-medium">불러오기</span>
                                        </button>

                                        <div className="h-px bg-zinc-800/50 my-1" />
                                    </>
                                )}

                                <button
                                    onClick={handleAddTextNode}
                                    className="flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800/50 hover:border-zinc-700"
                                    title="텍스트 박스 추가"
                                >
                                    <Type className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden xl:inline text-xs font-medium">텍스트</span>
                                </button>

                                <button
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-white transition-all shadow-lg shadow-violet-500/20"
                                    title="콘텐츠 추가"
                                >
                                    <Plus className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden xl:inline text-xs font-medium">콘텐츠 추가</span>
                                </button>

                                <div className="h-px bg-zinc-800/50 my-1" />

                                <button
                                    onClick={async () => {
                                        if (!user) {
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
                                                const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
                                                setCustomShareUrl(url);
                                                setIsShareModalOpen(true);
                                            } else {
                                                alert('데이터가 너무 커서 공유 링크를 생성할 수 없습니다.');
                                            }
                                            return;
                                        }
                                        if (!currentTreeId && (nodes.length > 0 || edges.length > 0)) {
                                            const titleToUse = currentTreeTitle || '나의 스킬 트리';
                                            const saved = await executeSave(titleToUse);
                                            if (saved && currentTreeId) {
                                                setCustomShareUrl(null);
                                                setIsShareModalOpen(true);
                                            }
                                        } else {
                                            setCustomShareUrl(null);
                                            setIsShareModalOpen(true);
                                        }
                                    }}
                                    className="flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 bg-zinc-900/60 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all border border-zinc-800/50 hover:border-zinc-700"
                                    title="공유"
                                >
                                    <Share2 className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden xl:inline text-xs font-medium">공유</span>
                                </button>



                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={`flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 rounded-lg text-white transition-all ${saving
                                        ? 'bg-zinc-800 text-zinc-500 cursor-wait'
                                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 active:scale-95'
                                        }`}
                                    title={saving ? '저장 중...' : '계보 저장'}
                                >
                                    <Save className={`w-4 h-4 flex-shrink-0 ${saving ? 'animate-spin' : ''}`} />
                                    <span className="hidden xl:inline text-[10px] font-black uppercase tracking-tighter">Save Roadmap</span>
                                </button>

                                <div className="h-px bg-zinc-800/50 my-1" />

                                <button
                                    onClick={() => {
                                        if (isMobile) {
                                            setIsFullScreen(!isFullScreen);
                                        } else if (screenfull && screenfull.isEnabled) {
                                            screenfull.toggle();
                                        } else {
                                            setIsFullScreen(!isFullScreen);
                                        }
                                    }}
                                    className={`flex items-center justify-center xl:justify-start gap-2 p-2 xl:px-3 xl:py-2 rounded-lg transition-all border border-zinc-800/50 hover:border-zinc-700 ${isFullScreen ? 'bg-violet-600 text-white' : 'bg-zinc-900/60 text-zinc-400 hover:text-white'
                                        }`}
                                    title={isFullScreen ? '전체화면 해제' : '전체화면'}
                                >
                                    {isFullScreen ? <Minimize2 className="w-4 h-4 flex-shrink-0" /> : <Maximize2 className="w-4 h-4 flex-shrink-0" />}
                                    <span className="hidden xl:inline text-xs font-medium">{isFullScreen ? '축소' : '전체화면'}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mobile: FAB with Arc Menu */}
                    {isMobile && (
                        <>

                            {/* FAB Main Button */}
                            <button
                                onClick={() => setIsFabOpen(!isFabOpen)}
                                className={`fixed ${viewMode === 'list' ? 'bottom-36' : 'bottom-24'} right-6 z-50 w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-full shadow-2xl shadow-violet-500/40 flex items-center justify-center transition-all ${isFabOpen ? 'rotate-45' : 'rotate-0'
                                    } ${isUIHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                            >
                                <Plus className="w-6 h-6 text-white" />
                            </button>

                            {/* FAB Grid Menu */}
                            {isFabOpen && (
                                <div className={`fixed ${viewMode === 'list' ? 'bottom-52' : 'bottom-40'} right-4 z-40 animate-in slide-in-from-bottom-5 duration-200 fade-in`}>
                                    <div className="bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl p-3 shadow-2xl">
                                        <div className="grid grid-cols-2 gap-2">
                                            {/* Row 1 */}
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => {
                                                        handleNewTree();
                                                        setIsFabOpen(false);
                                                    }}
                                                    className="flex flex-col items-center gap-1 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-all"
                                                >
                                                    <FilePlus className="w-5 h-5 text-cyan-400" />
                                                    <span className="text-[10px] text-zinc-400">새로만들기</span>
                                                </button>
                                            )}
                                            {!isReadOnly && (
                                                <button
                                                    onClick={() => {
                                                        loadTreeList();
                                                        setIsFabOpen(false);
                                                    }}
                                                    className="flex flex-col items-center gap-1 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-all"
                                                >
                                                    <FolderOpen className="w-5 h-5 text-blue-400" />
                                                    <span className="text-[10px] text-zinc-400">불러오기</span>
                                                </button>
                                            )}

                                            {/* Title Edit Button */}
                                            <button
                                                onClick={() => {
                                                    setIsSaveModalOpen(true);
                                                    setIsFabOpen(false);
                                                }}
                                                className="flex flex-col items-center gap-1 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-all"
                                            >
                                                <Edit3 className="w-5 h-5 text-amber-400" />
                                                <span className="text-[10px] text-zinc-400">제목변경</span>
                                            </button>

                                            {/* Row 2 */}
                                            <button
                                                onClick={() => {
                                                    handleAddTextNode();
                                                    setIsFabOpen(false);
                                                }}
                                                className="flex flex-col items-center gap-1 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-all"
                                            >
                                                <Type className="w-5 h-5 text-zinc-400" />
                                                <span className="text-[10px] text-zinc-400">텍스트</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddModalOpen(true);
                                                    setIsFabOpen(false);
                                                }}
                                                className="flex flex-col items-center gap-1 p-2 bg-violet-600 hover:bg-violet-500 rounded-xl transition-all"
                                            >
                                                <Plus className="w-5 h-5 text-white" />
                                                <span className="text-[10px] text-white font-medium">콘텐츠추가</span>
                                            </button>

                                            {/* Row 3 */}
                                            <button
                                                onClick={async () => {
                                                    setIsFabOpen(false);
                                                    if (!user) {
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
                                                            const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;
                                                            setCustomShareUrl(url);
                                                            setIsShareModalOpen(true);
                                                        }
                                                        return;
                                                    }
                                                    if (!currentTreeId && (nodes.length > 0 || edges.length > 0)) {
                                                        const titleToUse = currentTreeTitle || '나의 스킬 트리';
                                                        const saved = await executeSave(titleToUse);
                                                        if (saved && currentTreeId) {
                                                            setCustomShareUrl(null);
                                                            setIsShareModalOpen(true);
                                                        }
                                                    } else {
                                                        setCustomShareUrl(null);
                                                        setIsShareModalOpen(true);
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-1 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-all"
                                            >
                                                <Share2 className="w-5 h-5 text-zinc-400" />
                                                <span className="text-[10px] text-zinc-400">공유</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleSave();
                                                    setIsFabOpen(false);
                                                }}
                                                disabled={saving}
                                                className="flex flex-col items-center gap-1 p-2 bg-green-600 hover:bg-green-500 rounded-xl transition-all"
                                            >
                                                <Save className={`w-5 h-5 text-white ${saving ? 'animate-spin' : ''}`} />
                                                <span className="text-[10px] text-white font-medium">저장</span>
                                            </button>

                                            {/* Row 4 - Full width */}
                                            <button
                                                onClick={() => {
                                                    handleFullScreenToggle();
                                                    setIsFabOpen(false);
                                                }}
                                                className="col-span-2 flex items-center justify-center gap-2 p-2 bg-zinc-800/50 hover:bg-zinc-700 rounded-xl transition-all"
                                            >
                                                {isFullScreen ? <Minimize2 className="w-5 h-5 text-orange-400" /> : <Maximize2 className="w-5 h-5 text-orange-400" />}
                                                <span className="text-[10px] text-zinc-400">{isFullScreen ? '축소' : '전체화면'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                    }
                </>
            )}

            {/* Content Area: Map or List View */}
            {
                viewMode === 'map' ? (
                    /* React Flow Canvas */
                    <div ref={reactFlowWrapper} className="flex-1 w-full h-full overflow-hidden touch-none relative">
                        {isFullScreen && (
                            <style>{`
                            nav, header, footer, .sidebar, .tab-bar, .bottom-nav {
                                display: none !important;
                            }
                            body {
                                overflow: hidden !important;
                            }
                        `}</style>
                        )}
                        {/* Custom Arrow Markers */}
                        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                            <defs>
                                <marker
                                    id="arrow-end"
                                    viewBox="0 0 10 10"
                                    refX="9"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto"
                                >
                                    <path
                                        d="M 0 0 L 10 5 L 0 10 L 3 5 z"
                                        fill="#7c3aed"
                                        stroke="none"
                                    />
                                </marker>
                                <marker
                                    id="arrow-start"
                                    viewBox="0 0 10 10"
                                    refX="1"
                                    refY="5"
                                    markerWidth="6"
                                    markerHeight="6"
                                    orient="auto-start-reverse"
                                >
                                    <path
                                        d="M 10 0 L 0 5 L 10 10 L 7 5 z"
                                        fill="#7c3aed"
                                        stroke="none"
                                    />
                                </marker>
                            </defs>
                        </svg>
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            onConnect={onConnect}
                            onInit={setRfInstance}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                            onNodeClick={onNodeClick}
                            onNodeDrag={onNodeDrag}
                            onNodeDragStart={onNodeDragStart}
                            onNodeDragStop={onNodeDragStop}
                            onNodeDoubleClick={onNodeDoubleClick}
                            onNodeContextMenu={onNodeContextMenu}
                            onPaneContextMenu={onPaneContextMenu}
                            onEdgeContextMenu={onEdgeContextMenu}
                            onEdgeClick={onEdgeClick}
                            onEdgeDoubleClick={onEdgeDoubleClick}
                            onNodesDelete={(deletedNodes) => {
                                const deletedIds = deletedNodes.map(n => n.id);
                                setEdges(eds => eds.filter(e => !deletedIds.includes(e.source) && !deletedIds.includes(e.target)));
                            }}
                            onPaneClick={() => { handlePaneClick(); setMenu(null); }}
                            nodeTypes={nodeTypes}
                            selectionMode={SelectionMode.Partial}
                            multiSelectionKeyCode={['Shift', 'Control', 'Meta']}
                            snapToGrid={true}
                            snapGrid={[20, 20]}
                            defaultEdgeOptions={{
                                type: 'default',
                                style: { stroke: '#7c3aed', strokeWidth: 4, cursor: 'pointer' },
                                interactionWidth: 50,
                            }}
                            fitView
                            fitViewOptions={{ padding: 0.2 }}
                            minZoom={isMobile ? 0.5 : 0.1}
                            maxZoom={isMobile ? 4.0 : 3.0}
                            className="bg-slate-950"
                            connectionMode={ConnectionMode.Loose}
                            preventScrolling={true}
                            zoomOnPinch={true}
                            panOnScroll={false}
                            zoomOnScroll={true}
                            panOnDrag={true}
                            proOptions={{ hideAttribution: true }}
                        >
                            <style>{`
                             /* Scoped Roadmap Styles */
                             .roadmap-edge-flow .react-flow__edge-path {
                                stroke: #a78bfa !important;
                                stroke-width: 3 !important;
                                stroke-dasharray: 10 10;
                                animation: flow 1s linear infinite;
                            }

                            .roadmap-edge-glow .react-flow__edge-path {
                                stroke: #8b5cf6 !important;
                                stroke-width: 4 !important;
                                filter: drop-shadow(0 0 4px #8b5cf6);
                                stroke-dasharray: none;
                                animation: none;
                            }

                             .react-flow__edge-path {
                                transition: all 0.5s ease;
                            }

                            /* Allow default styles for others */

                            /* Remove crosshair and thread-pulling completely */
                            .react-flow__handle {
                                pointer-events: none !important;
                                cursor: default !important;
                            }

                            .react-flow__pane {
                                cursor: grab !important;
                            }

                            .react-flow__pane:active {
                                cursor: grabbing !important;
                            }

                            .react-flow__node, .react-flow__node * {
                                cursor: pointer !important;
                            }

                            .react-flow__connection-path {
                                display: none !important;
                            }

                            @keyframes flow {
                                from { stroke-dashoffset: 100; } /* Adjusted for smoother short dash */
                                to { stroke-dashoffset: 0; }
                            }
                        `}</style>



                            <Background
                                variant={BackgroundVariant.Dots}
                                gap={20}
                                size={1}
                                color="#334155"
                            />
                            <Controls
                                className="bg-slate-800 border border-slate-700"
                                style={isMobile ? { bottom: '80px', left: '16px' } : undefined}
                            />
                            {!isMobile && (
                                <MiniMap
                                    className="border border-slate-700/50 !w-32 !h-24 !bottom-4 !right-4 !bg-slate-900/80 backdrop-blur-sm"
                                    nodeColor={(node) => {
                                        const mastery = node.data.mastery;
                                        const isCompleted = node.data.isCompleted;

                                        // Violet for Mastered/Completed
                                        if ((mastery && mastery.masteryLevel >= 5) || isCompleted) {
                                            return '#8b5cf6';
                                        }
                                        // Light Violet for In-progress
                                        if (mastery && mastery.masteryLevel >= 2) {
                                            return '#a78bfa';
                                        }
                                        // Gray for not started (locked)
                                        return '#52525b';
                                    }}
                                    maskColor="rgba(15, 23, 42, 0.7)"
                                />
                            )}




                        </ReactFlow>

                        {/* Multi-Selection & Grouping Toolbar (Moved Outside ReactFlow) */}
                        <AnimatePresence>
                            {(isGroupSelectionMode || nodes.filter(n => n.selected).length >= 2) && (
                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 30 }}
                                    className="fixed bottom-24 left-0 right-0 mx-auto z-[100] bg-zinc-950/90 backdrop-blur-2xl border border-zinc-800 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] px-4 py-2 flex items-center gap-3 w-fit max-w-[90vw] justify-center"
                                >
                                    <div className="flex items-center gap-2 md:gap-4 shrink-0">
                                        <span className="text-zinc-300 text-xs md:text-sm font-bold whitespace-nowrap">
                                            <span className="text-violet-400">
                                                {isGroupSelectionMode ? selectedForGrouping.size : nodes.filter(n => n.selected).length}
                                            </span>개 선택됨
                                        </span>
                                        <div className="w-px h-4 md:h-6 bg-zinc-800" />
                                    </div>

                                    <div className="flex items-center gap-2 md:gap-3">
                                        <button
                                            onClick={() => {
                                                const selected = isGroupSelectionMode
                                                    ? nodes.filter(n => selectedForGrouping.has(n.id))
                                                    : nodes.filter(n => n.selected);
                                                confirmGroupCreation(selected);
                                            }}
                                            className="px-3 py-1.5 md:px-6 md:py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-xs md:text-sm transition-all shadow-lg shadow-violet-600/40 whitespace-nowrap"
                                        >
                                            그룹 생성
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (isGroupSelectionMode) cancelGroupSelection();
                                                else setNodes(nds => nds.map(n => ({ ...n, selected: false })));
                                            }}
                                            className="px-3 py-1.5 md:px-5 md:py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl font-bold text-xs md:text-sm transition-all whitespace-nowrap"
                                        >
                                            취소
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ) : (
                    /* List View with Drag and Drop Support */
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="flex-1 w-full h-full overflow-y-auto bg-slate-950 p-4 pt-24">
                            <div className="max-w-2xl mx-auto space-y-3 pb-32">
                                {nodes.length === 0 ? (
                                    <div className="text-center py-12 text-slate-500">
                                        <p className="text-lg font-medium">아직 추가된 콘텐츠가 없습니다</p>
                                        <p className="text-sm mt-2">상단의 '콘텐츠 추가' 버튼을 눌러 시작하세요</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* 1. Groups (Menus) */}
                                        {nodes.filter(n => n.type === 'group').map((group) => (
                                            <DroppableMenu
                                                key={group.id}
                                                group={group}
                                                onLabelChange={onLabelChange}
                                                onDelete={deleteGroupAndContent}
                                            >
                                                {nodes.filter(n => n.parentNode === group.id).length === 0 ? (
                                                    <div className="py-8 text-center border-2 border-dashed border-zinc-800 rounded-xl text-zinc-600 text-[10px] font-bold">
                                                        여기로 기술을 드래그해서 넣으세요
                                                    </div>
                                                ) : (
                                                    nodes.filter(n => n.parentNode === group.id).map((node, nodeIdx) => (
                                                        <DraggableTechnique
                                                            key={node.id}
                                                            node={node}
                                                            index={nodeIdx}
                                                            navigate={navigate}
                                                        />
                                                    ))
                                                )}
                                            </DroppableMenu>
                                        ))}

                                        {/* 2. Standalone Techniques (No Parent) */}
                                        <div className="space-y-2 mt-8">
                                            {nodes.filter(n => (n.type === 'content' || n.type === 'technique' || n.type === 'text') && !n.parentNode).length > 0 && (
                                                <div className="flex items-center gap-2 mb-4 px-1">
                                                    <div className="w-1 h-4 bg-violet-600 rounded-full" />
                                                    <h3 className="text-zinc-500 font-bold text-[10px] uppercase tracking-wider">기타 기술</h3>
                                                </div>
                                            )}
                                            {nodes.filter(n => (n.type === 'content' || n.type === 'technique' || n.type === 'text') && !n.parentNode).map((node, nodeIdx) => (
                                                <DraggableTechnique
                                                    key={node.id}
                                                    node={node}
                                                    index={nodeIdx}
                                                    navigate={navigate}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </DndContext>
                )
            }


            {/* Guest Experience Overlay - Bottom Discovery Bar */}
            {
                !user && String(viewMode) === 'map' && !hideGuestOverlay && (
                    <div className={`fixed ${isMobile ? 'bottom-32' : 'bottom-4'} left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4`}>
                        <div className="relative bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/50 p-4 rounded-2xl w-full text-center shadow-2xl">
                            {/* Close Button */}
                            <button
                                onClick={() => setHideGuestOverlay(true)}
                                className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-800 border border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-white shadow-xl z-10"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <h3 className="text-2xl font-black text-white mb-2">공유 완료!</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                체인 라이브러리에 당신의 체인이 등록되었습니다.<br />
                                커뮤니티가 당신의 시그니처 무브를 배울 수 있습니다!
                            </p>
                            <button
                                onClick={() => (window.location.href = '/login')}
                                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-[11px] font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
                            >
                                무료로 시작하기
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Modal components are defined below at the end of the return */}

            {/* CONTEXT MENU */}
            <AnimatePresence>
                {menu && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="fixed z-[100] bg-zinc-950/95 backdrop-blur-2xl rounded-2xl border border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 min-w-[180px] overflow-hidden"
                        style={{
                            top: menu.top,
                            left: menu.left,
                            right: menu.right,
                            bottom: menu.bottom
                        }}
                    >
                        <div className="flex flex-col gap-1">
                            {menu.type === 'node' && (
                                <>
                                    {menu.data.type !== 'text' && (
                                        <button
                                            onClick={() => {
                                                const d = menu.data.data;
                                                const videoUrl = d?.lesson?.videoUrl || d?.lesson?.vimeoUrl ||
                                                    d?.drill?.videoUrl || d?.drill?.vimeoUrl ||
                                                    d?.technique?.videoUrl || d?.technique?.vimeoUrl;
                                                if (videoUrl) {
                                                    setVideoModal({
                                                        isOpen: true,
                                                        url: videoUrl,
                                                        title: menu.data.data.lesson?.title || menu.data.data.drill?.title || '영상 미리보기'
                                                    });
                                                } else {
                                                    alert('연결된 영상이 없습니다.');
                                                }
                                                setMenu(null);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all font-bold text-xs"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                                                <PlayCircle className="w-3.5 h-3.5" />
                                            </div>
                                            영상 미리보기
                                        </button>
                                    )}

                                    {menu.data.type !== 'text' && (
                                        <button
                                            onClick={() => {
                                                const d = menu.data.data;
                                                // 1. If it's a linked lesson/drill
                                                if (d?.lesson?.id) navigate(`/lessons/${d.lesson.id}`);
                                                else if (d?.drill?.id) navigate(`/drills/${d.drill.id}`);
                                                // 2. Fallback to technique page
                                                else if (d?.contentId || menu.data.id) {
                                                    const targetId = d?.contentId || menu.data.id;
                                                    navigate(`/technique/${targetId}`);
                                                }
                                                setMenu(null);
                                            }}
                                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-600/20 text-zinc-300 hover:text-violet-300 transition-all font-bold text-xs group"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-violet-600/20 flex items-center justify-center group-hover:bg-violet-600/40">
                                                <FilePlus className="w-3.5 h-3.5" />
                                            </div>
                                            상세페이지
                                        </button>
                                    )}

                                    <button
                                        onClick={() => {
                                            duplicateNode(menu.data);
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Save className="w-3.5 h-3.5" />
                                        </div>
                                        복제
                                    </button>

                                    <button
                                        onClick={() => {
                                            const nodesToGroup = menu.selectedNodes || [menu.data];
                                            if (nodesToGroup.length >= 2) {
                                                setSelectedForGrouping(new Set(nodesToGroup.map((n: any) => n.id)));
                                                confirmGroupCreation(nodesToGroup);
                                            } else {
                                                startGroupSelection(menu.id);
                                            }
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-600/20 text-zinc-300 hover:text-violet-300 transition-all font-bold text-xs group"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 flex items-center justify-center group-hover:bg-violet-600/40">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                                            </svg>
                                        </div>
                                        {menu.selectedNodes && menu.selectedNodes.length >= 2
                                            ? `${menu.selectedNodes.length}개 기술 묶기`
                                            : '기술 묶기'
                                        }
                                    </button>

                                    <div className="h-px bg-zinc-800/50 my-1 mx-2" />

                                    <button
                                        onClick={() => {
                                            setNodes(nds => nds.filter(n => n.id !== menu.id));
                                            setEdges(eds => eds.filter(e => e.source !== menu.id && e.target !== menu.id));
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </div>
                                        삭제
                                    </button>
                                </>
                            )}
                            {menu.type === 'edge' && (
                                <>
                                    <button
                                        onClick={() => {
                                            setEdges(eds => eds.filter(e => e.id !== menu.id));
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </div>
                                        연결선 삭제
                                    </button>
                                </>
                            )}

                            {menu.type === 'pane' && (
                                <>
                                    <button
                                        onClick={() => {
                                            const nodesToGroup = menu.selectedNodes || [];
                                            if (nodesToGroup.length >= 2) {
                                                setSelectedForGrouping(new Set(nodesToGroup.map((n: any) => n.id)));
                                                confirmGroupCreation(nodesToGroup);
                                            } else {
                                                // If less than 2 selected, enter selection mode
                                                // If there are any selected nodes, include them in the initial selection
                                                setIsGroupSelectionMode(true);
                                                const initialSet = new Set(nodesToGroup.map((n: any) => n.id));
                                                setSelectedForGrouping(initialSet as Set<string>);
                                                setGroupingInitialNodeId(null);
                                            }
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-600/20 text-zinc-300 hover:text-violet-300 transition-all font-bold text-xs group"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 flex items-center justify-center group-hover:bg-violet-600/40">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                                                <rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2" />
                                                <rect x="14" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                                                <rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2" />
                                            </svg>
                                        </div>
                                        {menu.selectedNodes && menu.selectedNodes.length >= 2
                                            ? `${menu.selectedNodes.length}개 기술 묶기`
                                            : '기술 묶기 (선택 모드)'
                                        }
                                    </button>

                                    <div className="h-px bg-zinc-800/50 my-1 mx-2" />

                                    <button
                                        onClick={() => {
                                            setIsAddModalOpen(true);
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-600/20 text-zinc-300 hover:text-violet-300 transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 flex items-center justify-center">
                                            <Plus className="w-3.5 h-3.5" />
                                        </div>
                                        기술 추가
                                    </button>
                                    <button
                                        onClick={() => {
                                            const pane = reactFlowWrapper.current?.getBoundingClientRect();
                                            if (pane && rfInstance) {
                                                const position = rfInstance.project({
                                                    x: (menu.left || 0) - pane.left,
                                                    y: (menu.top || 0) - pane.top,
                                                });
                                                const newNode: Node = {
                                                    id: `node-${Date.now()}`,
                                                    type: 'text',
                                                    position,
                                                    data: {
                                                        label: 'New Text',
                                                        onChange: (newData: any) => handleNodeDataChange(String(newNode.id), newData),
                                                        onDelete: () => {
                                                            setNodes((nds) => nds.filter((n) => n.id !== String(newNode.id)));
                                                            setEdges((eds) => eds.filter((e) => e.source !== String(newNode.id) && e.target !== String(newNode.id)));
                                                        }
                                                    }
                                                };
                                                setNodes(nds => [...nds, newNode]);
                                            }
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Type className="w-3.5 h-3.5" />
                                        </div>
                                        텍스트 상자 추가
                                    </button>
                                </>
                            )}
                            {menu.type === 'group' && (
                                <>
                                    <button
                                        onClick={() => {
                                            focusNodeOrGroup(menu.id);
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <Maximize2 className="w-3.5 h-3.5" />
                                        </div>
                                        확대해서 보기
                                    </button>

                                    <button
                                        onClick={() => {
                                            ungroupNodes(menu.id);
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12M8 12h12M8 17h12M3 7h.01M3 12h.01M3 17h.01" />
                                            </svg>
                                        </div>
                                        그룹 해제
                                    </button>

                                    <button
                                        onClick={() => {
                                            // Handle Group Add Content
                                            setPendingConnection({
                                                source: '',
                                                sourceHandle: '',
                                                position: { x: 50, y: 50 }, // Relative position inside group
                                            });
                                            // I'll need a trick to pass the group ID. 
                                            // Let's modify handleAddContent to be callable from modal with parent.
                                            // Actually, I'll store the target group ID in a ref or local state.
                                            (window as any)._targetGroupId = menu.id;
                                            setIsAddModalOpen(true);
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-violet-600/20 text-zinc-300 hover:text-violet-300 transition-all font-bold text-xs group"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-violet-600/20 flex items-center justify-center group-hover:bg-violet-600/40">
                                            <Plus className="w-3.5 h-3.5" />
                                        </div>
                                        그룹 내 콘텐츠 추가
                                    </button>

                                    <div className="h-px bg-zinc-800/50 my-1 mx-2" />

                                    <button
                                        onClick={() => {
                                            deleteGroupAndContent(menu.id);
                                            setMenu(null);
                                        }}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-all font-bold text-xs"
                                    >
                                        <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </div>
                                        모두 삭제
                                    </button>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- MODALS --- */}
            <SaveModal
                isOpen={isSaveModalOpen}
                onClose={() => { setIsSaveModalOpen(false); setThumbnailPreview(undefined); }}
                title="스킬 트리 저장"
                initialTitle={saveTitleInput}
                initialIsPublic={isPublic}
                onSave={async (data) => { await executeSave(data); }}
                isSaving={saving}
                thumbnailPreview={thumbnailPreview}
                onCaptureThumbnail={handleCaptureThumbnail}
            />

            <LoadModal
                isOpen={isLoadModalOpen}
                onClose={() => setIsLoadModalOpen(false)}
                trees={treeList}
                onLoad={handleLoadTree}
                onDelete={handleDeleteTree}
            />

            {/* Generic Alert/Confirm Modal */}
            <ConfirmModal
                isOpen={!!alertConfig}
                onClose={() => setAlertConfig(null)}
                title={alertConfig?.title || ''}
                message={alertConfig?.message || ''}
                onConfirm={alertConfig?.onConfirm || (() => setAlertConfig(null))}
                confirmText={alertConfig?.confirmText}
                confirmColor={alertConfig?.confirmColor}
                icon={alertConfig?.icon}
            />

            {/* New Tree Confirmation */}
            <ConfirmModal
                isOpen={isNewTreeModalOpen}
                onClose={() => setIsNewTreeModalOpen(false)}
                title="새 로드맵 시작"
                message={'현재 작업 중인 내용은 저장하지 않으면 사라집니다.\n정말 새로 시작하시겠습니까?'}
                onConfirm={confirmNewTree}
                confirmText="새로 만들기"
                confirmColor="bg-violet-600"
                icon={<FilePlus className="w-8 h-8 text-violet-500" />}
            />

            <ShareModal
                isOpen={isShareModalOpen}
                onClose={() => setIsShareModalOpen(false)}
                title={currentTreeTitle || '나의 스킬 트리'}
                text={`${user?.user_metadata?.full_name || '게스트'}님의 그랩플레이 스킬 트리를 확인해보세요!`}
                url={customShareUrl || (currentTreeId ? `${window.location.origin}${window.location.pathname}?id=${currentTreeId}` : undefined)}
            />

            <AddTechniqueModal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setPendingConnection(null);
                }}
                lessons={allLessons}
                drills={allDrills}
                addedItems={nodes.map(n => ({
                    id: n.data.contentId || '',
                    type: n.data.contentType || 'technique'
                }))}
                onAddContent={(items) => {
                    const targetGroupId = (window as any)._targetGroupId;
                    handleAddContent(items, undefined, targetGroupId);
                    (window as any)._targetGroupId = null;
                }}
            />

            {/* Video Preview Modal */}
            {
                videoModal.isOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setVideoModal({ ...videoModal, isOpen: false })}>
                        <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between p-4 bg-zinc-900 border-b border-zinc-800">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Video className="w-5 h-5 text-violet-500" />
                                    {videoModal.title}
                                </h3>
                                <button
                                    onClick={() => setVideoModal({ ...videoModal, isOpen: false })}
                                    className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="relative aspect-video bg-black">
                                {videoModal.url ? (
                                    <iframe
                                        src={(() => {
                                            const url = videoModal.url || '';

                                            // 1. YouTube Handling
                                            const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
                                            const ytMatch = url.match(ytRegExp);
                                            if (ytMatch && ytMatch[2].length === 11) {
                                                return `https://www.youtube.com/embed/${ytMatch[2]}?autoplay=1&rel=0`;
                                            }

                                            // 2. Vimeo Handling
                                            // Matches: vimeo.com/123456789, vimeo.com/123456789/abcdef123, manage/videos/123456789
                                            const vimeoRegExp = /(?:vimeo\.com\/|player\.vimeo\.com\/video\/|manage\/videos\/|(?:\/))([0-9]+)(?:\/)?([a-z0-9]+)?/;
                                            const vimeoMatch = url.match(vimeoRegExp);

                                            if (vimeoMatch) {
                                                const videoId = vimeoMatch[1];
                                                const hash = vimeoMatch[2];
                                                let embedUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&badge=0&autopause=0`;
                                                if (hash) embedUrl += `&h=${hash}`;
                                                return embedUrl;
                                            }

                                            // 3. Pure Numeric ID (Vimeo)
                                            if (/^\d+$/.test(url)) {
                                                return `https://player.vimeo.com/video/${url}?autoplay=1&badge=0&autopause=0`;
                                            }

                                            // Fallback
                                            return url;
                                        })()}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-500">
                                        영상을 불러올 수 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* FAB for List Mode Only */}
            {viewMode === 'list' && (
                <div className={`fixed right-8 z-[120] flex flex-col items-end gap-3 transition-all duration-300 bottom-24`}>
                    <AnimatePresence>
                        {isFabOpen && (
                            <div className="flex flex-col items-end gap-3 mb-2">
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, x: 20 }}
                                    onClick={() => {
                                        setIsAddModalOpen(true);
                                        setIsFabOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-5 py-3 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-zinc-300 hover:text-white shadow-2xl hover:bg-zinc-800 transition-all group"
                                >
                                    <span className="text-[12px] font-bold">콘텐츠 추가하기</span>
                                    <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all">
                                        <FilePlus className="w-4 h-4" />
                                    </div>
                                </motion.button>
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.5, x: 20 }}
                                    animate={{ opacity: 1, scale: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.5, x: 20 }}
                                    transition={{ delay: 0.05 }}
                                    onClick={() => {
                                        handleAddMenu();
                                        setIsFabOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-5 py-3 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-2xl text-zinc-300 hover:text-white shadow-2xl hover:bg-zinc-800 transition-all group"
                                >
                                    <span className="text-[12px] font-bold">메뉴 추가하기</span>
                                    <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </motion.button>
                            </div>
                        )}
                    </AnimatePresence>
                    <button
                        onClick={() => setIsFabOpen(!isFabOpen)}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.4)] transition-all duration-500 ${isFabOpen ? 'bg-zinc-800 rotate-45' : 'bg-violet-600 hover:bg-violet-500 hover:scale-105 active:scale-95'
                            }`}
                    >
                        <Plus className={`w-8 h-8 text-white transition-transform ${isFabOpen ? 'rotate-0' : 'rotate-0'}`} />
                    </button>
                </div>
            )}
        </div>
    );
};
