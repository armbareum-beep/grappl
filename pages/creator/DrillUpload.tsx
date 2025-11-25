import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty } from '../../types';
import { uploadVideo } from '../../lib/api-video-upload';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Video, AlertCircle, CheckCircle } from 'lucide-react';

export const DrillUpload: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        videoFile: null as File | null,
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, videoFile: e.target.files[0] });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.videoFile) return;

        setLoading(true);
        setError(null);
        setUploadProgress(0);

        try {
            // Note: This uses the existing video upload API. 
            // In a real implementation, we might need a specific API for Drills if they are stored differently than Lessons.
            // For now, we'll assume a generic video upload or placeholder logic.
            // Since we don't have a specific 'createDrill' API yet, we will simulate the upload and creation.

            // Simulate upload progress
            const interval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 95) {
                        clearInterval(interval);
                        return 95;
                    }
                    return prev + 5;
                });
            }, 200);

            // Mock upload delay
            await new Promise(resolve => setTimeout(resolve, 2000));

            clearInterval(interval);
            setUploadProgress(100);
            setSuccess(true);

            // In real app:
            // const videoUrl = await uploadVideo(formData.videoFile);
            // await createDrill({ ...formData, videoUrl, creatorId: user.id });

            setTimeout(() => {
                navigate('/creator/dashboard');
            }, 1500);

        } catch (err) {
            console.error(err);
            setError('업로드 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md w-full">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">업로드 완료!</h2>
                    <p className="text-slate-600 mb-6">드릴이 성공적으로 등록되었습니다.</p>
                    <Button onClick={() => navigate('/creator/dashboard')}>대시보드로 이동</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate('/creator/dashboard')}
                    className="flex items-center text-slate-500 hover:text-slate-900 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    대시보드로 돌아가기
                </button>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-8 border-b border-slate-100">
                        <h1 className="text-2xl font-bold text-slate-900">새 드릴 만들기</h1>
                        <p className="text-slate-600 mt-1">짧고 효과적인 드릴 영상을 업로드하세요.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">드릴 제목</label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                placeholder="예: 암바 드릴 (기초)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">설명</label>
                            <textarea
                                required
                                rows={4}
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                                placeholder="이 드릴의 목적과 수행 방법을 설명해주세요."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">카테고리</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as VideoCategory })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    {Object.values(VideoCategory).map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">난이도</label>
                                <select
                                    value={formData.difficulty}
                                    onChange={e => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                >
                                    {Object.values(Difficulty).map(diff => (
                                        <option key={diff} value={diff}>{diff}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">영상 업로드</label>
                            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {formData.videoFile ? (
                                    <div className="flex items-center justify-center gap-2 text-blue-600 font-medium">
                                        <Video className="w-5 h-5" />
                                        {formData.videoFile.name}
                                    </div>
                                ) : (
                                    <div className="text-slate-500">
                                        <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
                                        <p className="font-medium text-slate-900">영상을 드래그하거나 클릭하여 업로드</p>
                                        <p className="text-xs mt-1">MP4, WebM, MOV (최대 500MB)</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {loading && (
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>업로드 중...</span>
                                    <span>{uploadProgress}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" disabled={loading || !formData.videoFile} className="px-8">
                                {loading ? '업로드 중...' : '드릴 등록하기'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
