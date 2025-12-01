import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, Trash2, Check, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Cut {
    id: string;
    start: number;
    end: number;
}

interface VideoEditorProps {
    videoUrl: string;
    onSave: (cuts: { start: number; end: number }[]) => void;
    onCancel: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ videoUrl, onSave, onCancel }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [cuts, setCuts] = useState<Cut[]>([]);
    
    // Selection state
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSetStart = () => {
        setSelectionStart(currentTime);
        // Reset end if it's before start
        if (selectionEnd !== null && selectionEnd < currentTime) {
            setSelectionEnd(null);
        }
    };

    const handleSetEnd = () => {
        if (selectionStart !== null && currentTime > selectionStart) {
            setSelectionEnd(currentTime);
        }
    };

    const handleAddCut = () => {
        if (selectionStart !== null && selectionEnd !== null) {
            setCuts([
                ...cuts,
                {
                    id: Math.random().toString(36).substr(2, 9),
                    start: selectionStart,
                    end: selectionEnd
                }
            ]);
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    };

    const removeCut = (id: string) => {
        setCuts(cuts.filter(c => c.id !== id));
    };

    const handleSave = () => {
        // If no cuts defined, assume the whole video? Or force at least one cut?
        // Let's assume if no cuts, we use the whole video (or user must add cuts).
        // For this requirement, let's just pass the cuts.
        const finalCuts = cuts.length > 0 ? cuts : [{ start: 0, end: duration }];
        onSave(finalCuts.map(({ start, end }) => ({ start, end })));
    };

    return (
        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
            <div className="relative aspect-video bg-black">
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                />
                
                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-white font-mono text-sm">
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={togglePlay} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition">
                                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                            </button>
                        </div>
                    </div>
                    
                    {/* Timeline */}
                    <div className="relative h-2 bg-slate-700 rounded-full cursor-pointer group"
                         onClick={(e) => {
                             const rect = e.currentTarget.getBoundingClientRect();
                             const percent = (e.clientX - rect.left) / rect.width;
                             if (videoRef.current) {
                                 videoRef.current.currentTime = percent * duration;
                             }
                         }}>
                        <div 
                            className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                        {/* Selection Markers */}
                        {selectionStart !== null && (
                            <div 
                                className="absolute top-0 h-full bg-green-500/50"
                                style={{ 
                                    left: `${(selectionStart / duration) * 100}%`,
                                    width: selectionEnd 
                                        ? `${((selectionEnd - selectionStart) / duration) * 100}%` 
                                        : `${((currentTime - selectionStart) / duration) * 100}%`
                                }}
                            />
                        )}
                        {/* Existing Cuts Markers */}
                        {cuts.map(cut => (
                            <div 
                                key={cut.id}
                                className="absolute top-0 h-full bg-yellow-500/50 pointer-events-none"
                                style={{ 
                                    left: `${(cut.start / duration) * 100}%`,
                                    width: `${((cut.end - cut.start) / duration) * 100}%`
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Editor Controls */}
            <div className="p-6 space-y-6">
                <div className="flex flex-wrap gap-4 items-center justify-between border-b border-slate-800 pb-6">
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            onClick={handleSetStart}
                            disabled={selectionStart !== null && selectionEnd === null} // Disable start if waiting for end
                            className={selectionStart !== null ? "bg-green-500/20 text-green-400 border-green-500/50" : ""}
                        >
                            <span className="mr-2">[</span> 시작점 설정
                        </Button>
                        <Button 
                            variant="secondary" 
                            onClick={handleSetEnd}
                            disabled={selectionStart === null || selectionEnd !== null}
                        >
                            <span className="mr-2">]</span> 종료점 설정
                        </Button>
                        <Button 
                            onClick={handleAddCut}
                            disabled={selectionStart === null || selectionEnd === null}
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            <Scissors className="w-4 h-4 mr-2" />
                            컷 추가
                        </Button>
                        {(selectionStart !== null || selectionEnd !== null) && (
                            <Button 
                                variant="ghost" 
                                onClick={() => { setSelectionStart(null); setSelectionEnd(null); }}
                                className="text-slate-400"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                    
                    <div className="text-sm text-slate-400">
                        {selectionStart !== null && (
                            <span>
                                선택 구간: {formatTime(selectionStart)} ~ {selectionEnd ? formatTime(selectionEnd) : formatTime(currentTime)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Cuts List */}
                <div className="space-y-3">
                    <h3 className="text-sm font-medium text-slate-300">편집 컷 목록 ({cuts.length})</h3>
                    {cuts.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-950/50 rounded-lg border border-slate-800 border-dashed">
                            컷을 추가하면 여기에 표시됩니다.
                            <br />
                            <span className="text-xs">컷을 추가하지 않으면 전체 영상이 업로드됩니다.</span>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {cuts.map((cut, idx) => (
                                <div key={cut.id} className="flex items-center justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-mono">#{idx + 1}</span>
                                        <span className="text-slate-200 font-mono">
                                            {formatTime(cut.start)} - {formatTime(cut.end)}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            ({(cut.end - cut.start).toFixed(1)}초)
                                        </span>
                                    </div>
                                    <button 
                                        onClick={() => removeCut(cut.id)}
                                        className="text-slate-400 hover:text-red-400 p-1 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <Button variant="ghost" onClick={onCancel}>
                        취소
                    </Button>
                    <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 px-8">
                        <Check className="w-4 h-4 mr-2" />
                        편집 완료 및 업로드
                    </Button>
                </div>
            </div>
        </div>
    );
};
