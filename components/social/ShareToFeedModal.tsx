import React, { useState, useEffect } from 'react';
import { Share2, X, Loader, Zap } from 'lucide-react';

export interface ShareToFeedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (comment: string) => Promise<void>;
    activityType: 'routine' | 'sparring' | 'level_up' | 'title_earned' | 'technique' | 'general';
    defaultContent: string;
    metadata?: Record<string, any>;
}

const ACTIVITY_ICONS = {
    routine: <span className="text-violet-400 drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]">💪</span>,
    sparring: '🥋',
    level_up: '🎉',
    title_earned: '👑',
    technique: '🎯',
    general: '📝'
};

const ACTIVITY_LABELS = {
    routine: '훈련 루틴 완료',
    sparring: '스파링 복기',
    level_up: '레벨 업',
    title_earned: '칭호 획득',
    technique: '기술 마스터',
    general: '일반 소식'
};

const MAX_CHARACTERS = 500;

export const ShareToFeedModal: React.FC<ShareToFeedModalProps> = ({
    isOpen,
    onClose,
    onShare,
    activityType,
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
            setError('공유 중 오류가 발생했습니다. 다시 시도해주세요.');
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

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
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
                            <h2 className="text-lg font-bold text-zinc-100 tracking-tight">피드에 공유</h2>
                            <p className="text-xs text-zinc-500">
                                {ACTIVITY_ICONS[activityType]} {ACTIVITY_LABELS[activityType]}
                            </p>
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
                <div className="p-6 space-y-6">
                    {/* Input Area Group */}
                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 transition-all focus-within:border-violet-500/30 focus-within:bg-zinc-900/80">
                        <div className="flex gap-4">
                            {/* TextArea */}
                            <div className="flex-1">
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="오늘의 성과를 공유해보세요..."
                                    rows={4}
                                    className="w-full bg-transparent border-none text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-0 transition-all resize-none text-sm leading-relaxed"
                                    disabled={isSharing}
                                />

                                {/* Routine Preview (Mini-Card) inside input area if it's a routine */}
                                {activityType === 'routine' && (
                                    <div className="mt-3 flex items-center gap-3 p-2 bg-zinc-950/50 border border-zinc-800 rounded-xl group/preview">
                                        <div className="w-24 aspect-video bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden relative">
                                            {metadata?.thumbnailUrl ? (
                                                <img src={metadata.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Zap className="w-4 h-4 text-zinc-700" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[11px] font-bold text-zinc-300 truncate">
                                                {metadata?.routineTitle || '훈련 루틴'}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                {metadata?.xpEarned && (
                                                    <span className="text-[10px] text-violet-400 font-bold">+{metadata.xpEarned} XP</span>
                                                )}
                                                {metadata?.durationMinutes && (
                                                    <span className="text-[10px] text-zinc-500">{metadata.durationMinutes}분</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer info inside Input Area */}
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-800/50">
                            <p className="text-zinc-600 italic text-[11px]">
                                Tip: Cmd/Ctrl + Enter로 빠르게 공유
                            </p>
                            <p className={`text-[10px] font-mono ${isOverLimit ? 'text-red-400' : 'text-zinc-600'}`}>
                                {characterCount} / {MAX_CHARACTERS}
                            </p>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Preview Badge for other activities (Optional) */}
                    {metadata && activityType !== 'routine' && (
                        <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-4">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2 font-bold">미리보기</p>
                            <div className="flex items-center gap-2 text-sm text-zinc-300">
                                {metadata?.xpEarned !== undefined && (
                                    <span className="px-2 py-0.5 bg-violet-500/10 text-violet-400 rounded text-[10px] font-bold border border-violet-500/20">
                                        +{metadata.xpEarned} XP
                                    </span>
                                )}
                                {metadata?.durationMinutes !== undefined && (
                                    <span className="text-xs text-zinc-500">
                                        {metadata.durationMinutes}분
                                    </span>
                                )}
                                {metadata?.routineTitle && typeof metadata.routineTitle === 'string' && (
                                    <span className="text-xs text-zinc-400 truncate font-medium">
                                        {metadata.routineTitle}
                                    </span>
                                )}
                            </div>
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
};
