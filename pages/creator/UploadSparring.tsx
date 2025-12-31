import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createSparringVideo, searchDrillsAndLessons } from '../../lib/api';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Search, X, Plus, Scissors, CheckCircle, AlertCircle } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { SparringVideo } from '../../types';
import { VideoEditor } from '../../components/VideoEditor';

export const UploadSparring: React.FC = () => {
    const { user, loading } = useAuth();
    const navigate = useNavigate();
    const { queueUpload } = useBackgroundUpload();

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
    const [category, setCategory] = useState<'Sparring' | 'Competition'>('Sparring');
    const [uniformType, setUniformType] = useState<'Gi' | 'No-Gi'>('Gi');

    // Editor State
    const [cuts, setCuts] = useState<{ start: number; end: number }[] | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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

        setIsSearching(true);
        try {
            const { data } = await searchDrillsAndLessons(query);
            setSearchResults(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearching(false);
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
        if (!user || !file) return;

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

            navigate('/creator?tab=materials');
        } catch (err) {
            console.error('Upload failed:', err);
            alert('업로드 중 오류가 발생했습니다.');
        }
    };

    // Render Editor
    if (isEditorOpen && previewUrl) {
        return (
            <div className="min-h-screen bg-slate-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            스파링 영상 편집
                        </h2>
                        <Button variant="secondary" onClick={() => setIsEditorOpen(false)}>
                            취소
                        </Button>
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
        <div className="min-h-screen bg-slate-950 text-white p-4 sm:p-6 pb-24">
            <div className="max-w-2xl mx-auto">
                <button
                    onClick={() => navigate('/creator')}
                    className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    돌아가기
                </button>

                <h1 className="text-2xl font-bold mb-6">스파링 영상 업로드</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* File Upload */}
                    <div className="aspect-video max-h-[500px] bg-slate-900 border-2 border-dashed border-slate-800 rounded-xl overflow-hidden relative group mx-auto w-full">
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
                                    <div className="flex items-center gap-2 text-sm text-white/90 bg-black/60 p-2 rounded-lg backdrop-blur-sm">
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
                                    <Button
                                        type="button"
                                        variant="primary"
                                        onClick={() => setIsEditorOpen(true)}
                                        className="shadow-xl"
                                    >
                                        <Scissors className="w-4 h-4 mr-2" />
                                        {cuts ? '편집 구간 수정하기' : '영상 자르기 / 편집'}
                                    </Button>
                                    <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
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
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 pointer-events-none">
                                    <Upload className="w-10 h-10 mb-2" />
                                    <span className="text-sm">영상 선택 (16:9 가로 권장)</span>
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
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">제목</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                                placeholder="예: 5/17 주짓수 스파링 하이라이트"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">설명</label>
                            <textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none resize-none h-24"
                                placeholder="영상에 대한 설명을 입력하세요."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Uniform</label>
                                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
                                    {(['Gi', 'No-Gi'] as const).map((type) => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setUniformType(type)}
                                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${uniformType === type
                                                ? 'bg-violet-600 text-white shadow-lg'
                                                : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-2">Category</label>
                                <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
                                    {(['Sparring', 'Competition'] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => setCategory(cat)}
                                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${category === cat
                                                ? 'bg-violet-600 text-white shadow-lg'
                                                : 'text-slate-500 hover:text-slate-300'
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
                            <label className="block text-sm font-medium text-slate-400 mb-1">연관 기술 태그</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-600 outline-none"
                                    placeholder="드릴이나 레슨 검색..."
                                />
                            </div>

                            {/* Dropdown Results */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                    {searchResults.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => addRelatedItem(item)}
                                            className="w-full text-left px-4 py-3 hover:bg-slate-700 flex items-center justify-between group"
                                        >
                                            <div>
                                                <div className="font-medium text-sm text-white">{item.title}</div>
                                                <div className="text-xs text-slate-400 capitalize">{item.type}</div>
                                            </div>
                                            <Plus className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selected Tags */}
                            <div className="flex flex-wrap gap-2 mt-3">
                                {relatedItems.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 text-blue-200 px-3 py-1.5 rounded-full text-sm">
                                        <span className="text-[10px] uppercase opacity-70 border border-blue-400/30 px-1 rounded">{item.type}</span>
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

                    <Button type="submit" disabled={!file || !title} className="w-full py-4 text-lg font-bold">
                        업로드 시작
                    </Button>
                </form>
            </div>
        </div>
    );
};
