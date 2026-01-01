import React, { useState, useRef, useEffect } from 'react';
import { X, Image as ImageIcon, Hash, Globe, Sparkles, Plus, BookOpen, Link as LinkIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { TrainingLog } from '../../types';
import { TechniqueTagModal } from './TechniqueTagModal';
import { QuestCompleteModal } from '../QuestCompleteModal';
import { supabase } from '../../lib/supabase';

interface CreatePostModalProps {
    onClose: () => void;
    onPostCreated: (post: TrainingLog) => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ onClose, onPostCreated }) => {
    const { user } = useAuth();
    const { error: toastError } = useToast();
    const [content, setContent] = useState('');
    const [selectedTechniques, setSelectedTechniques] = useState<string[]>([]);
    const [addToJournal, setAddToJournal] = useState(true);
    const [showTechModal, setShowTechModal] = useState(false);
    const [mediaFiles, setMediaFiles] = useState<File[]>([]);
    const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showQuestComplete, setShowQuestComplete] = useState(false);
    const [questCompleteData, setQuestCompleteData] = useState<{ questName: string; xpEarned: number } | null>(null);
    const [userAvatar, setUserAvatar] = useState<string | null>(null);
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [showYoutubeInput, setShowYoutubeInput] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadUserAvatar();
    }, [user]);

    const loadUserAvatar = async () => {
        if (!user) return;

        try {
            const { data } = await supabase
                .from('users')
                .select('avatar_url')
                .eq('id', user.id)
                .single();

            if (data?.avatar_url) {
                setUserAvatar(data.avatar_url);
            }
        } catch (err) {
            console.error('Error loading user avatar:', err);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setMediaFiles(prev => [...prev, ...newFiles]);

            const newPreviews = newFiles.map(file => URL.createObjectURL(file));
            setMediaPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeFile = (index: number) => {
        setMediaFiles(prev => prev.filter((_, i) => i !== index));
        setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!content.trim() && mediaFiles.length === 0) return;
        if (!user) return;

        setIsSubmitting(true);

        try {
            const { createTrainingLog, updateQuestProgress } = await import('../../lib/api');

            // Ensure user exists using RPC (bypasses RLS issues)
            try {
                await supabase.rpc('ensure_user_for_post', {
                    p_user_id: user.id,
                    p_name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                    p_avatar_url: userAvatar || user.user_metadata?.avatar_url || null
                });
            } catch (rpcError) {
                console.warn('Failed to ensure user:', rpcError);
            }

            // Upload Images to Supabase Storage
            const uploadedUrls: string[] = [];

            for (const file of mediaFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `post-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('hero-images')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    continue;
                }

                const { data } = supabase.storage
                    .from('hero-images')
                    .getPublicUrl(fileName);

                if (data.publicUrl) {
                    uploadedUrls.push(data.publicUrl);
                }
            }

            // 1. Create Feed Log (Feed Post)
            const { data: newLog, error } = await createTrainingLog({
                userId: user.id,
                date: new Date().toISOString().split('T')[0],
                durationMinutes: -1, // Feed Post Marker
                techniques: selectedTechniques,
                sparringRounds: 0,
                notes: content,
                isPublic: true,
                location: `__FEED__`,
                mediaUrl: uploadedUrls[0],
                youtubeUrl: youtubeUrl || undefined,
                metadata: {
                    images: uploadedUrls
                }
            });

            if (error) throw error;

            // 2. Add to Journal (Private Log) if checked
            if (addToJournal) {
                await createTrainingLog({
                    userId: user.id,
                    date: new Date().toISOString().split('T')[0],
                    durationMinutes: 60, // Standard duration for log
                    techniques: selectedTechniques,
                    sparringRounds: 0,
                    notes: content,
                    isPublic: false,
                    mediaUrl: uploadedUrls[0],
                    youtubeUrl: youtubeUrl || undefined,
                    metadata: {
                        images: uploadedUrls,
                        source: 'feed_post'
                    }
                });
            }

            if (newLog) {
                const enrichedLog = {
                    ...newLog,
                    userName: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                    userAvatar: userAvatar || user.user_metadata?.avatar_url,
                    userBelt: user.user_metadata?.belt || 'White',
                    user: {
                        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
                        email: user.email || '',
                        belt: user.user_metadata?.belt || 'White',
                        profileImage: userAvatar || user.user_metadata?.avatar_url,
                        isInstructor: false
                    },
                    likes: 0,
                    comments: 0,
                    // Optimistic update for multiple images
                    metadata: {
                        images: mediaPreviews // Use previews immediately for smoother UX
                    }
                };

                const { xpEarned } = await updateQuestProgress(user.id, 'write_log');

                setQuestCompleteData({ questName: '수련 일지 작성', xpEarned: xpEarned || 0 });
                setShowQuestComplete(true);

                onPostCreated(enrichedLog);
            }

        } catch (error: any) {
            console.error('Error creating training log:', error);
            toastError(error.message || '일지 작성 중 오류가 발생했습니다.');
            setIsSubmitting(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-lg bg-zinc-900/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 ring-1 ring-white/5">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <h2 className="text-white font-bold text-lg tracking-tight flex items-center gap-2">
                        새 게시물
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/5"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
                    <div className="flex gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-slate-800 overflow-hidden flex-shrink-0 ring-2 ring-slate-800">
                            {userAvatar ? (
                                <img src={userAvatar} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold bg-slate-800">
                                    {user?.email?.[0].toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="text-white font-bold truncate">
                                    {user?.user_metadata?.name || user?.email?.split('@')[0]}
                                </span>
                                {user?.user_metadata?.belt && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 uppercase tracking-wide">
                                        {user.user_metadata.belt}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                                <div className="px-2 py-0.5 rounded-full bg-slate-800/50 border border-slate-700/50 flex items-center gap-1">
                                    <Globe className="w-3 h-3 text-slate-400" />
                                    <span className="text-xs text-slate-400 font-medium">전체 공개</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="오늘 수련은 어떠셨나요? 자유롭게 기록해보세요."
                        className="w-full bg-transparent text-slate-200 placeholder:text-slate-600 text-lg resize-none focus:outline-none min-h-[120px] leading-relaxed mb-4"
                        autoFocus
                    />

                    {/* YouTube Link Input */}
                    {showYoutubeInput && (
                        <div className="mb-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 focus-within:border-violet-500/50 focus-within:bg-slate-900 transition-all">
                                <LinkIcon className="w-5 h-5 text-red-500" />
                                <input
                                    type="text"
                                    value={youtubeUrl}
                                    onChange={(e) => setYoutubeUrl(e.target.value)}
                                    placeholder="YouTube 영상 링크를 붙여넣으세요"
                                    className="flex-1 bg-transparent border-none focus:outline-none text-slate-200 placeholder:text-slate-600 text-sm"
                                    autoFocus
                                />
                                <button
                                    onClick={() => {
                                        setYoutubeUrl('');
                                        setShowYoutubeInput(false);
                                    }}
                                    className="text-slate-500 hover:text-white"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Media Previews */}
                    {mediaPreviews.length > 0 && (
                        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                            {mediaPreviews.map((preview, idx) => (
                                <div key={idx} className="relative w-48 h-64 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-lg group">
                                    {mediaFiles[idx]?.type.startsWith('video') ? (
                                        <video src={preview} className="w-full h-full object-cover" />
                                    ) : (
                                        <img src={preview} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => removeFile(idx)}
                                            className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-md transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-64 flex-shrink-0 rounded-2xl border-2 border-dashed border-slate-800 hover:border-slate-600 hover:bg-slate-800/30 flex items-center justify-center transition-all group"
                            >
                                <Plus className="w-6 h-6 text-slate-600 group-hover:text-slate-400" />
                            </button>
                        </div>
                    )}

                    {/* Selected Techniques */}
                    {selectedTechniques.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2">
                            {selectedTechniques.map(tech => (
                                <span key={tech} className="px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-sm font-medium flex items-center gap-1.5 group">
                                    #{tech}
                                    <button
                                        onClick={() => setSelectedTechniques(prev => prev.filter(t => t !== tech))}
                                        className="text-violet-400/50 group-hover:text-violet-400 transition-colors"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Toolbar */}
                <div className="p-5 bg-[#161b22]/80 backdrop-blur-md border-t border-white/5">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 rounded-full text-violet-400 bg-violet-500/10 hover:bg-violet-500/20 transition-all group relative"
                                title="사진/영상 추가"
                            >
                                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <input
                                type="file"
                                multiple
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                            />
                            <button
                                onClick={() => setShowTechModal(true)}
                                className="p-2.5 rounded-full text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all group relative"
                                title="기술 태그"
                            >
                                <Hash className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                            <button
                                onClick={() => setShowYoutubeInput(!showYoutubeInput)}
                                className={`p-2.5 rounded-full transition-all group relative ${showYoutubeInput ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20' : 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'}`}
                                title="YouTube 링크"
                            >
                                <LinkIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                            </button>
                        </div>

                        {/* Journal Toggle */}
                        <button
                            onClick={() => setAddToJournal(!addToJournal)}
                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-2 ${addToJournal
                                ? 'bg-violet-500 border-violet-400 text-white shadow-[0_0_12px_rgba(124,58,237,0.3)]'
                                : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-400'
                                }`}
                        >
                            <BookOpen className={`w-3.5 h-3.5 transition-transform ${addToJournal ? 'scale-110' : 'scale-100 opacity-60'}`} />
                            <span>수련 일지에 기록</span>
                            <div className={`w-1.5 h-1.5 rounded-full transition-all ${addToJournal ? 'bg-white scale-100' : 'bg-slate-600 scale-50'}`} />
                        </button>
                    </div>

                    <button
                        onClick={handleSubmit}
                        disabled={!content.trim() && mediaFiles.length === 0 || isSubmitting}
                        className="w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-500/20 hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                게시 중...
                            </>
                        ) : (
                            <>
                                게시하기
                                <Sparkles className="w-4 h-4 ml-1 text-violet-200" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Technique Selector Modal */}
            {showTechModal && (
                <TechniqueTagModal
                    selectedTechniques={selectedTechniques}
                    onClose={() => setShowTechModal(false)}
                    onSelect={(techniques) => {
                        setSelectedTechniques(techniques);
                    }}
                />
            )}

            {/* Quest Complete Modal */}
            {showQuestComplete && questCompleteData && (
                <QuestCompleteModal
                    isOpen={showQuestComplete}
                    onClose={() => {
                        setShowQuestComplete(false);
                        onClose(); // Close the creation modal too
                    }}
                    questName={questCompleteData.questName}
                    xpEarned={questCompleteData.xpEarned}
                />
            )}
        </div>
    );
};
