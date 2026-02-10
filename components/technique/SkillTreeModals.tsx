import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Save,
    FolderOpen,
    X,
    Globe,
    Lock,
    Trash2,
    Calendar,
    ChevronRight,
    UploadCloud,
    AlignLeft,
    Trophy,
    Camera,
    Hash,
    Layers,
    ArrowLeft,
    Network
} from 'lucide-react';
import { UserSkillTree } from '../../types';
export { ConfirmModal } from '../common/ConfirmModal';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface SaveData {
    title: string;
    isPublic: boolean;
    description?: string;
    difficulty?: string;
    tags?: string[];
    thumbnailUrl?: string; // If already uploaded or provided
}

// 1. Save Modal (Enhanced Wizard)
interface SaveModalProps extends ModalProps {
    title: string;
    onSave: (data: SaveData) => Promise<void>;
    initialTitle: string;
    initialIsPublic: boolean;
    isSaving: boolean;
    thumbnailPreview?: string; // Data URL of the snapshot
    onCaptureThumbnail?: () => void; // Trigger to capture snapshot
    mode?: 'save' | 'publish';
}

export const SaveModal: React.FC<SaveModalProps> = ({
    isOpen, onClose, onSave, initialTitle, initialIsPublic, isSaving, thumbnailPreview, onCaptureThumbnail, mode = 'save'
}) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [titleInput, setTitleInput] = useState(initialTitle);
    const [isPublic, setIsPublic] = useState(initialIsPublic);

    // Metadata State
    const [description, setDescription] = useState('');
    const [difficulty, setDifficulty] = useState('Intermediate');
    const [tags, setTags] = useState<string[]>([]);
    const [currentTag, setCurrentTag] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep(mode === 'publish' ? 2 : 1);
            setTitleInput(initialTitle);
            setIsPublic(mode === 'publish' ? true : initialIsPublic);
            // Reset metadata
            if (mode === 'publish' && !description) {
                setDescription('');
            }
        }
    }, [isOpen, initialTitle, initialIsPublic, mode]);

    // Effect to trigger capture when modal opens (any mode)
    useEffect(() => {
        if (isOpen && onCaptureThumbnail && !thumbnailPreview) {
            // Give a small delay for modal transition
            const timer = setTimeout(() => {
                onCaptureThumbnail();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen, onCaptureThumbnail, thumbnailPreview]);

    const handleAddTag = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && currentTag.trim()) {
            e.preventDefault();
            if (tags.length < 5 && !tags.includes(currentTag.trim())) {
                setTags([...tags, currentTag.trim()]);
                setCurrentTag('');
            }
        }
    };

    const handleSave = async () => {
        await onSave({
            title: titleInput,
            isPublic,
            description: isPublic ? description : undefined,
            difficulty: isPublic ? difficulty : undefined,
            tags: isPublic ? tags : undefined,
        });

        if (isPublic && mode === 'publish') {
            setStep(3); // Show success step for public upload
        } else {
            onClose(); // Just close for private save
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />

            <AnimatePresence mode="wait">
                {/* 
                    MODE: SAVE (Step 1)
                    Simple save dialog - primarily for private saving or basic public toggle
                */}
                {step === 1 && mode === 'save' && (
                    <motion.div
                        key="step1"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: -20 }}
                        className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl ring-1 ring-white/10"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[60px] rounded-full -mr-16 -mt-16" />

                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700">
                                    <Save className="w-6 h-6 text-zinc-300" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white leading-tight">저장하기</h3>
                                    <p className="text-zinc-500 text-sm font-medium">현재 상태를 내 보관함에 저장합니다</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block px-1">로드맵 이름</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={titleInput}
                                        onChange={(e) => setTitleInput(e.target.value)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700/50 focus:border-violet-500/50 focus:bg-zinc-800 rounded-2xl p-4 text-white font-bold outline-none transition-all focus:ring-4 focus:ring-violet-500/10 placeholder:text-zinc-600"
                                        placeholder="나만의 로드맵 이름을 입력하세요"
                                    />
                                </div>

                                <div>
                                    <div
                                        onClick={() => setIsPublic(!isPublic)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${isPublic
                                            ? 'bg-violet-600/10 border-violet-500/30'
                                            : 'bg-zinc-800/20 border-zinc-800 hover:bg-zinc-800/50'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {isPublic ? <Globe className="w-4 h-4 text-violet-400" /> : <Lock className="w-4 h-4 text-zinc-500" />}
                                            <div className="text-xs font-bold text-zinc-400">
                                                {isPublic ? '공개 모드로 저장' : '비공개(나만 보기)로 저장'}
                                            </div>
                                        </div>
                                        <div className={`w-8 h-4 rounded-full relative transition-colors ${isPublic ? 'bg-violet-500' : 'bg-zinc-700'}`}>
                                            <motion.div
                                                animate={{ x: isPublic ? 16 : 2 }}
                                                className="absolute top-1 left-0 w-2 h-2 bg-white rounded-full shadow-md"
                                            />
                                        </div>
                                    </div>
                                    {isPublic && (
                                        <p className="text-[10px] text-zinc-500 mt-2 px-1">
                                            * 공개 모드로 저장하면 나중에 피드에 공유할 수 있습니다.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-3 mt-10">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black text-sm rounded-2xl transition-all active:scale-95"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!titleInput.trim()}
                                    className={`flex-1 py-4 font-black text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isPublic
                                        ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-xl shadow-violet-900/20'
                                        : 'bg-zinc-200 hover:bg-white text-black'
                                        }`}
                                >
                                    <Save className="w-4 h-4" />
                                    {isSaving ? '저장 중...' : '저장하기'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 
                    MODE: PUBLISH (Step 2)
                    Feed sharing wizard
                */}
                {(step === 2 || mode === 'publish') && step !== 3 && step !== 1 && (
                    <motion.div
                        key="step2"
                        initial={{ opacity: 0, scale: 0.95, x: 20 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95, x: 20 }}
                        className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl ring-1 ring-white/10"
                    >
                        <div className="absolute top-0 left-0 w-32 h-32 bg-violet-500/20 blur-[60px] rounded-full -ml-16 -mt-16" />

                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
                                        <Network className="w-6 h-6 text-violet-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black text-white leading-tight">로드맵 게시하기</h3>
                                        <p className="text-zinc-500 text-xs md:text-sm font-medium">커뮤니티 피드에 공유하여 다른 사람들과 기술을 나누세요!</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-5 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                {/* Thumbnail Preview */}
                                <div className="relative w-full aspect-video bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden group">
                                    {thumbnailPreview ? (
                                        <img src={thumbnailPreview} alt="Preview" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-600">
                                            <Camera className="w-8 h-8 mb-2 animate-pulse" />
                                            <span className="text-xs font-bold">썸네일 생성 중...</span>
                                        </div>
                                    )}
                                    <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 rounded text-[10px] text-white font-bold backdrop-blur-sm">
                                        THUMBNAIL
                                    </div>
                                </div>

                                {/* Title */}
                                <div>
                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block px-1">
                                        <AlignLeft className="w-3 h-3 inline mr-1" />게시물 제목
                                    </label>
                                    <input
                                        type="text"
                                        value={titleInput}
                                        onChange={(e) => setTitleInput(e.target.value)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 py-3 text-white font-bold outline-none focus:border-violet-500/50"
                                    />
                                </div>

                                {/* Difficulty */}
                                <div>
                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block px-1">
                                        <Trophy className="w-3 h-3 inline mr-1" />난이도
                                    </label>
                                    <div className="flex gap-2">
                                        {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                                            <button
                                                key={lvl}
                                                onClick={() => setDifficulty(lvl)}
                                                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all ${difficulty === lvl
                                                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20'
                                                    : 'bg-zinc-800/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                                                    }`}
                                            >
                                                {lvl === 'Beginner' ? '입문자' : lvl === 'Intermediate' ? '숙련자' : '상급자'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Tags (Category Quick Select) */}
                                <div>
                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-3 block px-1">
                                        <Layers className="w-3 h-3 inline mr-1" /> 카테고리 (필수 선택)
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {['Standing', 'Guard', 'Passing', 'Side', 'Mount', 'Back'].map(cat => (
                                            <button
                                                key={cat}
                                                onClick={() => {
                                                    if (tags.includes(cat)) {
                                                        setTags(tags.filter(t => t !== cat));
                                                    } else {
                                                        if (tags.length < 5) setTags([...tags, cat]);
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border transition-all ${tags.includes(cat)
                                                    ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-600/20'
                                                    : 'bg-zinc-800/50 text-zinc-500 border-zinc-700/50 hover:border-zinc-500 hover:text-zinc-300'
                                                    }`}
                                            >
                                                {cat === 'Standing' ? 'Standing (스탠딩)' :
                                                    cat === 'Guard' ? 'Guard (가드)' :
                                                        cat === 'Passing' ? 'Passing (패싱)' :
                                                            cat === 'Side' ? 'Side (사이드)' :
                                                                cat === 'Mount' ? 'Mount (마운트)' :
                                                                    cat === 'Back' ? 'Back (백)' : cat}
                                            </button>
                                        ))}
                                    </div>

                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block px-1">
                                        <Hash className="w-3 h-3 inline mr-1" />태그
                                    </label>
                                    <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-2 flex flex-wrap gap-2 focus-within:ring-2 ring-violet-500/20 transition-all">
                                        {tags.map(tag => (
                                            <span key={tag} className="px-2 py-1 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-bold flex items-center gap-1">
                                                #{tag}
                                                <button onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-white">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                        {tags.length < 5 && (
                                            <input
                                                type="text"
                                                value={currentTag}
                                                onChange={(e) => setCurrentTag(e.target.value)}
                                                onKeyDown={handleAddTag}
                                                className="bg-transparent border-none outline-none text-white text-xs font-bold placeholder:text-zinc-600 min-w-[100px] flex-1 py-1"
                                                placeholder="추가 태그 입력..."
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2 block px-1">
                                        <AlignLeft className="w-3 h-3 inline mr-1" />내용 설명
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-3 text-white text-sm font-medium outline-none h-20 resize-none focus:ring-2 focus:ring-violet-500/20"
                                        placeholder="이 로드맵이 어떤 기술들을 다루는지 설명해주세요."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-2xl transition-all"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <button
                                    disabled={isSaving}
                                    onClick={handleSave}
                                    className={`flex-1 py-4 font-black text-sm rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving
                                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-xl shadow-violet-900/20'
                                        }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
                                            게시 중...
                                        </>
                                    ) : (
                                        <>
                                            <UploadCloud className="w-4 h-4" />
                                            저장하고 피드에 게시
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div
                        key="step3"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="relative bg-zinc-900 border border-violet-500/30 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl shadow-violet-500/20 text-center"
                    >
                        <div className="absolute inset-0 bg-gradient-to-b from-violet-600/20 to-transparent" />
                        <div className="p-8 relative z-10">
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="w-24 h-24 mx-auto mb-6 bg-violet-500/20 rounded-full flex items-center justify-center border-4 border-violet-500/30"
                            >
                                <Trophy className="w-12 h-12 text-violet-400 drop-shadow-[0_0_15px_rgba(167,139,250,0.5)]" />
                            </motion.div>

                            <h3 className="text-2xl font-black text-white mb-2">공유 완료!</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                스킬 로드맵이 안전하게 저장되었고,<br />
                                커뮤니티 피드에 공유되었습니다!
                            </p>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-violet-600 hover:bg-violet-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-violet-600/30"
                            >
                                확인
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// 2. Load Modal
interface LoadModalProps extends ModalProps {
    trees: UserSkillTree[];
    onLoad: (id: string) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export const LoadModal: React.FC<LoadModalProps> = ({ isOpen, onClose, trees, onLoad, onDelete }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl ring-1 ring-white/10"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/20 blur-[60px] rounded-full -mr-16 -mt-16" />

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center border border-violet-500/20">
                                <FolderOpen className="w-6 h-6 text-violet-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white leading-tight">마이 로드맵</h3>
                                <p className="text-zinc-500 text-sm font-medium">저장된 나의 스킬 로드맵 목록</p>
                            </div>
                        </div>
                        <button onClick={onClose} aria-label="로드맵 목록 닫기" className="p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {trees.length === 0 ? (
                            <div className="py-12 text-center bg-zinc-800/20 rounded-3xl border border-zinc-800/50 border-dashed">
                                <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                                <p className="text-zinc-600 font-bold uppercase text-xs tracking-widest">저장된 로드맵이 없습니다</p>
                            </div>
                        ) : (
                            trees.map(tree => (
                                <div
                                    key={tree.id}
                                    onClick={() => onLoad(tree.id)}
                                    className="group flex items-center justify-between p-5 rounded-2xl bg-zinc-800/30 hover:bg-zinc-800 border border-zinc-800/50 hover:border-violet-500/30 cursor-pointer transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                            {tree.thumbnailUrl ? (
                                                <img src={tree.thumbnailUrl} alt="Thumbnail" loading="lazy" className="w-full h-full object-cover" />
                                            ) : (
                                                tree.isPublic ? <Globe className="w-4 h-4 text-violet-400" /> : <Lock className="w-4 h-4 text-zinc-600" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-black text-zinc-200 group-hover:text-violet-400 transition-colors mb-1">
                                                {tree.title || '제목 없음'}
                                            </div>
                                            <div className="flex items-center gap-2 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(tree.updatedAt || tree.createdAt || Date.now()).toLocaleDateString()}
                                                {tree.difficulty && (
                                                    <span className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300">
                                                        {tree.difficulty}
                                                    </span>
                                                )}
                                                {tree.view_count !== undefined && tree.view_count > 0 && (
                                                    <span className="flex items-center gap-0.5">
                                                        <Layers className="w-3 h-3" /> {tree.view_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(tree.id, e); }}
                                            className="p-3 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-violet-500 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
