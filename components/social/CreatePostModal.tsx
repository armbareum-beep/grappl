import React, { useState, useRef } from 'react';
import { X, Image as ImageIcon, Video, Hash, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TrainingLog } from '../../types';
import { Button } from '../Button';
import { TechniqueTagModal } from './TechniqueTagModal';

interface CreatePostModalProps {
    onClose: () => void;
    onPostCreated: (post: TrainingLog) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPostCreated }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
    const [addToJournal, setAddToJournal] = useState(true);
    const [showTechModal, setShowTechModal] = useState(false);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const url = URL.createObjectURL(file);
            setMediaPreview(url);
        }
    };

    const handleSubmit = async () => {
        if (!content.trim() && !mediaFile) return;
        if (!user) return;

        setIsSubmitting(true);

        try {
            const { createTrainingLog, updateQuestProgress, addXP } = await import('../../lib/api');

            // Create training log
            const { data: newLog, error } = await createTrainingLog({
                userId: user.id,
                date: new Date().toISOString().split('T')[0],
                durationMinutes: 0,
                techniques: selectedTechniques,
                sparringRounds: 0,
                notes: content,
                isPublic: true,
                youtubeUrl: mediaPreview || undefined
            });

            if (error) {
                alert(error.message || '일지 작성 중 오류가 발생했습니다.');
                setIsSubmitting(false);
                return;
            }

            if (newLog) {
                // Update quest progress
                const { completed, xpEarned } = await updateQuestProgress(user.id, 'write_log');

                if (completed && xpEarned > 0) {
                    alert(`일지가 작성되었습니다! +${xpEarned} XP`);
                } else {
                    alert('일지가 작성되었습니다!');
                }

                // Create post object for UI
                const newPost: TrainingLog = {
                    ...newLog,
                    user: {
                        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                        email: user.email || '',
                        profileImage: user.user_metadata?.avatar_url
                    }
                };

                onPostCreated(newPost);
            }
        } catch (error) {
            console.error('Error creating training log:', error);
            alert('일지 작성 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-800">
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <span className="text-sm">취소</span>
                    </button>
                    <h2 className="text-white font-bold">새 게시물</h2>
                    <div className="w-8"></div> {/* Spacer */}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <div className="text-white font-bold text-sm mb-1">
                                {user?.user_metadata?.name || user?.email?.split('@')[0]}
                            </div>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="무슨 생각을 하고 있나요?"
                                className="w-full bg-transparent text-white placeholder-slate-500 text-sm resize-none focus:outline-none min-h-[100px]"
                            />

                            {/* Media Preview */}
                            {mediaPreview && (
                                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-800">
                                    {mediaFile?.type.startsWith('video') ? (
                                        <video src={mediaPreview} className="w-full max-h-60 object-cover" controls />
                                    ) : (
                                        <img src={mediaPreview} alt="Preview" className="w-full max-h-60 object-cover" />
                                    )}
                                    <button
                                        onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {/* Selected Techniques */}
                            {selectedTechniques.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedTechniques.map(tech => (
                                        <span key={tech} className="px-2 py-1 rounded-full bg-blue-900/30 text-blue-400 text-xs font-medium flex items-center gap-1">
                                            #{tech}
                                            <button onClick={() => setSelectedTechniques(prev => prev.filter(t => t !== tech))}>
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-4">
                            <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-blue-500">
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <button onClick={() => setShowTechModal(true)} className="text-slate-400 hover:text-blue-500">
                                <Hash className="w-5 h-5" />
                            </button>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${addToJournal ? 'bg-blue-600' : 'bg-slate-700'}`}
                                onClick={() => setAddToJournal(!addToJournal)}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${addToJournal ? 'translate-x-4' : ''}`} />
                            </div>
                            <span className="text-xs text-slate-400">수련일지에도 기록</span>
                        </label>

                        <Button
                            onClick={handleSubmit}
                            disabled={!content.trim() && !mediaFile || isSubmitting}
                            className="rounded-full px-6"
                        >
                            {isSubmitting ? '게시 중...' : '게시하기'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Technique Modal */}
            {showTechModal && (
                <TechniqueTagModal
                    selectedTechniques={selectedTechniques}
                    onSelect={(techs) => setSelectedTechniques(techs)}
                    onClose={() => setShowTechModal(false)}
                />
            )}
        </div>
    );
};
