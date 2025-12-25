import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createSparringVideo, searchDrillsAndLessons } from '../../lib/api';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Search, X, Plus } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { SparringVideo } from '../../types';

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

    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setPreviewUrl(URL.createObjectURL(selectedFile));
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
            });

            if (error || !video) throw error;

            // 2. Queue Upload
            const videoId = `${crypto.randomUUID()}-${Date.now()}`;
            const ext = file.name.split('.').pop()?.toLowerCase() || 'mp4';
            const filename = `${videoId}.${ext}`;

            await queueUpload(file, 'sparring', {
                videoId,
                filename,
                cuts: [],
                title: `[Sparring] ${title}`,
                description,
                sparringId: video.id, // Custom field for sparring handler
                videoType: 'sparring'
            });

            navigate('/creator');
        } catch (err) {
            console.error('Upload failed:', err);
            alert('업로드 중 오류가 발생했습니다.');
        }
    };

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
                            <video
                                src={previewUrl}
                                className="w-full h-full object-contain"
                                autoPlay
                                muted
                                loop
                                playsInline
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                <Upload className="w-10 h-10 mb-2" />
                                <span className="text-sm">영상 선택 (16:9 가로 권장)</span>
                            </div>
                        )}
                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileSelect}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                        />
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
