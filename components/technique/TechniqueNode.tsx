import React, { useEffect } from 'react';
import { Technique, Lesson, Drill } from '../../types';
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
        isGroupingSelected?: boolean;
        isGroupingInitial?: boolean;
    };
    selected?: boolean;
    isConnectable?: boolean;
}

export const TechniqueNode: React.FC<ContentNodeProps> = ({ id, data, selected, isConnectable }) => {
    const { zoom } = useViewport();
    const updateNodeInternals = useUpdateNodeInternals();
    const { lesson, drill, technique, isGroupingSelected } = data;
    const title = lesson?.title || drill?.title || technique?.name || 'Unknown';

    useEffect(() => {
        updateNodeInternals(id);
    }, [id, zoom, updateNodeInternals]);

    const getStyle = () => {
        let style = {
            bgClass: 'bg-zinc-900',
            borderClass: 'border-white',
            ringClass: 'ring-transparent',
            textClass: 'text-white'
        };

        // Apply Grouping Overrides
        if (isGroupingSelected) {
            style.ringClass = selected
                ? 'ring-[3px] ring-white ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.6)]'
                : 'ring-2 ring-white';
        }

        return style;
    };

    const style = getStyle();
    const isMinimal = zoom < 0.3;

    return (
        <div
            className={`
                relative min-h-[3rem] h-auto flex items-center justify-center
                min-w-[160px] max-w-[300px]
                cursor-pointer
            `}
        >
            {/* Connection Handles */}
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
                    relative w-full min-h-[3rem] rounded-[24px]
                    ${style.bgClass} backdrop-blur-md
                    border ${style.borderClass}
                    flex items-center justify-center px-6
                    ${selected
                        ? 'ring-[3px] ring-white shadow-[0_0_30px_rgba(255,255,255,0.6)] z-20 scale-105'
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
                    ${style.textClass} text-sm font-bold text-center whitespace-pre-wrap break-words leading-tight py-2
                    ${isMinimal ? 'opacity-0' : 'opacity-100'} transition-opacity
                    select-none
                `}>
                    {title}
                </span>
            </motion.div>
        </div>
    );
};
