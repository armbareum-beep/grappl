import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { VideoCategory, Difficulty } from '../../types';
import { createDrill } from '../../lib/api';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Video, AlertCircle, CheckCircle, Scissors, Play, FileVideo } from 'lucide-react';
import { VideoEditor } from '../../components/VideoEditor';
import { videoProcessingApi } from '../../lib/api-video-processing';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    filename: string | null;
    previewUrl: string | null;
    cuts: { start: number; end: number }[] | null;
    status: 'idle' | 'uploading' | 'previewing' | 'ready' | 'processing' | 'complete' | 'error';
    error: string | null;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    filename: null,
    previewUrl: null,
    cuts: null,
    status: 'idle',
    error: null
};

export const UploadDrill: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Global Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: VideoCategory.Standing,
        difficulty: Difficulty.Beginner,
    });

    // Video States
    const [actionVideo, setActionVideo] = useState<ProcessingState>(initialProcessingState);
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);
    
    // Editor State
    const [activeEditor, setActiveEditor] = useState<'action' | 'desc' | null>(null);
    
    // Overall Progress
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionProgress, setSubmissionProgress] = useState<string>('');

    const handleFileUpload = async (
        file: File, 
        type: 'action' | 'desc',
        setVideoState: React.Dispatch<React.SetStateAction<ProcessingState>>
    ) => {
        setVideoState(prev => ({ ...prev, file, status: 'uploading', error: null }));
        
        try {
            // 1. Upload Raw
            const uploadRes = await videoProcessingApi.uploadVideo(file);
            setVideoState(prev => ({ 
                ...prev, 
                videoId: uploadRes.videoId, 
                filename: uploadRes.filename,
                status: 'previewing' 
            }));

            // 2. Generate Preview
            const previewRes = await videoProcessingApi.generatePreview(uploadRes.videoId, uploadRes.filename);
            setVideoState(prev => ({ 
                ...prev, 
                previewUrl: videoProcessingApi.getPreviewUrl(previewRes.previewUrl),
                status: 'ready' 
            }));

            // Auto-open editor for the uploaded video
            setActiveEditor(type);

        } catch (err: any) {
            console.error(err);
            setVideoState(prev => ({ 
                ...prev, 
                status: 'error', 
                error: '업로드/변환 실패: ' + err.message 
            }));
        }
    };

    const handleCutsSave = (cuts: { start: number; end: number }[]) => {
        if (activeEditor === 'action') {
            setActionVideo(prev => ({ ...prev, cuts }));
        } else if (activeEditor === 'desc') {
            setDescVideo(prev => ({ ...prev, cuts }));
        }
        setActiveEditor(null);
    };

    const handleSubmit = async () => {
        if (!user || !actionVideo.videoId || !descVideo.videoId) return;
        
        // Validation
        if (!actionVideo.cuts) {
            alert('동작 영상을 편집해주세요.');
            return;
        }
        if (!descVideo.cuts) {
            alert('설명 영상을 편집해주세요.');
            return;
        }

        setIsSubmitting(true);

        try {
            // 1. Process Action Video
            setSubmissionProgress('동작 영상 처리 중...');
            const actionRes = await videoProcessingApi.processVideo(
                actionVideo.videoId,
                actionVideo.filename!,
                actionVideo.cuts,
                `[Drill] ${formData.title}`,
                formData.description
            );

            // 2. Process Description Video
            setSubmissionProgress('설명 영상 처리 중...');
            const descRes = await videoProcessingApi.processVideo(
                descVideo.videoId,
                descVideo.filename!,
                descVideo.cuts,
                `[Drill Explanation] ${formData.title}`,
                `Explanation for ${formData.title}`
            );

            // 3. Save to DB
            setSubmissionProgress('저장 중...');
            const { error: dbError } = await createDrill({
                title: formData.title,
                description: formData.description,
                creatorId: user.id,
                category: formData.category,
                difficulty: formData.difficulty,
                vimeoUrl: actionRes.videoId,
                descriptionVideoUrl: descRes.videoId,
                thumbnailUrl: `https://vumbnail.com/${actionRes.videoId}.jpg`,
                duration: '0:00', // Will be updated by webhook or user later
                price: 0
            });

            if (dbError) throw dbError;

            setSubmissionProgress('완료!');
            setTimeout(() => {
                navigate('/creator/dashboard');
            }, 1000);

        } catch (err: any) {
            console.error(err);
            alert('최종 처리 중 오류가 발생했습니다: ' + err.message);
            setIsSubmitting(false);
        }
    };

    // Render Helper for Video Box
    const renderVideoBox = (
        type: 'action' | 'desc', 
        state: ProcessingState, 
        label: string,
        required: boolean = true
    ) => {
        const isAction = type === 'action';
        
        if (state.status === 'idle' || state.status === 'error') {
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="border-2 border-dashed border-slate-800 rounded-xl p-6 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer relative h-48 flex flex-col items-center justify-center group">
                        <input
                            type="file"
                            accept="video/*"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], type, isAction ? setActionVideo : setDescVideo)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="w-8 h-8 mx-auto mb-3 text-slate-600 group-hover:text-slate-500" />
                        <p className="font-medium text-slate-300 text-sm">{label} 업로드</p>
                        <p className="text-xs mt-1 text-slate-500">MP4, MOV (최대 500MB)</p>
                    </div>
                    {state.error && <p className="text-xs text-red-500">{state.error}</p>}
                </div>
            );
        }

        if (state.status === 'uploading' || state.status === 'previewing') {
            return (
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">{label}</label>
                    <div className="border-2 border-slate-800 bg-slate-900 rounded-xl p-6 h-48 flex flex-col items-center justify-center">
                        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
                        <p className="text-slate-300 font-medium text-sm">
                            {state.status === 'uploading' ? '업로드 중...' : '미리보기 생성 중...'}
                        </p>
                    </div>
                </div>
            );
        }

        // Ready state
        return (
            <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">{label}</label>
                <div className="border-2 border-slate-700 bg-slate-800/50 rounded-xl p-4 h-48 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <FileVideo className="w-5 h-5 text-blue-400" />
                            <div>
                                <p className="text-sm font-medium text-white truncate max-w-[150px]">{state.file?.name}</p>
                                <p className="text-xs text-slate-400">
                                    {state.cuts ? `${state.cuts.length}개 구간 선택됨` : '편집 필요'}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                setActionVideo(initialProcessingState); // Reset logic needed? No, just clear specific one
                                if (isAction) setActionVideo(initialProcessingState);
                                else setDescVideo(initialProcessingState);
                            }}
                            className="text-xs text-slate-500 hover:text-red-400"
                        >
                            삭제
                        </button>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <Button 
                            variant="secondary" 
                            className="flex-1 text-xs py-2"
                            onClick={() => setActiveEditor(type)}
                        >
                            <Scissors className="w-3 h-3 mr-1.5" />
                            {state.cuts ? '다시 편집' : '영상 편집'}
                        </Button>
                    </div>
                    
                    {state.cuts && (
                        <div className="flex items-center gap-1.5 text-xs text-green-400 mt-2">
                            <CheckCircle className="w-3 h-3" />
                            <span>편집 완료</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (isSubmitting) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-800 text-center max-w-md w-full">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
                    <h2 className="text-xl font-bold text-white mb-2">{submissionProgress}</h2>
                    <p className="text-slate-400">잠시만 기다려주세요. 창을 닫지 마세요.</p>
                </div>
            </div>
        );
    }

    // Editor Mode
    if (activeEditor) {
        const activeState = activeEditor === 'action' ? actionVideo : descVideo;
        return (
            <div className="min-h-screen bg-slate-950 p-4">
                <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-white">
                            {activeEditor === 'action' ? '동작 영상 편집' : '설명 영상 편집'}
                        </h2>
                        <Button variant="secondary" onClick={() => setActiveEditor(null)}>
                            취소
                        </Button>
                    </div>
                    {activeState.previewUrl && (
                        <VideoEditor
                            videoUrl={activeState.previewUrl}
                            onSave={handleCutsSave}
                            onCancel={() => setActiveEditor(null)}
                        />
                    )}
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
                        <p className="text-slate-400 mt-1">동작 영상과 설명 영상을 각각 업로드하고 편집하세요.</p>
                    </div>

                    <div className="p-8 space-y-8">
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

                        {/* Video Upload Area */}
                        <div className="border-t border-slate-800 pt-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {renderVideoBox('action', actionVideo, '동작 영상 (편집 필수)')}
                                {renderVideoBox('desc', descVideo, '설명 영상 (편집 필수)')}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-8 border-t border-slate-800 flex justify-end">
                            <Button 
                                onClick={handleSubmit}
                                disabled={!actionVideo.cuts || !descVideo.cuts || !formData.title}
                                className="px-8 py-3 text-lg"
                            >
                                드릴 생성하기
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
