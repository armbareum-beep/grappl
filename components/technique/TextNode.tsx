import React, { useState, useEffect, useRef } from 'react';
import { Handle, Position, NodeProps, NodeResizer, useStore, ReactFlowState } from 'reactflow';
import { Trash2, Square, Circle } from 'lucide-react';

interface TextNodeData {
    label: string;
    style?: {
        backgroundColor?: string;
        color?: string; // Text Color
        width?: number;
        height?: number;
        fontSize?: string;
        shape?: 'rectangle' | 'rounded' | 'circle'; // Shape option
        borderStyle?: string;
    };
    onChange?: (data: any) => void;
    onDelete?: () => void;
}

const TEXT_COLORS = [
    '#ffffff', // White (Default)
    '#facc15', // Yellow
    '#60a5fa', // Blue
    '#f87171', // Red
    '#4ade80', // Green
    '#a855f7', // Purple
    '#94a3b8', // Gray
];

const zoomSelector = (s: ReactFlowState) => s.transform[2];

export const TextNode: React.FC<NodeProps<TextNodeData>> = ({ data, selected, id }) => {
    const zoom = useStore(zoomSelector);
    const [isEditing, setIsEditing] = useState(false);
    const [text, setText] = useState(data.label || 'Enter text...');

    // Style States
    const [color, setColor] = useState(data.style?.color || '#ffffff');
    const [shape, setShape] = useState<'rectangle' | 'rounded' | 'circle'>(data.style?.shape || 'rounded');

    // Size States
    const [width, setWidth] = useState(data.style?.width || 200);
    const [height, setHeight] = useState(data.style?.height || 100);

    // Font scale logic: increase font size as box grows (both width and height)
    // We base it on the smaller dimension to fit, but allow it to grow with width too.
    const fontSize = Math.max(12, Math.min(width / 4, height / 1.5));

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setText(data.label || 'Enter text...');
    }, [data.label]);

    useEffect(() => {
        if (data.style?.color) setColor(data.style.color);
        if (data.style?.shape) setShape(data.style.shape);
        if (data.style?.width) setWidth(data.style.width);
        if (data.style?.height) setHeight(data.style.height);
    }, [data.style]);

    useEffect(() => {
        if (isEditing && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [isEditing]);

    const updateData = (newText: string, newColor: string, newShape: 'rectangle' | 'rounded' | 'circle', newW: number, newH: number) => {
        if (data.onChange) {
            data.onChange({
                label: newText,
                style: {
                    color: newColor,
                    shape: newShape,
                    width: newW,
                    height: newH,
                    fontSize: `${Math.max(12, Math.min(newW / 4, newH / 1.5))}px`,
                    backgroundColor: 'transparent'
                }
            });
        }
    };

    const handleDoubleClick = () => {
        setIsEditing(true);
    };

    const handleBlur = () => {
        setIsEditing(false);
        updateData(text, color, shape, width, height);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleBlur();
        }
    };

    const handleColorChange = (c: string) => {
        setColor(c);
        updateData(text, c, shape, width, height);
    };

    const toggleShape = () => {
        const shapes: ('rectangle' | 'rounded' | 'circle')[] = ['rectangle', 'rounded', 'circle'];
        const nextIndex = (shapes.indexOf(shape) + 1) % shapes.length;
        const nextShape = shapes[nextIndex];
        setShape(nextShape);
        updateData(text, color, nextShape, width, height);
    };

    const getBorderRadius = () => {
        switch (shape) {
            case 'circle': return '50%';
            case 'rounded': return '12px';
            case 'rectangle': return '0px';
            default: return '12px';
        }
    };

    return (
        <div className="relative group" style={{ width, height }}>
            {selected && (
                <NodeResizer
                    color="#3b82f6"
                    isVisible={selected}
                    minWidth={50}
                    minHeight={30}
                    handleStyle={{ width: 12, height: 12, borderRadius: '50%' }}
                    lineStyle={{ borderWidth: 1 }}
                    onResize={(__, params) => {
                        setWidth(params.width);
                        setHeight(params.height);
                        updateData(text, color, shape, params.width, params.height);
                    }}
                />
            )}

            {/* Toolbar */}
            {selected && !isEditing && (
                <div
                    className="absolute left-1/2 transform -translate-x-1/2 bg-slate-800 rounded-lg border border-slate-700 shadow-xl p-1 flex gap-1 z-50 items-center origin-bottom"
                    style={{
                        // Counter-scale: 1 / zoom level to keep constant visual size
                        // Adjust translation to keep it above the node regardless of scale
                        bottom: '100%',
                        marginBottom: '10px',
                        transform: `translateX(-50%) scale(${1 / zoom})`,
                    }}
                >
                    {/* Shape Toggle */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleShape(); }}
                        className="w-8 h-8 rounded hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors border-r border-slate-700 mr-1"
                        title="모양 변경"
                    >
                        {shape === 'rectangle' && <div className="w-4 h-4 border-2 border-current" />}
                        {shape === 'rounded' && <div className="w-4 h-4 border-2 border-current rounded-md" />}
                        {shape === 'circle' && <div className="w-4 h-4 border-2 border-current rounded-full" />}
                    </button>

                    {/* Color Pickers */}
                    <div className="flex gap-1">
                        {TEXT_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={(e) => { e.stopPropagation(); handleColorChange(c); }}
                                className="w-6 h-6 rounded-full border border-slate-600 hover:scale-110 transition-transform flex items-center justify-center bg-slate-700"
                                title={c}
                            >
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                                {color === c && <div className="absolute w-2 h-2 bg-slate-900 rounded-full" />}
                            </button>
                        ))}
                    </div>

                    <div className="w-px h-6 bg-slate-700 mx-1" />

                    {/* Delete */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (data.onDelete) data.onDelete();
                        }}
                        className="w-6 h-6 rounded hover:bg-red-500/20 text-red-400 hover:text-red-500 flex items-center justify-center transition-colors"
                        title="삭제"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Content */}
            <div
                onDoubleClick={handleDoubleClick}
                className={`
                    w-full h-full overflow-hidden flex items-center justify-center text-center transition-all
                    ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900' : 'hover:ring-1 hover:ring-slate-500'}
                `}
                style={{
                    color: color,
                    borderRadius: getBorderRadius(),
                    backgroundColor: 'rgba(30, 41, 59, 0.5)', // Slate 800 with 50% opacity
                    border: '1px solid rgba(148, 163, 184, 0.2)' // Subtle border
                }}
            >
                {/* Handles */}
                <Handle type="target" position={Position.Top} className="opacity-0 w-full !bg-transparent !border-none" style={{ top: 0, height: '20%', zIndex: -1 }} />
                <Handle type="source" position={Position.Bottom} className="opacity-0 w-full !bg-transparent !border-none" style={{ bottom: 0, height: '20%', zIndex: -1 }} />
                <Handle type="target" position={Position.Left} className="opacity-0 h-full !bg-transparent !border-none" style={{ left: 0, width: '20%', zIndex: -1 }} />
                <Handle type="source" position={Position.Right} className="opacity-0 h-full !bg-transparent !border-none" style={{ right: 0, width: '20%', zIndex: -1 }} />

                {isEditing ? (
                    <textarea
                        ref={textareaRef}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        className="w-full h-full bg-transparent p-2 resize-none outline-none leading-tight font-bold text-center flex items-center justify-center"
                        style={{
                            fontSize: `${fontSize}px`,
                            color: color
                        }}
                    />
                ) : (
                    <div
                        className="p-2 w-full h-full flex items-center justify-center break-words whitespace-pre-wrap leading-tight select-none font-bold"
                        style={{
                            fontSize: `${fontSize}px`,
                            color: color
                        }}
                    >
                        {text}
                    </div>
                )}
            </div>
        </div>
    );
};
