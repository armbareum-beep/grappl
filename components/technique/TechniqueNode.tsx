import React, { useEffect } from 'react';
import { UserTechniqueMastery, Technique, Lesson, Drill } from '../../types';
import { Handle, Position, useViewport, useUpdateNodeInternals } from 'reactflow';
import { motion } from 'framer-motion';

interface ContentNodeProps {
    id: string;
    data: {
        contentType?: 'technique' | 'lesson' | 'drill';
        contentId?: string;
        technique?: Technique;
        lesson?: Lesson & { course?: { title: string; category?: string } };
        drill?: Drill;
        mastery?: UserTechniqueMastery;
        isCompleted?: boolean;
        isGroupingSelected?: boolean;
        isGroupingInitial?: boolean;
        mode?: 'skill-tree' | 'roadmap';
        isPreview?: boolean;
        isInProgress?: boolean;
    };
    selected?: boolean;
    isConnectable?: boolean;
}

export const TechniqueNode: React.FC<ContentNodeProps> = ({ id, data, selected, isConnectable }) => {
    const { zoom } = useViewport();
    const updateNodeInternals = useUpdateNodeInternals();
    const { mastery, lesson, drill, isCompleted, technique, isGroupingSelected, isGroupingInitial, mode, isPreview } = data;
    const title = lesson?.title || drill?.title || technique?.name || 'Unknown';

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, zoom, updateNodeInternals]);

    const getStatusStyle = () => {
        // 1. Initial / Locked State (White/Zinc Theme)
        let style = {
            bgClass: 'bg-zinc-900/60',
            borderClass: 'border-white',
            ringClass: 'ring-transparent',
            pulseClass: '',
            textClass: 'text-white'
        };

        const isMastered = (mastery && mastery.masteryLevel >= 5) || isCompleted;
        const isInProgress = (mastery && mastery.masteryLevel >= 1) || data.isInProgress;

        // Apply Preview Overrides
        if (isPreview) {
            const isEven = parseInt(id.replace(/\D/g, '') || '0') % 2 === 0;
            const isThree = parseInt(id.replace(/\D/g, '') || '0') % 3 === 0;
            if (isEven) {
                // Completed
                style = {
                    bgClass: 'bg-violet-600/20',
                    borderClass: 'border-violet-500',
                    ringClass: 'ring-violet-400',
                    pulseClass: 'roadmap-node-glow',
                    textClass: 'text-violet-100'
                };
            } else if (isThree) {
                // In Progress
                style = {
                    bgClass: 'bg-violet-400/5',
                    borderClass: 'border-violet-400/50',
                    ringClass: 'ring-violet-400/20',
                    pulseClass: 'roadmap-node-flow',
                    textClass: 'text-violet-200'
                };
            }
            return style;
        }

        // 2. Determine Appearance based on Status
        if (isMastered) {
            style = {
                bgClass: 'bg-violet-600/20',
                borderClass: 'border-violet-500',
                ringClass: 'ring-violet-400',
                pulseClass: mode === 'roadmap' ? 'roadmap-node-glow' : 'animate-violet-pulse',
                textClass: 'text-violet-100'
            };
        } else if (isInProgress) {
            style = {
                bgClass: 'bg-violet-400/5',
                borderClass: 'border-violet-400/50',
                ringClass: 'ring-violet-400/20',
                pulseClass: mode === 'roadmap' ? 'roadmap-node-flow' : '',
                textClass: 'text-violet-200'
            };
        }

        // 3. Apply Grouping Overrides (Keep BG, change Border/Ring)
        if (isGroupingSelected) {
            style.borderClass = 'border-white';
            style.textClass = 'text-white';
            style.ringClass = selected
                ? 'ring-[3px] ring-white ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.6)]'
                : 'ring-2 ring-white';
            if (isGroupingInitial) style.pulseClass = 'animate-pulse';
        }

        // 4. Mode Overrides (Skill Tree Mode) - Always white
        if (mode === 'skill-tree') {
            style = {
                bgClass: 'bg-zinc-900',
                borderClass: 'border-white',
                ringClass: 'ring-transparent',
                pulseClass: '',
                textClass: 'text-white'
            };
        }

        return style;
    };
    const style = getStatusStyle();
    const isMinimal = zoom < 0.3;

    return (
        <div
            className={`
                relative h-12 flex items-center justify-center
                min-w-[160px] max-w-[300px]
                cursor-pointer
            `}
        >
            {/* Connection Handles */}
            {/* Connection Handles: Full Perimeter */}
            {/* Connection Handles: Narrow perimeter to allow internal dragging */}
            <Handle type="target" position={Position.Left} id="target-l" isConnectable={isConnectable} className="!w-[10px] !h-[80%] !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '-10px', top: '10%', transform: 'none' }} />
            <Handle type="source" position={Position.Left} id="source-l" isConnectable={isConnectable} className="!w-[10px] !h-[80%] !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '-10px', top: '10%', transform: 'none' }} />

            <Handle type="target" position={Position.Right} id="target-r" isConnectable={isConnectable} className="!w-[10px] !h-[80%] !bg-transparent !border-none z-[90] !pointer-events-none" style={{ right: '-10px', top: '10%', transform: 'none' }} />
            <Handle type="source" position={Position.Right} id="source-r" isConnectable={isConnectable} className="!w-[10px] !h-[80%] !bg-transparent !border-none z-[100] !pointer-events-none" style={{ right: '-10px', top: '10%', transform: 'none' }} />

            <Handle type="target" position={Position.Top} id="target-t" isConnectable={isConnectable} className="!w-[80%] !h-[10px] !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '10%', top: '-10px', transform: 'none' }} />
            <Handle type="source" position={Position.Top} id="source-t" isConnectable={isConnectable} className="!w-[80%] !h-[10px] !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '10%', top: '-10px', transform: 'none' }} />

            <Handle type="target" position={Position.Bottom} id="target-b" isConnectable={isConnectable} className="!w-[80%] !h-[10px] !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '10%', bottom: '-10px', transform: 'none' }} />
            <Handle type="source" position={Position.Bottom} id="source-b" isConnectable={isConnectable} className="!w-[80%] !h-[10px] !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '10%', bottom: '-10px', transform: 'none' }} />

            {/* PILL BODY */}
            <motion.div
                whileHover={!isMinimal ? { scale: 1.02 } : {}}
                className={`
                    absolute inset-0 rounded-full
                    ${style.bgClass} backdrop-blur-md
                    border ${style.borderClass}
                    flex items-center justify-center px-6
                    ${selected
                        ? mode === 'skill-tree'
                            ? 'ring-[3px] ring-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.6)] z-20 scale-105'
                            : 'ring-[3px] ring-white shadow-[0_0_30px_rgba(255,255,255,0.6)] z-20 scale-105'
                        : isGroupingSelected
                            ? `shadow-[0_0_30px_rgba(255,255,255,0.6)] ${style.ringClass} z-20`
                            : `shadow-xl ${style.ringClass}`
                    }
                    transition-all duration-300
                    z-10
                    !cursor-pointer
                `}
            >
                {/* Title */}
                <span className={`
                    ${style.textClass} text-sm font-bold truncate text-center
                    ${isMinimal ? 'opacity-0' : 'opacity-100'} transition-opacity
                    select-none
                `}>
                    {title}
                </span>
            </motion.div>

            {/* Mastered Pulse Overlay */}
            {style.pulseClass && !isMinimal && (
                <div className={`absolute inset-0 rounded-full ${style.pulseClass} z-0`}>
                    <div className="absolute inset-0 rounded-full bg-violet-400/10 blur-xl"></div>
                </div>
            )}

            {/* Mastery Badge */}
            {mastery && !isMinimal && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-zinc-950 border border-violet-500/50 flex items-center justify-center shadow-lg z-30">
                    <span className="text-[10px] font-bold text-violet-400">
                        {mastery.masteryLevel}
                    </span>
                </div>
            )}
        </div>
    );
};
