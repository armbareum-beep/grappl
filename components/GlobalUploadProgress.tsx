import React from 'react';
import { useBackgroundUpload } from '../contexts/BackgroundUploadContext';
import { CheckCircle, AlertCircle, X, Upload, Sparkles } from 'lucide-react';

export const GlobalUploadProgress: React.FC = () => {
    const { tasks, cancelUpload, retryUpload, dismissTask } = useBackgroundUpload();

    // Filter out dismissed tasks
    const activeTasks = tasks.filter(task => !task.isDismissed);

    console.log('[GlobalUploadProgress] Tasks:', tasks.length, 'Active:', activeTasks.length, tasks);

    // Only show if there are tasks
    if (activeTasks.length === 0) return null;

    return (
        <div className="fixed bottom-24 right-6 z-[9999] flex flex-col gap-3 w-96 max-h-[70vh] overflow-y-auto pointer-events-none">
            {activeTasks.map(task => (
                <div
                    key={task.id}
                    className="bg-zinc-900/90 backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 duration-500 pointer-events-auto"
                >
                    {/* Header with gradient accent */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-blue-600/20 opacity-50" />
                        <div className="relative px-5 py-4 flex justify-between items-start">
                            <div className="flex items-start gap-3 overflow-hidden flex-1">
                                {/* Status Icon */}
                                <div className="flex-shrink-0 mt-0.5">
                                    {task.status === 'uploading' && (
                                        <div className="relative">
                                            <Upload className="w-5 h-5 text-violet-400 animate-pulse" />
                                            <div className="absolute inset-0 bg-violet-400/20 blur-lg rounded-full" />
                                        </div>
                                    )}
                                    {task.status === 'processing' && (
                                        <div className="relative">
                                            <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                                            <div className="absolute inset-0 bg-purple-400/20 blur-lg rounded-full" />
                                        </div>
                                    )}
                                    {task.status === 'completed' && (
                                        <div className="relative">
                                            <CheckCircle className="w-5 h-5 text-emerald-400" />
                                            <div className="absolute inset-0 bg-emerald-400/20 blur-lg rounded-full" />
                                        </div>
                                    )}
                                    {task.status === 'error' && (
                                        <div className="relative">
                                            <AlertCircle className="w-5 h-5 text-rose-400" />
                                            <div className="absolute inset-0 bg-rose-400/20 blur-lg rounded-full" />
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-sm font-bold text-white truncate">
                                        {task.processingParams?.title || task.file.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-medium text-zinc-400">
                                            {task.type === 'action' ? '동작 영상' : task.type === 'desc' ? '설명 영상' : '스파링 영상'}
                                        </span>
                                        <span className="text-zinc-600">•</span>
                                        <span className={`text-xs font-semibold ${task.status === 'uploading' ? 'text-violet-400' :
                                            task.status === 'processing' ? 'text-purple-400' :
                                                task.status === 'completed' ? 'text-emerald-400' :
                                                    'text-rose-400'
                                            }`}>
                                            {task.status === 'uploading' && `업로드 중 ${Math.round(task.progress)}%`}
                                            {task.status === 'processing' && '서버에서 처리 중...'}
                                            {task.status === 'completed' && '완료!'}
                                            {task.status === 'error' && '오류 발생'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => dismissTask(task.id)}
                                className="flex-shrink-0 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800/50 rounded-lg transition-all"
                                title="알림 닫기"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {(task.status === 'uploading' || task.status === 'processing') && (
                        <div className="px-5 pb-4">
                            <div className="w-full bg-zinc-800/50 rounded-full h-2 overflow-hidden backdrop-blur-sm">
                                <div
                                    className={`h-full transition-all duration-300 rounded-full ${task.status === 'processing'
                                        ? 'bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 animate-pulse bg-[length:200%_100%]'
                                        : 'bg-gradient-to-r from-violet-500 to-blue-500'
                                        }`}
                                    style={{
                                        width: task.status === 'uploading' ? `${task.progress}%` : '100%',
                                        boxShadow: task.status === 'uploading'
                                            ? '0 0 20px rgba(139, 92, 246, 0.5)'
                                            : '0 0 20px rgba(168, 85, 247, 0.5)'
                                    }}
                                />
                            </div>

                            {/* Cancel Link during Uploading */}
                            {task.status === 'uploading' && (
                                <div className="mt-3 flex justify-end">
                                    <button
                                        onClick={() => {
                                            if (confirm('업로드를 정말 취소하시겠습니까?')) {
                                                cancelUpload(task.id);
                                            }
                                        }}
                                        className="text-xs text-zinc-500 hover:text-rose-400 font-medium transition-colors"
                                    >
                                        업로드 취소
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error Message */}
                    {task.status === 'error' && (
                        <div className="px-5 pb-4">
                            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
                                <span className="text-xs text-rose-400 flex-1">{task.error}</span>
                                <button
                                    onClick={() => retryUpload(task.id)}
                                    className="text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 rounded-lg transition-all"
                                >
                                    재시도
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Success State */}
                    {task.status === 'completed' && (
                        <div className="px-5 pb-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                                <p className="text-xs text-emerald-400 font-medium">
                                    ✨ 업로드가 완료되었습니다!
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
