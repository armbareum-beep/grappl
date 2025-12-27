import React from 'react';
import { UserTechniqueMastery, Technique, Lesson, Drill } from '../../types';
import { Handle, Position } from 'reactflow';

interface ContentNodeProps {
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
}

export const TechniqueNode: React.FC<ContentNodeProps> = ({ data, selected }) => {
    const { technique, mastery, lesson, drill, isCompleted } = data;
    const title = lesson?.title || drill?.title || technique?.name || 'Unknown';
    const thumbnailUrl = lesson?.thumbnailUrl || drill?.thumbnailUrl;

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

    return (
        <div
            className={`
                relative w-24 h-24 rounded-full 
                ${style.bgClass} 
                border-4 ${style.borderClass}
                ${selected ? 'ring-4 ring-blue-500 scale-110 shadow-2xl shadow-blue-500/30' : ''}
                backdrop-blur-sm
                transition-all duration-300
                hover:scale-105 hover:shadow-xl hover:shadow-blue-500/20
                cursor-pointer
                flex items-center justify-center
            `}
            onClick={data.onClick}
        >
            {/* Connection handles */}
            <Handle
                type="source"
                position={Position.Top}
                id="source-top"
                className="w-3 h-3 !bg-blue-500 !border-2 !border-slate-900"
            />
            <Handle
                type="target"
                position={Position.Bottom}
                id="target-bottom"
                className="w-3 h-3 !bg-yellow-500 !border-2 !border-slate-900"
            />
            <Handle
                type="target"
                position={Position.Left}
                id="target-left"
                className="w-3 h-3 !bg-yellow-500 !border-2 !border-slate-900"
            />
            <Handle
                type="target"
                position={Position.Right}
                id="target-right"
                className="w-3 h-3 !bg-yellow-500 !border-2 !border-slate-900"
            />

            {/* Content (Thumbnail or Icon) */}
            <div className="w-[calc(100%-4px)] h-[calc(100%-4px)] overflow-hidden rounded-full flex items-center justify-center p-0.5">
                {renderContent()}
            </div>

            {/* Mastery level badge */}
            {mastery && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-slate-900 border-2 border-blue-400 flex items-center justify-center shadow-lg z-20">
                    <span className="text-xs font-black text-blue-300">
                        {mastery.masteryLevel}
                    </span>
                </div>
            )}

            {/* Completion badge for course/drill */}
            {isCompleted && (
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center shadow-lg z-20">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}

            {/* Technique name label - Improved wrapping and width */}
            <div className={`
                absolute -bottom-12 left-1/2 transform -translate-x-1/2 
                px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/50 
                backdrop-blur-md shadow-2xl z-20
                text-[11px] font-black text-center leading-tight 
                w-max min-w-[100px] max-w-[160px]
                transition-all duration-300
                ${selected ? 'text-blue-300 border-blue-500/50 scale-110' : 'text-slate-200'}
            `}>
                <div className="line-clamp-2">{title}</div>
            </div>
        </div>
    );
};
