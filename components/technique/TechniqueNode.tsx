import React, { useEffect } from 'react';
import { UserTechniqueMastery, Technique, Lesson, Drill } from '../../types';
import { Handle, Position, useViewport, useUpdateNodeInternals } from 'reactflow';
import { useNavigate } from 'react-router-dom';

interface ContentNodeProps {
    id: string; // Add ID for updateNodeInternals
    data: {
        contentType?: 'technique' | 'lesson' | 'drill';
        contentId?: string;
        technique?: Technique;
        lesson?: Lesson & { course?: { title: string; category?: string } };
        drill?: Drill;
        mastery?: UserTechniqueMastery;
        isCompleted?: boolean;
        onClick?: () => void;
    };
    selected?: boolean;
    isConnectable?: boolean;
}

export const TechniqueNode: React.FC<ContentNodeProps> = ({ id, data, selected, isConnectable }) => {
    const navigate = useNavigate();
    const { zoom } = useViewport();
    const updateNodeInternals = useUpdateNodeInternals();
    const { technique, mastery, lesson, drill, isCompleted } = data;
    const title = lesson?.title || drill?.title || technique?.name || 'Unknown';
    const thumbnailUrl = lesson?.thumbnailUrl || drill?.thumbnailUrl;

    // Force update handles on mount and zoom change to ensure React Flow knows where they are
    useEffect(() => {
        updateNodeInternals(id);
    }, [id, zoom, updateNodeInternals]);

    const handleTitleClick = (e: React.MouseEvent) => {
        // Smart Zoom Interaction:
        // If zoomed out (< 0.7), behave as Node Click (Select/Connect) by bubbling the event
        if (zoom < 0.7) {
            return;
        }

        e.stopPropagation();
        if (!data.contentId) return;

        // Determine path based on content type
        // Note: 'lesson' usually belongs to a course, so we link to the course detail
        // but if we had lesson detail, we'd go there. Currently assuming Lesson -> Course
        const path = data.contentType === 'lesson'
            ? `/courses/${data.lesson?.courseId}` // We need courseId. Check if lesson object spans it.
            // If lesson object inside data has courseId, use it.
            // data.lesson is type Lesson. Lesson has courseId.
            : data.contentType === 'drill' ? `/drills/${data.contentId}`
                : `/technique/${data.contentId}`;

        // Fallback for lesson if we can't find courseId easily (though data.lesson should have it)
        if (data.contentType === 'lesson' && data.lesson?.courseId) {
            navigate(`/courses/${data.lesson.courseId}`);
        } else {
            // Default fallback
            navigate(path);
        }
    };

    // Determine node status based on mastery level or completion
    const getNodeStyle = () => {
        // Mastered or Completed
        if ((mastery && mastery.masteryLevel >= 5) || isCompleted) {
            return {
                bgClass: 'bg-yellow-500/20',
                borderClass: 'border-yellow-400',
                textClass: 'text-yellow-300',
                iconClass: 'opacity-100 shadow-[0_0_15px_rgba(250,204,21,0.3)]'
            };
        }

        // In progress
        if ((mastery && mastery.masteryLevel >= 2)) {
            return {
                bgClass: 'bg-blue-500/10',
                borderClass: 'border-blue-400',
                textClass: 'text-blue-300',
                iconClass: 'opacity-100'
            };
        }

        // Not started / Learning started
        if (!mastery) {
            return {
                bgClass: 'bg-slate-900/50',
                borderClass: 'border-slate-700',
                textClass: 'text-slate-400',
                iconClass: 'opacity-100' // Changed from grayscale/low-opacity to full visibility
            };
        }

        // Just started
        return {
            bgClass: 'bg-slate-800/50',
            borderClass: 'border-slate-600',
            textClass: 'text-slate-400',
            iconClass: 'opacity-100'
        };
    };

    const style = getNodeStyle();

    // Get category icon or thumbnail
    const renderContent = () => {
        if (thumbnailUrl) {
            return (
                <img
                    src={thumbnailUrl}
                    alt={title}
                    className={`w-full h-full object-cover rounded-full transition-all duration-300 ${style.iconClass}`}
                />
            );
        }

        const icons: Record<string, string> = {
            'Standing': '🥋',
            'Guard': '🛡️',
            'Guard Pass': '⚔️',
            'Side': '🔄',
            'Mount': '⛰️',
            'Back': '🎯'
        };
        const category = technique?.category || lesson?.course?.category || (drill?.category as string);
        return <div className={`text-3xl transition-all duration-300 ${style.iconClass}`}>{icons[category || ''] || '🥋'}</div>;
    };

    // Calculate dynamic scale for label to keep it readable
    // Inverse scaling with dampening: As zoom decreases, scale increases but Slower than zoom
    // This creates a "depth" effect where text gets smaller as you zoom out, but remains readable longer than nodes
    // We also cap it at 2.5x so it doesn't cover everything at deep zoom
    const labelScale = Math.max(0.8, Math.min(1.2 / Math.sqrt(zoom), 2.5));
    const isMinimal = zoom < 0.3; // Hide detailed styling only when very far away

    return (
        <div
            className={`
                relative w-24 h-24 rounded-full
                flex items-center justify-center
                ${isMinimal ? '' : 'filter drop-shadow-lg'}
                ${!isMinimal ? 'hover:drop-shadow-xl' : ''}
                ${zoom < 0.7 ? 'cursor-crosshair' : 'cursor-pointer'}
            `}
            onClick={data.onClick}
        >
            {/* Connection handles - 12 Directions (Small 4px for Gapless Rim) */}
            {/* 12 o'clock (Top) */}
            <Handle type="source" position={Position.Top} id="source-t" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '50%', top: '0%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Top} id="target-t" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '50%', top: '0%', transform: 'translate(-50%, -50%)' }} />

            {/* 1 o'clock */}
            <Handle type="source" position={Position.Right} id="s-1" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '75%', top: '6.7%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Right} id="t-1" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '75%', top: '6.7%', transform: 'translate(-50%, -50%)' }} />

            {/* 2 o'clock */}
            <Handle type="source" position={Position.Right} id="source-tr" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '93.3%', top: '25%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Right} id="target-tr" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '93.3%', top: '25%', transform: 'translate(-50%, -50%)' }} />

            {/* 3 o'clock */}
            <Handle type="source" position={Position.Right} id="source-r" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '100%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Right} id="target-r" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '100%', top: '50%', transform: 'translate(-50%, -50%)' }} />

            {/* 4 o'clock */}
            <Handle type="source" position={Position.Right} id="source-br" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '93.3%', top: '75%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Right} id="target-br" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '93.3%', top: '75%', transform: 'translate(-50%, -50%)' }} />

            {/* 5 o'clock */}
            <Handle type="source" position={Position.Right} id="s-5" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '75%', top: '93.3%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Right} id="t-5" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '75%', top: '93.3%', transform: 'translate(-50%, -50%)' }} />

            {/* 6 o'clock */}
            <Handle type="source" position={Position.Bottom} id="source-b" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Bottom} id="target-b" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '50%', top: '100%', transform: 'translate(-50%, -50%)' }} />

            {/* 7 o'clock */}
            <Handle type="source" position={Position.Left} id="s-7" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '25%', top: '93.3%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Left} id="t-7" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '25%', top: '93.3%', transform: 'translate(-50%, -50%)' }} />

            {/* 8 o'clock */}
            <Handle type="source" position={Position.Left} id="source-bl" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '6.7%', top: '75%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Left} id="target-bl" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '6.7%', top: '75%', transform: 'translate(-50%, -50%)' }} />

            {/* 9 o'clock */}
            <Handle type="source" position={Position.Left} id="source-l" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Left} id="target-l" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '0%', top: '50%', transform: 'translate(-50%, -50%)' }} />

            {/* 10 o'clock */}
            <Handle type="source" position={Position.Left} id="source-tl" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '6.7%', top: '25%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Left} id="target-tl" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '6.7%', top: '25%', transform: 'translate(-50%, -50%)' }} />

            {/* 11 o'clock */}
            <Handle type="source" position={Position.Left} id="s-11" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[100] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '25%', top: '6.7%', transform: 'translate(-50%, -50%)' }} />
            <Handle type="target" position={Position.Left} id="t-11" isConnectable={!isMinimal && isConnectable} className={`!w-4 !h-4 !bg-transparent !border-none z-[90] ${isMinimal ? 'invisible pointer-events-none' : 'pointer-events-auto'}`} style={{ left: '25%', top: '6.7%', transform: 'translate(-50%, -50%)' }} />


            {/* YELLOW RING (Visual Border) */}
            <div
                className={`
                    absolute inset-0 rounded-full
                    ${isMinimal ? '' : 'border-[6px] border-yellow-400'}
                    ${selected ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-slate-900' : ''}
                    ${isMinimal ? 'bg-transparent' : style.bgClass}
                    transition-all duration-300
                    overflow-hidden
                    z-10
                `}
            >
                {/* Content (Thumbnail or Icon) */}
                <div className={`w-full h-full flex items-center justify-center overflow-hidden rounded-full ${isMinimal ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
                    {renderContent()}
                </div>
            </div>

            {/* Mastery level badge */}
            {mastery && !isMinimal && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-blue-400 flex items-center justify-center shadow-lg z-20">
                    <span className="text-xs font-black text-blue-300">
                        {mastery.masteryLevel}
                    </span>
                </div>
            )}

            {/* Completion badge for course/drill */}
            {isCompleted && !isMinimal && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center shadow-lg z-20">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {/* Technique name label - Same styling for both modes, just scaled */}
            <div
                onClick={handleTitleClick}
                style={{
                    transform: isMinimal
                        ? `translate(-50%, -50%) scale(${labelScale})`
                        : `translate(-50%, 0) scale(${labelScale})`,
                    transformOrigin: 'center center',
                    top: isMinimal ? '50%' : 'auto',
                    opacity: zoom < 0.04 ? 0 : 1
                }}
                className={`
                    absolute ${!isMinimal ? '-bottom-16' : ''} left-1/2
                    px-4 py-2 w-max min-w-[120px] max-w-[200px]
                    rounded-xl bg-slate-950 border border-slate-700
                    shadow-xl z-20 hover:z-50
                    text-sm font-bold text-center leading-tight
                    transition-all duration-300
                    hover:border-blue-500 hover:text-blue-300
                    ${zoom < 0.7 ? 'cursor-crosshair' : 'cursor-pointer'}
                    ${selected ? 'text-blue-400 border-blue-500 ring-2 ring-blue-500/20' : 'text-slate-200'}
            `}>
                <div className="line-clamp-2">{title}</div>
            </div>
        </div>
    );
};