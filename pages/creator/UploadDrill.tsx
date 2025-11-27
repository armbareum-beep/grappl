import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty } from '../../types';
import { createDrill } from '../../lib/api';
import { uploadToVimeo } from '../../lib/vimeo/upload';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Video, AlertCircle, CheckCircle } from 'lucide-react';

export const UploadDrill: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        videoFile: null as File | null,
        descriptionVideoFile: null as File | null,
    });

    const handleMainFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, videoFile: e.target.files[0] });
        }
    };

    const handleDescriptionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, descriptionVideoFile: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.videoFile || !formData.descriptionVideoFile) return;

        setIsUploading(true);
        setError(null);
        setUploadProgress(0);
        setUploadStep('uploading');

        try {
            // 1. Upload Main Video
            const mainVideoResult = await uploadToVimeo({
                file: formData.videoFile,
                title: `[Drill] ${formData.title}`,
                description: formData.description,
                onProgress: (progress) => {
                    // Main video progress (0-50%)
                    setUploadProgress(Math.round(progress * 0.5));
                }
            });

            let descriptionVideoId = '';

            // 2. Upload Description Video (if exists)
            if (formData.descriptionVideoFile) {
                const descVideoResult = await uploadToVimeo({
                    file: formData.descriptionVideoFile,
                    title: `[Drill Explanation] ${formData.title}`,
                    description: `Explanation for ${formData.title}`,
                    onProgress: (progress) => {
                        // Description video progress (50-90%)
                        setUploadProgress(50 + Math.round(progress * 0.4));
                    }
                });
                descriptionVideoId = descVideoResult.videoId;
            } else {
                setUploadProgress(90);
            }

            // 3. Create Drill in Database
            setUploadStep('processing');
            const { error } = await createDrill({
                title: formData.title,
                description: formData.description,
                creatorId: user.id,
                category: formData.category,
                difficulty: formData.difficulty,
                vimeoUrl: mainVideoResult.videoId,
                descriptionVideoUrl: descriptionVideoId,
                thumbnailUrl: `https://vumbnail.com/${mainVideoResult.videoId}.jpg`,
                duration: '0:00', // Vimeo processing takes time, default to 0
                price: 0 // Free for now
            });

            if (error) throw error;

            setUploadProgress(100);
            setUploadStep('complete');
            setSuccess(true);

            // Show success and redirect
            setTimeout(() => {
                navigate('/creator/dashboard');
            }, 1500);

        } catch (error) {
            console.error('Upload failed:', error);
            setError('업로드 중 오류가 발생했습니다.');
            setIsUploading(false);
            setUploadStep('idle');
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800 text-center max-w-md w-full">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">업로드 완료!</h2>
                    <p className="text-slate-400 mb-6">드릴과 설명 영상이 성공적으로 등록되었습니다.</p>
                    <Button onClick={() => navigate('/creator/dashboard')}>대시보드로 이동</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    대시보드로 돌아가기
                </button>

                <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden">
                    <div className="p-8 border-b border-slate-800">
                        <h1 className="text-2xl font-bold text-white">새 드릴 만들기</h1>
                        <p className="text-slate-400 mt-1">동작 영상과 설명 영상을 각각 업로드하세요.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-500/20">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">드릴 제목</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                                placeholder="예: 암바 드릴 (기초)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">설명</label>
                            <textarea
                                required
                                rows={4}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none placeholder:text-slate-600"
                                placeholder="이 드릴의 목적과 수행 방법을 설명해주세요."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">카테고리</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as VideoCategory })}
                                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    {Object.values(VideoCategory).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">난이도</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                    className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    {Object.values(Difficulty).map(diff => (
                                        <option key={diff} value={diff}>{diff}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    동작 영상 (메인)
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative h-48 flex flex-col items-center justify-center group">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={handleMainFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {formData.videoFile ? (
                                        <div className="flex flex-col items-center justify-center gap-2 text-blue-400 font-medium">
                                            <Video className="w-8 h-8" />
                                            <span className="text-sm truncate max-w-[200px]">{formData.videoFile.name}</span>
                                            <span className="text-xs text-slate-500 group-hover:text-slate-400">변경하려면 클릭</span>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 group-hover:text-slate-400">
                                            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-600 group-hover:text-slate-500" />
                                            <p className="font-medium text-slate-300 text-sm">동작 영상 업로드</p>
                                            <p className="text-xs mt-1">MP4, WebM (최대 500MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    설명 영상
                                    <span className="text-red-500 ml-1">*</span>
                                </label>
                                <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative h-48 flex flex-col items-center justify-center group">
                                    <input
                                        type="file"
                                        accept="video/*"
                                        onChange={handleDescriptionFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    {formData.descriptionVideoFile ? (
                                        <div className="flex flex-col items-center justify-center gap-2 text-blue-400 font-medium">
                                            <Video className="w-8 h-8" />
                                            <span className="text-sm truncate max-w-[200px]">{formData.descriptionVideoFile.name}</span>
                                            <span className="text-xs text-slate-500 group-hover:text-slate-400">변경하려면 클릭</span>
                                        </div>
                                    ) : (
                                        <div className="text-slate-500 group-hover:text-slate-400">
                                            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-600 group-hover:text-slate-500" />
                                            <p className="font-medium text-slate-300 text-sm">설명 영상 업로드</p>
                                            <p className="text-xs mt-1">MP4, WebM (최대 500MB)</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isUploading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>
                                        {uploadStep === 'uploading' ? '영상 업로드 중...' : '처리 중...'}
                                    </span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button
                                type="submit"
                                disabled={isUploading || !formData.videoFile || !formData.descriptionVideoFile}
                                className="px-8"
                            >
                                {isUploading ? '처리 중...' : '드릴 등록하기'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
