import React, { memo, useCallback, useRef } from 'react';
import { NodeProps, Handle, Position, NodeResizer } from 'reactflow';
import { Minus, Layers } from 'lucide-react';

const GroupNode = ({ id, data, selected }: NodeProps) => {
    // expanded is strictly controlled by parent via data or defaults to true
    const isExpanded = data.expanded !== false;
    const inputRef = useRef<HTMLInputElement>(null);

    const handleLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
        data.onLabelChange?.(id, evt.target.value);
    }, [data, id]);

    const handleToggle = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        data.onToggleCollapse?.(id);
    }, [data, id]);

    return (
        <div
            className={`
                relative w-full h-full 
                transition-all duration-300 ease-in-out
                group
                ${selected ? '' : 'cursor-pointer'}
                ${isExpanded
                    ? 'rounded-[60px] bg-zinc-950/20 backdrop-blur-3xl border border-violet-500/40 shadow-[inset_0_0_20px_rgba(139,92,246,0.1)]' // Zone Mode
                    : 'rounded-full bg-violet-700 border-2 border-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.4)] cursor-pointer hover:scale-105 active:scale-95' // Capsule Mode (Bold Purple)
                }
                ${selected ? 'ring-[3px] ring-white ring-offset-4 ring-offset-zinc-950 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : ''}
            `}
            style={{ zIndex: -10 }}
            onClick={!isExpanded ? handleToggle : undefined}
            onDoubleClick={(e) => e.stopPropagation()}
        >
            {isExpanded && selected && (
                <NodeResizer
                    minWidth={240}
                    minHeight={180}
                    isVisible={selected}
                    lineClassName="invisible"
                    handleClassName="!w-16 !h-16 bg-transparent border-none shadow-none -translate-x-1/2 -translate-y-1/2 z-[150] cursor-nwse-resize"
                />
            )}
            {/* --- Zone Mode Content --- */}
            {isExpanded && (
                <>
                    {/* Interaction Overlay: Much larger inset (32px) to give handles plenty of room */}
                    {selected && (
                        <div className="absolute inset-12 z-[60] cursor-grab active:cursor-grabbing rounded-[40px] border border-white/5 bg-white/[0.02]" />
                    )}
                    {/* Header: Collapse Button & Title */}
                    <div
                        className={`
                            nodrag absolute -top-4 left-14 px-4 py-2
                            ${selected ? 'bg-violet-600 border-white' : 'bg-violet-950/90 border-violet-500/30'}
                            backdrop-blur-xl rounded-full border shadow-lg shadow-black/50
                            flex items-center gap-3 z-[100] pointer-events-auto transition-colors
                            group/header
                            cursor-pointer
                        `}
                    >
                        {/* Collapse Button */}
                        <div
                            className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer transition-colors nodrag"
                            onClick={handleToggle}
                        >
                            <Minus size={14} strokeWidth={3} />
                        </div>

                        {/* Title Input */}
                        <div className="h-6 flex items-center nodrag">
                            <input
                                ref={inputRef}
                                type="text"
                                defaultValue={data.label}
                                onChange={handleLabelChange}
                                readOnly={!selected}
                                className={`
                                    nodrag bg-transparent text-white font-bold text-sm outline-none border-none focus:ring-0 p-0 min-w-[100px]
                                    group-hover/header:cursor-pointer
                                    ${selected ? 'cursor-text pointer-events-auto' : 'cursor-pointer pointer-events-none'}
                                `}
                                placeholder="그룹 이름 입력"
                                onKeyDown={(e) => e.stopPropagation()}
                                onMouseDown={(e) => {
                                    // If already selected, stop propagation to allow text focus/selection
                                    // If not selected, let it bubble to select the node
                                    if (selected) e.stopPropagation();
                                }}
                            />
                        </div>
                    </div>
                </>
            )}

            {/* --- Capsule Mode Content --- */}
            {!isExpanded && (
                <div className="flex items-center gap-3 w-full h-full px-5 pointer-events-none">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-white shadow-inner">
                        <Layers size={16} />
                    </div>
                    <span className="font-bold text-white text-sm truncate flex-1">
                        {data.label || '새 그룹'}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white] animate-pulse" />
                </div>
            )}

            {/* --- Connection Handles: Strictly on the absolute border --- */}
            <Handle type="target" position={Position.Top} id="top"
                className="!w-[60%] !h-1 !top-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ left: '20%', transform: 'none' }} />
            <Handle type="source" position={Position.Top} id="top"
                className="!w-[60%] !h-1 !top-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ left: '20%', transform: 'none' }} />

            <Handle type="target" position={Position.Bottom} id="bottom"
                className="!w-[60%] !h-1 !bottom-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ left: '20%', transform: 'none' }} />
            <Handle type="source" position={Position.Bottom} id="bottom"
                className="!w-[60%] !h-1 !bottom-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ left: '20%', transform: 'none' }} />

            <Handle type="target" position={Position.Left} id="left"
                className="!w-1 !h-[50%] !left-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ top: '25%', transform: 'none' }} />
            <Handle type="source" position={Position.Left} id="left"
                className="!w-1 !h-[50%] !left-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ top: '25%', transform: 'none' }} />

            <Handle type="target" position={Position.Right} id="right"
                className="!w-1 !h-[50%] !right-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ top: '25%', transform: 'none' }} />
            <Handle type="source" position={Position.Right} id="right"
                className="!w-1 !h-[50%] !right-0 !bg-transparent !border-0 !rounded-none z-50 cursor-crosshair"
                style={{ top: '25%', transform: 'none' }} />
        </div>
    );
};

export default memo(GroupNode);
