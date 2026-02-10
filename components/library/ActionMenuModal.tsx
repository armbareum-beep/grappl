import React from 'react';
import { X, Share2, Bookmark, PlayCircle, PlaySquare } from 'lucide-react';
import { cn } from '../../lib/utils';
import { UnifiedContentItem } from './UnifiedContentCard';

interface ActionMenuModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: UnifiedContentItem;
    isSaved: boolean;
    onSave: (e: React.MouseEvent) => void;
    onShare: (e: React.MouseEvent) => void;
}

export const ActionMenuModal: React.FC<ActionMenuModalProps> = ({
    isOpen,
    onClose,
    item,
    isSaved,
    onSave,
    onShare
}) => {
    if (!isOpen) return null;

    const PlayIcon = item.type === 'sparring' ? PlaySquare : PlayCircle;

    return (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative w-full md:max-w-md bg-zinc-900 border-t md:border border-zinc-800 rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
                {/* Header/Banner Area */}
                <div className="relative aspect-video w-full overflow-hidden">
                    <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        loading="lazy"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
                    <button
                        onClick={onClose}
                        aria-label="메뉴 닫기"
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Info */}
                <div className="p-6 pt-2">
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-2">
                            <PlayIcon className="w-4 h-4 text-violet-400" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">
                                {item.type === 'class' ? 'Lesson' : item.type === 'routine' ? 'Routine' : 'Sparring'}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 leading-tight">
                            {item.title}
                        </h2>
                        {item.creatorName && (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                                    {item.creatorProfileImage ? (
                                        <img src={item.creatorProfileImage} alt={item.creatorName} loading="lazy" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[8px] text-zinc-500 font-bold">
                                            {item.creatorName?.charAt(0)}
                                        </div>
                                    )}
                                </div>
                                <span className="text-sm text-zinc-400 font-medium">{item.creatorName}</span>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={onSave}
                            className={cn(
                                "flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all",
                                isSaved
                                    ? "bg-violet-600/20 border border-violet-500/50 text-violet-400"
                                    : "bg-zinc-800 border border-zinc-700 text-white hover:bg-zinc-750"
                            )}
                        >
                            <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
                            {isSaved ? '저장됨' : '저장하기'}
                        </button>

                        <button
                            onClick={onShare}
                            className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-zinc-800 border border-zinc-700 text-white font-bold hover:bg-zinc-750 transition-all"
                        >
                            <Share2 className="w-5 h-5" />
                            공유하기
                        </button>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-4 text-sm text-zinc-500 font-medium hover:text-zinc-300 transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};
