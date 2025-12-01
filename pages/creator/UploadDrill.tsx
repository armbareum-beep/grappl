import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty } from '../../types';
import { createDrill } from '../../lib/api';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { videoProcessingApi } from '../../lib/api-video-processing';
import { uploadToVimeo } from '../../lib/vimeo/upload';

type UploadStep = 'idle' | 'uploading_raw' | 'generating_preview' | 'editing' | 'processing' | 'complete';

export const UploadDrill: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<UploadStep>('idle');
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    
    // State for video processing
    const [tempVideoId, setTempVideoId] = useState<string | null>(null);
    const [tempFilename, setTempFilename] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    
    // State for description video
    const [descUploadProgress, setDescUploadProgress] = useState(0);
    const [isDescUploading, setIsDescUploading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
        videoFile: null as File | null,
        descriptionVideoFile: null as File | null,
    });

    const handleMainFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setFormData({ ...formData, videoFile: file });
            
            // Auto-start upload to temp storage
            try {
                setStep('uploading_raw');
                setProgress(0); 
                
                const uploadRes = await videoProcessingApi.uploadVideo(file);
                setTempVideoId(uploadRes.videoId);
                setTempFilename(uploadRes.filename);
                
                setStep('generating_preview');
                const previewRes = await videoProcessingApi.generatePreview(uploadRes.videoId, uploadRes.filename);
                setPreviewUrl(videoProcessingApi.getPreviewUrl(previewRes.previewUrl));
                
                setStep('editing');
            } catch (err: any) {
                console.error(err);
                setError('영상 처리 준비 중 오류가 발생했습니다: ' + err.message);
                setStep('idle');
            }
        }
    };

    const handleDescriptionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData({ ...formData, descriptionVideoFile: e.target.files[0] });
        }
    };

    const handleEditorSave = async (cuts: { start: number; end: number }[]) => {
        if (!tempVideoId || !tempFilename || !user) return;
        if (!formData.descriptionVideoFile) {
            setError('설명 영상을 업로드해주세요.');
            return;
        }

        try {
            setStep('processing');
            
            // 1. Process Main Video (Cut & Upload to Vimeo)
            const processRes = await videoProcessingApi.processVideo(
                tempVideoId,
                tempFilename,
                cuts,
                `[Drill] ${formData.title}`,
                formData.description
            );

            // 2. Upload Description Video (Direct Vimeo Upload)
            setIsDescUploading(true);
            const descVideoResult = await uploadToVimeo({
                file: formData.descriptionVideoFile,
                title: `[Drill Explanation] ${formData.title}`,
                description: `Explanation for ${formData.title}`,
                onProgress: (p) => setDescUploadProgress(p)
            });
            setIsDescUploading(false);

            // 3. Save to DB
            const { error: dbError } = await createDrill({
                title: formData.title,
                description: formData.description,
                creatorId: user.id,
                category: formData.category,
                difficulty: formData.difficulty,
                vimeoUrl: processRes.videoId,
                descriptionVideoUrl: descVideoResult.videoId,
                thumbnailUrl: `https://vumbnail.com/${processRes.videoId}.jpg`,
                duration: '0:00', 
                price: 0
            });

            if (dbError) throw dbError;

            setStep('complete');
            setTimeout(() => {
                navigate('/creator/dashboard');
            }, 1500);

        } catch (err: any) {
            console.error(err);
            setError('처리 중 오류가 발생했습니다: ' + err.message);
            setStep('editing'); 
            setIsDescUploading(false);
        }
    };

    if (step === 'complete') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800 text-center max-w-md w-full">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">업로드 완료!</h2>
                    <p className="text-slate-400 mb-6">드릴이 성공적으로 등록되었습니다.</p>
                    <Button onClick={() => navigate('/creator/dashboard')}>대시보드로 이동</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
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

                    <div className="p-8 space-y-8">
                        {error && (
                            <div className="bg-red-500/10 text-red-500 p-4 rounded-lg flex items-center gap-2 text-sm border border-red-500/20">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        {/* Metadata Form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">드릴 제목</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="예: 암바 드릴"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">설명</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">카테고리</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value as VideoCategory })}
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none"
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
                                        className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none"
                                    >
                                        {Object.values(Difficulty).map(diff => (
                                            <option key={diff} value={diff}>{diff}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Video Upload & Editor Area */}
                        <div className="border-t border-slate-800 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                {/* Action Video Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        동작 영상 (편집 가능)
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    {step === 'idle' ? (
                                        <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative h-48 flex flex-col items-center justify-center group">
                                            <input
                                                type="file"
                                                accept="video/*"
                                                onChange={handleMainFileChange}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            />
                                            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-600 group-hover:text-slate-500" />
                                            <p className="font-medium text-slate-300 text-sm">동작 영상 선택</p>
                                            <p className="text-xs mt-1 text-slate-500">자동으로 편집기가 실행됩니다</p>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-blue-500/30 bg-blue-500/10 rounded-xl p-6 h-48 flex flex-col items-center justify-center">
                                            <CheckCircle className="w-8 h-8 text-blue-500 mb-2" />
                                            <p className="text-blue-400 font-medium text-sm">동작 영상 업로드 완료</p>
                                            <p className="text-xs text-slate-500 mt-1">{formData.videoFile?.name}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Description Video Upload */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        설명 영상 (전체)
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

                            {(step === 'uploading_raw' || step === 'generating_preview') && (
                                <div className="text-center py-12 border-t border-slate-800">
                                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-slate-300 font-medium">
                                        {step === 'uploading_raw' ? '동작 영상 업로드 중...' : '미리보기 생성 중...'}
                                    </p>
                                    <p className="text-sm text-slate-500 mt-2">잠시만 기다려주세요.</p>
                                </div>
                            )}

                            {step === 'editing' && previewUrl && (
                                <div className="space-y-4 border-t border-slate-800 pt-8">
                                    <h3 className="text-lg font-medium text-white">동작 영상 편집</h3>
                                    <VideoEditor
                                        videoUrl={previewUrl}
                                        onSave={handleEditorSave}
                                        onCancel={() => {
                                            setStep('idle');
                                            setFormData({ ...formData, videoFile: null });
                                            setPreviewUrl(null);
                                        }}
                                    />
                                </div>
                            )}

                            {step === 'processing' && (
                                <div className="text-center py-12 border-t border-slate-800">
                                    <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-slate-300 font-medium">영상 처리 및 업로드 중...</p>
                                    <div className="mt-4 space-y-2 max-w-xs mx-auto">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>설명 영상 업로드</span>
                                            <span>{descUploadProgress}%</span>
                                        </div>
                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 transition-all" style={{ width: `${descUploadProgress}%` }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
