import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Scissors, Trash2, Check, RotateCcw, Camera } from 'lucide-react';
import { Button } from './Button';

interface Cut {
    id: string;
    start: number;
    end: number;
}

interface VideoEditorProps {
    videoUrl: string;
    onSave: (cuts: { start: number; end: number }[], thumbnailBlob?: Blob) => void;
    onCancel: () => void;
    aspectRatio?: '16:9' | '9:16';
}

export const VideoEditor: React.FC<VideoEditorProps> = ({ videoUrl, onSave, onCancel, aspectRatio = '16:9' }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [cuts, setCuts] = useState<Cut[]>([]);

    // Thumbnail state
    const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
    const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);

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

    const handleCaptureThumbnail = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (blob) {
                setThumbnailBlob(blob);
                setThumbnailPreview(canvas.toDataURL('image/jpeg', 0.8));
            }
        }, 'image/jpeg', 0.8);
    };

    const handleSave = () => {
        // If no cuts defined, assume the whole video? Or force at least one cut?
        // Let's assume if no cuts, we use the whole video (or user must add cuts).
        // For this requirement, let's just pass the cuts.
        const finalCuts = cuts.length > 0 ? cuts : [{ start: 0, end: duration }];
        onSave(finalCuts.map(({ start, end }) => ({ start, end })), thumbnailBlob || undefined);
    };

    const isVertical = aspectRatio === '9:16';

    return (
        <div className="bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
            <div className={`relative bg-black mx-auto ${isVertical ? 'aspect-[9/16] max-w-[400px]' : 'aspect-video w-full'}`}>
                <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onClick={togglePlay}
                />

                {/* Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 pt-12">
                    <div className="flex items-center justify-between mb-4">
                        <div className="text-white font-mono text-sm font-bold tracking-wider">
                            {formatTime(currentTime)} <span className="text-zinc-500">/</span> {formatTime(duration)}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={togglePlay} className="p-3 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20 text-white transition-all transform active:scale-95">
                                {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current" />}
                            </button>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="relative h-2.5 bg-zinc-800/50 backdrop-blur rounded-full cursor-pointer group transition-all hover:h-4"
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            if (videoRef.current) {
                                videoRef.current.currentTime = percent * duration;
                            }
                        }}>
                        <div
                            className="absolute top-0 left-0 h-full bg-violet-500 rounded-full transition-all group-hover:bg-violet-400"
                            style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                        {/* Selection Markers */}
                        {selectionStart !== null && (
                            <div
                                className="absolute top-0 h-full bg-emerald-500/40 border-l-2 border-r-2 border-emerald-400"
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
                                className="absolute top-0 h-full bg-yellow-500/60 pointer-events-none border-l border-r border-yellow-300"
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
            <div className="p-6 space-y-8 bg-zinc-900/50">
                {/* Thumbnail Capture Section */}
                <div className="flex flex-col gap-4 border-b border-zinc-800 pb-8">
                    <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                        <Camera className="w-4 h-4" /> 썸네일 설정
                    </h3>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="secondary"
                            onClick={handleCaptureThumbnail}
                            className="flex-1 h-14 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700 rounded-xl"
                        >
                            <span className="flex flex-col items-center gap-1">
                                <span className="font-bold">현재 화면 캡처</span>
                                <span className="text-[10px] text-zinc-500 font-normal">지금 보고 있는 장면을 썸네일로 사용합니다</span>
                            </span>
                        </Button>
                        {thumbnailPreview && (
                            <div className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-violet-500 shadow-lg shadow-violet-500/20 flex-shrink-0 group">
                                <img src={thumbnailPreview} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Thumbnail preview" />
                                <div className="absolute inset-0 bg-violet-500/30 flex items-center justify-center backdrop-blur-[1px]">
                                    <Check className="w-8 h-8 text-white drop-shadow-lg" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4 border-b border-zinc-800 pb-8">
                    <h3 className="text-sm font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-wider">
                        <Scissors className="w-4 h-4" /> 컷 편집
                    </h3>
                    <div className="flex flex-wrap gap-3 items-center justify-between">
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                onClick={handleSetStart}
                                disabled={selectionStart !== null && selectionEnd === null}
                                className={`h-10 rounded-lg font-bold border ${selectionStart !== null ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
                            >
                                [ 시작점
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={handleSetEnd}
                                disabled={selectionStart === null || selectionEnd !== null}
                                className={`h-10 rounded-lg font-bold border ${selectionEnd !== null ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/50" : "bg-zinc-800 border-zinc-700 text-zinc-400"}`}
                            >
                                ] 종료점
                            </Button>
                            <Button
                                onClick={handleAddCut}
                                disabled={selectionStart === null || selectionEnd === null}
                                className="bg-violet-600 hover:bg-violet-700 h-10 px-4 rounded-lg font-bold text-white shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:shadow-none"
                            >
                                + 컷 추가
                            </Button>
                            {(selectionStart !== null || selectionEnd !== null) && (
                                <Button
                                    variant="ghost"
                                    onClick={() => { setSelectionStart(null); setSelectionEnd(null); }}
                                    className="text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 h-10 w-10 p-0 rounded-lg"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </Button>
                            )}
                        </div>

                        <div className="text-xs font-mono text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-md border border-zinc-800">
                            {selectionStart !== null ? (
                                <span>
                                    {formatTime(selectionStart)} ~ {selectionEnd ? formatTime(selectionEnd) : formatTime(currentTime)}
                                </span>
                            ) : (
                                <span>구간 선택 대기중</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Cuts List */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">편집된 구간 목록 <span className="text-zinc-600">({cuts.length})</span></h3>
                    </div>
                    {cuts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-zinc-600 bg-zinc-950/30 rounded-xl border-2 border-dashed border-zinc-800/50">
                            <Scissors className="w-8 h-8 opacity-20 mb-2" />
                            <p className="font-bold">편집된 구간이 없습니다</p>
                            <p className="text-xs mt-1 opacity-60">전체 영상이 업로드됩니다</p>
                        </div>
                    ) : (
                        <div className="grid gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                            {cuts.map((cut, idx) => (
                                <div key={cut.id} className="flex items-center justify-between bg-zinc-900 p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                                            {idx + 1}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-zinc-300 font-mono font-bold text-sm">
                                                {formatTime(cut.start)} - {formatTime(cut.end)}
                                            </span>
                                            <span className="text-[10px] text-zinc-500 font-medium">
                                                재생 시간: <span className="text-zinc-400">{(cut.end - cut.start).toFixed(1)}초</span>
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeCut(cut.id)}
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-rose-500 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                    <Button variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white hover:bg-zinc-800 h-12 px-6 rounded-xl font-bold">
                        취소
                    </Button>
                    <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 px-8 rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                        <Check className="w-5 h-5 mr-2" />
                        편집 완료
                    </Button>
                </div>
            </div>
        </div>
    );
};
