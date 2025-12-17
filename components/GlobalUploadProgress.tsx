import React from 'react';
import { useBackgroundUpload } from '../contexts/BackgroundUploadContext';
import { Upload, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';

export const GlobalUploadProgress: React.FC = () => {
    const { tasks, cancelUpload, retryUpload } = useBackgroundUpload();

    // Only show if there are tasks
    if (tasks.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80 max-h-[60vh] overflow-y-auto">
            {tasks.map(task => (
                <div
                    key={task.id}
                    className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-5 duration-300"
                >
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                            {task.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />}
                            {task.status === 'processing' && <Loader2 className="w-4 h-4 text-purple-500 animate-spin flex-shrink-0" />}
                            {task.status === 'completed' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                            {task.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}

                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium text-white truncate">
                                    {task.processingParams?.title || task.file.name}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {task.type === 'action' ? '동작 영상' : '설명 영상'} &bull;
                                    {task.status === 'uploading' && ` 업로드 중... ${Math.round(task.progress)}%`}
                                    {task.status === 'processing' && ` 서버 처리 중...`}
                                    {task.status === 'completed' && ` 완료!`}
                                    {task.status === 'error' && ` 오류 발생`}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={() => cancelUpload(task.id)}
                            className="text-slate-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    {(task.status === 'uploading' || task.status === 'processing') && (
                        <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${task.status === 'processing'
                                        ? 'bg-purple-500 w-full animate-pulse'
                                        : 'bg-blue-500'
                                    }`}
                                style={{ width: task.status === 'uploading' ? `${task.progress}%` : '100%' }}
                            />
                        </div>
                    )}

                    {/* Error Message */}
                    {task.status === 'error' && (
                        <div className="mt-2 text-xs text-red-400 flex items-center justify-between">
                            <span>{task.error}</span>
                            <button
                                onClick={() => retryUpload(task.id)}
                                className="underline hover:text-red-300"
                            >
                                재시도
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
