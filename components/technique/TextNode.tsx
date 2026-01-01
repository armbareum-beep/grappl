import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, useViewport } from 'reactflow';
import { motion } from 'framer-motion';

interface TextNodeData {
    label: string;
    onChange?: (data: any) => void;
    onDelete?: () => void;
}

export const TextNode: React.FC<NodeProps<TextNodeData>> = ({ data, selected, isConnectable }) => {
    const { zoom } = useViewport();
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(data.label || 'Text');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setText(data.label || 'Text');
    }, [data.label]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const handleBlur = () => {
        setIsEditing(false);
        if (data.onChange) {
            data.onChange({ label: text });
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleBlur();
        }
        if (e.key === 'Enter' && e.shiftKey) {
            // Allow shift+enter for new lines
        } else if (e.key === 'Enter') {
            handleBlur();
        }
    };

    const isMinimal = zoom < 0.3;

    return (
        <div
            className={`
                relative h-12 flex items-center justify-center
                min-w-[140px] max-w-[280px]
                cursor-pointer
            `}
        >
            {/* Horizontal Handles */}
            <Handle type="target" position={Position.Left} id="target-l" isConnectable={isConnectable} className="!w-4 !h-4 !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="source" position={Position.Left} id="source-l" isConnectable={isConnectable} className="!w-4 !h-4 !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' }} />

            <Handle type="target" position={Position.Right} id="target-r" isConnectable={isConnectable} className="!w-4 !h-4 !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '100%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="source" position={Position.Right} id="source-r" isConnectable={isConnectable} className="!w-4 !h-4 !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '100%', top: '50%', transform: 'translate(-50%, -50%)' }} />

            {/* Vertical Handles (12 and 6 o'clock) */}
            <Handle type="target" position={Position.Top} id="target-t" isConnectable={isConnectable} className="!w-2 !h-2 !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '50%', top: '0%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="source" position={Position.Top} id="source-t" isConnectable={isConnectable} className="!w-2 !h-2 !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '50%', top: '0%', transform: 'translate(-50%, -50%)' }} />

            <Handle type="target" position={Position.Bottom} id="target-b" isConnectable={isConnectable} className="!w-2 !h-2 !bg-transparent !border-none z-[90] !pointer-events-none" style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="source" position={Position.Bottom} id="source-b" isConnectable={isConnectable} className="!w-2 !h-2 !bg-transparent !border-none z-[100] !pointer-events-none" style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }} />

            {/* PILL BODY */}
            <motion.div
                onDoubleClick={() => setIsEditing(true)}
                whileHover={!isMinimal ? { scale: 1.05 } : {}}
                className={`
                    absolute inset-0 rounded-full
                    bg-zinc-900/60 backdrop-blur-md
                    border border-zinc-800
                    flex items-center justify-center px-5
                    ${selected
                        ? 'ring-2 ring-violet-500 shadow-[0_0_20px_rgba(124,58,237,0.3)] z-20'
                        : 'shadow-xl'
                    }
                    transition-all duration-300
                    overflow-hidden
                    z-10
                `}
            >
                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full bg-transparent text-sm font-bold text-zinc-100 text-center outline-none resize-none leading-tight overflow-hidden whitespace-normal break-words"
                        rows={2}
                    />
                ) : (
                    <span className={`
                        text-zinc-100 text-sm font-bold whitespace-normal break-words text-center px-2
                        ${isMinimal ? 'opacity-0' : 'opacity-100'} transition-opacity
                        select-none
                    `}>
                        {text}
                    </span>
                )}
            </motion.div>
        </div>
    );
};
