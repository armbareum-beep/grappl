import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader, Share2 } from 'lucide-react';

export interface ShareToFeedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (comment: string) => Promise<void>;
    activityType: 'routine' | 'sparring' | 'level_up' | 'title_earned' | 'technique' | 'general' | 'repost' | 'drill_reel';
    defaultContent: string;
    metadata?: Record<string, any>;
}

const MAX_CHARACTERS = 500;

export const ShareToFeedModal: React.FC<ShareToFeedModalProps> = ({
    isOpen,
    onClose,
    onShare,
    defaultContent,
    metadata
}) => {
    const [comment, setComment] = useState(defaultContent);
    const [isSharing, setIsSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset comment when modal opens or defaultContent changes
    useEffect(() => {
        if (isOpen) {
            setComment(defaultContent);
            setError(null);
        }
    }, [isOpen, defaultContent]);

    const handleShare = async () => {
        if (!comment.trim()) {
            setError('내용을 입력해주세요.');
            return;
        }

        if (comment.length > MAX_CHARACTERS) {
            setError(`최대 ${MAX_CHARACTERS}자까지 입력 가능합니다.`);
            return;
        }

        setIsSharing(true);
        setError(null);

        try {
            await onShare(comment);
            onClose();
        } catch (err) {
            console.error('Error sharing to feed:', err);
            setError('리포스트 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Cmd/Ctrl + Enter to share
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            handleShare();
        }
        // Escape to close
        if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    const characterCount = comment.length;
    const isOverLimit = characterCount > MAX_CHARACTERS;

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 bg-zinc-950/90 backdrop-blur-2xl rounded-[24px] border border-zinc-800 w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center border border-violet-500/20">
                            <Share2 className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">공유하기</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-zinc-100 transition-colors p-2 hover:bg-zinc-800/50 rounded-lg"
                        disabled={isSharing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Input Area Group */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 transition-all focus-within:border-violet-500/30 focus-within:bg-zinc-900/80">
                        <div className="flex gap-4">
                            {/* TextArea */}
                            <div className="flex-1">
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="공유와 함께 남길 생각을 적어보세요..."
                                    rows={3}
                                    className="w-full bg-transparent border-none text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-0 transition-all resize-none text-sm leading-relaxed"
                                    disabled={isSharing}
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Footer info inside Input Area */}
                        <div className="flex items-center justify-between mt-2 pt-3 border-t border-zinc-800/50">
                            <p className="text-zinc-600 italic text-[11px]">
                                Tip: Cmd/Ctrl + Enter로 공유하기
                            </p>
                            <p className={`text-[10px] font-mono ${isOverLimit ? 'text-red-400' : 'text-zinc-600'}`}>
                                {characterCount} / {MAX_CHARACTERS}
                            </p>
                        </div>
                    </div>

                    {/* Original Post Preview */}
                    {metadata && (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-[20px] p-4 flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <div className="w-5 h-5 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700">
                                        {metadata.userAvatar ? (
                                            <img src={metadata.userAvatar} className="w-full h-full object-cover" alt="" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-zinc-500 text-[8px] font-bold">
                                                {metadata.userName?.[0]}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-bold text-zinc-300">{metadata.userName}</span>
                                </div>
                                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed">
                                    {metadata.notes || '기술 영상 공유'}
                                </p>
                            </div>

                            {(metadata.mediaUrl || (metadata.images && metadata.images.length > 0)) && (
                                <div className="w-20 h-20 rounded-xl bg-zinc-800 overflow-hidden border border-zinc-700 flex-shrink-0">
                                    <img
                                        src={metadata.images?.[0] || metadata.mediaUrl}
                                        className="w-full h-full object-cover"
                                        alt="Preview"
                                        onError={(e) => {
                                            // Handle video thumbnails if possible, or show icon
                                            e.currentTarget.style.display = 'none';
                                            e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                            const icon = document.createElement('div');
                                            icon.innerHTML = '🎬';
                                            e.currentTarget.parentElement?.appendChild(icon);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800/50 bg-zinc-950/30">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-transparent text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-full text-sm font-medium transition-all"
                        disabled={isSharing}
                    >
                        취소
                    </button>
                    <button
                        onClick={handleShare}
                        className="relative overflow-hidden group px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-full text-sm font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        disabled={isSharing || isOverLimit}
                    >
                        <div className="flex items-center gap-2">
                            {isSharing ? (
                                <>
                                    <Loader className="w-4 h-4 animate-spin" />
                                    <span>공유 중...</span>
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-4 h-4" />
                                    <span>공유하기</span>
                                </>
                            )}
                        </div>
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                .animate-slide-up {
                    animation: slide-up 0.3s ease-out;
                }
            `}</style>
        </div>
    );

    return createPortal(modalContent, document.body);
};

