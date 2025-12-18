import React, { useState, useEffect } from 'react';
import { Share2, X, Loader } from 'lucide-react';
import { Button } from '../Button';

export interface ShareToFeedModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (comment: string) => Promise<void>;
    activityType: 'routine' | 'sparring' | 'level_up' | 'title_earned' | 'technique' | 'general';
    defaultContent: string;
    metadata?: Record<string, any>;
}

const ACTIVITY_ICONS = {
    routine: '💪',
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
            <div className="relative z-10 bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-lg shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">피드에 공유</h2>
                            <p className="text-xs text-slate-400">
                                {ACTIVITY_ICONS[activityType]} {ACTIVITY_LABELS[activityType]}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                        disabled={isSharing}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Textarea */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            공유할 내용을 작성하세요
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="오늘의 성과를 공유해보세요..."
                            rows={6}
                            className={`w-full px-4 py-3 bg-slate-800 border rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all resize-none ${isOverLimit
                                ? 'border-red-500 focus:ring-red-500'
                                : 'border-slate-700 focus:ring-blue-500'
                                }`}
                            disabled={isSharing}
                        />

                        {/* Character Count */}
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-500">
                                Tip: Cmd/Ctrl + Enter로 빠르게 공유
                            </p>
                            <p
                                className={`text-xs font-medium ${isOverLimit ? 'text-red-400' : 'text-slate-400'
                                    }`}
                            >
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

                    {/* Preview Badge (Optional) */}
                    {metadata && (
                        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                            <p className="text-xs text-slate-400 mb-1">미리보기</p>
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                                {metadata?.xpEarned !== undefined && (
                                    <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-xs font-bold">
                                        +{metadata.xpEarned} XP
                                    </span>
                                )}
                                {metadata?.durationMinutes !== undefined && (
                                    <span className="text-xs text-slate-400">
                                        {metadata.durationMinutes}분
                                    </span>
                                )}
                                {metadata?.routineTitle && typeof metadata.routineTitle === 'string' && (
                                    <span className="text-xs text-slate-400 truncate">
                                        {metadata.routineTitle}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-800">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                        disabled={isSharing}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleShare}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        disabled={isSharing || isOverLimit}
                    >
                        {isSharing ? (
                            <>
                                <Loader className="w-4 h-4 mr-2 animate-spin" />
                                공유 중...
                            </>
                        ) : (
                            <>
                                <Share2 className="w-4 h-4 mr-2" />
                                공유하기
                            </>
                        )}
                    </Button>
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
