import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createSparringVideo, searchDrillsAndLessons } from '../../lib/api';
import { ArrowLeft, Upload, Search, X, Plus, Scissors, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { useToast } from '../../contexts/ToastContext';
import { VideoEditor } from '../../components/VideoEditor';
import { UniformType, ContentLevel, VideoCategory, QuantentPosition, SparringVideo } from '../../types';

export const UploadSparring: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { queueUpload } = useBackgroundUpload();
    const { success, error: toastError } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [relatedItems, setRelatedItems] = useState<SparringVideo['relatedItems']>([]);
    const [category, setCategory] = useState<QuantentPosition | VideoCategory | 'Sparring' | 'Competition'>('Sparring');
    const [uniformType, setUniformType] = useState<UniformType | 'Gi' | 'No-Gi'>(UniformType.Gi);
    const [difficulty, setDifficulty] = useState<ContentLevel>(ContentLevel.Beginner);

    // Editor State
    const [cuts, setCuts] = useState<{ start: number; end: number }[] | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
            // Reset cuts when new file is selected
            setCuts(null);
            // Auto open editor? Maybe optional. For now let user click edit.
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }

        try {
            const { data } = await searchDrillsAndLessons(query);
            setSearchResults(data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const addRelatedItem = (item: any) => {
        if (relatedItems.find(i => i.id === item.id)) return;
        setRelatedItems([...relatedItems, {
            id: item.id,
            title: item.title,
            type: item.type
        }]);
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeRelatedItem = (id: string) => {
        setRelatedItems(relatedItems.filter(i => i.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !file || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // 1. Create DB Record
            const { data: video, error } = await createSparringVideo({
                creatorId: user.id,
                title,
                description,
                relatedItems,
                videoUrl: '', // Will be updated by background upload
                thumbnailUrl: '',
                category,
                uniformType,
                difficulty,
            });

            if (error || !video) throw error;

            // 2. Queue Upload
            const videoId = `${crypto.randomUUID()}-${Date.now()}`;
            const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
            const filename = `${videoId}.${ext}`;

            await queueUpload(file, 'sparring', {
                videoId,
                filename,
                cuts: cuts || [], // Pass cuts to processor
                title: `[Sparring] ${title}`,
                description,
                sparringId: video.id, // Custom field for sparring handler
                videoType: 'sparring'
            });

            success('업로드가 시작되었습니다.');
            navigate('/creator?tab=materials');
        } catch (err: any) {
            console.error('Upload failed:', err);
            toastError('업로드 중 오류가 발생했습니다: ' + err.message);
            setIsSubmitting(false);
        }
    };

    // Render Editor
    if (isEditorOpen && previewUrl) {
        return (
            <div className="min-h-screen bg-zinc-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">
                            스파링 영상 편집
                        </h2>
                        <button
                            onClick={() => setIsEditorOpen(false)}
                            className="px-6 py-2.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-xl font-semibold transition-all"
                        >
                            취소
                        </button>
                    </div>
                    <VideoEditor
                        videoUrl={previewUrl}
                        onSave={(newCuts) => {
                            setCuts(newCuts);
                            setIsEditorOpen(false);
                        }}
                        onCancel={() => setIsEditorOpen(false)}
                        aspectRatio="16:9"
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-6 pb-24">
            <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/creator')}
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-full transition-all text-zinc-400 hover:text-white group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                            스파링 영상 업로드
                        </h1>
                        <p className="text-sm text-zinc-500 mt-1">실전 스파링 영상을 공유하세요</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload */}
                    <div className="aspect-video max-h-[500px] bg-zinc-900/50 backdrop-blur-xl border-2 border-dashed border-zinc-800 rounded-2xl overflow-hidden relative group mx-auto w-full shadow-2xl">
                        {previewUrl ? (
                            <div className="relative w-full h-full">
                                <video
                                    src={previewUrl}
                                    className="w-full h-full object-contain bg-black"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                />
                                {/* Overlay Controls */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                                    <div className="flex items-center gap-2 text-sm text-white/90 bg-black/60 p-3 rounded-xl backdrop-blur-sm">
                                        {cuts ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-green-400" />
                                                <span>{cuts.length}개 구간 선택됨</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                                <span>원본 전체 업로드 (편집 없음)</span>
                                            </>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditorOpen(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl font-bold hover:bg-zinc-700 hover:text-white transition-all border border-zinc-700"
                                    >
                                        <Scissors className="w-4 h-4 text-violet-400" />
                                        {cuts ? '편집 수정' : '영상 편집'}
                                    </button>
                                    <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-3 rounded-xl transition-all flex items-center gap-2 font-semibold">
                                        <Upload className="w-4 h-4" />
                                        <span>다른 영상으로 교체</span>
                                        <input
                                            type="file"
                                            accept="video/*"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 pointer-events-none">
                                    <Upload className="w-12 h-12 mb-3" />
                                    <span className="text-sm font-semibold">영상 선택 (16:9 가로 권장)</span>
                                </div>
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleFileSelect}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                />
                            </>
                        )}
                    </div>

                    {/* Meta Data */}
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 space-y-5 shadow-2xl">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">제목</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                placeholder="예: 5/17 주짓수 스파링 하이라이트"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">설명</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none resize-none transition-all placeholder:text-zinc-700 h-24"
                                placeholder="영상에 대한 설명을 입력하세요"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">Uniform</label>
                                <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                                    {(['Gi', 'No-Gi'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setUniformType(type as any)}
                                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${uniformType === type
                                                ? 'bg-violet-600 text-white shadow-lg'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">Level</label>
                                <select
                                    value={difficulty}
                                    onChange={e => setDifficulty(e.target.value as ContentLevel)}
                                    className="w-full px-5 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all font-bold text-sm"
                                >
                                    {Object.values(ContentLevel).map(lvl => (
                                        <option key={lvl} value={lvl}>{lvl}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">Category</label>
                                <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                                    {(['Sparring', 'Competition'] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategory(cat)}
                                            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${category === cat
                                                ? 'bg-violet-600 text-white shadow-lg'
                                                : 'text-zinc-500 hover:text-zinc-300'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Related Items Search */}
                        <div className="relative">
                            <label className="block text-sm font-semibold text-zinc-400 mb-2 ml-1">연관 기술 태그</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full pl-12 px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition-all placeholder:text-zinc-700"
                                    placeholder="드릴이나 레슨 검색..."
                                />
                            </div>

                            {/* Dropdown Results */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-10 max-h-48 overflow-y-auto">
                                    {searchResults.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => addRelatedItem(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-zinc-700 flex items-center justify-between group transition-colors"
                                        >
                                            <div>
                                                <div className="font-semibold text-sm text-white">{item.title}</div>
                                                <div className="text-xs text-zinc-400 capitalize">{item.type}</div>
                                            </div>
                                            <Plus className="w-4 h-4 text-zinc-400 group-hover:text-violet-400" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selected Tags */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {relatedItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 bg-violet-900/30 border border-violet-800/50 text-violet-200 px-3 py-1.5 rounded-full text-sm">
                                        <span className="text-[10px] uppercase opacity-70 border border-violet-400/30 px-1 rounded">{item.type}</span>
                                        <span>{item.title}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeRelatedItem(item.id)}
                                            className="ml-1 hover:text-white"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || !file || !title}
                        className="w-full py-4 text-lg font-black bg-violet-600 text-white rounded-xl hover:bg-violet-500 shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:pointer-events-none transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isSubmitting && <Loader className="w-5 h-5 animate-spin" />}
                        {isSubmitting ? '요청 처리 중...' : '업로드 시작'}
                    </button>
                </form>
            </div>
        </div>
    );
};
